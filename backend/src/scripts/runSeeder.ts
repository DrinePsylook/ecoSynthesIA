import dotenv from 'dotenv';
import path from 'path';
import axios from "axios";

import { connectToDatabase, pgPool } from "../../database/database";
import { upsertDocument, DocumentToInsert } from "./seederDb.service";

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// World Bank API configuration
const API_URL = "https://search.worldbank.org/api/v3/wds";
const PAGE_SIZE = 50; // Number of documents per API request
const FIELDS_TO_FETCH = 'guid,docdt,display_title,url,pdfurl,authr,authr_exact'; // Fields to retrieve from API

// Year range for document extraction (startYear down to endYear)
const START_YEAR = 2025;
const END_YEAR = 2017;

// Structure of a document returned by the World Bank API
interface WdsDocument {
    id: string;
    guid: string;
    category_id?: string;
    docdt: string;
    display_title: string;
    url: string;
    pdfurl: string;
    authr?: any;
    authr_exact?: any;
    user_id?: string;
}

/**
 * Maps World Bank API document data to our database schema format
 * @param doc - Raw document data from World Bank API
 * @returns Mapped document data or null if essential fields are missing
 */
function mapDocumentData(doc: WdsDocument): DocumentToInsert | null {
    // Validate that required fields are present
    if (!doc.guid || !doc.display_title || !doc.pdfurl) {
        console.warn(`[SKIP] Document sans GUID, Titre ou PDF URL trouvé: ${doc.id || 'ID Inconnu'}.`);
        return null; 
    }

    // Transform 'YYYY-MM-DDTHH:MM:SSZ' to 'YYYY-MM-DD'
    const publicationDate = doc.docdt ? doc.docdt.split('T')[0] : null;

    // Extract and format author information
    let authorString: string | null = null;
    
    // Try authr_exact first (more precise), then authr as fallback
    const authorField = doc.authr_exact || doc.authr;
    
    if (authorField) {
        try {
            if (typeof authorField === 'string') {
                // If it's already a string, use it directly
                authorString = authorField.trim();
            } else if (Array.isArray(authorField)) {
                // If it's an array, join with comma
                const filtered = authorField.filter(a => a && a.trim());
                authorString = filtered.length > 0 ? filtered.join(', ') : null;
            } else if (typeof authorField === 'object') {
                // If it's an object, extract values
                const authorsArray = Object.values(authorField).filter(a => a && typeof a === 'string' && a.trim());
                authorString = authorsArray.length > 0 ? authorsArray.join(', ') : null;
            }
            
            // Final cleanup: if empty string, set to null
            if (authorString === '' || authorString === 'World Bank') {
                authorString = null;
            }
        } catch (e) {
            console.warn(`[WARN] Failed to parse author for ${doc.guid}:`, e);
            authorString = null;
        }
    }

    // Return mapped document with database schema format
    return {
        user_id: null, 
        category_id: null,
        external_doc_id: doc.guid, 
        title: doc.display_title, 
        date_publication: publicationDate,
        storage_path: doc.pdfurl, 
        url_source: doc.url,             
        author: authorString, 
    };
}

/**
 * Fetches all documents for a specific year from the World Bank API
 * Handles pagination automatically by making multiple requests
 * @param year - The year to fetch documents for
 * @returns Array of all documents for the specified year
 */
async function fetchDocumentByYear(year: number): Promise<WdsDocument[]> {
    let allDocuments: WdsDocument[] = [];
    let offset = 0;
    let totalRecords = -1; // Unknown until first request

    // Define date range for the full year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Paginate through all documents for the year
    while (totalRecords === -1 || offset < totalRecords) {
        const url = `${API_URL}?format=json&strdate=${startDate}&enddate=${endDate}&os=${offset}&rows=${PAGE_SIZE}&fl=${FIELDS_TO_FETCH}`;
        
        try {
            const response = await axios.get(url);
            const data = response.data;

            // On first request, get total count and log it
            if (totalRecords === -1) {
                totalRecords = data.total || 0;
                console.log(`[${year}] Total of ${totalRecords} documents found.`);
                if (totalRecords === 0) return []; // No documents for this year
            }

            // Extract documents from API response
            const records: WdsDocument[] = Object.values(data.documents || {}) as WdsDocument[];        
            allDocuments.push(...records);

            console.log(`[${year}] Loaded ${records.length} documents (${offset + records.length}/${totalRecords})`); // Ajout d'un log

            offset += records.length;

            // If we got fewer results than page size, we've reached the end
            if (records.length < PAGE_SIZE) break;

            // Rate limiting: wait 500ms between requests to avoid API throttling
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`API error for ${year} (offset ${offset}):`, (error as any).message);
            break;
        }
    }
    
    return allDocuments;
}

/**
 * Main orchestration function that seeds the database with documents
 * Processes documents year by year from startYear down to endYear
 * @param startYear - First year to process (most recent)
 * @param endYear - Last year to process (oldest)
 */
async function runAnnualSeeding(startYear: number, endYear: number) {
    // Initialize database connection
    await connectToDatabase();

    // Loop through each year in the range (descending order)
    for (let year = startYear; year >= endYear; year--) {
        console.log(`\n--- Start of extraction for the year ${year} ---`);

        // Fetch all documents for the current year
        const documents = await fetchDocumentByYear(year);

        // Process and save each document
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
    
    // Close database connection pool
    if (pgPool) {
        pgPool.end();
    }
}


// Execute the seeding process with the configured year range
runAnnualSeeding(START_YEAR, END_YEAR)
    .catch((error) => {
        console.error("Seeding process failed:", error);
        process.exit(1); // Exit with error code on failure
    });