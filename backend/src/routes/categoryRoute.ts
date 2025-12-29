import express from 'express';
import * as categoryController from '../controller/categoryController';

const router = express.Router();

/**
 * Category routes
 * GET /api/categories
 */

// Get all categories
router.get('/', categoryController.getAllCategories);

// Get document count grouped by category
router.get('/document-count', categoryController.getDocumentCountByCategory);

// Get top categories by document count
router.get('/top', categoryController.getTopCategories);

// Get a category by its ID
router.get('/:id', categoryController.getCategoryById);

// Get category details with document count
router.get('/:id/details', categoryController.getCategoryDetails);

// Get documents for a specific category (paginated)
router.get('/:id/documents', categoryController.getDocumentsByCategory);

export default router;