import { QueryResult } from 'pg';

import { pgPool, queryResultHasRows } from '../../database/database';

export interface DocumentToInsert {
    external_doc_id: string; // use GUID from world bank (unique id)
    author: string | null;
    category_id: string | null;
    date_publication: string | null;
    storage_path: string| null;
    title: string;
    url_source: string | null;
    user_id: string | null; 
}

export const upsertDocument = async (doc: DocumentToInsert): Promise<QueryResult<any> | null> => {
    if (!pgPool) {
        console.error('PostgreSQL pool is not initialized');
        return null;
    }

    const client = await pgPool.connect();
    try {
        const query = `
            INSERT INTO documents (
                external_doc_id, title, date_publication, storage_path, 
                url_source, author, user_id, category_id, is_public
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
            -- Condition d'UPSERT utilisant la colonne UNIQUE de la Banque Mondiale
            ON CONFLICT (external_doc_id) DO UPDATE SET
                title = EXCLUDED.title,
                date_publication = EXCLUDED.date_publication,
                storage_path = EXCLUDED.storage_path,
                url_source = EXCLUDED.url_source,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id;
        `;

        const values = [
            doc.external_doc_id,    // $1
            doc.title,              // $2
            doc.date_publication,   // $3
            doc.storage_path,       // $4
            doc.url_source,         // $5
            doc.author,             // $6
            doc.user_id,            // $7
            doc.category_id         // $8
        ];

        const result = await client.query(query, values);

        if (queryResultHasRows(result)) {
            console.log(`[DB] Document ${doc.external_doc_id} insert/update with id: ${result.rows[0].id}`);
        }

        return result;
    }
    catch (error) {
        console.error(`Error upserting for the document ${doc.external_doc_id}:`, error);        
        return null;
    }
    finally {
        client.release();
    }
};
