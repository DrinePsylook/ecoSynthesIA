import { Request, Response } from 'express';
import * as categoryService from '../services/categoryService';
import * as documentService from '../services/documentService';
import logger from '../utils/logger';

/**
 * Controller layer for category operations
 * Handles HTTP request/response, validation or orchestrates services
 */

/**
 * Gets all categories
 * GET /api/categories
 */
export const getAllCategories = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const categories = await categoryService.getAllCategories();

        res.status(200).json({
            success: true,
            data: categories,
            count: categories?.length || 0
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getAllCategories');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get all categories'
        });
    }
};

/**
 * Gets document count grouped by category
 * GET /api/categories/document-count
 */
export const getDocumentCountByCategory = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const counts = await documentService.getDocumentCountByCategory();

        res.status(200).json({
            success: true,
            data: counts,
            totalCategories: counts.length,
            totalDocuments: counts.reduce((sum, item) => sum + item.document_count, 0)
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getDocumentCountByCategory');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get document count by category'
        });
    }
};

/**
 * Gets a category by its ID
 * GET /api/categories/:id
 */
export const getCategoryById = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const categoryId = parseInt(req.params.id, 10);

        if (isNaN(categoryId) || categoryId <= 0) {
            res.status(400).json({
                error: 'Invalid category ID',
                message: 'Category ID must be a positive integer'
            });
            return;
        }

        const category = await categoryService.getCategoryById(categoryId);

        if (!category) {
            res.status(404).json({
                error: 'Category not found',
                message: `Category with ID ${categoryId} not found`
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getCategoryById');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get category by ID'
        });
    }
}

/**
 * Gets top categories by document count
 * GET /api/categories/top
 */
export const getTopCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string, 10) || 4;
        const categories = await categoryService.getTopCategoriesByDocumentCount(limit);
        res.status(200).json({
            success: true,
            data: categories,
            count: categories.length
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getTopCategories');
        res.status(500).json({ error: 'Failed to retrieve top categories' });
    }
};

/**
 * Gets a category with full details (including document count)
 * GET /api/categories/:id/details
 */
export const getCategoryDetails = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const categoryId = parseInt(req.params.id, 10);

        if (isNaN(categoryId) || categoryId <= 0) {
            res.status(400).json({
                error: 'Invalid category ID',
                message: 'Category ID must be a positive integer'
            });
            return;
        }

        const category = await categoryService.getCategoryByIdWithDetails(categoryId);

        if (!category) {
            res.status(404).json({
                error: 'Category not found',
                message: `Category with ID ${categoryId} not found`
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getCategoryDetails');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get category details'
        });
    }
};

/**
 * Gets documents for a specific category with pagination and sorting
 * GET /api/categories/:id/documents?page=1&limit=10&sort=date&order=desc
 */
export const getDocumentsByCategory = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const categoryId = parseInt(req.params.id, 10);

        // Validate category ID
        if (isNaN(categoryId) || categoryId <= 0) {
            res.status(400).json({
                error: 'Invalid category ID',
                message: 'Category ID must be a positive integer'
            });
            return;
        }

        // Check if category exists
        const category = await categoryService.getCategoryById(categoryId);
        if (!category) {
            res.status(404).json({
                error: 'Category not found',
                message: `Category with ID ${categoryId} not found`
            });
            return;
        }

        // Parse and validate query parameters
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
        const sort = (req.query.sort as string) === 'title' ? 'title' : 'date';
        const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';

        // Get paginated documents
        const result = await categoryService.getDocumentsByCategory(
            categoryId,
            page,
            limit,
            sort,
            order
        );

        res.status(200).json({
            success: true,
            data: result.documents,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getDocumentsByCategory');
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get documents for category'
        });
    }
};
