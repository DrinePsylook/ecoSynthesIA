import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Supported languages
export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'es', name: 'Español' },
] as const;

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

i18n
    // Load translations from /public/locales
    .use(Backend)
    // Detect user language
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18next
    .init({
        fallbackLng: 'en',
        supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
        debug: import.meta.env.DEV,
        
        interpolation: {
            escapeValue: false, // React already escapes by default
        },
        
        backend: {
            loadPath: '/locales/{{lng}}/translation.json',
        },
        
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'preferred_language',
        },
    });

export default i18n;