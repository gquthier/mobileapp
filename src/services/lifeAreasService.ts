// ============================================================================
// Life Areas Service
// Description: Gestion des domaines de vie trackés par l'utilisateur
// ============================================================================

import { supabase } from '../lib/supabase';
import {
  LifeArea,
  LifeAreaTemplate,
  LifeAreaHistoryEntry,
  MomentumInitConfig,
} from '../types/momentum';

// ============================================================================
// CONSTANTS
// ============================================================================

const INITIAL_LIFE_AREA_SCORE = 50; // Score initial à 50/100
const LIFE_AREA_HISTORY_LIMIT = 14; // Garder les 14 derniers jours
const MIN_LIFE_AREAS = 3;
const MAX_LIFE_AREAS = 5;

// ============================================================================
// TEMPLATES MANAGEMENT
// ============================================================================

/**
 * Récupère tous les templates de life areas disponibles
 */
export async function getLifeAreaTemplates(): Promise<LifeAreaTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('life_area_templates')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching life area templates:', error);
      return [];
    }

    return data as LifeAreaTemplate[];
  } catch (error) {
    console.error('❌ Error in getLifeAreaTemplates:', error);
    return [];
  }
}

/**
 * Récupère les templates recommandés (pour onboarding)
 */
export async function getRecommendedTemplates(): Promise<LifeAreaTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('life_area_templates')
      .select('*')
      .eq('is_recommended', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching recommended templates:', error);
      return [];
    }

    return data as LifeAreaTemplate[];
  } catch (error) {
    console.error('❌ Error in getRecommendedTemplates:', error);
    return [];
  }
}

// ============================================================================
// USER LIFE AREAS MANAGEMENT
// ============================================================================

/**
 * Récupère tous les life areas d'un utilisateur
 */
export async function getUserLifeAreas(userId: string): Promise<LifeArea[]> {
  try {
    const { data, error } = await supabase
      .from('life_areas')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching user life areas:', error);
      return [];
    }

    return data as LifeArea[];
  } catch (error) {
    console.error('❌ Error in getUserLifeAreas:', error);
    return [];
  }
}

/**
 * Récupère uniquement les life areas actifs d'un utilisateur
 */
export async function getActiveLifeAreas(userId: string): Promise<LifeArea[]> {
  try {
    const { data, error } = await supabase
      .from('life_areas')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching active life areas:', error);
      return [];
    }

    return data as LifeArea[];
  } catch (error) {
    console.error('❌ Error in getActiveLifeAreas:', error);
    return [];
  }
}

/**
 * Crée les life areas sélectionnés pour un utilisateur
 */
export async function createLifeAreas(
  userId: string,
  selectedAreas: { area_key: string; display_name?: string; emoji?: string }[]
): Promise<LifeArea[]> {
  try {
    console.log('🎯 Creating life areas for user:', userId, selectedAreas);

    // Récupérer les templates pour les valeurs par défaut
    const templates = await getLifeAreaTemplates();
    const templateMap = new Map(templates.map((t) => [t.area_key, t]));

    // Préparer les données à insérer
    const lifeAreasToCreate = selectedAreas.map((area, index) => {
      const template = templateMap.get(area.area_key);

      return {
        user_id: userId,
        area_key: area.area_key,
        display_name: area.display_name || template?.default_name_fr || area.area_key,
        emoji: area.emoji || template?.default_emoji || '📌',
        score: INITIAL_LIFE_AREA_SCORE,
        score_history: JSON.stringify([
          {
            date: new Date().toISOString(),
            score: INITIAL_LIFE_AREA_SCORE,
            change: 0,
          },
        ]),
        is_active: true,
        weight: 1.0,
        display_order: index,
        total_positive_impacts: 0,
        total_negative_impacts: 0,
        best_score: INITIAL_LIFE_AREA_SCORE,
        worst_score: INITIAL_LIFE_AREA_SCORE,
      };
    });

    // Insérer dans la base de données
    const { data, error } = await supabase
      .from('life_areas')
      .insert(lifeAreasToCreate)
      .select();

    if (error) {
      console.error('❌ Error creating life areas:', error);
      return [];
    }

    console.log('✅ Life areas created successfully:', data.length);
    return data as LifeArea[];
  } catch (error) {
    console.error('❌ Error in createLifeAreas:', error);
    return [];
  }
}

/**
 * Met à jour le score d'un life area
 */
export async function updateLifeAreaScore(
  lifeAreaId: string,
  scoreChange: number
): Promise<LifeArea | null> {
  try {
    console.log('📊 Updating life area score:', lifeAreaId, 'change:', scoreChange);

    // 1. Récupérer le life area actuel
    const { data: currentArea, error: fetchError } = await supabase
      .from('life_areas')
      .select('*')
      .eq('id', lifeAreaId)
      .single();

    if (fetchError || !currentArea) {
      console.error('❌ Error fetching life area:', fetchError);
      return null;
    }

    // 2. Calculer le nouveau score (limité à 0-100)
    const newScore = Math.max(0, Math.min(100, currentArea.score + scoreChange));

    // 3. Créer nouvelle entrée d'historique
    const historyEntry: LifeAreaHistoryEntry = {
      date: new Date().toISOString(),
      score: newScore,
      change: scoreChange,
    };

    // 4. Mettre à jour l'historique (garder les 14 derniers jours)
    const scoreHistory = Array.isArray(currentArea.score_history)
      ? currentArea.score_history
      : [];
    const updatedHistory = [...scoreHistory, historyEntry].slice(-LIFE_AREA_HISTORY_LIMIT);

    // 5. Mettre à jour dans la base de données
    const { data, error } = await supabase
      .from('life_areas')
      .update({
        score: newScore,
        score_history: updatedHistory,
        total_positive_impacts:
          scoreChange > 0
            ? currentArea.total_positive_impacts + 1
            : currentArea.total_positive_impacts,
        total_negative_impacts:
          scoreChange < 0
            ? currentArea.total_negative_impacts + 1
            : currentArea.total_negative_impacts,
        best_score: Math.max(currentArea.best_score, newScore),
        worst_score: Math.min(currentArea.worst_score, newScore),
        updated_at: new Date().toISOString(),
      })
      .eq('id', lifeAreaId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating life area:', error);
      return null;
    }

    console.log('✅ Life area updated:', {
      area: data.display_name,
      previousScore: currentArea.score,
      newScore: newScore,
      change: scoreChange,
    });

    return data as LifeArea;
  } catch (error) {
    console.error('❌ Error in updateLifeAreaScore:', error);
    return null;
  }
}

/**
 * Met à jour plusieurs life areas en une seule opération (après analyse vidéo)
 */
export async function updateMultipleLifeAreas(
  userId: string,
  lifeAreasImpact: Record<string, number>
): Promise<Record<string, number>> {
  try {
    console.log('📊 Updating multiple life areas:', lifeAreasImpact);

    // Récupérer tous les life areas de l'utilisateur
    const userAreas = await getActiveLifeAreas(userId);
    const areaMap = new Map(userAreas.map((area) => [area.area_key, area]));

    const updatedScores: Record<string, number> = {};

    // Mettre à jour chaque area concerné
    for (const [areaKey, impact] of Object.entries(lifeAreasImpact)) {
      const area = areaMap.get(areaKey);
      if (!area) {
        console.warn('⚠️ Life area not found for key:', areaKey);
        continue;
      }

      const updatedArea = await updateLifeAreaScore(area.id, impact);
      if (updatedArea) {
        updatedScores[areaKey] = updatedArea.score;
      }
    }

    console.log('✅ Multiple life areas updated:', updatedScores);
    return updatedScores;
  } catch (error) {
    console.error('❌ Error in updateMultipleLifeAreas:', error);
    return {};
  }
}

/**
 * Active/désactive un life area
 */
export async function toggleLifeArea(lifeAreaId: string, isActive: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('life_areas')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lifeAreaId);

    if (error) {
      console.error('❌ Error toggling life area:', error);
      return false;
    }

    console.log('✅ Life area toggled:', lifeAreaId, 'active:', isActive);
    return true;
  } catch (error) {
    console.error('❌ Error in toggleLifeArea:', error);
    return false;
  }
}

/**
 * Met à jour le poids d'importance d'un life area (0.5 - 2.0)
 */
export async function updateLifeAreaWeight(
  lifeAreaId: string,
  weight: number
): Promise<boolean> {
  try {
    // Contraindre le poids entre 0.5 et 2.0
    const constrainedWeight = Math.max(0.5, Math.min(2.0, weight));

    const { error } = await supabase
      .from('life_areas')
      .update({
        weight: constrainedWeight,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lifeAreaId);

    if (error) {
      console.error('❌ Error updating life area weight:', error);
      return false;
    }

    console.log('✅ Life area weight updated:', lifeAreaId, 'weight:', constrainedWeight);
    return true;
  } catch (error) {
    console.error('❌ Error in updateLifeAreaWeight:', error);
    return false;
  }
}

/**
 * Réorganise l'ordre d'affichage des life areas
 */
export async function reorderLifeAreas(
  userId: string,
  orderedAreaIds: string[]
): Promise<boolean> {
  try {
    console.log('📋 Reordering life areas for user:', userId);

    // Mettre à jour l'ordre de chaque area
    const updates = orderedAreaIds.map((areaId, index) => {
      return supabase
        .from('life_areas')
        .update({ display_order: index })
        .eq('id', areaId)
        .eq('user_id', userId);
    });

    await Promise.all(updates);

    console.log('✅ Life areas reordered successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in reorderLifeAreas:', error);
    return false;
  }
}

/**
 * Récupère les statistiques d'un life area
 */
export async function getLifeAreaStats(lifeAreaId: string): Promise<{
  current_score: number;
  best_score: number;
  worst_score: number;
  average_score: number;
  total_positive: number;
  total_negative: number;
  trend_7_days: 'up' | 'down' | 'stable';
  trend_value: number;
} | null> {
  try {
    const { data: area, error } = await supabase
      .from('life_areas')
      .select('*')
      .eq('id', lifeAreaId)
      .single();

    if (error || !area) {
      console.error('❌ Error fetching life area stats:', error);
      return null;
    }

    // Calculer la moyenne
    const scoreHistory = Array.isArray(area.score_history) ? area.score_history : [];
    const averageScore =
      scoreHistory.length > 0
        ? Math.round(
            scoreHistory.reduce((sum: number, entry: LifeAreaHistoryEntry) => sum + entry.score, 0) /
              scoreHistory.length
          )
        : area.score;

    // Calculer la tendance sur 7 derniers jours
    const last7Days = scoreHistory.slice(-7);
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendValue = 0;

    if (last7Days.length >= 2) {
      const firstScore = last7Days[0].score;
      const lastScore = last7Days[last7Days.length - 1].score;
      trendValue = lastScore - firstScore;

      if (trendValue > 5) trend = 'up';
      else if (trendValue < -5) trend = 'down';
      else trend = 'stable';
    }

    return {
      current_score: area.score,
      best_score: area.best_score,
      worst_score: area.worst_score,
      average_score: averageScore,
      total_positive: area.total_positive_impacts,
      total_negative: area.total_negative_impacts,
      trend_7_days: trend,
      trend_value: trendValue,
    };
  } catch (error) {
    console.error('❌ Error in getLifeAreaStats:', error);
    return null;
  }
}

/**
 * Supprime un life area (déconseillé - préférer toggleLifeArea)
 */
export async function deleteLifeArea(lifeAreaId: string): Promise<boolean> {
  try {
    console.warn('⚠️ Deleting life area:', lifeAreaId, '(consider using toggleLifeArea instead)');

    const { error } = await supabase.from('life_areas').delete().eq('id', lifeAreaId);

    if (error) {
      console.error('❌ Error deleting life area:', error);
      return false;
    }

    console.log('✅ Life area deleted');
    return true;
  } catch (error) {
    console.error('❌ Error in deleteLifeArea:', error);
    return false;
  }
}

/**
 * Vérifie si un utilisateur a déjà configuré ses life areas
 */
export async function hasLifeAreasConfigured(userId: string): Promise<boolean> {
  try {
    const areas = await getUserLifeAreas(userId);
    return areas.length >= MIN_LIFE_AREAS;
  } catch (error) {
    console.error('❌ Error in hasLifeAreasConfigured:', error);
    return false;
  }
}

/**
 * Initialise le système complet Momentum + Life Areas pour un nouvel utilisateur
 */
export async function initializeMomentumSystem(
  config: MomentumInitConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🚀 Initializing momentum system for user:', config.user_id);

    // Validation
    if (
      config.selected_life_areas.length < MIN_LIFE_AREAS ||
      config.selected_life_areas.length > MAX_LIFE_AREAS
    ) {
      return {
        success: false,
        error: `Please select between ${MIN_LIFE_AREAS} and ${MAX_LIFE_AREAS} life areas`,
      };
    }

    // 1. Créer le momentum score (via fonction SQL)
    const { error: momentumError } = await supabase.rpc('initialize_user_momentum', {
      p_user_id: config.user_id,
    });

    if (momentumError) {
      console.error('❌ Error initializing momentum:', momentumError);
      return { success: false, error: 'Failed to initialize momentum score' };
    }

    // 2. Créer les life areas
    const lifeAreas = await createLifeAreas(config.user_id, config.selected_life_areas);

    if (lifeAreas.length === 0) {
      return { success: false, error: 'Failed to create life areas' };
    }

    console.log('✅ Momentum system initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error in initializeMomentumSystem:', error);
    return { success: false, error: 'Unexpected error during initialization' };
  }
}
