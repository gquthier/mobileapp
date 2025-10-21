// ============================================================================
// Chapter Service
// Description: Service pour la gestion des chapitres de vie de l'utilisateur
// ============================================================================

import { supabase } from '../lib/supabase';
import type { Chapter } from '../lib/supabase';

export type { Chapter };

/**
 * Récupère le chapitre actuel de l'utilisateur
 */
export async function getCurrentChapter(userId: string): Promise<Chapter | null> {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(`
        *,
        videos:videos!videos_chapter_id_fkey(count)
      `)
      .eq('user_id', userId)
      .eq('is_current', true)
      .single();

    if (error) {
      // Si pas de chapitre actuel, ce n'est pas une erreur
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    // Calculer les statistiques
    const stats = await getChapterStats(data.id!, userId);

    return {
      ...data,
      video_count: stats.video_count,
      total_duration: stats.total_duration,
    };
  } catch (error) {
    console.error('❌ Error getting current chapter:', error);
    return null;
  }
}

/**
 * Vérifie si l'utilisateur a un chapitre actuel
 */
export async function userHasCurrentChapter(userId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('chapters')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_current', true);

    if (error) throw error;
    return (count || 0) > 0;
  } catch (error) {
    console.error('❌ Error checking current chapter:', error);
    return false;
  }
}

/**
 * Crée un nouveau chapitre
 */
export async function createChapter(
  userId: string,
  title: string,
  startedAt: string = new Date().toISOString(),
  isCurrent: boolean = true,
  description?: string
): Promise<Chapter | null> {
  try {
    // Si on crée un nouveau current chapter, désactiver l'ancien
    if (isCurrent) {
      await setAllChaptersNotCurrent(userId);
    }

    const { data, error } = await supabase
      .from('chapters')
      .insert({
        user_id: userId,
        title,
        description,
        started_at: startedAt,
        is_current: isCurrent,
        ended_at: null,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Chapter created:', data.title);
    return data;
  } catch (error) {
    console.error('❌ Error creating chapter:', error);
    return null;
  }
}

/**
 * Met à jour un chapitre
 * 🔒 SÉCURISÉ: Vérifie que le chapitre appartient à l'utilisateur
 */
export async function updateChapter(
  chapterId: string,
  updates: Partial<Chapter>,
  userId?: string
): Promise<Chapter | null> {
  try {
    // 🔒 Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ No authenticated user for updateChapter');
        return null;
      }
      currentUserId = user.id;
    }

    // 🔒 SECURITY: Only update if chapter belongs to user
    const { data, error } = await supabase
      .from('chapters')
      .update(updates)
      .eq('id', chapterId)
      .eq('user_id', currentUserId) // ← PROTECTION CRITIQUE
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.error('❌ Chapter not found or user does not own this chapter');
        return null;
      }
      throw error;
    }

    console.log('✅ Chapter updated securely:', data.title);
    return data;
  } catch (error) {
    console.error('❌ Error updating chapter:', error);
    return null;
  }
}

/**
 * Termine un chapitre (is_current = false, ended_at = now)
 * 🔒 SÉCURISÉ: Vérifie que le chapitre appartient à l'utilisateur
 */
export async function endChapter(
  chapterId: string,
  recapVideoId?: string,
  userId?: string
): Promise<boolean> {
  try {
    // 🔒 Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ No authenticated user for endChapter');
        return false;
      }
      currentUserId = user.id;
    }

    // 🔒 SECURITY: Only end chapter if it belongs to user
    const { error } = await supabase
      .from('chapters')
      .update({
        is_current: false,
        ended_at: new Date().toISOString(),
        recap_video_id: recapVideoId || null,
      })
      .eq('id', chapterId)
      .eq('user_id', currentUserId); // ← PROTECTION CRITIQUE

    if (error) {
      console.error('❌ Error ending chapter:', error);
      return false;
    }

    console.log('✅ Chapter ended securely:', chapterId);
    return true;
  } catch (error) {
    console.error('❌ Error ending chapter:', error);
    return false;
  }
}

/**
 * Récupère tous les chapitres d'un utilisateur (actuels et passés)
 */
export async function getUserChapters(userId: string): Promise<Chapter[]> {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) throw error;

    // Ajouter les stats à chaque chapitre
    const chaptersWithStats = await Promise.all(
      (data || []).map(async (chapter) => {
        const stats = await getChapterStats(chapter.id!, userId);
        return {
          ...chapter,
          video_count: stats.video_count,
          total_duration: stats.total_duration,
        };
      })
    );

    return chaptersWithStats;
  } catch (error) {
    console.error('❌ Error getting user chapters:', error);
    return [];
  }
}

/**
 * Assigne des vidéos à un chapitre
 * 🔒 SÉCURISÉ: Vérifie que les vidéos ET le chapitre appartiennent à l'utilisateur
 */
export async function assignVideosToChapter(
  videoIds: string[],
  chapterId: string,
  userId?: string
): Promise<boolean> {
  try {
    // 🔒 Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ No authenticated user for assignVideosToChapter');
        return false;
      }
      currentUserId = user.id;
    }

    // 🔒 SECURITY 1: Verify chapter belongs to user
    const { data: chapterData, error: chapterError } = await supabase
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('user_id', currentUserId)
      .single();

    if (chapterError || !chapterData) {
      console.error('❌ Chapter not found or user does not own this chapter');
      return false;
    }

    // 🔒 SECURITY 2: Only update videos that belong to the user
    // RLS will automatically filter, but we add explicit check
    const { error } = await supabase
      .from('videos')
      .update({ chapter_id: chapterId })
      .in('id', videoIds)
      .eq('user_id', currentUserId); // ← PROTECTION CRITIQUE

    if (error) throw error;

    console.log(`✅ ${videoIds.length} videos assigned securely to chapter:`, chapterId);
    return true;
  } catch (error) {
    console.error('❌ Error assigning videos to chapter:', error);
    return false;
  }
}

/**
 * Récupère les statistiques d'un chapitre
 * 🔒 SÉCURISÉ: Vérifie que le chapitre appartient à l'utilisateur
 */
export async function getChapterStats(
  chapterId: string,
  userId?: string
): Promise<{ video_count: number; total_duration: number }> {
  try {
    // 🔒 Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('⚠️ No authenticated user for getChapterStats');
        return { video_count: 0, total_duration: 0 };
      }
      currentUserId = user.id;
    }

    // 🔒 SECURITY 1: Verify chapter belongs to user first
    const { data: chapterData, error: chapterError } = await supabase
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('user_id', currentUserId)
      .single();

    if (chapterError || !chapterData) {
      console.warn('⚠️ Chapter not found or user does not own this chapter');
      return { video_count: 0, total_duration: 0 };
    }

    // 🔒 SECURITY 2: Only count videos that belong to the user
    const { data, error } = await supabase
      .from('videos')
      .select('duration')
      .eq('chapter_id', chapterId)
      .eq('user_id', currentUserId); // ← PROTECTION CRITIQUE

    if (error) throw error;

    const video_count = data?.length || 0;
    const total_duration = data?.reduce((sum, v) => sum + (v.duration || 0), 0) || 0;

    return { video_count, total_duration };
  } catch (error) {
    console.error('❌ Error getting chapter stats:', error);
    return { video_count: 0, total_duration: 0 };
  }
}

/**
 * Récupère les vidéos sans chapitre assigné
 */
export async function getVideosWithoutChapter(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', userId)
      .is('chapter_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error getting videos without chapter:', error);
    return [];
  }
}

/**
 * Supprime un chapitre (seulement s'il n'a pas de vidéos)
 * 🔒 SÉCURISÉ: Vérifie que le chapitre appartient à l'utilisateur
 */
export async function deleteChapter(chapterId: string, userId?: string): Promise<boolean> {
  try {
    // 🔒 Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ No authenticated user for deleteChapter');
        return false;
      }
      currentUserId = user.id;
    }

    // 🔒 SECURITY: Verify chapter belongs to user before checking stats
    const { data: chapterData, error: chapterError } = await supabase
      .from('chapters')
      .select('id')
      .eq('id', chapterId)
      .eq('user_id', currentUserId)
      .single();

    if (chapterError || !chapterData) {
      console.error('❌ Chapter not found or user does not own this chapter');
      return false;
    }

    // Vérifier qu'il n'y a pas de vidéos
    const stats = await getChapterStats(chapterId, currentUserId);
    if (stats.video_count > 0) {
      console.warn('⚠️ Cannot delete chapter with videos');
      return false;
    }

    // 🔒 SECURITY: Delete only if belongs to user
    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId)
      .eq('user_id', currentUserId); // ← PROTECTION CRITIQUE

    if (error) throw error;

    console.log('✅ Chapter deleted securely:', chapterId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting chapter:', error);
    return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Met tous les chapitres d'un utilisateur en is_current = false
 */
async function setAllChaptersNotCurrent(userId: string): Promise<void> {
  try {
    await supabase
      .from('chapters')
      .update({ is_current: false })
      .eq('user_id', userId)
      .eq('is_current', true);
  } catch (error) {
    console.error('❌ Error setting chapters not current:', error);
  }
}

/**
 * Formate la durée en heures/minutes
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Formate la période d'un chapitre
 */
export function formatChapterPeriod(startedAt: string, endedAt?: string | null): string {
  const start = new Date(startedAt);
  const startFormatted = start.toLocaleDateString('fr-FR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (!endedAt) {
    return `${startFormatted} - Present`;
  }

  const end = new Date(endedAt);
  const endFormatted = end.toLocaleDateString('fr-FR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${startFormatted} - ${endFormatted}`;
}
