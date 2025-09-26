# Supabase Backend Setup Guide

## Overview
This app is now connected to Supabase as the backend service for storing and managing video recordings.

## Configuration

### Environment
- **Project URL**: `https://eenyzudwktcjpefpoapi.supabase.co`
- **Anon Key**: Already configured in `src/lib/supabase.ts`

### Database Schema

To set up the database, run the SQL script located in `sql/init.sql` in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the content from `sql/init.sql`
4. Run the script

This will create:
- `profiles` table (for user data)
- `chapters` table (for organizing videos)
- `themes` table (for categorizing videos)
- `videos` table (for video metadata)
- `videos` storage bucket (for video files)
- Row Level Security policies
- Automatic timestamp triggers

### Storage Bucket

The script automatically creates a public storage bucket named `videos` where video files will be stored.

## Features Implemented

### Video Recording & Upload
- ✅ Record videos in vertical format (9:16)
- ✅ Add custom titles to videos
- ✅ Upload to Supabase storage
- ✅ Save metadata to database
- ✅ Error handling and loading states

### Video Library
- ✅ Display all recorded videos
- ✅ Search functionality
- ✅ Pull-to-refresh
- ✅ Loading and empty states
- ✅ Proper date and duration formatting

### Services & Hooks
- ✅ `VideoService` - Handles all video operations
- ✅ `useVideos` hook - React hook for video state management
- ✅ TypeScript types for type safety

## File Structure
```
src/
├── lib/
│   └── supabase.ts          # Supabase configuration and types
├── services/
│   └── videoService.ts      # Video upload/download operations
├── hooks/
│   └── useVideos.ts         # React hook for video management
└── screens/
    ├── RecordScreen.tsx     # Updated with Supabase integration
    └── LibraryScreen.tsx    # Updated to display Supabase videos
```

## How to Use

### Recording a Video
1. Navigate to Record tab
2. Grant camera/microphone permissions
3. Press record button to start
4. Press again to stop
5. Enter video title
6. Press check icon to save to Supabase

### Viewing Videos
1. Navigate to Library tab
2. View all your recorded videos
3. Use search to find specific videos
4. Pull down to refresh the list

## Security

The app uses Row Level Security (RLS) to ensure users can only access their own data. All policies are configured to use `auth.uid()` for user identification.

## Next Steps

1. **Authentication**: Currently using anonymous access. Consider implementing user authentication for multi-user support.
2. **Chapters & Themes**: The database is ready for organizing videos into chapters and themes.
3. **Video Playback**: Add video player functionality to the library.
4. **Offline Support**: Consider caching videos locally for offline viewing.

## Troubleshooting

### Common Issues
1. **Upload fails**: Check internet connection and Supabase project status
2. **Videos not showing**: Verify database tables are created correctly
3. **Permission errors**: Ensure RLS policies are properly configured

### Debug Logging
The app includes comprehensive console logging with emoji indicators:
- 🔐 Permission requests
- 📤 Upload operations
- ✅ Successful operations
- ❌ Error conditions