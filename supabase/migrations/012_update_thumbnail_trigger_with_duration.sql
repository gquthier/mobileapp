-- =====================================================
-- Migration: Update thumbnail trigger to send duration
-- Phase 4.1 - Fix blurhash generation
-- Date: 2025-10-25
-- =====================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_generate_thumbnail ON videos;
DROP FUNCTION IF EXISTS generate_video_thumbnail();

-- Recreate function with duration parameter
CREATE OR REPLACE FUNCTION generate_video_thumbnail()
RETURNS TRIGGER AS $$
DECLARE
    edge_function_url TEXT;
    response_data TEXT;
BEGIN
    -- Only process if this is a new video with a file_path but no thumbnail_path
    IF TG_OP = 'INSERT' AND NEW.file_path IS NOT NULL AND NEW.thumbnail_path IS NULL THEN
        -- Get the edge function URL from environment or set default
        edge_function_url := 'https://eenyzudwktcjpefpoapi.supabase.co/functions/v1/generate-thumbnail';

        -- Call the edge function asynchronously
        -- Note: In production, you might want to use a job queue for better reliability
        PERFORM
            net.http_post(
                url := edge_function_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
                ),
                body := jsonb_build_object(
                    'video_id', NEW.id::text,
                    'file_path', NEW.file_path,
                    'duration', COALESCE(NEW.duration, 0)
                )::text
            );

        -- Log the thumbnail generation request
        RAISE NOTICE 'Thumbnail generation requested for video: % (path: %, duration: %s)',
            NEW.id, NEW.file_path, COALESCE(NEW.duration, 0);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger that fires after video insert
CREATE TRIGGER trigger_generate_thumbnail
    AFTER INSERT ON videos
    FOR EACH ROW
    EXECUTE FUNCTION generate_video_thumbnail();

-- Comment for documentation
COMMENT ON FUNCTION generate_video_thumbnail() IS
'Automatically generates thumbnails AND blurhash for newly uploaded videos by calling the generate-thumbnail edge function';
COMMENT ON TRIGGER trigger_generate_thumbnail ON videos IS
'Triggers thumbnail + blurhash generation when a new video is inserted';
