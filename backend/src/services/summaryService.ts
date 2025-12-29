import { pgPool, queryResultHasRows } from '../../database/database';
import { Summary, SummaryToInsert, FormattedSummary } from '../models/summaryModel';
import { formatDate } from '../utils/dateUtils';

/**
 * Service layer for analysis operations
 * Contains all database queries related to document analysis
 */

/**
 * Gets the summary for a specific document
 * Returns null if no summary exists
 */
export const getSummaryByDocumentId = async (
    document_id: number
): Promise<FormattedSummary | null> => {
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
                textual_summary, 
                date_analysis, 
                confidence_score
            FROM summaries
            WHERE document_id = $1
            ORDER BY date_analysis DESC
            LIMIT 1;
        `;

        const result = await client.query(query, [document_id]);

        // Check if a summary exists before formatting
        if (!result.rows[0]) {
            return null;
        }

        const summary = result.rows[0] as Summary;
        return {
            ...summary,
            date_analysis: formatDate(summary.date_analysis)
        };
    } catch (error) {
        console.error(`Error getting summary for document ${document_id}:`, error);
        return null;
    } finally {
        client.release();
    }
};

/**
 * Checks if a document has a summary
 */
export const hasSummary = async (document_id: number): Promise<boolean> => {
    const summary = await getSummaryByDocumentId(document_id);
    return summary !== null;
};

/**
 * Creates a new summary for a document
 */
export const createSummary = async(
    summaryData: SummaryToInsert
): Promise<Summary | null> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return null;
    }

    const client = await pgPool.connect();
    try {
        const query = `
            INSERT INTO summaries (document_id, textual_summary, date_analysis, confidence_score)
            VALUES ($1, $2, $3, $4)
            RETURNING id, document_id, textual_summary, date_analysis, confidence_score;
            `;

        const result = await client.query(query, [
            summaryData.document_id,
            summaryData.textual_summary,
            summaryData.date_analysis,
            summaryData.confidence_score
        ]);

        if (queryResultHasRows(result)) {
            return result.rows[0] as Summary;
        }

        return null;
    } catch (error) {
        console.error(`Error creating summary for document ${summaryData.document_id}:`, error);
        return null;
    } finally {
        client.release();
    }
};  