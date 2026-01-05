/**
 * Utility functions for formatting values
 */

/**
 * Format large numbers for display (e.g., 400000000 -> 400M)
 * @param value - Number or string to format
 * @returns Formatted string with K, M, or B suffix
 */
export function formatValue(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return String(value);
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toLocaleString();
}

/**
 * Truncate long text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ... if needed
 */
export function truncateText(text: string, maxLength: number = 30): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Format category name for display (snake_case to Title Case)
 * @param category - Category string in snake_case
 * @returns Formatted category name
 */
export function formatCategoryName(category: string): string {
    return category
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format a date to a readable localized format
 * 
 * Uses the browser's locale settings by default.
 * For French browsers: "3 janvier 2026"
 * For English browsers: "January 3, 2026"
 * 
 * @param date - Date object, ISO string, or null/undefined
 * @param options - Optional: Intl.DateTimeFormatOptions to customize format
 * @returns Formatted date string, or empty string if invalid
 * 
 * How it works:
 * - toLocaleDateString() is a built-in JavaScript method
 * - It automatically detects the user's browser language/region
 * - The options object controls which parts of the date to show:
 *   - 'numeric' for day: shows "3" instead of "03"
 *   - 'long' for month: shows "janvier" instead of "01"
 *   - 'numeric' for year: shows "2026"
 */
export function formatDate(
    date: Date | string | null | undefined,
    options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }
): string {
    // Handle null/undefined cases
    if (!date) return '';
    
    try {
        // Convert string to Date if needed (handles ISO strings like "2026-01-03T12:00:00Z")
        const dateObj = date instanceof Date ? date : new Date(date);
        
        // Check if the date is valid (invalid dates return NaN for getTime())
        if (isNaN(dateObj.getTime())) {
            return '';
        }
        
        // Format using browser's locale settings
        return dateObj.toLocaleDateString(undefined, options);
    } catch {
        // If anything goes wrong, return empty string
        return '';
    }
}