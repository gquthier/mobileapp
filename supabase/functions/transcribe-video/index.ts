// Edge Function - TEST TRANSCRIPTION (Sans Auth)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionRequest {
  videoId: string;
  storageFilePath: string;
  language?: string;
}

// Conversion MOV vers M4A pour compatibilité OpenAI
function convertMOVtoM4A(movData: Uint8Array): Uint8Array {
  console.log(`🔧 Converting MOV to M4A - Input: ${movData.length} bytes`);

  if (movData.length < 1000) {
    throw new Error(`File too small: ${movData.length} bytes`);
  }

  // Analyser le header MOV
  const header = new TextDecoder('utf-8', { fatal: false }).decode(movData.slice(0, 1000));
  const isMOV = header.includes('ftyp') && (header.includes('qt') || header.includes('mov'));

  console.log(`📋 File analysis:`, {
    size: movData.length,
    isMOV,
    hasFileType: header.includes('ftyp')
  });

  if (!isMOV) {
    console.log(`✅ File already compatible, returning as-is`);
    return movData;
  }

  // Chercher les données audio dans l'atom mdat
  let audioStart = 0;
  let audioSize = Math.min(200000, movData.length);

  // Recherche de 'mdat'
  const mdatPattern = new Uint8Array([0x6D, 0x64, 0x61, 0x74]); // 'mdat'
  for (let i = 0; i <= movData.length - 4; i++) {
    if (movData[i] === mdatPattern[0] &&
        movData[i + 1] === mdatPattern[1] &&
        movData[i + 2] === mdatPattern[2] &&
        movData[i + 3] === mdatPattern[3]) {
      audioStart = i + 4;
      audioSize = Math.min(200000, movData.length - audioStart);
      console.log(`📍 Found mdat at ${i}, extracting ${audioSize} bytes`);
      break;
    }
  }

  const audioData = movData.slice(audioStart, audioStart + audioSize);

  // Créer un fichier M4A avec header correct
  const ftypAtom = new Uint8Array([
    0x00, 0x00, 0x00, 0x20, // size
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x4D, 0x34, 0x41, 0x20, // 'M4A '
    0x00, 0x00, 0x00, 0x00, // version
    0x4D, 0x34, 0x41, 0x20, // 'M4A '
    0x6D, 0x70, 0x34, 0x32, // 'mp42'
    0x69, 0x73, 0x6F, 0x6D, // 'isom'
    0x00, 0x00, 0x00, 0x00  // padding
  ]);

  // mdat atom avec données audio
  const mdatSize = 8 + audioData.length;
  const mdatAtom = new Uint8Array(mdatSize);
  mdatAtom[0] = (mdatSize >> 24) & 0xFF;
  mdatAtom[1] = (mdatSize >> 16) & 0xFF;
  mdatAtom[2] = (mdatSize >> 8) & 0xFF;
  mdatAtom[3] = mdatSize & 0xFF;
  mdatAtom[4] = 0x6D; mdatAtom[5] = 0x64; mdatAtom[6] = 0x61; mdatAtom[7] = 0x74; // 'mdat'
  mdatAtom.set(audioData, 8);

  // Assemblage final
  const m4aFile = new Uint8Array(ftypAtom.length + mdatAtom.length);
  m4aFile.set(ftypAtom, 0);
  m4aFile.set(mdatAtom, ftypAtom.length);

  console.log(`✅ M4A created: ${m4aFile.length} bytes (${Math.round((1-m4aFile.length/movData.length)*100)}% compression)`);
  return m4aFile;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let videoId: string;

  try {
    console.log('🚀 Starting TEST transcription (NO AUTH)');

    const { videoId: reqVideoId, storageFilePath, language = 'fr' }: TranscriptionRequest = await req.json();
    videoId = reqVideoId;

    console.log('📋 Request:', { videoId, storageFilePath, language });

    // BYPASS AUTHENTICATION - DIRECT ACCESS TO PUBLIC STORAGE
    const supabaseUrl = "https://eenyzudwktcjpefpoapi.supabase.co";
    const publicStorageUrl = `${supabaseUrl}/storage/v1/object/public/videos/${storageFilePath}`;

    console.log('📥 Downloading from public URL:', publicStorageUrl);

    // Télécharger directement depuis l'URL publique
    const downloadResponse = await fetch(publicStorageUrl);

    if (!downloadResponse.ok) {
      throw new Error(`Download failed: ${downloadResponse.status} - ${downloadResponse.statusText}`);
    }

    const videoBuffer = await downloadResponse.arrayBuffer();
    const originalData = new Uint8Array(videoBuffer);

    console.log('📊 Downloaded data:', originalData.length, 'bytes');

    if (originalData.length < 1000) {
      throw new Error(`File too small: ${originalData.length} bytes - likely corrupted or not a video file`);
    }

    // Log first few bytes to verify it's not metadata
    const firstBytes = Array.from(originalData.slice(0, 50)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log('🔍 First 50 bytes:', firstBytes);

    // Conversion MOV→M4A
    console.log('🔄 Starting MOV→M4A conversion...');
    const m4aData = convertMOVtoM4A(originalData);

    console.log(`📤 Sending M4A to OpenAI:`, {
      originalSize: originalData.length,
      convertedSize: m4aData.length,
      reduction: `${Math.round((1 - m4aData.length / originalData.length) * 100)}%`
    });

    // Envoi à OpenAI
    const formData = new FormData();
    const audioBlob = new Blob([m4aData], { type: 'audio/mp4' });
    formData.append('file', audioBlob, 'converted_audio.m4a');
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('🤖 Calling OpenAI Whisper...');
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}` },
      body: formData,
    });

    console.log(`📨 OpenAI Response: ${openaiResponse.status}`);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const transcriptionResult = await openaiResponse.json();
    console.log('🎉 TRANSCRIPTION SUCCESS!');
    console.log('📝 Text:', transcriptionResult.text?.substring(0, 100) + '...');

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcriptionResult,
        converted: true,
        originalSize: originalData.length,
        convertedSize: m4aData.length,
        message: 'TEST: MOV successfully converted to M4A and transcribed (NO AUTH)',
        downloadUrl: publicStorageUrl,
        firstBytesHex: firstBytes
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 TEST Transcription failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        videoId: videoId || 'unknown'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});