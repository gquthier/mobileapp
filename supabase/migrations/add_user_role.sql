-- Migration: Add user role column to profiles table
-- Date: 2025-01-22
-- Description: Add role column to distinguish between regular users and admins

-- Step 1: Add role column with default value 'user'
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Step 2: Add comment for documentation
COMMENT ON COLUMN profiles.role IS 'User role: user (default) or admin (for admin features like reset onboarding)';

-- Step 3: Create index for faster role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Step 4: Update existing rows to have 'user' role if null
UPDATE profiles
SET role = 'user'
WHERE role IS NULL;

-- Step 5: Make role column NOT NULL after setting defaults
ALTER TABLE profiles
ALTER COLUMN role SET NOT NULL;

-- Step 6: Grant appropriate permissions (if using RLS)
-- Users can read their own role
-- Only admins can update roles (handled in application logic)

-- Optional: Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a function to promote user to admin (for manual promotion)
CREATE OR REPLACE FUNCTION promote_to_admin(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if current user is admin (you can add this check)
  UPDATE profiles
  SET role = 'admin', updated_at = NOW()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a function to demote admin to user
CREATE OR REPLACE FUNCTION demote_to_user(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET role = 'user', updated_at = NOW()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_to_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION demote_to_user(UUID) TO authenticated;
