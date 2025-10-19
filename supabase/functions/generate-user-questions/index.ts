// Edge Function - GENERATE USER QUESTIONS
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

interface GenerateQuestionsRequest {
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId }: GenerateQuestionsRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('📝 Starting question generation for user:', userId);

    // 1. Récupérer TOUTES les transcriptions complétées de l'utilisateur
    const { data: allVideos, error: videosError } = await supabaseClient
      .from('videos')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (videosError) {
      throw new Error(`Failed to fetch videos: ${videosError.message}`);
    }

    console.log(`📹 Found ${allVideos?.length || 0} total videos for user`);

    // 2. Récupérer toutes les transcriptions complétées
    const allVideoIds = allVideos?.map(v => v.id) || [];
    let allCompletedTranscriptions: any[] = [];

    if (allVideoIds.length > 0) {
      const { data: allJobs, error: jobsError } = await supabaseClient
        .from('transcription_jobs')
        .select('video_id, transcription_text, transcription, created_at')
        .in('video_id', allVideoIds)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (!jobsError && allJobs) {
        allCompletedTranscriptions = allJobs;
      }
    }

    const totalTranscriptions = allCompletedTranscriptions.length;
    console.log(`✅ Found ${totalTranscriptions} completed transcriptions`);

    // 3. Sélectionner les transcriptions à utiliser
    let selectedTranscriptions: any[] = [];

    if (totalTranscriptions === 0) {
      console.log('⚠️ No transcriptions available, will generate generic questions');
    } else if (totalTranscriptions <= 5) {
      // Si ≤5 transcriptions, prendre toutes celles disponibles
      selectedTranscriptions = allCompletedTranscriptions;
      console.log(`📝 Using all ${totalTranscriptions} available transcriptions`);
    } else {
      // Si >5 transcriptions: prendre 5 récentes + 3 aléatoires parmi les anciennes
      const recentTranscriptions = allCompletedTranscriptions.slice(0, 5);
      const olderTranscriptions = allCompletedTranscriptions.slice(5);

      // Sélectionner 3 transcriptions aléatoires parmi les anciennes
      const shuffled = [...olderTranscriptions].sort(() => 0.5 - Math.random());
      const randomOlder = shuffled.slice(0, Math.min(3, shuffled.length));

      selectedTranscriptions = [...recentTranscriptions, ...randomOlder];
      console.log(`📝 Using 5 recent + ${randomOlder.length} random older transcriptions`);
    }

    // 4. Préparer le contenu pour l'IA
    const allTranscriptions = selectedTranscriptions;

    // Créer le texte combiné des transcriptions
    const transcriptionsText = allTranscriptions.map((job, index) => {
      const text = job.transcription_text || job.transcription?.text || '';
      return `[VIDEO ${index + 1}]\n${text}`;
    }).join('\n\n---\n\n');

    console.log(`📄 Prepared ${transcriptionsText.length} characters of transcript content`);

    // 4. Générer les questions avec OpenAI
    const questions = await generateQuestionsWithAI(transcriptionsText);

    console.log(`✅ Generated ${questions.length} questions`);

    // 5. Obtenir le prochain numéro de batch
    const { data: batchData } = await supabaseClient
      .rpc('get_user_current_batch', { p_user_id: userId });

    const nextBatchNumber = (batchData || 0) + 1;

    console.log(`📦 Inserting questions as batch #${nextBatchNumber}`);

    // 5.1 Vérifier si ce batch existe déjà (protection contre les appels parallèles)
    const { data: existingBatch } = await supabaseClient
      .from('user_questions')
      .select('id')
      .eq('user_id', userId)
      .eq('batch_number', nextBatchNumber)
      .limit(1);

    if (existingBatch && existingBatch.length > 0) {
      console.log(`⚠️ Batch #${nextBatchNumber} already exists, skipping insertion (parallel call detected)`);
      return new Response(
        JSON.stringify({
          success: true,
          batchNumber: nextBatchNumber,
          questionCount: 0,
          skipped: true,
          message: 'Batch already generated by parallel request'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 6. Insérer les questions dans la base de données
    const questionsToInsert = questions.map((q, index) => ({
      user_id: userId,
      question_text: q.q,
      batch_number: nextBatchNumber,
      order_index: index,
      is_used: false,
    }));

    const { error: insertError } = await supabaseClient
      .from('user_questions')
      .insert(questionsToInsert);

    if (insertError) {
      // Si l'erreur est un duplicate, c'est qu'un autre appel parallèle a réussi entre-temps
      if (insertError.message.includes('duplicate key')) {
        console.log(`⚠️ Duplicate key detected, another parallel call succeeded first`);
        return new Response(
          JSON.stringify({
            success: true,
            batchNumber: nextBatchNumber,
            questionCount: 0,
            skipped: true,
            message: 'Batch already generated by parallel request'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      throw new Error(`Failed to insert questions: ${insertError.message}`);
    }

    console.log('✅ Questions successfully inserted into database');

    return new Response(
      JSON.stringify({
        success: true,
        batchNumber: nextBatchNumber,
        questionCount: questions.length,
        transcriptionsUsed: allTranscriptions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('💥 Question generation failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper: Générer des questions avec OpenAI
async function generateQuestionsWithAI(transcriptionsText: string): Promise<Array<{ q: string }>> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('🧠 Generating questions with AI...');

  const promptId = "pmpt_68dda6ed3cc88197a11c5a8e5e6e9a290c27f60155d435b1";
  const promptVersion = "1";

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: {
          id: promptId,
          version: promptVersion
        },
        input: `Please analyze these video transcriptions and generate 50 personalized introspection questions in JSON format.

${transcriptionsText || "No previous transcriptions available. Generate general introspective questions."}

IMPORTANT: Return your response as a JSON object with this exact structure:
{
  "questions": [
    {"q": "Your question here"},
    {"q": "Another question"},
    ...
  ]
}`,
        model: 'gpt-4.1-nano',
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log('🔍 OpenAI API Response status:', result.status);

    // Extraire la réponse de la structure nested
    if (!result.output || !Array.isArray(result.output) || result.output.length === 0) {
      console.error('❌ Invalid output structure:', JSON.stringify(result, null, 2));
      throw new Error('Invalid response from OpenAI Responses API - no output array');
    }

    const outputMessage = result.output[0];
    if (!outputMessage.content || !Array.isArray(outputMessage.content) || outputMessage.content.length === 0) {
      console.error('❌ Invalid content structure:', JSON.stringify(outputMessage, null, 2));
      throw new Error('Invalid response from OpenAI Responses API - no content array');
    }

    const questionsContent = outputMessage.content[0].text;

    if (!questionsContent) {
      console.error('❌ No text field in content');
      throw new Error('Invalid response from OpenAI Responses API - no text field');
    }

    console.log('📝 Extracted questions text (length):', questionsContent.length);

    // Parser le JSON de réponse
    let questionsData;
    try {
      questionsData = JSON.parse(questionsContent);
      console.log('✅ JSON parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse questions JSON:', parseError);
      console.error('Content preview:', questionsContent.substring(0, 500));
      throw new Error('Invalid JSON response from questions generation');
    }

    // Valider la structure de réponse
    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
      throw new Error('Invalid questions structure in response');
    }

    console.log(`✅ Generated ${questionsData.questions.length} questions successfully`);

    return questionsData.questions;

  } catch (error) {
    console.error('💥 Question generation failed:', error);
    throw error;
  }
}
