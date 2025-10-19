// Edge Function - PROCESS TRANSCRIPTION WORKER
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB limit pour Whisper

interface ProcessRequest {
  jobId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { jobId }: ProcessRequest = await req.json();

  if (!jobId) {
    return new Response(
      JSON.stringify({ error: 'jobId is required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log('🔄 Starting transcription processing for job:', jobId);

    // 1. Récupérer le job
    const { data: job, error: jobError } = await supabaseClient
      .from('transcription_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message || 'No job data'}`);
    }

    console.log('📋 Processing job:', {
      id: job.id,
      status: job.status,
      videoUrl: job.video_url
    });

    // 2. Passer directement à la transcription (AssemblyAI gère l'URL)
    await updateJobStatus(supabaseClient, jobId, 'transcribing');

    console.log('🔤 Starting AssemblyAI transcription (primary method)...');

    const { data, error } = await supabaseClient.functions.invoke('transcribe-assemblyai', {
      body: {
        videoUrl: job.video_url,
        jobId: jobId
      }
    });

    if (error) {
      throw new Error(`AssemblyAI function error: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(`AssemblyAI failed: ${data.error}`);
    }

    const transcription = data.transcription;

    console.log('✅ AssemblyAI transcription completed successfully');
    console.log(`   Text length: ${transcription.text?.length || 0} characters`);
    console.log(`   Segments: ${transcription.segments?.length || 0}`);
    console.log(`   Language: ${transcription.language || 'unknown'}`);
    console.log(`   📝 Full Text: "${transcription.text || 'No text available'}"`)

    // 8. Analyser les highlights avec l'IA (via Edge Function)
    console.log('🧠 Analyzing highlights with AI via Edge Function...');
    let highlights = null;
    try {
      highlights = await callGenerateHighlightsFunction(supabaseClient, transcription, jobId);
      console.log('✅ Highlights generated successfully via Edge Function');
    } catch (error) {
      console.error('⚠️ Highlights generation failed:', error);
      // Ne pas faire échouer la transcription si l'analyse échoue
    }

    // 9. Sauvegarder la transcription avec highlights
    const { error: updateError } = await supabaseClient
      .from('transcription_jobs')
      .update({
        transcription: transcription,
        transcription_text: transcription.text,
        language: transcription.language,
        transcript_highlight: highlights,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateError) {
      throw new Error(`Failed to save transcription: ${updateError.message}`);
    }

    console.log('🎉 Transcription completed successfully!');
    console.log('📝 Text preview:', transcription.text?.substring(0, 100) + '...');

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        transcription: transcription.text,
        language: transcription.language
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('💥 Processing failed:', error);

    // Récupérer le job pour incrémenter retry_count
    const { data: currentJob } = await supabaseClient
      .from('transcription_jobs')
      .select('retry_count')
      .eq('id', jobId)
      .single();

    // Mettre à jour le job avec l'erreur
    await supabaseClient
      .from('transcription_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        retry_count: (currentJob?.retry_count || 0) + 1
      })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper: Mise à jour du statut
async function updateJobStatus(supabase: any, jobId: string, status: string) {
  const updateData: any = { status };

  if (status === 'transcribing') {
    updateData.transcription_started_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('transcription_jobs')
    .update(updateData)
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to update job status: ${error.message}`);
  }

  console.log(`📊 Job ${jobId} status updated to: ${status}`);
}

// Helper: Télécharger vidéo depuis Supabase Storage
async function downloadVideoFromStorage(supabase: any, videoPath: string): Promise<Uint8Array> {
  try {
    // Si c'est un chemin relatif, télécharger depuis le storage
    if (!videoPath.startsWith('http')) {
      const { data, error } = await supabase.storage
        .from('videos')
        .download(videoPath);

      if (error) {
        throw new Error(`Storage download failed: ${error.message}`);
      }

      return new Uint8Array(await data.arrayBuffer());
    }

    // Sinon, télécharger depuis l'URL publique
    const response = await fetch(videoPath);
    if (!response.ok) {
      throw new Error(`HTTP download failed: ${response.status} ${response.statusText}`);
    }

    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    throw new Error(`Failed to download video: ${error.message}`);
  }
}

// Helper: Upload audio extrait
async function uploadAudio(supabase: any, audioData: Uint8Array, jobId: string): Promise<string> {
  const fileName = `audio_${jobId}.mp3`;

  const { data, error } = await supabase.storage
    .from('videos')
    .upload(fileName, audioData, {
      contentType: 'audio/mpeg',
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.warn('⚠️ Failed to upload extracted audio:', error.message);
    return ''; // Non-blocking
  }

  return data.path;
}

// FONCTION CRITIQUE: Extraction audio depuis MOV/MP4
async function extractAudioFromVideo(videoData: Uint8Array): Promise<Uint8Array> {
  console.log('🔧 Starting audio extraction from video data...');

  try {
    // SOLUTION ULTIME: Utiliser FFmpeg WASM pour extraction audio réelle
    console.log('🎬 Loading FFmpeg WebAssembly...');

    // Import FFmpeg WASM avec versions compatibles
    const { FFmpeg } = await import('https://esm.sh/@ffmpeg/ffmpeg@0.12.7');
    const { fetchFile } = await import('https://esm.sh/@ffmpeg/util@0.12.1');

    const ffmpeg = new FFmpeg();

    // Configuration pour Deno avec gestion d'erreurs
    ffmpeg.on('log', ({ type, message }) => {
      console.log(`FFmpeg ${type}:`, message);
    });

    // Charger FFmpeg avec URLs stables
    await ffmpeg.load({
      coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.js',
      wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.wasm',
    });

    console.log('✅ FFmpeg loaded successfully');

    // Écrire le fichier vidéo
    await ffmpeg.writeFile('input.mov', videoData);

    // Extraire l'audio en MP3 (compatible avec OpenAI Whisper)
    console.log('🎵 Extracting audio to MP3 format...');
    await ffmpeg.exec([
      '-i', 'input.mov',
      '-vn', // Pas de vidéo
      '-acodec', 'libmp3lame', // Codec MP3
      '-ab', '128k', // Bitrate 128kbps
      '-ar', '44100', // Sample rate 44.1kHz
      '-f', 'mp3', // Format MP3
      'output.mp3'
    ]);

    // Lire le fichier audio
    const audioData = await ffmpeg.readFile('output.mp3');
    const audioArray = new Uint8Array(audioData as ArrayBuffer);

    console.log(`✅ Audio extracted: ${audioArray.byteLength} bytes`);

    // Vérifier la taille
    if (audioArray.byteLength > MAX_AUDIO_SIZE) {
      console.log(`📏 Audio too large, truncating to ${MAX_AUDIO_SIZE} bytes`);
      return audioArray.slice(0, MAX_AUDIO_SIZE);
    }

    return audioArray;

  } catch (error) {
    console.error('❌ FFmpeg extraction failed:', error);
    console.log('⚠️ Fallback: sending original video (may not work)');

    // Fallback: envoyer le fichier vidéo tel quel
    if (videoData.byteLength > MAX_AUDIO_SIZE) {
      return videoData.slice(0, MAX_AUDIO_SIZE);
    }
    return videoData;
  }
}

// Extraction AAC simple (pour MOV/MP4 avec audio AAC)
function extractAACAudio(data: Uint8Array): Uint8Array {
  console.log('🔍 Searching for audio data in MP4/MOV atoms...');

  let offset = 0;
  let mdatData: Uint8Array | null = null;

  // Rechercher l'atom 'mdat' qui contient les données média
  while (offset < data.length - 8) {
    if (offset + 8 > data.length) break;

    const size = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0);
    if (size < 8 || size > data.length - offset) {
      offset += 1;
      continue;
    }

    const type = new TextDecoder().decode(data.slice(offset + 4, offset + 8));

    console.log(`📦 Found atom: ${type}, size: ${size}`);

    if (type === 'mdat') {
      // Extraire les données de l'atom mdat
      const dataStart = offset + 8;
      const dataEnd = Math.min(offset + size, data.length);
      mdatData = data.slice(dataStart, dataEnd);
      console.log(`🎵 Extracted mdat data: ${mdatData.length} bytes`);
      break;
    }

    offset += size;
  }

  if (!mdatData) {
    throw new Error('No mdat atom found in video file');
  }

  // Pour simplicité, on crée un "pseudo-MP3" avec les données extraites
  return createSimpleAudioFile(mdatData);
}

// Créer un fichier audio simple à partir des données extraites
function createSimpleAudioFile(audioData: Uint8Array): Uint8Array {
  // En réalité, on devrait créer un vrai header MP3/M4A
  // Pour le test, on ajoute juste un header basique

  console.log('🛠️ Creating simple audio file wrapper...');

  // Header MP3 simplifié (peut ne pas être parfait)
  const mp3Header = new Uint8Array([
    0xFF, 0xFB, 0x90, 0x00, // MP3 frame header basique
  ]);

  // Limiter la taille pour respecter la limite de 25MB
  const maxDataSize = MAX_AUDIO_SIZE - mp3Header.length - 1000; // margin de sécurité
  const finalAudioData = audioData.length > maxDataSize
    ? audioData.slice(0, maxDataSize)
    : audioData;

  // Combiner header + données
  const result = new Uint8Array(mp3Header.length + finalAudioData.length);
  result.set(mp3Header, 0);
  result.set(finalAudioData, mp3Header.length);

  console.log(`✅ Created audio file: ${result.length} bytes`);
  return result;
}

// Fonction pour appeler GPT-4O Mini Transcribe
async function transcribeWithWhisper(audioData: Uint8Array): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('🤖 Calling OpenAI GPT-4O Mini Transcribe with MP4 video...');
  console.log(`📊 Audio data size: ${audioData.byteLength} bytes`);

  const formData = new FormData();

  // IMPORTANT: Envoyer comme MP3 (audio extrait par FFmpeg)
  const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model', 'whisper-1'); // Whisper-1 pour audio MP3
  formData.append('response_format', 'json'); // GPT-4O Mini supporte seulement 'json' ou 'text'
  formData.append('language', 'fr'); // Français par défaut

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: formData
  });

  console.log(`📨 OpenAI Response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI error:', errorText);
    throw new Error(`Whisper-1 API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Transcription successful with Whisper-1');

  // Ajouter des timestamps simulés si pas disponibles
  const enhancedResult = await addSimulatedTimestamps(result, audioData.byteLength);

  // Log des informations de timing
  if (enhancedResult.segments && enhancedResult.segments.length > 0) {
    console.log(`🎬 Transcription avec ${enhancedResult.segments.length} segments temporels (simulés)`);
    console.log('📋 Premier segment:', {
      start: enhancedResult.segments[0].start,
      end: enhancedResult.segments[0].end,
      text: enhancedResult.segments[0].text?.substring(0, 50) + '...'
    });
  }

  return enhancedResult;
}

// Fonction pour ajouter des timestamps simulés à une transcription GPT-4O
async function addSimulatedTimestamps(transcriptionResult: any, fileSizeBytes: number): Promise<any> {
  try {
    // Si on a déjà des segments avec timestamps, retourner tel quel
    if (transcriptionResult.segments && transcriptionResult.segments.length > 0) {
      return transcriptionResult;
    }

    const text = transcriptionResult.text || '';
    if (!text.trim()) {
      return transcriptionResult;
    }

    // Estimer la durée basée sur la taille du fichier (très approximatif)
    // Assume ~1MB par 30 secondes pour une vidéo 720p
    const estimatedDurationSeconds = Math.max(5, Math.floor(fileSizeBytes / (1024 * 1024)) * 30);

    console.log(`🕐 Estimating duration: ${estimatedDurationSeconds}s from ${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB`);

    // Diviser le texte en phrases approximatives
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgTimePerSentence = estimatedDurationSeconds / Math.max(1, sentences.length);

    // Créer des segments simulés
    const segments = sentences.map((sentence, index) => {
      const start = Math.round((index * avgTimePerSentence) * 10) / 10;
      const end = Math.round(((index + 1) * avgTimePerSentence) * 10) / 10;

      return {
        start,
        end: Math.min(end, estimatedDurationSeconds),
        text: sentence.trim()
      };
    });

    console.log(`🎬 Created ${segments.length} simulated segments for ${estimatedDurationSeconds}s duration`);

    // Retourner le résultat enrichi avec segments simulés
    return {
      ...transcriptionResult,
      segments,
      duration: estimatedDurationSeconds,
      language: transcriptionResult.language || 'fr'
    };

  } catch (error) {
    console.error('❌ Error creating simulated timestamps:', error);
    return transcriptionResult; // Retourner l'original en cas d'erreur
  }
}

// Helper pour gérer les gros fichiers (chunking si > 25MB)
async function handleLargeAudio(audioData: Uint8Array, supabase: any, jobId: string): Promise<any> {
  console.log('📊 Handling large audio file with chunking...');

  const chunkSize = MAX_AUDIO_SIZE - 1000; // Marge de sécurité
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < audioData.byteLength; i += chunkSize) {
    const chunk = audioData.slice(i, Math.min(i + chunkSize, audioData.byteLength));
    chunks.push(chunk);
  }

  console.log(`📦 Created ${chunks.length} chunks`);

  // Transcrire chaque chunk
  const transcriptions: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔄 Processing chunk ${i + 1}/${chunks.length}`);

    const chunkResult = await transcribeWithWhisper(chunks[i]);

    // Sauvegarder le chunk
    await supabase.from('transcription_chunks').insert({
      job_id: jobId,
      chunk_index: i,
      transcription: chunkResult.text,
      status: 'completed'
    });

    transcriptions.push(chunkResult.text);
  }

  // Merger les transcriptions
  const mergedText = transcriptions.join(' ');

  console.log(`✅ Merged ${chunks.length} chunks into final transcription`);

  return {
    text: mergedText,
    language: 'fr',
    chunks: chunks.length,
    segments: [] // Pas de segments détaillés pour les chunks
  };
}

// Helper: Appeler l'Edge Function generate-highlights
async function callGenerateHighlightsFunction(supabase: any, transcription: any, jobId: string): Promise<any> {
  console.log('📞 Calling generate-highlights Edge Function...');

  try {
    const { data, error } = await supabase.functions.invoke('generate-highlights', {
      body: {
        transcription,
        jobId
      }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      throw new Error(`Generate highlights function error: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(`Generate highlights failed: ${data.error}`);
    }

    console.log('✅ Edge Function call successful');
    return data.highlights;

  } catch (error) {
    console.error('💥 Failed to call generate-highlights function:', error);
    throw error;
  }
}