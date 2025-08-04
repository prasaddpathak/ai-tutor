import { authAPI } from './api'
import i18n from '../i18n'

/**
 * Service to handle language preference synchronization between frontend and backend
 */
class LanguageService {
  /**
   * Update user's language preference both locally and on server
   */
  async updateLanguagePreference(languageCode: string, studentId?: number) {
    try {
      // Update local i18n instance
      await i18n.changeLanguage(languageCode)
      
      // If user is logged in, update on server
      if (studentId) {
        await authAPI.updateStudentLanguage(studentId, languageCode)
      }
      
      return { success: true }
    } catch (error) {
      console.error('Failed to update language preference:', error)
      return { success: false, error }
    }
  }

  /**
   * Initialize language from user profile when logging in
   */
  async initializeLanguageFromProfile(student: { language_preference?: string }) {
    try {
      const languageCode = student.language_preference || 'en'
      
      // Only change if different from current
      if (i18n.language !== languageCode) {
        await i18n.changeLanguage(languageCode)
      }
      
      return { success: true }
    } catch (error) {
      console.error('Failed to initialize language from profile:', error)
      return { success: false, error }
    }
  }

  /**
   * Get current language code
   */
  getCurrentLanguage(): string {
    return i18n.language
  }

  /**
   * Check if a language code is supported
   */
  isLanguageSupported(languageCode: string): boolean {
    return ['en', 'es'].includes(languageCode)
  }
}

// Export singleton instance
export const languageService = new LanguageService()
export default languageService