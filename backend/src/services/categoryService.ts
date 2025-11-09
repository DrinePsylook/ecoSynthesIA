import { pgPool, queryResultHasRows } from '../../database/database';
import { Category } from '../models/categoryModel';

/**
 * Service layer for category operations
 * Handles all database queries related to categories
 */

/**
 * Gets all categories
 */
export const getAllCategories = async (): Promise<Category[]> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return [];
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT id, name
            FROM categories
            ORDER BY name ASC;
        `;

        const result = await client.query(query);

        if (queryResultHasRows(result)) {
            return result.rows as Category[];
        }

        return [];
    } catch (error) {
        console.error('Error getting all categories:', error);
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
        console.error('PostgreSQL pool is not initialized');
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
        console.error(`Error getting category ${id}:`, error);
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
        console.error('PostgreSQL pool is not initialized');
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
        console.error(`Error getting category by name ${name}:`, error);
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
        console.error('PostgreSQL pool is not initialized');
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
        console.error(`Error checking category for document ${document_id}:`, error);
        return false;
    } finally {
        client.release();
    }
};