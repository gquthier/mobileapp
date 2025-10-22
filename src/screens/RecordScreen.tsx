import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles';
import { Icon } from '../components/Icon';
import { LongPressIndicator } from '../components/LongPressIndicator';
import { DragToActionControls } from '../components/DragToActionControls';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { VideoService } from '../services/videoService';
import { TranscriptionJobService, TranscriptionJob } from '../services/transcriptionJobService';
import { getRandomQuestion, IntrospectionQuestion } from '../data/introspectionQuestions';
import { UserQuestionsService, UserQuestion } from '../services/userQuestionsService';
import { useMomentumAnalysis } from '../hooks/useMomentumAnalysis';
import { supabase } from '../lib/supabase';
import { getCurrentChapter } from '../services/chapterService';
import { ImportQueueService } from '../services/importQueueService';
import { useTheme } from '../contexts/ThemeContext';
import { useCameraContext } from '../contexts/CameraContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// AsyncStorage cache configuration
const QUESTIONS_CACHE_KEY = '@questions_cache';
const CACHE_EXPIRY_MS = 1000 * 60 * 60; // 1 heure

const RecordScreen: React.FC = ({ route, navigation }: any) => {
  // Theme context
  const { brandColor } = useTheme();

  // ✅ SOLUTION 2: Camera Context (shared camera instance between TAB and MODAL)
  const { cameraLocation, setCameraLocation, sharedCameraRef, isCameraReady, setIsCameraReady } = useCameraContext();

  // Determine if this is TAB or MODAL instance
  const isModal = route.params?.isModal;
  const myLocation: 'tab' | 'modal' = isModal ? 'modal' : 'tab';

  // ✅ SOLUTION 2: Conditional rendering - only show camera if location matches
  const shouldShowCamera = cameraLocation === myLocation;

  console.log(`🎥 [RECORD ${myLocation.toUpperCase()}] shouldShowCamera:`, shouldShowCamera, '| cameraLocation:', cameraLocation);

  // Permissions hooks
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  // Momentum analysis hook
  const { analyzeMomentum } = useMomentumAnalysis();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Camera state
  const [cameraKey, setCameraKey] = useState(0);
  // ✅ SOLUTION 2: isCameraReady is now in CameraContext (shared state)
  // ✅ PHASE 2: shouldMountCamera and tabCameraUnmountedRef removed (no TAB camera)

  // Recording UI state
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Orientation state
  const [orientation, setOrientation] = useState<ScreenOrientation.Orientation>(
    ScreenOrientation.Orientation.PORTRAIT_UP
  );

  // Flash state
  const [flashEnabled, setFlashEnabled] = useState(false);

  // Questions state with preloading cache
  const [showQuestions, setShowQuestions] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<UserQuestion | null>(null);
  const [fallbackToStatic, setFallbackToStatic] = useState(false);
  const [questionsCache, setQuestionsCache] = useState<UserQuestion[]>([]);
  const [cacheIndex, setCacheIndex] = useState(0);
  const [isLoadingCache, setIsLoadingCache] = useState(false);

  // Polling interval for checking AI questions availability
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Draggable overlay position (for questions)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Drag-to-action state
  const [isDragging, setIsDragging] = useState(false);
  const [dragFingerPosition, setDragFingerPosition] = useState({ x: 0, y: 0 });
  const [dragCurrentZone, setDragCurrentZone] = useState<'delete' | 'pause' | 'save' | null>(null);
  const dragFingerOpacity = useRef(new Animated.Value(0)).current;
  const dragDeleteZoneOpacity = useRef(new Animated.Value(0)).current;
  const dragSaveZoneOpacity = useRef(new Animated.Value(0)).current;

  // Long press state
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressPosition, setLongPressPosition] = useState({ x: 0, y: 0 });
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Validation modal state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pendingVideoUri, setPendingVideoUri] = useState<string | null>(null);

  // ✅ NEW: Recording controls state (3 buttons: Delete, Resume, Save)
  const [showRecordingControls, setShowRecordingControls] = useState(false);

  // ❌ REMOVED: Swipe gesture state (not working, reverting to old button interface)

  // PanResponder for draggable question overlay
  const questionPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Drag-to-action zones
  const DELETE_ZONE_X = screenWidth * 0.2; // Left 20% of screen
  const SAVE_ZONE_X = screenWidth * 0.8;   // Right 20% of screen

  const determineDragZone = (x: number): 'delete' | 'pause' | 'save' => {
    if (x < DELETE_ZONE_X) return 'delete';
    if (x > SAVE_ZONE_X) return 'save';
    return 'pause';
  };

  // PanResponder for drag-to-action controls (only when recording)
  // ⚠️ IMPORTANT: Use useMemo to recreate when isRecording changes to avoid stale closures
  const dragPanResponder = useMemo(() => {
    console.log('🔄 [DRAG] Creating PanResponder with isRecording:', isRecording);

    return PanResponder.create({
      onStartShouldSetPanResponder: () => {
        console.log('🔍 [DRAG] onStartShouldSetPanResponder, isRecording:', isRecording);
        return isRecording;
      },
      onMoveShouldSetPanResponder: () => {
        console.log('🔍 [DRAG] onMoveShouldSetPanResponder, isRecording:', isRecording);
        return isRecording;
      },

      onPanResponderGrant: (event) => {
        if (!isRecording) {
          console.log('⚠️ [DRAG] Grant ignored - not recording');
          return;
        }

        const { pageX, pageY } = event.nativeEvent;
        console.log('👆 [DRAG] Touch started at:', pageX, pageY);

        setIsDragging(true);
        setDragFingerPosition({ x: pageX, y: pageY });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Fade in finger indicator and zones
        Animated.parallel([
          Animated.timing(dragFingerOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(dragDeleteZoneOpacity, {
            toValue: 0.7,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(dragSaveZoneOpacity, {
            toValue: 0.7,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      },

      onPanResponderMove: (event) => {
        if (!isRecording) return;

        const { pageX, pageY } = event.nativeEvent;
        setDragFingerPosition({ x: pageX, y: pageY });

        // Determine which zone we're in
        const zone = determineDragZone(pageX);

        if (zone !== dragCurrentZone) {
          setDragCurrentZone(zone);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          console.log('🎯 [DRAG] Entered zone:', zone);
        }
      },

      onPanResponderRelease: () => {
        if (!isRecording) return;

        console.log('🎯 [DRAG] Released in zone:', dragCurrentZone);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Fade out all UI
        Animated.parallel([
          Animated.timing(dragFingerOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(dragDeleteZoneOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(dragSaveZoneOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Execute action based on zone
        switch (dragCurrentZone) {
          case 'delete':
            console.log('🗑️ [DRAG] Executing DELETE');
            handleSwipeDelete();
            break;
          case 'save':
            console.log('💾 [DRAG] Executing SAVE');
            handleSwipeSave();
            break;
          case 'pause':
            console.log('⏸️ [DRAG] Executing PAUSE');
            handleCenterPress();
            break;
        }

        // Reset state
        setIsDragging(false);
        setDragCurrentZone(null);
      },

      onPanResponderTerminate: () => {
        setIsDragging(false);
        setDragCurrentZone(null);
        Animated.parallel([
          Animated.timing(dragFingerOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(dragDeleteZoneOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(dragSaveZoneOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      },
    });
  }, [isRecording, dragCurrentZone]); // Recreate when isRecording or dragCurrentZone changes

  // Refs
  // ✅ SOLUTION 2: sharedCameraRef is now sharedCameraRef from CameraContext (shared between TAB and MODAL)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCancellingRef = useRef(false); // Flag pour indiquer qu'on annule (ne pas sauvegarder)
  const recordAsyncActiveRef = useRef(false); // ⚠️ Track if recordAsync() Promise is active
  const isStoppingRef = useRef(false); // ⚠️ Prevent double-stop calls

  // Protection contre race conditions pour preloadQuestionsCache
  const preloadPromiseRef = useRef<Promise<void> | null>(null);
  const isPreloadingRef = useRef(false);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;

          // Avertissement à 28 minutes (1680 secondes)
          if (newTime === 1680) {
            Alert.alert(
              '⏰ Attention',
              'Il vous reste 2 minutes d\'enregistrement avant la limite de 30 minutes.',
              [{ text: 'OK' }]
            );
          }

          // Avertissement à 29min30s (1770 secondes)
          if (newTime === 1770) {
            Alert.alert(
              '⏰ Dernières secondes',
              '30 secondes restantes avant l\'arrêt automatique.',
              [{ text: 'OK' }]
            );
          }

          return newTime;
        });
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // ✅ ONLY check permissions in MODAL (not in TAB)
  useEffect(() => {
    const isModal = route.params?.isModal;

    // Skip permission check for TAB instance entirely
    if (!isModal) {
      console.log('⏭️ TAB instance - skipping permission check entirely');
      return;
    }

    // Skip permission check if recording already started
    if (isRecording) {
      console.log('⚠️ Skipping permission check - recording in progress');
      return;
    }

    if (!cameraPermission?.granted || !microphonePermission?.granted) {
      console.log('🔍 MODAL: Checking permissions on mount...');
      checkAllPermissions();
    } else {
      console.log('✅ MODAL: Permissions already granted, skipping check');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize questions system on mount
  useEffect(() => {
    initializeQuestions();
  }, []);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        console.log('🧹 Cleaning up polling interval');
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // ✅ SOLUTION 2: Handle camera location switch when modal closes
  useFocusEffect(
    useCallback(() => {
      console.log(`🎥 [SOLUTION 2] ${myLocation.toUpperCase()} gained focus, cameraLocation:`, cameraLocation);

      // When MODAL loses focus (closes), switch camera back to TAB
      return () => {
        if (isModal && cameraLocation === 'modal') {
          console.log('🎥 [SOLUTION 2] MODAL closing, switching camera location: modal → tab');
          setCameraLocation('tab');
        }
      };
    }, [isModal, cameraLocation, setCameraLocation, myLocation])
  );

  const initializeQuestions = async () => {
    try {
      console.log('🔄 Initializing questions system...');
      await UserQuestionsService.initializeQuestionsIfNeeded();
      console.log('✅ Questions system initialized');

      // Preload 30 questions into cache for instant access
      await preloadQuestionsCache();
    } catch (error) {
      console.error('❌ Failed to initialize questions:', error);
      setFallbackToStatic(true);
    }
  };

  /**
   * Start polling for AI questions when in static fallback mode
   */
  const startPollingForAIQuestions = () => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    console.log('🔄 Starting polling for AI questions...');

    // Check every 3 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const questions = await UserQuestionsService.getUnusedQuestions();
        if (questions.length > 0) {
          console.log('🎉 AI questions now available! Switching back from static...');
          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          // Reload cache with AI questions
          await preloadQuestionsCache();
        }
      } catch (error) {
        console.error('⚠️ Polling error (non-critical):', error);
      }
    }, 3000); // Check every 3 seconds
  };

  /**
   * Preload 30 questions into cache for instant access
   * This eliminates latency when user clicks on question button
   */
  const preloadQuestionsCache = async (): Promise<void> => {
    // ✅ Si déjà en cours, retourner la Promise existante (pattern de deduplication)
    if (preloadPromiseRef.current) {
      console.log('🔄 Questions already loading, returning existing promise');
      return preloadPromiseRef.current;
    }

    // ✅ Protection atomique avec ref (synchrone, pas de race condition)
    if (isPreloadingRef.current) {
      console.log('⏸️ Questions preload already in progress');
      return;
    }

    isPreloadingRef.current = true;

    const loadPromise = (async () => {
      try {
        setIsLoadingCache(true);

        // ✅ Vérifier d'abord le cache local AsyncStorage
        try {
          const cachedData = await AsyncStorage.getItem(QUESTIONS_CACHE_KEY);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const cacheAge = Date.now() - parsed.timestamp;

            if (cacheAge < CACHE_EXPIRY_MS) {
              console.log('✅ Using cached questions from AsyncStorage (age: ' + Math.round(cacheAge / 1000) + 's)');
              setQuestionsCache(parsed.questions);
              setCacheIndex(0);
              setFallbackToStatic(false);
              return; // Cache valide, pas besoin de fetch
            } else {
              console.log('⏰ Cache expired, fetching fresh questions');
            }
          }
        } catch (storageError) {
          console.warn('⚠️ AsyncStorage read error, fetching fresh:', storageError);
        }

        // Sinon, fetch depuis Supabase
        console.log('📦 Fetching fresh questions from server...');
        const questions = await UserQuestionsService.getUnusedQuestions();

        if (questions.length > 0) {
          // Take up to 30 questions for cache
          const questionsToCache = questions.slice(0, 30);
          setQuestionsCache(questionsToCache);
          setCacheIndex(0);
          setFallbackToStatic(false); // Switch back to AI questions
          console.log(`✅ Preloaded ${questionsToCache.length} questions into cache`);

          // ✅ Sauvegarder dans AsyncStorage
          try {
            await AsyncStorage.setItem(QUESTIONS_CACHE_KEY, JSON.stringify({
              questions: questionsToCache,
              timestamp: Date.now()
            }));
            console.log('💾 Questions cached to AsyncStorage');
          } catch (storageError) {
            console.warn('⚠️ AsyncStorage write error:', storageError);
          }
        } else {
          console.log('⚠️ No AI questions available for cache, will use static');
          setFallbackToStatic(true);
          startPollingForAIQuestions(); // Start checking for AI questions
        }
      } catch (error) {
        console.error('❌ Error preloading questions cache:', error);
        setFallbackToStatic(true);
        startPollingForAIQuestions(); // Start checking for AI questions
        throw error; // Re-throw pour que les appelants puissent gérer l'erreur
      } finally {
        setIsLoadingCache(false);
        isPreloadingRef.current = false;
        preloadPromiseRef.current = null; // Reset pour permettre futurs appels
      }
    })();

    preloadPromiseRef.current = loadPromise;
    return loadPromise;
  };

  // Orientation listener
  useEffect(() => {
    const setupOrientation = async () => {
      // Get current orientation
      const currentOrientation = await ScreenOrientation.getOrientationAsync();
      setOrientation(currentOrientation);

      // Listen for orientation changes
      const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
        console.log('📱 Orientation changed:', event.orientationInfo.orientation);
        setOrientation(event.orientationInfo.orientation);
      });

      return () => {
        ScreenOrientation.removeOrientationChangeListener(subscription);
      };
    };

    setupOrientation();
  }, []);

  // Camera ready timeout - force ready after 5 seconds if no callback
  useEffect(() => {
    if (cameraPermission?.granted && microphonePermission?.granted && !isCameraReady) {
      const timeoutStart = Date.now();
      console.log('⏰ [TIMING] Starting 5-second camera ready timeout at:', timeoutStart);

      const timeout = setTimeout(() => {
        const timeoutEnd = Date.now();
        console.log('⚠️ [TIMEOUT] Camera timeout FIRED after', timeoutEnd - timeoutStart, 'ms');
        console.log('⚠️ [TIMEOUT] Forcing isCameraReady = true');
        console.log('⚠️ [STATE] onCameraReady was never called (camera may not be ready!)');
        setIsCameraReady(true);
      }, 5000);

      return () => {
        console.log('🧹 [CLEANUP] Clearing camera ready timeout (onCameraReady was called)');
        clearTimeout(timeout);
      };
    }
  }, [cameraPermission?.granted, microphonePermission?.granted, isCameraReady]);

  // Track if we're in autoStart mode to ignore touch events
  const isAutoStarting = useRef(false);

  // ✅ PHASE 2: Simplified AUTO-START - No TAB camera polling needed
  // Timeline:
  // 1. Modal opens with autoStart: true
  // 2. MODAL camera mounts and triggers onCameraReady
  // 3. Wait 500ms for camera stabilization (reduced from 1500ms)
  // 4. Start recording
  useEffect(() => {
    const autoStart = route.params?.autoStart;

    console.log('🔍 [AUTOSTART] useEffect triggered:', {
      autoStart,
      isRecording,
      isCameraReady,
      timestamp: Date.now(),
      sharedCameraRef: !!sharedCameraRef.current
    });

    // Only trigger when all conditions are met
    if (autoStart && !isRecording && isCameraReady && sharedCameraRef.current) {
      console.log('🎬 [AUTOSTART] All conditions met!');
      console.log('   - autoStart:', autoStart);
      console.log('   - isRecording:', isRecording);
      console.log('   - isCameraReady:', isCameraReady);
      console.log('   - sharedCameraRef.current:', !!sharedCameraRef.current);

      // ⚠️ SET FLAG to ignore touch events during autoStart
      isAutoStarting.current = true;
      console.log('🔒 [AUTOSTART] Set isAutoStarting = true (touch events will be ignored)');

      // Clear the parameter to avoid repeated triggers
      navigation.setParams({ autoStart: undefined });

      const startTime = Date.now();
      console.log('⏰ [PHASE 2] Waiting 500ms for camera stabilization...');

      // ✅ PHASE 2: Simple delay (no polling) - reduced from 1500ms to 500ms
      setTimeout(() => {
        const elapsed = Date.now() - startTime;
        console.log(`✅ [PHASE 2] Camera stabilized after ${elapsed}ms`);
        console.log('🚀 [AUTOSTART] Starting recording NOW!');
        startRecording();

        // ⚠️ Wait 1 second after recording starts, then allow touch events
        setTimeout(() => {
          isAutoStarting.current = false;
          console.log('🔓 [AUTOSTART] Set isAutoStarting = false (touch events now allowed)');
        }, 1000);
      }, 500); // ✅ Reduced from 1500ms to 500ms (PHASE 2 optimization)
    }
  }, [route.params?.autoStart, isRecording, isCameraReady]);

  // Listen for navigation params to trigger recording (works even when already focused)
  useEffect(() => {
    const triggerRecording = route.params?.triggerRecording;
    const triggerStop = route.params?.triggerStop;
    const triggerCancel = route.params?.triggerCancel;

    if (triggerRecording && !isRecording && isCameraReady) {
      console.log('🔴 Trigger recording detected - starting recording...');
      // Clear the parameter to avoid repeated triggers
      navigation.setParams({ triggerRecording: undefined });

      // Start recording
      handleCenterPress();
    }

    if (triggerStop && isRecording) {
      console.log('⏹️ Trigger stop detected - stopping recording...');
      // Clear the parameter to avoid repeated triggers
      navigation.setParams({ triggerStop: undefined });

      // Stop recording
      handleStopPress();
    }

    if (triggerCancel && isRecording) {
      console.log('🗑️ Trigger cancel detected - cancelling recording...');
      // Clear the parameter to avoid repeated triggers
      navigation.setParams({ triggerCancel: undefined });

      // Cancel recording
      cancelRecording();
    }
  }, [route.params?.triggerRecording, route.params?.triggerStop, route.params?.triggerCancel, isRecording, isCameraReady]);

  const checkAllPermissions = async () => {
    try {
      console.log('🔍 Starting permission check...');
      console.log('🔍 [STATE] cameraPermission hook:', cameraPermission);

      // Camera permission
      if (!cameraPermission?.granted) {
        console.log('📷 Hook says not granted, requesting camera permission...');
        const cameraResult = await requestCameraPermission();
        console.log('📷 Camera permission result:', cameraResult);

        if (!cameraResult.granted) {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera access in Settings to use the camera.',
            [{ text: 'OK' }]
          );
          return;
        }

        // ✅ Check if permissions were ALREADY granted at system level
        // If hook returned null but requestPermission returns granted immediately,
        // it means permissions were already granted - NO REMOUNT NEEDED!
        console.log('✅ Permissions granted - checking if remount is needed...');
        console.log('🔍 [CHECK] recordAsyncActiveRef:', recordAsyncActiveRef.current);
        console.log('🔍 [CHECK] isRecording:', isRecording);

        // ⚠️ NEVER remount camera if:
        // 1. recordAsync() is active (would break the Promise)
        // 2. Recording is in progress
        // 3. Modal instance (route.params.isModal) with autoStart
        const isModalWithAutoStart = route.params?.isModal && route.params?.autoStart;

        if (recordAsyncActiveRef.current || isRecording || isModalWithAutoStart) {
          console.log('⚠️ Skipping camera remount - recordAsync active, recording in progress, or modal autoStart');
          console.log('   - recordAsyncActiveRef:', recordAsyncActiveRef.current);
          console.log('   - isRecording:', isRecording);
          console.log('   - isModalWithAutoStart:', isModalWithAutoStart);
        } else {
          // Force remount camera after permission grant
          // Wait 300ms to let iOS release the previous camera session
          console.log('⏳ Waiting for iOS to release camera session...');
          await new Promise(resolve => setTimeout(resolve, 300));
          console.log('🔄 Remounting camera after permission grant');
          setCameraKey(prev => prev + 1);
        }
      } else {
        console.log('✅ Camera permission already granted via hook, skipping request');
      }

      // Microphone permission
      if (!microphonePermission?.granted) {
        console.log('🎙️ Requesting microphone permission...');
        const micResult = await requestMicrophonePermission();
        console.log('🎙️ Microphone permission result:', micResult);

        if (!micResult.granted) {
          Alert.alert(
            'Microphone Permission Required',
            'Please enable microphone access in Settings to record audio.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Media library permission (optional)
      if (!mediaLibraryPermission?.granted) {
        console.log('📱 Requesting media library permission...');
        const mediaResult = await requestMediaLibraryPermission();
        console.log('📱 Media library permission result:', mediaResult);
      }

      console.log('✅ All permissions checked');
    } catch (error) {
      console.error('❌ Permission error:', error);
      Alert.alert('Permission Error', 'Failed to request permissions. Please try again.');

      // ✅ Close modal if permission error occurred in modal
      const isModal = route.params?.isModal;
      if (isModal && navigation.canGoBack()) {
        console.log('🔙 Closing modal after permission error...');
        setTimeout(() => {
          navigation.goBack();
        }, 1000); // Wait 1 second for user to read error message
      }
    }
  };

  // Gestion de l'affichage des contrôles et de la barre de navigation
  const toggleControls = () => {
    if (!isRecording) return;

    if (showControls) {
      // Si les contrôles sont visibles, les masquer
      setShowControls(false);
      navigation.setParams({ showControls: false });

      // Clear le timeout s'il existe
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    } else {
      // Si les contrôles sont masqués, les afficher
      setShowControls(true);
      navigation.setParams({ showControls: true });

      // Clear existing timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      // Hide controls after 3 seconds
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        navigation.setParams({ showControls: false });
      }, 3000);
    }
  };

  const handleScreenTap = () => {
    if (isRecording) {
      toggleControls();
    }
  };

  // Cleanup long press timeout on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    };
  }, []);

  // Track touch start time for tap vs long press detection
  const touchStartTimeRef = useRef<number>(0);

  const handleLongPressStart = (event: any) => {
    // ⚠️ IGNORE touch events during autoStart
    if (isAutoStarting.current) {
      console.log('⚠️ [AUTOSTART] Ignoring handleLongPressStart - autoStart in progress');
      return;
    }

    const timestamp = Date.now();
    touchStartTimeRef.current = timestamp;
    const { pageX, pageY } = event.nativeEvent;

    console.log('👆 Touch started at:', pageX, pageY, 'timestamp:', timestamp);
    console.log('🔍 isRecording:', isRecording);

    // ✅ PHASE 3: INSTANT haptic feedback for immediate UX response (optimization #4)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // ✅ ALWAYS show long press indicator (whether recording or not)
    console.log('📍 Showing long press indicator');
    setIsLongPressing(true);
    setLongPressPosition({ x: pageX, y: pageY });
  };

  const handleLongPressComplete = () => {
    console.log('✅ Long press completed (0.5 seconds)');
    setIsLongPressing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const isModal = route.params?.isModal;

    // ✅ NEW: If already recording in modal → PAUSE + Show 3 buttons
    if (isModal && isRecording) {
      console.log('⏸️ Modal long press during recording: Pausing + showing controls...');
      pauseRecording();
      setShowRecordingControls(true);
      return;
    }

    // ✅ If in modal but not recording → Start recording
    if (isModal && !isRecording) {
      console.log('🎬 Modal long press: Starting recording...');
      startRecording();
      return;
    }

    // ✅ TAB instance: open modal (which will auto-start recording)
    console.log('🎬 TAB long press: Opening RecordModal...');

    // ✅ SOLUTION 2: Switch camera location from TAB to MODAL BEFORE opening modal
    console.log('🎥 [SOLUTION 2] Switching camera location: tab → modal');
    setCameraLocation('modal');

    try {
      const rootNavigation = navigation.getParent('RootStack');
      if (rootNavigation) {
        rootNavigation.navigate('RecordModal', { autoStart: true });
      } else {
        // Fallback
        let currentNav: any = navigation;
        let rootNav = currentNav;
        while (currentNav) {
          const parent = currentNav.getParent?.();
          if (parent) {
            rootNav = parent;
            currentNav = parent;
          } else {
            break;
          }
        }
        rootNav.navigate('RecordModal', { autoStart: true });
      }
    } catch (error) {
      console.error('❌ Could not open modal:', error);
      // ✅ Revert camera location if modal failed to open
      setCameraLocation('tab');
    }
  };

  const handleValidateRecording = async () => {
    // User confirmed - save the video (same as old auto-save flow)
    console.log('✅ User validated - saving video...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!pendingVideoUri) {
      console.error('❌ No video URI available');
      Alert.alert('Error', 'Failed to save video. Please try again.');

      // ✅ Close modal if save error occurred in modal
      const isModal = route.params?.isModal;
      if (isModal && navigation.canGoBack()) {
        console.log('🔙 Closing modal after save error...');
        setTimeout(() => {
          navigation.goBack();
        }, 1000); // Wait 1 second for user to read error message
      }
      return;
    }

    // Close modal immediately
    setShowValidationModal(false);

    // EXTRACTION AUDIO : Same as before
    if (Platform.OS === 'ios') {
      try {
        console.log('🎵 Extracting audio from video on iOS...');

        // Créer un objet Audio depuis la vidéo
        const { sound } = await Audio.Sound.createAsync(
          { uri: pendingVideoUri },
          { shouldPlay: false }
        );

        // Obtenir l'URI de l'audio
        const status = await sound.getStatusAsync();
        console.log('🎵 Audio extracted, status:', status);

        // Libérer la ressource
        await sound.unloadAsync();

        console.log('⚠️ Audio extraction on client not fully supported, will handle server-side');
      } catch (error) {
        console.log('❌ Audio extraction failed:', error);
      }
    }

    // Generate auto title (same as old behavior)
    const autoTitle = generateAutoTitle();

    // Sauvegarder la vidéo (EXACTLY like the old flow)
    await handleAutoSaveVideo(pendingVideoUri, autoTitle);
    setPendingVideoUri(null);

    // ✅ FERMER LE MODAL et revenir au tab Record normal
    if (navigation.canGoBack()) {
      console.log('🔙 Closing fullscreen modal...');
      navigation.goBack();
    }
  };

  const handleCancelValidation = () => {
    // User cancelled - delete the recording
    console.log('❌ User cancelled - deleting recording');
    setShowValidationModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // ✅ FERMER LE MODAL et revenir au tab Record normal
    if (navigation.canGoBack()) {
      console.log('🔙 Closing fullscreen modal...');
      navigation.goBack();
    }

    // Réinitialiser l'état d'enregistrement
    navigation.setParams({ isRecording: false });

    // Supprimer l'URI en attente sans sauvegarder
    setPendingVideoUri(null);
  };

  const handleTouchEnd = (event?: any) => {
    // ⚠️ IGNORE touch events during autoStart
    if (isAutoStarting.current) {
      console.log('⚠️ [AUTOSTART] Ignoring handleTouchEnd - autoStart in progress');
      return;
    }

    const timestamp = Date.now();
    const duration = timestamp - touchStartTimeRef.current;

    console.log('❌ Touch ended - Duration:', duration, 'ms');

    // Reset long press indicator
    setIsLongPressing(false);

    // If released before 0.5 seconds (500ms), it's a TAP not a LONG PRESS
    if (duration < 500) {
      console.log('👆 Detected as TAP (< 500ms) - toggling controls');
      if (isRecording) {
        handleScreenTap();
      }
    } else {
      console.log('✋ Released after 500ms but LongPressIndicator already handled it');
    }

    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleQuestions = async () => {
    if (!showQuestions) {
      // Charger la première question quand on ouvre
      await loadNextQuestion();
    }
    setShowQuestions(!showQuestions);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /**
   * Load next question from cache (instant, no latency)
   * Reloads cache when running low (<10 questions)
   */
  const loadNextQuestion = async () => {
    try {
      // Check if we have questions in cache
      if (questionsCache.length > 0 && cacheIndex < questionsCache.length) {
        const nextQuestion = questionsCache[cacheIndex];
        setCurrentQuestion(nextQuestion);
        setFallbackToStatic(false);
        console.log(`✅ Loaded question from cache [${cacheIndex + 1}/${questionsCache.length}]:`, nextQuestion.question_text);

        // Check if cache is running low (<10 questions left)
        const questionsLeft = questionsCache.length - cacheIndex;
        if (questionsLeft <= 10 && !isLoadingCache) {
          console.log(`⚠️ Cache running low (${questionsLeft} left), reloading in background...`);
          preloadQuestionsCache(); // Reload in background
        }
      } else {
        // Cache empty, try to reload
        console.log('⚠️ Cache empty, reloading...');
        await preloadQuestionsCache();

        // Try again from fresh cache
        if (questionsCache.length > 0) {
          setCurrentQuestion(questionsCache[0]);
          setFallbackToStatic(false);
        } else {
          // No AI questions available, use static fallback
          console.log('⚠️ No AI questions available, using static fallback');
          setFallbackToStatic(true);
          const staticQuestion = getRandomQuestion();
          setCurrentQuestion({
            id: 'static',
            user_id: '',
            question_text: staticQuestion.question,
            batch_number: 0,
            order_index: 0,
            is_used: false,
            created_at: new Date().toISOString()
          } as UserQuestion);
        }
      }
    } catch (error) {
      console.error('❌ Error loading question:', error);
      setFallbackToStatic(true);
    }
  };

  const getNewQuestion = () => {
    try {
      // Calculate next index
      const nextIndex = cacheIndex + 1;

      // Check if we have the next question in cache
      if (questionsCache.length > 0 && nextIndex < questionsCache.length) {
        // 1. AFFICHER LA PROCHAINE QUESTION IMMÉDIATEMENT (synchrone, 0ms!)
        const nextQuestion = questionsCache[nextIndex];
        setCurrentQuestion(nextQuestion);
        setCacheIndex(nextIndex);
        setFallbackToStatic(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log(`✅ Loaded question from cache [${nextIndex + 1}/${questionsCache.length}]:`, nextQuestion.question_text);

        // 2. Marquer la PRÉCÉDENTE question comme "used" en arrière-plan (non-bloquant)
        if (currentQuestion && !fallbackToStatic && currentQuestion.id !== 'static') {
          console.log('✓ Marking previous question as used (background):', currentQuestion.id);
          UserQuestionsService.markQuestionAsUsed(currentQuestion.id)
            .then(() => {
              // Check if we need to generate new questions (also in background)
              return UserQuestionsService.checkAndGenerateIfNeeded();
            })
            .catch(err => {
              console.error('❌ Background marking failed (non-critical):', err);
            });
        }

        // 3. Check if cache is running low (<10 questions left)
        const questionsLeft = questionsCache.length - nextIndex;
        if (questionsLeft <= 10 && !isLoadingCache) {
          console.log(`⚠️ Cache running low (${questionsLeft} left), reloading in background...`);
          preloadQuestionsCache(); // Reload in background
        }
      } else {
        // Cache exhausted - IMMEDIATELY show static question (0ms latency!)
        console.log('⚠️ Cache exhausted, switching to static question IMMEDIATELY');

        setFallbackToStatic(true);
        const staticQuestion = getRandomQuestion();
        setCurrentQuestion({
          id: 'static',
          user_id: '',
          question_text: staticQuestion.question,
          batch_number: 0,
          order_index: 0,
          is_used: false,
          created_at: new Date().toISOString(),
        } as UserQuestion);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Start background polling for AI questions
        startPollingForAIQuestions();

        // Also trigger cache reload in background (non-blocking)
        preloadQuestionsCache().catch(err => {
          console.error('⚠️ Background cache reload failed (non-critical):', err);
        });
      }
    } catch (error) {
      console.error('❌ Error getting new question:', error);
      // Fallback to static question on error
      setFallbackToStatic(true);
      const staticQuestion = getRandomQuestion();
      setCurrentQuestion({
        id: 'static',
        user_id: '',
        question_text: staticQuestion.question,
        batch_number: 0,
        order_index: 0,
        is_used: false,
        created_at: new Date().toISOString()
      } as UserQuestion);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const generateAutoTitle = () => {
    const titles = [
      'Réflexion du jour',
      'Moment de partage',
      'Pensées personnelles',
      'Journal vidéo',
      'Introspection',
      'Message personnel',
      'Vidéo spontanée',
      'Moment de vérité',
      'Réflexion libre',
      'Partage sincère'
    ];

    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    return `${randomTitle} - ${dateStr}`;
  };

  const pauseRecording = async () => {
    if (!sharedCameraRef.current || !isRecording) return;

    try {
      console.log('⏸️ Toggling pause state...');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Simplement basculer l'état de pause
      // Le timer s'arrêtera automatiquement grâce au useEffect
      setIsPaused(!isPaused);
      navigation.setParams({ isPaused: !isPaused });

      console.log(`📹 Recording ${!isPaused ? 'paused' : 'resumed'} (UI only)`);
    } catch (error) {
      console.error('❌ Pause state error:', error);
    }
  };

  // ✅ NEW: Resume recording (hide controls + unpause)
  const handleResumeRecording = () => {
    console.log('▶️ Resuming recording...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowRecordingControls(false);
    setIsPaused(false);
    navigation.setParams({ isPaused: false });
  };

  const startRecording = async () => {
    // ⚠️ PROTECTION: Si recordAsync est déjà actif, ne rien faire
    if (recordAsyncActiveRef.current) {
      console.log('⚠️ startRecording: recordAsync already active, ignoring duplicate call');
      return;
    }

    if (!sharedCameraRef.current || isRecording || !isCameraReady) {
      console.log('⚠️ Cannot start recording:', {
        hasCamera: !!sharedCameraRef.current,
        isRecording,
        isCameraReady
      });

      if (!isCameraReady && !isRecording) {
        // Only show alert if NOT already recording (avoids showing during swipe controls)
        Alert.alert('Caméra non prête', 'Veuillez attendre que la caméra soit prête avant d\'enregistrer.');
      }
      return;
    }

    try {
      console.log('🔴 Starting recording...');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setShowControls(false); // Masquer les contrôles quand l'enregistrement commence

      // Notify navigation about recording state and controls visibility
      navigation.setParams({ isRecording: true, showControls: false });

      // Configuration pour forcer MP4 compatible OpenAI
      const recordingOptions = Platform.OS === 'ios' ? {
        maxDuration: 1800, // 30 minutes max (1800 secondes)
        // Options iOS pour forcer MP4
        quality: '720p', // Réduit pour taille fichier plus petite
        videoQuality: '720p',
        mirror: false, // Pas de miroir pour éviter les problèmes de codec
      } : {
        maxDuration: 1800, // 30 minutes max Android (1800 secondes)
        quality: '720p', // Qualité réduite pour Android aussi
      };

      console.log('📹 Recording options:', recordingOptions);
      console.log('📹 sharedCameraRef.current exists?', !!sharedCameraRef.current);
      console.log('📹 sharedCameraRef.current.recordAsync exists?', !!sharedCameraRef.current?.recordAsync);

      console.log('⏳ [RECORDING] Starting recordAsync...');
      console.log('🔍 [STATE] Camera state before recordAsync:', {
        isCameraReady,
        hasCamera: !!sharedCameraRef.current,
        hasCameraType: typeof sharedCameraRef.current,
        hasRecordAsync: !!sharedCameraRef.current?.recordAsync,
        hasStopRecording: !!sharedCameraRef.current?.stopRecording,
        timestamp: Date.now()
      });

      // ⚠️ Set flag BEFORE recordAsync to prevent camera remount
      recordAsyncActiveRef.current = true;
      console.log('🔒 [PROTECTION] recordAsyncActiveRef set to true');

      const recordStartTime = Date.now();
      console.log('⏱️ [TIMING] recordAsync starting at:', recordStartTime);
      console.log('🔍 [DEBUG] Camera ref ID:', sharedCameraRef.current);
      console.log('🔍 [DEBUG] Route params:', route.params);

      // ⚠️ Add timeout to detect if recordAsync is stuck
      const recordPromise = sharedCameraRef.current.recordAsync(recordingOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('recordAsync timeout after 60 seconds')), 60000);
      });

      console.log('⏳ [DEBUG] Waiting for recordAsync to resolve...');

      const video = await Promise.race([recordPromise, timeoutPromise]);

      const recordEndTime = Date.now();
      console.log('⏱️ [TIMING] recordAsync resolved after', recordEndTime - recordStartTime, 'ms');
      console.log('🎬 [SUCCESS] Got video object!');

      // ⚠️ Clear flags AFTER recordAsync completes
      recordAsyncActiveRef.current = false;
      isStoppingRef.current = false; // Reset double-stop protection
      console.log('🔓 recordAsyncActiveRef set to false - camera remount allowed');

      console.log('🎬 recordAsync completed! Video:', video);
      console.log('🔍 Video type:', typeof video);
      console.log('🔍 Video keys:', video ? Object.keys(video) : 'video is null/undefined');
      console.log('🔍 Video URI:', video?.uri);

      if (!video) {
        console.error('❌ recordAsync returned null/undefined video object');
        Alert.alert('Recording Error', 'Failed to record video. Please try again.');
        setIsRecording(false);
        setIsPaused(false);
        setShowControls(true);
        setRecordingTime(0);
        navigation.setParams({ isRecording: false, showControls: true, isPaused: false });

        // ✅ Close modal if error occurred in modal
        const isModal = route.params?.isModal;
        if (isModal && navigation.canGoBack()) {
          console.log('🔙 Closing modal after recording error (null video)...');
          setTimeout(() => {
            navigation.goBack();
          }, 1000); // Wait 1 second for user to read error message
        }
        return;
      }

      if (!video.uri) {
        console.error('❌ recordAsync returned video without URI:', JSON.stringify(video, null, 2));
        Alert.alert('Recording Error', 'Video was recorded but no file path was provided. Please try again.');
        setIsRecording(false);
        setIsPaused(false);
        setShowControls(true);
        setRecordingTime(0);
        navigation.setParams({ isRecording: false, showControls: true, isPaused: false });

        // ✅ Close modal if error occurred in modal
        const isModal = route.params?.isModal;
        if (isModal && navigation.canGoBack()) {
          console.log('🔙 Closing modal after recording error (no URI)...');
          setTimeout(() => {
            navigation.goBack();
          }, 1000); // Wait 1 second for user to read error message
        }
        return;
      }

      if (video?.uri) {
        console.log('✅ Recording completed:', video.uri);
        console.log('📹 Video details:', {
          uri: video.uri,
          codec: video.codec,
          fileType: video.uri.split('.').pop(), // Extension du fichier
        });

        // Message si arrêt automatique à 30 minutes
        if (recordingTime >= 1790) { // ~30 minutes (avec marge)
          Alert.alert(
            '🎬 Durée maximale atteinte',
            'Votre enregistrement a été automatiquement arrêté après 30 minutes.',
            [{ text: 'OK' }]
          );
        }

        // Vérifier si l'utilisateur a annulé l'enregistrement
        if (isCancellingRef.current) {
          console.log('🗑️ Recording was cancelled, not saving video');
          isCancellingRef.current = false; // Réinitialiser le flag
          return; // Ne pas sauvegarder
        }

        // Reset recording states
        setIsRecording(false);
        setIsPaused(false);
        setShowControls(true);
        setRecordingTime(0);
        navigation.setParams({ isRecording: false, showControls: true, isPaused: false });

        // ✅ Check if we should bypass the validation modal (user clicked Save button)
        const shouldBypass = (window as any).__bypassValidationModal;

        if (shouldBypass) {
          // ✅ User clicked Save - AUTO-SAVE directly without modal
          console.log('💾 [BYPASS] Auto-saving video directly (user clicked Save button)');
          (window as any).__bypassValidationModal = false; // Reset flag

          // Generate auto title
          const autoTitle = generateAutoTitle();

          // Save directly
          await handleAutoSaveVideo(video.uri, autoTitle);

          // Close modal and return to tab
          if (navigation.canGoBack()) {
            console.log('🔙 Closing fullscreen modal after auto-save...');
            navigation.goBack();
          }
        } else {
          // ✅ Normal flow: SHOW VALIDATION MODAL
          console.log('📝 Recording complete, showing validation modal...');
          setPendingVideoUri(video.uri);
          setShowValidationModal(true);
          console.log('✅ Validation modal shown with video URI ready:', video.uri);
        }
      }
    } catch (error) {
      console.error('❌ Recording error:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');

      // ⚠️ Reset flags in case of error
      recordAsyncActiveRef.current = false;
      isStoppingRef.current = false;
      console.log('🔓 recordAsyncActiveRef reset to false after error');

      // Réinitialiser l'état même en cas d'erreur
      setIsRecording(false);
      setIsPaused(false);
      setShowControls(true);
      setRecordingTime(0);
      navigation.setParams({ isRecording: false, showControls: true, isPaused: false });

      // ✅ Close modal if error occurred in modal
      const isModal = route.params?.isModal;
      if (isModal && navigation.canGoBack()) {
        console.log('🔙 Closing modal after recording error...');
        setTimeout(() => {
          navigation.goBack();
        }, 1000); // Wait 1 second for user to read error message
      }
    }
  };

  const stopRecording = async () => {
    // ⚠️ CRITICAL DEBUGGING: Log stack trace to see WHO called stopRecording
    console.log('🚨🚨🚨 stopRecording CALLED! Stack trace:');
    console.log(new Error().stack);

    // ⚠️ PROTECTION: Prevent double-stop calls
    if (isStoppingRef.current) {
      console.log('⚠️ stopRecording: Already stopping, ignoring duplicate call');
      return;
    }

    if (!sharedCameraRef.current || !isRecording) {
      console.log('⚠️ stopRecording: Skipped - sharedCameraRef:', !!sharedCameraRef.current, 'isRecording:', isRecording);
      return;
    }

    try {
      console.log('⏹️ Stopping recording...');
      console.log('🔍 sharedCameraRef.current.stopRecording exists?', !!sharedCameraRef.current.stopRecording);
      console.log('🔍 sharedCameraRef.current type:', typeof sharedCameraRef.current);

      // ⚠️ Set flag IMMEDIATELY to prevent duplicate calls
      isStoppingRef.current = true;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Stop la caméra - recordAsync() va se résoudre dans startRecording()
      console.log('🛑 Calling stopRecording on camera...');
      sharedCameraRef.current.stopRecording();
      console.log('⏹️ stopRecording called successfully - recordAsync should resolve now...');
    } catch (error) {
      console.error('❌ Stop recording error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      // Reset flag on error
      isStoppingRef.current = false;
    }
  };

  const handleCenterPress = () => {
    if (isRecording) {
      // En enregistrement : le bouton devient pause/resume
      pauseRecording();
    } else {
      // Pas en enregistrement : démarrer
      startRecording();
    }
  };

  const handleStopPress = () => {
    // Arrêter définitivement l'enregistrement
    stopRecording();
  };

  // ✅ NEW: Handle swipe "Save" - DIRECT SAVE without validation modal
  const handleSwipeSave = async () => {
    console.log('💾 [CONTROLS] User tapped Save - bypassing validation modal');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Hide controls
    setShowRecordingControls(false);

    // ✅ Set a flag to bypass the validation modal in startRecording()
    const bypassValidationRef = { current: true };

    // Store the flag globally so startRecording() can access it
    (window as any).__bypassValidationModal = true;

    // Stop recording - this will trigger recordAsync() to resolve in startRecording()
    await stopRecording();

    // Wait for recordAsync() to resolve and automatically save
    // startRecording() will check the bypass flag and skip showing the modal
    console.log('⏳ Waiting for recordAsync() to resolve...');
  };

  // ✅ NEW: Handle swipe "Delete" - same as validation modal "Delete"
  const handleSwipeDelete = async () => {
    console.log('🗑️ [CONTROLS] User tapped Delete');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Hide controls
    setShowRecordingControls(false);

    // Close validation modal if it's shown
    setShowValidationModal(false);

    // Set cancelling flag BEFORE stopping
    isCancellingRef.current = true;

    // Stop recording
    await stopRecording();

    // recordAsync() will resolve, check isCancellingRef, and skip saving
    // Wait a bit for it to complete, then close modal
    setTimeout(() => {
      // Reset recording state
      navigation.setParams({ isRecording: false });

      // Clear pending video URI
      setPendingVideoUri(null);

      // Close modal and return to tab (same as validation modal)
      if (navigation.canGoBack()) {
        console.log('🔙 Closing modal after swipe delete...');
        navigation.goBack();
      }
    }, 300);
  };

  const cancelRecording = async () => {
    if (!sharedCameraRef.current || !isRecording) return;

    // Afficher popup de confirmation
    Alert.alert(
      'Supprimer la vidéo',
      'Êtes-vous sûr de vouloir supprimer cette vidéo ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => {
            console.log('❌ Cancellation cancelled by user');
          }
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Cancelling recording...');
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              // Définir le flag pour ne pas sauvegarder
              isCancellingRef.current = true;

              // Arrêter l'enregistrement sans sauvegarder
              sharedCameraRef.current?.stopRecording();

              // Réinitialiser tous les états
              setIsRecording(false);
              setIsPaused(false);
              setShowControls(true);
              setRecordingTime(0);

              // Clear timeout if exists
              if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
                controlsTimeoutRef.current = null;
              }

              // Notify navigation about recording state
              navigation.setParams({ isRecording: false, showControls: true, isPaused: false });

              console.log('✅ Recording cancelled successfully');

              // ✅ FERMER LE MODAL et revenir au tab Record normal
              if (navigation.canGoBack()) {
                console.log('🔙 Closing fullscreen modal after cancellation...');
                navigation.goBack();
              }
            } catch (error) {
              console.error('❌ Cancel recording error:', error);
            }
          }
        }
      ]
    );
  };

  const handleLeftPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // Handle pause/menu functionality
      console.log('Left button pressed');
    }
  };

  const handleRightPress = () => {
    // Handle menu functionality
    console.log('Right button pressed');
  };

  const handleAutoSaveVideo = async (videoUri: string, title: string) => {
    try {
      console.log('💾 Auto-saving video with title:', title);

      // Get current user for backup
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get current chapter to assign video
      const currentChapter = await getCurrentChapter(user.id);
      const chapterId = currentChapter?.id;

      if (chapterId) {
        console.log('📖 Assigning video to chapter:', currentChapter.title);
      } else {
        console.log('⚠️ No current chapter - video will be unassigned');
      }

      // ÉTAPE 1: Sauvegarder d'abord localement (protection contre crash)
      const { VideoBackupService } = require('../services/videoBackupService');
      const { backupUri, videoId } = await VideoBackupService.backupVideoLocally(videoUri, title, user.id);
      console.log('✅ Video backed up locally:', backupUri);

      // ✅ ÉTAPE 2: Ajouter à la queue d'upload background (non-bloquant)
      const uploadJobId = await ImportQueueService.addRecordedVideoToQueue(
        backupUri,
        title,
        user.id,
        chapterId,
        recordingTime
      );

      console.log('✅ Video added to upload queue:', uploadJobId);

      // Show notification to user
      Alert.alert(
        '🎬 Vidéo enregistrée',
        'Votre vidéo est en cours d\'upload en arrière-plan. Vous pouvez continuer à utiliser l\'app.',
        [{ text: 'OK' }]
      );

      // Note: Background upload will handle:
      // - Upload to Supabase Storage
      // - Creating video record
      // - Creating transcription job
      // - Triggering momentum analysis
      // - Auto-generating questions
      // - Deleting local backup after success
      // User can continue using the app without waiting!

      // All post-upload tasks will be handled automatically by ImportQueueService

    } catch (error) {
      console.error('❌ Auto-save video error:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la vidéo. Veuillez réessayer.');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /* OLD UPLOAD CODE - NOW HANDLED BY ImportQueueService
      if (videoRecord.file_path.startsWith('http://') || videoRecord.file_path.startsWith('https://')) {
        try {
          let fileSize: number | undefined;
          if (videoUri.startsWith('file://') || videoUri.startsWith('/')) {
            const fileInfo = await FileSystem.getInfoAsync(videoUri);
            if (fileInfo.exists && 'size' in fileInfo) {
              fileSize = fileInfo.size;
            }
          }

          const job = await TranscriptionJobService.createTranscriptionJob(
            videoRecord.file_path,
            recordingTime || undefined,
            fileSize,
            videoRecord.id
          );

          console.log('✅ Transcription job created:', job.id);
          // Start background polling without UI updates
          TranscriptionJobService.pollJobStatus(job.id, () => {}, { maxAttempts: 40, initialDelay: 3000 });

          // 🔥 Trigger momentum analysis in background (non-blocking)
          const { data: { user } } = await supabase.auth.getUser();
          if (user && videoRecord.id) {
            console.log('🎯 Triggering momentum analysis...');
            analyzeMomentum(videoRecord.id, user.id).then((result) => {
              if (result?.success) {
                console.log('✅ Momentum updated!');
                console.log('   - New score:', result.new_momentum_score);
                console.log('   - Change:', result.score_change > 0 ? '+' : '', result.score_change);
                console.log('   - Streak:', result.new_streak, '🔥');
              }
            }).catch((err) => {
              console.log('⚠️ Momentum analysis failed (non-critical):', err);
            });
          }

          // 🔥 Trigger auto-generation of questions after transcription (non-blocking)
          console.log('🔍 Checking if question generation needed after video upload...');
          UserQuestionsService.autoGenerateAfterTranscription().catch((err) => {
            console.log('⚠️ Auto-question generation check failed (non-critical):', err);
          });
        } catch (transcriptionError) {
          console.log('⚠️ Transcription job creation failed (video still saved):', transcriptionError);
        }
      } else {
        console.log('⚠️ Video saved locally only - transcription will be processed when upload succeeds');
      }

      // Show success pop-up et naviguer vers Library
      Alert.alert(
        '✅ Vidéo enregistrée',
        `Votre vidéo "${title}" a été enregistrée avec succès.`,
        [{
          text: 'OK',
          style: 'default',
          onPress: () => {
            // Naviguer vers la galerie/library
            navigation.navigate('Library');
          }
        }]
      );
    END OF OLD CODE */

  // Obtenir le style du timer selon l'orientation
  const getTimerStyle = () => {
    const baseStyle = styles.timerContainerRecording;

    switch (orientation) {
      case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
        // Rotation 90° anti-horaire - timer sur le côté droit
        return {
          ...baseStyle,
          top: '50%' as any,
          left: undefined,
          right: 20,
          transform: [{ translateY: -50 }, { rotate: '90deg' }],
        };

      case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
        // Rotation 90° horaire - timer sur le côté gauche
        return {
          ...baseStyle,
          top: '50%' as any,
          left: 20,
          right: undefined,
          transform: [{ translateY: -50 }, { rotate: '-90deg' }],
        };

      case ScreenOrientation.Orientation.PORTRAIT_DOWN:
        // Portrait inversé - timer en haut mais inversé
        return {
          ...baseStyle,
          transform: [{ translateX: -50 }, { rotate: '180deg' }],
        };

      default: // PORTRAIT_UP
        // Position normale
        return baseStyle;
    }
  };


  // Debug logs
  console.log('🎥 RecordScreen render, camera permission:', cameraPermission);
  console.log('🎙️ RecordScreen render, microphone permission:', microphonePermission);

  // ✅ SOLUTION 2: TAB instance with REAL camera (conditional rendering)
  if (!isModal) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" hidden />
        <View
          style={styles.cameraContainerFullscreen}
          onTouchStart={handleLongPressStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {/* ✅ SOLUTION 2: Conditional camera rendering - only show if location is 'tab' */}
          {shouldShowCamera ? (
            <>
              {cameraPermission?.granted && microphonePermission?.granted ? (
                <CameraView
                  key={`camera-${cameraKey}`}
                  ref={sharedCameraRef}
                  style={styles.camera}
                  facing="front"
                  mode="video"
                  onCameraReady={() => {
                    console.log('📷 [TAB] Camera is ready');
                    setIsCameraReady(true);
                  }}
                  onMountError={(error) => {
                    console.error('❌ TAB: Camera mount error:', error);
                    setIsCameraReady(false);
                  }}
                />
              ) : (
                <View style={styles.camera}>
                  <Text style={styles.cameraPlaceholderText}>Camera loading...</Text>
                </View>
              )}
            </>
          ) : (
            // Camera is in MODAL, show placeholder
            <View style={styles.placeholderContainer}>
              <View style={styles.placeholderIconContainer}>
                <Icon name="camera" size={80} color="rgba(255, 255, 255, 0.3)" />
              </View>
              <Text style={styles.placeholderTitle}>Camera Active in Recording</Text>
              <Text style={styles.placeholderSubtitle}>Close the recording to see preview</Text>
            </View>
          )}

          {/* Long Press Indicator */}
          <LongPressIndicator
            x={longPressPosition.x}
            y={longPressPosition.y}
            duration={500}
            isActive={isLongPressing}
            onComplete={handleLongPressComplete}
            color={brandColor}
          />

          {/* Instruction text */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>Hold the screen to start recording</Text>
          </View>
        </View>
      </View>
    );
  }

  // ✅ MODAL: Full camera functionality
  // Show permission request if needed
  if (!cameraPermission?.granted) {
    console.log('❌ MODAL: Camera permission not granted, showing permission screen');
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" hidden />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission required</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={checkAllPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  console.log('✅ MODAL: Camera permission granted, showing camera view');

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" hidden />

      {/* Camera View - Mode plein écran quand en enregistrement */}
      <View
        style={isRecording ? styles.cameraContainerFullscreenRecording : styles.cameraContainerFullscreen}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* ✅ SOLUTION 2: Conditional camera rendering - only show if location is 'modal' */}
        {shouldShowCamera ? (
          cameraPermission?.granted && microphonePermission?.granted ? (
            <>
              <CameraView
                key={`camera-${cameraKey}`}
                ref={sharedCameraRef}
                style={isRecording ? styles.cameraFullscreen : styles.camera}
                facing="front"
                mode="video"
                onCameraReady={() => {
                  const readyTime = Date.now();
                  console.log('📷 [MODAL] Camera is ready at:', readyTime);
                  console.log('📷 [MODAL STATE] recordAsyncActiveRef:', recordAsyncActiveRef.current);
                  console.log('📷 [MODAL STATE] isRecording:', isRecording);
                  console.log('📷 [MODAL STATE] Previous isCameraReady:', isCameraReady);
                  setIsCameraReady(true);
                }}
                onMountError={(error) => {
                  console.error('❌ MODAL: Camera mount error:', error);
                  setIsCameraReady(false);
                }}
              />

              {/* ✅ PHASE 3: Progressive UI Skeleton (optimization #5) - shown while camera loads */}
              {!isCameraReady && (
                <View style={styles.cameraSkeletonOverlay}>
                  <View style={styles.cameraSkeletonContent}>
                    <View style={styles.cameraSkeletonIconContainer}>
                      <Icon name="camera" size={80} color="rgba(255, 255, 255, 0.2)" />
                    </View>
                    <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.6)" style={styles.cameraSkeletonLoader} />
                    <Text style={styles.cameraSkeletonText}>Preparing camera...</Text>
                    <View style={styles.cameraSkeletonProgress}>
                      <View style={styles.cameraSkeletonProgressBar} />
                    </View>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={isRecording ? styles.cameraFullscreen : styles.camera}>
              <Text style={styles.cameraPlaceholderText}>Camera loading...</Text>
            </View>
          )
        ) : (
          // Camera is in TAB, show error message (this shouldn't normally happen)
          <View style={styles.placeholderContainer}>
            <View style={styles.placeholderIconContainer}>
              <Icon name="camera" size={80} color="rgba(255, 255, 255, 0.3)" />
            </View>
            <Text style={styles.placeholderTitle}>Camera Error</Text>
            <Text style={styles.placeholderSubtitle}>Please close and reopen</Text>
          </View>
        )}

        {/* Recording Timer avec Flash (toujours visible quand en enregistrement, adapté selon l'orientation) */}
        {isRecording && (
          <View style={getTimerStyle()}>
            <View style={styles.timerContent}>
              <LiquidGlassView
                style={[
                  styles.questionButton,
                  showQuestions && styles.questionButtonActive
                ]}
                interactive={true}
              >
                <TouchableOpacity
                  style={styles.glassButtonTouchable}
                  onPress={toggleQuestions}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="helpCircle"
                    size={18}
                    color={showQuestions ? theme.colors.black : theme.colors.white}
                  />
                </TouchableOpacity>
              </LiquidGlassView>
              <LiquidGlassView
                style={styles.timerDisplay}
                interactive={false}
              >
                <View style={styles.timerDisplayContent}>
                  <View style={[
                    styles.recordingIndicator,
                    isPaused && styles.recordingIndicatorPaused
                  ]} />
                  <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
                </View>
              </LiquidGlassView>
              <LiquidGlassView
                style={[
                  styles.flashButton,
                  flashEnabled && styles.flashButtonActive
                ]}
                interactive={true}
              >
                <TouchableOpacity
                  style={styles.glassButtonTouchable}
                  onPress={toggleFlash}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="zap"
                    size={18}
                    color={flashEnabled ? theme.colors.black : theme.colors.white}
                  />
                </TouchableOpacity>
              </LiquidGlassView>
            </View>
          </View>
        )}

        {/* Flash Overlay - Film blanc pour illuminer */}
        {isRecording && flashEnabled && (
          <View style={styles.flashOverlay} pointerEvents="none" />
        )}

        {/* Long Press Indicator - Visual feedback during 0.5-second press */}
        <LongPressIndicator
          x={longPressPosition.x}
          y={longPressPosition.y}
          duration={500}
          isActive={isLongPressing}
          onComplete={handleLongPressComplete}
          color={brandColor}
        />


        {/* Questions Overlay - Draggable, déplaçable partout sur l'écran */}
        {isRecording && showQuestions && currentQuestion && (
          <Animated.View
            {...questionPanResponder.panHandlers}
            style={[
              styles.questionsOverlay,
              {
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              },
            ]}
          >
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
              <TouchableOpacity
                style={styles.newQuestionButton}
                onPress={getNewQuestion}
                activeOpacity={0.8}
              >
                <Icon
                  name="chevronRight"
                  size={20}
                  color={theme.colors.white}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>

      {/* ✅ NEW: Recording Controls (3 buttons: Delete, Resume, Save) - Liquid Glass Style */}
      {showRecordingControls && (
        <View style={[styles.recordingControlsContainer, { bottom: insets.bottom > 0 ? insets.bottom + 20 : 40 }]}>
          <View style={styles.controlsRow}>
            {/* Delete Button */}
            <LiquidGlassView
              style={styles.controlIconContainerGlass}
              interactive={true}
            >
              <TouchableOpacity
                style={styles.controlButtonTouchable}
                onPress={handleSwipeDelete}
                activeOpacity={0.7}
              >
                <Icon name="trash" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LiquidGlassView>

            {/* Resume Button (center, bigger) */}
            <LiquidGlassView
              style={styles.controlIconContainerGlassBig}
              interactive={true}
            >
              <TouchableOpacity
                style={styles.controlButtonTouchable}
                onPress={handleResumeRecording}
                activeOpacity={0.7}
              >
                <Icon name="play" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </LiquidGlassView>

            {/* Save Button */}
            <LiquidGlassView
              style={styles.controlIconContainerGlass}
              interactive={true}
            >
              <TouchableOpacity
                style={styles.controlButtonTouchable}
                onPress={handleSwipeSave}
                activeOpacity={0.7}
              >
                <Icon name="check" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LiquidGlassView>
          </View>
        </View>
      )}

      {/* Validation Modal - Apparaît après l'enregistrement */}
      {showValidationModal && (
        <View style={styles.validationModalOverlay}>
          <View style={styles.validationModalContent}>
            <Text style={styles.validationModalTitle}>Save Recording?</Text>
            <Text style={styles.validationModalMessage}>
              Would you like to save your video recording?
            </Text>
            <View style={styles.validationModalActions}>
              <TouchableOpacity
                style={[styles.validationModalButton, styles.validationDeleteButton]}
                onPress={handleCancelValidation}
                activeOpacity={0.8}
              >
                <Text style={styles.validationDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.validationModalButton, styles.validationSaveButton]}
                onPress={handleValidateRecording}
                activeOpacity={0.8}
              >
                <Text style={styles.validationSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.black,
    paddingHorizontal: theme.spacing['6'],
  },
  permissionText: {
    ...theme.typography.body,
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: theme.spacing['4'],
  },
  permissionButton: {
    backgroundColor: theme.colors.primary400,
    paddingHorizontal: theme.spacing['6'],
    paddingVertical: theme.spacing['3'],
    borderRadius: theme.layout.borderRadius.button,
  },
  permissionButtonText: {
    ...theme.typography.button,
    color: theme.colors.white,
    textAlign: 'center',
  },
  cameraContainerFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0, // Prend tout l'espace, 0 marge partout
    borderRadius: 0, // Pas de border radius pour vraiment remplir tout
    overflow: 'hidden',
  },
  cameraContainerFullscreenRecording: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0, // Prend tout l'espace, 0 marge partout en mode recording aussi
    borderRadius: 0, // Pas de borderRadius pour un vrai plein écran
  },
  camera: {
    flex: 1,
    borderRadius: 0, // Pas de border radius pour remplir tout l'espace
    overflow: 'hidden',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFullscreen: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    // Pas de borderRadius - vraiment plein écran
  },
  cameraPlaceholderText: {
    color: theme.colors.white,
    fontSize: 16,
    textAlign: 'center',
  },
  // ✅ PHASE 2: Placeholder styles (replaces TAB camera)
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  placeholderIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  placeholderSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  // ✅ PHASE 3: Camera skeleton styles (optimization #5 - progressive UI)
  cameraSkeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cameraSkeletonContent: {
    alignItems: 'center',
    gap: 20,
  },
  cameraSkeletonIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cameraSkeletonLoader: {
    marginVertical: 8,
  },
  cameraSkeletonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 4,
  },
  cameraSkeletonProgress: {
    width: 200,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 16,
  },
  cameraSkeletonProgressBar: {
    height: '100%',
    width: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  timerContainer: {
    position: 'absolute',
    top: 60, // Tout en haut de l'écran
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
    borderRadius: 20,
    zIndex: 15,
  },
  timerContainerRecording: {
    position: 'absolute',
    top: 60, // En haut même en plein écran
    left: 0,
    right: 0,
    alignItems: 'center', // Centre horizontalement le contenu
    zIndex: 20, // Plus haut que le bouton
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Espacement entre timer et flash button
    justifyContent: 'center', // Centre tout le contenu
  },
  timerDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // ✅ Light background for Liquid Glass to work
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
    borderRadius: 20,
    minWidth: 100, // Largeur minimale pour cohérence visuelle
  },
  timerDisplayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error500,
    marginRight: theme.spacing['2'],
  },
  recordingIndicatorPaused: {
    backgroundColor: theme.colors.white, // Blanc en pause
  },
  timerText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 16,
  },

  // Question button styles (identique au flash button)
  questionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // ✅ Light background for Liquid Glass to work
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionButtonInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Light background
  },
  questionButtonActive: {
    backgroundColor: theme.colors.white,
  },

  // Flash button styles
  flashButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // ✅ Light background for Liquid Glass to work
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashButtonInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Light background
  },
  flashButtonActive: {
    backgroundColor: theme.colors.white,
  },

  // Glass button touchable (inner wrapper for TouchableOpacity inside LiquidGlassView)
  glassButtonTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Flash overlay
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    zIndex: 5, // Au-dessus de la vidéo mais en dessous des contrôles
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing['6'],
    justifyContent: 'center',
  },
  modalTitle: {
    ...theme.typography.h2,
    textAlign: 'center',
    marginBottom: theme.spacing['8'],
    color: theme.colors.textPrimary,
  },
  videoTitleInput: {
    ...theme.typography.body,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.layout.borderRadius.input,
    padding: theme.spacing['4'],
    marginBottom: theme.spacing['4'],
    backgroundColor: theme.colors.white,
    color: theme.colors.textPrimary,
  },
  transcriptionStatus: {
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.layout.borderRadius.button,
    padding: theme.spacing['4'],
    marginBottom: theme.spacing['4'],
    alignItems: 'center',
  },
  transcriptionStatusText: {
    ...theme.typography.body,
    color: theme.colors.primary400,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: theme.spacing['1'],
  },
  transcriptionJobText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing['3'],
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing['4'],
    borderRadius: theme.layout.borderRadius.button,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: theme.colors.error500,
  },
  deleteButtonText: {
    ...theme.typography.button,
    color: theme.colors.white,
  },
  retryButton: {
    backgroundColor: theme.colors.gray200,
  },
  retryButtonText: {
    ...theme.typography.button,
    color: theme.colors.textPrimary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary400,
  },
  saveButtonText: {
    ...theme.typography.button,
    color: theme.colors.white,
  },

  // Questions overlay styles
  questionsOverlay: {
    position: 'absolute',
    bottom: 160, // Position initiale (draggable ensuite)
    left: 20,
    right: 20, // Padding des deux côtés pour éviter de sortir de l'écran
    zIndex: 15, // Au-dessus de tout
  },
  questionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Même transparence que le timer et les autres icônes
    borderRadius: 20,
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Espacement entre texte et bouton
  },
  questionText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontSize: 18, // Taille augmentée pour meilleure lisibilité
    fontWeight: '500',
    flexShrink: 1, // Permet au texte de se réduire si nécessaire
    lineHeight: 24, // Ligne plus haute pour meilleure lisibilité
  },
  newQuestionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Instruction text styles
  instructionContainer: {
    position: 'absolute',
    bottom: 100, // Juste au-dessus de la tab bar (environ 100px)
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Validation Modal styles
  validationModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  validationModalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: theme.spacing['6'],
    marginHorizontal: theme.spacing['6'],
    width: '80%',
    maxWidth: 400,
  },
  validationModalTitle: {
    ...theme.typography.h2,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing['2'],
  },
  validationModalMessage: {
    ...theme.typography.body,
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing['6'],
  },
  validationModalActions: {
    flexDirection: 'row',
    gap: theme.spacing['3'],
  },
  validationModalButton: {
    flex: 1,
    paddingVertical: theme.spacing['4'],
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validationDeleteButton: {
    backgroundColor: theme.colors.gray200,
  },
  validationDeleteButtonText: {
    ...theme.typography.button,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  validationSaveButton: {
    backgroundColor: theme.colors.text.primary, // Black button
  },
  validationSaveButtonText: {
    ...theme.typography.button,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },

  // ✅ NEW: Recording Controls (Liquid Glass style, no background)
  recordingControlsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 502,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24, // Espacement entre les boutons
  },
  controlIconContainerGlass: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // ✅ Light background for Liquid Glass
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIconContainerGlassBig: {
    width: 72, // ✅ Plus gros pour le bouton Resume
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // ✅ Light background for Liquid Glass
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RecordScreen;