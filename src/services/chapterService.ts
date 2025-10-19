// ============================================================================
// Chapter Service
// Description: Service pour la gestion des chapitres de vie de l'utilisateur
// ============================================================================

import { supabase, Chapter } from '../lib/supabase';

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
    const stats = await getChapterStats(data.id!);

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
 */
export async function updateChapter(
  chapterId: string,
  updates: Partial<Chapter>
): Promise<Chapter | null> {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .update(updates)
      .eq('id', chapterId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Chapter updated:', data.title);
    return data;
  } catch (error) {
    console.error('❌ Error updating chapter:', error);
    return null;
  }
}

/**
 * Termine un chapitre (is_current = false, ended_at = now)
 */
export async function endChapter(
  chapterId: string,
  recapVideoId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chapters')
      .update({
        is_current: false,
        ended_at: new Date().toISOString(),
        recap_video_id: recapVideoId || null,
      })
      .eq('id', chapterId);

    if (error) throw error;

    console.log('✅ Chapter ended:', chapterId);
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
        const stats = await getChapterStats(chapter.id!);
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
 */
export async function assignVideosToChapter(
  videoIds: string[],
  chapterId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('videos')
      .update({ chapter_id: chapterId })
      .in('id', videoIds);

    if (error) throw error;

    console.log(`✅ ${videoIds.length} videos assigned to chapter:`, chapterId);
    return true;
  } catch (error) {
    console.error('❌ Error assigning videos to chapter:', error);
    return false;
  }
}

/**
 * Récupère les statistiques d'un chapitre
 */
export async function getChapterStats(
  chapterId: string
): Promise<{ video_count: number; total_duration: number }> {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('duration')
      .eq('chapter_id', chapterId);

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
 */
export async function deleteChapter(chapterId: string): Promise<boolean> {
  try {
    // Vérifier qu'il n'y a pas de vidéos
    const stats = await getChapterStats(chapterId);
    if (stats.video_count > 0) {
      console.warn('⚠️ Cannot delete chapter with videos');
      return false;
    }

    const { error } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId);

    if (error) throw error;

    console.log('✅ Chapter deleted:', chapterId);
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
