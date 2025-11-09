import { Request, Response } from 'express';
import * as categoryService from '../services/categoryService';
import * as documentService from '../services/documentService';

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
        console.error('Error in getAllCategories:', error);
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
        console.error('Error in getDocumentCountByCategory:', error);
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
        console.error('Error in getCategoryById:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get category by ID'
        });
    }
}