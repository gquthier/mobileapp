import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles';
import { Icon } from '../components/Icon';
import { LanguageSelector } from '../components/LanguageSelector';
import { AuthService } from '../services/authService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('auto');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return false;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return false;
      }

      if (!firstName.trim()) {
        Alert.alert('Error', 'Please enter your first name');
        return false;
      }
    }

    return true;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await AuthService.signIn({ email, password });
      console.log('✅ Sign in successful');
      onAuthSuccess();
    } catch (error: any) {
      console.error('❌ Sign in failed:', error);
      Alert.alert('Sign In Failed', error.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create account
      await AuthService.signUp({
        email,
        password,
        firstName,
        lastName,
        username,
        dateOfBirth,
        preferredLanguage,
      });
      console.log('✅ Sign up successful');

      // ✅ Auto-sign in after successful sign up to trigger onboarding
      await AuthService.signIn({ email, password });
      console.log('✅ Auto-signin successful after signup');

      // Trigger onboarding flow
      onAuthSuccess();
    } catch (error: any) {
      console.error('❌ Sign up failed:', error);
      Alert.alert('Sign Up Failed', error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address first');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send password reset instructions to ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await AuthService.resetPassword(email);
              Alert.alert('Email Sent', 'Check your email for password reset instructions');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send reset email');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* ✅ Top Section (60%) - Logo + Slogan */}
      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Chapter</Text>
          <Text style={styles.tagline}>Your life, your chapters</Text>
        </View>
      </View>

      {/* ✅ Bottom Section (40%) - Black panel with rounded corners */}
      <View style={styles.bottomSection}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Toggle Sign In / Sign Up */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, !isSignUp && styles.toggleButtonActive]}
                onPress={() => setIsSignUp(false)}
              >
                <Text style={[styles.toggleText, !isSignUp && styles.toggleTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, isSignUp && styles.toggleButtonActive]}
                onPress={() => setIsSignUp(true)}
              >
                <Text style={[styles.toggleText, isSignUp && styles.toggleTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.form}>
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={theme.colors.gray500}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                />
              </View>

              {/* Sign Up: First Name + Last Name */}
              {isSignUp && (
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, styles.inputHalf]}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                      style={styles.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="First name"
                      placeholderTextColor={theme.colors.gray500}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.inputHalf]}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput
                      style={styles.input}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Last name"
                      placeholderTextColor={theme.colors.gray500}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.gray500}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                />
              </View>

              {/* Confirm Password (Sign Up only) */}
              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor={theme.colors.gray500}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    textContentType="none"
                  />
                </View>
              )}

              {/* Main Action Button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={isSignUp ? handleSignUp : handleSignIn}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              {/* Forgot Password (Sign In only) */}
              {!isSignUp && (
                <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
                  <Text style={styles.forgotButtonText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  topSection: {
    flex: 0.6, // 60% of screen
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.black,
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.gray600,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  bottomSection: {
    flex: 0.4, // 40% of screen
    backgroundColor: theme.colors.black,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.white,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  toggleTextActive: {
    color: theme.colors.black,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 0,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: theme.colors.white,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButton: {
    backgroundColor: theme.colors.white,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.black,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 4,
  },
  forgotButtonText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default AuthScreen;
