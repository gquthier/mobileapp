-- ============================================================================
-- Migration: Fix Avatars Bucket RLS Policies
-- Description: Updates policies to use underscore separator instead of hyphen
-- Date: 2025-10-16
-- Issue: UUID contains hyphens, so split_part(name, '-', 1) doesn't work
-- Solution: Use underscore separator in filename: {user_id}_{timestamp}.{ext}
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;

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
-- - This migration fixes the RLS policies to work with UUID hyphens
-- - File naming convention: {user_id}_{timestamp}.{ext}
-- - Underscore separator avoids conflicts with UUID hyphens
-- ============================================================================
