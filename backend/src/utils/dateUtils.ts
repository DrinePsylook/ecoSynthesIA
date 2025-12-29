/**
 * Utility functions for date formatting
 */

/**
 * Formats a Date object or ISO date string to YYYY-MM-DD format
 * @param date - The date to format (Date object, ISO string, or null/undefined)
 * @returns Formatted date string in YYYY-MM-DD format, or empty string if invalid
 */
export const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    
    try {
        const dateObj = date instanceof Date ? date : new Date(date);
        
        // Check if date is valid
        if (isNaN(dateObj.getTime())) {
            return typeof date === 'string' ? date : '';
        }
        
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch {
        return typeof date === 'string' ? date : '';
    }
};

/**
 * Formats a Date object or ISO date string to a more readable format (e.g., "January 15, 2025")
 * @param date - The date to format
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export const formatDateLong = (date: Date | string | null | undefined, locale: string = 'en-US'): string => {
    if (!date) return '';
    
    try {
        const dateObj = date instanceof Date ? date : new Date(date);
        
        if (isNaN(dateObj.getTime())) {
            return typeof date === 'string' ? date : '';
        }
        
        return dateObj.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return typeof date === 'string' ? date : '';
    }
};

