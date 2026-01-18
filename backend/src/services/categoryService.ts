import { pgPool, queryResultHasRows } from '../../database/database';

import { Category } from '../models/categoryModel';
import { PaginatedDocuments } from '../models/documentModel';
import logger from '../utils/logger';
/**
 * Service layer for category operations
 * Handles all database queries related to categories
 */

/**
 * Gets all categories
 */
export const getAllCategories = async (): Promise<Category[]> => {
    if (!pgPool) {
        logger.error('PostgreSQL pool is not initialized');
        return [];
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT
                c.id,
                c.name,
                c.description,
                COUNT(d.id) AS documents_total
            FROM categories c
            LEFT JOIN documents d ON c.id = d.category_id
            GROUP BY c.id, c.name, c.description
            ORDER BY c.name ASC;
        `;

        const result = await client.query(query);

        if (queryResultHasRows(result)) {
            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description,
                documentsTotal: parseInt(row.documents_total, 10)
            }));
        }

        return [];
    } catch (error) {
        logger.error({ err: error }, 'Error getting all categories');
        return [];
    } finally {
        client.release();
    }
};

/**
 * Gets a category by its ID
 */
export const getCategoryById = async (
    id: number
): Promise<Category | null> => {
    if (!pgPool) {
        logger.error('PostgreSQL pool is not initialized');
        return null;
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT id, name
            FROM categories
            WHERE id = $1;
        `;

        const result = await client.query(query, [id]);

        if (queryResultHasRows(result)) {
            return result.rows[0] as Category;
        }

        return null;
    } catch (error) {
        logger.error({ err: error, categoryId: id }, 'Error getting category');
        return null;
    } finally {
        client.release();
    }
};

/**
 * Gets a category by its name
 */
export const getCategoryByName = async (
    name: string
): Promise<Category | null> => {
    if (!pgPool) {
        logger.error('PostgreSQL pool is not initialized');
        return null;
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT id, name
            FROM categories
            WHERE name = $1;
        `;

        const result = await client.query(query, [name]);

        if (queryResultHasRows(result)) {
            return result.rows[0] as Category;
        }

        return null;
    } catch (error) {
        logger.error({ err: error, name }, 'Error getting category by name');
        return null;
    } finally {
        client.release();
    }
};

/**
 * Gets the tom N categories by document count
 * @param limit - The number of top categories to retrieve
 */
export const getTopCategoriesByDocumentCount = async (
    limit: number = 4
): Promise<(Category & { documentsTotal: number })[]> => {
    if (!pgPool) {
        logger.error('PostgreSQL pool is not initialized');
        return [];
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT
                c.id,
                c.name,
                c.description,
                COUNT(d.id) AS documents_total
            FROM categories c
            LEFT JOIN documents d ON c.id = d.category_id
            GROUP BY c.id, c.name, c.description
            ORDER BY documents_total DESC
            LIMIT $1;
        `;

        const result = await client.query(query, [limit]);

        if (queryResultHasRows(result)) {
            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description,
                documentsTotal: parseInt(row.documents_total, 10)
            }));
        }

        return [];
    } catch (error) {
        logger.error({ err: error }, 'Error getting top categories by document count');
        return [];
    } finally {
        client.release();
    }
};



/**
 * Gets documents for a specific category with pagination and sorting
 * @param categoryId - The category ID
 * @param page - Current page (1-based)
 * @param limit - Number of documents per page
 * @param sort - Sort field: 'date' or 'title'
 * @param order - Sort order: 'asc' or 'desc'
 */
export const getDocumentsByCategory = async (
    categoryId: number,
    page: number = 1,
    limit: number = 10,
    sort: 'date' | 'title' = 'date',
    order: 'asc' | 'desc' = 'desc'
): Promise<PaginatedDocuments> => {
    if (!pgPool) {
        logger.error('PostgreSQL pool is not initialized');
        return { documents: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const client = await pgPool.connect();
    try {
        // Calculate offset for pagination
        const offset = (page - 1) * limit;
        
        // Determine ORDER BY clause based on sort and order parameters
        const sortColumn = sort === 'title' ? 'd.title' : 'd.date_publication';
        const sortOrder = order.toUpperCase();

        // Count total documents for this category
        const countQuery = `
            SELECT COUNT(*) as total
            FROM documents d
            WHERE d.category_id = $1
                AND d.is_public = true;
        `;
        const countResult = await client.query(countQuery, [categoryId]);
        const total = parseInt(countResult.rows[0]?.total || '0', 10);
        const totalPages = Math.ceil(total / limit);

        // Get paginated documents with summary info
        const query = `
            SELECT 
                d.id,
                d.title,
                d.author,
                d.date_publication,
                s.textual_summary,
                COUNT(ed.id) as extracted_data_count
            FROM documents d
            LEFT JOIN summaries s ON d.id = s.document_id
            LEFT JOIN extracted_data ed ON d.id = ed.document_id
            WHERE d.category_id = $1
                AND d.is_public = true
            GROUP BY d.id, d.title, d.author, d.date_publication, s.textual_summary
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT $2 OFFSET $3;
        `;

        const result = await client.query(query, [categoryId, limit, offset]);

        // Return documents with raw dates - formatting is done on the frontend
        const documents = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            author: row.author,
            date_publication: row.date_publication,
            textual_summary: row.textual_summary,
            extracted_data_count: parseInt(row.extracted_data_count, 10)
        }));

        return {
            documents,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        };
    } catch (error) {
        logger.error({ err: error, categoryId }, 'Error getting documents for category');
        return { documents: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    } finally {
        client.release();
    }
};

/**
 * Gets a category by its ID with full details (including document count)
 */
export const getCategoryByIdWithDetails = async (
    id: number
): Promise<(Category & { documentsTotal: number }) | null> => {
    if (!pgPool) {
        logger.error('PostgreSQL pool is not initialized');
        return null;
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT
                c.id,
                c.name,
                c.description,
                COUNT(d.id) AS documents_total
            FROM categories c
            LEFT JOIN documents d ON c.id = d.category_id
            WHERE c.id = $1
            GROUP BY c.id, c.name, c.description;
        `;

        const result = await client.query(query, [id]);

        if (queryResultHasRows(result)) {
            const row = result.rows[0];
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                documentsTotal: parseInt(row.documents_total, 10)
            };
        }

        return null;
    } catch (error) {
        logger.error({ err: error, categoryId: id }, 'Error getting category details');
        return null;
    } finally {
        client.release();
    }
};

/**
 * Checks if a document has a category assigned
 */
export const hasCategory = async (document_id: number): Promise<boolean> => {
    if (!pgPool) {
        logger.error('PostgreSQL pool is not initialized');
        return false;
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT category_id
            FROM documents
            WHERE id = $1 AND category_id IS NOT NULL;
        `;

        const result = await client.query(query, [document_id]);

        return queryResultHasRows(result);
    } catch (error) {
        logger.error({ err: error, documentId: document_id }, 'Error checking category for document');
        return false;
    } finally {
        client.release();
    }
};