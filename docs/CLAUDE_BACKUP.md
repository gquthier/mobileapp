# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Goal-oriented video journal mobile app built with React Native/Expo. Users record video reflections organized into "Chapters" representing life periods (e.g., "Starting University", "New Job"). Features AI-powered transcription, video analysis, momentum tracking, and an intelligent question system to guide reflections.

**Key Concept**: Think of it as a personal video diary meets life coach - users build a visual narrative of their journey with AI assistance.

## Technology Stack

- **Frontend**: React Native 0.81 + Expo 54 (with new architecture enabled)
- **Language**: TypeScript (strict mode)
- **Backend**: Supabase (PostgreSQL + Storage + Auth + Row Level Security)
- **Navigation**: React Navigation v7 (Bottom Tabs + Stack)
- **State Management**: `useReducer` + Context (see LibraryScreen.reducer.ts)
- **Video**: expo-av, expo-video, expo-video-thumbnails
- **AI**: OpenAI API for transcription and analysis
- **Build System**: EAS Build

## Essential Commands

### Development
```bash
cd mobileapp
npm start                    # Start Expo dev server
npm run ios                  # Run on iOS simulator
npm run android              # Run on Android emulator
npx expo start --clear       # Clear cache if Metro bundler issues
```

### Environment Setup
```bash
# First time setup
cp .env.example .env
# Edit .env with Supabase credentials and OpenAI API key
# EXPO_PUBLIC_SUPABASE_URL=...
# EXPO_PUBLIC_SUPABASE_ANON_KEY=...
# EXPO_PUBLIC_OPENAI_API_KEY=...
```

### Database Migrations
```bash
# Run SQL migrations in Supabase Dashboard → SQL Editor
# Or use provided shell scripts:
./apply_rls_migration.sh              # Apply Row Level Security
./run-vacuum.sh                       # Optimize database performance
./test-momentum-system.sh             # Test momentum scoring
```

### Production Build
```bash
cd mobileapp
npx expo prebuild                     # Generate native projects
eas build --platform ios              # Build for iOS (requires EAS account)
eas build --platform android          # Build for Android
```

## Critical Architecture Patterns

### 1. Service Layer Architecture

All business logic lives in `src/services/`. Never put business logic directly in screens.

**Key Services**:
- `videoService.ts` - Video upload, retrieval, thumbnail generation (27KB, most complex)
- `videoBackupService.ts` - Local backup system for upload failures, auto-retry on app restart
- `importQueueService.ts` - Background video import queue with progress tracking (25KB)
- `transcriptionJobService.ts` - Manages OpenAI transcription jobs
- `chapterService.ts` - Chapter CRUD with video count aggregation
- `momentumService.ts` - Calculates user momentum scores based on video activity
- `userQuestionsService.ts` - AI question generation system

**Pattern**:
```typescript
// ✅ Good: Use service layer
const videos = await VideoService.getAllVideos(userId);

// ❌ Bad: Direct Supabase calls in screens
const { data } = await supabase.from('videos').select('*');
```

### 2. Video Upload Flow (Critical Path)

**Current Implementation** (Synchronous - blocking):
```
RecordScreen → VideoService.uploadVideo() → Supabase Storage → Create DB record → Trigger transcription
                    ↓ (blocks UI for 5-30 minutes!)
```

**Known Issue**: See `RECOMMANDATIONS_7_OCTOBRE.md` P0-9 - Upload blocks UI and fails if app is backgrounded.

**Upcoming Fix**: Background upload queue with expo-file-system resumable uploads.

### 3. State Management Strategy

**LibraryScreen**: Uses `useReducer` pattern (see `LibraryScreen.reducer.ts`) - migrated from 18 separate `useState` to grouped state to prevent excessive re-renders.

**Pattern**:
```typescript
// State types defined separately
type LibraryState = {
  videos: VideoRecord[];
  videoPlayer: VideoPlayerState;
  search: SearchState;
  // ...
};

// Actions are strongly typed
type LibraryAction =
  | { type: 'FETCH_SUCCESS'; videos: VideoRecord[] }
  | { type: 'OPEN_VIDEO_PLAYER'; video: VideoRecord };

// Reducer handles all state transitions
const libraryReducer = (state: LibraryState, action: LibraryAction) => { ... };
```

### 4. Supabase Integration

**Credentials**: NEVER hardcode. Always use environment variables with `EXPO_PUBLIC_` prefix.

```typescript
// src/lib/supabase.ts - ✅ Correct pattern
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}
```

**Row Level Security (RLS)**: ALL tables must have RLS enabled. Users can only access their own data.

```sql
-- Pattern for all tables
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own videos"
ON videos FOR ALL USING (auth.uid() = user_id);
```

### 5. Database Performance (Critical for 50k+ users)

**Required Indexes** (see `supabase/migrations/create_performance_indexes.sql`):
```sql
-- Most critical indexes
CREATE INDEX idx_videos_user_created ON videos(user_id, created_at DESC);
CREATE INDEX idx_transcription_video_id ON transcription_jobs(video_id);
CREATE INDEX idx_user_questions_user_created ON user_questions(user_id, created_at DESC);
```

**Always use pagination**:
```typescript
// ✅ Good
const videos = await VideoService.getAllVideos(userId, limit: 50, offset: 0);

// ❌ Bad - will crash with large datasets
const allVideos = await VideoService.getAllVideos(userId);
```

### 6. Features Directory Pattern

New major features go in `src/features/[feature-name]/` with self-contained structure:

```
features/vertical-feed/
├── screens/           # Feature screens
├── components/        # Feature-specific components
├── hooks/            # Feature-specific hooks
├── types/            # Feature type definitions
└── constants.ts      # Feature configuration
```

**Example**: Vertical Feed Mode - TikTok-style video player (recently added).

### 7. Navigation Structure

```
AppNavigator (Root)
├── AuthScreen (if not logged in)
├── WelcomeFlow → OnboardingScreens → LifeAreasSelection (first-time users)
└── Bottom Tabs (logged in users)
    ├── Home (Chapters)
    ├── Library (Stack)
    │   ├── LibraryMain
    │   ├── VideoImport
    │   └── VerticalFeed (fullscreen modal)
    ├── Record
    ├── Momentum (Stack)
    │   ├── MomentumMain
    │   ├── ChapterDetail
    │   ├── ChapterManagement
    │   └── ChapterSetup
    └── Settings
```

### 8. Video Caching Strategy

Two-level caching system:
1. **LRU Cache** (`videoLRUCache.ts`) - In-memory cache for recently played videos
2. **Local Backup** (`videoBackupService.ts`) - FileSystem cache for upload failures

**Important**: `VideoCacheService` manages preloading for smooth playback.

## Known Performance Issues (P0 Priority)

See `RECOMMANDATIONS_7_OCTOBRE.md` for comprehensive audit. Key blockers for 50k users:

1. **P0-1**: Memory leak in AnimatedThumbnail (interval not cleaned)
2. **P0-2**: Missing database indexes (full table scans)
3. **P0-3**: VideoPlayer listeners not cleaned up
4. **P0-5**: No pagination in LibraryScreen (loads ALL videos)
5. **P0-7**: Client-side search (should use Postgres full-text search)
6. **P0-9**: Blocking video upload (needs background queue)
7. **P0-10**: Multiple missing database indexes

**Status**: P0-6 (credentials in env vars) is ✅ FIXED.

## Testing Strategy

**Manual Testing**:
```bash
# Test video recording flow
1. Open Record tab
2. Record 10-second video
3. Save → Check LibraryScreen for new video
4. Verify thumbnail generated
5. Play video back

# Test upload recovery (critical)
1. Record video
2. During upload, force quit app
3. Reopen app
4. Verify upload resumes automatically (VideoBackupService)
```

**Migration Testing**:
```bash
# After SQL migration
./supabase/migrations/verify_indexes_performance.sql  # Check index usage
./run-vacuum.sh                                       # Optimize tables
```

## Development Workflows

### Adding a New Screen
1. Create screen in `src/screens/[ScreenName].tsx`
2. Add navigation type in `AppNavigator.tsx`
3. Add route to appropriate navigator (Tab/Stack)
4. Create associated service if needed in `src/services/`
5. Update types in `src/types/` or `src/lib/supabase.ts`

### Adding a Database Table
1. Create migration SQL in `supabase/migrations/`
2. Include:
   - Table creation with proper types
   - RLS policies (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
   - Performance indexes (user_id, created_at minimum)
   - Foreign key constraints
3. Add TypeScript interface in `src/lib/supabase.ts`
4. Create service class in `src/services/`
5. Test with EXPLAIN ANALYZE to verify index usage

### Fixing Memory Leaks
Common patterns:
```typescript
// ✅ Always cleanup in useEffect
useEffect(() => {
  const interval = setInterval(() => { ... }, 1000);
  return () => clearInterval(interval); // Cleanup!
}, [deps]);

// ✅ Use refs for mutable values that shouldn't trigger re-renders
const intervalRef = useRef<NodeJS.Timeout | null>(null);

// ✅ Cleanup async operations
useEffect(() => {
  let isMounted = true;

  fetchData().then(data => {
    if (isMounted) setState(data);
  });

  return () => { isMounted = false; };
}, []);
```

## Critical Code Locations

- **Video upload logic**: `src/services/videoService.ts:230-467`
- **Library state management**: `src/screens/LibraryScreen.tsx` + `LibraryScreen.reducer.ts`
- **Search functionality**: `src/services/videoService.ts:644-789` (needs P0-7 fix)
- **Chapter system**: `src/services/chapterService.ts`
- **Supabase client**: `src/lib/supabase.ts:1-27`
- **App navigation**: `src/navigation/AppNavigator.tsx:56-186`
- **Video player**: `src/components/VideoPlayer.tsx` (has P0-3 memory leak)
- **Momentum scoring**: `src/services/momentumService.ts`

## Rollback Procedures

If a feature needs rollback (e.g., Vertical Feed):
1. Check for rollback guide: `ROLLBACK_[FEATURE].md`
2. Backup current state: `git checkout -b backup-before-rollback`
3. Either:
   - Remove feature directory: `rm -rf src/features/[feature-name]`
   - Restore modified files: `git restore [files]`
4. Test app still starts: `npm start`

## Documentation Files

- `RECOMMANDATIONS_7_OCTOBRE.md` - **Comprehensive audit** of all performance issues
- `VIDEO_OPTIMIZATION_AUDIT_PLAN.md` - Video performance improvement roadmap
- `P0-6_IMPLEMENTATION_FINALE.md` - Environment variables migration guide
- `P0-7_SEARCH_OPTIMIZATION_GUIDE.md` - Search optimization with Postgres FTS
- `P0-9_BACKGROUND_UPLOAD_IMPLEMENTATION.md` - Background upload queue design
- `RLS_MIGRATION_GUIDE.md` - Row Level Security setup
- `ROLLBACK_VERTICAL_FEED.md` - Vertical feed rollback instructions

## Current Work (as of Oct 9, 2025)

- ✅ Vertical Feed Mode (TikTok-style player) - Implemented
- 🔄 P0 Performance Fixes - In Progress (7/10 completed)
- 📋 Background Upload Queue - Designed, awaiting implementation
- 📋 Video Optimization (CDN, adaptive bitrate) - Planning phase

## Anti-Patterns to Avoid

❌ **Don't**: Fetch all videos without pagination
❌ **Don't**: Put business logic in screens
❌ **Don't**: Hardcode credentials
❌ **Don't**: Skip RLS policies on tables
❌ **Don't**: Forget cleanup in useEffect
❌ **Don't**: Use multiple useState when useReducer is better (>5 related states)
❌ **Don't**: Skip database indexes on frequently queried columns
❌ **Don't**: Block UI during long operations (uploads, API calls)

## Questions to Ask Before Coding

1. Does this need a database migration? → Create SQL in `supabase/migrations/`
2. Is this business logic? → Create/update service in `src/services/`
3. Will this query scale to 50k users? → Add indexes, use pagination
4. Does this involve async operations? → Add proper cleanup and error handling
5. Is this a reusable component? → Consider putting in `src/components/`
6. Is this a new feature? → Consider feature directory structure

## Environment Variables

Required in `.env` file:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://[project].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...
```

For production builds, use EAS Secrets:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "..."
```

## Database Schema (Key Tables)

- `videos` - Video metadata, file paths, thumbnails
- `transcription_jobs` - OpenAI transcription status and results
- `chapters` - User life chapters with date ranges
- `user_questions` - AI-generated reflection questions
- `question_responses` - User answers to questions
- `momentum_scores` - Daily momentum tracking
- `user_profiles` - Extended user data beyond auth

All tables have `user_id` foreign key and RLS policies.
