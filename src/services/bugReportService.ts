import { supabase } from '../lib/supabase';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export interface BugReport {
  id?: string;
  user_id?: string;
  user_email?: string;
  error_message: string;
  error_stack?: string;
  error_type: 'crash' | 'network' | 'ui' | 'api' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  screen_name?: string;
  action?: string;
  component_name?: string;
  device_info?: {
    deviceName?: string;
    deviceYearClass?: number | null;
    modelName?: string;
    osName?: string;
    osVersion?: string;
    platformApiLevel?: number | null;
  };
  app_version?: string;
  metadata?: any;
  status?: string;
  created_at?: string;
}

export class BugReportService {
  private static isInitialized = false;
  private static errorQueue: BugReport[] = [];
  private static isProcessing = false;

  /**
   * Initialize the bug reporting service
   * Call this in App.tsx on mount
   */
  static initialize() {
    if (this.isInitialized) return;

    console.log('🐛 Initializing Bug Report Service...');

    // Set up global error handler
    this.setupGlobalErrorHandler();

    // Set up console.error override
    this.setupConsoleErrorOverride();

    this.isInitialized = true;
    console.log('✅ Bug Report Service initialized');
  }

  /**
   * Set up global error handler for uncaught errors
   */
  private static setupGlobalErrorHandler() {
    const originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.log('🔴 Global error caught:', error);

      // Report to our service
      this.reportError(error, {
        error_type: isFatal ? 'crash' : 'other',
        severity: isFatal ? 'critical' : 'high',
        action: 'App crashed or threw unhandled error',
      });

      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }

  /**
   * Override console.error to capture errors
   */
  private static setupConsoleErrorOverride() {
    const originalConsoleError = console.error;

    console.error = (...args: any[]) => {
      // Call original console.error
      originalConsoleError(...args);

      // Extract error info
      const errorMessage = args.map(arg => {
        if (arg instanceof Error) {
          return arg.message;
        }
        return String(arg);
      }).join(' ');

      const errorStack = args.find(arg => arg instanceof Error)?.stack;

      // Report to our service (only if it looks like a real error)
      if (errorMessage && !errorMessage.includes('Warning:')) {
        this.reportError(new Error(errorMessage), {
          error_type: 'other',
          severity: 'medium',
          error_stack: errorStack,
        });
      }
    };
  }

  /**
   * Report an error to Supabase
   */
  static async reportError(
    error: Error,
    context?: {
      error_type?: BugReport['error_type'];
      severity?: BugReport['severity'];
      screen_name?: string;
      action?: string;
      component_name?: string;
      metadata?: any;
      error_stack?: string;
    }
  ) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Get device info
      const deviceInfo = {
        deviceName: Device.deviceName,
        deviceYearClass: Device.deviceYearClass,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        platformApiLevel: Device.platformApiLevel,
      };

      // Get app version from Constants
      const appVersion = Constants.expoConfig?.version || 'unknown';

      const bugReport: BugReport = {
        user_id: user?.id,
        user_email: user?.email,
        error_message: error.message || 'Unknown error',
        error_stack: context?.error_stack || error.stack,
        error_type: context?.error_type || 'other',
        severity: context?.severity || 'medium',
        screen_name: context?.screen_name,
        action: context?.action,
        component_name: context?.component_name,
        device_info: deviceInfo,
        app_version: appVersion,
        metadata: context?.metadata,
      };

      // Add to queue
      this.errorQueue.push(bugReport);

      // Process queue
      if (!this.isProcessing) {
        this.processQueue();
      }
    } catch (reportError) {
      console.log('Failed to report error:', reportError);
    }
  }

  /**
   * Process error queue and send to Supabase
   */
  private static async processQueue() {
    if (this.isProcessing || this.errorQueue.length === 0) return;

    this.isProcessing = true;

    while (this.errorQueue.length > 0) {
      const bugReport = this.errorQueue.shift();
      if (!bugReport) continue;

      try {
        const { error } = await supabase
          .from('bug_reports')
          .insert([bugReport]);

        if (error) {
          console.log('Failed to insert bug report:', error);
          // Put back in queue for retry
          this.errorQueue.unshift(bugReport);
          break;
        } else {
          console.log('✅ Bug report sent successfully');
        }
      } catch (err) {
        console.log('Error sending bug report:', err);
        // Put back in queue for retry
        this.errorQueue.unshift(bugReport);
        break;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;

    // Retry if there are still items in queue
    if (this.errorQueue.length > 0) {
      setTimeout(() => this.processQueue(), 5000); // Retry after 5 seconds
    }
  }

  /**
   * Manually report a bug with custom info
   */
  static async reportBug(
    message: string,
    options?: {
      error_type?: BugReport['error_type'];
      severity?: BugReport['severity'];
      screen_name?: string;
      action?: string;
      metadata?: any;
    }
  ) {
    const error = new Error(message);
    await this.reportError(error, {
      error_type: options?.error_type || 'other',
      severity: options?.severity || 'medium',
      screen_name: options?.screen_name,
      action: options?.action,
      metadata: options?.metadata,
    });
  }

  /**
   * Report a network error
   */
  static async reportNetworkError(
    error: Error,
    context?: {
      url?: string;
      method?: string;
      statusCode?: number;
      screen_name?: string;
    }
  ) {
    await this.reportError(error, {
      error_type: 'network',
      severity: 'medium',
      screen_name: context?.screen_name,
      action: `Network request failed: ${context?.method} ${context?.url}`,
      metadata: {
        url: context?.url,
        method: context?.method,
        statusCode: context?.statusCode,
      },
    });
  }

  /**
   * Report an API error
   */
  static async reportAPIError(
    error: Error,
    context?: {
      endpoint?: string;
      method?: string;
      statusCode?: number;
      screen_name?: string;
    }
  ) {
    await this.reportError(error, {
      error_type: 'api',
      severity: 'high',
      screen_name: context?.screen_name,
      action: `API request failed: ${context?.method} ${context?.endpoint}`,
      metadata: {
        endpoint: context?.endpoint,
        method: context?.method,
        statusCode: context?.statusCode,
      },
    });
  }

  /**
   * Report a UI error
   */
  static async reportUIError(
    error: Error,
    context?: {
      component_name?: string;
      screen_name?: string;
      action?: string;
    }
  ) {
    await this.reportError(error, {
      error_type: 'ui',
      severity: 'low',
      screen_name: context?.screen_name,
      component_name: context?.component_name,
      action: context?.action,
    });
  }
}
