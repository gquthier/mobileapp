import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  Platform,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { colors } from '../styles/theme';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { PromptCard } from '../components/PromptCard';
import { TranscriptionService } from '../services/transcriptionService';
import { VideoService } from '../services/videoService';

const RecordScreen: React.FC = () => {
  // Permissions hooks
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [lastVideoUri, setLastVideoUri] = useState<string | null>(null);

  // Post-recording state
  const [showPostRecording, setShowPostRecording] = useState(false);
  const [videoName, setVideoName] = useState('');

  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');

  // Remount key for iOS permission workaround
  const [cameraKey, setCameraKey] = useState(0);

  // Draggable popup state
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  const cameraRef = useRef<CameraView>(null);
  const recordingInterval = useRef<NodeJS.Timeout>();

  // Check if all permissions are granted
  const allPermissionsGranted =
    cameraPermission?.granted &&
    microphonePermission?.granted;

  // Request all permissions together
  const requestAllPermissions = useCallback(async () => {
    console.log('🔐 Requesting camera and microphone permissions...');

    try {
      const [cameraResult, micResult] = await Promise.all([
        requestCameraPermission(),
        requestMicrophonePermission(),
      ]);

      console.log('📹 Camera permission:', cameraResult.granted);
      console.log('🎙️ Microphone permission:', micResult.granted);

      // Force remount of CameraView after permission grant (iOS workaround)
      if (cameraResult.granted && micResult.granted) {
        console.log('✅ All permissions granted, remounting camera...');
        setCameraKey(prev => prev + 1);
      }

      // Optional: Request media library permission for saving
      if (cameraResult.granted && micResult.granted && !mediaLibraryPermission?.granted) {
        console.log('💾 Requesting media library permission...');
        await requestMediaLibraryPermission();
      }

    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      Alert.alert('Permission Error', 'Failed to request camera permissions. Please try again.');
    }
  }, [requestCameraPermission, requestMicrophonePermission, requestMediaLibraryPermission, mediaLibraryPermission?.granted]);

  const startRecording = async () => {
    if (!cameraRef.current || !allPermissionsGranted) {
      console.log('❌ Cannot start recording: missing permissions or camera ref');
      return;
    }

    try {
      console.log('🎬 Starting video recording...');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      const videoResult = await cameraRef.current.recordAsync({
        mirror: false, // Don't mirror front camera
        mute: false,   // Record with audio
      });

      console.log('🎥 Video recorded successfully:', {
        uri: videoResult.uri,
        duration: recordingTime,
      });

      setLastVideoUri(videoResult.uri);

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setIsRecording(false);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) {
      return;
    }

    try {
      console.log('⏹️ Stopping video recording...');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Clear timer
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }

      // Stop recording
      cameraRef.current.stopRecording();
      setIsRecording(false);
      setShowPostRecording(true);
      setVideoName(''); // Reset video name

      console.log('✅ Recording stopped, duration:', recordingTime + 's');

    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      Alert.alert('Recording Error', 'Failed to stop recording properly.');
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Transcribe video audio using OpenAI Whisper
   */
  const transcribeVideo = async (videoUri: string): Promise<string> => {
    try {
      console.log('🎤 Starting video transcription:', videoUri);
      setIsTranscribing(true);

      // Get user's preferred language for transcription
      const { AuthService } = require('../services/authService');
      const currentUser = await AuthService.getCurrentUser();
      const preferredLanguage = currentUser?.profile?.preferred_language || 'fr';

      // Force real transcription with OpenAI API - now supports direct video transcription
      console.log('🚀 Transcribing video directly with OpenAI Whisper API');

      // Transcribe video directly (OpenAI Whisper can process video files)
      console.log('🎥 Transcribing video with OpenAI...', { preferredLanguage });
      const transcriptionResult = await TranscriptionService.transcribeVideo(videoUri, {
        language: preferredLanguage,
        response_format: 'verbose_json',
        temperature: 0.2, // Lower temperature for more consistent results
      });

      console.log('✅ Video transcription completed:', {
        language: transcriptionResult.language,
        duration: transcriptionResult.duration,
        textLength: transcriptionResult.text.length,
        segmentsCount: transcriptionResult.segments?.length || 0
      });

      return transcriptionResult;
    } catch (error) {
      console.error('❌ Video transcription failed:', error);
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  };

  // Post-recording actions
  const handleValidateVideo = async () => {
    if (!videoName.trim()) {
      Alert.alert('Title required', 'Please enter a title for your video');
      return;
    }

    if (!lastVideoUri) {
      Alert.alert('Error', 'No video to save');
      return;
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('✅ Starting video save process:', { title: videoName, uri: lastVideoUri });

      // Show loading state
      Alert.alert('Processing...', 'Uploading your video to the cloud, then generating transcription');

      // Step 1: Save video to Supabase first (converts .mov to .mp4)
      console.log('📤 Saving video to Supabase...', { title: videoName, uri: lastVideoUri });

      let videoRecord = null;
      try {
        videoRecord = await VideoService.uploadVideo(lastVideoUri, videoName);
        if (videoRecord) {
          console.log('✅ Video saved successfully to Supabase:', videoRecord.id);
          console.log('🔗 Video URL:', videoRecord.file_path);
        } else {
          throw new Error('Video upload returned null');
        }
      } catch (videoError) {
        console.error('❌ Video upload failed:', videoError);
        Alert.alert(
          'Upload Failed',
          'Your video couldn\'t be saved to the cloud. Please check your connection and try again.',
          [{ text: 'OK', style: 'default' }]
        );
        return; // Exit early if video save fails
      }

      // Step 2: Transcribe using the Supabase URL (now in .mp4 format)
      let transcriptionResult = null;
      let transcriptionText = '';
      try {
        console.log('🎤 Starting transcription from Supabase URL (.mp4)...');
        transcriptionResult = await transcribeVideo(videoRecord.file_path); // Use Supabase URL instead of local URI
        transcriptionText = transcriptionResult.text;
        setTranscriptionText(transcriptionText);
        console.log('✅ Transcription generated successfully from Supabase URL');
      } catch (transcriptionError) {
        console.error('⚠️ Transcription failed, continuing without it:', transcriptionError);
        Alert.alert(
          'Transcription Failed',
          'Your video was saved but transcription could not be generated. You can try transcribing it later.',
          [{ text: 'Continue', style: 'default' }]
        );
      }

      // Step 3: Save transcription to database if we have one
      if (transcriptionResult && videoRecord) {
        try {
          console.log('💾 Saving transcription to database...');

          // Import TranscriptionDatabaseService for Supabase storage
          const { TranscriptionDatabaseService } = require('../services/transcriptionDatabaseService');

          const transcriptionData = {
            video_id: videoRecord.id,
            text: transcriptionResult.text,
            segments: transcriptionResult.segments || [],
            language: transcriptionResult.language || 'en',
            duration: transcriptionResult.duration || 0,
            processing_status: 'completed' as const
          };

          await TranscriptionDatabaseService.saveTranscription(transcriptionData);
          console.log('✅ Transcription saved to Supabase with complete data:', {
            segments: transcriptionData.segments.length,
            language: transcriptionData.language,
            duration: transcriptionData.duration
          });
        } catch (transcriptionSaveError) {
          console.warn('⚠️ Failed to save transcription, but video was saved:', transcriptionSaveError);
        }
      }

      // Success - clear the form
      setShowPostRecording(false);
      setVideoName('');

      // Show success message with cloud confirmation
      const message = transcriptionText
        ? `"${videoName}" has been saved to the cloud with transcription (${transcriptionText.length} characters)`
        : `"${videoName}" has been saved to the cloud${transcriptionText === '' ? ' (transcription failed)' : ''}`;

      Alert.alert('Success', message);
      console.log('🎉 Video save process completed successfully');
    } catch (error) {
      console.error('❌ Error saving video:', error);
      Alert.alert('Error', 'Unable to save the video. Please try again.');
    }
  };

  const handleRestartRecording = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPostRecording(false);
    setVideoName('');
    setLastVideoUri(null);
    setTranscriptionText('');
    setIsTranscribing(false);
    console.log('🔄 Restarting recording...');
  };

  const handleDeleteVideo = () => {
    Alert.alert(
      'Delete video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setShowPostRecording(false);
            setVideoName('');
            setLastVideoUri(null);
            setTranscriptionText('');
            setIsTranscribing(false);
            console.log('🗑️ Video deleted');
          },
        },
      ]
    );
  };

  // Handle drag gesture for movable popup
  const onGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    const { nativeEvent } = event;

    if (nativeEvent.oldState === State.ACTIVE) {
      // Save the final position
      lastOffset.current = {
        x: lastOffset.current.x + nativeEvent.translationX,
        y: lastOffset.current.y + nativeEvent.translationY,
      };

      // Get screen dimensions to constrain movement
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;

      // Constrain to screen bounds (assuming popup is ~320px wide and ~200px tall)
      const constrainedX = Math.max(
        -50,
        Math.min(screenWidth - 270, lastOffset.current.x)
      );
      const constrainedY = Math.max(
        50,
        Math.min(screenHeight - 250, lastOffset.current.y)
      );

      lastOffset.current = { x: constrainedX, y: constrainedY };

      // Animate to the constrained position
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: constrainedX,
          useNativeDriver: false,
        }),
        Animated.spring(translateY, {
          toValue: constrainedY,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  // Reset popup position when showing
  useEffect(() => {
    if (showPostRecording) {
      lastOffset.current = { x: 0, y: 0 };
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [showPostRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  // Log permission states for debugging
  useEffect(() => {
    console.log('🔍 Permission states:', {
      camera: cameraPermission?.granted,
      microphone: microphonePermission?.granted,
      mediaLibrary: mediaLibraryPermission?.granted,
      platform: Platform.OS,
    });
  }, [cameraPermission, microphonePermission, mediaLibraryPermission]);

  // Permission loading state
  if (!cameraPermission || !microphonePermission) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title="Record" right={<Icon name="clock" size={20} color={colors.black} />} />
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied state
  if (!allPermissionsGranted) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title="Record" right={<Icon name="clock" size={20} color={colors.black} />} />
        <View style={styles.centerContainer}>
          <View style={styles.permissionCard}>
            <Icon name="camera" size={48} color={colors.gray400} />
            <Text style={styles.permissionTitle}>Camera & Microphone Access</Text>
            <Text style={styles.permissionText}>
              Allow camera and microphone access to record your video reflections.
            </Text>

            {/* Show specific permission status */}
            <View style={styles.permissionStatus}>
              <Text style={styles.statusText}>
                📹 Camera: {cameraPermission?.granted ? '✅' : '❌'}
              </Text>
              <Text style={styles.statusText}>
                🎙️ Microphone: {microphonePermission?.granted ? '✅' : '❌'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestAllPermissions}
            >
              <Text style={styles.permissionButtonText}>Grant Permissions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Main recording interface
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TopBar title="Record" right={<Icon name="clock" size={20} color={colors.black} />} />

        {/* Camera Preview */}
        <View style={styles.cameraContainer}>
          <CameraView
            key={cameraKey} // Force remount after permission grant
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            mode="video"
          >
            {/* Recording indicator */}
            {isRecording && (
              <View style={styles.recordingOverlay}>
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
                </View>
              </View>
            )}

            {/* Camera overlay when not recording */}
            {!isRecording && !showPostRecording && (
              <View style={styles.cameraOverlay}>
                <Icon name="cameraFilled" size={40} color={colors.white} />
                <Text style={styles.overlayText}>Press to start recording</Text>
                <Text style={styles.overlaySubtext}>
                  Press again to stop • Vertical format
                </Text>
              </View>
            )}

            {/* Post-recording overlay - Draggable */}
            {showPostRecording && (
              <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}
              >
                <Animated.View
                  style={[
                    styles.postRecordingOverlay,
                    {
                      transform: [
                        { translateX: translateX },
                        { translateY: translateY },
                      ],
                    },
                  ]}
                >

                  {/* Video title input */}
                  <View style={styles.videoTitleSection}>
                    <TextInput
                      style={styles.videoTitleInput}
                      value={videoName}
                      onChangeText={setVideoName}
                      placeholder="Video title"
                      placeholderTextColor={colors.white}
                      maxLength={50}
                      returnKeyType="done"
                    />

                    {/* Action icons */}
                    {/* Transcription status */}
                    {isTranscribing && (
                      <View style={styles.transcriptionStatus}>
                        <Text style={styles.transcriptionStatusText}>🎤 Transcribing...</Text>
                      </View>
                    )}

                    {/* Action icons */}
                    <View style={styles.actionIcons}>
                      <TouchableOpacity
                        style={[styles.iconButton, isTranscribing && styles.iconButtonDisabled]}
                        onPress={handleValidateVideo}
                        activeOpacity={0.7}
                        disabled={isTranscribing}
                      >
                        <Icon name="check" size={18} color={colors.white} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.iconButton, isTranscribing && styles.iconButtonDisabled]}
                        onPress={handleRestartRecording}
                        activeOpacity={0.7}
                        disabled={isTranscribing}
                      >
                        <Icon name="rotateCcw" size={18} color={colors.white} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.iconButton, isTranscribing && styles.iconButtonDisabled]}
                        onPress={handleDeleteVideo}
                        activeOpacity={0.7}
                        disabled={isTranscribing}
                      >
                        <Icon name="trash" size={18} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              </PanGestureHandler>
            )}
          </CameraView>
        </View>

        {/* Prompts */}
        <View style={styles.promptsSection}>
          <PromptCard
            title="What to talk about today?"
            items={[
              'A win since your last video',
              'One challenge this week',
              'One small next step',
            ]}
          />
        </View>

        {/* Transcription Preview */}
        {transcriptionText && !showPostRecording && (
          <View style={styles.transcriptionPreview}>
            <Text style={styles.transcriptionTitle}>📝 Transcription</Text>
            <Text style={styles.transcriptionText} numberOfLines={3}>
              {transcriptionText}
            </Text>
          </View>
        )}

        {/* Debug info */}
        {__DEV__ && lastVideoUri && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>✅ Last recording: {lastVideoUri}</Text>
            {transcriptionText && (
              <Text style={styles.debugText}>
                🎤 Transcription: {transcriptionText.length} characters
              </Text>
            )}
          </View>
        )}

        {/* Record Button */}
        {!showPostRecording && (
          <View style={styles.recordButtonContainer}>
            <Pressable
              style={[styles.recordButton, isRecording && styles.recordButtonActive]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <View style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerActive]} />
            </Pressable>
          </View>
        )}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray600,
  },
  permissionCard: {
    alignItems: 'center',
    padding: 32,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 16,
    backgroundColor: colors.gray100,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  permissionStatus: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    color: colors.gray700,
    marginBottom: 4,
  },
  permissionButton: {
    backgroundColor: colors.black,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    aspectRatio: 9 / 16, // Vertical format
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  camera: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0000',
    marginRight: 8,
  },
  recordingTime: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  cameraOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    width: '100%',
    height: '100%',
  },
  overlayText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  overlaySubtext: {
    color: colors.white,
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
  },
  promptsSection: {
    marginBottom: 24,
  },
  debugInfo: {
    padding: 8,
    backgroundColor: colors.gray100,
    borderRadius: 8,
    marginBottom: 16,
  },
  debugText: {
    fontSize: 10,
    color: colors.gray600,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  recordButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: '#FF0000',
  },
  recordButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  recordButtonInnerActive: {
    borderRadius: 4,
    width: 24,
    height: 24,
  },
  postRecordingOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 320,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 1000,
  },
  videoTitleSection: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  videoTitleInput: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    minWidth: 120,
    paddingVertical: 4,
    marginBottom: 8,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  transcriptionStatus: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
  },
  transcriptionStatusText: {
    color: colors.white,
    fontSize: 12,
    textAlign: 'center',
  },
  transcriptionPreview: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  transcriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 12,
    color: colors.gray700,
    lineHeight: 16,
  },
});

export default RecordScreen;