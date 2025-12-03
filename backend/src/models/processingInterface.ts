export interface ProcessingResult {
    documentId: number;
    hasSummary: boolean;
    hasExtractedData: boolean;
    hasCategory: boolean;
    needsProcessing: boolean;
    success: boolean;
    error?: string;
}

export interface ProcessingSummary {
    totalFound: number;
    alreadyProcessed: number;
    needsProcessing: number;
    processed: number;
    failed: number;
    documents: ProcessingResult[];
}