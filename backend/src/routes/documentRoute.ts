import express from 'express';
import * as documentController from '../controller/documentController';

const router = express.Router();

/**
 * Document routes
 * Maps HTTP requests to controller functions
 * GET /api/documents
 */


// Get analyzed documents
router.get('/analyzed', documentController.getAnalyzedDocuments);

// Process pending documents
router.post('/process-pending', documentController.processPendingDocuments);

// Get document with its processing status
router.get('/:id', documentController.getDocument);

// Get processing status for a specific document
router.get('/:id/processing-status', documentController.getDocumentProcessingStatus);

// Get complete document data (summary, extracted data, chart types and category)
router.get('/:id/complete', documentController.getCompleteDocumentData);

export default router;