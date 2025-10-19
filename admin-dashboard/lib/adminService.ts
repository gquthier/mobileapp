import { supabase } from './supabase';

export interface AdminStats {
  // Overview
  totalUsers: number;
  activeUsers7Days: number;
  activeUsers30Days: number;
  totalVideos: number;
  totalDuration: number;
  totalStorageGB: number;

  // User metrics
  avgVideosPerUser: number;
  medianVideosPerUser: number;
  avgVideoDuration: number;
  mostActiveUser: {
    email: string;
    videoCount: number;
  } | null;

  // Content metrics
  transcriptionStats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    successRate: number;
  };

  // API Usage
  apiUsage: {
    totalTranscriptionMinutes: number;
    estimatedAssemblyAICost: number;
    totalHighlightsGenerated: number;
    totalQuestionsGenerated: number;
    estimatedOpenAICost: number;
  };

  // Upload stats
  uploadStats: {
    totalUploaded: number;
    totalImported: number;
    failedUploads: number;
    localBackups: number;
  };

  // Growth metrics
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  videosToday: number;
  videosThisWeek: number;
  videosThisMonth: number;

  // Popular content
  topLanguages: Array<{ language: string; count: number }>;
  videoOrientations: {
    portrait: number;
    landscape: number;
  };

  // User retention
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export interface TimeSeriesData {
  date: string;
  users: number;
  videos: number;
}

export class AdminService {
  static async getAdminStats(): Promise<AdminStats> {
    const [
      usersData,
      videosData,
      transcriptionJobsData,
      recentUsersData,
      recentVideosData,
    ] = await Promise.all([
      this.getUserStats(),
      this.getVideoStats(),
      this.getTranscriptionStats(),
      this.getRecentUserStats(),
      this.getRecentVideoStats(),
    ]);

    return {
      ...usersData,
      ...videosData,
      ...transcriptionJobsData,
      ...recentUsersData,
      ...recentVideosData,
    };
  }

  private static async getUserStats() {
    const { data: users } = await supabase.from('profiles').select('id, email, created_at');
    const totalUsers = users?.length || 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activeUsers7 } = await supabase
      .from('videos')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString());

    const activeUsers7Days = new Set(activeUsers7?.map(v => v.user_id) || []).size;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activeUsers30 } = await supabase
      .from('videos')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const activeUsers30Days = new Set(activeUsers30?.map(v => v.user_id) || []).size;

    return { totalUsers, activeUsers7Days, activeUsers30Days };
  }

  private static async getVideoStats() {
    const { data: videos } = await supabase.from('videos').select('id, user_id, duration, created_at, metadata');

    const totalVideos = videos?.length || 0;
    const totalDuration = videos?.reduce((sum, v) => sum + (v.duration || 0), 0) || 0;
    const totalStorageGB = (totalDuration / 60) * 0.001;

    const videosByUser = videos?.reduce((acc, v) => {
      acc[v.user_id] = (acc[v.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const videoCounts = Object.values(videosByUser);
    const avgVideosPerUser = videoCounts.length > 0
      ? videoCounts.reduce((sum, count) => sum + count, 0) / videoCounts.length
      : 0;

    const sortedCounts = [...videoCounts].sort((a, b) => a - b);
    const medianVideosPerUser = sortedCounts.length > 0
      ? sortedCounts[Math.floor(sortedCounts.length / 2)]
      : 0;

    const avgVideoDuration = totalVideos > 0 ? totalDuration / totalVideos : 0;

    let mostActiveUser = null;
    if (videoCounts.length > 0) {
      const maxCount = Math.max(...videoCounts);
      const mostActiveUserId = Object.keys(videosByUser).find(
        userId => videosByUser[userId] === maxCount
      );

      if (mostActiveUserId) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', mostActiveUserId)
          .single();

        mostActiveUser = {
          email: userData?.email || 'Unknown',
          videoCount: maxCount,
        };
      }
    }

    const importedVideos = videos?.filter(v => v.metadata?.isImported) || [];
    const failedUploads = videos?.filter(v => v.metadata?.uploadFailed) || [];
    const localBackups = videos?.filter(v => v.metadata?.isLocalBackup) || [];

    const uploadStats = {
      totalUploaded: totalVideos,
      totalImported: importedVideos.length,
      failedUploads: failedUploads.length,
      localBackups: localBackups.length,
    };

    const portraits = videos?.filter(v => v.metadata?.orientation === 'portrait' || !v.metadata?.orientation).length || 0;
    const landscapes = videos?.filter(v => v.metadata?.orientation === 'landscape').length || 0;

    const videoOrientations = { portrait: portraits, landscape: landscapes };

    return {
      totalVideos,
      totalDuration,
      totalStorageGB,
      avgVideosPerUser,
      medianVideosPerUser,
      avgVideoDuration,
      mostActiveUser,
      uploadStats,
      videoOrientations,
    };
  }

  private static async getTranscriptionStats() {
    const { data: jobs } = await supabase
      .from('transcription_jobs')
      .select('id, status, transcription_text, transcript_highlight');

    const total = jobs?.length || 0;
    const pending = jobs?.filter(j => j.status === 'pending').length || 0;
    const processing = jobs?.filter(j => j.status === 'processing').length || 0;
    const completed = jobs?.filter(j => j.status === 'completed').length || 0;
    const failed = jobs?.filter(j => j.status === 'failed').length || 0;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    const transcriptionStats = { total, pending, processing, completed, failed, successRate };

    const totalWords = jobs?.reduce((sum, j) => {
      if (j.transcription_text) {
        return sum + j.transcription_text.split(' ').length;
      }
      return sum;
    }, 0) || 0;

    const totalTranscriptionMinutes = totalWords / 150;
    const estimatedAssemblyAICost = totalTranscriptionMinutes * 0.015;

    const totalHighlightsGenerated = jobs?.reduce((sum, j) => {
      if (j.transcript_highlight?.highlights) {
        return sum + j.transcript_highlight.highlights.length;
      }
      return sum;
    }, 0) || 0;

    const { data: questions } = await supabase.from('user_questions').select('id');
    const totalQuestionsGenerated = questions?.length || 0;

    const estimatedOpenAICost =
      (completed * 500 * 0.00015 / 1000) +
      (Math.ceil(totalQuestionsGenerated / 50) * 1000 * 0.00015 / 1000);

    const apiUsage = {
      totalTranscriptionMinutes,
      estimatedAssemblyAICost,
      totalHighlightsGenerated,
      totalQuestionsGenerated,
      estimatedOpenAICost,
    };

    return { transcriptionStats, apiUsage };
  }

  private static async getRecentUserStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const thisMonth = new Date();
    thisMonth.setDate(thisMonth.getDate() - 30);

    const { data: newToday } = await supabase.from('profiles').select('id').gte('created_at', today.toISOString());
    const { data: newThisWeek } = await supabase.from('profiles').select('id').gte('created_at', thisWeek.toISOString());
    const { data: newThisMonth } = await supabase.from('profiles').select('id').gte('created_at', thisMonth.toISOString());

    return {
      newUsersToday: newToday?.length || 0,
      newUsersThisWeek: newThisWeek?.length || 0,
      newUsersThisMonth: newThisMonth?.length || 0,
    };
  }

  private static async getRecentVideoStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const thisMonth = new Date();
    thisMonth.setDate(thisMonth.getDate() - 30);

    const { data: videosToday } = await supabase.from('videos').select('id').gte('created_at', today.toISOString());
    const { data: videosThisWeek } = await supabase.from('videos').select('id').gte('created_at', thisWeek.toISOString());
    const { data: videosThisMonth } = await supabase.from('videos').select('id').gte('created_at', thisMonth.toISOString());

    const { data: transcriptions } = await supabase.from('transcription_jobs').select('language');

    const languageCounts = transcriptions?.reduce((acc, t) => {
      const lang = t.language || 'unknown';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const topLanguages = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const retention = { day1: 0, day7: 0, day30: 0 };

    return {
      videosToday: videosToday?.length || 0,
      videosThisWeek: videosThisWeek?.length || 0,
      videosThisMonth: videosThisMonth?.length || 0,
      topLanguages,
      retention,
    };
  }

  static async getTimeSeriesData(days: number = 30): Promise<TimeSeriesData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: users } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    const { data: videos } = await supabase
      .from('videos')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    const dataByDay: Record<string, { users: number; videos: number }> = {};

    users?.forEach(user => {
      const date = new Date(user.created_at).toISOString().split('T')[0];
      if (!dataByDay[date]) dataByDay[date] = { users: 0, videos: 0 };
      dataByDay[date].users++;
    });

    videos?.forEach(video => {
      const date = new Date(video.created_at).toISOString().split('T')[0];
      if (!dataByDay[date]) dataByDay[date] = { users: 0, videos: 0 };
      dataByDay[date].videos++;
    });

    const result: TimeSeriesData[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      result.push({
        date: dateStr,
        users: dataByDay[dateStr]?.users || 0,
        videos: dataByDay[dateStr]?.videos || 0,
      });
    }

    return result;
  }
}
