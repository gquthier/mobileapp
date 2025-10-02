// Edge Function - GENERATE HIGHLIGHTS
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

interface GenerateHighlightsRequest {
  transcription: any;
  jobId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { transcription, jobId }: GenerateHighlightsRequest = await req.json();

  if (!transcription) {
    return new Response(
      JSON.stringify({ error: 'transcription is required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log('🧠 Starting highlights generation...');

    // Générer les highlights avec l'IA
    const highlights = await generateHighlights(transcription);

    console.log('✅ Highlights generated successfully');

    // Si on a un jobId, mettre à jour le job avec les highlights
    if (jobId) {
      const { error: updateError } = await supabaseClient
        .from('transcription_jobs')
        .update({
          transcript_highlight: highlights
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('⚠️ Failed to update job with highlights:', updateError);
        // Ne pas faire échouer la génération si la mise à jour échoue
      } else {
        console.log('✅ Job updated with highlights');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        highlights,
        jobId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('💥 Highlights generation failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        jobId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper: Générer des highlights avec l'IA
async function generateHighlights(transcription: any): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured for highlights');
  }

  console.log('🧠 Generating highlights with AI analysis...');

  // Préparer le contenu de la transcription pour l'analyse
  const transcriptContent = transcription.segments && transcription.segments.length > 0
    ? transcription.segments.map((segment: any, index: number) =>
        `[${segment.start}s-${segment.end}s] ${segment.text}`
      ).join('\n')
    : transcription.text;

  if (!transcriptContent || transcriptContent.trim().length === 0) {
    throw new Error('No transcript content available for highlight analysis');
  }

  console.log(`📝 Analyzing ${transcriptContent.length} characters of transcript...`);

  // Utilisation du prompt ID avec version mise à jour
  const promptId = "pmpt_68db774e1a6c81959f2860fb8e45a11d01dbf13311e57edd";
  const promptVersion = "4";

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
        input: transcriptContent, // String directement - l'API attend un string, pas un objet
        model: 'gpt-4.1-nano', // GPT-4.1 Nano
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI highlights API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log('🔍 OpenAI API Response status:', result.status);

    // L'API OpenAI Responses retourne la réponse dans result.output[0].content[0].text
    if (!result.output || !Array.isArray(result.output) || result.output.length === 0) {
      console.error('❌ Invalid output structure. Full response:', JSON.stringify(result, null, 2));
      throw new Error('Invalid response from OpenAI Responses API - no output array');
    }

    const outputMessage = result.output[0];
    if (!outputMessage.content || !Array.isArray(outputMessage.content) || outputMessage.content.length === 0) {
      console.error('❌ Invalid content structure. Output:', JSON.stringify(outputMessage, null, 2));
      throw new Error('Invalid response from OpenAI Responses API - no content array');
    }

    const highlightsContent = outputMessage.content[0].text;

    if (!highlightsContent) {
      console.error('❌ No text field in content. Content:', JSON.stringify(outputMessage.content[0], null, 2));
      throw new Error('Invalid response from OpenAI Responses API - no text field');
    }

    console.log('📝 Extracted highlights text (length):', highlightsContent.length);
    console.log('📝 Highlights preview:', highlightsContent.substring(0, 200) + '...');

    // Parser le JSON de réponse (highlightsContent est toujours une string JSON)
    let highlightsData;
    try {
      console.log('📄 Parsing JSON string response...');
      highlightsData = JSON.parse(highlightsContent);
      console.log('✅ JSON parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse highlights JSON:', parseError);
      console.error('Content preview:', highlightsContent.substring(0, 500));
      throw new Error('Invalid JSON response from highlights analysis');
    }

    // Valider la structure de réponse
    if (!highlightsData.highlights || !Array.isArray(highlightsData.highlights)) {
      throw new Error('Invalid highlights structure in response');
    }

    console.log(`✅ Generated ${highlightsData.highlights.length} highlights successfully`);

    // Log des highlights générés
    highlightsData.highlights.forEach((highlight: any, index: number) => {
      console.log(`🎯 Highlight ${index + 1}: "${highlight.title}" (${highlight.importance}/10)`);
    });

    // Ajouter des métadonnées sur l'analyse
    const enrichedData = {
      ...highlightsData,
      generatedAt: new Date().toISOString(),
      transcriptLength: transcriptContent.length,
      segmentsAnalyzed: transcription.segments?.length || 0
    };

    return enrichedData;

  } catch (error) {
    console.error('💥 Highlights generation failed:', error);
    throw error;
  }
}