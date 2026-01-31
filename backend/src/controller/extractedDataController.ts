import { Request, Response } from 'express';
import * as extractedDataService from '../services/extractedDataService';
import logger from '../utils/logger';

/**
 * Controller layer for extracted data operations
 * Handles HTTP request/response, validation or orchestrates services
 */

/**
 * Gets all extracted data for a specific document
 * GET /api/extracted-data/document/:documentId
 */
export const getExtractedDataForDocument = async (
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

        const extractedData = await extractedDataService.getExtractedDataByDocumentId(documentId);

        if (!extractedData === null) {
            res.status(500).json({
                error: 'Database error',
                message: 'Failed to query extracted data'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: extractedData,
            count: extractedData?.length || 0
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getExtractedDataByDocumentId');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get extracted data'
        });
    }
};

/**
 * Creates extracted data for a document
 * POST /api/extracted-data
 */
export const createExtractedData = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { dataEntries } = req.body;

        // Validation
        if (!Array.isArray(dataEntries) || dataEntries.length === 0) {
            res.status(400).json({
                error: 'Invalid data entries',
                message: 'dataEntries must be a non-empty array'
            });
            return;
        }
        
        // Validate each entry
        for (const entry of dataEntries) {
            if(!entry.document_id || !entry.key || entry.confidence_score === undefined) {
                res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Each entry must have document_id, key, and confidence_score'
                });
                return;
            }

            if(entry.confidence_score < 0 || entry.confidence_score > 1) {
                logger.error({
                    documentId: entry.document_id,
                    key: entry.key,
                    invalidScore: entry.confidence_score
                }, 'Invalid confidence score detected');

                res.status(422).json({
                    error: 'Unprocessable Entity',
                    message: `Invalid confidence score: ${entry.confidence_score}. Must be between 0 and 1.`,
                    field: 'confidence_score',
                    received: entry.confidence_score
                });
                return;
            }

        }
        
        const createdData = await extractedDataService.createExtractedData(dataEntries);

        res.status(201).json({
            success: true,
            data: createdData,
            count: createdData?.length || 0
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in createExtractedData');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create extracted data'
        });
    }
};

