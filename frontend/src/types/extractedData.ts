// Interface for extracted data from document analysis
export interface ExtractedData {
    id: number;
    document_id: number;
    key: string;
    value: string;
    unit: string | null;
    page: number | null;
    confidence_score: number;
    chart_type: 'bar' | 'line' | 'pie' | 'choropleth' | null;
    indicator_category: string;
}

// Chart type options for visualization
export type ChartType = 'bar' | 'line' | 'pie' | 'choropleth';

// Grouped data for charts
export interface ChartDataPoint {
    name: string;
    value: number;
    unit: string;
    color?: string;
}

