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

// Get a category by its ID
router.get('/:id', categoryController.getCategoryById);

export default router;