import * as documentService from './documentService';
import * as summaryService from './summaryService';
import * as extractedDataService from './extractedDataService';
import * as categoryService from './categoryService';
import * as aiService from './aiService';
import { downloadDocumentToBucket, getBucketFilePath, deleteLocalFile } from '../utils/fileUtils';
import { ProcessingResult, ProcessingSummary } from 'src/models/processingInterface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BUCKET_PATH } from '../constants';
import logger from '../utils/logger';

/**
 * Checks if a storage_path is a local bucket path or an external URL
 */
const isLocalBucketPath = (storagePath: string): boolean => {
    return storagePath.startsWith('bucket/');
};

/**
 * Gets the full local path for a bucket file
 */
const getFullLocalPath = (storagePath: string): string => {
    const relativePath = storagePath.replace(/^bucket\//, '');
    return path.join(BUCKET_PATH, relativePath);
};

/**
 * Checks if a local file exists
 */
const localFileExists = async (filePath: string): Promise<boolean> => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
};

/**
 * Service layer for document processing operations
 * Handles the orchestration of the document processing pipeline
 */

/**
 * Processes a single document through the AI analysis pipeline
 * @param doc Document to process
 * @returns Processing result with success status
 */
export const processDocument = async (doc: {
    id: number;
    storage_path: string;
    title: string;
}): Promise<ProcessingResult> => {
    const hasSummary = await summaryService.hasSummary(doc.id);
    const hasExtractedData = await extractedDataService.hasExtractedData(doc.id);
    const hasCategory = await categoryService.hasCategory(doc.id);
    const needsProcessing = !hasSummary || !hasExtractedData;

    const result: ProcessingResult = {
        documentId: doc.id,
        hasSummary,
        hasExtractedData,
        hasCategory,
        needsProcessing,
        success: false
    };

    if (!needsProcessing) {
        result.success = true;
        return result;
    }

    let localFilePath: string | null = null;
    let isLocalFile = false;

    try {
        // Check if the document is already in the local bucket or needs to be downloaded
        if (isLocalBucketPath(doc.storage_path)) {
            // Document is already in the bucket (uploaded by user)
            localFilePath = getFullLocalPath(doc.storage_path);
            isLocalFile = true;
            
            // Verify the file exists
            if (!await localFileExists(localFilePath)) {
                logger.error({ documentId: doc.id, path: localFilePath }, 'Local file not found');
                result.error = 'Local file not found';
                return result;
            }
            logger.debug({ documentId: doc.id, path: localFilePath }, 'Using local file');
        } else {
            // Document is external, download it
            localFilePath = await downloadDocumentToBucket(doc.storage_path, doc.id, doc.title);
            logger.debug({ documentId: doc.id, path: localFilePath }, 'Downloaded document');
        }

        // Get the relative path for the AI service
        const bucketFilePath = isLocalFile ? doc.storage_path : getBucketFilePath(localFilePath);

        const analysisResults = await aiService.callAIServiceForAnalysis(bucketFilePath, doc.id);
        logger.info({ documentId: doc.id }, 'IA service responded successfully');

        // Create summary if needed
        if (!hasSummary && analysisResults.summary) {
            await summaryService.createSummary({
                document_id: doc.id,
                textual_summary: analysisResults.summary.textual_summary,
                date_analysis: new Date(),
                confidence_score: analysisResults.summary.confidence_score,
            });
            logger.info({ documentId: doc.id }, 'Summary created successfully');
        }

        // Create extracted data if needed
        if (!hasExtractedData && analysisResults.extracted_data && analysisResults.extracted_data.length > 0) {
            const extractedDataEntries = analysisResults.extracted_data.map(data => {
                // Clean page value: convert to number or null
                let pageValue: number | null = null;
                if (typeof data.page === 'number') {
                    pageValue = data.page;
                } else if (typeof data.page === 'string') {
                    const parsed = parseInt(data.page, 10);
                    if (!isNaN(parsed)) {
                        pageValue = parsed;
                    }
                    // If it's "unknown" or any non-numeric string, leave as null
                }
        
                return {
                    document_id: doc.id,
                    key: data.key,
                    value: String(data.value),
                    unit: data.unit || null,
                    page: pageValue,
                    confidence_score: data.confidence_score,
                    chart_type: data.chart_type || null,
                    indicator_category: data.indicator_category || 'other'
                };
            });
        
            await extractedDataService.createExtractedData(extractedDataEntries);
            logger.info({ documentId: doc.id }, 'Extracted data created successfully');
        } else if (!hasExtractedData && (!analysisResults.extracted_data || analysisResults.extracted_data.length === 0)) {
            // AI analyzed the document but found no data to extract
            // Set the no_extracted_data flag to prevent re-processing
            await documentService.updateDocumentNoExtractedData(doc.id, true);
            logger.info({ documentId: doc.id }, 'No extracted data found - flagged as no_extracted_data');
        }

        // Create category if needed 
        if (!hasCategory && analysisResults.category) {
            const category = await categoryService.getCategoryByName(analysisResults.category.name);
            const categoryId = category ? category.id : null;
            await documentService.updateDocumentCategory(doc.id, categoryId);
            if (categoryId) {
                logger.info({ documentId: doc.id, category: analysisResults.category.name }, 'Category assigned');
            }
        }

        result.success = true;
        result.hasSummary = true;
        result.hasExtractedData = true;
        result.hasCategory = true;
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.error = errorMessage;
        logger.error({ documentId: doc.id, err: error }, 'Error during processing');
    } finally {
        // Only delete temporary files (downloaded from external URLs)
        // Don't delete local files uploaded by users!
        if (localFilePath && !isLocalFile) {
            try {
                await deleteLocalFile(localFilePath);
                logger.debug({ documentId: doc.id }, 'Temporary file deleted');
            } catch (cleanupError) {
                logger.warn({ documentId: doc.id, err: cleanupError }, 'Could not delete temporary file');
            }
        }
    }
    return result;
};

/**
 * Processes pending documents
 * @param documentId - Optional. If provided, only process this specific document
 * @returns Summary of processing results
 */
export const processPendingDocuments = async (documentId?: number): Promise<ProcessingSummary> => {
    logger.info('Finding documents that need processing');

    let unanalyzedDocuments;

    if (documentId) {
        // Process a specific document (use internal function to bypass visibility rules)
        logger.info({ documentId }, 'Processing specific document');
        const doc = await documentService.getDocumentByIdInternal(documentId);
        unanalyzedDocuments = doc ? [doc] : [];
        logger.debug({ documentId, found: !!doc }, 'Document lookup result');
    } else {
        // Process all unanalyzed documents
        unanalyzedDocuments = await documentService.getUnanalyzedDocuments();
    }
    
    logger.info({ count: unanalyzedDocuments.length }, 'Documents found for processing');

    const results: ProcessingResult[] = [];
    let processed = 0;
    let failed = 0;

    for (const doc of unanalyzedDocuments) {
        logger.info({ documentId: doc.id }, 'Processing document');
        const result = await processDocument(doc);
        results.push(result);
    
        if (result.success) {
            processed++;
            logger.info({ documentId: doc.id }, 'Document processed successfully');
            // Wait 5 seconds between successful documents to let Ollama clear VRAM
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else if (result.needsProcessing && !result.success) {
            failed++;
            logger.warn({ documentId: doc.id, error: result.error }, 'Document processing failed');
            // Wait 10 seconds after failures to let Ollama recover
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    const alreadyProcessed = results.filter(r => !r.needsProcessing).length;
    const needsProcessing = results.filter(r => r.needsProcessing).length;

    return {
        totalFound: unanalyzedDocuments.length,
        alreadyProcessed,
        needsProcessing,
        processed,
        failed,
        documents: results
    };
};