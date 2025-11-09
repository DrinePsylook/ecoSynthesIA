-- create extracted_data table
CREATE TABLE IF NOT EXISTS extracted_data (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    key TEXT,
    value TEXT,
    unit TEXT,
    page INTEGER,
    confidence_score FLOAT,
    chart_type TEXT,
    UNIQUE(document_id, key)
);

CREATE INDEX idx_extracted_data_document_id ON extracted_data(document_id);