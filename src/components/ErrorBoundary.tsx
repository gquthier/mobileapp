import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
// import { BugReportService } from '../services/bugReportService'; // ⚠️ Temporarily disabled until expo-device is linked

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void; // ✅ Callback pour gérer l'erreur (navigation, etc.)
  autoRecover?: boolean; // ✅ Si true, tente de se récupérer automatiquement
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private autoRecoveryTimeout?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);

    // Report to bug service
    // ⚠️ Temporarily disabled until expo-device is linked
    // BugReportService.reportError(error, {
    //   error_type: 'crash',
    //   severity: 'critical',
    //   component_name: errorInfo.componentStack?.split('\n')[1]?.trim(),
    //   action: 'Component rendering error',
    //   metadata: {
    //     componentStack: errorInfo.componentStack,
    //   },
    // });

    // ✅ Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error);
    }

    // ✅ Auto-recovery: Automatically reset after 2 seconds if enabled
    if (this.props.autoRecover) {
      console.log('🔄 [AUTO-RECOVERY] Resetting error boundary in 2 seconds...');
      this.autoRecoveryTimeout = setTimeout(() => {
        console.log('✅ [AUTO-RECOVERY] Resetting error boundary now');
        this.handleReset();
      }, 2000);
    }
  }

  componentWillUnmount() {
    // Clear timeout if component unmounts
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😔</Text>
            <Text style={styles.title}>Oups, une erreur est survenue</Text>
            <Text style={styles.message}>
              L'erreur a été automatiquement signalée et nous la corrigerons dès que possible.
            </Text>
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorMessage}>{this.state.error.message}</Text>
                <Text style={styles.errorStack}>{this.state.error.stack}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['6'],
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  emoji: {
    fontSize: 64,
    marginBottom: theme.spacing['4'],
  },
  title: {
    ...theme.typography.h2,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing['3'],
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing['6'],
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: theme.colors.gray100,
    padding: theme.spacing['4'],
    borderRadius: 8,
    marginBottom: theme.spacing['4'],
    width: '100%',
  },
  errorMessage: {
    ...theme.typography.caption,
    color: theme.colors.error500,
    fontWeight: '600',
    marginBottom: theme.spacing['2'],
  },
  errorStack: {
    ...theme.typography.tiny,
    color: theme.colors.text.tertiary,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: theme.colors.brand.primary,
    paddingHorizontal: theme.spacing['6'],
    paddingVertical: theme.spacing['3'],
    borderRadius: 8,
  },
  buttonText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontWeight: '600',
  },
});
