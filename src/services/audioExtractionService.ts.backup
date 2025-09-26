import * as FileSystem from 'expo-file-system';
import { FFmpegKit, FFprobeKit, ReturnCode } from 'ffmpeg-kit-react-native';

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
   * Initialize temporary directory for audio processing
   */
  private static async initTempDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.TEMP_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.TEMP_DIR, { intermediates: true });
        console.log('📁 Created temporary audio directory:', this.TEMP_DIR);
      }
    } catch (error) {
      console.error('❌ Failed to create temporary directory:', error);
      throw error;
    }
  }

  /**
   * Get video file information using FFprobe
   */
  static async getVideoInfo(videoPath: string): Promise<AudioInfo> {
    try {
      console.log('📊 Getting video information:', videoPath);

      const command = `-v quiet -print_format json -show_format -show_streams "${videoPath}"`;

      const session = await FFprobeKit.execute(command);
      const returnCode = await session.getReturnCode();

      if (!ReturnCode.isSuccess(returnCode)) {
        const logs = await session.getAllLogsAsString();
        throw new Error(`FFprobe failed: ${logs}`);
      }

      const output = await session.getOutput();
      const info = JSON.parse(output);

      // Find audio stream
      const audioStream = info.streams.find((stream: any) => stream.codec_type === 'audio');
      if (!audioStream) {
        throw new Error('No audio stream found in video file');
      }

      const duration = parseFloat(info.format.duration) || 0;
      const bitrate = parseInt(audioStream.bit_rate) || 0;
      const sampleRate = parseInt(audioStream.sample_rate) || 0;
      const channels = parseInt(audioStream.channels) || 0;
      const size = parseInt(info.format.size) || 0;

      const audioInfo: AudioInfo = {
        duration,
        format: audioStream.codec_name,
        bitrate,
        sampleRate,
        channels,
        size,
      };

      console.log('✅ Video info extracted:', {
        duration: `${duration.toFixed(2)}s`,
        format: audioInfo.format,
        bitrate: `${Math.round(bitrate / 1000)}kbps`,
        sampleRate: `${sampleRate}Hz`,
        channels: channels === 1 ? 'mono' : 'stereo',
        size: `${(size / 1024 / 1024).toFixed(2)}MB`,
      });

      return audioInfo;
    } catch (error) {
      console.error('❌ Failed to get video info:', error);
      throw error;
    }
  }

  /**
   * Extract audio from video file
   */
  static async extractAudio(
    videoPath: string,
    options: AudioExtractionOptions = {}
  ): Promise<string> {
    try {
      console.log('🎵 Starting audio extraction:', { videoPath, options });

      // Initialize temp directory
      await this.initTempDirectory();

      // Set default options optimized for transcription
      const {
        outputFormat = 'm4a',
        bitrate = '64k',
        sampleRate = '16000', // Whisper works best with 16kHz
        channels = 1, // Mono is sufficient for speech recognition
      } = options;

      // Generate output filename
      const timestamp = Date.now();
      const outputPath = `${this.TEMP_DIR}extracted_audio_${timestamp}.${outputFormat}`;

      // Build FFmpeg command
      // Optimized for speech recognition: mono, 16kHz, 64kbps
      const command = [
        `-i "${videoPath}"`,
        '-vn', // No video
        '-acodec', outputFormat === 'mp3' ? 'libmp3lame' : outputFormat === 'wav' ? 'pcm_s16le' : 'aac',
        '-ar', sampleRate, // Sample rate
        '-ac', channels.toString(), // Audio channels
        '-b:a', bitrate, // Bitrate
        '-y', // Overwrite output file
        `"${outputPath}"`
      ].join(' ');

      console.log('⚙️ Running FFmpeg command:', command);

      const session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();

      if (!ReturnCode.isSuccess(returnCode)) {
        const logs = await session.getAllLogsAsString();
        console.error('❌ FFmpeg extraction failed:', logs);
        throw new Error(`Audio extraction failed: ${logs}`);
      }

      // Verify output file exists
      const outputInfo = await FileSystem.getInfoAsync(outputPath);
      if (!outputInfo.exists) {
        throw new Error('Audio extraction completed but output file not found');
      }

      console.log('✅ Audio extracted successfully:', {
        outputPath,
        size: outputInfo.size ? `${(outputInfo.size / 1024 / 1024).toFixed(2)}MB` : 'unknown',
        format: outputFormat,
        sampleRate: `${sampleRate}Hz`,
        channels: channels === 1 ? 'mono' : 'stereo',
        bitrate,
      });

      return outputPath;
    } catch (error) {
      console.error('❌ Audio extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract and optimize audio for transcription
   */
  static async extractAudioForTranscription(videoPath: string): Promise<string> {
    try {
      console.log('🎤 Extracting audio optimized for transcription');

      // Use optimal settings for speech recognition
      return await this.extractAudio(videoPath, {
        outputFormat: 'm4a',
        bitrate: '64k',
        sampleRate: '16000', // Whisper's optimal sample rate
        channels: 1, // Mono for speech
      });
    } catch (error) {
      console.error('❌ Failed to extract audio for transcription:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary audio files
   */
  static async cleanupTempFiles(olderThanMinutes: number = 60): Promise<void> {
    try {
      console.log('🧹 Cleaning up temporary audio files...');

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
          console.warn('⚠️ Failed to clean file:', filePath, error);
        }
      }

      console.log(`✅ Cleaned up ${cleanedCount} temporary audio files`);
    } catch (error) {
      console.error('❌ Failed to cleanup temporary files:', error);
      // Don't throw - cleanup failures shouldn't break the app
    }
  }

  /**
   * Delete specific temporary file
   */
  static async deleteTempFile(filePath: string): Promise<void> {
    try {
      console.log('🗑️ Deleting temporary audio file:', filePath);

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        console.log('✅ Temporary file deleted successfully');
      }
    } catch (error) {
      console.error('❌ Failed to delete temporary file:', error);
      // Don't throw - deletion failures shouldn't break the app
    }
  }

  /**
   * Convert audio between formats
   */
  static async convertAudio(
    inputPath: string,
    outputFormat: 'mp3' | 'm4a' | 'wav',
    options: Partial<AudioExtractionOptions> = {}
  ): Promise<string> {
    try {
      console.log('🔄 Converting audio format:', { inputPath, outputFormat });

      await this.initTempDirectory();

      const {
        bitrate = '64k',
        sampleRate = '16000',
        channels = 1,
      } = options;

      const timestamp = Date.now();
      const outputPath = `${this.TEMP_DIR}converted_audio_${timestamp}.${outputFormat}`;

      const command = [
        `-i "${inputPath}"`,
        '-acodec', outputFormat === 'mp3' ? 'libmp3lame' : outputFormat === 'wav' ? 'pcm_s16le' : 'aac',
        '-ar', sampleRate,
        '-ac', channels.toString(),
        '-b:a', bitrate,
        '-y',
        `"${outputPath}"`
      ].join(' ');

      const session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();

      if (!ReturnCode.isSuccess(returnCode)) {
        const logs = await session.getAllLogsAsString();
        throw new Error(`Audio conversion failed: ${logs}`);
      }

      const outputInfo = await FileSystem.getInfoAsync(outputPath);
      if (!outputInfo.exists) {
        throw new Error('Audio conversion completed but output file not found');
      }

      console.log('✅ Audio converted successfully:', {
        outputPath,
        size: outputInfo.size ? `${(outputInfo.size / 1024 / 1024).toFixed(2)}MB` : 'unknown',
      });

      return outputPath;
    } catch (error) {
      console.error('❌ Audio conversion failed:', error);
      throw error;
    }
  }

  /**
   * Get optimal audio settings for transcription
   */
  static getTranscriptionSettings(): AudioExtractionOptions {
    return {
      outputFormat: 'm4a', // Good compression, supported by OpenAI
      bitrate: '64k', // Good quality for speech
      sampleRate: '16000', // Whisper's optimal sample rate
      channels: 1, // Mono sufficient for speech
    };
  }
}