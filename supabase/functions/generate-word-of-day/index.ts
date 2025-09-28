// Edge Function pour génération du mot du jour personnalisé
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WordOfDayRequest {
  forceGenerate?: boolean; // Pour forcer une nouvelle génération
  language?: string; // 'fr' | 'en'
}

interface WordOfDayResponse {
  success: boolean;
  wordOfDay: {
    id: string;
    word: string;
    definition: string;
    rationale: string;
    personalConnection: string;
    examples: string[];
    videoSources?: Array<{
      videoId: string;
      videoTitle: string;
      relevantQuote: string;
    }>;
    language: string;
    createdAt: string;
    validUntil: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📚 Generate Word of Day function called');

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

    const { forceGenerate = false, language = 'fr' }: WordOfDayRequest = await req.json();

    console.log(`🌅 Generating word of day for user ${user.id} in ${language}`);

    // Récupérer les transcriptions récentes (dernière semaine)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentTranscriptions, error: transcError } = await supabaseClient
      .from('transcriptions')
      .select(`
        *,
        videos (
          id,
          title,
          created_at
        )
      `)
      .eq('videos.user_id', user.id)
      .eq('processing_status', 'completed')
      .gte('videos.created_at', oneWeekAgo)
      .order('videos.created_at', { ascending: false })
      .limit(10);

    if (transcError) {
      throw new Error('Failed to fetch recent transcriptions');
    }

    // Si pas de contenu récent, utiliser un mot générique inspirant
    if (!recentTranscriptions || recentTranscriptions.length === 0) {
      const genericWords = language === 'fr' ? [
        {
          word: 'INSPIRATION',
          definition: 'Action d\'inspirer, de stimuler l\'activité créatrice.',
          rationale: 'Commencez votre voyage de réflexion personnelle en vous inspirant du monde qui vous entoure.',
          personalConnection: 'Chaque moment peut être une source d\'inspiration pour vos futurs enregistrements.',
          examples: ['Trouvez l\'inspiration dans les petits moments du quotidien', 'Laissez-vous inspirer par vos expériences']
        },
        {
          word: 'RÉFLEXION',
          definition: 'Action de réfléchir, de penser attentivement à quelque chose.',
          rationale: 'La réflexion est la clé pour comprendre vos pensées et émotions.',
          personalConnection: 'Prenez un moment aujourd\'hui pour réfléchir à votre journée.',
          examples: ['La réflexion enrichit la compréhension de soi', 'Chaque réflexion est un pas vers la croissance']
        }
      ] : [
        {
          word: 'MINDFULNESS',
          definition: 'The practice of purposeful, non-judgmental awareness of the present moment.',
          rationale: 'Start your personal reflection journey by being present and aware.',
          personalConnection: 'Every moment of mindfulness can inspire your future recordings.',
          examples: ['Practice mindfulness in your daily activities', 'Be mindful of your thoughts and feelings']
        }
      ];

      const randomWord = genericWords[Math.floor(Math.random() * genericWords.length)];

      return new Response(
        JSON.stringify({
          success: true,
          wordOfDay: {
            id: `generic_${Date.now()}`,
            ...randomWord,
            videoSources: [],
            language,
            createdAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Préparer le contenu pour l'analyse
    const contentForAnalysis = recentTranscriptions.map(t => ({
      title: t.videos?.title || 'Sans titre',
      date: t.videos?.created_at,
      text: t.text.substring(0, 500), // Limiter pour éviter les tokens excessifs
      segments: (t.segments || []).slice(0, 3) // Premiers segments seulement
    }));

    const recentContent = contentForAnalysis.map(c =>
      `${c.title} (${c.date}): ${c.text}`
    ).join('\n\n---\n\n');

    // Récupérer la clé API OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prompt système pour la génération du mot
    const systemPrompt = language === 'fr' ? `Tu es un expert en développement personnel qui génère un "mot du jour" personnalisé basé sur les réflexions récentes de l'utilisateur.

CONTENU RÉCENT DE L'UTILISATEUR:
${recentContent}

INSTRUCTIONS:
1. Analyse le contenu pour identifier les thèmes, émotions et préoccupations principales
2. Choisis UN MOT significatif qui résonne avec le contenu récent
3. Le mot doit être inspirant, utile et personnellement pertinent
4. Réponds UNIQUEMENT au format JSON suivant:

{
  "word": "MOT_CHOISI",
  "definition": "Définition claire et précise du mot",
  "rationale": "Pourquoi ce mot est pertinent basé sur le contenu récent (100 mots max)",
  "personalConnection": "Comment ce mot se connecte spécifiquement aux réflexions récentes (80 mots max)",
  "examples": ["Exemple d'usage 1", "Exemple d'usage 2"],
  "relevantQuotes": ["Citation pertinente du contenu", "Autre citation si applicable"]
}

Le mot doit être en français, inspirant et actionnable.` : `You are a personal development expert who generates a personalized "word of the day" based on the user's recent reflections.

USER'S RECENT CONTENT:
${recentContent}

INSTRUCTIONS:
1. Analyze the content to identify main themes, emotions, and concerns
2. Choose ONE meaningful word that resonates with the recent content
3. The word should be inspiring, useful, and personally relevant
4. Respond ONLY in the following JSON format:

{
  "word": "CHOSEN_WORD",
  "definition": "Clear and precise definition of the word",
  "rationale": "Why this word is relevant based on recent content (100 words max)",
  "personalConnection": "How this word specifically connects to recent reflections (80 words max)",
  "examples": ["Usage example 1", "Usage example 2"],
  "relevantQuotes": ["Relevant quote from content", "Another quote if applicable"]
}

The word should be in English, inspiring and actionable.`;

    console.log('🤖 Calling OpenAI for word generation...');

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
        max_tokens: 800,
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiResult = await openaiResponse.json();
    const wordContent = openaiResult.choices[0]?.message?.content;

    if (!wordContent) {
      throw new Error('No word content generated');
    }

    // Parser le JSON de réponse
    let parsedWord;
    try {
      parsedWord = JSON.parse(wordContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', wordContent);
      throw new Error('Invalid word format generated');
    }

    // Identifier les sources vidéo pertinentes
    const videoSources = recentTranscriptions
      .filter(t => parsedWord.relevantQuotes?.some((quote: string) =>
        t.text.toLowerCase().includes(quote.toLowerCase().substring(0, 20))
      ))
      .slice(0, 2)
      .map(t => ({
        videoId: t.video_id,
        videoTitle: t.videos?.title || 'Sans titre',
        relevantQuote: parsedWord.relevantQuotes?.[0] || t.text.substring(0, 100) + '...'
      }));

    const wordOfDay = {
      id: `word_${Date.now()}`,
      word: parsedWord.word || 'INSPIRATION',
      definition: parsedWord.definition || 'Un mot choisi pour vous inspirer.',
      rationale: parsedWord.rationale || 'Basé sur vos réflexions récentes.',
      personalConnection: parsedWord.personalConnection || 'Connecté à votre parcours personnel.',
      examples: parsedWord.examples || ['Utilisez ce mot dans votre réflexion du jour'],
      videoSources,
      language,
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    console.log(`✅ Word of day generated: ${wordOfDay.word}`);

    return new Response(
      JSON.stringify({
        success: true,
        wordOfDay,
        usage: {
          videosAnalyzed: recentTranscriptions.length,
          totalTokens: openaiResult.usage?.total_tokens || 0,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 Generate word of day failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        wordOfDay: {
          id: `error_${Date.now()}`,
          word: 'PERSÉVÉRANCE',
          definition: 'Qualité de celui qui persévère, qui persiste dans ses résolutions.',
          rationale: 'Même face aux difficultés techniques, la persévérance nous aide à avancer.',
          personalConnection: 'Continuez votre parcours de réflexion personnelle.',
          examples: ['Persévérez dans vos objectifs', 'La persévérance mène au succès'],
          videoSources: [],
          language: 'fr',
          createdAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});