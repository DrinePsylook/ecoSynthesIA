-- Add indicator_category column to extracted_data table
-- This column stores the standardized category for grouping similar metrics across documents

ALTER TABLE extracted_data
ADD COLUMN indicator_category TEXT DEFAULT 'other';

-- Create index for fast queries on indicator_category
CREATE INDEX idx_extracted_data_indicator_category ON extracted_data(indicator_category);

-- Add comment to explain the column
COMMENT ON COLUMN extracted_data.indicator_category IS 'Standardized category for grouping similar indicators (e.g., climate_emissions, finance_cost, social_population)';