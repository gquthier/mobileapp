/**
 * Tests for networkUtils - Phase 6.1
 *
 * Tests retry logic, network detection, and error handling
 */

import { retryWithBackoff, isNetworkAvailable, withRetry } from '../networkUtils';
import NetInfo from '@react-native-community/netinfo';

// Mock NetInfo
jest.mock('@react-native-community/netinfo');

describe('networkUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isNetworkAvailable', () => {
    it('should return true when network is connected', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const result = await isNetworkAvailable();

      expect(result).toBe(true);
      expect(NetInfo.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return false when network is disconnected', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const result = await isNetworkAvailable();

      expect(result).toBe(false);
    });

    it('should return false when internet is not reachable', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: false,
      });

      const result = await isNetworkAvailable();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (NetInfo.fetch as jest.Mock).mockRejectedValue(new Error('NetInfo error'));

      const result = await isNetworkAvailable();

      expect(result).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, { maxAttempts: 3 });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce('success');

      // Mock network to be available
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const result = await retryWithBackoff(mockFn, {
        maxAttempts: 3,
        initialDelayMs: 10, // Fast for testing
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(2);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max attempts', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Network request failed'));

      // Mock network to be available
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const result = await retryWithBackoff(mockFn, {
        maxAttempts: 3,
        initialDelayMs: 10, // Fast for testing
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.attempts).toBe(3);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx client errors', async () => {
      const error: any = new Error('Bad request');
      error.status = 400;

      const mockFn = jest.fn().mockRejectedValue(error);

      const result = await retryWithBackoff(mockFn, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1); // Should stop after first attempt
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 5xx server errors', async () => {
      const error: any = new Error('Internal server error');
      error.status = 500;

      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Mock network to be available
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const result = await retryWithBackoff(mockFn, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const delays: number[] = [];
      const startTimes: number[] = [];

      const mockFn = jest.fn().mockImplementation(async () => {
        startTimes.push(Date.now());
        throw new Error('Network request failed');
      });

      // Mock network to be available
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      await retryWithBackoff(mockFn, {
        maxAttempts: 3,
        initialDelayMs: 100,
        backoffMultiplier: 2,
      });

      // Calculate delays between attempts
      for (let i = 1; i < startTimes.length; i++) {
        delays.push(startTimes[i] - startTimes[i - 1]);
      }

      // Delays should roughly follow exponential pattern: 100ms, 200ms
      // Allow 50ms tolerance for test timing
      expect(delays[0]).toBeGreaterThanOrEqual(90);
      expect(delays[0]).toBeLessThanOrEqual(150);

      expect(delays[1]).toBeGreaterThanOrEqual(180);
      expect(delays[1]).toBeLessThanOrEqual(250);
    });
  });

  describe('withRetry', () => {
    it('should create retryable function that succeeds', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const retryableFn = withRetry(mockFn, { maxAttempts: 3 });

      const result = await retryableFn();

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max attempts', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Network request failed'));

      // Mock network to be available
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const retryableFn = withRetry(mockFn, {
        maxAttempts: 2,
        initialDelayMs: 10,
      });

      await expect(retryableFn()).rejects.toThrow();
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments to wrapped function', async () => {
      const mockFn = jest.fn().mockImplementation((a: number, b: number) =>
        Promise.resolve(a + b)
      );

      const retryableFn = withRetry(mockFn, { maxAttempts: 3 });

      const result = await retryableFn(5, 10);

      expect(result).toBe(15);
      expect(mockFn).toHaveBeenCalledWith(5, 10);
    });
  });
});
