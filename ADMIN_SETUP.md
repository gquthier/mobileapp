# 🔧 Admin Setup Guide - Personal Life Recorder

## Overview

This guide explains how to set up admin users and use admin-only features like **Reset Onboarding**.

---

## 🎯 Features

### Admin-Only Features

1. **Reset Onboarding** (Settings → Developer → Reset Onboarding)
   - Clears all onboarding flags from AsyncStorage
   - Restarts the entire onboarding flow
   - Signs out the user to trigger the flow
   - Useful for testing and demoing the app

---

## 📋 Setup Instructions

### Step 1: Run the Database Migration

Execute the SQL migration to add the `role` column to the `profiles` table:

```bash
# Navigate to your Supabase dashboard
# Go to: SQL Editor → New Query
# Copy and paste the content from: supabase/migrations/add_user_role.sql
# Click "Run" to execute the migration
```

**What the migration does:**
- ✅ Adds `role` column (TEXT, default: 'user')
- ✅ Adds CHECK constraint (role IN ('user', 'admin'))
- ✅ Creates index on `role` for performance
- ✅ Sets all existing users to 'user' role
- ✅ Creates helper functions: `is_admin()`, `promote_to_admin()`, `demote_to_user()`

### Step 2: Promote a User to Admin

#### Option A: Using Supabase Dashboard

1. Go to **Supabase Dashboard** → **Table Editor** → **profiles**
2. Find the user you want to promote
3. Click on their row
4. Change `role` from `'user'` to `'admin'`
5. Click **Save**

#### Option B: Using SQL Function

```sql
-- Promote user to admin by their ID
SELECT promote_to_admin('USER_ID_HERE');

-- Example:
SELECT promote_to_admin('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
```

#### Option C: Using SQL UPDATE

```sql
-- Promote user to admin by email
UPDATE profiles
SET role = 'admin', updated_at = NOW()
WHERE email = 'admin@example.com';
```

### Step 3: Verify Admin Access

1. **Sign out** from the app
2. **Sign in** with the admin account
3. Go to **Settings**
4. You should see a new section: **🔧 Developer**
5. Inside, you'll find: **Reset Onboarding**

---

## 🧪 Testing Reset Onboarding

### How It Works

1. User clicks **Reset Onboarding** in Settings
2. Confirmation alert appears
3. On confirm:
   - All onboarding flags in AsyncStorage are deleted
   - Success alert shown
   - User is signed out
4. On next sign-in, the full onboarding flow starts again

### What Gets Reset

```typescript
// AsyncStorage keys that are cleared:
- @onboarding_welcome_flow_completed
- @first_time_user
- @onboarding_chapter_created
- @onboarding_videos_imported
- @onboarding_guided_tour_completed
- @onboarding_first_recording_completed
```

### Test Procedure

1. Sign in as admin user
2. Navigate to **Settings → Developer → Reset Onboarding**
3. Click on **Reset Onboarding**
4. Confirm the action
5. Wait for sign-out
6. Sign in again
7. **Expected:** You should see the WelcomeFlow onboarding screens

---

## 📁 Files Added/Modified

### New Files

1. **`src/services/onboardingService.ts`**
   - Service to manage onboarding flags in AsyncStorage
   - Methods: `hasCompletedWelcomeFlow()`, `markWelcomeFlowCompleted()`, `resetOnboarding()`, etc.

2. **`src/hooks/useUserRole.ts`**
   - Hook to check if current user is admin
   - Returns: `{ isAdmin, role, loading, refetch }`

3. **`supabase/migrations/add_user_role.sql`**
   - SQL migration to add role column
   - Helper functions for role management

4. **`ADMIN_SETUP.md`** (this file)
   - Documentation for admin features

### Modified Files

1. **`src/lib/supabase.ts`**
   - Added `role?: 'user' | 'admin'` to Profile interface

2. **`src/screens/SettingsScreen.tsx`**
   - Imported `useUserRole` hook and `OnboardingService`
   - Added `handleResetOnboarding()` function
   - Added "🔧 Developer" section (visible only for admins)
   - Added "Reset Onboarding" button

3. **`src/components/WelcomeFlow.tsx`** (Phase 1)
   - Completely redesigned with 3 slides focused on "Chapters" vision
   - Liquid Glass design system
   - Smooth animations

---

## 🔐 Security Considerations

### Row Level Security (RLS)

The migration includes helper functions with `SECURITY DEFINER` to ensure proper access control:

```sql
-- Check if user is admin
SELECT is_admin(auth.uid());

-- Only admins should be able to promote/demote users
-- This can be enforced in your app logic
```

### Best Practices

1. **Limit admin accounts** - Only promote trusted users
2. **Audit admin actions** - Log admin actions if needed
3. **Protect promote functions** - Add additional checks in app logic
4. **Use RLS policies** - Ensure users can only read their own role

---

## 🚀 Usage Examples

### Check if Current User is Admin

```typescript
import { useUserRole } from '../hooks/useUserRole';

function MyComponent() {
  const { isAdmin, role, loading } = useUserRole();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAdmin) {
    return <AdminPanel />;
  }

  return <UserPanel />;
}
```

### Reset Onboarding Programmatically

```typescript
import { OnboardingService } from '../services/onboardingService';

async function resetOnboarding() {
  try {
    await OnboardingService.resetOnboarding();
    console.log('✅ Onboarding reset successfully');

    // Sign out user to trigger flow
    await supabase.auth.signOut();
  } catch (error) {
    console.error('❌ Error resetting onboarding:', error);
  }
}
```

### Get Onboarding Status (Debugging)

```typescript
import { OnboardingService } from '../services/onboardingService';

async function checkOnboardingStatus() {
  const status = await OnboardingService.getOnboardingStatus();
  console.log('Onboarding Status:', status);
  /*
  {
    welcomeFlowCompleted: true,
    isFirstTime: false,
    chapterCreated: true,
    videosImported: true,
    guidedTourCompleted: false,
    firstRecordingCompleted: false
  }
  */
}
```

---

## 🐛 Troubleshooting

### "Developer section not showing"

**Problem:** Admin user doesn't see the Developer section in Settings

**Solutions:**
1. Verify role in database:
   ```sql
   SELECT id, email, role FROM profiles WHERE email = 'your-admin@email.com';
   ```
2. Sign out and sign in again
3. Check console for `useUserRole` hook errors

### "Reset Onboarding not working"

**Problem:** Onboarding flow doesn't restart after reset

**Solutions:**
1. Check AsyncStorage was cleared:
   ```typescript
   import AsyncStorage from '@react-native-async-storage/async-storage';
   const keys = await AsyncStorage.getAllKeys();
   console.log('AsyncStorage keys:', keys);
   ```
2. Ensure user was signed out after reset
3. Clear app data/cache and try again

### "Migration fails"

**Problem:** SQL migration returns errors

**Solutions:**
1. Check if `profiles` table exists
2. Ensure you have proper permissions
3. Run migration in parts (comment out sections)
4. Check Supabase logs for detailed error

---

## 📝 Future Admin Features

Potential admin-only features to implement:

- [ ] **Analytics Dashboard** - View app usage stats
- [ ] **User Management** - Promote/demote users
- [ ] **Feature Flags** - Enable/disable features per user
- [ ] **Debug Panel** - View AsyncStorage, logs, etc.
- [ ] **Test Data Generation** - Create sample chapters/videos
- [ ] **Database Viewer** - Browse database tables
- [ ] **Error Logs** - View app error logs

---

## 📚 Related Documentation

- **ONBOARDING_PLAN.md** - Complete onboarding flow plan
- **CLAUDE.md** - Full project documentation
- **Phase 1: WelcomeFlow** - New onboarding implementation

---

## ✅ Quick Start Checklist

- [ ] Run SQL migration in Supabase
- [ ] Promote your account to admin
- [ ] Sign out and sign in
- [ ] Verify "Developer" section appears in Settings
- [ ] Test "Reset Onboarding" feature
- [ ] Confirm onboarding flow restarts

---

**Need help?** Contact: contact@saasexpand.io
