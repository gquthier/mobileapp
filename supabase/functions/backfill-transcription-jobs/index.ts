// Edge Function - BACKFILL TRANSCRIPTION JOBS
// Creates transcription jobs for existing videos that don't have them yet
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillRequest {
  limit?: number; // Limit number of videos to process (default: 50)
  userId?: string; // Optional: only process videos for specific user
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { limit = 50, userId }: BackfillRequest = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔍 Finding videos without transcription jobs...');

    // Find all videos that don't have transcription jobs
    // Using a LEFT JOIN to find videos with no matching transcription_jobs
    let query = supabaseClient
      .from('videos')
      .select(`
        id,
        file_path,
        duration,
        user_id,
        created_at
      `)
      .not('file_path', 'is', null) // Must have a file_path
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: videos, error: videosError } = await query;

    if (videosError) {
      throw new Error(`Failed to fetch videos: ${videosError.message}`);
    }

    if (!videos || videos.length === 0) {
      console.log('✅ No videos found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No videos to process',
          processed: 0,
          created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📹 Found ${videos.length} videos, checking for existing jobs...`);

    // Check which videos already have transcription jobs
    const videoIds = videos.map(v => v.id);
    const { data: existingJobs, error: jobsError } = await supabaseClient
      .from('transcription_jobs')
      .select('video_id')
      .in('video_id', videoIds);

    if (jobsError) {
      throw new Error(`Failed to check existing jobs: ${jobsError.message}`);
    }

    const existingVideoIds = new Set(existingJobs?.map(j => j.video_id) || []);
    const videosNeedingJobs = videos.filter(v => !existingVideoIds.has(v.id));

    console.log(`📊 ${videosNeedingJobs.length} videos need transcription jobs`);

    if (videosNeedingJobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All videos already have transcription jobs',
          processed: videos.length,
          created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create transcription jobs for videos that don't have them
    const jobsToCreate = videosNeedingJobs.map(video => {
      // Build video URL from file_path
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const videoUrl = `${supabaseUrl}/storage/v1/object/public/videos/${video.file_path}`;

      return {
        user_id: video.user_id,
        video_id: video.id,
        video_url: videoUrl,
        video_duration_seconds: video.duration || null,
        status: 'pending'
      };
    });

    console.log(`🚀 Creating ${jobsToCreate.length} transcription jobs...`);

    const { data: createdJobs, error: createError } = await supabaseClient
      .from('transcription_jobs')
      .insert(jobsToCreate)
      .select('id');

    if (createError) {
      console.error('❌ Error creating jobs:', createError);
      throw new Error(`Failed to create transcription jobs: ${createError.message}`);
    }

    console.log(`✅ Created ${createdJobs?.length || 0} transcription jobs`);

    // Trigger processing for each job (fire and forget)
    if (createdJobs && createdJobs.length > 0) {
      console.log('🔄 Triggering job processing...');

      // Trigger process-transcription for each job
      for (const job of createdJobs) {
        try {
          // Call process-transcription function (non-blocking)
          supabaseClient.functions.invoke('process-transcription', {
            body: { jobId: job.id }
          }).catch(err => {
            console.error(`⚠️ Failed to trigger processing for job ${job.id}:`, err);
          });
        } catch (error) {
          console.error(`⚠️ Error triggering job ${job.id}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdJobs?.length || 0} transcription jobs`,
        processed: videos.length,
        created: createdJobs?.length || 0,
        jobs: createdJobs?.map(j => j.id)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('💥 Backfill failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
