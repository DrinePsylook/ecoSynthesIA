import axios from 'axios';
import logger from '../utils/logger';

/**
 * Service layer for AI operations
 * Handles all AI-related operations and communication with the IA service
 */

// Configuration for IA service
// In Docker: use container name (ia_ecosynthesia:8000)
// In local dev: use localhost:8001 (Docker port mapping)
const isDocker = process.cwd() === '/app';
const IA_SERVICE_URL = process.env.IA_SERVICE_URL 
    || (isDocker ? 'http://ia_ecosynthesia:8000' : 'http://localhost:8001');

logger.info({ cwd: process.cwd(), isDocker, url: IA_SERVICE_URL }, 'AI Service configuration loaded'); 

/**
 * Interface for the AI service analysis response
 */
export interface AIAnalysisResponse {
    summary: {
        textual_summary: string;
        confidence_score: number;
    };
    extracted_data: Array<{
        key: string;
        value: string | number;
        unit?: string | null;
        page?: number | null;
        confidence_score: number;
        chart_type?: 'bar' | 'pie' | 'line' | 'choropleth' | null;
        indicator_category: string;
    }>;
    category: {
        name: string;
    };
}

/**
 * Calls the IA service to process a document
 * @param bucketFilePath The relative path to the document in the bucket (e.g., "bucket/reportAPI/document_123.pdf")
 * @param documentId The database ID of the document
 * @returns The analysis results from the IA service
 */
export const callAIServiceForAnalysis = async (
    bucketFilePath: string,
    documentId: number
): Promise<AIAnalysisResponse> => {
    try {
        // Call the IA service endpoint
        const response = await axios.post<AIAnalysisResponse>(
            `${IA_SERVICE_URL}/api/analyze-document`,
            {
                file_path: bucketFilePath,
                document_id: documentId,  // Pass the document ID
            },
            {
                timeout: 900000, // 15 minutes timeout for large documents
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ err: error, filePath: bucketFilePath, documentId }, 'Error calling IA service');
        
        // Re-throw with more context
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // Server responded with error status
                throw new Error(`IA service error (${error.response.status}): ${error.response.data?.message || errorMessage}`);
            } else if (error.request) {
                // Request made but no response received
                throw new Error(`IA service unreachable: ${errorMessage}`);
            }
        }
        
        throw new Error(`IA service call failed: ${errorMessage}`);
    }
};
