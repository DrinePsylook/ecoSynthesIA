import { pgPool, queryResultHasRows } from '../../database/database';
import { ExtractedData, ExtractedDataToInsert } from '../models/extractedDataModel';

/**
 * Service layer for extracted datas operations
 * Handles all database operations related to extracted key-value pairs for data visualization
 */

/**
 * Gets all extracted data for a specific document
 * Used to verify if document has been processed for data extraction
 */
export const getExtractedDataByDocumentId = async (
    document_id: number
): Promise<ExtractedData[] | null> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return null;
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT 
                id,
                document_id,
                key,
                value,
                unit,
                page,
                confidence_score,
                chart_type
            FROM extracted_data
            WHERE document_id = $1
            ORDER BY page ASC, key ASC;
        `;

        const result = await client.query(query, [document_id]);

        if (queryResultHasRows(result)) {
            return result.rows as ExtractedData[];
        }

        return [];
    } catch (error) {
        console.error(`Error getting extracted data for document ${document_id}:`, error);
        return [];
    } finally {
        client.release();
    }
};

/**
 * Chacks if a document has extracted data
 */
export const hasExtractedData = async (document_id: number): Promise<boolean> => {
    const extractedData = await getExtractedDataByDocumentId(document_id);
    return extractedData !== null && extractedData.length !== undefined && extractedData.length > 0;
};

/** 
 * Creates extracted data for a document
 * Can insert multiple entries at once
*/
export const createExtractedData = async (
    dataEntries: ExtractedDataToInsert[]
): Promise<ExtractedData[]> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return [];
    }

    const client = await pgPool.connect();
    try {
        const insertQuery = `
            INSERT INTO extracted_data 
                (document_id, key, value, unit, page, confidence_score, chart_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (document_id, key) DO UPDATE SET
                value = EXCLUDED.value,
                unit = EXCLUDED.unit,
                page = EXCLUDED.page,
                confidence_score = EXCLUDED.confidence_score,
                chart_type = EXCLUDED.chart_type
            RETURNING id, document_id, key, value, unit, page, confidence_score, chart_type;
        `;

        const insertedData : ExtractedData[] = [];

        for (const entry of dataEntries) {
            const result = await client.query(insertQuery, [
                entry.document_id,
                entry.key,
                entry.value.toString(),
                entry.unit || null,
                entry.page || null,
                entry.confidence_score,
                entry.chart_type || null
            ]);

            if (queryResultHasRows(result)) {
                insertedData.push(result.rows[0] as ExtractedData);
            }
        }

        await client.query('COMMIT');
        return insertedData;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating extracted data:', error);
        return [];
    } finally {
        client.release();
    }
};
