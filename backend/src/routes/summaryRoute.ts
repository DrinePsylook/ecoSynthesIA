import express from 'express';
import * as summaryController from '../controller/summaryController';

const router = express.Router();

/**
 * Summary routes
 * Maps HTTP requests to controller functions
 * GET /api/summaries
 */

// Get summary for a specific document
router.get('/document/:documentId', summaryController.getSummaryForDocument);

// Create a new summary for a document
router.post('/', summaryController.createSummary);

export default router;