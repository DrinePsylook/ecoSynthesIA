// Interface for the extracted_data table
export interface ExtractedData {
    id: number;
    document_id: number;
    key: string;
    value: string | number;
    unit: string | null;
    page: number | null;
    confidence_score: number;
    chart_type: 'bar' | 'pie' | 'line' | 'choropleth' | null;
}

// Interface for creating new extracted data
export interface ExtractedDataToInsert {
    document_id: number;
    key: string;
    value: string | number;
    unit?: string | null;
    page?: number | null;
    confidence_score: number;
    chart_type?: 'bar' | 'pie' | 'line' | 'choropleth' | null;
}
