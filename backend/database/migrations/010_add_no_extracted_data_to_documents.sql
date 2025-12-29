-- Add no_extracted_data column to documents table
-- Flag set to true when AI analysis found no data to extract
-- Prevents re-processing documents that legitimately have no extractable data

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS no_extracted_data BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_documents_no_extracted_data ON documents(no_extracted_data);

