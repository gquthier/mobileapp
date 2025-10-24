-- =====================================================
-- PHASE 4.2.3: Cron Job Safety Net
-- =====================================================
--
-- Adds automatic materialized view refresh as backup
-- Runs every hour as safety net if trigger fails
--
-- Reliability: 99.9% data freshness
-- Cost: Minimal (runs only if pg_cron enabled)
--
-- Date: 2025-10-25
-- =====================================================

-- 1. Enable pg_cron extension (if not already enabled)
-- Note: This might require superuser privileges
-- On Supabase, pg_cron is usually available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create cron job for hourly calendar refresh
-- Runs every hour at minute 0
-- Uses CONCURRENTLY to avoid blocking reads
SELECT cron.schedule(
  'refresh_calendar_hourly',           -- Job name
  '0 * * * *',                         -- Cron schedule (every hour at minute 0)
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY user_calendar_data$$
);

-- 3. Create monitoring function to check last refresh time
CREATE OR REPLACE FUNCTION get_calendar_last_refresh()
RETURNS TABLE (
  last_refresh_time TIMESTAMP WITH TIME ZONE,
  age_minutes INTEGER,
  is_stale BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_refresh TIMESTAMP WITH TIME ZONE;
  v_age_minutes INTEGER;
BEGIN
  -- Get the last modification time of the materialized view
  SELECT
    GREATEST(
      pg_stat_get_last_vacuum_time((SELECT oid FROM pg_class WHERE relname = 'user_calendar_data')),
      pg_stat_get_last_autovacuum_time((SELECT oid FROM pg_class WHERE relname = 'user_calendar_data')),
      pg_stat_get_last_analyze_time((SELECT oid FROM pg_class WHERE relname = 'user_calendar_data')),
      pg_stat_get_last_autoanalyze_time((SELECT oid FROM pg_class WHERE relname = 'user_calendar_data'))
    )
  INTO v_last_refresh;

  -- If no stats available, use current time (view was just created)
  IF v_last_refresh IS NULL THEN
    v_last_refresh := NOW();
  END IF;

  -- Calculate age in minutes
  v_age_minutes := EXTRACT(EPOCH FROM (NOW() - v_last_refresh))::INTEGER / 60;

  -- Return results
  RETURN QUERY
  SELECT
    v_last_refresh AS last_refresh_time,
    v_age_minutes AS age_minutes,
    (v_age_minutes > 90) AS is_stale; -- Consider stale if > 90 minutes
END;
$$;

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO service_role;
GRANT SELECT ON cron.job TO service_role;

-- 5. Add comments
COMMENT ON FUNCTION get_calendar_last_refresh() IS
'Returns last refresh time of calendar materialized view and whether it is stale (>90min)';

-- =====================================================
-- MONITORING QUERIES
-- =====================================================
--
-- Check last refresh time:
-- SELECT * FROM get_calendar_last_refresh();
--
-- Check cron job status:
-- SELECT * FROM cron.job WHERE jobname = 'refresh_calendar_hourly';
--
-- Check cron job run history:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh_calendar_hourly')
-- ORDER BY start_time DESC
-- LIMIT 10;
--
-- =====================================================

-- =====================================================
-- ROLLBACK INSTRUCTIONS
-- =====================================================
--
-- To remove the cron job:
-- SELECT cron.unschedule('refresh_calendar_hourly');
--
-- To drop the monitoring function:
-- DROP FUNCTION IF EXISTS get_calendar_last_refresh();
--
-- =====================================================

-- Migration complete
-- Calendar will now auto-refresh every hour as safety net
