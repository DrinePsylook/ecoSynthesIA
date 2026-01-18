import { Request, Response } from 'express';

import * as documentService from '../services/documentService';
import * as summaryService from '../services/summaryService';
import * as extractedDataService from '../services/extractedDataService';
import * as categoryService from '../services/categoryService';
import { processPendingDocuments as processPendingDocumentsService } from '../services/documentProcessingService';
import { StorageService } from '../services/storageService';
import logger from '../utils/logger';

/**
 * Controller layer for document operations
 * Handles HTTP request/response, validation or orchestrates services
 */

/**
 * Creates a new document with file upload
 * POST /api/documents
 * 
 * Requires authentication
 */
export const createDocument = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Check if file was uploaded
        const file = req.file;
        if (!file) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded. Please select a PDF file.'
            });
            return;
        }

        // Validate file type (PDF only)
        if (file.mimetype !== 'application/pdf') {
            res.status(400).json({
                success: false,
                message: 'Only PDF files are allowed'
            });
            return;
        }

        // Get form data
        const { title, author, date_publication, is_public, analyze_with_ai } = req.body;
        if (!title || !title.trim()) {
            res.status(400).json({
                success: false,
                message: 'Title is required'
            });
            return;
        }

        const storagePath = await StorageService.saveDocument(
            userId,
            file.buffer,
            file.originalname
        );

        // Create document in database
        const document = await documentService.createDocument({
            title: title.trim(),
            author: author?.trim()|| undefined,
            date_publication: date_publication || undefined,
            is_public: is_public ?? false,
            storage_path: storagePath,
            user_id: userId,
        });

        if (!document) {
            // Clean up uploaded file if DB insert failed
            await StorageService.deleteDocument(storagePath);
            res.status(500).json({
                success: false,
                message: 'Failed to create document'
            });
            return;
        }

        // Optionally trigger AI analysis
        if (analyze_with_ai === 'true') {
            // This will be processed by process-pending
            logger.info({ documentId: document.id }, 'Document queued for AI analysis');
        }

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            document: document
        });

    } catch (error) {
        logger.error({ err: error }, 'Error in createDocument');
        res.status(500).json({
            success: false,
            message: 'Failed to upload document'
        });
    }
};

/**
 * Deletes a document owned by the authenticated user
 * DELETE /api/documents/:id
 */
export const deleteDocument = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const documentId = parseInt(req.params.id, 10);

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (isNaN(documentId) || documentId <= 0) {
            res.status(400).json({
                success: false,
                message: 'Invalid document ID'
            });
            return;
        }

        // Get document to verify ownership
        const document = await documentService.getDocumentById(documentId, userId);
        
        if (!document) {
            res.status(404).json({
                success: false,
                message: 'Document not found'
            });
            return;
        }

        // Verify ownership
        if (document.user_id !== userId) {
            res.status(403).json({
                success: false,
                message: 'You can only delete your own documents'
            });
            return;
        }

        // Delete the document (this will also delete related data via CASCADE)
        const deleted = await documentService.deleteDocument(documentId);

        if (deleted) {
            // Also delete the file from storage
            const { StorageService } = await import('../services/storageService');
            await StorageService.deleteDocument(document.storage_path);

            res.status(200).json({
                success: true,
                message: 'Document deleted successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to delete document'
            });
        }
    } catch (error) {
        logger.error({ err: error }, 'Error in deleteDocument');
        res.status(500).json({
            success: false,
            message: 'Failed to delete document'
        });
    }
};

/**
 * Gets complete document data : document, summary, extracted data, chart types and category
 * GET /api/documents/:id/complete
 * 
 * Access: Public documents for everyone, private documents only for owner
 */
export const getCompleteDocumentData = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const documentId = parseInt(req.params.id, 10);
        const userId = req.user?.userId; // From optional auth middleware

        if (isNaN(documentId) || documentId <= 0) {
            res.status(400).json({
                error: 'Invalid document ID'
            });
            return;
        }

        // Get document (includes user's private docs if authenticated)
        const document = await documentService.getDocumentById(documentId, userId);
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
        logger.error({ err: error }, 'Error in getCompleteDocumentData');
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
    const userId = req.user?.userId; // From optional auth middleware

    if (isNaN(documentId) || documentId <= 0) {
        res.status(400).json({
            error: 'Invalid document ID',
            message: 'Document ID must be a positive integer'
        });
        return;
    }

    // Check if document exists (includes user's private docs if authenticated)
    const document = await documentService.getDocumentById(documentId, userId);
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
 * 
 * Optional body parameter:
 * - document_id: If provided, only process this specific document (must be owned by authenticated user)
 *                If not provided, process all pending documents
 */
export const processPendingDocuments = async (
    req: Request,
    res: Response
): Promise<void> => {
    logger.info('processPendingDocuments called');
    
    try {
        const { document_id } = req.body;
        const userId = req.user?.userId;

        // If document_id is provided, verify ownership before processing
        if (document_id) {
            const docId = parseInt(document_id, 10);
            
            logger.debug({ documentId: docId, userId }, 'Checking document ownership');
            
            if (isNaN(docId) || docId <= 0) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid document ID'
                });
                return;
            }

            // Verify the user owns this document (regardless of public/private status)
            const isOwner = await documentService.isDocumentOwner(docId, userId);
            logger.debug({ documentId: docId, isOwner }, 'Document ownership check result');
            
            if (!isOwner) {
                res.status(404).json({
                    success: false,
                    message: 'Document not found or access denied'
                });
                return;
            }

            logger.info({ documentId: docId }, 'Processing single document');
        }

        logger.debug('Calling processPendingDocumentsService');
        const summary = await processPendingDocumentsService(document_id ? parseInt(document_id, 10) : undefined);
        logger.info({ totalFound: summary.totalFound, needsProcessing: summary.needsProcessing }, 'Document processing completed');

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
        logger.debug('Response sent successfully');
    } catch (error) {
        logger.error({ err: error }, 'Error in processPendingDocuments');
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
 * 
 * Only returns PUBLIC documents
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

        // Only returns public documents
        const documents = await documentService.getAnalyzedDocuments(limit);

        // Response formatting
        res.status(200).json({
            success: true,
            data: documents,
            count: documents.length
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getAnalyzedDocuments');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get analyzed documents'
        });
    }
};

/**
 * Gets all analyzed documents with pagination
 * GET /api/documents/analyzed/all?page=1&limit=10&sort=date&order=desc
 * 
 * Only returns PUBLIC documents
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

        // Only returns public documents
        const result = await documentService.getAllAnalyzedDocumentsPaginated(page, limit, sort, order);

        // Response formatting
        res.status(200).json({
            success: true,
            data: result.documents,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getAllAnalyzedDocuments');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get analyzed documents'
        });
    }
};

/**
 * Get a document by ID with its processing status
 * GET /api/documents/:id
 * 
 * Access: Public documents for everyone, private documents only for owner
 */
export const getDocument = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const documentId = parseInt(req.params.id, 10);
        const userId = req.user?.userId; // From optional auth middleware

        if (isNaN(documentId) || documentId <= 0) {
            res.status(400).json({
                error: 'Invalid document ID'
            });
            return;
        }

        // Get document (includes user's private docs if authenticated)
        const document = await documentService.getDocumentById(documentId, userId);
        
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
        logger.error({ err: error }, 'Error in getDocument');
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

/**
 * Gets all documents owned by the authenticated user
 * GET /api/documents/my-documents?page=1&limit=10
 * 
 * Requires authentication
 */
export const getMyDocuments = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;

        // This should not happen if authMiddleware is used, but just in case
        if (!userId) {
            res.status(401).json({
                error: 'Authentication required',
                message: 'You must be logged in to view your documents'
            });
            return;
        }

        // Parse pagination parameters
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

        // Get user's documents
        const result = await documentService.getUserDocuments(userId, page, limit);

        res.status(200).json({
            success: true,
            data: result.documents,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getMyDocuments');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get your documents'
        });
    }
};

/**
 * Updates a document owned by the authenticated user
 * PATCH /api/documents/:id
 */
export const updateDocument = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const documentId = parseInt(req.params.id, 10);

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (isNaN(documentId) || documentId <= 0) {
            res.status(400).json({
                success: false,
                message: 'Invalid document ID'
            });
            return;
        }

        // Get document to verify ownership
        const document = await documentService.getDocumentById(documentId, userId);
        
        if (!document) {
            res.status(404).json({
                success: false,
                message: 'Document not found'
            });
            return;
        }

        // Verify ownership
        if (document.user_id !== userId) {
            res.status(403).json({
                success: false,
                message: 'You can only edit your own documents'
            });
            return;
        }

        // Extract allowed fields from request body
        const { title, author, date_publication, is_public } = req.body;

        // Validate title if provided
        if (title !== undefined && !title.trim()) {
            res.status(400).json({
                success: false,
                message: 'Title cannot be empty'
            });
            return;
        }

        // Update the document
        const updated = await documentService.updateDocument(documentId, {
            title: title?.trim(),
            author: author,
            date_publication: date_publication,
            is_public: is_public,
        });

        if (updated) {
            res.status(200).json({
                success: true,
                message: 'Document updated successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to update document'
            });
        }
    } catch (error) {
        logger.error({ err: error }, 'Error in updateDocument');
        res.status(500).json({
            success: false,
            message: 'Failed to update document'
        });
    }
};