// ============================================================================
// Supabase Edge Function: analyze-momentum
// Description: Analyse une transcription vidéo et met à jour le Momentum Score
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES
// ============================================================================

interface AnalyzeMomentumRequest {
  video_id: string;
  user_id: string;
  transcription: string;
  life_areas: string[]; // Liste des area_keys actifs
}

interface OpenAIAnalysisResponse {
  momentum_impact: number;
  energy_level: number;
  action_score: number;
  clarity_score: number;
  future_focus_ratio: number;
  present_focus_ratio: number;
  life_areas_impact: Record<string, number>;
  key_patterns: string[];
  ai_summary: string;
  suggested_actions: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const PROMPT_ID = 'pmpt_68ded9d0b5388194a29e05980fdd8b100fe698cab1707573';
const OPENAI_MODEL = 'gpt-4.1-nano';

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Parse request body
    const { video_id, user_id, transcription, life_areas }: AnalyzeMomentumRequest =
      await req.json();

    console.log('📊 Analyzing momentum for video:', video_id);
    console.log('👤 User:', user_id);
    console.log('🎯 Life areas:', life_areas);
    console.log('📝 Transcription length:', transcription.length);

    // 2. Validate inputs
    if (!video_id || !user_id || !transcription) {
      throw new Error('Missing required fields: video_id, user_id, or transcription');
    }

    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // 3. Prepare OpenAI request with Responses API
    const openaiPayload = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: `Voici la transcription de ma vidéo du jour:\n\n${transcription}\n\nDomaines de vie que je tracke: ${life_areas.join(', ')}`,
        },
      ],
      prompt_id: PROMPT_ID,
      response_format: { type: 'json_object' },
    };

    console.log('🤖 Calling OpenAI Responses API...');

    // 4. Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiPayload),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('✅ OpenAI response received');

    // 5. Parse AI analysis
    const aiContent = openaiData.choices[0].message.content;
    const analysis: OpenAIAnalysisResponse = JSON.parse(aiContent);

    console.log('📈 Momentum impact:', analysis.momentum_impact);
    console.log('⚡ Energy level:', analysis.energy_level);

    // 6. Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // 7. Save video analysis to database
    const { data: videoAnalysis, error: analysisError } = await supabaseClient
      .from('video_analysis')
      .insert([
        {
          video_id,
          user_id,
          momentum_impact: analysis.momentum_impact,
          energy_level: analysis.energy_level,
          action_score: analysis.action_score,
          clarity_score: analysis.clarity_score,
          future_focus_ratio: analysis.future_focus_ratio,
          present_focus_ratio: analysis.present_focus_ratio,
          life_areas_impact: analysis.life_areas_impact,
          ai_summary: analysis.ai_summary,
          key_patterns: analysis.key_patterns,
          suggested_actions: analysis.suggested_actions,
          processing_model: OPENAI_MODEL,
          processed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (analysisError) {
      console.error('❌ Error saving video analysis:', analysisError);
      throw new Error(`Failed to save video analysis: ${analysisError.message}`);
    }

    console.log('💾 Video analysis saved');

    // 8. Get current momentum score
    const { data: currentMomentum, error: momentumError } = await supabaseClient
      .from('momentum_scores')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (momentumError) {
      console.error('❌ Error fetching momentum:', momentumError);
      throw new Error(`Failed to fetch momentum: ${momentumError.message}`);
    }

    console.log('📊 Current score:', currentMomentum.score);

    // 9. Calculate days since last video
    const now = new Date();
    const lastVideoDate = currentMomentum.last_video_at
      ? new Date(currentMomentum.last_video_at)
      : new Date(currentMomentum.created_at);
    const daysSinceLastVideo = Math.floor(
      (now.getTime() - lastVideoDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log('📅 Days since last video:', daysSinceLastVideo);

    // 10. Calculate new streak
    let newStreak = currentMomentum.streak_days;
    if (daysSinceLastVideo === 0) {
      // Même jour, garder le streak
    } else if (daysSinceLastVideo === 1) {
      // Jour suivant, incrémenter
      newStreak += 1;
    } else {
      // Streak cassé, reset à 1
      newStreak = 1;
    }

    console.log('🔥 New streak:', newStreak);

    // 11. Calculate decay penalty
    const DAILY_DECAY_RATE = 0.02;
    let decayedScore = currentMomentum.score;
    for (let i = 0; i < daysSinceLastVideo; i++) {
      decayedScore *= 1 - DAILY_DECAY_RATE;
    }
    const decayPenalty = currentMomentum.score - decayedScore;

    // 12. Calculate streak multiplier
    const STREAK_MULTIPLIER_BASE = 0.05;
    const STREAK_MULTIPLIER_CAP = 2.0;
    const streakMultiplier = Math.min(1 + newStreak * STREAK_MULTIPLIER_BASE, STREAK_MULTIPLIER_CAP);

    // 13. Calculate adjusted impact
    let adjustedImpact = analysis.momentum_impact * streakMultiplier;

    // Apply logarithmic limits
    const workingScore = decayedScore;
    if (workingScore > 1000 && adjustedImpact > 0) {
      const excessFactor = (workingScore - 1000) / 1000;
      const dampening = 1 / (1 + excessFactor);
      adjustedImpact *= dampening;
    } else if (workingScore < 100 && adjustedImpact < 0) {
      const deficitFactor = (100 - workingScore) / 100;
      const dampening = 1 / (1 + deficitFactor);
      adjustedImpact *= dampening;
    }

    // 14. Calculate elasticity adjustment
    const EQUILIBRIUM_POINT = 500;
    const ELASTICITY_RATE = 0.05;
    const elasticityAdjustment = (EQUILIBRIUM_POINT - workingScore) * ELASTICITY_RATE;

    // 15. Calculate final new score
    let newScore = workingScore + adjustedImpact + elasticityAdjustment;
    newScore = Math.max(0, Math.min(10000, Math.round(newScore)));

    console.log('🎯 New score calculated:', newScore);
    console.log('   - Decay penalty:', decayPenalty.toFixed(2));
    console.log('   - Adjusted impact:', adjustedImpact.toFixed(2));
    console.log('   - Elasticity:', elasticityAdjustment.toFixed(2));

    // 16. Create score history entry
    const historyEntry = {
      date: now.toISOString(),
      score: newScore,
      reason: `Video analysis: ${analysis.ai_summary.substring(0, 100)}`,
      impact: analysis.momentum_impact,
      streak: newStreak,
    };

    const scoreHistory = Array.isArray(currentMomentum.score_history)
      ? currentMomentum.score_history
      : [];
    const updatedHistory = [...scoreHistory, historyEntry].slice(-30);

    // 17. Update momentum score
    const { error: updateError } = await supabaseClient
      .from('momentum_scores')
      .update({
        score: newScore,
        score_history: updatedHistory,
        streak_days: newStreak,
        longest_streak: Math.max(currentMomentum.longest_streak, newStreak),
        last_video_at: now.toISOString(),
        peak_score: Math.max(currentMomentum.peak_score, newScore),
        lowest_score: Math.min(currentMomentum.lowest_score, newScore),
        total_videos: currentMomentum.total_videos + 1,
        total_positive_days:
          analysis.momentum_impact > 0
            ? currentMomentum.total_positive_days + 1
            : currentMomentum.total_positive_days,
        total_negative_days:
          analysis.momentum_impact < 0
            ? currentMomentum.total_negative_days + 1
            : currentMomentum.total_negative_days,
        updated_at: now.toISOString(),
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('❌ Error updating momentum:', updateError);
      throw new Error(`Failed to update momentum: ${updateError.message}`);
    }

    console.log('✅ Momentum score updated');

    // 18. Update life areas
    const lifeAreasUpdated: Record<string, number> = {};

    for (const [areaKey, impact] of Object.entries(analysis.life_areas_impact)) {
      // Get life area
      const { data: lifeArea } = await supabaseClient
        .from('life_areas')
        .select('*')
        .eq('user_id', user_id)
        .eq('area_key', areaKey)
        .single();

      if (!lifeArea) continue;

      // Calculate new score (0-100)
      const newAreaScore = Math.max(0, Math.min(100, lifeArea.score + impact));

      // Update history
      const areaHistoryEntry = {
        date: now.toISOString(),
        score: newAreaScore,
        change: impact,
      };

      const areaHistory = Array.isArray(lifeArea.score_history) ? lifeArea.score_history : [];
      const updatedAreaHistory = [...areaHistory, areaHistoryEntry].slice(-14);

      // Update life area
      await supabaseClient
        .from('life_areas')
        .update({
          score: newAreaScore,
          score_history: updatedAreaHistory,
          total_positive_impacts:
            impact > 0 ? lifeArea.total_positive_impacts + 1 : lifeArea.total_positive_impacts,
          total_negative_impacts:
            impact < 0 ? lifeArea.total_negative_impacts + 1 : lifeArea.total_negative_impacts,
          best_score: Math.max(lifeArea.best_score, newAreaScore),
          worst_score: Math.min(lifeArea.worst_score, newAreaScore),
          updated_at: now.toISOString(),
        })
        .eq('id', lifeArea.id);

      lifeAreasUpdated[areaKey] = newAreaScore;
    }

    console.log('✅ Life areas updated:', lifeAreasUpdated);

    // 19. Calculate momentum level
    let momentumLevel = { level: 0, flames: '💀', label: 'Stagnant', color: '#8E8E93', message: '' };
    if (newScore >= 900) {
      momentumLevel = { level: 5, flames: '🔥🔥🔥🔥🔥', label: 'Unstoppable', color: '#FF3B30', message: 'Momentum imbattable.' };
    } else if (newScore >= 700) {
      momentumLevel = { level: 4, flames: '🔥🔥🔥🔥', label: 'On Fire', color: '#FF3B30', message: 'Tu es en feu !' };
    } else if (newScore >= 500) {
      momentumLevel = { level: 3, flames: '🔥🔥🔥', label: 'Strong', color: '#FF6B00', message: 'Excellent momentum !' };
    } else if (newScore >= 300) {
      momentumLevel = { level: 2, flames: '🔥🔥', label: 'Growing', color: '#FF9500', message: 'Bon momentum.' };
    } else if (newScore >= 100) {
      momentumLevel = { level: 1, flames: '🔥', label: 'Building', color: '#FF9500', message: 'Momentum en construction.' };
    }

    // 20. Return result
    return new Response(
      JSON.stringify({
        success: true,
        analysis: videoAnalysis,
        new_momentum_score: newScore,
        previous_score: currentMomentum.score,
        score_change: newScore - currentMomentum.score,
        new_streak: newStreak,
        momentum_level: momentumLevel,
        life_areas_updated: lifeAreasUpdated,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in analyze-momentum:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
