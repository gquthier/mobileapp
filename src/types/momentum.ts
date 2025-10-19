// ============================================================================
// Types TypeScript pour le système Momentum Score
// ============================================================================

/**
 * Score principal de momentum d'un utilisateur
 */
export interface MomentumScore {
  id: string;
  user_id: string;
  score: number; // 100-1000 typical, 0-10000 technical limit
  score_history: ScoreHistoryEntry[];
  streak_days: number;
  longest_streak: number;
  last_video_at?: string; // ISO timestamp
  peak_score: number;
  lowest_score: number;
  total_videos: number;
  total_positive_days: number;
  total_negative_days: number;
  created_at: string;
  updated_at: string;
}

/**
 * Entrée dans l'historique de score
 */
export interface ScoreHistoryEntry {
  date: string; // ISO timestamp
  score: number;
  reason: string;
  impact: number;
  streak: number;
}

/**
 * Domaine de vie tracké par l'utilisateur
 */
export interface LifeArea {
  id: string;
  user_id: string;
  area_key: string; // 'career', 'relationships', 'health', etc.
  display_name: string;
  emoji?: string;
  score: number; // 0-100
  score_history: LifeAreaHistoryEntry[];
  is_active: boolean;
  weight: number; // 0.5 - 2.0
  display_order: number;
  total_positive_impacts: number;
  total_negative_impacts: number;
  best_score: number;
  worst_score: number;
  created_at: string;
  updated_at: string;
}

/**
 * Entrée dans l'historique d'un life area
 */
export interface LifeAreaHistoryEntry {
  date: string; // ISO timestamp
  score: number;
  change: number;
}

/**
 * Template de life area disponible
 */
export interface LifeAreaTemplate {
  area_key: string;
  default_name_en: string;
  default_name_fr: string;
  default_emoji: string;
  description?: string;
  category: 'personal' | 'professional' | 'health' | 'social';
  is_recommended: boolean;
  display_order: number;
}

/**
 * Analyse IA d'une vidéo
 */
export interface VideoAnalysis {
  id: string;
  video_id: string;
  user_id: string;

  // Métriques principales
  momentum_impact: number; // -50 to +50
  energy_level: number; // 1-10
  action_score: number; // 1-10
  clarity_score: number; // 1-10

  // Analyse temporelle
  future_focus_ratio: number; // 0-1
  present_focus_ratio: number; // 0-1

  // Impact par life area
  life_areas_impact: Record<string, number>; // { "career": +10, "health": -5 }

  // Insights IA
  ai_summary: string;
  key_patterns: string[];
  suggested_actions: string[];

  // Métadonnées
  processing_model: string;
  processing_duration_ms?: number;
  processed_at: string;
}

/**
 * Niveau visuel du momentum
 */
export interface MomentumLevel {
  level: number; // 0-5
  flames: string; // Emoji flames
  label: string; // "Building", "On Fire", etc.
  color: string; // Hex color
  message: string; // Motivational message
}

/**
 * Statistiques du momentum
 */
export interface MomentumStats {
  current_score: number;
  peak_score: number;
  lowest_score: number;
  average_score: number;
  total_videos: number;
  current_streak: number;
  longest_streak: number;
  total_positive_days: number;
  total_negative_days: number;
  win_rate: number; // % of positive days
  momentum_level: MomentumLevel;
  trend_7_days: 'up' | 'down' | 'stable'; // Tendance 7 derniers jours
  trend_value: number; // Variation en points
}

/**
 * Données pour le graphique de momentum
 */
export interface MomentumChartData {
  date: string;
  score: number;
  impact: number;
  streak: number;
}

/**
 * Payload pour l'analyse de momentum (envoyé à l'Edge Function)
 */
export interface MomentumAnalysisPayload {
  video_id: string;
  user_id: string;
  transcription: string;
  life_areas: string[]; // area_keys
}

/**
 * Résultat de l'analyse de momentum (retourné par l'Edge Function)
 */
export interface MomentumAnalysisResult {
  success: boolean;
  analysis: VideoAnalysis;
  new_momentum_score: number;
  previous_score: number;
  score_change: number;
  new_streak: number;
  momentum_level: MomentumLevel;
  life_areas_updated: Record<string, number>; // Updated scores per area
  error?: string;
}

/**
 * Configuration pour initialiser le momentum d'un user
 */
export interface MomentumInitConfig {
  user_id: string;
  initial_score?: number; // Default 500
  selected_life_areas: {
    area_key: string;
    display_name?: string; // Custom name
    emoji?: string;
  }[];
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  user_id: string;
  score: number;
  streak_days: number;
  rank: number;
  // Optional user info (if joined with profiles)
  username?: string;
  avatar_url?: string;
}

/**
 * Momentum insights (daily, weekly, monthly)
 */
export interface MomentumInsight {
  type: 'daily' | 'weekly' | 'monthly';
  period: string; // "2025-01-15" or "2025-W03" or "2025-01"
  summary: string;
  key_wins: string[];
  areas_to_improve: string[];
  suggested_focus: string;
  momentum_trend: 'improving' | 'declining' | 'stable';
}
