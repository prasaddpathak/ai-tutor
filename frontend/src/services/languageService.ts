import { authAPI } from './api'
import i18n from '../i18n'

/**
 * Service to handle language preference synchronization between frontend and backend
 */
class LanguageService {
  private contentRefreshCallbacks: Set<() => void> = new Set()

  /**
   * Register a callback to be called when language changes and content should refresh
   */
  onLanguageContentRefresh(callback: () => void) {
    this.contentRefreshCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.contentRefreshCallbacks.delete(callback)
    }
  }

  /**
   * Trigger all registered content refresh callbacks
   */
  private triggerContentRefresh() {
    console.log('Language changed - triggering content refresh for', this.contentRefreshCallbacks.size, 'callbacks')
    this.contentRefreshCallbacks.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error in content refresh callback:', error)
      }
    })
  }

  /**
   * Update user's language preference both locally and on server
   */
  async updateLanguagePreference(languageCode: string, studentId?: number) {
    try {
      const previousLanguage = i18n.language
      
      // Update local i18n instance
      await i18n.changeLanguage(languageCode)
      
      // If user is logged in, update on server
      if (studentId) {
        await authAPI.updateStudentLanguage(studentId, languageCode)
      }
      
      // If language actually changed, trigger content refresh
      if (previousLanguage !== languageCode) {
        console.log(`Language changed from ${previousLanguage} to ${languageCode} - refreshing content`)
        this.triggerContentRefresh()
      }
      
      return { success: true }
    } catch (error) {
      console.error('Failed to update language preference:', error)
      return { success: false, error }
    }
  }

  /**
   * Register a global query client for comprehensive invalidation
   */
  setQueryClient(queryClient: any) {
    this.queryClient = queryClient
  }

  private queryClient: any = null

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