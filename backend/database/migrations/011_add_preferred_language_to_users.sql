-- Add preferred language to users table

ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(255) DEFAULT 'en';

-- Add constraint to ensure valid language codes
ALTER TABLE users
ADD CONSTRAINT valid_language_code
CHECK (preferred_language IN ('en', 'fr', 'de', 'es'));