// 🔒 TRANSCRIPTION SERVICE SÉCURISÉ - REDIRECTION UNIQUEMENT
// Ce fichier redirige toutes les demandes vers le service sécurisé

import { SecureTranscriptionService } from './secureTranscriptionService';

/**
 * ⚠️ DEPRECATED: Service de transcription legacy
 *
 * UTILISEZ DIRECTEMENT SecureTranscriptionService OU useSecureTranscription hook
 *
 * Ce service est maintenu uniquement pour la compatibilité.
 * Toutes les transcriptions passent maintenant par l'Edge Function sécurisée.
 */

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

export interface TranscriptionResult {
  task: 'transcribe';
  language: string;
  duration: number;
  text: string;
  segments: Array<{
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
  }>;
}

export class TranscriptionService {

  /**
   * ⚠️ DEPRECATED: Utilisez SecureTranscriptionService.transcribeVideoFromLocalFile()
   *
   * @param videoFilePath - Chemin local du fichier vidéo
   * @param options - Options de transcription
   * @returns Résultat de transcription
   */
  static async transcribeVideo(
    videoFilePath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {

    console.warn('⚠️ DEPRECATED: TranscriptionService.transcribeVideo() is deprecated');
    console.warn('✅ Use SecureTranscriptionService.transcribeVideoFromLocalFile() instead');

    throw new Error(`
🚨 ERREUR DE SÉCURITÉ: Transcription directe désactivée

Cette méthode appelait directement l'API OpenAI, ce qui expose vos clés API.

✅ SOLUTION SÉCURISÉE:
1. Utilisez SecureTranscriptionService.transcribeVideoFromLocalFile()
2. Ou utilisez le hook useSecureTranscription()

Exemple:
import { SecureTranscriptionService } from './secureTranscriptionService';

await SecureTranscriptionService.transcribeVideoFromLocalFile(
  videoId,
  videoFilePath,
  '${options.language || 'fr'}'
);

Cette approche:
- ✅ Upload vers Supabase Storage
- ✅ Transcription via Edge Function sécurisée
- ✅ Pas d'exposition des clés API
- ✅ Traitement serveur avec vrais fichiers binaires
    `);
  }

  /**
   * ⚠️ DEPRECATED: Utilisez SecureTranscriptionService.getTranscription()
   */
  static async getTranscription(videoId: string) {
    console.warn('⚠️ DEPRECATED: Use SecureTranscriptionService.getTranscription() instead');
    return await SecureTranscriptionService.getTranscription(videoId);
  }

  /**
   * ⚠️ DEPRECATED: Utilisez SecureTranscriptionService.searchTranscriptions()
   */
  static async searchTranscriptions(query: string, userId?: string) {
    console.warn('⚠️ DEPRECATED: Use SecureTranscriptionService.searchTranscriptions() instead');
    return await SecureTranscriptionService.searchTranscriptions(query, userId);
  }
}

// Export pour compatibilité avec le code existant
export default TranscriptionService;