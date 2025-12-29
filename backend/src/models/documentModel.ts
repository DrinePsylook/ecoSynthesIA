export interface Document {
    id: number;
    author: string;
    date_publication: string;
    is_public: boolean;
    storage_path: string; // The URL to the PDF file
    title: string;
    url_source: string;
    created_at: string;
    updated_at: string;
    category_id: number;
    user_id: number;
    no_extracted_data: boolean; // True when AI analysis found no extractable data
}

export interface DocumentCountByCategory {
    category_id: number | null; // null for documents without category
    category_name: string | null;
    document_count: number;
}

export interface AnalyzedDocument {
    // Document information
    id: number;
    title: string;
    author: string;
    date_publication: string;
    is_public: boolean;
    storage_path: string;
    url_source: string;
    created_at: string;
    updated_at: string;
    user_id: number;
    
    // Category information
    category_id: number | null;
    category_name: string | null;
    category_description: string | null;
    
    // Summary information
    summary_id: number | null;
    textual_summary: string | null;
    date_analysis: string | null;
    confidence_score: number | null;
    
    // Statistics on the extracted data
    extracted_data_count: number;
    indicator_categories: string[];
}

/**
 * Interface for paginated documents result
 */
export interface PaginatedDocuments {
    documents: {
        id: number;
        title: string;
        author: string;
        date_publication: string;
        textual_summary: string | null;
        extracted_data_count: number;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}