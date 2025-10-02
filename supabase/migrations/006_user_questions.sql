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
CREATE INDEX idx_user_questions_user_id ON user_questions(user_id);
CREATE INDEX idx_user_questions_is_used ON user_questions(user_id, is_used);
CREATE INDEX idx_user_questions_batch ON user_questions(user_id, batch_number, order_index);

-- Enable Row Level Security
ALTER TABLE user_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own questions
CREATE POLICY "Users can view own questions"
  ON user_questions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own questions (via service role usually)
CREATE POLICY "Users can insert own questions"
  ON user_questions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own questions (marking as used)
CREATE POLICY "Users can update own questions"
  ON user_questions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own questions
CREATE POLICY "Users can delete own questions"
  ON user_questions
  FOR DELETE
  USING (auth.uid() = user_id);

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

COMMENT ON TABLE user_questions IS 'Stores AI-generated personalized questions for users, organized in batches of 50';
COMMENT ON COLUMN user_questions.batch_number IS 'Batch number (group of 50 questions)';
COMMENT ON COLUMN user_questions.order_index IS 'Order within the batch (0-49)';
COMMENT ON COLUMN user_questions.is_used IS 'True when user has skipped/used this question';
