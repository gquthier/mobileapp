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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../styles/theme';
import { Icon } from '../components/Icon';
import { LanguageSelector } from '../components/LanguageSelector';
import { AuthService } from '../services/authService';

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
      Alert.alert(
        'Account Created',
        'Your account has been created successfully! Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsSignUp(false);
              // Clear form
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setFirstName('');
              setLastName('');
              setUsername('');
              setDateOfBirth('');
              setPreferredLanguage('auto');
            },
          },
        ]
      );
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Icon name="bookOpen" size={48} color={colors.black} />
            <Text style={styles.title}>Chapters</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>
          </View>

          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Sign Up Fields */}
            {isSignUp && (
              <>
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, styles.inputHalf]}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                      style={styles.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="First name"
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
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Choose a username"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Date of Birth (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={dateOfBirth}
                    onChangeText={setDateOfBirth}
                    placeholder="YYYY-MM-DD"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                {/* Language Selector */}
                <LanguageSelector
                  selectedLanguage={preferredLanguage}
                  onLanguageSelect={setPreferredLanguage}
                  style={styles.languageSelector}
                />
              </>
            )}

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Confirm Password for Sign Up */}
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
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

            {/* Forgot Password */}
            {!isSignUp && (
              <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
                <Text style={styles.forgotButtonText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {/* Switch Mode Button */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                disabled={loading}
              >
                <Text style={styles.switchButton}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.black,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.gray600,
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputHalf: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    color: colors.black,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    color: colors.black,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  primaryButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  forgotButtonText: {
    ...typography.caption,
    color: colors.gray600,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  switchText: {
    ...typography.caption,
    color: colors.gray600,
  },
  switchButton: {
    ...typography.caption,
    color: colors.black,
    fontWeight: '600',
  },
  languageSelector: {
    marginBottom: spacing.lg,
  },
});

export default AuthScreen;