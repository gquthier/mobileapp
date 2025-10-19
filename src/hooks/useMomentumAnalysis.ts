// ============================================================================
// useMomentumAnalysis Hook
// Description: Hook pour déclencher l'analyse Momentum après transcription
// Usage: À intégrer dans RecordScreen après l'upload d'une vidéo
// ============================================================================

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MomentumAnalysisResult, MomentumAnalysisPayload } from '../types/momentum';
import { getActiveLifeAreas } from '../services/lifeAreasService';

interface UseMomentumAnalysisReturn {
  analyzeMomentum: (videoId: string, userId: string) => Promise<MomentumAnalysisResult | null>;
  isAnalyzing: boolean;
  error: string | null;
}

/**
 * Hook pour analyser le momentum après une vidéo
 *
 * @example
 * ```tsx
 * const { analyzeMomentum, isAnalyzing } = useMomentumAnalysis();
 *
 * // Après upload + transcription
 * const result = await analyzeMomentum(videoId, userId);
 * if (result?.success) {
 *   console.log('Score change:', result.score_change);
 * }
 * ```
 */
export function useMomentumAnalysis(): UseMomentumAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyse le momentum d'une vidéo
   * Attend automatiquement que la transcription soit complétée
   */
  const analyzeMomentum = useCallback(
    async (videoId: string, userId: string): Promise<MomentumAnalysisResult | null> => {
      try {
        setIsAnalyzing(true);
        setError(null);

        console.log('🎯 Starting momentum analysis for video:', videoId);

        // 1. Attendre que la transcription soit complétée (max 60 secondes)
        const transcription = await waitForTranscription(videoId);

        if (!transcription) {
          throw new Error('Transcription not available after timeout');
        }

        console.log('✅ Transcription ready, length:', transcription.length);

        // 2. Récupérer les life areas actifs de l'utilisateur
        const lifeAreas = await getActiveLifeAreas(userId);
        const lifeAreaKeys = lifeAreas.map((area) => area.area_key);

        console.log('🎯 Active life areas:', lifeAreaKeys);

        // 3. Vérifier que l'utilisateur a des life areas configurés
        if (lifeAreaKeys.length === 0) {
          console.warn('⚠️ User has no life areas configured, skipping momentum analysis');
          return null;
        }

        // 4. Appeler l'Edge Function analyze-momentum
        const payload: MomentumAnalysisPayload = {
          video_id: videoId,
          user_id: userId,
          transcription,
          life_areas: lifeAreaKeys,
        };

        console.log('📡 Calling analyze-momentum Edge Function...');

        const { data, error: functionError } = await supabase.functions.invoke('analyze-momentum', {
          body: payload,
        });

        if (functionError) {
          console.error('❌ Edge Function error:', functionError);
          throw new Error(`Momentum analysis failed: ${functionError.message}`);
        }

        if (!data.success) {
          console.error('❌ Analysis returned error:', data.error);
          throw new Error(data.error || 'Unknown error');
        }

        console.log('✅ Momentum analysis completed successfully');
        console.log('   - Previous score:', data.previous_score);
        console.log('   - New score:', data.new_momentum_score);
        console.log('   - Change:', data.score_change);
        console.log('   - New streak:', data.new_streak);

        return data as MomentumAnalysisResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Error in analyzeMomentum:', errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  return {
    analyzeMomentum,
    isAnalyzing,
    error,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Attend que la transcription soit complétée (avec timeout)
 * Vérifie toutes les 2 secondes pendant max 60 secondes
 */
async function waitForTranscription(videoId: string): Promise<string | null> {
  const MAX_ATTEMPTS = 30; // 30 × 2s = 60 seconds max
  const RETRY_DELAY = 2000; // 2 seconds

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    console.log(`🔍 Checking transcription (attempt ${attempt + 1}/${MAX_ATTEMPTS})...`);

    // Récupérer le job de transcription
    const { data: jobs, error } = await supabase
      .from('transcription_jobs')
      .select('status, transcription_text')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Error fetching transcription job:', error);
      return null;
    }

    if (!jobs || jobs.length === 0) {
      console.log('⏳ No transcription job found yet, waiting...');
      await sleep(RETRY_DELAY);
      continue;
    }

    const job = jobs[0];

    // Vérifier le statut
    if (job.status === 'completed' && job.transcription_text) {
      console.log('✅ Transcription completed');
      return job.transcription_text;
    } else if (job.status === 'failed') {
      console.error('❌ Transcription job failed');
      return null;
    } else {
      console.log(`⏳ Transcription status: ${job.status}, waiting...`);
      await sleep(RETRY_DELAY);
    }
  }

  console.warn('⚠️ Transcription timeout after 60 seconds');
  return null;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// USAGE EXAMPLE FOR RECORDSCREEN
// ============================================================================

/**
 * INTEGRATION DANS RecordScreen.tsx:
 *
 * 1. Importer le hook:
 * ```tsx
 * import { useMomentumAnalysis } from '../hooks/useMomentumAnalysis';
 * ```
 *
 * 2. Initialiser dans le component:
 * ```tsx
 * const { analyzeMomentum, isAnalyzing } = useMomentumAnalysis();
 * ```
 *
 * 3. Appeler après l'upload de la vidéo (dans la fonction saveVideo):
 * ```tsx
 * const saveVideo = async () => {
 *   // ... existing upload logic ...
 *
 *   if (uploadedVideo) {
 *     console.log('Video uploaded successfully:', uploadedVideo.id);
 *
 *     // NOUVEAU: Déclencher l'analyse momentum (non-blocking)
 *     analyzeMomentum(uploadedVideo.id, currentUser.id).then((result) => {
 *       if (result?.success) {
 *         console.log('✅ Momentum updated! New score:', result.new_momentum_score);
 *         console.log('   Change:', result.score_change);
 *         console.log('   Streak:', result.new_streak);
 *
 *         // Optionnel: Afficher une notification toast
 *         // showToast(`Momentum ${result.score_change > 0 ? '+' : ''}${result.score_change}`);
 *       }
 *     });
 *
 *     // Continue avec la navigation normale
 *     navigation.goBack();
 *   }
 * };
 * ```
 *
 * 4. Optionnel - Afficher un indicateur de chargement:
 * ```tsx
 * {isAnalyzing && (
 *   <View style={styles.analyzingIndicator}>
 *     <ActivityIndicator size="small" color="#007AFF" />
 *     <Text>Analyse du momentum...</Text>
 *   </View>
 * )}
 * ```
 *
 * IMPORTANT:
 * - L'analyse se fait en arrière-plan (non-blocking)
 * - L'utilisateur peut continuer à naviguer pendant l'analyse
 * - L'analyse attend automatiquement la fin de la transcription
 * - Si l'utilisateur n'a pas configuré ses life areas, l'analyse est skippée
 */
