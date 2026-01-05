import express from 'express';
import multer from 'multer';
import * as documentController from '../controller/documentController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// Create a new document with file upload
router.post('/', authMiddleware, upload.single('document'), documentController.createDocument);  // <-- AJOUTER

// Get authenticated user's own documents (both public and private)
router.get('/my-documents', authMiddleware, documentController.getMyDocuments);

// Update a document (owner only)
router.patch('/:id', authMiddleware, documentController.updateDocument);

// Delete a document (owner only)
router.delete('/:id', authMiddleware, documentController.deleteDocument);

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

// Process pending documents
// - With document_id: requires auth to verify ownership
// - Without document_id: processes all pending (system/admin use)
router.post('/process-pending', authMiddleware, documentController.processPendingDocuments);

export default router;