import { pgPool, queryResultHasRows } from '../../database/database';
import { AnalyzedDocument, Document, DocumentCountByCategory } from '../models/documentModel';
import { cleanDocumentTitle } from '../utils/fileUtils';
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
                d.id,
                d.author,
                d.date_publication,
                d.is_public,
                d.storage_path,
                d.title,
                d.url_source,
                d.created_at,
                d.updated_at,
                d.category_id,
                d.user_id,
                c.name AS category_name,
                c.description AS category_description
            FROM documents d
            LEFT JOIN categories c ON d.category_id = c.id
            WHERE d.id = $1;
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

export const getAnalyzedDocuments = async (
    limit: number = 6
): Promise<AnalyzedDocument[]> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return [];
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT 
                d.id,
                d.title,
                d.author,
                TO_CHAR(d.date_publication, 'YYYY-MM-DD') AS date_publication,
                d.is_public,
                d.storage_path,
                d.url_source,
                d.created_at,
                d.updated_at,
                d.user_id,
                d.category_id,
                c.name AS category_name,
                c.description AS category_description,
                s.id AS summary_id,
                s.textual_summary,
                s.date_analysis,
                s.confidence_score,
                COUNT(DISTINCT ed.id) AS extracted_data_count,
                ARRAY_AGG(DISTINCT ed.indicator_category) FILTER (WHERE ed.indicator_category IS NOT NULL) AS indicator_categories
            FROM documents d    -- ← Plus de ligne vide avant !
            LEFT JOIN categories c ON d.category_id = c.id
            INNER JOIN summaries s ON d.id = s.document_id
            LEFT JOIN extracted_data ed ON d.id = ed.document_id
            GROUP BY 
                d.id, d.title, d.author, d.date_publication, d.is_public, 
                d.storage_path, d.url_source, d.created_at, d.updated_at, d.user_id,
                d.category_id, c.name, c.description,
                s.id, s.textual_summary, s.date_analysis, s.confidence_score
            ORDER BY d.date_publication DESC NULLS LAST, d.created_at DESC
            LIMIT $1;
        `;

        const result = await client.query(query, [limit]);

        if (queryResultHasRows(result)) {
            return result.rows.map(row => ({
                id: row.id,
                title: cleanDocumentTitle(row.title),
                author: row.author,
                date_publication: row.date_publication,
                is_public: row.is_public,
                storage_path: row.storage_path,
                url_source: row.url_source,
                created_at: row.created_at,
                updated_at: row.updated_at,
                user_id: row.user_id,
                category_id: row.category_id,
                category_name: row.category_name,
                category_description: row.category_description,
                summary_id: row.summary_id,
                textual_summary: row.textual_summary,
                date_analysis: row.date_analysis,
                confidence_score: row.confidence_score,
                extracted_data_count: parseInt(row.extracted_data_count, 10),
                indicator_categories: row.indicator_categories || []
            })) as AnalyzedDocument[];
        }

        return [];
    } catch (error) {
        console.error('Error getting analyzed documents:', error);
        return [];
    } finally {
        client.release();
    }
};

/**
 * Gets all documents that haven't been analyzed yet
 * A document is considered "not analyzed" if:
 *   - It has no summary, OR
 *   - It has no extracted data AND no_extracted_data flag is false
 * Documents with no_extracted_data=true are skipped (AI confirmed no data to extract)
 * This is the core query for the async processing task 
 */
export const getUnanalyzedDocuments = async (): Promise<Document[]> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return [];
    }

    const client = await pgPool.connect();
    try {
        // First, let's check the counts to understand the situation
        const countQuery = `
            SELECT 
                (SELECT COUNT(*) FROM documents) as total_documents,
                (SELECT COUNT(DISTINCT document_id) FROM summaries) as documents_with_summary,
                (SELECT COUNT(DISTINCT document_id) FROM extracted_data) as documents_with_extracted_data,
                (SELECT COUNT(*) FROM documents WHERE no_extracted_data = true) as documents_with_no_data_flag;
        `;
        
        const countResult = await client.query(countQuery);
        if (countResult.rows.length > 0) {
            const counts = countResult.rows[0];
            console.log('📊 Database statistics:');
            console.log(`  - Total documents: ${counts.total_documents}`);
            console.log(`  - Documents with summary: ${counts.documents_with_summary}`);
            console.log(`  - Documents with extracted_data: ${counts.documents_with_extracted_data}`);
            console.log(`  - Documents flagged as no_extracted_data: ${counts.documents_with_no_data_flag}`);
        }

        // Query explanation:
        // We need documents that:
        //   1. Have no summary (s.document_id IS NULL), OR
        //   2. Have no extracted data (ed.document_id IS NULL) AND are not flagged as "no data to extract"
        // Documents with no_extracted_data=true are considered "processed" even without extracted_data
        const query = `
            SELECT DISTINCT d.*
            FROM documents d
            LEFT JOIN summaries s ON d.id = s.document_id
            LEFT JOIN extracted_data ed ON d.id = ed.document_id
            WHERE s.document_id IS NULL 
               OR (ed.document_id IS NULL AND (d.no_extracted_data IS NULL OR d.no_extracted_data = false))
            ORDER BY d.created_at ASC
            LIMIT 500;
        `;

        const result = await client.query(query);
        
        if (queryResultHasRows(result)) {
            return result.rows as Document[];
        }

        // Fallback: return rows even if queryResultHasRows fails
        if (result.rows && result.rows.length > 0) {
            return result.rows as Document[];
        }

        return [];
    } catch (error) {
        console.error('❌ Error getting unanalyzed documents:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
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
/**
 * Updates the no_extracted_data flag for a document
 * This is set to true when the AI analysis found no extractable data
 * Prevents re-processing documents that legitimately have no data to extract
 */
export const updateDocumentNoExtractedData = async (
    documentId: number,
    noExtractedData: boolean
): Promise<boolean> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return false;
    }

    const client = await pgPool.connect();
    try {
        const query = `
            UPDATE documents
            SET no_extracted_data = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2;
        `;

        const result = await client.query(query, [noExtractedData, documentId]);

        return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
        console.error(`Error updating no_extracted_data for document ${documentId}:`, error);
        return false;
    } finally {
        client.release();
    }
};

