-- ============================================================================
-- Migration: Create Avatars Bucket for Profile Pictures
-- Description: Creates a storage bucket for user profile pictures (avatars)
-- Date: 2025-10-16
-- ============================================================================

-- Create 'avatars' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the avatars bucket

-- Policy 1: Allow users to upload their own avatar
-- Users can INSERT files with names that start with their user ID
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = split_part(name, '_', 1)
);

-- Policy 2: Allow users to update their own avatar
-- Users can UPDATE files with names that start with their user ID
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = split_part(name, '_', 1)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = split_part(name, '_', 1)
);

-- Policy 3: Allow users to delete their own avatar
-- Users can DELETE files with names that start with their user ID
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = split_part(name, '_', 1)
);

-- Policy 4: Allow public read access to all avatars
-- Anyone can SELECT (read) avatar files
CREATE POLICY "Public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================================================
-- Notes:
-- - Bucket is PUBLIC for easy viewing of profile pictures
-- - RLS policies ensure users can only upload/update/delete their own avatars
-- - File naming convention: {user_id}_{timestamp}.{ext}
-- - Underscore separator used to avoid conflicts with UUID hyphens
-- - This allows the policies to validate ownership based on filename
-- ============================================================================
