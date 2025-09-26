import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { RealtimeTranscriptionService, RealtimeTranscriptionOptions } from './realtimeTranscriptionService';

export interface TranscriptionSegment {
  id: string;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface TranscriptionResult {
  task: 'transcribe';
  language: string;
  duration: number;
  text: string;
  segments: TranscriptionSegment[];
}

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

export interface StoredTranscription {
  id: string;
  video_id: string;
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
  created_at: string;
  updated_at: string;
}

export class TranscriptionService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
  private static readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit for OpenAI
  private static readonly SUPPORTED_FORMATS = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.mov'];

  // ISO-639-1 language codes supported by OpenAI Whisper
  private static readonly SUPPORTED_LANGUAGES = [
    'af', 'am', 'ar', 'as', 'az', 'ba', 'be', 'bg', 'bn', 'bo', 'br', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 'fo', 'fr', 'gl', 'gu', 'ha', 'haw', 'he', 'hi', 'hr', 'ht', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'jw', 'ka', 'kk', 'km', 'kn', 'ko', 'la', 'lb', 'ln', 'lo', 'lt', 'lv', 'mg', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'ne', 'nl', 'nn', 'no', 'oc', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 'sa', 'sd', 'si', 'sk', 'sl', 'sn', 'so', 'sq', 'sr', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tk', 'tl', 'tr', 'tt', 'uk', 'ur', 'uz', 'vi', 'yi', 'yo', 'zh'
  ];

  /**
   * Download file from URL to local storage for OpenAI API
   */
   private static async downloadFileLocally(fileUrl: string): Promise<string> {
    try {
      console.log('📥 Downloading file from URL:', fileUrl);

      // Generate local file path
      const timestamp = Date.now();
      const fileExtension = fileUrl.includes('.mp4') ? '.mp4' : '.m4a';
      const localPath = `${FileSystem.cacheDirectory}temp_audio_${timestamp}${fileExtension}`;

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(fileUrl, localPath);

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download file: ${downloadResult.status}`);
      }

      console.log('✅ File downloaded successfully:', {
        url: fileUrl,
        localPath: downloadResult.uri,
        size: downloadResult.headers['Content-Length'] || 'unknown'
      });

      return downloadResult.uri;
    } catch (error) {
      console.error('❌ Failed to download file:', error);
      throw error;
    }
  }

  /**
   * Validate and normalize language code for OpenAI Whisper API
   */
  private static validateLanguage(language?: string): string | undefined {
    if (!language) {
      return undefined; // Auto-detect language
    }

    // Handle special cases
    if (language === 'auto' || language === 'detect') {
      // Use French as default instead of auto-detect (OpenAI doesn't accept 'auto')
      console.log('🇫🇷 Using French as default language (auto → fr)');
      return 'fr';
    }

    // Convert to lowercase and check if supported
    const normalizedLang = language.toLowerCase();
    if (this.SUPPORTED_LANGUAGES.includes(normalizedLang)) {
      return normalizedLang;
    }

    // Handle common language variations
    const languageMap: { [key: string]: string } = {
      'fr-fr': 'fr', 'fr-ca': 'fr',
      'en-us': 'en', 'en-gb': 'en', 'en-au': 'en', 'en-ca': 'en',
      'es-es': 'es', 'es-mx': 'es', 'es-ar': 'es',
      'de-de': 'de', 'de-at': 'de', 'de-ch': 'de',
      'it-it': 'it',
      'pt-br': 'pt', 'pt-pt': 'pt',
      'zh-cn': 'zh', 'zh-tw': 'zh',
      'ar-sa': 'ar'
    };

    const mappedLang = languageMap[normalizedLang];
    if (mappedLang && this.SUPPORTED_LANGUAGES.includes(mappedLang)) {
      return mappedLang;
    }

    console.warn(`⚠️ Unsupported language '${language}', using auto-detection instead`);
    return undefined; // Fall back to auto-detection
  }

  /**
   * Get OpenAI API key from environment
   */
  private static getApiKey(): string {
    // Try multiple ways to get the API key
    let apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
                 Constants.expoConfig?.extra?.OPENAI_API_KEY ||
                 process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set EXPO_PUBLIC_OPENAI_API_KEY in environment variables.');
    }
    return apiKey;
  }

  /**
   * NOUVELLE VERSION: Transcribe video file using OpenAI Whisper API avec retry automatique
   */
  static async transcribeVideo(
    videoFilePath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      console.log('🚀🚀🚀 FORCE RELOAD v4.0 - DATA URI REACT NATIVE 🚀🚀🚀');
      console.log('🎥 Starting transcription with auto-retry:', { videoFilePath });

      let localFilePath = videoFilePath;

      // Step 1: Download if URL
      if (videoFilePath.startsWith('http://') || videoFilePath.startsWith('https://')) {
        console.log('⬇️ Downloading file from URL...');
        localFilePath = await this.downloadFileLocally(videoFilePath);
        console.log('✅ File downloaded to:', localFilePath);
      }

      // Step 2: Validate file exists and size
      const fileInfo = await FileSystem.getInfoAsync(localFilePath);
      if (!fileInfo.exists) {
        throw new Error('File does not exist at path: ' + localFilePath);
      }

      if (!fileInfo.size || fileInfo.size === 0) {
        throw new Error('File is empty or size could not be determined');
      }

      const fileSizeMB = fileInfo.size / 1024 / 1024;
      console.log('📁 File validation:', {
        exists: fileInfo.exists,
        size: `${fileSizeMB.toFixed(2)}MB`,
        path: localFilePath
      });

      if (fileSizeMB > 25) {
        throw new Error(`File too large for OpenAI Whisper: ${fileSizeMB.toFixed(2)}MB (max: 25MB)`);
      }

      // Step 3: Get API key
      const apiKey = this.getApiKey();
      console.log('🔑 API key available:', !!apiKey);

      // Step 4: NOUVELLE LOGIQUE - Retry avec différents formats
      const originalExtension = videoFilePath.toLowerCase().substring(videoFilePath.lastIndexOf('.'));
      const isVideoFormat = ['.mp4', '.mov', '.mpeg'].includes(originalExtension);

      // Configuration des tentatives avec différents formats
      const attempts = [
        // Tentative 1: Format original
        { mimeType: this.getMimeType(originalExtension), fileName: `video${originalExtension}`, description: 'format original' },
        // Tentative 2-4: Si vidéo, essayer comme audio
        ...(isVideoFormat ? [
          { mimeType: 'audio/mp4', fileName: 'video.m4a', description: 'audio MP4' },
          { mimeType: 'audio/mpeg', fileName: 'video.mp3', description: 'audio MPEG' },
          { mimeType: 'audio/wav', fileName: 'video.wav', description: 'audio WAV' }
        ] : [])
      ];

      console.log(`🔄 Will attempt transcription with ${attempts.length} format variations`);

      let lastError: Error | null = null;

      for (let i = 0; i < attempts.length; i++) {
        const attempt = attempts[i];
        console.log(`🔄 Tentative ${i + 1}/${attempts.length}: ${attempt.description}`);

        try {
          const result = await this.makeTranscriptionRequest(
            localFilePath,
            apiKey,
            attempt.mimeType,
            attempt.fileName,
            options
          );

          console.log(`✅ SUCCÈS avec ${attempt.description}!`);
          return result;

        } catch (error) {
          console.log(`❌ Échec tentative ${i + 1}: ${error.message}`);
          lastError = error as Error;

          // Si c'est une erreur de format et qu'on a d'autres tentatives, continuer
          if (error.message.includes('Invalid file format') && i < attempts.length - 1) {
            console.log('🔄 Trying next format...');
            continue;
          }

          // Pour les autres erreurs (401, 429, etc.), pas la peine de retry
          if (!error.message.includes('Invalid file format')) {
            throw error;
          }
        }
      }

      // Si toutes les tentatives ont échoué
      throw lastError || new Error('All transcription attempts failed');

    } catch (error) {
      console.error('❌ TRANSCRIPTION FAILED:', error);
      throw error;
    }
  }

  /**
   * Helper method to get MIME type from extension
   */
  private static getMimeType(extension: string): string {
    const mimeTypeMap: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.m4a': 'audio/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.webm': 'video/webm',
      '.mpeg': 'video/mpeg',
      '.mpga': 'audio/mpeg'
    };
    return mimeTypeMap[extension] || 'video/mp4';
  }

  /**
   * NOUVELLE APPROCHE : Upload via multipart form data raw - REACT NATIVE COMPATIBLE
   */
  private static async makeTranscriptionRequest(
    localFilePath: string,
    apiKey: string,
    mimeType: string,
    fileName: string,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    console.log('🔄 ALTERNATIVE APPROACH: Raw multipart upload...');

    // APPROCHE 1: Utiliser le fichier local directement avec un URI file://
    console.log('📁 Using local file URI approach...');

    const formData = new FormData();

    // REACT NATIVE SPECIFIC: Utiliser l'URI du fichier local directement
    formData.append('file', {
      uri: localFilePath,  // Fichier local sur le device
      type: mimeType,
      name: fileName,
    } as any);

    formData.append('model', 'whisper-1');

    // Paramètres optionnels
    if (options.language && options.language !== 'auto') {
      const validLang = this.validateLanguage(options.language);
      if (validLang) {
        formData.append('language', validLang);
      }
    }

    if (options.response_format) {
      formData.append('response_format', options.response_format);
    }

    if (options.temperature !== undefined) {
      formData.append('temperature', options.temperature.toString());
    }

    console.log('📤 Direct file URI request:', {
      localFilePath: localFilePath.substring(0, 100) + '...',
      mimeType,
      fileName,
      language: options.language
    });

    const response = await fetch(this.OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // Pas de Content-Type - laissons FormData le gérer
      },
      body: formData,
    });

    console.log('📨 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OPENAI API ERROR:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        mimeType: mimeType,
        fileName: fileName,
      });

      // Gestion d'erreurs détaillée
      let errorMessage = `OpenAI API Error ${response.status}`;
      if (response.status === 400) {
        errorMessage += ': Invalid file format or parameters. ';
        if (errorText.includes('format is not supported')) {
          errorMessage += 'File format not supported by Whisper API.';
        } else if (errorText.includes('could not be decoded')) {
          errorMessage += 'File is corrupted or not a valid media file.';
        }
      } else if (response.status === 401) {
        errorMessage += ': Invalid or expired API key.';
      } else if (response.status === 413) {
        errorMessage += ': File too large (max 25MB).';
      } else if (response.status === 429) {
        errorMessage += ': Rate limit exceeded. Please wait and try again.';
      } else {
        errorMessage += ': ' + errorText;
      }

      throw new Error(errorMessage);
    }

    const result: TranscriptionResult = await response.json();
    console.log('✅ SUCCESS! Text length:', result.text.length);

    return result;
  }

  // ... (reste des méthodes inchangées: storeTranscription, getTranscription, etc.)
  // Copiez le reste des méthodes de l'ancien fichier si nécessaire

  /**
   * Store transcription in database
   */
  static async storeTranscription(
    videoId: string,
    transcriptionResult: TranscriptionResult
  ): Promise<StoredTranscription> {
    try {
      console.log('💾 Storing transcription in database:', { videoId });

      const transcriptionData = {
        video_id: videoId,
        text: transcriptionResult.text,
        segments: transcriptionResult.segments || [],
        language: transcriptionResult.language,
        duration: transcriptionResult.duration,
      };

      const { data, error } = await supabase
        .from('transcriptions')
        .insert(transcriptionData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error storing transcription:', error);
        throw error;
      }

      console.log('✅ Transcription stored successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Failed to store transcription:', error);
      throw error;
    }
  }

  /**
   * Get transcription for a video
   */
  static async getTranscription(videoId: string): Promise<StoredTranscription | null> {
    try {
      console.log('📖 Retrieving transcription for video:', videoId);

      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No transcription found
          return null;
        }
        console.error('❌ Database error retrieving transcription:', error);
        throw error;
      }

      console.log('✅ Transcription retrieved successfully');
      return data;
    } catch (error) {
      console.error('❌ Failed to retrieve transcription:', error);
      throw error;
    }
  }

  /**
   * Search transcriptions by text
   */
  static async searchTranscriptions(
    query: string,
    userId?: string
  ): Promise<StoredTranscription[]> {
    try {
      console.log('🔍 Searching transcriptions:', { query, userId });

      let queryBuilder = supabase
        .from('transcriptions')
        .select(`
          *,
          videos (
            id,
            title,
            created_at,
            user_id
          )
        `)
        .textSearch('text', query, {
          type: 'websearch',
          config: 'english'
        });

      if (userId) {
        queryBuilder = queryBuilder.eq('videos.user_id', userId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('❌ Database error searching transcriptions:', error);
        throw error;
      }

      console.log('✅ Found transcriptions:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Failed to search transcriptions:', error);
      throw error;
    }
  }

  /**
   * Delete transcription
   */
  static async deleteTranscription(transcriptionId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting transcription:', transcriptionId);

      const { error } = await supabase
        .from('transcriptions')
        .delete()
        .eq('id', transcriptionId);

      if (error) {
        console.error('❌ Database error deleting transcription:', error);
        throw error;
      }

      console.log('✅ Transcription deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete transcription:', error);
      throw error;
    }
  }
}