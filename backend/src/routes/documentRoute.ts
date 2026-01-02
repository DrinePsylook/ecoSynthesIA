import express from 'express';
import * as documentController from '../controller/documentController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * Document routes
 * Maps HTTP requests to controller functions
 * GET /api/documents
 * 
 * Access rules:
 * - Public listing routes: show only public documents (no auth needed)
 * - Direct access routes: public docs for everyone, private docs only for owner
 * - /my-documents: requires auth, shows all user's documents
 */

// ==================== Protected routes (require authentication) ====================

// Get authenticated user's own documents (both public and private)
router.get('/my-documents', authMiddleware, documentController.getMyDocuments);

// ==================== Public listing routes ====================
// These only show PUBLIC documents - no auth needed

// Get analyzed documents (limited, for homepage)
router.get('/analyzed', documentController.getAnalyzedDocuments);

// Get all analyzed documents with pagination
router.get('/analyzed/all', documentController.getAllAnalyzedDocuments);

// ==================== Direct access routes (with optional auth) ====================
// Public documents: accessible to everyone
// Private documents: only accessible if authenticated AND owner

// Get document with its processing status
router.get('/:id', optionalAuthMiddleware, documentController.getDocument);

// Get processing status for a specific document
router.get('/:id/processing-status', optionalAuthMiddleware, documentController.getDocumentProcessingStatus);

// Get complete document data (summary, extracted data, chart types and category)
router.get('/:id/complete', optionalAuthMiddleware, documentController.getCompleteDocumentData);

// ==================== Admin/System routes ====================

// Process pending documents (should probably be protected in production)
router.post('/process-pending', documentController.processPendingDocuments);

export default router;