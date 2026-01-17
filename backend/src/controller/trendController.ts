import { Request, Response } from 'express';
import * as trendService from '../services/trendService';
import logger from '../utils/logger';

/**
 * Controller layer for trend operations
 * Handles HTTP request/response, validation or orchestrates services
 */

/**
 * Gets hot topics (most frequently extracted indicators)
 * GET /api/trends/hot-topics
 */
export const getHotTopics = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // Extract and valiate query parameters
        const limit = parseInt(req.query.limit as string, 10) || 5;
        const monthsBack = parseInt(req.query.monthsBack as string, 10) || 3;

        // Validation
        if (limit < 1 || limit > 20) {
            res.status(400).json({
                error: 'Invalid limit parameter',
                message: 'Limit must be between 1 and 20'
            });
            return;
        }

        if (monthsBack < 1 || monthsBack > 12) {
            res.status(400).json({
                error: 'Invalid monthsBack parameter',
                message: 'MonthsBack must be between 1 and 12'
            });
            return;
        }

        // Call service 
        const hotTopics = await trendService.getHotTopics(limit, monthsBack);

        res.status(200).json({
            success: true,
            data: hotTopics,
            count: hotTopics.length
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getHotTopics');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get hot topics'
        });
    }
};