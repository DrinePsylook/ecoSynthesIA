export interface AnalyzedDocument {
    // Document fields
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
    
    // Category fields
    category_id: number | null;
    category_name: string | null;
    category_description: string | null;
    
    // Summary fields
    summary_id: number | null;
    textual_summary: string | null;
    date_analysis: string | null;
    confidence_score: number | null;
    
    // Extracted data statistics
    extracted_data_count: number;
    indicator_categories: string[];
}