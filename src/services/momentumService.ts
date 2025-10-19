// ============================================================================
// Momentum Score Service
// Description: Core business logic pour le système Momentum Score
// ============================================================================

import { supabase } from '../lib/supabase';
import {
  MomentumScore,
  ScoreHistoryEntry,
  MomentumLevel,
  MomentumStats,
  MomentumChartData,
  VideoAnalysis,
  LeaderboardEntry,
} from '../types/momentum';

// ============================================================================
// CONSTANTS
// ============================================================================

const INITIAL_SCORE = 500;
const EQUILIBRIUM_POINT = 500;
const MIN_SCORE = 0;
const MAX_SCORE = 10000;
const TYPICAL_MIN = 100;
const TYPICAL_MAX = 1000;

const DAILY_DECAY_RATE = 0.02; // 2% per day
const ELASTICITY_RATE = 0.05; // 5% pull toward equilibrium
const STREAK_MULTIPLIER_BASE = 0.05; // 5% per day
const STREAK_MULTIPLIER_CAP = 2.0; // Max 2x multiplier

const SCORE_HISTORY_LIMIT = 30; // Keep last 30 days

// ============================================================================
// MOMENTUM LEVEL CALCULATION
// ============================================================================

/**
 * Convertit un score numérique en niveau visuel de momentum
 */
export function getMomentumLevel(score: number): MomentumLevel {
  if (score < 100) {
    return {
      level: 0,
      flames: '💀',
      label: 'Stagnant',
      color: '#8E8E93',
      message: 'Tes actions quotidiennes créent ton futur. Commence petit.',
    };
  } else if (score < 300) {
    return {
      level: 1,
      flames: '🔥',
      label: 'Building',
      color: '#FF9500',
      message: 'Momentum en construction. Continue tes efforts !',
    };
  } else if (score < 500) {
    return {
      level: 2,
      flames: '🔥🔥',
      label: 'Growing',
      color: '#FF9500',
      message: 'Bon momentum. Tes habitudes portent leurs fruits.',
    };
  } else if (score < 700) {
    return {
      level: 3,
      flames: '🔥🔥🔥',
      label: 'Strong',
      color: '#FF6B00',
      message: 'Excellent momentum ! Continue sur cette lancée.',
    };
  } else if (score < 900) {
    return {
      level: 4,
      flames: '🔥🔥🔥🔥',
      label: 'On Fire',
      color: '#FF3B30',
      message: 'Tu es en feu ! Momentum exceptionnel.',
    };
  } else {
    return {
      level: 5,
      flames: '🔥🔥🔥🔥🔥',
      label: 'Unstoppable',
      color: '#FF3B30',
      message: 'Momentum imbattable. Tu crées ta réalité.',
    };
  }
}

// ============================================================================
// SCORE CALCULATION ALGORITHM
// ============================================================================

/**
 * Calcule le multiplicateur de streak
 */
function getStreakMultiplier(streakDays: number): number {
  const multiplier = 1 + streakDays * STREAK_MULTIPLIER_BASE;
  return Math.min(multiplier, STREAK_MULTIPLIER_CAP);
}

/**
 * Calcule la pénalité de decay (jours sans vidéo)
 */
function calculateDecayPenalty(currentScore: number, daysSinceLastVideo: number): number {
  if (daysSinceLastVideo === 0) return 0;

  let decayedScore = currentScore;
  for (let i = 0; i < daysSinceLastVideo; i++) {
    decayedScore *= 1 - DAILY_DECAY_RATE;
  }

  return currentScore - decayedScore;
}

/**
 * Calcule l'ajustement d'élasticité (pull vers 500)
 */
function calculateElasticityAdjustment(currentScore: number): number {
  const distance = EQUILIBRIUM_POINT - currentScore;
  return distance * ELASTICITY_RATE;
}

/**
 * Applique les limites logarithmiques (difficulté exponentielle)
 */
function applyLogarithmicLimits(score: number, impact: number): number {
  // Au-dessus de 1000, chaque point est plus difficile
  if (score > TYPICAL_MAX && impact > 0) {
    const excessFactor = (score - TYPICAL_MAX) / 1000;
    const dampening = 1 / (1 + excessFactor);
    return impact * dampening;
  }

  // En-dessous de 100, chaque point est plus difficile à perdre
  if (score < TYPICAL_MIN && impact < 0) {
    const deficitFactor = (TYPICAL_MIN - score) / 100;
    const dampening = 1 / (1 + deficitFactor);
    return impact * dampening;
  }

  return impact;
}

/**
 * Calcule le nouveau score après analyse d'une vidéo
 *
 * Formula:
 * NewScore = CurrentScore + (VideoImpact × StreakMultiplier) - DecayPenalty + ElasticityAdjustment
 */
export function calculateNewScore(
  currentScore: number,
  videoImpact: number,
  streakDays: number,
  daysSinceLastVideo: number
): { newScore: number; breakdown: string } {
  // 1. Appliquer le decay si jours manqués
  const decayPenalty = calculateDecayPenalty(currentScore, daysSinceLastVideo);
  let workingScore = currentScore - decayPenalty;

  // 2. Calculer l'impact avec multiplicateur de streak
  const streakMultiplier = getStreakMultiplier(streakDays);
  let adjustedImpact = videoImpact * streakMultiplier;

  // 3. Appliquer les limites logarithmiques
  adjustedImpact = applyLogarithmicLimits(workingScore, adjustedImpact);

  // 4. Ajouter l'impact
  workingScore += adjustedImpact;

  // 5. Appliquer l'élasticité
  const elasticityAdjustment = calculateElasticityAdjustment(workingScore);
  workingScore += elasticityAdjustment;

  // 6. Contraindre dans les limites absolues
  const finalScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(workingScore)));

  // Breakdown pour debugging
  const breakdown = `
    Base: ${currentScore}
    - Decay (${daysSinceLastVideo}d): -${decayPenalty.toFixed(1)}
    + Impact (${videoImpact} × ${streakMultiplier.toFixed(2)}): +${adjustedImpact.toFixed(1)}
    + Elasticity: ${elasticityAdjustment > 0 ? '+' : ''}${elasticityAdjustment.toFixed(1)}
    = ${finalScore}
  `.trim();

  return { newScore: finalScore, breakdown };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Initialise le momentum score pour un nouvel utilisateur
 */
export async function initializeUserMomentum(userId: string): Promise<MomentumScore | null> {
  try {
    console.log('🎯 Initializing momentum for user:', userId);

    // Appeler la fonction SQL
    const { data, error } = await supabase.rpc('initialize_user_momentum', {
      p_user_id: userId,
    });

    if (error) {
      console.error('❌ Error initializing momentum:', error);
      return null;
    }

    // Récupérer le score créé
    const { data: momentum, error: fetchError } = await supabase
      .from('momentum_scores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching initialized momentum:', fetchError);
      return null;
    }

    console.log('✅ Momentum initialized successfully');
    return momentum as MomentumScore;
  } catch (error) {
    console.error('❌ Error in initializeUserMomentum:', error);
    return null;
  }
}

/**
 * Récupère le momentum score d'un utilisateur
 */
export async function getUserMomentum(userId: string): Promise<MomentumScore | null> {
  try {
    const { data, error } = await supabase
      .from('momentum_scores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Si pas de score, initialiser
      if (error.code === 'PGRST116') {
        console.log('ℹ️ No momentum found, initializing...');
        return await initializeUserMomentum(userId);
      }
      console.error('❌ Error fetching momentum:', error);
      return null;
    }

    return data as MomentumScore;
  } catch (error) {
    console.error('❌ Error in getUserMomentum:', error);
    return null;
  }
}

/**
 * Met à jour le momentum score après analyse d'une vidéo
 */
export async function updateMomentumScore(
  userId: string,
  videoAnalysis: VideoAnalysis
): Promise<MomentumScore | null> {
  try {
    console.log('📊 Updating momentum score for user:', userId);

    // 1. Récupérer le score actuel
    const currentMomentum = await getUserMomentum(userId);
    if (!currentMomentum) {
      console.error('❌ No momentum found for user');
      return null;
    }

    // 2. Calculer les jours depuis dernière vidéo
    const now = new Date();
    const lastVideoDate = currentMomentum.last_video_at
      ? new Date(currentMomentum.last_video_at)
      : new Date(currentMomentum.created_at);
    const daysSinceLastVideo = Math.floor(
      (now.getTime() - lastVideoDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 3. Calculer nouveau streak
    let newStreak = currentMomentum.streak_days;
    if (daysSinceLastVideo === 0) {
      // Même jour, ne pas incrémenter
      // (on garde le streak actuel)
    } else if (daysSinceLastVideo === 1) {
      // Jour suivant, incrémenter
      newStreak += 1;
    } else {
      // Streak cassé, reset à 1
      newStreak = 1;
    }

    // 4. Calculer nouveau score
    const { newScore, breakdown } = calculateNewScore(
      currentMomentum.score,
      videoAnalysis.momentum_impact,
      newStreak,
      daysSinceLastVideo
    );

    console.log('📈 Score calculation:', breakdown);

    // 5. Créer nouvelle entrée d'historique
    const historyEntry: ScoreHistoryEntry = {
      date: now.toISOString(),
      score: newScore,
      reason: `Video analysis: ${videoAnalysis.ai_summary.substring(0, 100)}`,
      impact: videoAnalysis.momentum_impact,
      streak: newStreak,
    };

    // 6. Mettre à jour l'historique (garder les 30 derniers jours)
    const scoreHistory = Array.isArray(currentMomentum.score_history)
      ? currentMomentum.score_history
      : [];
    const updatedHistory = [...scoreHistory, historyEntry].slice(-SCORE_HISTORY_LIMIT);

    // 7. Mettre à jour dans la base de données
    const { data, error } = await supabase
      .from('momentum_scores')
      .update({
        score: newScore,
        score_history: updatedHistory,
        streak_days: newStreak,
        longest_streak: Math.max(currentMomentum.longest_streak, newStreak),
        last_video_at: now.toISOString(),
        peak_score: Math.max(currentMomentum.peak_score, newScore),
        lowest_score: Math.min(currentMomentum.lowest_score, newScore),
        total_videos: currentMomentum.total_videos + 1,
        total_positive_days:
          videoAnalysis.momentum_impact > 0
            ? currentMomentum.total_positive_days + 1
            : currentMomentum.total_positive_days,
        total_negative_days:
          videoAnalysis.momentum_impact < 0
            ? currentMomentum.total_negative_days + 1
            : currentMomentum.total_negative_days,
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating momentum:', error);
      return null;
    }

    console.log('✅ Momentum updated successfully:', {
      previousScore: currentMomentum.score,
      newScore: newScore,
      change: newScore - currentMomentum.score,
      streak: newStreak,
    });

    return data as MomentumScore;
  } catch (error) {
    console.error('❌ Error in updateMomentumScore:', error);
    return null;
  }
}

/**
 * Récupère les statistiques complètes du momentum
 */
export async function getMomentumStats(userId: string): Promise<MomentumStats | null> {
  try {
    const momentum = await getUserMomentum(userId);
    if (!momentum) return null;

    // Calculer la moyenne du score
    const scoreHistory = Array.isArray(momentum.score_history) ? momentum.score_history : [];
    const averageScore =
      scoreHistory.length > 0
        ? Math.round(
            scoreHistory.reduce((sum, entry) => sum + entry.score, 0) / scoreHistory.length
          )
        : momentum.score;

    // Calculer le win rate
    const totalDays = momentum.total_positive_days + momentum.total_negative_days;
    const winRate =
      totalDays > 0 ? Math.round((momentum.total_positive_days / totalDays) * 100) : 0;

    // Calculer la tendance sur 7 derniers jours
    const last7Days = scoreHistory.slice(-7);
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendValue = 0;

    if (last7Days.length >= 2) {
      const firstScore = last7Days[0].score;
      const lastScore = last7Days[last7Days.length - 1].score;
      trendValue = lastScore - firstScore;

      if (trendValue > 20) trend = 'up';
      else if (trendValue < -20) trend = 'down';
      else trend = 'stable';
    }

    const stats: MomentumStats = {
      current_score: momentum.score,
      peak_score: momentum.peak_score,
      lowest_score: momentum.lowest_score,
      average_score: averageScore,
      total_videos: momentum.total_videos,
      current_streak: momentum.streak_days,
      longest_streak: momentum.longest_streak,
      total_positive_days: momentum.total_positive_days,
      total_negative_days: momentum.total_negative_days,
      win_rate: winRate,
      momentum_level: getMomentumLevel(momentum.score),
      trend_7_days: trend,
      trend_value: trendValue,
    };

    return stats;
  } catch (error) {
    console.error('❌ Error in getMomentumStats:', error);
    return null;
  }
}

/**
 * Récupère les données pour le graphique de momentum
 */
export async function getScoreHistory(
  userId: string,
  days: number = 7
): Promise<MomentumChartData[]> {
  try {
    const momentum = await getUserMomentum(userId);
    if (!momentum) return [];

    const scoreHistory = Array.isArray(momentum.score_history) ? momentum.score_history : [];

    // Prendre les N derniers jours
    const recentHistory = scoreHistory.slice(-days);

    return recentHistory.map((entry) => ({
      date: entry.date,
      score: entry.score,
      impact: entry.impact,
      streak: entry.streak,
    }));
  } catch (error) {
    console.error('❌ Error in getScoreHistory:', error);
    return [];
  }
}

/**
 * Récupère le leaderboard (top scores)
 */
export async function getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_momentum_leaderboard', {
      p_limit: limit,
    });

    if (error) {
      console.error('❌ Error fetching leaderboard:', error);
      return [];
    }

    return data as LeaderboardEntry[];
  } catch (error) {
    console.error('❌ Error in getLeaderboard:', error);
    return [];
  }
}

/**
 * Récupère le rang d'un utilisateur dans le leaderboard
 */
export async function getUserRank(userId: string): Promise<number | null> {
  try {
    const leaderboard = await getLeaderboard(1000); // Get top 1000
    const userEntry = leaderboard.find((entry) => entry.user_id === userId);
    return userEntry ? userEntry.rank : null;
  } catch (error) {
    console.error('❌ Error in getUserRank:', error);
    return null;
  }
}
