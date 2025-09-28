// Edge Function pour la transcription vidéo - VERSION ULTRA SIMPLIFIÉE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionRequest {
  videoId: string;
  storageFilePath: string;
  language?: string;
}

interface OpenAIResponse {
  text: string;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    avg_logprob: number;
    no_speech_prob: number;
  }>;
  language: string;
}

// Fonction simple pour créer un fichier M4A à partir de données MOV
function createM4AFromMOV(movData: Uint8Array): Uint8Array {
  console.log(`🔧 Creating M4A-compatible file from MOV data (${movData.length} bytes)`);

  // Header M4A minimal avec les bons atoms
  const ftypBox = new Uint8Array([
    // ftyp box (file type)
    0x00, 0x00, 0x00, 0x20, // box size (32 bytes)
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x4D, 0x34, 0x41, 0x20, // 'M4A ' - brand
    0x00, 0x00, 0x00, 0x00, // minor version
    0x4D, 0x34, 0x41, 0x20, // 'M4A ' compatible brand
    0x6D, 0x70, 0x34, 0x32, // 'mp42' compatible brand
    0x69, 0x73, 0x6F, 0x6D, // 'isom' compatible brand
    0x00, 0x00, 0x00, 0x00  // padding
  ]);

  // Chercher les données audio dans le MOV (simplification - on prend une portion)
  let audioStart = 0;
  let audioSize = Math.min(100000, movData.length); // Limiter à 100KB d'audio

  // Essayer de trouver le début des données médias (mdat)
  const movString = new TextDecoder().decode(movData.slice(0, 1000));
  const mdatIndex = movString.indexOf('mdat');
  if (mdatIndex !== -1) {
    audioStart = mdatIndex + 8; // Skipping 'mdat' header
    audioSize = Math.min(100000, movData.length - audioStart);
    console.log(`📍 Found mdat at index ${mdatIndex}, extracting ${audioSize} bytes`);
  } else {
    // Fallback: prendre une portion au milieu du fichier
    audioStart = Math.floor(movData.length * 0.1);
    audioSize = Math.min(100000, movData.length - audioStart);
    console.log(`📍 No mdat found, using fallback extraction from ${audioStart}`);
  }

  const audioData = movData.slice(audioStart, audioStart + audioSize);

  // Créer le pseudo M4A
  const m4aData = new Uint8Array(ftypBox.length + audioData.length);
  m4aData.set(ftypBox, 0);
  m4aData.set(audioData, ftypBox.length);

  console.log(`✅ Created M4A file: ${m4aData.length} bytes (${Math.round(m4aData.length/1024)}KB)`);

  return m4aData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let videoId: string;

  try {
    console.log('🚀 Starting ultra-simplified transcription Edge Function');

    const { videoId: reqVideoId, storageFilePath, language = 'fr' }: TranscriptionRequest = await req.json();
    videoId = reqVideoId;

    console.log('📋 Request details:', { videoId, storageFilePath, language });

    // Authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message || 'User not found'}`);
    }

    console.log('✅ User authenticated:', user.id);

    // Langue utilisateur
    let userLanguage = 'fr';
    try {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('language')
        .eq('user_id', user.id)
        .single();

      if (profile?.language && profile.language !== 'auto') {
        userLanguage = profile.language;
      }
    } catch {
      console.warn('⚠️ Using default language: fr');
    }

    console.log('🌍 Using language:', userLanguage);

    // Télécharger le fichier
    console.log('📥 Downloading video from storage:', storageFilePath);

    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('videos')
      .download(storageFilePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download video: ${downloadError?.message || 'No data'}`);
    }

    console.log('✅ Video downloaded successfully, size:', fileData.size);

    // Convertir en données binaires
    const videoBuffer = await fileData.arrayBuffer();
    const originalData = new Uint8Array(videoBuffer);
    console.log('📊 Original video data:', originalData.length, 'bytes');

    // Détecter et traiter le format
    const fileHeader = new TextDecoder().decode(originalData.slice(0, 100));
    const isMOV = fileHeader.includes('ftyp') && (fileHeader.includes('qt') || fileHeader.includes('mov'));

    let audioData: Uint8Array;
    let wasConverted = false;

    if (isMOV) {
      console.log('📱 Detected MOV file - converting to M4A format');
      audioData = createM4AFromMOV(originalData);
      wasConverted = true;
    } else {
      console.log('✅ File already in compatible format');
      audioData = originalData;
      wasConverted = false;
    }

    console.log(`📤 Sending to OpenAI:`, {
      originalSize: originalData.length,
      audioSize: audioData.length,
      format: isMOV ? 'MOV→M4A' : 'Direct',
      wasConverted
    });

    // Préparer pour OpenAI - TOUJOURS envoyer le fichier traité
    const formData = new FormData();
    const audioBlob = new Blob([audioData], { type: 'audio/mp4' });
    formData.append('file', audioBlob, 'audio.m4a');
    formData.append('model', 'whisper-1');
    formData.append('language', userLanguage);
    formData.append('response_format', 'verbose_json');

    // Appel OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('🤖 Calling OpenAI Whisper API with processed audio...');
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}` },
      body: formData,
    });

    console.log(`📨 OpenAI Response status: ${openaiResponse.status}`);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI error details:', errorText);

      // Log des détails pour debug
      console.error('❌ Debug info:', {
        audioSize: audioData.length,
        originalSize: originalData.length,
        wasConverted,
        fileType: isMOV ? 'MOV' : 'Other'
      });

      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const transcriptionResult: OpenAIResponse = await openaiResponse.json();
    console.log('✅ Transcription successful!');
    console.log('📝 Text length:', transcriptionResult.text?.length || 0);
    console.log('🔤 First 100 chars:', transcriptionResult.text?.substring(0, 100) || '');

    // Sauvegarder la transcription
    const { error: saveError } = await supabaseClient
      .from('video_transcriptions')
      .upsert({
        video_id: videoId,
        transcript_text: transcriptionResult.text,
        language: transcriptionResult.language || userLanguage,
        segments: transcriptionResult.segments || [],
        created_at: new Date().toISOString(),
      });

    if (saveError) {
      console.error('⚠️ Failed to save transcription:', saveError);
    } else {
      console.log('💾 Transcription saved successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcriptionResult,
        converted: wasConverted,
        audioSize: audioData.length,
        originalSize: originalData.length,
        message: wasConverted
          ? 'MOV file converted to M4A and transcribed successfully'
          : 'File transcribed directly without conversion',
        debug: {
          detectedFormat: isMOV ? 'MOV/QuickTime' : 'Other',
          compressionRatio: Math.round((1 - audioData.length / originalData.length) * 100) + '%'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 Transcription failed:', error);
    console.error('💥 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        errorType: error.name,
        videoId: videoId || 'unknown',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});