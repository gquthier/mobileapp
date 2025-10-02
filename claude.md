# Claude.md - Mobile App Project Analysis

## Project Overview

This is a React Native mobile application built with Expo, designed as a personal video journaling and life chapter tracking app. The app allows users to record video reflections, organize them by chapters/themes, and engage in AI-powered conversations about their content with advanced transcription and highlights features.

## Project Structure

```
mobileap/
├── mobileapp/                    # Main React Native app directory
│   ├── App.tsx                   # Root component with navigation setup
│   ├── app.json                  # Expo configuration
│   ├── package.json              # Dependencies and scripts
│   ├── tsconfig.json             # TypeScript configuration
│   ├── eas.json                  # Expo Application Services build config
│   ├── assets/                   # Images, icons, splash screens
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── TopBar.tsx        # ✅ Header component (used widely)
│   │   │   ├── CustomTabBar.tsx  # ✅ Custom bottom navigation
│   │   │   ├── ChapterCard.tsx   # ✅ Chapter display with progress
│   │   │   ├── Chip.tsx          # ✅ Filter chips
│   │   │   ├── Icon.tsx          # ✅ SVG icon system (40+ icons)
│   │   │   ├── PromptCard.tsx    # ✅ Recording suggestions
│   │   │   ├── VideoPlayer.tsx   # ✅ Advanced video player with highlights
│   │   │   ├── VideoCard.tsx     # ✅ Video thumbnail component
│   │   │   ├── CalendarGallerySimple.tsx # ✅ Calendar view (active)
│   │   │   ├── WelcomeFlow.tsx   # ✅ First-time user welcome
│   │   │   ├── OnboardingScreens.tsx # ✅ User onboarding
│   │   │   ├── LanguageSelector.tsx # ✅ Language selection
│   │   │   ├── CalendarGallery.tsx # ⚠️ Unused (superseded by Simple)
│   │   │   ├── HighlightsGallery.tsx # ⚠️ Potentially unused
│   │   │   ├── RecordPill.tsx    # ⚠️ Potentially unused
│   │   │   └── ZoomableGifGrid.tsx # ⚠️ Unknown usage
│   │   ├── navigation/
│   │   │   └── AppNavigator.tsx  # ✅ Main navigation with auth flow
│   │   ├── screens/              # Main app screens
│   │   │   ├── HomeScreen.tsx    # ✅ Chapters overview
│   │   │   ├── LibraryScreen.tsx # ✅ Video library with search & calendar
│   │   │   ├── RecordScreen.tsx  # ✅ Advanced video recording interface
│   │   │   ├── ChatScreen.tsx    # ✅ AI chat interface (placeholder)
│   │   │   ├── SettingsScreen.tsx # ✅ User settings
│   │   │   ├── AuthScreen.tsx    # ✅ Sign-in/sign-up
│   │   │   └── ProfileScreen.tsx # ✅ User profile editing
│   │   ├── services/             # Backend services
│   │   │   ├── videoService.ts   # ✅ Video upload/management with compression
│   │   │   ├── authService.ts    # ✅ Authentication & profile management
│   │   │   ├── transcriptionJobService.ts # ✅ Transcription job management
│   │   │   ├── secureTranscriptionService.ts # ✅ Secure transcription
│   │   │   ├── transcriptionService.ts # ✅ Basic transcription
│   │   │   ├── transcriptionDatabaseService.ts # ✅ DB operations
│   │   │   └── audioExtractionService.ts # ✅ Audio extraction
│   │   ├── lib/
│   │   │   └── supabase.ts       # ✅ Supabase client & type definitions
│   │   ├── styles/               # Complete design system
│   │   │   ├── theme.ts          # ✅ Main theme with design tokens
│   │   │   ├── index.ts          # ✅ Style exports
│   │   │   ├── tokens/           # ✅ Design tokens (colors, typography, etc.)
│   │   │   ├── components/       # ✅ Component-specific styles
│   │   │   └── utilities/        # ✅ Style utilities
│   │   ├── hooks/
│   │   │   ├── useFirstTimeUser.ts # ✅ First-time user detection
│   │   │   └── useSecureTranscription.ts # ✅ Transcription hook
│   │   ├── types/
│   │   │   └── index.ts          # ✅ TypeScript interfaces
│   │   └── data/
│   │       └── introspectionQuestions.ts # ✅ Recording prompts
│   ├── supabase/functions/       # Edge Functions (AI & transcription)
│   │   ├── ai-chat/              # ✅ AI conversation
│   │   ├── generate-insights/    # ✅ AI insights generation
│   │   ├── generate-thumbnail/   # ✅ Video thumbnail generation
│   │   ├── generate-word-of-day/ # ✅ Personalized word suggestions
│   │   └── transcribe-video/     # ✅ Video transcription with highlights
│   └── node_modules/             # Dependencies
```

## Technology Stack

### Core Technologies
- **React Native**: 0.81.4 - Cross-platform mobile framework
- **Expo**: ~54.0.10 - Development platform and build tools
- **TypeScript**: ~5.9.2 - Type safety and development experience
- **React**: 19.1.0 - UI library

### Backend & Database
- **Supabase**: ^2.57.4 - Backend-as-a-Service with PostgreSQL database, authentication, and real-time features

### Navigation
- **@react-navigation/native**: ^7.1.17 - Navigation container
- **@react-navigation/bottom-tabs**: ^7.4.7 - Bottom tab navigation
- **@react-navigation/stack**: ^7.4.8 - Stack navigation

### Media & Camera
- **expo-camera**: ^17.0.8 - Camera and video recording
- **expo-av**: ^16.0.7 - Audio/video playback
- **expo-media-library**: ^18.2.0 - Media storage access
- **expo-file-system**: ^19.0.15 - File system operations
- **expo-video-thumbnails**: Latest - Video thumbnail generation

### UI & Interactions
- **react-native-gesture-handler**: ^2.28.0 - Advanced gesture handling
- **react-native-reanimated**: ^4.1.2 - Smooth animations
- **react-native-svg**: ^15.13.0 - SVG graphics support
- **expo-haptics**: ^15.0.7 - Haptic feedback

### Storage & State
- **@react-native-async-storage/async-storage**: ^2.2.0 - Local data persistence

### Additional Features
- **@react-native-community/datetimepicker**: ^8.4.5 - Date/time picker
- **expo-font**: ^14.0.8 - Custom font loading

## Core Features

### 1. Video Recording (`RecordScreen.tsx`)
- **Advanced Recording Interface**: Full-featured video recording with permissions management
- **Features**:
  - Front-facing camera for personal reflections
  - Real-time recording timer with automatic save
  - Post-recording video management (save, delete, retry)
  - Video title input with introspection questions
  - Haptic feedback for user interactions
  - Comprehensive permission handling (camera, microphone, media library)
  - Automatic transcription job creation after recording
- **Technical Implementation**:
  - Uses Expo Camera API with proper permission flows
  - iOS-specific permission workarounds
  - Automatic camera remounting after permission grants
  - Video compression for large files (5GB limit)
  - Integration with Supabase storage and transcription services

### 2. Content Library (`LibraryScreen.tsx`)
- **Calendar View**: iOS Photos-style calendar gallery with expanded months
- **Search Functionality**: Advanced search interface replacing header when active
  - 4-column thumbnail grid for results
  - Search by title and multiple date formats
  - Tap-outside to close search
- **Video Management**: Chronological sorting with swipe navigation
- **Features**:
  - Video thumbnails with automatic generation
  - Calendar organization by months and chapters
  - Real-time search with debouncing
  - Vertical aspect ratio thumbnails

### 3. Video Playback (`VideoPlayer.tsx`)
- **Advanced Video Player**: Full-screen video experience
- **Features**:
  - Swipe navigation between videos
  - Speed controls and timeline scrubbing
  - Integration with transcription highlights
  - Support for timestamp navigation
- **Transcription Integration**: Ready for highlights-based navigation

### 4. AI-Powered Transcription with AssemblyAI
- **AssemblyAI Integration**: Enterprise-grade speech-to-text processing
- **Features**:
  - Supports files up to 5GB / 10 hours (vs Whisper's 25MB limit)
  - Automatic transcription job queue system
  - Timestamp-based segments with word-level accuracy
  - Processing status indicators in video thumbnails
  - Real-time job monitoring and updates
- **Edge Functions**:
  - `process-transcription` - Main orchestration function
  - `transcribe-assemblyai` - AssemblyAI API integration with polling
  - `queue-transcription` - Job queue management
- **Technical Implementation**:
  - Automatic job creation after video upload
  - Status tracking: pending → processing → completed/failed
  - Integration with video player for seamless playback

### 5. AI-Powered Highlights Generation
- **OpenAI-Powered Analysis**: Automatic highlight extraction from transcriptions
- **Features**:
  - Identifies key moments and themes in videos
  - Generates title, summary, and timestamp for each highlight
  - Importance scoring (1-10) for each highlight
  - Click-to-navigate: tap highlights to jump to video timestamp
  - Visual badges showing importance level
- **Edge Function**: `generate-highlights`
  - Uses OpenAI Responses API with GPT-4.1 Nano
  - Prompt ID: `pmpt_68db774e1a6c81959f2860fb8e45a11d01dbf13311e57edd`
  - Analyzes transcript segments with timestamps
  - Returns structured JSON with highlights array
- **UI Integration**:
  - Highlights displayed below video player
  - Color-coded importance badges
  - Tap to seek video to exact moment
  - Compatible with both snake_case and camelCase formats

### 6. AI-Powered Personalized Questions
- **Context-Aware Question Generation**: Personalized recording prompts based on user's video history
- **Features**:
  - Generates batches of 50 unique questions per user
  - Analyzes 5 most recent + 3 random older transcriptions
  - Auto-regenerates when ≤5 questions remain
  - Seamless fallback to static questions
  - Questions marked as "used" when skipped
- **Edge Function**: `generate-user-questions`
  - Uses OpenAI Responses API with GPT-4.1 Nano
  - Prompt ID: `pmpt_68dda6ed3cc88197a11c5a8e5e6e9a290c27f60155d435b1`
  - Analyzes user's transcription history for context
  - Returns 50 personalized questions in JSON format
- **Database**: `user_questions` table
  - Organized by batch_number and order_index
  - Row Level Security for user isolation
  - SQL functions: `count_unused_questions()`, `get_user_current_batch()`
- **Service**: `userQuestionsService.ts`
  - Automatic initialization for new users
  - Background generation when threshold reached
  - Question rotation and tracking
- **Documentation**: See `USER_QUESTIONS_SYSTEM.md` for complete setup guide

### 7. Animated Video Thumbnails
- **6-Frame Animation System**: Dynamic previews for video content
- **Features**:
  - Extracts 6 frames at strategic timestamps
  - Automatic frame cycling on hover/display
  - Stored as separate images in Supabase Storage
  - Fallback to static thumbnail if frames unavailable
- **Edge Function**: `generate-thumbnail`
  - Analyzes video duration
  - Extracts frames at evenly distributed times
  - Uploads frames to storage
  - Updates video record with frame URLs
- **Component**: `AnimatedThumbnail.tsx`
  - Cycles through frames with configurable interval (500ms default)
  - Smooth transitions between frames
  - Memory-efficient frame loading
- **Integration**:
  - Calendar gallery view
  - Library grid view
  - Search results

### 8. User Authentication & Profile
- **Supabase Auth Integration**: Complete authentication flow
- **Features**:
  - Sign up/sign in with email
  - Language selection (EN/FR/ES/DE)
  - Profile management
  - First-time user onboarding
  - Welcome flow for new users

### 9. Chapter Management
- **Purpose**: Organize life experiences into meaningful periods
- **Features**:
  - Chapter creation with time periods
  - Progress tracking
  - Status management (in_progress/completed)
  - Goal setting and tracking

### 10. AI Chat Interface (Placeholder)
- **Context-Aware**: Chat with AI about recorded content
- **Video Citations**: Responses reference specific video segments
- **Personal Insights**: AI generates insights from user's video history

## Data Models

### Core Entities (Supabase)
```typescript
Profile {
  id: string (UUID)
  user_id: string (references auth.users)
  first_name?: string
  last_name?: string
  language: 'en' | 'fr' | 'es' | 'de'
  created_at: timestamp
  updated_at: timestamp
}

VideoRecord {
  id: string (UUID)
  title?: string
  file_path: string
  thumbnail_path?: string
  duration?: number
  user_id: string
  created_at: timestamp
}

Chapter {
  id: string
  title: string
  periodStart: Date
  periodEnd?: Date
  goals: string[]
  status: 'in_progress' | 'completed'
  videoCount?: number
  progress?: number
}

TranscriptionJob {
  id: string
  video_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  transcript_text?: string
  segments?: TranscriptSegment[]
  highlights?: Highlight[]
  language?: string
  created_at: timestamp
  updated_at: timestamp
}
```

### Advanced Features
```typescript
TranscriptSegment {
  id: number
  start: number
  end: number
  text: string
  avg_logprob: number
  no_speech_prob: number
}

Highlight {
  title: string
  text: string
  startTime: number
  endTime?: number
  confidence: number
}

Insight {
  id: string
  scope: 'video' | 'chapter' | 'weekly'
  summary: string
  actions: string[]
  createdAt: Date
}
```

## Design System (`/src/styles/`)

### Theme Structure
- **Complete design token system** with colors, typography, spacing, shadows
- **Component variants** for consistent UI patterns
- **Utility functions** for responsive design
- **Light/dark mode support** (foundation ready)

### Color Palette
- **Base**: Pure black (#000000) and white (#FFFFFF)
- **Grays**: 9-step grayscale from gray100 (#FAFAFA) to gray900 (#0D0D0D)
- **Brand**: Primary brand colors for interactive elements
- **Interface**: Tab bar background (#F7F7F7), dividers (#E6E6E6)

### Typography
- **Headlines**: H1 (28px), H2 (20px), H3 (18px) with custom letter spacing
- **Body**: 16px regular/bold variants
- **Supporting**: Caption (14px), Tiny (12px)
- **Custom weights**: 400, 500, 600, 700

### Layout System
- **Spacing**: 8px base system from XS (4px) to XXXL (48px)
- **Border Radius**: SM (8px) to Full (999px)
- **Shadows**: 3 levels with consistent elevation

## Backend Architecture (Supabase)

### Database Schema
- **Authentication**: Built-in Supabase Auth with profiles table
- **Storage**: Videos bucket with public access for playback
- **Real-time**: Subscription support for transcription updates
- **Row Level Security**: User-based data isolation

### Edge Functions
- **process-transcription**: Main transcription orchestration with AssemblyAI
- **transcribe-assemblyai**: AssemblyAI API integration with polling (5GB/10h support)
- **queue-transcription**: Transcription job queue management
- **generate-highlights**: AI-powered highlight extraction using OpenAI GPT-4.1 Nano
- **generate-user-questions**: Personalized question generation from user's video history
- **generate-thumbnail**: 6-frame animated thumbnail generation
- **AI Chat**: Context-aware conversations about video content
- **Generate Insights**: AI-powered insights from transcriptions
- **Generate Word of Day**: Personalized daily words

## Development Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Emulator (for Android development)
- Supabase account and project

### Installation
```bash
cd mobileapp
npm install
```

### Available Scripts
```bash
npm start          # Start Expo development server
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS device/simulator
npm run web        # Run on web browser
```

### Environment Setup
1. Create Supabase project
2. Configure storage buckets (videos)
3. Set up database schema
4. Deploy Edge Functions
5. Configure environment variables

### Key Configuration
- **Expo SDK**: Version 54
- **New Architecture**: Enabled
- **Orientation**: Portrait only (landscape for video playback)
- **Permissions**: Camera, microphone, media library access

## Platform-Specific Features

### iOS
- **Info.plist**: Custom camera/microphone usage descriptions
- **Tablet Support**: Enabled
- **Interface Style**: Light mode
- **File System**: Proper URI handling for video files

### Android
- **Adaptive Icon**: Custom foreground/background
- **Edge-to-Edge**: Enabled for modern Android UI
- **Predictive Back**: Disabled (custom handling)
- **Permissions**: Runtime permission handling

## Current State Assessment

### ✅ **Completed Features**
- ✅ Complete navigation structure with authentication flow
- ✅ Advanced video recording with AI-powered question suggestions
- ✅ Calendar-based video library with animated thumbnails
- ✅ Advanced search functionality (title, date, multiple formats)
- ✅ User authentication and profile management
- ✅ Design system and theming
- ✅ Supabase backend integration with RLS
- ✅ **AssemblyAI transcription** (5GB/10h file support)
- ✅ **AI-powered highlights generation** with OpenAI GPT-4.1 Nano
- ✅ **Personalized questions system** (50 questions per batch, auto-regeneration)
- ✅ **6-frame animated thumbnails** for all videos
- ✅ **Fullscreen video player** with tap-to-hide controls (iOS Photos-style)
- ✅ **Highlight navigation** - tap to seek to specific moments
- ✅ Video upload with direct multipart (no base64 limits)
- ✅ Processing status indicators in gallery
- ✅ Real-time transcription job monitoring

### 🚧 **In Development**
- AI chat interface (placeholder implemented)
- Chapter management system (data models ready)
- Export functionality (transcriptions, videos)
- Advanced analytics and insights

### 📊 **Code Quality**
- **Overall Health**: ✅ **EXCELLENT**
- **TypeScript Coverage**: 100% - All files use TypeScript
- **Architecture**: Well-structured with clear separation of concerns
- **Dependencies**: Modern and well-maintained packages
- **Code Style**: Consistent throughout the project

## Code Cleanup Status

### ✅ **Cleaned Up** (12 duplicate/backup files removed)
```bash
# Removed duplicate files
✅ src/screens/AuthScreen 2.tsx
✅ src/screens/RecordScreen 2.tsx
✅ src/components/VideoPlayer 2.tsx

# Removed service backups (now in git history)
✅ src/services/audioExtractionService.original.ts
✅ src/services/audioExtractionService.ts.backup
✅ src/services/realtimeTranscriptionService.ts.DISABLED_DANGEROUS
✅ src/services/transcriptionService.ts.DANGEROUS_OLD
✅ src/services/transcriptionService.ts.backup
✅ src/services/transcriptionService.ts.broken
```

### 🟡 **Investigate for Removal** (Potentially unused - 7 files)
```bash
# Components with no import references found
src/components/RecordPill.tsx          # Recording indicator
src/components/CalendarGallery.tsx     # Superseded by Simple version
src/components/HighlightsGallery.tsx   # No imports found
src/components/ZoomableGifGrid.tsx     # Unknown usage
src/components/CaptureHeader.tsx       # Unknown usage
src/components/CaptureNavigationBar.tsx # Unknown usage
src/components/SecureTranscriptionButton.tsx # Unknown usage
```

## Recommendations for Next Development Phase

### Immediate Tasks
1. **Cleanup unused files** - Remove duplicates and investigate potentially unused components
2. **Implement highlights navigation** - Add timestamp-based video navigation in VideoPlayer
3. **Complete chapter system** - Finish chapter management functionality
4. **AI chat integration** - Connect chat interface to backend AI services

### Architecture Improvements
1. **Consolidate type definitions** - Merge overlapping types between `/types/` and `/lib/supabase.ts`
2. **Add comprehensive error handling** - Implement consistent error boundaries
3. **Performance optimization** - Optimize video loading and memory usage
4. **Testing framework** - Add unit and integration tests

### Advanced Features
1. **Real-time collaboration** - Multiple users per chapter
2. **Advanced search** - Full-text search in transcriptions
3. **Export functionality** - Video and transcript exports
4. **Push notifications** - Recording reminders and processing updates

This is a professionally structured, feature-rich mobile application with strong foundations for continued development and scaling.