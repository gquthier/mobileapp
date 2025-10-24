/**
 * Tests for authService - Phase 6.3
 *
 * Tests authentication and profile management
 */

import { AuthService } from '../authService';
import { supabase } from '../../lib/supabase';

// Mock supabase
jest.mock('../../lib/supabase');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should sign up a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        language: 'en',
      };

      // Mock auth.signUp
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile insert
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await AuthService.signUp({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        language: 'en',
      });

      expect(result).toEqual(mockProfile);
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockInsert).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        language: 'en',
      });
    });

    it('should throw error on auth failure', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already exists' },
      });

      await expect(
        AuthService.signUp({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          language: 'en',
        })
      ).rejects.toThrow('Email already exists');
    });

    it('should retry on network failure (Phase 4.4.2)', async () => {
      // First attempt fails, second succeeds
      (supabase.auth.signUp as jest.Mock)
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        });

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'user-123', email: 'test@example.com' },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await AuthService.signUp({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        language: 'en',
      });

      expect(result).toBeDefined();
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(2);
    });
  });

  describe('signIn', () => {
    it('should sign in existing user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await AuthService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockProfile);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should throw error on invalid credentials', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      await expect(
        AuthService.signIn({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should retry on network failure', async () => {
      (supabase.auth.signInWithPassword as jest.Mock)
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'user-123', email: 'test@example.com' },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      await AuthService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(2);
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        language: 'en',
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await AuthService.getProfile('user-123');

      expect(result).toEqual(mockProfile);
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should return null when profile not found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await AuthService.getProfile('user-123');

      expect(result).toBeNull();
    });

    it('should retry on network failure', async () => {
      const mockProfile = { id: 'user-123', email: 'test@example.com' };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce({ data: mockProfile, error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await AuthService.getProfile('user-123');

      expect(result).toEqual(mockProfile);
      expect(mockSingle).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const mockUpdatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        language: 'fr',
      };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUpdatedProfile,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await AuthService.updateProfile('user-123', {
        first_name: 'Jane',
        last_name: 'Smith',
        language: 'fr',
      });

      expect(result).toEqual(mockUpdatedProfile);
      expect(mockUpdate).toHaveBeenCalledWith({
        first_name: 'Jane',
        last_name: 'Smith',
        language: 'fr',
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should return null on update failure', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await AuthService.updateProfile('user-123', {
        first_name: 'Jane',
      });

      expect(result).toBeNull();
    });

    it('should retry on network failure', async () => {
      const mockProfile = { id: 'user-123', first_name: 'Jane' };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce({ data: mockProfile, error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await AuthService.updateProfile('user-123', {
        first_name: 'Jane',
      });

      expect(result).toEqual(mockProfile);
      expect(mockSingle).toHaveBeenCalledTimes(2);
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      await AuthService.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('should handle sign out errors gracefully', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      // Should not throw
      await expect(AuthService.signOut()).resolves.not.toThrow();
    });
  });
});
