import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { theme } from '../styles';
import { Icon } from '../components/Icon';
import { VideoService } from '../services/videoService';
import { TranscriptionJobService, TranscriptionJob } from '../services/transcriptionJobService';
import { getRandomQuestion, IntrospectionQuestion } from '../data/introspectionQuestions';
import { UserQuestionsService, UserQuestion } from '../services/userQuestionsService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const RecordScreen: React.FC = ({ route, navigation }: any) => {
  // Permissions hooks
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Camera state
  const [cameraKey, setCameraKey] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Recording UI state
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Orientation state
  const [orientation, setOrientation] = useState<ScreenOrientation.Orientation>(
    ScreenOrientation.Orientation.PORTRAIT_UP
  );

  // Flash state
  const [flashEnabled, setFlashEnabled] = useState(false);

  // Questions state
  const [showQuestions, setShowQuestions] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<UserQuestion | null>(null);
  const [fallbackToStatic, setFallbackToStatic] = useState(false);

  // Refs
  const cameraRef = useRef<CameraView>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
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

  // Check permissions on mount
  useEffect(() => {
    checkAllPermissions();
  }, []);

  // Initialize questions system on mount
  useEffect(() => {
    initializeQuestions();
  }, []);

  const initializeQuestions = async () => {
    try {
      console.log('🔄 Initializing questions system...');
      await UserQuestionsService.initializeQuestionsIfNeeded();
      console.log('✅ Questions system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize questions:', error);
      setFallbackToStatic(true);
    }
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
      const timeout = setTimeout(() => {
        console.log('⚠️ Camera timeout - forcing ready state');
        setIsCameraReady(true);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [cameraPermission?.granted, microphonePermission?.granted, isCameraReady]);

  // Listen for navigation params to trigger recording
  useFocusEffect(
    useCallback(() => {
      console.log('📱 RecordScreen focused, permissions:', {
        camera: cameraPermission?.granted,
        microphone: microphonePermission?.granted
      });

      const triggerRecording = route.params?.triggerRecording;
      const triggerStop = route.params?.triggerStop;

      if (triggerRecording) {
        // Clear the parameter to avoid repeated triggers
        navigation.setParams({ triggerRecording: undefined });

        // Toggle recording state
        handleCenterPress();
      }

      if (triggerStop && isRecording) {
        // Clear the parameter to avoid repeated triggers
        navigation.setParams({ triggerStop: undefined });

        // Stop recording
        handleStopPress();
      }
    }, [route.params?.triggerRecording, route.params?.triggerStop, isRecording, cameraPermission, microphonePermission])
  );

  const checkAllPermissions = async () => {
    try {
      console.log('🔍 Starting permission check...');

      // Camera permission
      if (!cameraPermission?.granted) {
        console.log('📷 Requesting camera permission...');
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

        // Force remount camera after permission grant
        console.log('🔄 Remounting camera after permission grant');
        setCameraKey(prev => prev + 1);
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

  const loadNextQuestion = async () => {
    try {
      console.log('📥 Loading next question...');
      const nextQuestion = await UserQuestionsService.getNextQuestion();

      if (nextQuestion) {
        setCurrentQuestion(nextQuestion);
        setFallbackToStatic(false);
        console.log('✅ Loaded AI question:', nextQuestion.question_text);
      } else {
        // Fallback to static questions if no AI questions available
        console.log('⚠️ No AI questions available, using static fallback');
        setFallbackToStatic(true);
        const staticQuestion = getRandomQuestion();
        // Convert static question to UserQuestion format
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
    } catch (error) {
      console.error('❌ Error loading question:', error);
      setFallbackToStatic(true);
    }
  };

  const getNewQuestion = async () => {
    try {
      // If we have a current AI question, mark it as used
      if (currentQuestion && !fallbackToStatic && currentQuestion.id !== 'static') {
        console.log('✓ Marking current question as used:', currentQuestion.id);
        await UserQuestionsService.markQuestionAsUsed(currentQuestion.id);

        // Check if we need to generate new questions
        await UserQuestionsService.checkAndGenerateIfNeeded();
      }

      // Load next question
      await loadNextQuestion();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    if (!cameraRef.current || !isRecording) return;

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

  const startRecording = async () => {
    if (!cameraRef.current || isRecording || !isCameraReady) {
      console.log('⚠️ Cannot start recording:', {
        hasCamera: !!cameraRef.current,
        isRecording,
        isCameraReady
      });

      if (!isCameraReady) {
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
        maxDuration: 300, // 5 minutes max
        // Options iOS pour forcer MP4
        quality: '720p', // Réduit pour taille fichier plus petite
        videoQuality: '720p',
        mirror: false, // Pas de miroir pour éviter les problèmes de codec
      } : {
        maxDuration: 300, // 5 minutes max Android
        quality: '720p', // Qualité réduite pour Android aussi
      };

      console.log('📹 Recording options:', recordingOptions);

      const video = await cameraRef.current.recordAsync(recordingOptions);

      if (video?.uri) {
        console.log('✅ Recording completed:', video.uri);
        console.log('📹 Video details:', {
          uri: video.uri,
          codec: video.codec,
          fileType: video.uri.split('.').pop(), // Extension du fichier
        });

        // NOUVELLE APPROCHE : Extraire l'audio sur l'iPhone
        if (Platform.OS === 'ios') {
          try {
            console.log('🎵 Extracting audio from video on iOS...');

            // Créer un objet Audio depuis la vidéo
            const { sound } = await Audio.Sound.createAsync(
              { uri: video.uri },
              { shouldPlay: false }
            );

            // Obtenir l'URI de l'audio
            const status = await sound.getStatusAsync();
            console.log('🎵 Audio extracted, status:', status);

            // Libérer la ressource
            await sound.unloadAsync();

            // Note: Pour l'instant on garde l'URI vidéo originale
            // car expo-av ne permet pas d'exporter directement l'audio
            // On va améliorer côté serveur à la place
            console.log('⚠️ Audio extraction on client not fully supported, will handle server-side');
          } catch (error) {
            console.log('❌ Audio extraction failed:', error);
          }
        }

        // Réinitialiser l'état d'enregistrement immédiatement
        setIsRecording(false);
        setIsPaused(false);
        setShowControls(true);
        setRecordingTime(0);

        // Clear timeout if exists
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
          controlsTimeoutRef.current = null;
        }

        // Notify navigation about recording state and controls visibility
        navigation.setParams({ isRecording: false, showControls: true, isPaused: false });

        // Sauvegarder automatiquement avec un titre généré (après réinitialisation de l'état)
        const autoTitle = generateAutoTitle();
        await handleAutoSaveVideo(video.uri, autoTitle);
      }
    } catch (error) {
      console.error('❌ Recording error:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');

      // Réinitialiser l'état même en cas d'erreur
      setIsRecording(false);
      setIsPaused(false);
      setShowControls(true);
      setRecordingTime(0);
      navigation.setParams({ isRecording: false, showControls: true, isPaused: false });
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      console.log('⏹️ Stopping recording...');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      cameraRef.current.stopRecording();
      // Notify navigation about recording state
      navigation.setParams({ isRecording: false });
    } catch (error) {
      console.error('❌ Stop recording error:', error);
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

      // Save video to database and storage using VideoService
      const videoRecord = await VideoService.uploadVideo(videoUri, title);

      if (!videoRecord) {
        throw new Error('Failed to save video');
      }

      console.log('✅ Video saved:', videoRecord);

      // Start transcription process in background (no UI blocking)
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
      } catch (transcriptionError) {
        console.log('⚠️ Transcription job creation failed (video still saved):', transcriptionError);
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

  // Obtenir le style du timer selon l'orientation
  const getTimerStyle = () => {
    const baseStyle = styles.timerContainerRecording;

    switch (orientation) {
      case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
        // Rotation 90° anti-horaire - timer sur le côté droit
        return {
          ...baseStyle,
          top: '50%',
          left: 'auto',
          right: 20,
          transform: [{ translateY: -50 }, { rotate: '90deg' }],
        };

      case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
        // Rotation 90° horaire - timer sur le côté gauche
        return {
          ...baseStyle,
          top: '50%',
          left: 20,
          right: 'auto',
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

  // Show permission request if needed
  if (!cameraPermission?.granted) {
    console.log('❌ Camera permission not granted, showing permission screen');
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

  console.log('✅ Camera permission granted, showing camera view');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" hidden />

      {/* Camera View - Mode plein écran quand en enregistrement */}
      <TouchableOpacity
        style={isRecording ? styles.cameraContainerFullscreenRecording : styles.cameraContainerFullscreen}
        activeOpacity={1}
        onPress={handleScreenTap}
        disabled={!isRecording}
      >
        {cameraPermission?.granted && microphonePermission?.granted ? (
          <CameraView
            key={`camera-${cameraKey}`}
            ref={cameraRef}
            style={isRecording ? styles.cameraFullscreen : styles.camera}
            facing="front"
            mode="video"
            onCameraReady={() => {
              console.log('📷 Camera is ready!');
              setIsCameraReady(true);
            }}
            onMountError={(error) => {
              console.error('❌ Camera mount error:', error);
              setIsCameraReady(false);
            }}
          />
        ) : (
          <View style={isRecording ? styles.cameraFullscreen : styles.camera}>
            <Text style={styles.cameraPlaceholderText}>Camera loading...</Text>
          </View>
        )}

        {/* Recording Timer avec Flash (toujours visible quand en enregistrement, adapté selon l'orientation) */}
        {isRecording && (
          <View style={getTimerStyle()}>
            <View style={styles.timerContent}>
              <TouchableOpacity
                style={[
                  styles.questionButton,
                  showQuestions ? styles.questionButtonActive : styles.questionButtonInactive
                ]}
                onPress={toggleQuestions}
                activeOpacity={0.7}
              >
                <Icon
                  name="helpCircle"
                  size={18}
                  color={showQuestions ? theme.colors.black : theme.colors.white}
                />
              </TouchableOpacity>
              <View style={styles.timerDisplay}>
                <View style={[
                  styles.recordingIndicator,
                  isPaused && styles.recordingIndicatorPaused
                ]} />
                <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.flashButton,
                  flashEnabled ? styles.flashButtonActive : styles.flashButtonInactive
                ]}
                onPress={toggleFlash}
                activeOpacity={0.7}
              >
                <Icon
                  name="zap"
                  size={18}
                  color={flashEnabled ? theme.colors.black : theme.colors.white}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Flash Overlay - Film blanc pour illuminer */}
        {isRecording && flashEnabled && (
          <View style={styles.flashOverlay} pointerEvents="none" />
        )}

        {/* Questions Overlay - Affichage en bas de l'écran */}
        {isRecording && showQuestions && currentQuestion && (
          <View style={styles.questionsOverlay}>
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
          </View>
        )}
      </TouchableOpacity>

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
    flex: 1,
    position: 'relative',
    paddingTop: 60,
    paddingHorizontal: 12, // Marges latérales réduites
    paddingBottom: 100, // Marge inférieure augmentée pour ne pas dépasser la barre de navigation
  },
  cameraContainerFullscreenRecording: {
    flex: 1,
    position: 'relative',
    // Pas de padding - vraiment plein écran
  },
  camera: {
    flex: 1,
    borderRadius: theme.layout?.borderRadius?.xl || 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
    borderRadius: 20,
    minWidth: 100, // Largeur minimale pour cohérence visuelle
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionButtonInactive: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  questionButtonActive: {
    backgroundColor: theme.colors.white,
  },

  // Flash button styles
  flashButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashButtonInactive: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  flashButtonActive: {
    backgroundColor: theme.colors.white,
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
    bottom: 160, // Un peu plus haut sur l'écran
    left: 20,
    right: 20,
    zIndex: 15, // Au-dessus de tout
  },
  questionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Même transparence que le timer et les autres icônes
    borderRadius: 20,
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  newQuestionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RecordScreen;