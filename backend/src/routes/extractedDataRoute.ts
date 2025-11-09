import express from 'express';
import * as extractedDataController from '../controller/extractedDataController';

const router = express.Router();

/**
 * Extracted data routes
 * GET /api/extracted-data
 */

// Get all extracted data for a specific document
router.get('/document/:documentId', extractedDataController.getExtractedDataForDocument);

// Create a new extracted data for a document
router.post('/', extractedDataController.createExtractedData);

export default router;