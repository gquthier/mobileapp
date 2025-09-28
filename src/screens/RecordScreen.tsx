import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  Dimensions,
  StatusBar,
  Modal,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { theme } from '../styles';
import { VideoService } from '../services/videoService';
import { SecureTranscriptionService } from '../services/secureTranscriptionService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const RecordScreen: React.FC = ({ route, navigation }: any) => {
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

  // Camera state
  const [cameraKey, setCameraKey] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Refs
  const cameraRef = useRef<CameraView>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
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
    };
  }, [isRecording]);

  // Check permissions on mount
  useEffect(() => {
    checkAllPermissions();
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
      if (triggerRecording) {
        // Clear the parameter to avoid repeated triggers
        navigation.setParams({ triggerRecording: undefined });

        // Toggle recording state
        handleCenterPress();
      }
    }, [route.params?.triggerRecording, cameraPermission, microphonePermission])
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

  const startRecording = async () => {
    if (!cameraRef.current || isRecording || !isCameraReady) {
      console.log('⚠️ Cannot start recording:', {
        hasCamera: !!cameraRef.current,
        isRecording,
        isCameraReady
      });
      return;
    }

    try {
      console.log('🔴 Starting recording...');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setIsRecording(true);
      setRecordingTime(0);

      // Notify navigation about recording state
      navigation.setParams({ isRecording: true });

      const video = await cameraRef.current.recordAsync({
        maxDuration: 300, // 5 minutes max
      });

      if (video?.uri) {
        console.log('✅ Recording completed:', video.uri);
        setLastVideoUri(video.uri);
        setShowPostRecording(true);
        setVideoName(`Video ${new Date().toLocaleDateString()}`);
      }
    } catch (error) {
      console.error('❌ Recording error:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    } finally {
      setIsRecording(false);
      // Notify navigation about recording state
      navigation.setParams({ isRecording: false });
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
      stopRecording();
    } else {
      startRecording();
    }
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

  const handleSaveVideo = async () => {
    if (!lastVideoUri || !videoName.trim()) return;

    try {
      setIsTranscribing(true);
      console.log('💾 Saving video with title:', videoName);

      // Save video to database and storage using VideoService
      const videoRecord = await VideoService.uploadVideo(lastVideoUri, videoName.trim());

      if (!videoRecord) {
        throw new Error('Failed to save video');
      }

      console.log('✅ Video saved:', videoRecord);

      // Start transcription process (optional - non-blocking)
      SecureTranscriptionService.transcribeVideoFromLocalFile(videoRecord.id, lastVideoUri, 'fr')
        .then(() => {
          console.log('✅ Transcription started in background');
        })
        .catch((error) => {
          console.warn('⚠️ Transcription failed to start:', error);
          // Non-blocking - video is still saved successfully
        });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPostRecording(false);
      setLastVideoUri(null);
      setVideoName('');
    } catch (error) {
      console.error('❌ Save error:', error);
      Alert.alert('Save Error', 'Failed to save video. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRetryRecording = () => {
    setShowPostRecording(false);
    setLastVideoUri(null);
    setVideoName('');
  };

  const handleDeleteVideo = () => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setShowPostRecording(false);
            setLastVideoUri(null);
            setVideoName('');
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

      {/* Camera View - Always fullscreen */}
      <View style={styles.cameraContainerFullscreen}>
        {cameraPermission?.granted && microphonePermission?.granted ? (
          <CameraView
            key={`camera-${cameraKey}`}
            ref={cameraRef}
            style={styles.camera}
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
          <View style={styles.camera}>
            <Text style={styles.cameraPlaceholderText}>Camera loading...</Text>
          </View>
        )}

        {/* Recording Timer (only shown when recording) */}
        {isRecording && (
          <View style={styles.timerContainer}>
            <View style={styles.recordingIndicator} />
            <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
          </View>
        )}
      </View>

      {/* Post-Recording Modal */}
      <Modal
        visible={showPostRecording}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPostRecording(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Video</Text>

            <TextInput
              style={styles.videoTitleInput}
              value={videoName}
              onChangeText={setVideoName}
              placeholder="Enter video title..."
              placeholderTextColor={theme.colors.textTertiary}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteVideo}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.retryButton]}
                onPress={handleRetryRecording}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveVideo}
                disabled={!videoName.trim() || isTranscribing}
              >
                <Text style={styles.saveButtonText}>
                  {isTranscribing ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingBottom: 24,
  },
  camera: {
    flex: 1,
    borderRadius: theme.layout?.borderRadius?.xl || 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error500,
    marginRight: theme.spacing['2'],
  },
  timerText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 16,
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
    marginBottom: theme.spacing['8'],
    backgroundColor: theme.colors.white,
    color: theme.colors.textPrimary,
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
});

export default RecordScreen;