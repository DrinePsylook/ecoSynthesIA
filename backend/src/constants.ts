import * as path from 'path';

// ROOT_DIR is the working directory where the app is running
export const ROOT_DIR = process.cwd();

// BUCKET_PATH points to the bucket folder
// Priority: 
// 1. BUCKET_PATH env variable (for custom setups)
// 2. In Docker: /app/bucket (mounted via docker-compose)
// 3. In local dev: ../bucket (sibling of backend folder)
export const BUCKET_PATH = process.env.BUCKET_PATH 
    || (process.env.NODE_ENV === 'production' || process.cwd() === '/app'
        ? path.join(ROOT_DIR, 'bucket')
        : path.resolve(ROOT_DIR, '..', 'bucket'));
