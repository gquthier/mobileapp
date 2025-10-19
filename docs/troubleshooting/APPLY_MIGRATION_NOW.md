# 🚨 APPLIQUER LA MIGRATION USER_QUESTIONS

## Étapes à suivre MAINTENANT :

### 1. Ouvrir le SQL Editor Supabase

Cliquez sur ce lien : **https://supabase.com/dashboard/project/eenyzudwktcjpefpoapi/editor**

### 2. Créer une nouvelle requête

- Cliquez sur "+ New query" en haut à gauche

### 3. Copier-coller le SQL suivant

```sql
-- Migration: User Questions System
-- Description: Table pour stocker les questions personnalisées générées par IA pour chaque utilisateur

-- Create user_questions table
CREATE TABLE IF NOT EXISTS user_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  batch_number INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique order within batch for each user
  CONSTRAINT unique_user_batch_order UNIQUE (user_id, batch_number, order_index)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_questions_user_id ON user_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_questions_is_used ON user_questions(user_id, is_used);
CREATE INDEX IF NOT EXISTS idx_user_questions_batch ON user_questions(user_id, batch_number, order_index);

-- Enable Row Level Security
ALTER TABLE user_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_questions' AND policyname = 'Users can view own questions'
  ) THEN
    CREATE POLICY "Users can view own questions"
      ON user_questions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can insert their own questions (via service role usually)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_questions' AND policyname = 'Users can insert own questions'
  ) THEN
    CREATE POLICY "Users can insert own questions"
      ON user_questions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update their own questions (marking as used)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_questions' AND policyname = 'Users can update own questions'
  ) THEN
    CREATE POLICY "Users can update own questions"
      ON user_questions
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can delete their own questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_questions' AND policyname = 'Users can delete own questions'
  ) THEN
    CREATE POLICY "Users can delete own questions"
      ON user_questions
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Function to get current batch number for user
CREATE OR REPLACE FUNCTION get_user_current_batch(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(batch_number), 0)
  FROM user_questions
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Function to count unused questions for user
CREATE OR REPLACE FUNCTION count_unused_questions(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM user_questions
  WHERE user_id = p_user_id AND is_used = false;
$$ LANGUAGE SQL STABLE;

-- Comments
COMMENT ON TABLE user_questions IS 'Stores AI-generated personalized questions for users, organized in batches of 50';
COMMENT ON COLUMN user_questions.batch_number IS 'Batch number (group of 50 questions)';
COMMENT ON COLUMN user_questions.order_index IS 'Order within the batch (0-49)';
COMMENT ON COLUMN user_questions.is_used IS 'True when user has skipped/used this question';
```

### 4. Exécuter la requête

- Cliquez sur le bouton "Run" (ou utilisez Cmd+Enter / Ctrl+Enter)
- Attendez la confirmation "Success"

### 5. Vérifier que ça fonctionne

Dans le SQL Editor, exécutez cette requête de test :

```sql
SELECT * FROM user_questions LIMIT 1;
```

Si vous obtenez un résultat vide (0 rows) au lieu d'une erreur → **C'EST BON !** ✅

### 6. Redémarrer l'app

Une fois la migration appliquée, redémarrez votre app React Native. Le système de questions devrait maintenant fonctionner !

---

## Alternative : Utiliser la console psql

Si vous avez psql installé sur votre machine :

```bash
PGPASSWORD="Samuelgabriel92" psql \
  -h aws-0-eu-central-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.eenyzudwktcjpefpoapi \
  -d postgres \
  -f supabase/migrations/006_user_questions.sql
```

---

## 🎯 Après la migration

L'app devrait automatiquement :
1. ✅ Créer la table user_questions
2. ✅ Activer le RLS
3. ✅ Générer automatiquement les 50 premières questions au premier lancement
4. ✅ Afficher les questions personnalisées dans RecordScreen

**Prêt à appliquer ? GO !** 🚀
