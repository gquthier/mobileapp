import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  date_of_birth?: string;
  avatar_url?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  preferred_language?: string;
  notification_settings?: {
    push_enabled: boolean;
    email_enabled: boolean;
    reminders_enabled: boolean;
    reminder_time: string;
  };
  privacy_settings?: {
    profile_public: boolean;
    analytics_enabled: boolean;
  };
  backup_settings?: {
    cloud_backup_enabled: boolean;
    auto_backup: boolean;
    backup_frequency: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  dateOfBirth?: string;
  preferredLanguage?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Sign up a new user
   */
  static async signUp(data: SignUpData) {
    try {
      console.log('🔐 Starting sign up process for:', data.email);

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        console.error('❌ Auth sign up error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No user returned from sign up');
      }

      console.log('✅ User created in auth:', authData.user.id);

      // Profile will be created automatically by database trigger
      // Just get the profile that was created
      let profile = null;
      let attempts = 0;
      const maxAttempts = 5;

      // Wait a moment for the trigger to create the profile
      while (!profile && attempts < maxAttempts) {
        try {
          await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (profileData) {
            profile = profileData;

            // Update profile with additional sign-up data if provided
            if (data.firstName || data.lastName || data.username || data.dateOfBirth || data.preferredLanguage) {
              const updates: any = {};
              if (data.firstName) updates.first_name = data.firstName;
              if (data.lastName) updates.last_name = data.lastName;
              if (data.username) updates.username = data.username;
              if (data.dateOfBirth) updates.date_of_birth = data.dateOfBirth;
              if (data.preferredLanguage) updates.preferred_language = data.preferredLanguage;

              const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', authData.user.id)
                .select()
                .single();

              if (updatedProfile && !updateError) {
                profile = updatedProfile;
              }
            }
            break;
          }
          attempts++;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            console.warn('⚠️ Could not fetch profile after creation, but user was created successfully');
            break;
          }
        }
      }

      console.log('✅ Profile ready:', profile?.id || 'Profile will be available shortly');

      return {
        user: authData.user,
        profile,
        session: authData.session,
      };
    } catch (error) {
      console.error('❌ Sign up failed:', error);
      throw error;
    }
  }

  /**
   * Sign in existing user
   */
  static async signIn(data: SignInData) {
    try {
      console.log('🔐 Starting sign in process for:', data.email);

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        throw error;
      }

      if (!authData.user) {
        throw new Error('No user returned from sign in');
      }

      console.log('✅ User signed in successfully:', authData.user.id);

      // Get user profile
      const profile = await this.getProfile(authData.user.id);

      return {
        user: authData.user,
        profile,
        session: authData.session,
      };
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  static async signOut() {
    try {
      console.log('🔐 Signing out user...');

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }

      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Get current user session
   */
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ Get session error:', error);
        throw error;
      }

      return session;
    } catch (error) {
      console.error('❌ Get session failed:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser() {
    try {
      const session = await this.getCurrentSession();
      if (!session?.user) return null;

      const profile = await this.getProfile(session.user.id);
      return { user: session.user, profile };
    } catch (error) {
      console.error('❌ Get current user failed:', error);
      return null;
    }
  }

  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      console.log('👤 Fetching profile for user:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Get profile error:', error);
        throw error;
      }

      console.log('✅ Profile fetched successfully');
      return data;
    } catch (error) {
      console.error('❌ Get profile failed:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: Partial<Profile>) {
    try {
      console.log('👤 Updating profile for user:', userId, updates);

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Update profile error:', error);
        throw error;
      }

      console.log('✅ Profile updated successfully');
      return data;
    } catch (error) {
      console.error('❌ Update profile failed:', error);
      throw error;
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string) {
    try {
      console.log('🔐 Sending password reset for:', email);

      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        console.error('❌ Reset password error:', error);
        throw error;
      }

      console.log('✅ Password reset email sent');
    } catch (error) {
      console.error('❌ Reset password failed:', error);
      throw error;
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string) {
    try {
      console.log('🔐 Updating user password...');

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('❌ Update password error:', error);
        throw error;
      }

      console.log('✅ Password updated successfully');
    } catch (error) {
      console.error('❌ Update password failed:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount() {
    try {
      console.log('🗑️ Deleting user account...');

      // Get current user
      const session = await this.getCurrentSession();
      if (!session?.user) {
        throw new Error('No authenticated user');
      }

      // Delete profile (will cascade to related data due to FK constraints)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', session.user.id);

      if (deleteError) {
        console.error('❌ Delete profile error:', deleteError);
        throw deleteError;
      }

      // Sign out user
      await this.signOut();

      console.log('✅ Account deleted successfully');
    } catch (error) {
      console.error('❌ Delete account failed:', error);
      throw error;
    }
  }
}