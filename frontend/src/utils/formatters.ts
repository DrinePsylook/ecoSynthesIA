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

