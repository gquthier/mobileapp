/**
 * Tests for videoService - Phase 6.3
 *
 * Tests video operations: getAllVideos, deleteVideo, getVideoById
 * Note: Full upload testing would require complex mocking of FileSystem and Supabase Storage
 */

import { VideoService } from '../videoService';
import { supabase } from '../../lib/supabase';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('expo-file-system/legacy');
jest.mock('expo-av');

describe('VideoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateVideo (private - tested via getAllVideos)', () => {
    it('should filter out videos with empty file_path', async () => {
      const mockVideos = [
        { id: '1', title: 'Valid', file_path: 'https://example.com/video1.mp4', user_id: 'user-1' },
        { id: '2', title: 'Invalid', file_path: '', user_id: 'user-1' },
        { id: '3', title: 'Valid', file_path: 'https://example.com/video3.mp4', user_id: 'user-1' },
      ];

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockVideos,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await VideoService.getAllVideos();

      // Should only return valid videos
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('should filter out videos with local file paths', async () => {
      const mockVideos = [
        { id: '1', title: 'Valid', file_path: 'https://example.com/video1.mp4', user_id: 'user-1' },
        { id: '2', title: 'Local backup', file_path: 'file:///var/mobile/video_backups/video.mp4', user_id: 'user-1' },
        { id: '3', title: 'Local doc', file_path: 'file:///Documents/video.mp4', user_id: 'user-1' },
      ];

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockVideos,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await VideoService.getAllVideos();

      // Should only return remote URL
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter out videos that are still uploading', async () => {
      const mockVideos = [
        { id: '1', title: 'Valid', file_path: 'https://example.com/video1.mp4', user_id: 'user-1' },
        {
          id: '2',
          title: 'Uploading',
          file_path: 'https://example.com/video2.mp4',
          user_id: 'user-1',
          metadata: { isUploading: true }
        },
      ];

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockVideos,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await VideoService.getAllVideos();

      // Should filter out uploading video
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('getAllVideos', () => {
    it('should return all valid videos for authenticated user', async () => {
      const mockVideos = [
        {
          id: '1',
          title: 'Video 1',
          file_path: 'https://example.com/video1.mp4',
          user_id: 'user-1',
          created_at: '2025-10-25T10:00:00Z'
        },
        {
          id: '2',
          title: 'Video 2',
          file_path: 'https://example.com/video2.mp4',
          user_id: 'user-1',
          created_at: '2025-10-25T09:00:00Z'
        },
      ];

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockVideos,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await VideoService.getAllVideos();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return empty array when no videos exist', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await VideoService.getAllVideos();

      expect(result).toEqual([]);
    });

    it('should throw error when user is not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      await expect(VideoService.getAllVideos()).rejects.toThrow('Not authenticated');
    });

    it('should handle database errors gracefully', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      await expect(VideoService.getAllVideos()).rejects.toThrow('Database error');
    });
  });

  describe('getVideoById', () => {
    it('should return video by ID', async () => {
      const mockVideo = {
        id: 'video-1',
        title: 'Test Video',
        file_path: 'https://example.com/video.mp4',
        user_id: 'user-1',
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockVideo,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await VideoService.getVideoById('video-1');

      expect(result).toEqual(mockVideo);
      expect(mockEq).toHaveBeenCalledWith('id', 'video-1');
    });

    it('should return null when video not found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      const result = await VideoService.getVideoById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteVideo', () => {
    it('should delete video and associated files successfully', async () => {
      const mockVideo = {
        id: 'video-1',
        title: 'Test Video',
        file_path: 'https://storage.supabase.com/videos/video.mp4',
        thumbnail_path: 'https://storage.supabase.com/videos/thumb.jpg',
        thumbnail_frames: [
          'https://storage.supabase.com/videos/frame1.jpg',
          'https://storage.supabase.com/videos/frame2.jpg',
        ],
        user_id: 'user-1',
      };

      // Mock getVideoById
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockVideo,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        delete: jest.fn().mockReturnThis(),
      });

      // Mock storage.remove
      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      await VideoService.deleteVideo('video-1');

      // Should delete video file, thumbnail, and frames
      expect(mockRemove).toHaveBeenCalledWith(['video.mp4']);
      expect(mockRemove).toHaveBeenCalledWith(['thumb.jpg']);
      expect(mockRemove).toHaveBeenCalledWith(['frame1.jpg', 'frame2.jpg']);

      // Should delete database record
      expect(supabase.from).toHaveBeenCalledWith('videos');
    });

    it('should throw error when video not found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      await expect(VideoService.deleteVideo('non-existent')).rejects.toThrow('Not found');
    });

    it('should handle storage deletion errors gracefully', async () => {
      const mockVideo = {
        id: 'video-1',
        file_path: 'https://storage.supabase.com/videos/video.mp4',
        user_id: 'user-1',
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockVideo,
        error: null,
      });
      const mockDelete = jest.fn().mockReturnThis();

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        delete: mockDelete,
      });

      // Mock storage error
      const mockRemove = jest.fn().mockResolvedValue({
        error: { message: 'Storage error' }
      });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      // Should still delete database record even if storage fails
      await VideoService.deleteVideo('video-1');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('retryWithBackoffEnhanced (Phase 4.4.2)', () => {
    it('should use network-aware retry for operations', async () => {
      // This is tested indirectly through getAllVideos
      // First attempt fails, second succeeds
      const mockVideos = [{ id: '1', file_path: 'https://example.com/video.mp4', user_id: 'user-1' }];

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce({
          data: mockVideos,
          error: null,
        });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      // Should succeed after retry
      const result = await VideoService.getAllVideos();

      expect(result).toHaveLength(1);
      expect(mockOrder).toHaveBeenCalledTimes(2);
    });
  });

  describe('MAX_FILE_SIZE validation', () => {
    it('should have 5GB file size limit', () => {
      const maxSize = (VideoService as any).MAX_FILE_SIZE;
      expect(maxSize).toBe(5 * 1024 * 1024 * 1024); // 5GB
    });
  });
});
