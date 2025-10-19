-- Migration 009b: VACUUM for Full-Text Search Tables
-- Purpose: Update statistics for query planner after adding FTS indexes
--
-- IMPORTANT: This file must be executed SEPARATELY from 009_fulltext_search_optimization.sql
-- VACUUM cannot run inside a transaction block, so it needs its own execution.
--
-- Execute this AFTER 009_fulltext_search_optimization.sql has completed successfully.

-- Update statistics for videos table
VACUUM ANALYZE videos;

-- Update statistics for transcription_jobs table
VACUUM ANALYZE transcription_jobs;

-- Verification: Check last analyze time
SELECT
  schemaname,
  tablename,
  last_vacuum,
  last_analyze,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE tablename IN ('videos', 'transcription_jobs');

-- Expected: last_analyze should show recent timestamp (within last minute)
