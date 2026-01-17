import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/authContext';
import type { SupportedLanguageCode } from '../i18n';

/**
 * useLanguageSync Hook
 * 
 * Syncs the i18n language with the user's preferred language from the backend.
 * When a user logs in, their preferred language is automatically applied.
 * 
 * Should be used once at the app level (e.g., in App component after AuthProvider).
 */
export function useLanguageSync() {
    const { user } = useAuth();
    const { i18n } = useTranslation();

    useEffect(() => {
        // When user logs in, sync their preferred language
        if (user?.preferred_language && user.preferred_language !== i18n.language) {
            i18n.changeLanguage(user.preferred_language as SupportedLanguageCode);
            localStorage.setItem('preferred_language', user.preferred_language);
        }
    }, [user?.preferred_language, i18n]);
}

