# Library Zoom/Dézoom Implementation - Apple Photos Style

## 📋 Overview

This document describes the Apple Photos-style zoom/dézoom transition implementation for the Library gallery view. The implementation provides smooth shared-element transitions, pinch-to-zoom, pan-to-close gestures, and double-tap zoom functionality.

## 🏗️ Architecture

### File Structure

```
src/components/library/
├── types.ts                          # TypeScript interfaces and default configs
├── math/
│   ├── rectFit.ts                    # Rectangle fitting calculations
│   └── rubberband.ts                 # Rubberband effect utilities
├── gestures/
│   ├── usePinchPan.ts                # Pinch & pan gesture hook
│   ├── useDoubleTapZoom.ts           # Double-tap zoom gesture hook
│   └── usePanToClose.ts              # Pan-to-close gesture hook
├── transition/
│   ├── SharedElementPortal.tsx       # Shared element transition component
│   └── useSharedTransition.ts        # Transition orchestration hook
└── ZoomableMediaViewer.tsx           # Main zoomable viewer component
```

### Updated Existing Files

- `src/components/VideoCard.tsx` - Added `measureThumbnail()` and `onPressWithRect` callback
- `src/components/CalendarGallerySimple.tsx` - Added `onVideoPressWithRect` callback with rect measurement

## ✅ Implemented Features

### 1. **Core Infrastructure** ✅
- ✅ Type definitions (`Asset`, `SourceRect`, `TransitionSpec`, `ZoomConfig`, `PanToCloseConfig`)
- ✅ Math utilities (rectFit, rubberband, interpolate, easing functions)
- ✅ Default configurations (TRANSITION_DEFAULT, ZOOM_DEFAULT, PAN_CLOSE_DEFAULT)

### 2. **Gesture System** ✅
- ✅ **usePinchPan**: Simultaneous pinch-to-zoom and pan gestures
  - Scale limits with rubberband effect
  - Translation clamping with bounds checking
  - Focal point preservation during pinch
  - Spring-back animation when exceeding limits

- ✅ **useDoubleTapZoom**: Double-tap to zoom in/out
  - Toggle between 1x and 2x (configurable)
  - Centered on tap point
  - Smooth spring animations

- ✅ **usePanToClose**: Vertical pan to dismiss
  - Only active when scale ≈ 1
  - Distance and velocity thresholds
  - Backdrop opacity interpolation
  - Slight scale-down effect during drag

### 3. **Transition System** ✅
- ✅ **SharedElementPortal**: Animates thumbnail → full-screen
  - Position and size interpolation
  - Configurable duration and easing
  - onAnimationComplete callback

- ✅ **useSharedTransition**: Orchestrates open/close flows
  - SourceRect measurement
  - TargetRect calculation (fit mode)
  - State management for transition lifecycle

### 4. **Viewer Component** ✅
- ✅ **ZoomableMediaViewer**: Complete zoomable viewer
  - Video and image support
  - Composed gestures (pinch/pan/double-tap/pan-to-close)
  - Deferred video mount option
  - Thumbnail → video transition on ready

### 5. **Gallery Integration** ✅
- ✅ VideoCard updated with rect measurement
- ✅ CalendarGallerySimple updated with `onVideoPressWithRect`
- ✅ Backward compatibility maintained (old `onVideoPress` still works)

## 🔨 Integration with LibraryScreen (TO DO)

To complete the implementation, you need to integrate the zoom system into `LibraryScreen.tsx`:

### Step 1: Add Imports

```typescript
import Reanimated, { useSharedValue } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SharedElementPortal } from '../components/library/transition/SharedElementPortal';
import { useSharedTransition } from '../components/library/transition/useSharedTransition';
import { ZoomableMediaViewer } from '../components/library/ZoomableMediaViewer';
import { Asset, SourceRect } from '../components/library/types';
```

### Step 2: Add State and Hooks

```typescript
// Inside LibraryScreen component:
const backdropOpacity = useSharedValue(0);
const [viewerAsset, setViewerAsset] = useState<Asset | null>(null);
const [viewerOpen, setViewerOpen] = useState(false);

const {
  transitionState,
  open,
  close,
  handleAnimationComplete,
  transitionSpec,
} = useSharedTransition({
  onOpenComplete: () => {
    console.log('✅ Transition opened');
  },
  onCloseComplete: () => {
    setViewerOpen(false);
    setViewerAsset(null);
  },
});
```

### Step 3: Create Handler

```typescript
const handleCalendarVideoPressWithRect = useCallback(
  (video: VideoRecord, rect: SourceRect, allVideosFromDay?: VideoRecord[], index: number = 0) => {
    // Convert VideoRecord to Asset
    const asset: Asset = {
      id: video.id,
      type: 'video',
      uri: video.file_path.startsWith('http')
        ? video.file_path
        : `https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos/${video.file_path}`,
      width: 1080, // Or get from video metadata
      height: 1920, // Or get from video metadata
      thumbnailUri: video.thumbnail_frames?.[0] || video.thumbnail_path,
      duration: video.duration,
      createdAt: video.created_at,
    };

    setViewerAsset(asset);
    setViewerOpen(true);
    open(asset, rect);
  },
  [open]
);
```

### Step 4: Update CalendarGallery Usage

```typescript
<CalendarGallery
  videos={displayedVideos}
  onVideoPressWithRect={handleCalendarVideoPressWithRect} // NEW
  // Keep old handler as fallback
  onVideoPress={handleCalendarVideoPress}
  chapters={[]}
  {...scrollHandlers}
/>
```

### Step 5: Add Viewer Overlay

```typescript
{/* Apple Photos-style Zoom Viewer */}
{viewerOpen && viewerAsset && (
  <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
    {/* Backdrop */}
    <Reanimated.View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: 'black',
          opacity: backdropOpacity,
        },
      ]}
    />

    {/* Transition Portal */}
    {transitionState.isTransitioning && transitionState.sourceRect && transitionState.targetRect && (
      <SharedElementPortal
        sourceRect={transitionState.sourceRect}
        targetRect={transitionState.targetRect}
        imageUri={viewerAsset.thumbnailUri || viewerAsset.uri}
        transitionSpec={transitionSpec}
        direction={transitionState.direction || 'open'}
        onAnimationComplete={handleAnimationComplete}
      />
    )}

    {/* Zoomable Viewer */}
    {!transitionState.isTransitioning && (
      <ZoomableMediaViewer
        asset={viewerAsset}
        backdropOpacity={backdropOpacity}
        onClose={() => {
          // Re-measure source rect before closing
          close(transitionState.sourceRect!);
        }}
      />
    )}
  </View>
)}
```

## 🎯 Configuration

### Transition Timing

```typescript
const TRANSITION_DEFAULT: TransitionSpec = {
  durationOpenMs: 260,
  durationCloseMs: 220,
  easingOpen: 'standard',
  easingClose: 'standard',
  backdropMaxOpacity: 0.95,
};
```

### Zoom Limits

```typescript
const ZOOM_DEFAULT: ZoomConfig = {
  minScale: 1,
  maxScale: 3,        // 3x for images
  doubleTapScale: 2,  // 2x on double-tap
  rubberband: true,
};
```

### Pan-to-Close

```typescript
const PAN_CLOSE_DEFAULT: PanToCloseConfig = {
  distanceThresholdPx: 120,  // Drag 120px to dismiss
  velocityThreshold: 900,     // Or flick at 900px/s
  backdropMinAlpha: 0.2,      // Min backdrop opacity during drag
};
```

## 📱 Gestures

| Gesture | Behavior |
|---------|----------|
| **Single Tap** | Open video (via grid/calendar) |
| **Pinch** | Zoom in/out (1x - 3x) with rubberband |
| **Pan (zoomed)** | Move content with bounds clamping |
| **Double Tap** | Toggle 1x ↔ 2x centered on tap point |
| **Vertical Pan (scale=1)** | Dismiss if distance > 120px or velocity > 900px/s |

## 🧪 Testing Checklist

- [ ] Tap thumbnail → smooth zoom to full-screen
- [ ] Pinch to zoom 1x → 3x
- [ ] Pan while zoomed (with bounds)
- [ ] Double-tap toggles zoom at tap point
- [ ] Vertical drag dismisses (when not zoomed)
- [ ] Spring-back if drag/zoom exceeds limits
- [ ] Video plays after transition complete
- [ ] Reduce Motion: smooth fades instead of complex animations

## 🐛 Known Issues / TODO

- [ ] Complete LibraryScreen.tsx integration (steps above)
- [ ] Add Reduce Motion accessibility support
- [ ] Add haptic feedback on gestures
- [ ] Handle video player controls visibility
- [ ] Support horizontal swipe for next/previous video
- [ ] Optimize for large video files (5GB limit)
- [ ] Add loading states for slow networks

## 📚 Dependencies

- `react-native-reanimated`: ^4.1.2 (worklets, useSharedValue, withTiming, withSpring)
- `react-native-gesture-handler`: ^2.28.0 (Gesture API)
- `expo-av`: ^16.0.7 (Video playback)

## 🎨 Design Tokens

Uses existing design system from `src/styles/theme.ts`:
- Spacing, shadows, typography maintained
- No new colors added (uses black backdrop)

---

**Status**: 90% Complete - Infrastructure ready, needs final LibraryScreen wiring

**Author**: Claude AI
**Date**: 2025-01-08
