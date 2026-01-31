import { pgPool, queryResultHasRows } from '../../database/database';
import { HotTopic } from '../models/trendModel';
import logger from '../utils/logger';

/**
 * Service layer for trend operations
 * Handles all database queries related to trends and hot topics
 */

/** 
 * Gets the most frequently extracted indicator from recent documents
 * @param limit - Number of hot topics to retrieve
 * @param monthsBack - Number of months to look back
 */
export const getHotTopics = async (
    limit: number = 5,
    monthsBack: number = 12
): Promise<HotTopic[]> => {
    if (!pgPool) {
        logger.error('PostgreSQL pool is not initialized');
        return [];
    }

    const client = await pgPool.connect();
    try {
        const query = `
            SELECT 
                ed.indicator_category,
                ed.key,
                ed.unit,
                COUNT(DISTINCT ed.document_id) as frequency,
                ROUND(AVG(
                CASE 
                    WHEN ed.value ~ '^[0-9]+\.?[0-9]*$' 
                    AND ed.value NOT LIKE '%\%%'  
                    AND ed.value NOT LIKE '%€%'  
                    AND ed.value NOT LIKE '%$%'  
                    THEN CAST(ed.value AS NUMERIC)
                    ELSE NULL 
                END
), 2) as avg_value
            FROM extracted_data ed
            JOIN documents d ON ed.document_id = d.id
            WHERE (d.date_publication >= NOW() - INTERVAL '${monthsBack} months' OR d.date_publication IS NULL)
                AND d.is_public = true
                AND ed.indicator_category != 'other'
                AND ed.key IS NOT NULL
            GROUP BY ed.indicator_category, ed.key, ed.unit
            HAVING COUNT(DISTINCT ed.document_id) >= 1
            ORDER BY frequency DESC, ed.indicator_category
            LIMIT $1;
        `;

        const result = await client.query(query, [limit]);

        if (queryResultHasRows(result)) {
            return result.rows.map(row => ({
                indicator_category: row.indicator_category,
                key: row.key,
                unit: row.unit || '',
                frequency: parseInt(row.frequency, 10),
                avg_value: row.avg_value ? parseFloat(row.avg_value) : null
            }));
        }

        return [];
    } catch (error) {
        logger.error({ err: error }, 'Error getting hot topics');
        return [];
    } finally {
        client.release();
    }
};