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
}

export interface DocumentCountByCategory {
    category_id: number | null; // null for documents without category
    category_name: string | null;
    document_count: number;
}