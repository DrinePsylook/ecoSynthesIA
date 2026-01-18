import { Request, Response } from 'express';
import * as summaryService from '../services/summaryService';
import logger from '../utils/logger';

/**
 * Controller layer for summary operations
 * Handles HTTP request/response, validation or orchestrates services
 */

/**
 * Gets summary for a specific document
 * GET /api/summaries/document/:documentId
 */
export const getSummaryForDocument = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const documentId = parseInt(req.params.documentId, 10);

        if (isNaN(documentId) || documentId <= 0) {
            res.status(400).json({
                error: 'Invalid document ID',
                message: 'Document ID must be a positive integer'
            });
            return;
        }

        const summary = await summaryService.getSummaryByDocumentId(documentId);
        if (!summary) {
            res.status(404).json({
                error: 'Summary not found',
                message: `Summary for document ${documentId} not found`
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getSummaryForDocument');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get summary for document'
        });
    }
};

/**
 * Creates a new summary for a document
 * POST /api/summaries
 */
export const createSummary = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { documentId, textualSummary, confidenceScore } = req.body;

        // Validation
        if (!documentId || !textualSummary || confidenceScore === undefined) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'document_id, textual_summary, and confidence_score are required'
            });
            return;
        }
        
        if (typeof confidenceScore !== 'number' || confidenceScore < 0 || confidenceScore > 1) {
            res.status(400).json({
                error: 'Invalid confidence score',
                message: 'confidence_score must be a number between 0 and 1'
            });
            return;
        }

        const summary = await summaryService.createSummary({
            document_id: documentId,
            textual_summary: textualSummary,
            date_analysis: new Date(),
            confidence_score: confidenceScore
        });

        if (!summary) {
            res.status(500).json({
                error: 'Failed to create summary',
                message: 'Failed to create summary for document'
            });
            return;
        }

        res.status(201).json({
            success: true,
            data: summary
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in createSummary');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create summary'
        });
    }
};