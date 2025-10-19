// Edge Function - TRANSCRIBE WITH ASSEMBLYAI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSEMBLYAI_API_KEY = "55fcc8b45cad4c77b8f5076d77cb0063";

interface TranscribeRequest {
  videoUrl: string;
  jobId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { videoUrl, jobId }: TranscribeRequest = await req.json();

  if (!videoUrl || !jobId) {
    return new Response(
      JSON.stringify({ error: 'videoUrl and jobId are required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log('🔤 Starting AssemblyAI transcription...');
    console.log('📁 Video URL:', videoUrl);
    console.log('🆔 Job ID:', jobId);

    // Toujours utiliser une URL signée pour AssemblyAI (plus fiable)
    let accessibleUrl = videoUrl;

    if (videoUrl.includes('supabase.co/storage/v1/object/')) {
      console.log('🔐 Generating signed URL for Supabase video...');

      try {
        // Extraire le nom du fichier depuis l'URL
        // Format attendu: .../storage/v1/object/public/videos/...
        let filePath = '';

        if (videoUrl.includes('/storage/v1/object/public/videos/')) {
          filePath = videoUrl.split('/storage/v1/object/public/videos/')[1];
        } else if (videoUrl.includes('/storage/v1/object/videos/')) {
          filePath = videoUrl.split('/storage/v1/object/videos/')[1];
        }

        console.log('📁 File path extracted:', filePath);

        if (!filePath) {
          console.error('❌ Could not extract file path from URL');
          throw new Error('Invalid video URL format');
        }

        // Générer une URL signée valide 7 jours (max pour Supabase)
        const { data: signedData, error: signedError } = await supabaseClient.storage
          .from('videos')
          .createSignedUrl(filePath, 604800); // 7 jours = 604800 secondes

        if (signedError) {
          console.error('❌ Failed to create signed URL:', signedError);
          throw new Error(`Signed URL creation failed: ${signedError.message}`);
        }

        if (!signedData?.signedUrl) {
          console.error('❌ No signed URL returned from Supabase');
          throw new Error('No signed URL returned');
        }

        accessibleUrl = signedData.signedUrl;
        console.log('✅ Using signed URL for transcription');
        console.log('🔗 Signed URL (first 100 chars):', accessibleUrl.substring(0, 100) + '...');

      } catch (error) {
        console.error('❌ Error generating signed URL:', error);
        throw new Error(`Cannot create accessible URL for AssemblyAI: ${error.message}`);
      }
    }

    // Configuration AssemblyAI
    const transcriptionConfig = {
      audio_url: accessibleUrl,
      speech_model: "universal", // Meilleur modèle général
      language_code: "fr", // Français
      punctuate: true,
      format_text: true,
      dual_channel: false,
      webhook_url: null,
      word_boost: [],
      boost_param: "default"
    };

    console.log('📤 Sending request to AssemblyAI...');

    // Démarrer la transcription
    const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transcriptionConfig)
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('❌ AssemblyAI submit error:', errorText);
      throw new Error(`AssemblyAI submit failed: ${submitResponse.status} - ${errorText}`);
    }

    const submitResult = await submitResponse.json();
    const transcriptId = submitResult.id;

    console.log('✅ Transcription submitted successfully, ID:', transcriptId);
    console.log('⏳ Waiting for transcription to complete...');

    // Polling pour attendre la completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    const pollInterval = 5000; // 5 secondes

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;

      console.log(`📊 Polling attempt ${attempts}/${maxAttempts}`);

      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'Authorization': ASSEMBLYAI_API_KEY
        }
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('❌ AssemblyAI status error:', errorText);
        throw new Error(`AssemblyAI status check failed: ${statusResponse.status}`);
      }

      const statusResult = await statusResponse.json();
      console.log('📋 Current status:', statusResult.status);

      if (statusResult.status === 'completed') {
        console.log('🎉 AssemblyAI transcription completed!');

        // Convertir le format AssemblyAI vers le format compatible avec notre système
        const convertedTranscription = convertAssemblyAIFormat(statusResult);

        console.log('📝 AssemblyAI Transcription Text Preview:', convertedTranscription.text?.substring(0, 200) + '...');
        console.log('🎬 AssemblyAI Segments Count:', convertedTranscription.segments?.length || 0);
        console.log('🌍 AssemblyAI Language:', convertedTranscription.language);

        // Note: La sauvegarde dans la base de données est gérée par process-transcription
        console.log('✅ AssemblyAI transcription ready - will be saved by process-transcription');

        return new Response(
          JSON.stringify({
            success: true,
            jobId,
            transcription: convertedTranscription,
            provider: 'AssemblyAI',
            transcript_id: transcriptId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

      } else if (statusResult.status === 'error') {
        console.error('❌ AssemblyAI transcription failed:', statusResult.error);
        throw new Error(`AssemblyAI transcription error: ${statusResult.error}`);
      }

      // Continue polling si status est 'queued', 'processing', etc.
    }

    throw new Error('AssemblyAI transcription timeout - job did not complete within 5 minutes');

  } catch (error) {
    console.error('💥 AssemblyAI transcription failed:', error);

    // Marquer le job comme échoué pour AssemblyAI
    await supabaseClient
      .from('transcription_jobs')
      .update({
        assemblyai_error: error.message,
        assemblyai_failed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        provider: 'AssemblyAI',
        jobId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Convertir le format AssemblyAI vers notre format standard
function convertAssemblyAIFormat(assemblyResult: any): any {
  console.log('🔄 Converting AssemblyAI format to standard format...');

  const segments = [];

  // AssemblyAI retourne les mots avec timestamps dans words[]
  if (assemblyResult.words && Array.isArray(assemblyResult.words)) {
    // Grouper les mots en phrases/segments
    const wordsPerSegment = 20; // ~20 mots par segment

    for (let i = 0; i < assemblyResult.words.length; i += wordsPerSegment) {
      const segmentWords = assemblyResult.words.slice(i, i + wordsPerSegment);

      if (segmentWords.length > 0) {
        const startTime = segmentWords[0].start / 1000; // AssemblyAI en ms, on veut en secondes
        const endTime = segmentWords[segmentWords.length - 1].end / 1000;
        const text = segmentWords.map(word => word.text).join(' ');

        segments.push({
          start: Math.round(startTime * 10) / 10, // Arrondir à 1 décimale
          end: Math.round(endTime * 10) / 10,
          text: text.trim()
        });
      }
    }
  }

  // Format compatible avec notre système (similaire à Whisper)
  return {
    text: assemblyResult.text || '',
    language: assemblyResult.language_code || 'fr',
    duration: assemblyResult.audio_duration || 0, // en secondes
    segments: segments,
    provider: 'AssemblyAI',
    confidence: assemblyResult.confidence || 0,
    audio_url: assemblyResult.audio_url,
    id: assemblyResult.id
  };
}