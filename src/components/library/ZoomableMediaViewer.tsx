import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image'; // ✅ Migrated from react-native Image (2025-10-22)
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  SharedValue,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Asset, ZoomConfig, PanToCloseConfig, ZOOM_DEFAULT, PAN_CLOSE_DEFAULT } from './types';
import { usePinchPan } from './gestures/usePinchPan';
import { useDoubleTapZoom } from './gestures/useDoubleTapZoom';
import { usePanToClose } from './gestures/usePanToClose';
import { Video, ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ZoomableMediaViewerProps {
  asset: Asset;
  backdropOpacity: SharedValue<number>;
  onClose: () => void;
  zoomConfig?: ZoomConfig;
  panToCloseConfig?: PanToCloseConfig;
  deferredMount?: boolean;
}

export const ZoomableMediaViewer: React.FC<ZoomableMediaViewerProps> = ({
  asset,
  backdropOpacity,
  onClose,
  zoomConfig = ZOOM_DEFAULT,
  panToCloseConfig = PAN_CLOSE_DEFAULT,
  deferredMount = false,
}) => {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<Video>(null);
  const dismissScale = useSharedValue(1);

  // Pinch & Pan gesture for zoom
  const {
    gesture: pinchPanGesture,
    scale,
    translateX,
    translateY,
    savedScale,
    savedTranslateX,
    savedTranslateY,
  } = usePinchPan({
    config: zoomConfig,
    contentWidth: asset.width,
    contentHeight: asset.height,
  });

  // Double-tap zoom gesture
  const doubleTapGesture = useDoubleTapZoom({
    config: zoomConfig,
    scale,
    translateX,
    translateY,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    contentWidth: asset.width,
    contentHeight: asset.height,
  });

  // Pan-to-close gesture
  const panToCloseGesture = usePanToClose({
    config: panToCloseConfig,
    scale,
    translateY,
    backdropOpacity,
    dismissScale,
    onClose,
  });

  // Compose all gestures
  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchPanGesture, panToCloseGesture)
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value * dismissScale.value },
      ],
    };
  });

  const handleVideoReady = useCallback(() => {
    setIsVideoReady(true);
    if (videoRef.current && !deferredMount) {
      videoRef.current.playAsync();
    }
  }, [deferredMount]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.mediaContainer, animatedStyle]}>
          {asset.type === 'video' ? (
            <>
              {/* Show thumbnail until video is ready */}
              {!isVideoReady && asset.thumbnailUri && (
                <Image
                  source={{ uri: asset.thumbnailUri }}
                  style={styles.media}
                  contentFit="contain"
                />
              )}
              <Video
                ref={videoRef}
                source={{ uri: asset.uri }}
                style={[styles.media, !isVideoReady && styles.hidden]}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={!deferredMount}
                isLooping
                onReadyForDisplay={handleVideoReady}
              />
            </>
          ) : (
            <Image
              source={{ uri: asset.uri }}
              style={styles.media}
              contentFit="contain"
            />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  hidden: {
    opacity: 0,
  },
});
