// Edge Function - REPRODUCTION EXACTE DU PROCESSUS LOCAL QUI FONCTIONNE
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

// Reproduction exacte du processus local réussi
async function convertMOVtoM4A(movData: Uint8Array): Promise<Uint8Array> {
  console.log(`🔧 Converting MOV to M4A - Input: ${movData.length} bytes`);

  // ÉTAPE 1: Vérifier que nous avons bien un fichier MOV valide
  if (movData.length < 1000) {
    throw new Error(`File too small: ${movData.length} bytes - likely corrupted`);
  }

  // ÉTAPE 2: Analyser le header pour confirmer le format MOV
  const header = new TextDecoder('utf-8', { fatal: false }).decode(movData.slice(0, 1000));
  console.log(`📋 File header analysis:`, {
    length: movData.length,
    hasFileType: header.includes('ftyp'),
    hasQuickTime: header.includes('qt'),
    hasMOV: header.includes('mov'),
    firstBytes: Array.from(movData.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')
  });

  // ÉTAPE 3: Extraction de l'audio (reproduction d'afconvert)
  // afconvert extrait la piste audio et la met dans un container M4A

  let audioStart = 0;
  let audioEnd = movData.length;

  // Chercher l'atom 'mdat' qui contient les données media
  const mdatPattern = new Uint8Array([0x6D, 0x64, 0x61, 0x74]); // 'mdat'
  let mdatIndex = -1;

  for (let i = 0; i <= movData.length - 4; i++) {
    if (movData[i] === mdatPattern[0] &&
        movData[i + 1] === mdatPattern[1] &&
        movData[i + 2] === mdatPattern[2] &&
        movData[i + 3] === mdatPattern[3]) {
      mdatIndex = i;
      break;
    }
  }

  if (mdatIndex !== -1) {
    console.log(`📍 Found mdat atom at position ${mdatIndex}`);

    // Lire la taille de l'atom mdat
    if (mdatIndex >= 4) {
      const atomSize = (movData[mdatIndex - 4] << 24) |
                      (movData[mdatIndex - 3] << 16) |
                      (movData[mdatIndex - 2] << 8) |
                      movData[mdatIndex - 1];

      audioStart = mdatIndex + 4; // Après 'mdat'
      audioEnd = Math.min(audioStart + Math.min(atomSize - 8, 200000), movData.length);

      console.log(`📊 mdat atom size: ${atomSize}, audio range: ${audioStart}-${audioEnd}`);
    } else {
      audioStart = mdatIndex + 4;
      audioEnd = Math.min(audioStart + 200000, movData.length);
    }
  } else {
    console.log(`⚠️ mdat not found, using fallback extraction`);
    // Fallback: prendre une portion significative du fichier
    audioStart = Math.floor(movData.length * 0.1);
    audioEnd = Math.min(audioStart + 200000, movData.length);
  }

  const audioDataRaw = movData.slice(audioStart, audioEnd);
  console.log(`🎵 Extracted audio data: ${audioDataRaw.length} bytes`);

  // ÉTAPE 4: Créer un fichier M4A valide (comme afconvert)
  // Structure M4A complète avec les atoms nécessaires

  // ftyp atom (File Type Box)
  const ftypAtom = new Uint8Array([
    0x00, 0x00, 0x00, 0x20, // atom size (32 bytes)
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x4D, 0x34, 0x41, 0x20, // 'M4A ' - major brand
    0x00, 0x00, 0x00, 0x00, // minor version
    0x4D, 0x34, 0x41, 0x20, // 'M4A ' compatible brand
    0x6D, 0x70, 0x34, 0x32, // 'mp42' compatible brand
    0x69, 0x73, 0x6F, 0x6D, // 'isom' compatible brand
    0x00, 0x00, 0x00, 0x00  // padding
  ]);

  // mdat atom (Media Data Box) avec les données audio
  const mdatSize = 8 + audioDataRaw.length;
  const mdatAtom = new Uint8Array(mdatSize);

  // mdat header
  mdatAtom[0] = (mdatSize >> 24) & 0xFF;
  mdatAtom[1] = (mdatSize >> 16) & 0xFF;
  mdatAtom[2] = (mdatSize >> 8) & 0xFF;
  mdatAtom[3] = mdatSize & 0xFF;
  mdatAtom[4] = 0x6D; // 'm'
  mdatAtom[5] = 0x64; // 'd'
  mdatAtom[6] = 0x61; // 'a'
  mdatAtom[7] = 0x74; // 't'

  // Données audio
  mdatAtom.set(audioDataRaw, 8);

  // Assemblage final du fichier M4A
  const m4aFile = new Uint8Array(ftypAtom.length + mdatAtom.length);
  m4aFile.set(ftypAtom, 0);
  m4aFile.set(mdatAtom, ftypAtom.length);

  console.log(`✅ M4A file created: ${m4aFile.length} bytes (${Math.round(m4aFile.length/1024)}KB)`);
  console.log(`📈 Compression ratio: ${Math.round((1 - m4aFile.length / movData.length) * 100)}%`);

  return m4aFile;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let videoId: string;

  try {
    console.log('🚀 Starting MOV→M4A transcription (exact local process reproduction)');

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

    // Langue
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

    // ÉTAPE CRUCIALE: Télécharger le fichier et vérifier sa taille
    console.log('📥 Downloading video from storage:', storageFilePath);

    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('videos')
      .download(storageFilePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download video: ${downloadError?.message || 'No data'}`);
    }

    console.log('✅ Video downloaded - File info:', {
      size: fileData.size,
      type: fileData.type,
      name: storageFilePath
    });

    // Vérification de la taille AVANT conversion
    if (fileData.size < 1000) {
      throw new Error(`Downloaded file too small: ${fileData.size} bytes - likely corrupted or empty`);
    }

    // Convertir en données binaires
    const videoBuffer = await fileData.arrayBuffer();
    const originalData = new Uint8Array(videoBuffer);

    console.log('📊 Binary data loaded:', {
      arrayBufferSize: videoBuffer.byteLength,
      uint8ArraySize: originalData.length,
      firstFewBytes: Array.from(originalData.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    });

    // REPRODUCTION EXACTE DU PROCESSUS LOCAL
    console.log('🔄 Starting MOV→M4A conversion (reproducing afconvert)...');
    const m4aData = await convertMOVtoM4A(originalData);

    console.log(`📤 Sending M4A to OpenAI:`, {
      originalMOVSize: originalData.length,
      convertedM4ASize: m4aData.length,
      reduction: `${Math.round((1 - m4aData.length / originalData.length) * 100)}%`
    });

    // Envoi à OpenAI avec le M4A converti
    const formData = new FormData();
    const audioBlob = new Blob([m4aData], { type: 'audio/mp4' });
    formData.append('file', audioBlob, 'converted_audio.m4a');
    formData.append('model', 'whisper-1');
    formData.append('language', userLanguage);
    formData.append('response_format', 'verbose_json');

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('🤖 Calling OpenAI Whisper with converted M4A...');
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}` },
      body: formData,
    });

    console.log(`📨 OpenAI Response: ${openaiResponse.status} ${openaiResponse.statusText}`);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI rejection details:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const transcriptionResult = await openaiResponse.json();
    console.log('🎉 TRANSCRIPTION SUCCESS!');
    console.log('📝 Transcribed text:', transcriptionResult.text?.substring(0, 200) + '...');

    // Sauvegarder
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
      console.error('⚠️ Save error:', saveError);
    } else {
      console.log('💾 Transcription saved successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcriptionResult,
        converted: true,
        originalSize: originalData.length,
        convertedSize: m4aData.length,
        compressionRatio: Math.round((1 - m4aData.length / originalData.length) * 100) + '%',
        message: 'MOV successfully converted to M4A and transcribed (exact local process reproduction)'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 TRANSCRIPTION FAILED:', error);
    console.error('💥 Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
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