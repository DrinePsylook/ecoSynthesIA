import dotenv from 'dotenv';
import path from 'path';
import axios from "axios";

import { connectToDatabase, pgPool } from "../../database/database";
import { upsertDocument, DocumentToInsert } from "./seederDb.service";

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = "https://search.worldbank.org/api/v3/wds";
const PAGE_SIZE = 50; 
const FIELDS_TO_FETCH = 'guid,docdt,display_title,url,pdfurl,authr'; 

const START_YEAR = 2025;
const END_YEAR = 2010;

interface WdsDocument {
    id: string;
    guid: string;
    category_id?: string;
    docdt: string;
    display_title: string;
    url: string;
    pdfurl: string;
    authr?: any;
    user_id?: string;
}

function mapDocumentData(doc: WdsDocument): DocumentToInsert | null {

    if (!doc.guid || !doc.display_title || !doc.pdfurl) {
        console.warn(`[SKIP] Document sans GUID, Titre ou PDF URL trouvé: ${doc.id || 'ID Inconnu'}.`);
        return null; 
    }

    // Transform 'YYYY-MM-DDTHH:MM:SSZ' to 'YYYY-MM-DD'
    const publicationDate = doc.docdt ? doc.docdt.split('T')[0] : null;

    let authorString: string | null = 'World Bank';
    if (doc.authr) {
        try {
            const authorsArray = Array.isArray(doc.authr) ? doc.authr : Object.values(doc.authr);
            authorString = authorsArray.join(', ');
        } catch (e) {
            authorString = 'World Bank';
        }
    }

    return {
        user_id: null, 
        category_id: null,
        
        external_doc_id: doc.guid, 
        title: doc.display_title, // Non null grâce à la validation
        date_publication: publicationDate,
        storage_path: doc.pdfurl, // Non null grâce à la validation
        url_source: doc.url,             
        author: authorString, 
    };
}

async function fetchDocumentByYear(year: number): Promise<WdsDocument[]> {
    let allDocuments: WdsDocument[] = [];
    let offset = 0;
    let totalRecords = -1;

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    while (totalRecords === -1 || offset < totalRecords) {
        const url = `${API_URL}?format=json&strdate=${startDate}&enddate=${endDate}&os=${offset}&rows=${PAGE_SIZE}&fl=${FIELDS_TO_FETCH}`;
        
        try {
            const response = await axios.get(url);
            const data = response.data;

            if (totalRecords === -1) {
                totalRecords = data.total || 0;
                console.log(`[${year}] Total of ${totalRecords} documents found.`);
                if (totalRecords === 0) return [];
            }

            const records: WdsDocument[] = Object.values(data.documents || {}) as WdsDocument[];        
            allDocuments.push(...records);

            console.log(`[${year}] Loaded ${records.length} documents (${offset + records.length}/${totalRecords})`); // Ajout d'un log

            offset += records.length;

            if (records.length < PAGE_SIZE) break

            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`API error for ${year} (offset ${offset}):`, (error as any).message);
            break;
        }
    }
    
    return allDocuments;
}

// --- ORCHESTRATION ---
async function runAnnualSeeding(startYear: number, endYear: number) {
    await connectToDatabase();

    // Loop through each year in the range
    for (let year = startYear; year >= endYear; year--) {
        console.log(`\n--- Start of extraction for the year ${year} ---`);

        const documents = await fetchDocumentByYear(year);

        if (documents.length > 0) {
            for (const doc of documents) {
                const docToInsert = mapDocumentData(doc);       
                if (docToInsert)
                    await upsertDocument(docToInsert);
            }
        }
        console.log(`--- ${documents.length} documents processed from ${year}. ---`)
    }
    console.log("\nSeeding process completed for all years.");
    if (pgPool) {
        pgPool.end();
    }
}


runAnnualSeeding(START_YEAR, END_YEAR)
    .catch((error) => {
        console.error("Seeding process failed:", error);
        process.exit(1);
    });