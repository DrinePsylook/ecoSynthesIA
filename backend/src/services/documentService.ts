import { pgPool, queryResultHasRows } from '../../database/database';
import { Document, DocumentCountByCategory } from '../models/documentModel';

/**
 * Service layer for document operations
 * Handles all database queries related to documents
 */

/**
 * Gets a document by its ID
 */
export const getDocumentById = async (
    id: number
): Promise<Document | null> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return null;
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT 
                id,
                author,
                date_publication,
                is_public,
                storage_path,
                title,
                url_source,
                created_at,
                updated_at,
                category_id,
                user_id
            FROM documents
            WHERE id = $1;
        `;

        const result = await client.query(query, [id]);

        if (queryResultHasRows(result)) {
            return result.rows[0] as Document;
        }

        return null;
    } catch (error) {
        console.error(`Error getting document ${id}:`, error);
        return null;
    } finally {
        client.release();
    }
};

/**
 * Gets the count of documents by category
 */
export const getDocumentCountByCategory = async (): Promise<DocumentCountByCategory[]> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return [];
    }
    const client = await pgPool.connect();
    try {
        const query = `
            SELECT 
                d.category_id,,
                c.name AS category_name,
                COUNT(d.id) AS document_count
            FROM documents d
            LEFT JOIN categories c ON d.category_id = c.id
            GROUP BY d.category_id, c.name
            ORDER BY document_count DESC, category_name ASC NULLS LAST;
        `;

        const result = await client.query(query);

        if (queryResultHasRows(result)) {
            return result.rows.map(row => ({
                category_id: row.category_id,
                category_name: row.category_name,
                document_count:parseInt(row.document_count, 10)
            })) as DocumentCountByCategory[];
        }

        return [];
    } catch (error) {
        console.error('Error getting document count by category:', error);
        return [];
    } finally {
        client.release();
    }
};


/**
 * Gets all documents tha haven't been analyzed yet
 * A document is considered "not analyzed" if it has neither a summary nor extracted data
 * This is the core query for the async processing task 
 */
export const getUnanalyzedDocuments = async (): Promise<Document[]> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return [];
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT DISTINCT d.*
            FROM documents d
            LEFT JOIN summaries s ON d.id = s.document_id
            LEFT JOIN extracted_data ed ON d.id = ed.document_id
            WHERE s.document_id IS NULL 
               OR ed.document_id IS NULL
            ORDER BY d.created_at ASC;
        `;

        const result = await client.query(query);

        if (queryResultHasRows(result)) {
            return result.rows as Document[];
        }

        return [];
    } catch (error) {
        console.error('Error getting unanalyzed documents:', error);
        return [];
    } finally {
        client.release();
    }
};


/**
 * Updates the category_id of a document
 */
export const updateDocumentCategory = async (
    documentId: number,
    categoryId: number | null
): Promise<boolean> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return false;
    }

    const client = await pgPool.connect();
    try {
        const query = `
            UPDATE documents
            SET category_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2;
        `;

        const result = await client.query(query, [categoryId, documentId]);

        return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
        console.error(`Error updating category for document ${documentId}:`, error);
        return false;
    } finally {
        client.release();
    }
};
