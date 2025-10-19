# Setup Guide: Profile Pictures (Avatars)

This guide explains how to set up the profile picture feature for your app.

## Features

✅ **Large profile picture** displayed at the top of Settings screen
✅ **Editable name** - Tap to change your first name
✅ **Photo upload** - Choose from gallery with cropping
✅ **Supabase Storage** - Images stored in 'avatars' bucket
✅ **RLS Security** - Users can only edit their own photos

## Setup Instructions

### 1. Apply Database Migration

Run the SQL migration to create the 'avatars' storage bucket:

```bash
# Option A: Using Supabase CLI (recommended)
cd supabase
supabase db push

# Option B: Run SQL manually in Supabase Dashboard
# 1. Go to SQL Editor in your Supabase Dashboard
# 2. Copy contents of supabase/migrations/014_create_avatars_bucket.sql
# 3. Execute the SQL
```

### 2. Verify Bucket Creation

Check that the bucket was created successfully:

1. Go to Supabase Dashboard → Storage
2. You should see a new bucket called **'avatars'**
3. The bucket should be marked as **PUBLIC**

### 3. Test the Feature

1. Open the app and navigate to **Settings** tab
2. You should see a large circular profile picture placeholder
3. **Tap the photo** to upload from gallery
4. **Tap your name** to edit your first name

## Technical Details

### Storage Structure

```
avatars/
  └── {user_id}_{timestamp}.jpg
      Example: f4d08915-372f-45fa-9fd2-28da94149398_1697123456789.jpg
```

**Note**: We use underscore (`_`) as separator to avoid conflicts with UUID hyphens.

### Security Policies

The migration creates 4 RLS policies:

1. **Upload**: Users can upload files starting with their user_id
2. **Update**: Users can update their own files
3. **Delete**: Users can delete their own files
4. **Read**: Public read access (anyone can view avatars)

### File Naming Convention

Photos are named: `{user_id}_{timestamp}.{ext}`

Example: `f4d08915-372f-45fa-9fd2-28da94149398_1697123456789.jpg`

**Why underscore?** UUIDs already contain hyphens, so we use underscore to avoid parsing conflicts in RLS policies.

## Troubleshooting

### Issue: "Upload failed" error

**Solution**: Make sure the migration was applied correctly. Check that the 'avatars' bucket exists in Supabase Storage.

### Issue: "new row violates row-level security policy" when uploading

**Solution**: This means the RLS policies need to be updated. Run migration 015:

```bash
cd supabase
supabase db push
```

Or manually run the SQL from `supabase/migrations/015_fix_avatars_policies.sql`

This updates the policies to use underscore separator (`_`) instead of hyphen (`-`) to avoid conflicts with UUID hyphens.

### Issue: Permission denied when uploading

**Solution**: Verify that the RLS policies were created. Run this query in SQL Editor:

```sql
SELECT * FROM storage.policies WHERE bucket_id = 'avatars';
```

You should see 4 policies.

### Issue: Photo not displaying after upload

**Solution**:
1. Check that the bucket is PUBLIC
2. Verify the avatar_url was saved in the profiles table:

```sql
SELECT id, email, avatar_url FROM profiles WHERE id = 'your-user-id';
```

## Next Steps

- ✅ Profile picture feature is ready to use
- Consider adding image compression for large files
- Add option to remove profile picture
- Add option to take photo with camera (not just gallery)

## Code References

- **UI Component**: `src/screens/SettingsScreen.tsx` (lines 111-160: ProfileHeader)
- **Upload Logic**: `src/screens/SettingsScreen.tsx` (lines 320-400: handlePhotoPress)
- **Database Migrations**:
  - `supabase/migrations/014_create_avatars_bucket.sql` (initial setup)
  - `supabase/migrations/015_fix_avatars_policies.sql` (RLS policy fix)
- **Profile Type**: `src/lib/supabase.ts` (line 37: avatar_url field)
