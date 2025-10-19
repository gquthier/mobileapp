import { supabase } from './supabase';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface UploadMonitorItem {
  id: string;
  userId: string;
  userEmail: string;
  videoTitle: string;
  filename: string;
  fileSize?: number; // bytes
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  uploadSpeed?: number; // MB/s
  retryCount?: number;
  errorMessage?: string;
  startedAt: string; // ISO timestamp
  completedAt?: string;
  elapsedTime?: number; // seconds
  metadata?: any;
  // Extra info
  transcriptionStatus?: string;
  hasError?: boolean;
}

export interface MonitoringStats {
  uploadsInProgress: number;
  uploadsPending: number;
  uploadsCompletedToday: number;
  uploadsFailedToday: number;
  avgUploadSpeed: number;
  successRate: number;
  newBugsToday: number;
  criticalBugsToday: number;
}

export interface ErrorSummary {
  message: string;
  count: number;
  uniqueUsers: number;
  percentage: number;
}

export interface UploadError {
  id: string;
  videoId?: string;
  videoTitle?: string;
  userEmail: string;
  errorMessage: string;
  errorType: string;
  createdAt: string;
  metadata?: any;
}

// ============================================
// MONITORING SERVICE - PHASE 1 (MVP)
// ============================================

export class MonitoringService {
  /**
   * Get all active/recent uploads (last 24h)
   * Phase 1: Based on videos table + deduce status from timestamps
   */
  static async getActiveUploads(): Promise<UploadMonitorItem[]> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Get videos from last 24h with user info
    const { data: videos, error } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        file_path,
        duration,
        metadata,
        created_at,
        user_id,
        profiles!inner (
          email
        )
      `)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching uploads:', error);
      return [];
    }

    if (!videos) return [];

    // Get transcription status for each video
    const videoIds = videos.map(v => v.id);
    const { data: transcriptions } = await supabase
      .from('transcription_jobs')
      .select('video_id, status, error_message')
      .in('video_id', videoIds);

    const transcriptionMap = new Map(
      transcriptions?.map(t => [t.video_id, t]) || []
    );

    // Map videos to UploadMonitorItem with deduced status
    const uploads: UploadMonitorItem[] = videos.map(video => {
      const createdAt = new Date(video.created_at);
      const now = new Date();
      const elapsedMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

      // Deduce upload status based on timestamps and metadata
      let status: UploadMonitorItem['status'] = 'completed';
      let progress = 100;

      if (video.metadata?.uploadFailed) {
        status = 'failed';
        progress = video.metadata.uploadProgress || 0;
      } else if (elapsedMinutes < 5 && !video.file_path) {
        // If less than 5min old and no file_path, assume uploading
        status = 'uploading';
        progress = 50; // Estimate
      } else if (elapsedMinutes < 30 && !video.duration) {
        // If less than 30min old and no duration, might be processing
        status = 'uploading';
        progress = 75; // Estimate
      } else if (!video.file_path) {
        // No file_path after 5min = failed
        status = 'failed';
        progress = 0;
      }

      const transcription = transcriptionMap.get(video.id);

      return {
        id: video.id,
        userId: video.user_id,
        userEmail: (video.profiles as any)?.email || 'Unknown',
        videoTitle: video.title || 'Sans titre',
        filename: video.file_path?.split('/').pop() || 'unknown.mp4',
        fileSize: video.metadata?.fileSize,
        status,
        progress,
        uploadSpeed: video.metadata?.uploadSpeed,
        retryCount: video.metadata?.retryCount || 0,
        errorMessage: video.metadata?.errorMessage,
        startedAt: video.created_at,
        completedAt: status === 'completed' ? video.created_at : undefined,
        elapsedTime: (now.getTime() - createdAt.getTime()) / 1000,
        metadata: video.metadata,
        transcriptionStatus: transcription?.status,
        hasError: !!video.metadata?.uploadFailed || transcription?.status === 'failed',
      };
    });

    return uploads;
  }

  /**
   * Get monitoring statistics
   */
  static async getMonitoringStats(): Promise<MonitoringStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get uploads for today
    const { data: todayVideos } = await supabase
      .from('videos')
      .select('id, metadata, created_at')
      .gte('created_at', today.toISOString());

    const totalToday = todayVideos?.length || 0;
    const failedToday = todayVideos?.filter(v => v.metadata?.uploadFailed).length || 0;
    const completedToday = totalToday - failedToday;
    const successRate = totalToday > 0 ? (completedToday / totalToday) * 100 : 100;

    // Get current uploads in progress (last 30 min)
    const thirtyMinAgo = new Date();
    thirtyMinAgo.setMinutes(thirtyMinAgo.getMinutes() - 30);

    const { data: recentVideos } = await supabase
      .from('videos')
      .select('id, file_path, duration, created_at')
      .gte('created_at', thirtyMinAgo.toISOString());

    const uploadsInProgress = recentVideos?.filter(
      v => !v.file_path || !v.duration
    ).length || 0;

    // Get bugs for today
    const { data: todayBugs } = await supabase
      .from('bug_reports')
      .select('id, severity')
      .gte('created_at', today.toISOString());

    const newBugsToday = todayBugs?.length || 0;
    const criticalBugsToday = todayBugs?.filter(b => b.severity === 'critical').length || 0;

    // Calculate average upload speed (from recent completed uploads)
    const recentCompleted = todayVideos?.filter(v => v.metadata?.uploadSpeed) || [];
    const avgUploadSpeed = recentCompleted.length > 0
      ? recentCompleted.reduce((sum, v) => sum + (v.metadata.uploadSpeed || 0), 0) / recentCompleted.length
      : 0;

    return {
      uploadsInProgress,
      uploadsPending: 0, // Phase 1: No queue info
      uploadsCompletedToday: completedToday,
      uploadsFailedToday: failedToday,
      avgUploadSpeed,
      successRate,
      newBugsToday,
      criticalBugsToday,
    };
  }

  /**
   * Get top 5 most common errors in last 24h
   */
  static async getTopErrors(limit: number = 5): Promise<ErrorSummary[]> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: bugs } = await supabase
      .from('bug_reports')
      .select('error_message, user_id, user_email')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (!bugs || bugs.length === 0) return [];

    // Group by error message
    const errorGroups = bugs.reduce((acc, bug) => {
      const message = bug.error_message || 'Unknown error';
      if (!acc[message]) {
        acc[message] = {
          count: 0,
          users: new Set<string>(),
        };
      }
      acc[message].count++;
      if (bug.user_id) {
        acc[message].users.add(bug.user_id);
      }
      return acc;
    }, {} as Record<string, { count: number; users: Set<string> }>);

    const totalErrors = bugs.length;

    // Convert to array and sort by count
    const errors: ErrorSummary[] = Object.entries(errorGroups)
      .map(([message, data]) => ({
        message: message.length > 80 ? message.substring(0, 77) + '...' : message,
        count: data.count,
        uniqueUsers: data.users.size,
        percentage: parseFloat(((data.count / totalErrors) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return errors;
  }

  /**
   * Get recent bugs (reuse from bugService)
   */
  static async getRecentBugs(limit: number = 20) {
    const { data: bugs } = await supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return bugs || [];
  }

  /**
   * Get upload errors (failed uploads from videos table)
   */
  static async getUploadErrors(): Promise<UploadError[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: videos } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        metadata,
        created_at,
        user_id,
        profiles!inner (
          email
        )
      `)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (!videos) return [];

    const failedUploads = videos
      .filter(v => v.metadata?.uploadFailed)
      .map(v => ({
        id: v.id,
        videoId: v.id,
        videoTitle: v.title || 'Sans titre',
        userEmail: (v.profiles as any)?.email || 'Unknown',
        errorMessage: v.metadata?.errorMessage || 'Upload failed',
        errorType: 'upload',
        createdAt: v.created_at,
        metadata: v.metadata,
      }));

    return failedUploads;
  }

  /**
   * Get transcription errors (failed jobs)
   */
  static async getTranscriptionErrors(): Promise<UploadError[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: jobs } = await supabase
      .from('transcription_jobs')
      .select(`
        id,
        video_id,
        status,
        error_message,
        created_at,
        videos!inner (
          title,
          user_id,
          profiles!inner (
            email
          )
        )
      `)
      .eq('status', 'failed')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!jobs) return [];

    return jobs.map(job => {
      const video = job.videos as any;
      return {
        id: job.id,
        videoId: job.video_id,
        videoTitle: video?.title || 'Sans titre',
        userEmail: video?.profiles?.email || 'Unknown',
        errorMessage: job.error_message || 'Transcription failed',
        errorType: 'transcription',
        createdAt: job.created_at,
        metadata: {},
      };
    });
  }

  /**
   * Get network errors from bug_reports
   */
  static async getNetworkErrors(): Promise<UploadError[]> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: bugs } = await supabase
      .from('bug_reports')
      .select('*')
      .or('error_type.eq.network,error_message.ilike.%upload%')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!bugs) return [];

    return bugs.map(bug => ({
      id: bug.id,
      videoId: undefined,
      videoTitle: undefined,
      userEmail: bug.user_email || 'Unknown',
      errorMessage: bug.error_message,
      errorType: 'network',
      createdAt: bug.created_at,
      metadata: {
        severity: bug.severity,
        screen_name: bug.screen_name,
        action: bug.action,
      },
    }));
  }

  // ============================================
  // COMPREHENSIVE ANALYTICS - PRIORITY 1
  // ============================================

  /**
   * Get comprehensive user analytics
   */
  static async getUserAnalytics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Users with at least 1 video
    const { data: usersWithVideos } = await supabase
      .from('videos')
      .select('user_id')
      .not('user_id', 'is', null);

    const uniqueUsersWithVideos = new Set(usersWithVideos?.map(v => v.user_id) || []).size;

    // Active users (7d, 30d)
    const { data: videos7d } = await supabase
      .from('videos')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString());

    const activeUsers7d = new Set(videos7d?.map(v => v.user_id) || []).size;

    const { data: videos30d } = await supabase
      .from('videos')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const activeUsers30d = new Set(videos30d?.map(v => v.user_id) || []).size;

    // New users
    const { count: newUsersToday } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const { count: newUsers7d } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const { count: newUsers30d } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Language distribution
    const { data: languageData } = await supabase
      .from('profiles')
      .select('language');

    const languageDistribution = languageData?.reduce((acc, p) => {
      const lang = p.language || 'unknown';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Videos per user stats
    const { data: videosPerUser } = await supabase
      .rpc('get_videos_per_user');

    const activationRate = totalUsers ? (uniqueUsersWithVideos / totalUsers) * 100 : 0;

    return {
      totalUsers: totalUsers || 0,
      usersWithVideos: uniqueUsersWithVideos,
      activeUsers7d,
      activeUsers30d,
      newUsersToday: newUsersToday || 0,
      newUsers7d: newUsers7d || 0,
      newUsers30d: newUsers30d || 0,
      activationRate,
      inactiveUsers: (totalUsers || 0) - activeUsers30d,
      zombieUsers: (totalUsers || 0) - uniqueUsersWithVideos,
      languageDistribution,
      dau: activeUsers7d, // Using 7d as proxy for now
      wau: activeUsers7d,
      mau: activeUsers30d,
    };
  }

  /**
   * Get comprehensive video analytics
   */
  static async getVideoAnalytics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total videos
    const { count: totalVideos } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true });

    // Videos today, this week, this month
    const { count: videosToday } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const { count: videosWeek } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const { count: videosMonth } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Duration stats
    const { data: videos } = await supabase
      .from('videos')
      .select('duration, metadata');

    const durations = videos?.filter(v => v.duration).map(v => v.duration) || [];
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations.filter(d => d > 5)) : 0;

    // Duration distribution
    const durationDistribution = {
      'under1min': durations.filter(d => d < 60).length,
      '1to3min': durations.filter(d => d >= 60 && d < 180).length,
      '3to5min': durations.filter(d => d >= 180 && d < 300).length,
      '5to10min': durations.filter(d => d >= 300 && d < 600).length,
      'over10min': durations.filter(d => d >= 600).length,
    };

    // Content types
    const recordedVideos = videos?.filter(v => v.metadata?.isRecorded).length || 0;
    const importedVideos = videos?.filter(v => v.metadata?.isImported).length || 0;

    return {
      totalVideos: totalVideos || 0,
      videosToday: videosToday || 0,
      videosWeek: videosWeek || 0,
      videosMonth: videosMonth || 0,
      avgDuration,
      totalDurationHours: totalDuration / 3600,
      maxDuration,
      minDuration,
      durationDistribution,
      recordedVideos,
      importedVideos,
      recordedImportedRatio: recordedVideos > 0 ? (recordedVideos / (recordedVideos + importedVideos)) * 100 : 0,
    };
  }

  /**
   * Get transcription analytics
   */
  static async getTranscriptionAnalytics() {
    const { data: jobs } = await supabase
      .from('transcription_jobs')
      .select('*');

    const totalJobs = jobs?.length || 0;
    const completed = jobs?.filter(j => j.status === 'completed').length || 0;
    const processing = jobs?.filter(j => j.status === 'processing').length || 0;
    const pending = jobs?.filter(j => j.status === 'pending').length || 0;
    const failed = jobs?.filter(j => j.status === 'failed').length || 0;

    // Calculate average transcription time
    const completedJobs = jobs?.filter(j => j.status === 'completed' && j.completed_at) || [];
    const transcriptionTimes = completedJobs.map(j => {
      const created = new Date(j.created_at).getTime();
      const completedTime = new Date(j.completed_at).getTime();
      return (completedTime - created) / 1000; // seconds
    });

    const avgTranscriptionTime = transcriptionTimes.length > 0
      ? transcriptionTimes.reduce((sum, t) => sum + t, 0) / transcriptionTimes.length
      : 0;

    // Word count stats
    const wordCounts = completedJobs
      .filter(j => j.transcript_text)
      .map(j => j.transcript_text.split(/\s+/).length);

    const totalWords = wordCounts.reduce((sum, c) => sum + c, 0);
    const avgWords = wordCounts.length > 0 ? totalWords / wordCounts.length : 0;

    // Language distribution
    const languageDistribution = jobs?.reduce((acc, j) => {
      const lang = j.language || 'unknown';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      totalJobs,
      completed,
      processing,
      pending,
      failed,
      successRate: totalJobs > 0 ? (completed / totalJobs) * 100 : 0,
      failureRate: totalJobs > 0 ? (failed / totalJobs) * 100 : 0,
      avgTranscriptionTime,
      totalWords,
      avgWords,
      languageDistribution,
    };
  }

  /**
   * Get growth data (last 30 days)
   */
  static async getGrowthData() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Get videos per day
    const { data: videos } = await supabase
      .from('videos')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Get new users per day
    const { data: users } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Group by day
    const videosByDay: Record<string, number> = {};
    const usersByDay: Record<string, number> = {};

    videos?.forEach(v => {
      const date = new Date(v.created_at).toISOString().split('T')[0];
      videosByDay[date] = (videosByDay[date] || 0) + 1;
    });

    users?.forEach(u => {
      const date = new Date(u.created_at).toISOString().split('T')[0];
      usersByDay[date] = (usersByDay[date] || 0) + 1;
    });

    // Fill missing days with 0
    const result = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        videos: videosByDay[dateStr] || 0,
        users: usersByDay[dateStr] || 0,
      });
    }

    return result;
  }

  /**
   * Get chapter analytics
   */
  static async getChapterAnalytics() {
    const { data: chapters } = await supabase
      .from('chapters')
      .select('*');

    const totalChapters = chapters?.length || 0;
    const activeChapters = chapters?.filter(c => c.is_current).length || 0;

    // Get videos per chapter
    const { data: videos } = await supabase
      .from('videos')
      .select('chapter_id');

    const videosPerChapter: Record<string, number> = {};
    videos?.forEach(v => {
      if (v.chapter_id) {
        videosPerChapter[v.chapter_id] = (videosPerChapter[v.chapter_id] || 0) + 1;
      }
    });

    const avgVideosPerChapter = totalChapters > 0
      ? Object.values(videosPerChapter).reduce((sum, count) => sum + count, 0) / totalChapters
      : 0;

    const videosWithoutChapter = videos?.filter(v => !v.chapter_id).length || 0;
    const percentWithoutChapter = videos ? (videosWithoutChapter / videos.length) * 100 : 0;

    return {
      totalChapters,
      activeChapters,
      avgVideosPerChapter,
      videosWithoutChapter,
      percentWithoutChapter,
    };
  }

  /**
   * Get cost analytics
   */
  static async getCostAnalytics() {
    // Get transcription stats
    const { data: jobs } = await supabase
      .from('transcription_jobs')
      .select('*')
      .eq('status', 'completed');

    // Calculate total minutes transcribed
    const { data: videos } = await supabase
      .from('videos')
      .select('duration');

    const totalMinutes = (videos?.reduce((sum, v) => sum + (v.duration || 0), 0) || 0) / 60;

    // AssemblyAI cost: $0.015 per minute
    const assemblyAICost = totalMinutes * 0.015;

    // Estimate OpenAI costs (highlights + questions)
    const totalJobs = jobs?.length || 0;
    // Rough estimate: $0.01 per video for highlights + questions
    const openAICost = totalJobs * 0.01;

    const totalCost = assemblyAICost + openAICost;

    // Storage cost estimate
    const totalFileSize = videos?.reduce((sum, v) => {
      const size = v.metadata?.fileSize || 0;
      return sum + size;
    }, 0) || 0;
    const totalGB = totalFileSize / (1024 ** 3);
    // Supabase storage: ~$0.021 per GB/month
    const storageCost = totalGB * 0.021;

    return {
      assemblyAICost,
      openAICost,
      totalAPICost: totalCost,
      totalMinutesTranscribed: totalMinutes,
      costPerVideo: totalJobs > 0 ? totalCost / totalJobs : 0,
      storageCost,
      totalStorageGB: totalGB,
      totalMonthlyCost: totalCost + storageCost,
    };
  }

  // ============================================
  // UPLOAD CONTROL FUNCTIONS (Phase 2)
  // ============================================

  /**
   * Stop a specific upload by ID
   */
  static async stopUpload(uploadId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('stop_upload', {
        p_upload_id: uploadId,
      });

      if (error) {
        console.error('Error stopping upload:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error stopping upload:', error);
      return false;
    }
  }

  /**
   * Stop all uploads for a specific user
   */
  static async stopUserUploads(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('stop_user_uploads', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error stopping user uploads:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error stopping user uploads:', error);
      return 0;
    }
  }

  /**
   * EMERGENCY: Stop ALL active uploads (for development)
   */
  static async stopAllUploads(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('stop_all_uploads');

      if (error) {
        console.error('Error stopping all uploads:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error stopping all uploads:', error);
      return 0;
    }
  }

  /**
   * Get active uploads from upload_queue table (if exists)
   * Falls back to videos table if upload_queue doesn't exist yet
   */
  static async getActiveUploadsFromQueue(): Promise<UploadMonitorItem[]> {
    // Check if upload_queue table exists
    const { data: uploads, error } = await supabase
      .from('upload_queue')
      .select(`
        id,
        user_id,
        video_title,
        filename,
        file_size,
        status,
        progress,
        upload_speed,
        retry_count,
        error_message,
        started_at,
        completed_at,
        stopped_at,
        metadata,
        profiles!inner (
          email
        )
      `)
      .in('status', ['uploading', 'retrying', 'failed'])
      .order('started_at', { ascending: false });

    if (error) {
      // Table doesn't exist yet, fallback to original method
      console.log('upload_queue table not found, using fallback method');
      return this.getActiveUploads();
    }

    if (!uploads) return [];

    return uploads.map(upload => {
      const now = new Date();
      const startedAt = new Date(upload.started_at);
      const elapsedTime = (now.getTime() - startedAt.getTime()) / 1000;

      return {
        id: upload.id,
        userId: upload.user_id,
        userEmail: (upload.profiles as any)?.email || 'Unknown',
        videoTitle: upload.video_title,
        filename: upload.filename,
        fileSize: upload.file_size,
        status: upload.status as any,
        progress: upload.progress,
        uploadSpeed: upload.upload_speed,
        retryCount: upload.retry_count,
        errorMessage: upload.error_message,
        startedAt: upload.started_at,
        completedAt: upload.completed_at,
        elapsedTime,
        metadata: upload.metadata,
      };
    });
  }
}
