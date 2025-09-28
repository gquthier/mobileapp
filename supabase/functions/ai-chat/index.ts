// Edge Function pour chat IA avec contexte vidéo
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  conversationId?: string;
  contextVideoIds?: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citedSegments?: Array<{
    videoId: string;
    videoTitle: string;
    startTime: number;
    endTime: number;
    text: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🤖 AI Chat function called');

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

    const { message, conversationId, contextVideoIds }: ChatRequest = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log(`💬 Processing chat message: "${message.substring(0, 50)}..."`);

    // Récupérer le contexte des vidéos transcrites
    let contextData = '';
    let citedSegments: any[] = [];

    if (contextVideoIds && contextVideoIds.length > 0) {
      const { data: transcriptions, error: transcError } = await supabaseClient
        .from('transcriptions')
        .select(`
          *,
          videos (
            id,
            title,
            created_at
          )
        `)
        .in('video_id', contextVideoIds)
        .eq('processing_status', 'completed');

      if (transcError) {
        console.error('Error fetching transcriptions:', transcError);
      } else if (transcriptions) {
        contextData = transcriptions.map(t => `
Video: ${t.videos?.title || 'Untitled'} (${t.videos?.created_at})
Transcription: ${t.text}
---`).join('\n');

        // Préparer les segments pour citation
        citedSegments = transcriptions.flatMap(t =>
          (t.segments || []).map((segment: any) => ({
            videoId: t.video_id,
            videoTitle: t.videos?.title || 'Untitled',
            startTime: segment.start,
            endTime: segment.end,
            text: segment.text
          }))
        );
      }
    } else {
      // Si pas de vidéos spécifiques, récupérer les transcriptions récentes
      const { data: recentTranscriptions, error: recentError } = await supabaseClient
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
        .eq('videos.user_id', user.id)
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!recentError && recentTranscriptions) {
        contextData = recentTranscriptions.map(t => `
Video: ${t.videos?.title || 'Untitled'} (${t.videos?.created_at})
Transcription: ${t.text.substring(0, 500)}...
---`).join('\n');
      }
    }

    // Récupérer la clé API OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Construire le prompt système
    const systemPrompt = `Tu es un assistant IA personnel qui aide les utilisateurs à réfléchir sur leurs vidéos de journal personnel.

CONTEXTE DES VIDÉOS UTILISATEUR:
${contextData || 'Aucune transcription récente disponible.'}

INSTRUCTIONS:
- Aide l'utilisateur à comprendre et analyser ses pensées enregistrées
- Pose des questions profondes et réfléchies
- Offre des insights personnalisés basés sur le contenu
- Reste empathique et bienveillant
- Si tu références un contenu spécifique, cite la vidéo correspondante
- Réponds en français sauf si l'utilisateur préfère une autre langue

Si aucun contexte n'est disponible, encourage l'utilisateur à enregistrer plus de vidéos pour avoir des conversations plus riches.`;

    // Appel à OpenAI GPT-4
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiResult = await openaiResponse.json();
    const assistantMessage = openaiResult.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';

    console.log(`✅ Chat response generated, length: ${assistantMessage.length}`);

    // Sauvegarder la conversation (optionnel)
    const timestamp = new Date().toISOString();

    const chatResponse: ChatMessage = {
      role: 'assistant',
      content: assistantMessage,
      timestamp,
      citedSegments: contextVideoIds && contextVideoIds.length > 0 ? citedSegments.slice(0, 3) : undefined
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: chatResponse,
        conversationId: conversationId || `conv_${Date.now()}`,
        usage: {
          prompt_tokens: openaiResult.usage?.prompt_tokens || 0,
          completion_tokens: openaiResult.usage?.completion_tokens || 0,
          total_tokens: openaiResult.usage?.total_tokens || 0,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 Chat function failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: {
          role: 'assistant',
          content: 'Désolé, je rencontre un problème technique. Pouvez-vous réessayer ?',
          timestamp: new Date().toISOString(),
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});