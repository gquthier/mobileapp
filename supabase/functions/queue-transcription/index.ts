// Edge Function - QUEUE TRANSCRIPTION JOB
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionRequest {
  videoUrl: string;
  userId?: string;
  videoDuration?: number;
  videoSizeBytes?: number;
  videoId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let userId: string;

  try {
    console.log('🚀 Starting transcription job creation');

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

    userId = user.id;
    console.log('✅ User authenticated:', userId);

    // Récupérer les données de la requête
    const { videoUrl, videoDuration, videoSizeBytes, videoId }: TranscriptionRequest = await req.json();

    if (!videoUrl) {
      throw new Error('videoUrl is required');
    }

    console.log('📋 Creating transcription job:', {
      videoUrl,
      userId,
      videoDuration,
      videoSizeBytes,
      videoId
    });

    // Créer le job de transcription
    const jobData: any = {
      user_id: userId,
      video_url: videoUrl,
      video_duration_seconds: videoDuration,
      video_size_bytes: videoSizeBytes,
      status: 'pending'
    };

    // Ajouter video_id si fourni
    if (videoId) {
      jobData.video_id = videoId;
    }

    const { data: job, error: jobError } = await supabaseClient
      .from('transcription_jobs')
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      console.error('❌ Job creation error:', jobError);
      throw new Error(`Failed to create transcription job: ${jobError.message}`);
    }

    console.log('✅ Transcription job created:', job.id);

    // Trigger le worker immédiatement (fire and forget)
    processNextJob(job.id);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        status: job.status,
        message: 'Transcription queued successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('💥 Queue transcription failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        userId: userId || 'unknown'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Fonction asynchrone pour déclencher le processing (ne bloque pas la réponse)
async function processNextJob(jobId: string) {
  try {
    console.log('🔥 Triggering worker for job:', jobId);

    // Invoke le worker Edge Function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-transcription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'apikey': `${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobId })
    });

    if (!response.ok) {
      console.error('❌ Worker trigger failed:', response.status, await response.text());
    } else {
      console.log('✅ Worker triggered successfully');
    }
  } catch (error) {
    console.error('❌ Failed to trigger worker:', error);
    // Ne pas faire échouer la requête principale pour ça
  }
}