import { Request, Response } from 'express';

import * as documentService from '../services/documentService';
import * as summaryService from '../services/summaryService';
import * as extractedDataService from '../services/extractedDataService';
import * as categoryService from '../services/categoryService';
import { processPendingDocuments as processPendingDocumentsService } from '../services/documentProcessingService';

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
    console.log('🚀 [CONTROLLER] processPendingDocuments called');
    console.log('🚀 [CONTROLLER] Request received at:', new Date().toISOString());
    
    try {
        console.log('🚀 [CONTROLLER] Calling processPendingDocumentsService...');
        const summary = await processPendingDocumentsService();
        console.log('🚀 [CONTROLLER] Service returned, summary:', {
            totalFound: summary.totalFound,
            needsProcessing: summary.needsProcessing
        });

        res.status(200).json({
            success: true,
            data: {
                totalFound: summary.totalFound,
                alreadyProcessed: summary.alreadyProcessed,
                needsProcessing: summary.needsProcessing,
                processed: summary.processed,
                failed: summary.failed,
                documents: summary.documents
            }
        });
        console.log('🚀 [CONTROLLER] Response sent successfully');
    } catch (error) {
        console.error('❌ [CONTROLLER] Error in processPendingDocuments:', error);
        if (error instanceof Error) {
            console.error('❌ [CONTROLLER] Error message:', error.message);
            console.error('❌ [CONTROLLER] Error stack:', error.stack);
        }
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to process pending documents'
        });
    }
};

/**
 * Gets the most recent analyzed documents
 * Useful for homepage preview of latest analyzed documents
 * GET /api/documents/analyzed?limit=6
 */
export const getAnalyzedDocuments = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // Default limit for homepage display (3 or 6 documents)
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 6;

        // Validate limit parameter
        if (isNaN(limit) || limit <= 0 || limit > 50) {
            res.status(400).json({
                error: 'Invalid limit parameter',
                message: 'Limit must be a positive integer between 1 and 50'
            });
            return;
        }

        // Call the service to get analyzed documents
        const documents = await documentService.getAnalyzedDocuments(limit);

        // Response formatting
        res.status(200).json({
            success: true,
            data: documents,
            count: documents.length
        });
    } catch (error) {
        console.error('Error in getAnalyzedDocuments:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get analyzed documents'
        });
    }
};

/**
 * Gets all analyzed documents with pagination
 * GET /api/documents/analyzed/all?page=1&limit=10&sort=date&order=desc
 */
export const getAllAnalyzedDocuments = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // Parse and validate query parameters
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
        const sort = (req.query.sort as string) === 'title' ? 'title' : 'date';
        const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';

        // Call the service to get paginated documents
        const result = await documentService.getAllAnalyzedDocumentsPaginated(page, limit, sort, order);

        // Response formatting
        res.status(200).json({
            success: true,
            data: result.documents,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error in getAllAnalyzedDocuments:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get analyzed documents'
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