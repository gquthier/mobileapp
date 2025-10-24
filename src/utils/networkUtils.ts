/**
 * Network Utilities - Phase 4.4.2
 *
 * Provides retry logic with exponential backoff and offline detection
 * for robust network operations in the mobile app.
 *
 * Features:
 * - Exponential backoff retry strategy
 * - Network connectivity detection
 * - Configurable retry attempts and delays
 * - Automatic retry for transient failures
 */

import NetInfo from '@react-native-community/netinfo';

// ================== TYPES ==================

export interface RetryOptions {
  maxAttempts?: number; // Default: 3
  initialDelayMs?: number; // Default: 1000ms (1 second)
  maxDelayMs?: number; // Default: 10000ms (10 seconds)
  backoffMultiplier?: number; // Default: 2 (exponential)
  shouldRetry?: (error: any) => boolean; // Custom retry logic
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

// ================== DEFAULT OPTIONS ==================

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error?.message?.includes('Network request failed')) return true;
    if (error?.message?.includes('timeout')) return true;
    if (error?.message?.includes('Failed to fetch')) return true;

    // Retry on specific HTTP status codes
    const status = error?.status || error?.response?.status;
    if (status >= 500 && status < 600) return true; // Server errors
    if (status === 408) return true; // Request Timeout
    if (status === 429) return true; // Too Many Requests

    return false;
  },
};

// ================== NETWORK DETECTION ==================

/**
 * Check if network is available
 * Returns true if connected to wifi or cellular
 */
export async function isNetworkAvailable(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch (error) {
    console.error('❌ [NetworkUtils] Failed to check network status:', error);
    return false; // Assume offline on error
  }
}

/**
 * Wait for network to become available
 * Returns true if network became available within timeout
 */
export async function waitForNetwork(timeoutMs: number = 5000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const available = await isNetworkAvailable();
    if (available) {
      console.log('✅ [NetworkUtils] Network is now available');
      return true;
    }

    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('⚠️ [NetworkUtils] Network not available after timeout');
  return false;
}

// ================== RETRY LOGIC ==================

/**
 * Calculate delay for next retry attempt using exponential backoff
 */
function calculateBackoffDelay(
  attemptNumber: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const delay = initialDelayMs * Math.pow(backoffMultiplier, attemptNumber - 1);
  return Math.min(delay, maxDelayMs);
}

/**
 * Retry an async function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise with result containing success status, data, and attempts
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => fetch('https://api.example.com/data'),
 *   { maxAttempts: 3 }
 * );
 *
 * if (result.success) {
 *   console.log('Data:', result.data);
 * } else {
 *   console.error('Failed after', result.attempts, 'attempts');
 * }
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      console.log(`🔄 [NetworkUtils] Attempt ${attempt}/${opts.maxAttempts}`);

      // Check network availability before attempting
      const networkAvailable = await isNetworkAvailable();
      if (!networkAvailable) {
        console.log('📡 [NetworkUtils] Network unavailable, waiting...');
        const becameAvailable = await waitForNetwork(5000);
        if (!becameAvailable) {
          throw new Error('Network unavailable');
        }
      }

      // Execute the function
      const data = await fn();

      console.log(`✅ [NetworkUtils] Success on attempt ${attempt}`);
      return {
        success: true,
        data,
        attempts: attempt,
      };
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.log(`❌ [NetworkUtils] Attempt ${attempt} failed:`, lastError.message);

      // Check if we should retry this error
      if (!opts.shouldRetry(error)) {
        console.log('⚠️ [NetworkUtils] Error is not retryable, stopping');
        return {
          success: false,
          error: lastError,
          attempts: attempt,
        };
      }

      // Don't delay after last attempt
      if (attempt < opts.maxAttempts) {
        const delayMs = calculateBackoffDelay(
          attempt,
          opts.initialDelayMs,
          opts.maxDelayMs,
          opts.backoffMultiplier
        );

        console.log(`⏳ [NetworkUtils] Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All attempts failed
  console.error(`❌ [NetworkUtils] Failed after ${opts.maxAttempts} attempts`);
  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts: opts.maxAttempts,
  };
}

/**
 * Wrapper to make any async function retryable with exponential backoff
 *
 * @example
 * ```typescript
 * const fetchWithRetry = withRetry(
 *   async (url: string) => fetch(url).then(r => r.json()),
 *   { maxAttempts: 3 }
 * );
 *
 * const result = await fetchWithRetry('https://api.example.com/data');
 * ```
 */
export function withRetry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const result = await retryWithBackoff(() => fn(...args), options);

    if (result.success && result.data !== undefined) {
      return result.data;
    }

    throw result.error || new Error('Retry failed');
  };
}

// ================== NETWORK STATE MONITORING ==================

/**
 * Subscribe to network state changes
 * Returns unsubscribe function
 */
export function subscribeToNetworkState(
  onConnected: () => void,
  onDisconnected: () => void
): () => void {
  console.log('📡 [NetworkUtils] Subscribing to network state changes');

  const unsubscribe = NetInfo.addEventListener(state => {
    const isConnected = state.isConnected === true && state.isInternetReachable !== false;

    if (isConnected) {
      console.log('✅ [NetworkUtils] Network connected');
      onConnected();
    } else {
      console.log('📴 [NetworkUtils] Network disconnected');
      onDisconnected();
    }
  });

  return unsubscribe;
}

// ================== EXPORTS ==================

export default {
  isNetworkAvailable,
  waitForNetwork,
  retryWithBackoff,
  withRetry,
  subscribeToNetworkState,
};
