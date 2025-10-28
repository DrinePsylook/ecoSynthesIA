-- Add external_doc_id column to documents table
-- This column will store the GUID from the world bank API

ALTER TABLE documents
ADD COLUMN external_doc_id VARCHAR(255) UNIQUE;