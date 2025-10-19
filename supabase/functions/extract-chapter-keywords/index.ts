// Edge Function - EXTRACT CHAPTER KEYWORDS
// Analyzes all video transcriptions in a chapter and extracts max 10 keywords using AI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

interface ExtractKeywordsRequest {
  chapterId: string;
}

interface ChapterStoryResponse {
  chapter_title: string;
  short_summary: string;
  detailed_description: string;
  keywords: string[];
  analysis_summary: string;
  total_videos_analyzed: number;
  primary_themes: string[];
  confidence_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { chapterId }: ExtractKeywordsRequest = await req.json();

    if (!chapterId) {
      return new Response(
        JSON.stringify({ error: 'chapterId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔑 Starting keyword extraction for chapter:', chapterId);

    // 1. Fetch chapter details
    const { data: chapter, error: chapterError } = await supabaseClient
      .from('chapters')
      .select('id, title, description, started_at, ended_at, user_id')
      .eq('id', chapterId)
      .single();

    if (chapterError || !chapter) {
      throw new Error(`Chapter not found: ${chapterError?.message || 'Invalid chapter ID'}`);
    }

    console.log(`📖 Chapter: "${chapter.title}"`);
    console.log(`📅 Chapter period: ${chapter.started_at} → ${chapter.ended_at || 'ongoing'}`);

    // 2. Fetch videos created during chapter period (simplified: 2 separate queries)
    console.log(`🔍 Searching for videos between chapter dates...`);

    const endDate = chapter.ended_at || new Date().toISOString();

    // First: Get all videos in the date range
    const { data: videosInPeriod, error: videosError } = await supabaseClient
      .from('videos')
      .select('id, title, created_at')
      .eq('user_id', chapter.user_id)
      .gte('created_at', chapter.started_at)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (videosError) {
      console.error('❌ Error fetching videos:', videosError);
      throw new Error(`Failed to fetch videos: ${videosError.message}`);
    }

    console.log(`📹 Found ${videosInPeriod?.length || 0} videos in date range`);

    if (!videosInPeriod || videosInPeriod.length === 0) {
      console.log('⚠️ No videos in chapter period');
      return new Response(
        JSON.stringify({
          success: true,
          keywords: [],
          message: 'No videos in chapter period',
          videos_total: 0,
          videos_transcribed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Second: Get transcriptions for these videos
    const videoIds = videosInPeriod.map(v => v.id);

    const { data: transcriptionJobs, error: transError } = await supabaseClient
      .from('transcription_jobs')
      .select('video_id, transcription_text, transcription, status')
      .in('video_id', videoIds);

    if (transError) {
      console.error('❌ Error fetching transcriptions:', transError);
      throw new Error(`Failed to fetch transcriptions: ${transError.message}`);
    }

    console.log(`🔎 Raw query result: found ${transcriptionJobs?.length || 0} transcription jobs (any status)`);

    if (transcriptionJobs && transcriptionJobs.length > 0) {
      const statusCounts = transcriptionJobs.reduce((acc: Record<string, number>, t: any) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});
      console.log(`📊 Transcription jobs by status:`, statusCounts);
    }

    // Filter only completed transcriptions
    const completedTranscriptions = transcriptionJobs?.filter((t: any) => t.status === 'completed') || [];

    console.log(`✅ Found ${completedTranscriptions.length} COMPLETED transcriptions out of ${videosInPeriod.length} videos`);

    // 3. Build video array with transcriptions
    const videosWithActualTranscriptions = videosInPeriod
      .map(video => {
        const trans = completedTranscriptions.find((t: any) => t.video_id === video.id);

        if (!trans) return null; // Skip videos without transcriptions

        const transcriptionText = trans.transcription_text || trans.transcription?.text || '';

        return {
          id: video.id,
          title: video.title || 'Untitled',
          transcription: transcriptionText,
          created_at: video.created_at
        };
      })
      .filter(v => v !== null);

    console.log(`📝 Prepared videos with transcriptions:`);
    console.log(`   - ${videosWithActualTranscriptions.length} WITH transcriptions`);
    console.log(`   - ${videosInPeriod.length - videosWithActualTranscriptions.length} WITHOUT transcriptions`);

    // Log sample of videos with transcriptions for debugging
    if (videosWithActualTranscriptions.length > 0) {
      const sample = videosWithActualTranscriptions[0];
      console.log(`📄 Sample transcription preview (first video):`);
      console.log(`   Title: "${sample.title}"`);
      console.log(`   Transcription length: ${sample.transcription.length} chars`);
      console.log(`   Preview: ${sample.transcription.substring(0, 100)}...`);
    }

    // Only use videos with actual transcriptions for AI analysis
    if (videosWithActualTranscriptions.length === 0) {
      console.log('⚠️ No transcriptions available yet, but will retry later');
      return new Response(
        JSON.stringify({
          success: true,
          keywords: [],
          message: `No transcriptions available yet (0/${videosInPeriod.length} videos transcribed)`,
          videos_total: videosInPeriod.length,
          videos_transcribed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 4. Prepare input for AI
    const aiInput = {
      chapter: {
        id: chapter.id,
        title: chapter.title || 'Untitled Chapter',
        description: chapter.description || '',
        started_at: chapter.started_at,
        ended_at: chapter.ended_at || null,
        total_videos: videosInPeriod.length,
        videos_with_transcriptions: videosWithActualTranscriptions.length
      },
      videos: videosWithActualTranscriptions.map((v: any) => ({
        id: v.id,
        title: v.title,
        transcription: v.transcription
      }))
    };

    // 6. Extract chapter story with AI
    const storyResult = await extractChapterStoryWithAI(aiInput);

    console.log(`✅ Extracted chapter story with ${storyResult.keywords.length} keywords`);
    console.log(`📖 Chapter title: "${storyResult.chapter_title}"`);

    // 7. Update chapter with extracted AI content
    const { error: updateError } = await supabaseClient
      .rpc('update_chapter_ai_content', {
        chapter_uuid: chapterId,
        new_keywords: storyResult.keywords,
        new_title: storyResult.chapter_title,
        new_short_summary: storyResult.short_summary,
        new_detailed_description: storyResult.detailed_description
      });

    if (updateError) {
      console.error('⚠️ Failed to update chapter AI content in DB:', updateError);
      // Don't throw - AI content was extracted successfully
    } else {
      console.log('✅ Chapter AI content successfully saved to database');
    }

    return new Response(
      JSON.stringify({
        success: true,
        chapter_title: storyResult.chapter_title,
        short_summary: storyResult.short_summary,
        detailed_description: storyResult.detailed_description,
        keywords: storyResult.keywords,
        analysis_summary: storyResult.analysis_summary,
        total_videos_analyzed: storyResult.total_videos_analyzed,
        primary_themes: storyResult.primary_themes,
        confidence_score: storyResult.confidence_score
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('💥 Keyword extraction failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper: Extract chapter story with OpenAI
async function extractChapterStoryWithAI(input: any): Promise<ChapterStoryResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('🧠 Extracting chapter story with AI (title + summary + description + keywords)...');

  // Prompt ID from OpenAI console (VERSION 2)
  const promptId = "pmpt_68f39dc7efe88197a084a811dd2cecc807249d3b3f77f23c";
  const promptVersion = "2";

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
        input: `Analyze this chapter and its video transcriptions to generate a complete autobiographical story.

IMPORTANT: This chapter has ${input.chapter.total_videos} total videos, but only ${input.chapter.videos_with_transcriptions} have transcriptions available.
Work with the available transcriptions to generate the best possible analysis.

INPUT DATA:
${JSON.stringify(input, null, 2)}

Generate a JSON response with:
- chapter_title (max 3 words, literary, growth-focused)
- short_summary (1 sentence, first person)
- detailed_description (max 10 sentences, first person, autobiographical)
- keywords (max 10 single words)
- analysis_summary (mention coverage: ${input.chapter.videos_with_transcriptions}/${input.chapter.total_videos} videos analyzed)
- total_videos_analyzed (number of videos with transcriptions used)
- primary_themes (array of main themes)
- confidence_score (0-1, lower if many transcriptions missing)`,
        model: 'gpt-4o',
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

    // Extract response from nested structure
    if (!result.output || !Array.isArray(result.output) || result.output.length === 0) {
      console.error('❌ Invalid output structure:', JSON.stringify(result, null, 2));
      throw new Error('Invalid response from OpenAI Responses API - no output array');
    }

    const outputMessage = result.output[0];
    if (!outputMessage.content || !Array.isArray(outputMessage.content) || outputMessage.content.length === 0) {
      console.error('❌ Invalid content structure:', JSON.stringify(outputMessage, null, 2));
      throw new Error('Invalid response from OpenAI Responses API - no content array');
    }

    const keywordsContent = outputMessage.content[0].text;

    if (!keywordsContent) {
      console.error('❌ No text field in content');
      throw new Error('Invalid response from OpenAI Responses API - no text field');
    }

    console.log('📝 Extracted keywords text (length):', keywordsContent.length);

    // Clean markdown code blocks if present (OpenAI often wraps JSON in ```json ... ```)
    let cleanedContent = keywordsContent.trim();

    // Remove markdown code blocks
    if (cleanedContent.startsWith('```')) {
      console.log('🧹 Removing markdown code blocks...');
      cleanedContent = cleanedContent
        .replace(/^```json\s*/i, '') // Remove opening ```json
        .replace(/^```\s*/i, '')      // Remove opening ```
        .replace(/\s*```$/i, '');     // Remove closing ```
      console.log('✅ Cleaned content (first 200 chars):', cleanedContent.substring(0, 200));
    }

    // Parse JSON response
    let storyData: ChapterStoryResponse;
    try {
      storyData = JSON.parse(cleanedContent);
      console.log('✅ JSON parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse chapter story JSON:', parseError);
      console.error('Content preview:', cleanedContent.substring(0, 500));
      throw new Error('Invalid JSON response from chapter story extraction');
    }

    // Validate response structure
    if (!storyData.chapter_title || !storyData.short_summary || !storyData.detailed_description) {
      throw new Error('Missing required fields in response (chapter_title, short_summary, or detailed_description)');
    }

    if (!storyData.keywords || !Array.isArray(storyData.keywords)) {
      throw new Error('Invalid keywords structure in response');
    }

    // Validate chapter title (max 3 words)
    const titleWords = storyData.chapter_title.trim().split(/\s+/);
    if (titleWords.length > 3) {
      console.log(`⚠️ Chapter title has ${titleWords.length} words, truncating to 3`);
      storyData.chapter_title = titleWords.slice(0, 3).join(' ');
    }

    // Ensure max 10 keywords
    if (storyData.keywords.length > 10) {
      console.log(`⚠️ AI returned ${storyData.keywords.length} keywords, truncating to 10`);
      storyData.keywords = storyData.keywords.slice(0, 10);
    }

    // Validate each keyword is a single word
    storyData.keywords = storyData.keywords.filter(kw => {
      const isSingleWord = !kw.includes(' ');
      if (!isSingleWord) {
        console.log(`⚠️ Filtered out multi-word keyword: "${kw}"`);
      }
      return isSingleWord;
    });

    console.log(`✅ Extracted complete chapter story:`);
    console.log(`   - Title: "${storyData.chapter_title}" (${titleWords.length} words)`);
    console.log(`   - Summary: ${storyData.short_summary.substring(0, 80)}...`);
    console.log(`   - Description: ${storyData.detailed_description.split('.').length} sentences`);
    console.log(`   - Keywords: ${storyData.keywords.length} valid keywords`);

    return storyData;

  } catch (error) {
    console.error('💥 Keyword extraction failed:', error);
    throw error;
  }
}
