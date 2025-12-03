-- create summary table
CREATE TABLE IF NOT EXISTS summaries (
    id SERIAL PRIMARY KEY,
    document_id INTEGER UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
    textual_summary TEXT,
    date_analysis DATE,
    confidence_score FLOAT
);

CREATE INDEX idx_summaries_document_id ON summaries(document_id);