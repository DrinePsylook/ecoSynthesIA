-- create document table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    author VARCHAR(255),
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_publication DATE,
    is_public BOOLEAN DEFAULT FALSE,
    storage_path VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    url_source VARCHAR(255),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_category_id ON documents(category_id);

