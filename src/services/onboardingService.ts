import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * OnboardingService - Manage onboarding flow state and flags
 *
 * Stores onboarding completion flags in AsyncStorage to track
 * whether the user has completed the initial onboarding flow.
 */

const ONBOARDING_KEYS = {
  WELCOME_FLOW_COMPLETED: '@onboarding_welcome_flow_completed',
  FIRST_TIME_USER: '@first_time_user',
  HAS_SEEN_WELCOME: 'hasSeenWelcome', // ✅ Key used by useFirstTimeUser hook
  CHAPTER_CREATED: '@onboarding_chapter_created',
  VIDEOS_IMPORTED: '@onboarding_videos_imported',
  GUIDED_TOUR_COMPLETED: '@onboarding_guided_tour_completed',
  FIRST_RECORDING_COMPLETED: '@onboarding_first_recording_completed',
};

export class OnboardingService {
  /**
   * Check if user has completed the welcome flow
   */
  static async hasCompletedWelcomeFlow(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEYS.WELCOME_FLOW_COMPLETED);
      return value === 'true';
    } catch (error) {
      console.error('Error checking welcome flow completion:', error);
      return false;
    }
  }

  /**
   * Mark welcome flow as completed
   */
  static async markWelcomeFlowCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEYS.WELCOME_FLOW_COMPLETED, 'true');
    } catch (error) {
      console.error('Error marking welcome flow as completed:', error);
    }
  }

  /**
   * Check if this is the user's first time
   */
  static async isFirstTimeUser(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEYS.FIRST_TIME_USER);
      return value !== 'false'; // Default to true if not set
    } catch (error) {
      console.error('Error checking first time user:', error);
      return true;
    }
  }

  /**
   * Mark user as no longer first time
   */
  static async markNotFirstTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEYS.FIRST_TIME_USER, 'false');
    } catch (error) {
      console.error('Error marking user as not first time:', error);
    }
  }

  /**
   * Check if user has created their first chapter
   */
  static async hasCreatedChapter(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEYS.CHAPTER_CREATED);
      return value === 'true';
    } catch (error) {
      console.error('Error checking chapter creation:', error);
      return false;
    }
  }

  /**
   * Mark chapter as created
   */
  static async markChapterCreated(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEYS.CHAPTER_CREATED, 'true');
    } catch (error) {
      console.error('Error marking chapter as created:', error);
    }
  }

  /**
   * Check if user has imported videos
   */
  static async hasImportedVideos(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEYS.VIDEOS_IMPORTED);
      return value === 'true';
    } catch (error) {
      console.error('Error checking videos import:', error);
      return false;
    }
  }

  /**
   * Mark videos as imported
   */
  static async markVideosImported(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEYS.VIDEOS_IMPORTED, 'true');
    } catch (error) {
      console.error('Error marking videos as imported:', error);
    }
  }

  /**
   * Check if user has completed guided tour
   */
  static async hasCompletedGuidedTour(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEYS.GUIDED_TOUR_COMPLETED);
      return value === 'true';
    } catch (error) {
      console.error('Error checking guided tour completion:', error);
      return false;
    }
  }

  /**
   * Mark guided tour as completed
   */
  static async markGuidedTourCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEYS.GUIDED_TOUR_COMPLETED, 'true');
    } catch (error) {
      console.error('Error marking guided tour as completed:', error);
    }
  }

  /**
   * Check if user has completed first recording
   */
  static async hasCompletedFirstRecording(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEYS.FIRST_RECORDING_COMPLETED);
      return value === 'true';
    } catch (error) {
      console.error('Error checking first recording completion:', error);
      return false;
    }
  }

  /**
   * Mark first recording as completed
   */
  static async markFirstRecordingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEYS.FIRST_RECORDING_COMPLETED, 'true');
    } catch (error) {
      console.error('Error marking first recording as completed:', error);
    }
  }

  /**
   * ADMIN ONLY: Reset ALL onboarding flags to restart the entire flow
   * This will make the app behave as if it was just installed
   */
  static async resetOnboarding(): Promise<void> {
    try {
      console.log('🔄 Resetting onboarding flags...');

      // Remove all onboarding flags (including legacy keys)
      await Promise.all([
        AsyncStorage.removeItem(ONBOARDING_KEYS.WELCOME_FLOW_COMPLETED),
        AsyncStorage.removeItem(ONBOARDING_KEYS.FIRST_TIME_USER),
        AsyncStorage.removeItem(ONBOARDING_KEYS.HAS_SEEN_WELCOME), // ✅ Critical: useFirstTimeUser hook key
        AsyncStorage.removeItem(ONBOARDING_KEYS.CHAPTER_CREATED),
        AsyncStorage.removeItem(ONBOARDING_KEYS.VIDEOS_IMPORTED),
        AsyncStorage.removeItem(ONBOARDING_KEYS.GUIDED_TOUR_COMPLETED),
        AsyncStorage.removeItem(ONBOARDING_KEYS.FIRST_RECORDING_COMPLETED),
      ]);

      console.log('✅ Onboarding flags reset successfully');
    } catch (error) {
      console.error('❌ Error resetting onboarding:', error);
      throw error;
    }
  }

  /**
   * Get onboarding completion status (for debugging)
   */
  static async getOnboardingStatus(): Promise<{
    welcomeFlowCompleted: boolean;
    isFirstTime: boolean;
    chapterCreated: boolean;
    videosImported: boolean;
    guidedTourCompleted: boolean;
    firstRecordingCompleted: boolean;
  }> {
    const [
      welcomeFlowCompleted,
      isFirstTime,
      chapterCreated,
      videosImported,
      guidedTourCompleted,
      firstRecordingCompleted,
    ] = await Promise.all([
      this.hasCompletedWelcomeFlow(),
      this.isFirstTimeUser(),
      this.hasCreatedChapter(),
      this.hasImportedVideos(),
      this.hasCompletedGuidedTour(),
      this.hasCompletedFirstRecording(),
    ]);

    return {
      welcomeFlowCompleted,
      isFirstTime,
      chapterCreated,
      videosImported,
      guidedTourCompleted,
      firstRecordingCompleted,
    };
  }
}
