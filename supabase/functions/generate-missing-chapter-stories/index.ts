// Edge Function - GENERATE MISSING CHAPTER STORIES
// Automatically generates AI stories for old chapters that don't have them yet
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateMissingStoriesRequest {
  userId?: string; // Optional: process only for specific user
  limit?: number; // Optional: limit number of chapters to process (default: 10)
  skipChapterIds?: string[]; // Optional: skip specific chapters
}

interface ProcessingResult {
  chapterId: string;
  chapterTitle: string;
  success: boolean;
  error?: string;
  generatedTitle?: string;
  keywordsCount?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, limit = 10, skipChapterIds = [] }: GenerateMissingStoriesRequest = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🚀 Starting batch generation of missing chapter stories');
    console.log(`   User ID filter: ${userId || 'ALL USERS'}`);
    console.log(`   Limit: ${limit} chapters`);
    console.log(`   Skip chapters: ${skipChapterIds.length > 0 ? skipChapterIds.join(', ') : 'none'}`);

    // 1. Find chapters without AI content
    let query = supabaseClient
      .from('chapters')
      .select('id, title, user_id, started_at, ended_at')
      .is('ai_title', null) // Chapters without AI-generated title
      .eq('is_current', false) // Only old chapters (not current chapter)
      .order('started_at', { ascending: false })
      .limit(limit);

    // Filter by user if specified
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: chapters, error: chaptersError } = await query;

    if (chaptersError) {
      throw new Error(`Failed to fetch chapters: ${chaptersError.message}`);
    }

    if (!chapters || chapters.length === 0) {
      console.log('✅ No chapters found without AI stories');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No chapters need story generation',
          processed: 0,
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Filter out skipped chapters
    const chaptersToProcess = chapters.filter(ch => !skipChapterIds.includes(ch.id));

    console.log(`📚 Found ${chaptersToProcess.length} chapters without AI stories`);

    // 2. Process each chapter
    const results: ProcessingResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const chapter of chaptersToProcess) {
      console.log(`\n📖 Processing chapter: "${chapter.title}" (${chapter.id})`);

      try {
        console.log(`📅 Chapter period: ${chapter.started_at} → ${chapter.ended_at || 'ongoing'}`);

        // Check if chapter has at least ONE transcription by searching by dates
        // Strategy: 2 separate queries instead of complex JOIN
        const endDate = chapter.ended_at || new Date().toISOString();

        // First: Get videos in date range
        const { data: videosInPeriod, error: videosError } = await supabaseClient
          .from('videos')
          .select('id, created_at')
          .eq('user_id', chapter.user_id)
          .gte('created_at', chapter.started_at)
          .lte('created_at', endDate);

        if (videosError) {
          throw new Error(`Failed to fetch videos: ${videosError.message}`);
        }

        const totalVideos = videosInPeriod?.length || 0;

        if (totalVideos === 0) {
          console.log(`⚠️ Skipping: No videos in chapter period`);
          results.push({
            chapterId: chapter.id,
            chapterTitle: chapter.title || 'Untitled',
            success: false,
            error: 'No videos in chapter period'
          });
          failureCount++;
          continue;
        }

        // Second: Get transcriptions for these videos
        const videoIds = videosInPeriod.map(v => v.id);

        const { data: transcriptionJobs, error: transError } = await supabaseClient
          .from('transcription_jobs')
          .select('id, video_id, status')
          .in('video_id', videoIds);

        if (transError) {
          throw new Error(`Failed to check transcriptions: ${transError.message}`);
        }

        const totalJobs = transcriptionJobs?.length || 0;
        const completedJobs = transcriptionJobs?.filter(j => j.status === 'completed') || [];
        const transcriptionCount = completedJobs.length;

        console.log(`🔍 Found ${totalVideos} videos in date range`);
        console.log(`📊 ${totalJobs} transcription jobs, ${transcriptionCount} completed`);

        if (transcriptionCount === 0) {
          console.log(`⚠️ Skipping: No transcriptions available (0/${totalVideos} videos transcribed)`);
          results.push({
            chapterId: chapter.id,
            chapterTitle: chapter.title || 'Untitled',
            success: false,
            error: `No transcriptions available (0/${totalVideos} videos in period)`
          });
          failureCount++;
          continue;
        }

        // Proceed even with partial transcriptions
        console.log(`📝 Chapter has ${transcriptionCount}/${totalVideos} videos transcribed - proceeding...`);

        // Call extract-chapter-keywords function
        console.log('🧠 Calling extract-chapter-keywords...');

        const { data: storyResult, error: storyError } = await supabaseClient.functions.invoke(
          'extract-chapter-keywords',
          {
            body: { chapterId: chapter.id }
          }
        );

        if (storyError) {
          throw new Error(`Story extraction failed: ${storyError.message}`);
        }

        if (!storyResult.success) {
          throw new Error(storyResult.error || storyResult.message || 'Unknown error');
        }

        console.log(`✅ Story generated successfully for "${chapter.title}"`);
        console.log(`   Title: "${storyResult.chapter_title}"`);
        console.log(`   Keywords: ${storyResult.keywords?.length || 0}`);

        results.push({
          chapterId: chapter.id,
          chapterTitle: chapter.title || 'Untitled',
          success: true,
          generatedTitle: storyResult.chapter_title,
          keywordsCount: storyResult.keywords?.length || 0
        });

        successCount++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`❌ Failed to process chapter "${chapter.title}":`, error.message);
        results.push({
          chapterId: chapter.id,
          chapterTitle: chapter.title || 'Untitled',
          success: false,
          error: error.message
        });
        failureCount++;
      }
    }

    console.log('\n📊 Batch processing complete:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: chaptersToProcess.length,
        successCount,
        failureCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('💥 Batch generation failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
