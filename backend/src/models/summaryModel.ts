// Interface for the analysis table
export interface Summary {
    id: number;
    document_id: number;
    textual_summary: string;
    date_analysis: Date;
    confidence_score: number;
}

// Interface for creating a new analysis
export interface SummaryToInsert {
    document_id: number;
    textual_summary: string;
    date_analysis: Date;
    confidence_score: number;
}
