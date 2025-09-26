import * as FileSystem from 'expo-file-system/legacy';

// TEMPORARY MOCK VERSION FOR EXPO GO COMPATIBILITY
// This version provides mock functionality until development build is created

export interface AudioExtractionOptions {
  outputFormat?: 'mp3' | 'm4a' | 'wav';
  bitrate?: '16k' | '32k' | '64k' | '128k';
  sampleRate?: '16000' | '22050' | '44100' | '48000';
  channels?: 1 | 2; // mono or stereo
}

export interface AudioInfo {
  duration: number;
  format: string;
  bitrate: number;
  sampleRate: number;
  channels: number;
  size: number;
}

export class AudioExtractionService {
  private static readonly TEMP_DIR = `${FileSystem.cacheDirectory}audio/`;

  /**
   * MOCK: Initialize temporary directory for audio processing
   */
  private static async initTempDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.TEMP_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.TEMP_DIR, { intermediates: true });
        console.log('📁 [MOCK] Created temporary audio directory:', this.TEMP_DIR);
      }
    } catch (error) {
      console.error('❌ [MOCK] Failed to create temporary directory:', error);
      throw error;
    }
  }

  /**
   * MOCK: Get video file information
   */
  static async getVideoInfo(videoPath: string): Promise<AudioInfo> {
    try {
      console.log('📊 [MOCK] Getting video information:', videoPath);

      // Mock response
      const audioInfo: AudioInfo = {
        duration: 30, // Mock 30 seconds
        format: 'aac',
        bitrate: 64000,
        sampleRate: 16000,
        channels: 1,
        size: 1024 * 1024, // 1MB mock
      };

      console.log('✅ [MOCK] Video info extracted:', {
        duration: `${audioInfo.duration.toFixed(2)}s`,
        format: audioInfo.format,
        bitrate: `${Math.round(audioInfo.bitrate / 1000)}kbps`,
        sampleRate: `${audioInfo.sampleRate}Hz`,
        channels: audioInfo.channels === 1 ? 'mono' : 'stereo',
        size: `${(audioInfo.size / 1024 / 1024).toFixed(2)}MB`,
      });

      return audioInfo;
    } catch (error) {
      console.error('❌ [MOCK] Failed to get video info:', error);
      throw error;
    }
  }

  /**
   * Extract audio from video file (uses video file directly for transcription)
   */
  static async extractAudio(
    videoPath: string,
    options: AudioExtractionOptions = {}
  ): Promise<string> {
    try {
      console.log('🎵 Starting audio extraction:', { videoPath, options });

      // For Expo Go compatibility, we'll return the video path directly
      // The transcription service will handle the video file format
      console.log('✅ Audio extraction complete - using video file directly for transcription');

      return videoPath;
    } catch (error) {
      console.error('❌ Audio extraction failed:', error);
      throw error;
    }
  }

  /**
   * MOCK: Extract and optimize audio for transcription
   */
  static async extractAudioForTranscription(videoPath: string): Promise<string> {
    try {
      console.log('🎤 [MOCK] Extracting audio optimized for transcription');
      return await this.extractAudio(videoPath, {
        outputFormat: 'm4a',
        bitrate: '64k',
        sampleRate: '16000',
        channels: 1,
      });
    } catch (error) {
      console.error('❌ [MOCK] Failed to extract audio for transcription:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary audio files
   */
  static async cleanupTempFiles(olderThanMinutes: number = 60): Promise<void> {
    try {
      console.log('🧹 [MOCK] Cleaning up temporary audio files...');

      const dirInfo = await FileSystem.getInfoAsync(this.TEMP_DIR);
      if (!dirInfo.exists) {
        return;
      }

      const files = await FileSystem.readDirectoryAsync(this.TEMP_DIR);
      const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000);

      let cleanedCount = 0;
      for (const file of files) {
        const filePath = `${this.TEMP_DIR}${file}`;
        try {
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists && fileInfo.modificationTime && fileInfo.modificationTime < cutoffTime) {
            await FileSystem.deleteAsync(filePath);
            cleanedCount++;
          }
        } catch (error) {
          console.warn('⚠️ [MOCK] Failed to clean file:', filePath, error);
        }
      }

      console.log(`✅ [MOCK] Cleaned up ${cleanedCount} temporary audio files`);
    } catch (error) {
      console.error('❌ [MOCK] Failed to cleanup temporary files:', error);
    }
  }

  /**
   * Delete specific temporary file
   */
  static async deleteTempFile(filePath: string): Promise<void> {
    try {
      console.log('🗑️ [MOCK] Deleting temporary audio file:', filePath);

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        console.log('✅ [MOCK] Temporary file deleted successfully');
      }
    } catch (error) {
      console.error('❌ [MOCK] Failed to delete temporary file:', error);
    }
  }

  /**
   * MOCK: Convert audio between formats
   */
  static async convertAudio(
    inputPath: string,
    outputFormat: 'mp3' | 'm4a' | 'wav',
    options: Partial<AudioExtractionOptions> = {}
  ): Promise<string> {
    try {
      console.log('🔄 [MOCK] Converting audio format:', { inputPath, outputFormat });

      await this.initTempDirectory();

      const timestamp = Date.now();
      const outputPath = `${this.TEMP_DIR}converted_audio_${timestamp}.${outputFormat}`;

      // Mock: Create dummy converted file
      await FileSystem.writeAsStringAsync(outputPath, 'MOCK_CONVERTED_AUDIO_DATA');

      console.log('✅ [MOCK] Audio converted successfully:', {
        outputPath,
        size: '0.1MB',
      });

      return outputPath;
    } catch (error) {
      console.error('❌ [MOCK] Audio conversion failed:', error);
      throw error;
    }
  }

  /**
   * Get optimal audio settings for transcription
   */
  static getTranscriptionSettings(): AudioExtractionOptions {
    return {
      outputFormat: 'm4a',
      bitrate: '64k',
      sampleRate: '16000',
      channels: 1,
    };
  }
}