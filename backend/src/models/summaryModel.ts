// Interface for the analysis table
export interface Summary {
    id_summary: number;
    document_id: number;
    textual_summary: string;
    date_summary: Date;
    confidence_score: number;
}

// Interface for creating a new analysis
export interface SummaryToInsert {
    document_id: number;
    textual_summary: string;
    confidence_score: number;
}
