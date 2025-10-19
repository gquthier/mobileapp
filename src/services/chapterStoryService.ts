/**
 * Chapter Story Service
 *
 * Service for generating AI-powered chapter stories including:
 * - Literary chapter title (max 3 words)
 * - Short summary (1 sentence)
 * - Detailed description (autobiographical, first person, max 10 sentences)
 * - Keywords (max 10 single words)
 *
 * Uses the extract-chapter-keywords Edge Function with OpenAI GPT-4.1 Nano
 */

import { supabase } from '../lib/supabase';

// Response from Edge Function
export interface ChapterStoryResult {
  success: boolean;
  chapter_title?: string;
  short_summary?: string;
  detailed_description?: string;
  keywords?: string[];
  analysis_summary?: string;
  total_videos_analyzed?: number;
  primary_themes?: string[];
  confidence_score?: number;
  error?: string;
  message?: string; // For cases with no videos/transcriptions
}

/**
 * Extract complete chapter story (title, summary, description, keywords) using AI
 *
 * @param chapterId - UUID of the chapter to analyze
 * @returns Promise with extracted chapter story or error
 *
 * @example
 * ```typescript
 * const result = await extractChapterStory('chapter-uuid');
 * if (result.success) {
 *   console.log(`Title: ${result.chapter_title}`);
 *   console.log(`Summary: ${result.short_summary}`);
 *   console.log(`Keywords: ${result.keywords?.join(', ')}`);
 * }
 * ```
 */
export async function extractChapterStory(
  chapterId: string
): Promise<ChapterStoryResult> {
  try {
    console.log('📖 Extracting chapter story for:', chapterId);

    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      throw new Error('User not authenticated');
    }

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('extract-chapter-keywords', {
      body: { chapterId }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    if (!data.success) {
      console.error('❌ Story extraction failed:', data.error || data.message);
      return {
        success: false,
        error: data.error || data.message
      };
    }

    // Handle case with no videos/transcriptions
    if (data.message) {
      console.log('⚠️ Chapter story extraction skipped:', data.message);
      return {
        success: true,
        message: data.message,
        keywords: []
      };
    }

    console.log('✅ Chapter story extracted successfully');
    console.log(`   📖 Title: "${data.chapter_title}"`);
    console.log(`   📝 Summary length: ${data.short_summary?.length || 0} chars`);
    console.log(`   📚 Description length: ${data.detailed_description?.length || 0} chars`);
    console.log(`   🔑 Keywords: ${data.keywords?.length || 0}`);

    return {
      success: true,
      chapter_title: data.chapter_title,
      short_summary: data.short_summary,
      detailed_description: data.detailed_description,
      keywords: data.keywords,
      analysis_summary: data.analysis_summary,
      total_videos_analyzed: data.total_videos_analyzed,
      primary_themes: data.primary_themes,
      confidence_score: data.confidence_score
    };

  } catch (error: any) {
    console.error('💥 Failed to extract chapter story:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Get chapter with AI-generated content from database
 *
 * @param chapterId - UUID of the chapter
 * @returns Promise with chapter data including AI fields
 */
export async function getChapterWithStory(chapterId: string) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select(`
        id,
        title,
        description,
        started_at,
        ended_at,
        is_current,
        keywords,
        ai_title,
        ai_short_summary,
        ai_detailed_description,
        ai_extracted_at
      `)
      .eq('id', chapterId)
      .single();

    if (error) throw error;

    return {
      success: true,
      chapter: data
    };

  } catch (error: any) {
    console.error('❌ Failed to get chapter:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if chapter needs story regeneration
 *
 * A chapter needs regeneration if:
 * 1. AI content doesn't exist yet
 * 2. New videos have been added since last extraction
 * 3. AI extraction is older than 7 days
 *
 * @param chapterId - UUID of the chapter
 * @returns Promise<boolean> - True if regeneration is recommended
 */
export async function shouldRegenerateStory(chapterId: string): Promise<boolean> {
  try {
    // Get chapter with AI extraction timestamp
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('ai_extracted_at, keywords, ai_title')
      .eq('id', chapterId)
      .single();

    if (chapterError) throw chapterError;

    // Case 1: No AI content exists yet
    if (!chapter.ai_extracted_at || !chapter.ai_title || !chapter.keywords || chapter.keywords.length === 0) {
      console.log('🔄 Regeneration needed: No AI content exists');
      return true;
    }

    // Case 2: Check if new videos added after extraction
    const { data: newVideos, error: videosError } = await supabase
      .from('videos')
      .select('id')
      .eq('chapter_id', chapterId)
      .gt('created_at', chapter.ai_extracted_at)
      .limit(1);

    if (!videosError && newVideos && newVideos.length > 0) {
      console.log('🔄 Regeneration needed: New videos added since last extraction');
      return true;
    }

    // Case 3: Check if extraction is older than 7 days
    const extractionDate = new Date(chapter.ai_extracted_at);
    const daysSinceExtraction = (Date.now() - extractionDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceExtraction > 7) {
      console.log(`🔄 Regeneration needed: Last extraction was ${Math.floor(daysSinceExtraction)} days ago`);
      return true;
    }

    console.log('✅ AI content is up to date');
    return false;

  } catch (error) {
    console.error('❌ Failed to check regeneration status:', error);
    // Default to regeneration if check fails
    return true;
  }
}

/**
 * Extract chapter story only if needed (checks shouldRegenerateStory first)
 *
 * @param chapterId - UUID of the chapter
 * @returns Promise with extraction result or existing content
 */
export async function extractChapterStoryIfNeeded(
  chapterId: string
): Promise<ChapterStoryResult> {
  try {
    const needsRegeneration = await shouldRegenerateStory(chapterId);

    if (!needsRegeneration) {
      console.log('✅ Using existing chapter story (no regeneration needed)');

      // Return existing content from database
      const { chapter } = await getChapterWithStory(chapterId);

      if (chapter) {
        return {
          success: true,
          chapter_title: chapter.ai_title || undefined,
          short_summary: chapter.ai_short_summary || undefined,
          detailed_description: chapter.ai_detailed_description || undefined,
          keywords: chapter.keywords || [],
          message: 'Using existing AI content (up to date)'
        };
      }
    }

    // Generate new AI content
    console.log('🚀 Generating fresh chapter story...');
    return await extractChapterStory(chapterId);

  } catch (error: any) {
    console.error('💥 Failed to extract chapter story (smart mode):', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// BATCH GENERATION FOR MISSING STORIES
// ============================================================================

export interface BatchGenerationResult {
  success: boolean;
  processed: number;
  successCount?: number;
  failureCount?: number;
  results?: Array<{
    chapterId: string;
    chapterTitle: string;
    success: boolean;
    error?: string;
    generatedTitle?: string;
    keywordsCount?: number;
  }>;
  error?: string;
  message?: string;
}

/**
 * Generate stories for all old chapters that don't have AI content yet
 *
 * This function is useful for batch-generating stories for existing chapters.
 * It will only process chapters that:
 * - Don't have an ai_title yet
 * - Are not the current chapter (is_current = false)
 * - Have at least one video with transcription
 *
 * @param options - Configuration options
 * @param options.limit - Max number of chapters to process (default: 10)
 * @param options.skipChapterIds - Array of chapter IDs to skip
 * @returns Promise with batch generation results
 *
 * @example
 * ```typescript
 * const result = await generateMissingChapterStories({ limit: 5 });
 * if (result.success) {
 *   console.log(`✅ Generated stories for ${result.successCount} chapters`);
 *   console.log(`❌ Failed: ${result.failureCount}`);
 * }
 * ```
 */
export async function generateMissingChapterStories(options?: {
  limit?: number;
  skipChapterIds?: string[];
}): Promise<BatchGenerationResult> {
  try {
    console.log('🚀 Starting batch generation of missing chapter stories...');

    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      throw new Error('User not authenticated');
    }

    const userId = sessionData.session.user.id;

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('generate-missing-chapter-stories', {
      body: {
        userId, // Only process chapters for current user
        limit: options?.limit || 10,
        skipChapterIds: options?.skipChapterIds || []
      }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      console.error('📋 Full error object:', JSON.stringify(error, null, 2));
      return {
        success: false,
        processed: 0,
        error: error.message
      };
    }

    console.log('📦 Edge Function response:', JSON.stringify(data, null, 2));

    if (!data.success && data.error) {
      console.error('❌ Batch generation failed:', data.error);
      console.error('📋 Full response data:', JSON.stringify(data, null, 2));
      return {
        success: false,
        processed: 0,
        error: data.error
      };
    }

    // Log detailed results for debugging
    if (data.results && data.results.length > 0) {
      console.log('📊 Detailed results:');
      data.results.forEach((result: any, index: number) => {
        if (result.success) {
          console.log(`  ✅ ${index + 1}. "${result.chapterTitle}" → "${result.generatedTitle}"`);
        } else {
          console.error(`  ❌ ${index + 1}. "${result.chapterTitle}" → Error: ${result.error}`);
        }
      });
    }

    console.log('✅ Batch generation complete:');
    console.log(`   Processed: ${data.processed}`);
    console.log(`   Success: ${data.successCount}`);
    console.log(`   Failed: ${data.failureCount}`);

    return {
      success: true,
      processed: data.processed,
      successCount: data.successCount,
      failureCount: data.failureCount,
      results: data.results,
      message: data.message
    };

  } catch (error: any) {
    console.error('💥 Failed to generate missing chapter stories:', error);
    return {
      success: false,
      processed: 0,
      error: error.message
    };
  }
}

/**
 * Count how many chapters are missing AI stories
 *
 * @returns Promise with count of chapters without AI content
 */
export async function countChaptersWithoutStories(): Promise<number> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return 0;

    const { count, error } = await supabase
      .from('chapters')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', sessionData.session.user.id)
      .eq('is_current', false)
      .is('ai_title', null);

    if (error) throw error;

    return count || 0;

  } catch (error) {
    console.error('❌ Failed to count chapters without stories:', error);
    return 0;
  }
}
