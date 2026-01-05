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



// ==================== Internationalization ====================

/**
 * Supported languages for the application
 * - English (en)
 * - French (fr)
 * - German (de)
 * - Spanish (es)
 */
export const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'es'] as const;

/**
 * Type for supported language codes
 */
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/** 
 * Default language when no preference is set
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * Check if a string is a valid supported language
 */
export const isValidLanguage = (lang: string): lang is SupportedLanguage => {
    return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
};