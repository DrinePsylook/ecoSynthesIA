import { Request, Response } from 'express';

import * as documentService from '../services/documentService';
import * as summaryService from '../services/summaryService';
import * as extractedDataService from '../services/extractedDataService';
import * as categoryService from '../services/categoryService';
import * as aiService from '../services/aiService';
import { downloadDocumentToBucket, getBucketFilePath, deleteLocalFile } from '../utils/fileUtils';

/**
 * Controller layer for document operations
 * Handles HTTP request/response, validation or orchestrates services
 */

/**
 * Gets complete document data : document, summary, extracted data, chart types and category
 * GET /api/documents/:id/complete
 */
export const getCompleteDocumentData = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const documentId = parseInt(req.params.id, 10);

        if (isNaN(documentId) || documentId <= 0) {
            res.status(400).json({
                error: 'Invalid document ID'
            });
            return;
        }

        // Get document
        const document = await documentService.getDocumentById(documentId);
        if (!document) {
            res.status(404).json({
                error: 'Document not found'
            });
            return;
        }

        // Get all realated data in parallel
        const [summary, extractedData, category] = await Promise.all([
            summaryService.getSummaryByDocumentId(documentId),
            extractedDataService.getExtractedDataByDocumentId(documentId),
            categoryService.getCategoryById(document.category_id)
        ]);

        // Extract unique chart types from extracted data
        const chartTypes = extractedData && extractedData.length > 0
            ? [...new Set(extractedData
                .map(data => data.chart_type)
                .filter(type => type !== null)
            )] as string[]
            : [];

        // Response formatting
        res.status(200).json({
            success: true,
            data: {
                document,
                summary: summary || null,
                extractedData: extractedData || null,
                chartTypes,
                category: category || null,
                metadata: {
                    hasSummary: summary !== null,
                    hasExtractedData: extractedData !== null && extractedData.length > 0,
                    extractedDataCount: extractedData?.length || 0,
                    chartTypesCount: chartTypes.length
                }
            }
        });
    } catch (error) {
        console.error('Error in getCompleteDocumentData:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get complete document data'
        });
    }
};

/**
 * Gets processing status for a specific document
 * GET /api/documents/:id/processing-status
 */
export const getDocumentProcessingStatus = async (
    req: Request, 
    res: Response
): Promise<void> => {
    // Extract and validate parameters
    const documentId = parseInt(req.params.id, 10);

    if (isNaN(documentId) || documentId <= 0) {
        res.status(400).json({
            error: 'Invalid document ID',
            message: 'Document ID must be a positive integer'
        });
        return;
    }

    // Check if document exists
    const document = await documentService.getDocumentById(documentId);
    if (!document) {
        res.status(404).json({
            error: 'Document not found',
            message: `Document with ID ${documentId} not found`
        });
        return;
    }

    // Check processing status using services
    const hasSummary = await summaryService.hasSummary(documentId);
    const hasExtractedData = await extractedDataService.hasExtractedData(documentId);
    const isFullyProcessed = hasSummary && hasExtractedData;

    // Response formatting
    res.status(200).json({
        success: true,
        data: {
            documentId,
            hasSummary,
            hasExtractedData,
            isFullyProcessed,
            needsProcessing: !isFullyProcessed
        }
    });
};

/**
 * Finds and processes pending documents
 * POST /api/documents/process-pending
 */
export const processPendingDocuments = async (
    req: Request, 
    res: Response
): Promise<void> => {
    try {
        // Find documents that need processing
        const unanalyzedDocuments = await documentService.getUnanalyzedDocuments();

        const results: Array<{
            documentId: number;
            hasSummary: boolean;
            hasExtractedData: boolean;
            needsProcessing: boolean;
        }> = [];

        for (const doc of unanalyzedDocuments) {
            const hasSummary = await summaryService.hasSummary(doc.id);
            const hasExtractedData = await extractedDataService.hasExtractedData(doc.id);
            const hasCategory = await categoryService.hasCategory(doc.id);
            const needsProcessing = !hasSummary || !hasExtractedData;

            results.push({
                documentId: doc.id,
                hasSummary,
                hasExtractedData,
                needsProcessing,
            });

            // If document need processing, trigger it
            if (needsProcessing) {
                let localFilePath: string | null = null;
                
                try {
                    // Download the document from storage_path to bucket/reportAPI
                    localFilePath = await downloadDocumentToBucket(doc.storage_path, doc.id);
                    
                    // Get the relative path to send to IA service
                    const bucketFilePath = getBucketFilePath(localFilePath);
                    
                    // Call IA service for analysis
                    const analysisResults = await aiService.callAIServiceForAnalysis(bucketFilePath);
                    
                    // Create summary if needed
                    if (!hasSummary && analysisResults.summary) {
                        await summaryService.createSummary({
                            document_id: doc.id,
                            textual_summary: analysisResults.summary.textual_summary,
                            confidence_score: analysisResults.summary.confidence_score,
                        });
                    }
                    
                    // Create extracted data if needed
                    if (!hasExtractedData && analysisResults.extracted_data && analysisResults.extracted_data.length > 0) {
                        const extractedDataEntries = analysisResults.extracted_data.map(data => ({
                            document_id: doc.id,
                            key: data.key,
                            value: data.value,
                            unit: data.unit || null,
                            page: data.page || null,
                            confidence_score: data.confidence_score,
                            chart_type: data.chart_type || null
                        }));
                        
                        await extractedDataService.createExtractedData(extractedDataEntries);
                    }
                    
                    // Update category if needed and if category from IA exists
                    if (!hasCategory && analysisResults.category) {
                        const category = await categoryService.getCategoryByName(analysisResults.category.name);
                        // If category exists in enum, assign it; otherwise set to null
                        const categoryId = category ? category.id : null;
                        await documentService.updateDocumentCategory(doc.id, categoryId);
                    }
                    
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`Error processing document ${doc.id}:`, errorMessage);
                    // Continue processing other documents even if one fails
                } finally {
                    // Clean up temporary file after processing
                    if (localFilePath) {
                        try {
                            await deleteLocalFile(localFilePath);
                            console.log(`Cleaned up temporary file for document ${doc.id}`);
                        } catch (cleanupError) {
                            console.warn(`Warning: Could not delete temporary file for document ${doc.id}:`, cleanupError);
                        }
                    }
                }
            }
        }

        // Response formatting
        const processed = results.filter(r => !r.needsProcessing).length;
        const needsProcessing = results.filter(r => r.needsProcessing).length;

        res.status(200).json({
            success: true,
            data: {
                totalFound: unanalyzedDocuments.length,
                alreadyProcessed: processed,
                needsProcessing,
                documents: results
            }
        });
    } catch (error) {
        console.error('Error in processPendingDocuments:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to process pending documents'
        });
    }
};

/**
 * Get a document by ID with its processing status
 * GET /api/documents/:id
 */
export const getDocument = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const documentId = parseInt(req.params.id, 10);

        if (isNaN(documentId) || documentId <= 0) {
            res.status(400).json({
                error: 'Invalid document ID'
            });
            return;
        }

        const document = await documentService.getDocumentById(documentId);
        
        if (!document) {
            res.status(404).json({
                error: 'Document not found'
            });
            return;
        }

        const hasSummary = await summaryService.hasSummary(documentId);
        const hasExtractedData = await extractedDataService.hasExtractedData(documentId);

        res.status(200).json({
            success: true,
            data: {
                document,
                processingStatus: {
                    hasSummary,
                    hasExtractedData,
                    isFullyProcessed: hasSummary && hasExtractedData
                }
            }
        });
    } catch (error) {
        console.error('Error in getDocument:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};