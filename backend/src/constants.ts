import * as path from 'path';

// Get project root directory (ecoSynthesIA/)
export const ROOT_DIR = path.resolve(__dirname, '..', '..');

// Bucket path constant - always points to bucket/ from project root
export const BUCKET_PATH = path.join(ROOT_DIR, 'bucket');
