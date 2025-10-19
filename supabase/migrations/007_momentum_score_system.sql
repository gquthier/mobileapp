-- ============================================================================
-- Migration 007: Momentum Score System
-- Description: Crée les tables pour le système de gamification Momentum Score
-- Date: 2025-10-02
-- ============================================================================

-- ============================================================================
-- Table 1: momentum_scores
-- Description: Stocke le score principal et les métadonnées de momentum
-- ============================================================================

CREATE TABLE IF NOT EXISTS momentum_scores (
  -- Identifiants
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Score principal
  score INTEGER DEFAULT 500 NOT NULL,
  CHECK (score >= 0 AND score <= 10000), -- Hard limit technique

  -- Historique du score (JSON array)
  -- Format: [{"date": "ISO8601", "score": 650, "reason": "Video analysis...", "impact": 25, "streak": 7}]
  score_history JSONB DEFAULT '[]'::jsonb NOT NULL,

  -- Métriques de streak
  streak_days INTEGER DEFAULT 0 NOT NULL,
  CHECK (streak_days >= 0),
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  last_video_at TIMESTAMP WITH TIME ZONE,

  -- Records personnels
  peak_score INTEGER DEFAULT 500 NOT NULL,
  lowest_score INTEGER DEFAULT 500 NOT NULL,

  -- Statistiques
  total_videos INTEGER DEFAULT 0 NOT NULL,
  total_positive_days INTEGER DEFAULT 0 NOT NULL,
  total_negative_days INTEGER DEFAULT 0 NOT NULL,

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Contraintes
  UNIQUE(user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_momentum_scores_user_id ON momentum_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_momentum_scores_score ON momentum_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_momentum_scores_streak ON momentum_scores(streak_days DESC);

-- Commentaires pour documentation
COMMENT ON TABLE momentum_scores IS 'Stores the main Momentum Score and related metrics for gamification';
COMMENT ON COLUMN momentum_scores.score IS 'Main momentum score (100-1000 typical range, 0-10000 technical limit)';
COMMENT ON COLUMN momentum_scores.score_history IS 'JSON array of last 30 days score changes';
COMMENT ON COLUMN momentum_scores.streak_days IS 'Current consecutive days with video recording';
COMMENT ON COLUMN momentum_scores.peak_score IS 'Highest score ever achieved by user';

-- ============================================================================
-- Table 2: life_areas
-- Description: Domaines de vie trackés par l'utilisateur
-- ============================================================================

CREATE TABLE IF NOT EXISTS life_areas (
  -- Identifiants
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Identification du domaine
  area_key TEXT NOT NULL, -- 'career', 'relationships', 'health', 'finances', etc.
  CHECK (area_key ~ '^[a-z_]+$'), -- Lowercase letters and underscores only
  display_name TEXT NOT NULL, -- Nom personnalisé par l'utilisateur
  emoji TEXT, -- Emoji associé (optionnel)

  -- Score du domaine (0-100)
  score INTEGER DEFAULT 50 NOT NULL,
  CHECK (score >= 0 AND score <= 100),

  -- Historique (JSON array)
  -- Format: [{"date": "ISO8601", "score": 65, "change": +5}]
  score_history JSONB DEFAULT '[]'::jsonb NOT NULL,

  -- Configuration
  is_active BOOLEAN DEFAULT true NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0 NOT NULL, -- Importance relative (0.5 - 2.0)
  CHECK (weight >= 0.5 AND weight <= 2.0),

  -- Ordre d'affichage
  display_order INTEGER DEFAULT 0 NOT NULL,

  -- Statistiques
  total_positive_impacts INTEGER DEFAULT 0 NOT NULL,
  total_negative_impacts INTEGER DEFAULT 0 NOT NULL,
  best_score INTEGER DEFAULT 50 NOT NULL,
  worst_score INTEGER DEFAULT 50 NOT NULL,

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Contraintes
  UNIQUE(user_id, area_key)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_life_areas_user_id ON life_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_life_areas_active ON life_areas(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_life_areas_order ON life_areas(user_id, display_order);

-- Commentaires
COMMENT ON TABLE life_areas IS 'Life domains tracked by users (career, health, relationships, etc.)';
COMMENT ON COLUMN life_areas.area_key IS 'Unique identifier for the area type (snake_case)';
COMMENT ON COLUMN life_areas.display_name IS 'User-customized name for the area';
COMMENT ON COLUMN life_areas.weight IS 'Importance weight for calculating global momentum (0.5-2.0)';
COMMENT ON COLUMN life_areas.score IS 'Area-specific score (0-100)';

-- ============================================================================
-- Table 3: video_analysis
-- Description: Analyse IA de chaque vidéo pour le momentum
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_analysis (
  -- Identifiants
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Métriques principales de momentum
  momentum_impact INTEGER NOT NULL, -- Impact sur le score (-50 à +50)
  CHECK (momentum_impact >= -100 AND momentum_impact <= 100),

  energy_level INTEGER NOT NULL, -- Niveau d'énergie (1-10)
  CHECK (energy_level >= 1 AND energy_level <= 10),

  action_score INTEGER NOT NULL, -- Score d'actions concrètes (1-10)
  CHECK (action_score >= 1 AND action_score <= 10),

  clarity_score INTEGER NOT NULL, -- Clarté mentale (1-10)
  CHECK (clarity_score >= 1 AND clarity_score <= 10),

  -- Analyse temporelle
  future_focus_ratio DECIMAL(3,2) DEFAULT 0.0 NOT NULL, -- Ratio focus futur (0-1)
  CHECK (future_focus_ratio >= 0.0 AND future_focus_ratio <= 1.0),

  present_focus_ratio DECIMAL(3,2) DEFAULT 0.0 NOT NULL, -- Ratio focus présent (0-1)
  CHECK (present_focus_ratio >= 0.0 AND present_focus_ratio <= 1.0),

  -- Impact sur les domaines de vie (JSON object)
  -- Format: {"career": +10, "health": -5, "relationships": +3}
  life_areas_impact JSONB DEFAULT '{}'::jsonb NOT NULL,

  -- Insights et patterns IA
  ai_summary TEXT NOT NULL, -- Résumé court (50 mots max)

  -- Patterns détectés (JSON array)
  -- Format: ["Pattern 1", "Pattern 2", ...]
  key_patterns JSONB DEFAULT '[]'::jsonb NOT NULL,

  -- Actions suggérées (JSON array)
  -- Format: ["Action 1", "Action 2", "Action 3"]
  suggested_actions JSONB DEFAULT '[]'::jsonb NOT NULL,

  -- Métadonnées de processing
  processing_model TEXT DEFAULT 'gpt-4-turbo-preview' NOT NULL,
  processing_duration_ms INTEGER, -- Temps de processing en ms

  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Contraintes
  UNIQUE(video_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_video_analysis_user_id ON video_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_video_id ON video_analysis(video_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_processed_at ON video_analysis(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_analysis_momentum_impact ON video_analysis(momentum_impact DESC);

-- Commentaires
COMMENT ON TABLE video_analysis IS 'AI analysis results for each video to calculate momentum impact';
COMMENT ON COLUMN video_analysis.momentum_impact IS 'Calculated impact on momentum score (-50 to +50 typical)';
COMMENT ON COLUMN video_analysis.life_areas_impact IS 'JSON object with impact per life area';
COMMENT ON COLUMN video_analysis.key_patterns IS 'Behavioral patterns detected by AI';
COMMENT ON COLUMN video_analysis.suggested_actions IS 'Concrete actions suggested for next day';

-- ============================================================================
-- Triggers pour updated_at automatique
-- ============================================================================

-- Function pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour momentum_scores
DROP TRIGGER IF EXISTS update_momentum_scores_updated_at ON momentum_scores;
CREATE TRIGGER update_momentum_scores_updated_at
  BEFORE UPDATE ON momentum_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour life_areas
DROP TRIGGER IF EXISTS update_life_areas_updated_at ON life_areas;
CREATE TRIGGER update_life_areas_updated_at
  BEFORE UPDATE ON life_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE momentum_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analysis ENABLE ROW LEVEL SECURITY;

-- Policies pour momentum_scores
CREATE POLICY "Users can view their own momentum score"
  ON momentum_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own momentum score"
  ON momentum_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own momentum score"
  ON momentum_scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies pour life_areas
CREATE POLICY "Users can view their own life areas"
  ON life_areas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own life areas"
  ON life_areas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own life areas"
  ON life_areas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own life areas"
  ON life_areas FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour video_analysis
CREATE POLICY "Users can view their own video analysis"
  ON video_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert video analysis"
  ON video_analysis FOR INSERT
  WITH CHECK (true); -- Edge Functions utilisent service role

CREATE POLICY "Users can view their video analysis"
  ON video_analysis FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Données de référence: Life Areas disponibles
-- ============================================================================

-- Table de référence pour les types de life areas disponibles
CREATE TABLE IF NOT EXISTS life_area_templates (
  area_key TEXT PRIMARY KEY,
  default_name_en TEXT NOT NULL,
  default_name_fr TEXT NOT NULL,
  default_emoji TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'personal', 'professional', 'health', 'social'
  is_recommended BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- Commentaire
COMMENT ON TABLE life_area_templates IS 'Available life area templates that users can choose from';

-- Insérer les templates de base
INSERT INTO life_area_templates (area_key, default_name_en, default_name_fr, default_emoji, description, category, display_order) VALUES
  ('career', 'Career', 'Carrière', '💼', 'Professional development and work', 'professional', 1),
  ('relationships', 'Relationships', 'Relations', '❤️', 'Family, friends, and romantic relationships', 'social', 2),
  ('health', 'Health', 'Santé', '💪', 'Physical fitness and wellbeing', 'health', 3),
  ('finances', 'Finances', 'Finances', '💰', 'Money, savings, and financial goals', 'personal', 4),
  ('personal_growth', 'Personal Growth', 'Développement Personnel', '🌱', 'Learning, skills, and self-improvement', 'personal', 5),
  ('creativity', 'Creativity', 'Créativité', '🎨', 'Creative projects and artistic expression', 'personal', 6),
  ('spirituality', 'Spirituality', 'Spiritualité', '🙏', 'Spiritual practice and inner peace', 'personal', 7),
  ('adventure', 'Adventure', 'Aventure', '🗺️', 'Travel, exploration, and new experiences', 'personal', 8),
  ('contribution', 'Contribution', 'Contribution', '🤝', 'Helping others and making an impact', 'social', 9),
  ('fun', 'Fun & Recreation', 'Loisirs', '🎉', 'Entertainment, hobbies, and leisure', 'personal', 10)
ON CONFLICT (area_key) DO NOTHING;

-- ============================================================================
-- Fonctions utilitaires
-- ============================================================================

-- Fonction pour initialiser le momentum score d'un nouvel utilisateur
CREATE OR REPLACE FUNCTION initialize_user_momentum(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_momentum_id UUID;
BEGIN
  -- Créer le score initial
  INSERT INTO momentum_scores (user_id, score, score_history)
  VALUES (
    p_user_id,
    500,
    jsonb_build_array(
      jsonb_build_object(
        'date', NOW(),
        'score', 500,
        'reason', 'Account created',
        'impact', 0,
        'streak', 0
      )
    )
  )
  RETURNING id INTO v_momentum_id;

  RETURN v_momentum_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION initialize_user_momentum IS 'Initialize momentum score for a new user (called during onboarding)';

-- Fonction pour obtenir le leaderboard (top scores)
CREATE OR REPLACE FUNCTION get_momentum_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  user_id UUID,
  score INTEGER,
  streak_days INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.user_id,
    ms.score,
    ms.streak_days,
    ROW_NUMBER() OVER (ORDER BY ms.score DESC, ms.streak_days DESC) as rank
  FROM momentum_scores ms
  ORDER BY ms.score DESC, ms.streak_days DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION get_momentum_leaderboard IS 'Get top momentum scores with rankings';

-- ============================================================================
-- Vérification finale
-- ============================================================================

-- Vérifier que toutes les tables sont créées
DO $$
DECLARE
  v_tables TEXT[];
  v_table TEXT;
BEGIN
  v_tables := ARRAY['momentum_scores', 'life_areas', 'video_analysis', 'life_area_templates'];

  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF NOT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = v_table
    ) THEN
      RAISE EXCEPTION 'Table % was not created successfully', v_table;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Migration 007 completed successfully - All tables created';
END $$;
