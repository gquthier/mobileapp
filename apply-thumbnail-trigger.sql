-- Direct SQL to apply the thumbnail trigger
-- Run this directly in your Supabase SQL editor

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create function to call thumbnail generation edge function
CREATE OR REPLACE FUNCTION generate_video_thumbnail()
RETURNS TRIGGER AS $$
DECLARE
    edge_function_url TEXT;
    response_data TEXT;
BEGIN
    -- Only process if this is a new video with a file_path but no thumbnail_path
    IF TG_OP = 'INSERT' AND NEW.file_path IS NOT NULL AND NEW.thumbnail_path IS NULL THEN
        -- Get the edge function URL
        edge_function_url := 'https://eenyzudwktcjpefpoapi.supabase.co/functions/v1/generate-thumbnail';

        -- Call the edge function asynchronously
        -- This will run in the background without blocking the insert
        PERFORM
            net.http_post(
                url := edge_function_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
                ),
                body := jsonb_build_object(
                    'video_id', NEW.id::text,
                    'file_path', NEW.file_path
                )::text
            );

        -- Log the thumbnail generation request
        RAISE NOTICE 'Thumbnail generation requested for video: % (path: %)', NEW.id, NEW.file_path;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_generate_thumbnail ON videos;

-- Create trigger that fires after video insert
CREATE TRIGGER trigger_generate_thumbnail
    AFTER INSERT ON videos
    FOR EACH ROW
    EXECUTE FUNCTION generate_video_thumbnail();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO service_role;
GRANT EXECUTE ON FUNCTION net.http_post TO service_role;

-- Verify the trigger was created
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_generate_thumbnail';