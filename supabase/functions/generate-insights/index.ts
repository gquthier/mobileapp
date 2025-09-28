// Edge Function pour génération d'insights IA
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InsightRequest {
  scope: 'video' | 'chapter' | 'weekly' | 'monthly';
  targetId?: string; // videoId pour scope video, chapterId pour scope chapter
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

interface InsightResponse {
  success: boolean;
  insight: {
    id: string;
    scope: string;
    summary: string;
    keyThemes: string[];
    emotionalTrends: Array<{
      emotion: string;
      frequency: number;
      examples: string[];
    }>;
    actions: string[];
    personalGrowth: {
      strengths: string[];
      areasToExplore: string[];
      patterns: string[];
    };
    createdAt: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🧠 Generate Insights function called');

    // Authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { scope, targetId, dateRange }: InsightRequest = await req.json();

    if (!scope) {
      throw new Error('Scope is required');
    }

    console.log(`📊 Generating ${scope} insights for user ${user.id}`);

    // Récupérer les données selon le scope
    let transcriptionsData: any[] = [];
    let contextTitle = '';

    switch (scope) {
      case 'video':
        if (!targetId) throw new Error('targetId required for video scope');

        const { data: videoData, error: videoError } = await supabaseClient
          .from('transcriptions')
          .select(`
            *,
            videos (
              id,
              title,
              created_at,
              duration
            )
          `)
          .eq('video_id', targetId)
          .eq('processing_status', 'completed')
          .single();

        if (videoError || !videoData) {
          throw new Error('Video transcription not found');
        }

        transcriptionsData = [videoData];
        contextTitle = `Vidéo: ${videoData.videos?.title}`;
        break;

      case 'chapter':
        if (!targetId) throw new Error('targetId required for chapter scope');

        const { data: chapterVideos, error: chapterError } = await supabaseClient
          .from('transcriptions')
          .select(`
            *,
            videos (
              id,
              title,
              created_at,
              duration,
              chapter_id
            )
          `)
          .eq('videos.chapter_id', targetId)
          .eq('processing_status', 'completed')
          .order('videos.created_at', { ascending: false });

        if (chapterError) {
          throw new Error('Failed to fetch chapter videos');
        }

        transcriptionsData = chapterVideos || [];
        contextTitle = `Chapitre`;
        break;

      case 'weekly':
      case 'monthly':
        const days = scope === 'weekly' ? 7 : 30;
        const startDate = dateRange?.startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const endDate = dateRange?.endDate || new Date().toISOString();

        const { data: timeRangeVideos, error: timeError } = await supabaseClient
          .from('transcriptions')
          .select(`
            *,
            videos (
              id,
              title,
              created_at,
              duration,
              user_id
            )
          `)
          .eq('videos.user_id', user.id)
          .eq('processing_status', 'completed')
          .gte('videos.created_at', startDate)
          .lte('videos.created_at', endDate)
          .order('videos.created_at', { ascending: false });

        if (timeError) {
          throw new Error('Failed to fetch time range videos');
        }

        transcriptionsData = timeRangeVideos || [];
        contextTitle = scope === 'weekly' ? 'Semaine passée' : 'Mois passé';
        break;
    }

    if (transcriptionsData.length === 0) {
      throw new Error('No transcriptions found for analysis');
    }

    // Préparer le contenu pour l'analyse
    const contentForAnalysis = transcriptionsData.map(t => ({
      title: t.videos?.title || 'Sans titre',
      date: t.videos?.created_at,
      duration: t.videos?.duration || 0,
      text: t.text,
      segments: t.segments || []
    }));

    const totalContent = contentForAnalysis.map(c => c.text).join('\n\n---\n\n');

    // Récupérer la clé API OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prompt système pour l'analyse
    const systemPrompt = `Tu es un expert en développement personnel et en analyse de contenu. Tu analyses des transcriptions de journaux vidéo personnels pour générer des insights profonds et utiles.

DONNÉES À ANALYSER:
Contexte: ${contextTitle}
Nombre de vidéos: ${transcriptionsData.length}
Période: ${contentForAnalysis[0]?.date} à ${contentForAnalysis[contentForAnalysis.length - 1]?.date}

CONTENU:
${totalContent}

INSTRUCTIONS:
1. Analyse le contenu pour identifier les thèmes principaux
2. Détecte les tendances émotionnelles et les patterns
3. Identifie les forces et domaines de croissance
4. Propose des actions concrètes et réalisables
5. Réponds UNIQUEMENT au format JSON suivant:

{
  "summary": "Résumé concis des insights (150 mots max)",
  "keyThemes": ["thème1", "thème2", "thème3"],
  "emotionalTrends": [
    {
      "emotion": "gratitude",
      "frequency": 0.8,
      "examples": ["exemple de phrase du contenu"]
    }
  ],
  "actions": ["Action concrète 1", "Action concrète 2"],
  "personalGrowth": {
    "strengths": ["Force identifiée 1", "Force identifiée 2"],
    "areasToExplore": ["Domaine à explorer 1"],
    "patterns": ["Pattern observé 1"]
  }
}

Sois empathique, constructif et précis. Base-toi uniquement sur le contenu fourni.`;

    console.log('🤖 Calling OpenAI for insights generation...');

    // Appel à OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiResult = await openaiResponse.json();
    const insightContent = openaiResult.choices[0]?.message?.content;

    if (!insightContent) {
      throw new Error('No insight content generated');
    }

    // Parser le JSON de réponse
    let parsedInsight;
    try {
      parsedInsight = JSON.parse(insightContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', insightContent);
      throw new Error('Invalid insight format generated');
    }

    const insightId = `insight_${scope}_${Date.now()}`;
    const insight = {
      id: insightId,
      scope,
      summary: parsedInsight.summary || 'Insight généré avec succès',
      keyThemes: parsedInsight.keyThemes || [],
      emotionalTrends: parsedInsight.emotionalTrends || [],
      actions: parsedInsight.actions || [],
      personalGrowth: parsedInsight.personalGrowth || {
        strengths: [],
        areasToExplore: [],
        patterns: []
      },
      createdAt: new Date().toISOString(),
    };

    console.log(`✅ Insight generated successfully: ${insight.summary.substring(0, 50)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        insight,
        usage: {
          videosAnalyzed: transcriptionsData.length,
          totalTokens: openaiResult.usage?.total_tokens || 0,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 Generate insights failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        insight: {
          id: `error_${Date.now()}`,
          scope: 'error',
          summary: 'Impossible de générer des insights pour le moment.',
          keyThemes: [],
          emotionalTrends: [],
          actions: ['Réessayez plus tard ou contactez le support'],
          personalGrowth: {
            strengths: [],
            areasToExplore: [],
            patterns: []
          },
          createdAt: new Date().toISOString(),
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});