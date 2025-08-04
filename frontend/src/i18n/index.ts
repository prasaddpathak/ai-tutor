import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enTranslations from './locales/en.json'
import esTranslations from './locales/es.json'

// Language resources
const resources = {
  en: {
    translation: enTranslations
  },
  es: {
    translation: esTranslations
  }
}

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    
    // Default language
    fallbackLng: 'en',
    
    // Language detection options
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      
      // Cache user language
      caches: ['localStorage'],
      
      // Optional language codes mapping
      lookupLocalStorage: 'i18nextLng',
    },

    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      // React already escapes by default
      escapeValue: false,
    },

    // Namespace configuration
    defaultNS: 'translation',
    ns: ['translation'],

    // Language switching configuration
    load: 'languageOnly', // Load only language without region (e.g., 'en' instead of 'en-US')
    
    // Fallback behavior
    saveMissing: process.env.NODE_ENV === 'development', // Save missing keys in development
  })

export default i18n

// Export language configuration for components
export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' }
] as const

export type LanguageCode = typeof languages[number]['code']