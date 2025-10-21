import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as staticTheme } from '../styles';
import { CHAPTER_COLORS } from '../constants/chapterColors';
import { Icon } from './Icon';
import { UserQuestionsService, UserQuestion } from '../services/userQuestionsService';
import { useTheme } from '../contexts/ThemeContext';
import { getUserMomentum, getMomentumLevel } from '../services/momentumService';
import { supabase } from '../lib/supabase';
import { MomentumScore, MomentumLevel } from '../types/momentum';

const CACHE_KEY = '@current_card_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// ✅ Static Life Areas configuration (12 fixed areas)
const LIFE_AREAS_CONFIG: Record<string, { emoji: string; name: string }> = {
  'Health': { emoji: '💪', name: 'Health' },
  'Family': { emoji: '👨‍👩‍👧‍👦', name: 'Family' },
  'Friends': { emoji: '🤝', name: 'Friends' },
  'Love': { emoji: '❤️', name: 'Love' },
  'Work': { emoji: '💼', name: 'Work' },
  'Business': { emoji: '📈', name: 'Business' },
  'Money': { emoji: '💰', name: 'Money' },
  'Growth': { emoji: '🌱', name: 'Growth' },
  'Leisure': { emoji: '🎯', name: 'Leisure' },
  'Home': { emoji: '🏠', name: 'Home' },
  'Spirituality': { emoji: '🙏', name: 'Spirituality' },
  'Community': { emoji: '🌍', name: 'Community' },
};

interface TranscriptQuote {
  text: string;
  timestamp: number;
  context: string;
}

interface CurrentCardCache {
  timestamp: number;
  momentum: MomentumScore | null;
  momentumLevel: MomentumLevel | null;
  daysInChapter: number;
  topMentionedAreas: { area_key: string; display_name: string; percentage: number }[];
  leastMentionedAreas: { area_key: string; display_name: string; percentage: number }[];
  questions: UserQuestion[]; // Questions cached for 24h
  quotes: TranscriptQuote[]; // 3 random quotes cached for 24h
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChapterCardProps {
  title: string;
  period: string;
  count: number;
  progress?: number;
  isCurrent?: boolean;
  color?: string | null;
  keywords?: string[] | null; // AI-generated keywords
  aiShortSummary?: string | null; // AI short summary
  chapterNumber?: number; // Chapter number for background display
  onPress?: () => void;
  onColorChange?: (color: string) => void;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  title,
  period,
  count,
  progress = 40,
  isCurrent = false,
  color = null,
  keywords = null,
  aiShortSummary = null,
  chapterNumber,
  onPress,
  onColorChange,
}) => {
  const { brandColor } = useTheme(); // Dynamic theme color
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // Track current page for pagination dots
  const scrollViewRef = useRef<ScrollView>(null); // Ref for programmatic scrolling
  const [momentum, setMomentum] = useState<MomentumScore | null>(null);
  const [momentumLevel, setMomentumLevel] = useState<MomentumLevel | null>(null);
  const [questions, setQuestions] = useState<UserQuestion[]>([]); // User questions from database
  const [daysInChapter, setDaysInChapter] = useState<number>(0); // Days since chapter started
  const [topMentionedAreas, setTopMentionedAreas] = useState<{ area_key: string; display_name: string; percentage: number }[]>([]); // Top 3 mentioned Life Areas from current chapter
  const [leastMentionedAreas, setLeastMentionedAreas] = useState<{ area_key: string; display_name: string; percentage: number }[]>([]); // Bottom 3 mentioned Life Areas from current chapter
  const [quotes, setQuotes] = useState<TranscriptQuote[]>([]); // 3 random quotes from transcriptions

  // Load momentum, life areas, and questions for current chapter
  useEffect(() => {
    if (isCurrent) {
      loadCachedDataOrRefresh(); // Now includes questions in 24h cache
    }
  }, [isCurrent]);

  const loadCachedDataOrRefresh = async () => {
    try {
      // Try to load from cache
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);

      if (cachedData) {
        const cache: CurrentCardCache = JSON.parse(cachedData);
        const now = Date.now();
        const isCacheValid = (now - cache.timestamp) < CACHE_DURATION;

        // Check if cache has all required properties (for backward compatibility)
        const hasAllProperties = cache.questions !== undefined && cache.quotes !== undefined;

        if (isCacheValid && hasAllProperties) {
          // Use cached data (including questions and quotes)
          console.log('✅ Using cached CurrentCard data (24h cache)');
          setMomentum(cache.momentum);
          setMomentumLevel(cache.momentumLevel);
          setDaysInChapter(cache.daysInChapter || 0);
          setTopMentionedAreas(cache.topMentionedAreas || []);
          setLeastMentionedAreas(cache.leastMentionedAreas || []);
          setQuestions(cache.questions || []); // Questions also cached for 24h (fallback to empty array)
          setQuotes(cache.quotes || []); // Quotes also cached for 24h
          return;
        } else {
          console.log('⏰ Cache expired (24h), refreshing all data including questions...');
        }
      } else {
        console.log('📭 No cache found, loading fresh data...');
      }

      // Cache miss or expired - load fresh data
      await refreshAllData();
    } catch (error) {
      console.error('❌ Error loading cached data:', error);
      // Fallback to fresh data on error
      await refreshAllData();
    }
  };

  const refreshAllData = async () => {
    try {
      // Load all data in parallel and capture return values (including questions and quotes)
      const [momentumResult, lifeAreasResult, questionsResult, quotesResult] = await Promise.all([
        loadMomentumData(),
        loadLifeAreaMentions(),
        loadQuestions(),
        loadRandomQuotes(),
      ]);

      // Save to cache after all data is loaded (use returned data, not state)
      const cacheData: CurrentCardCache = {
        timestamp: Date.now(),
        momentum: momentumResult.momentum,
        momentumLevel: momentumResult.momentumLevel,
        daysInChapter: momentumResult.daysInChapter,
        topMentionedAreas: lifeAreasResult.top,
        leastMentionedAreas: lifeAreasResult.least,
        questions: questionsResult, // Questions cached for 24h
        quotes: quotesResult, // Quotes cached for 24h
      };

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 CurrentCard data cached for 24h (including questions and quotes)');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    }
  };

  const loadMomentumData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          momentum: null,
          momentumLevel: null,
          daysInChapter: 0,
        };
      }

      // Load momentum score
      const momentumData = await getUserMomentum(user.id);
      const level = momentumData ? getMomentumLevel(momentumData.score) : null;

      if (momentumData) {
        setMomentum(momentumData);
        setMomentumLevel(level);
      }

      // Calculate days in current chapter
      const { data: currentChapter } = await supabase
        .from('chapters')
        .select('started_at')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .single();

      let diffDays = 0;
      if (currentChapter?.started_at) {
        const startDate = new Date(currentChapter.started_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - startDate.getTime());
        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysInChapter(diffDays);
      }

      // Return data for cache
      return {
        momentum: momentumData,
        momentumLevel: level,
        daysInChapter: diffDays,
      };
    } catch (error) {
      console.error('❌ Error loading momentum data:', error);
      return {
        momentum: null,
        momentumLevel: null,
        daysInChapter: 0,
      };
    }
  };


  const loadQuestions = async () => {
    try {
      const allQuestions = await UserQuestionsService.getUnusedQuestions();
      // Take up to 5 questions
      const limitedQuestions = allQuestions.slice(0, 5);
      setQuestions(limitedQuestions);
      console.log(`✅ Loaded ${limitedQuestions.length} questions (will be cached for 24h)`);

      // Return questions for cache
      return limitedQuestions;
    } catch (error) {
      console.error('❌ Error loading questions:', error);
      setQuestions([]);
      return [];
    }
  };

  const loadRandomQuotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get current chapter
      const { data: currentChapter } = await supabase
        .from('chapters')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .single();

      if (!currentChapter) {
        console.log('⚠️ No current chapter found');
        return [];
      }

      // Get all videos from current chapter
      // 🔒 SECURITY: Filter videos by user_id
      const { data: chapterVideos } = await supabase
        .from('videos')
        .select('id')
        .eq('chapter_id', currentChapter.id)
        .eq('user_id', user.id); // ← PROTECTION CRITIQUE

      if (!chapterVideos || chapterVideos.length === 0) {
        console.log('⚠️ No videos in current chapter');
        return [];
      }

      const videoIds = chapterVideos.map(v => v.id);

      // Get all transcription jobs with quotes for these videos
      // 🔒 SECURITY: JOIN with videos to verify ownership
      const { data: jobsData, error: jobsError } = await supabase
        .from('transcription_jobs')
        .select(`
          transcript_highlight,
          video_id,
          videos!inner (
            user_id
          )
        `)
        .in('video_id', videoIds)
        .eq('videos.user_id', user.id) // ← PROTECTION CRITIQUE
        .not('transcript_highlight', 'is', null);

      // Remove nested videos data
      const jobs = jobsData?.map(({ videos, ...job }) => job);

      if (jobsError || !jobs) {
        console.error('❌ Error loading transcription jobs for quotes:', jobsError);
        return [];
      }

      console.log('🔍 DEBUG: Found', jobs.length, 'transcription jobs for current chapter');

      // Extract all quotes from all jobs
      const allQuotes: TranscriptQuote[] = [];

      jobs.forEach((job, jobIndex) => {
        if (!job.transcript_highlight) return;

        const quotes = job.transcript_highlight.quotes || [];
        console.log(`🔍 DEBUG: Job ${jobIndex} has ${quotes.length} quotes`);

        quotes.forEach((quote: any) => {
          if (quote.text && quote.timestamp !== undefined && quote.context) {
            allQuotes.push({
              text: quote.text,
              timestamp: quote.timestamp,
              context: quote.context,
            });
          }
        });
      });

      console.log(`📊 Total quotes found: ${allQuotes.length}`);

      if (allQuotes.length === 0) {
        console.log('ℹ️ No quotes found yet');
        return [];
      }

      // Randomly select 3 quotes (or less if not enough)
      const shuffled = allQuotes.sort(() => 0.5 - Math.random());
      const selectedQuotes = shuffled.slice(0, Math.min(3, allQuotes.length));

      setQuotes(selectedQuotes);
      console.log('✅ Selected', selectedQuotes.length, 'random quotes');

      return selectedQuotes;
    } catch (error) {
      console.error('❌ Error loading random quotes:', error);
      return [];
    }
  };

  const loadLifeAreaMentions = async (): Promise<{ top: any[], least: any[] }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get current chapter videos only
      const { data: currentChapter } = await supabase
        .from('chapters')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .single();

      if (!currentChapter) return [];

      // Get videos for current chapter
      // 🔒 SECURITY: Filter videos by user_id
      const { data: videos } = await supabase
        .from('videos')
        .select('id')
        .eq('chapter_id', currentChapter.id)
        .eq('user_id', user.id); // ← PROTECTION CRITIQUE

      if (!videos || videos.length === 0) return [];

      const videoIds = videos.map(v => v.id);

      // Get transcription jobs with highlights for current chapter videos only
      // 🔒 SECURITY: JOIN with videos to verify ownership
      const { data: jobsData, error: jobsError } = await supabase
        .from('transcription_jobs')
        .select(`
          transcript_highlight,
          video_id,
          videos!inner (
            user_id
          )
        `)
        .in('video_id', videoIds)
        .eq('videos.user_id', user.id) // ← PROTECTION CRITIQUE
        .not('transcript_highlight', 'is', null);

      // Remove nested videos data
      const jobs = jobsData?.map(({ videos, ...job }) => job);

      if (jobsError || !jobs || jobs.length === 0) return [];

      // Count mentions per life area (simple string counting)
      const mentionCounts = new Map<string, number>();
      let totalHighlights = 0;

      jobs.forEach((job) => {
        if (!job.transcript_highlight) return;

        const highlights = job.transcript_highlight.highlights || [];

        highlights.forEach((highlight: any) => {
          totalHighlights++;

          // Get the area field from the highlight (simple string)
          const highlightArea = highlight.area;

          if (highlightArea && typeof highlightArea === 'string') {
            // Normalize to capitalized form (e.g., "health" → "Health")
            const normalizedArea = highlightArea.charAt(0).toUpperCase() + highlightArea.slice(1).toLowerCase();

            // Check if it exists in our config
            if (LIFE_AREAS_CONFIG[normalizedArea]) {
              const currentCount = mentionCounts.get(normalizedArea) || 0;
              mentionCounts.set(normalizedArea, currentCount + 1);
            }
          }
        });
      });

      if (totalHighlights === 0) return { top: [], least: [] };

      // Calculate percentages for ALL areas (including those with 0 mentions)
      const allAreaKeys = Object.keys(LIFE_AREAS_CONFIG);
      const allAreaPercentages = allAreaKeys.map(areaKey => ({
        area_key: areaKey,
        display_name: LIFE_AREAS_CONFIG[areaKey].name,
        count: mentionCounts.get(areaKey) || 0,
        percentage: Math.round(((mentionCounts.get(areaKey) || 0) / totalHighlights) * 100)
      }));

      // Top mentioned (sorted by count descending, only areas with mentions)
      const topMentioned = allAreaPercentages
        .filter(item => item.count > 0) // Only areas with at least one mention
        .sort((a, b) => b.count - a.count) // Sort by count descending
        .slice(0, 3); // Top 3

      setTopMentionedAreas(topMentioned);

      // Least mentioned (sorted by count ascending, take bottom 3)
      const leastMentioned = allAreaPercentages
        .sort((a, b) => a.count - b.count) // Sort by count ascending
        .slice(0, 3); // Take bottom 3

      setLeastMentionedAreas(leastMentioned);

      return { top: topMentioned, least: leastMentioned };
    } catch (error) {
      console.error('❌ Error loading life area mentions:', error);
      return { top: [], least: [] };
    }
  };

  const handleColorSelect = (selectedColor: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onColorChange) {
      onColorChange(selectedColor);
    }
    setShowColorPicker(false);
  };

  const handleColorButtonPress = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowColorPicker(true);
  };

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const pageWidth = SCREEN_WIDTH - (staticTheme.spacing['4'] * 2); // Just card padding
    const page = Math.round(scrollPosition / pageWidth);
    setCurrentPage(page);
  };

  const handleMomentumScrollEnd = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const pageWidth = SCREEN_WIDTH - (staticTheme.spacing['4'] * 2);
    const page = Math.round(scrollPosition / pageWidth);

    // Calculate total number of pages: 3 fixed pages + all questions + all quotes
    const totalPages = 3 + questions.length + quotes.length;

    // Infinite scroll: when reaching last page, loop back to first
    if (page >= totalPages - 1) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: 0, animated: true });
        setCurrentPage(0);
      }, 300); // Small delay for smooth transition
    }
  };

  return (
    <>
      <View
        style={[
          styles.cardWrapper,
          isCurrent && styles.currentCardWrapper,
        ]}
      >
        <View
          style={[
            styles.glassContainer,
            isCurrent && styles.currentGlassContainer,
            !isLiquidGlassSupported && {
              backgroundColor: staticTheme.colors.gray100,
            },
          ]}
        >
          <View
            style={[
              styles.card,
              isCurrent && styles.currentCard,
              color && { backgroundColor: `${color}15` },
            ]}
          >
            {/* Chapter Number Background - Knockout effect */}
            {chapterNumber !== undefined && (
              <Text style={styles.chapterNumberBackground}>
                {chapterNumber}
              </Text>
            )}

            {isCurrent ? (
              /* ===== CURRENT CHAPTER: Interactive scrollable view ===== */
              <>
                {/* Header - Centered title with color icon */}
                <View style={styles.currentChapterHeader}>
                  <View style={styles.currentChapterTitleContainer}>
                    <TouchableOpacity
                      style={[
                        styles.colorButtonHeader,
                        { backgroundColor: color || staticTheme.colors.gray300 },
                      ]}
                      onPress={handleColorButtonPress}
                      activeOpacity={0.7}
                    >
                      {/* Empty circle, just the background color */}
                    </TouchableOpacity>
                    <Text style={styles.currentChapterTitle}>{title}</Text>
                  </View>
                </View>

                {/* Scrollable content pages */}
                <ScrollView
                  ref={scrollViewRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={styles.currentChapterScroll}
                  contentContainerStyle={styles.currentChapterScrollContent}
                  onScroll={handleScroll}
                  onMomentumScrollEnd={handleMomentumScrollEnd}
                  scrollEventThrottle={16}
                >
                  {/* Page 1: Momentum Score Only */}
                  <View style={[styles.currentChapterPage, styles.momentumPage]}>
                    {momentum && momentumLevel ? (
                      <>
                        <Text style={styles.momentumScore}>{momentum.score}</Text>
                        <Text style={styles.momentumScoreLabel}>momentum score</Text>
                      </>
                    ) : (
                      <Text style={styles.loadingText}>Loading momentum...</Text>
                    )}
                  </View>

                  {/* Page 2: Stats (Streak + Videos + Days) */}
                  <View style={[styles.currentChapterPage, styles.statsPage]}>
                    {momentum ? (
                      <View style={styles.momentumStatsThree}>
                        <View style={styles.momentumStatItem}>
                          <Text style={styles.momentumStatValue}>{momentum.streak_days}</Text>
                          <Text style={styles.momentumStatLabel}>streak</Text>
                        </View>
                        <View style={styles.momentumStatItem}>
                          <Text style={styles.momentumStatValue}>{count}</Text>
                          <Text style={styles.momentumStatLabel}>videos</Text>
                        </View>
                        <View style={styles.momentumStatItem}>
                          <Text style={styles.momentumStatValue}>{daysInChapter}</Text>
                          <Text style={styles.momentumStatLabel}>days</Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.loadingText}>Loading stats...</Text>
                    )}
                  </View>

                  {/* Page 3: Top Mentioned Life Areas in Highlights */}
                  <View style={[styles.currentChapterPage, styles.topMentionedPage]}>
                    <Text style={styles.topMentionedTitle}>all about...</Text>
                    {topMentionedAreas.length > 0 && count >= 5 ? (
                      /* Real data - User has 5+ videos */
                      <View style={styles.momentumStatsThree}>
                        {topMentionedAreas.map((item, index) => (
                          <View key={item.area_key} style={styles.momentumStatItem}>
                            <Text style={styles.momentumStatValue}>{item.percentage}%</Text>
                            <Text style={styles.momentumStatLabel}>{item.display_name}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      /* Preview - User has < 5 videos */
                      <View style={styles.previewContainer}>
                        {/* Blurred stats in background */}
                        <View style={styles.momentumStatsThree}>
                          {[
                            { name: 'Work', percentage: 42 },
                            { name: 'Love', percentage: 31 },
                            { name: 'Health', percentage: 27 },
                          ].map((item, index) => (
                            <View key={index} style={styles.momentumStatItem}>
                              <Text style={[styles.momentumStatValue, styles.blurredMax]}>{item.percentage}%</Text>
                              <Text style={[styles.momentumStatLabel, styles.blurredMax]}>{item.name}</Text>
                            </View>
                          ))}
                        </View>
                        {/* Text overlay without background */}
                        <View style={styles.textOverlay}>
                          <Text style={styles.emptyStateText}>record your first 5 videos to reveal</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Page 4: Least Mentioned Life Areas in Highlights */}
                  <View style={[styles.currentChapterPage, styles.topMentionedPage]}>
                    <Text style={styles.topMentionedTitle}>less about...</Text>
                    {leastMentionedAreas.length > 0 && count >= 5 ? (
                      /* Real data - User has 5+ videos */
                      <View style={styles.momentumStatsThree}>
                        {leastMentionedAreas.map((item) => (
                          <View key={item.area_key} style={styles.momentumStatItem}>
                            <Text style={styles.momentumStatValue}>{item.percentage}%</Text>
                            <Text style={styles.momentumStatLabel}>{item.display_name}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      /* Preview - User has < 5 videos */
                      <View style={styles.previewContainer}>
                        {/* Blurred stats in background */}
                        <View style={styles.momentumStatsThree}>
                          {[
                            { name: 'Friends', percentage: 8 },
                            { name: 'Community', percentage: 5 },
                            { name: 'Spirituality', percentage: 3 },
                          ].map((item, index) => (
                            <View key={index} style={styles.momentumStatItem}>
                              <Text style={[styles.momentumStatValue, styles.blurredMax]}>{item.percentage}%</Text>
                              <Text style={[styles.momentumStatLabel, styles.blurredMax]}>{item.name}</Text>
                            </View>
                          ))}
                        </View>
                        {/* Text overlay without background */}
                        <View style={styles.textOverlay}>
                          <Text style={styles.emptyStateText}>record your first 5 videos to reveal</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Alternating Questions and Quotes */}
                  {(() => {
                    const items = [];
                    const maxLength = Math.max(questions.length, quotes.length);

                    for (let i = 0; i < maxLength; i++) {
                      // Add question if available
                      if (i < questions.length) {
                        items.push(
                          <View key={`question-${questions[i].id}`} style={[styles.currentChapterPage, styles.questionPage]}>
                            <Text style={styles.promptText}>
                              {questions[i].question_text}
                            </Text>
                          </View>
                        );
                      }

                      // Add quote if available
                      if (i < quotes.length) {
                        items.push(
                          <View key={`quote-${i}`} style={[styles.currentChapterPage, styles.quotePage]}>
                            {/* Large quotation mark background */}
                            <Text style={styles.quoteMarkBackground}>"</Text>
                            <Text style={styles.quoteText}>
                              {quotes[i].text}
                            </Text>
                          </View>
                        );
                      }
                    }

                    return items;
                  })()}
                </ScrollView>

                {/* Pagination Dots */}
                <View style={styles.paginationDots}>
                  {/* Dot for momentum score page */}
                  <View style={[
                    styles.dot,
                    currentPage === 0 && styles.activeDot,
                    currentPage === 0 && { backgroundColor: color || brandColor, shadowColor: color || brandColor }
                  ]} />
                  {/* Dot for stats page */}
                  <View style={[
                    styles.dot,
                    currentPage === 1 && styles.activeDot,
                    currentPage === 1 && { backgroundColor: color || brandColor, shadowColor: color || brandColor }
                  ]} />
                  {/* Dot for top mentioned page */}
                  <View style={[
                    styles.dot,
                    currentPage === 2 && styles.activeDot,
                    currentPage === 2 && { backgroundColor: color || brandColor, shadowColor: color || brandColor }
                  ]} />
                  {/* Dot for least mentioned page (always shown) */}
                  <View style={[
                    styles.dot,
                    currentPage === 3 && styles.activeDot,
                    currentPage === 3 && { backgroundColor: color || brandColor, shadowColor: color || brandColor }
                  ]} />
                  {/* Dots for alternating questions and quotes */}
                  {(() => {
                    const dots = [];
                    const maxLength = Math.max(questions.length, quotes.length);
                    // Start after the 4 fixed pages (momentum, stats, all about, less about)
                    let pageIndex = 4;

                    for (let i = 0; i < maxLength; i++) {
                      // Dot for question
                      if (i < questions.length) {
                        dots.push(
                          <View
                            key={`dot-question-${i}`}
                            style={[
                              styles.dot,
                              currentPage === pageIndex && styles.activeDot,
                              currentPage === pageIndex && { backgroundColor: color || brandColor, shadowColor: color || brandColor }
                            ]}
                          />
                        );
                        pageIndex++;
                      }

                      // Dot for quote
                      if (i < quotes.length) {
                        dots.push(
                          <View
                            key={`dot-quote-${i}`}
                            style={[
                              styles.dot,
                              currentPage === pageIndex && styles.activeDot,
                              currentPage === pageIndex && { backgroundColor: color || brandColor, shadowColor: color || brandColor }
                            ]}
                          />
                        );
                        pageIndex++;
                      }
                    }

                    return dots;
                  })()}
                </View>
              </>
            ) : (
              /* ===== OLD CHAPTERS: Standard view ===== */
              <>
                {/* Header with title and chevron */}
                <View style={styles.titleRow}>
                  <View style={styles.titleWithColorIcon}>
                    <TouchableOpacity
                      style={[
                        styles.colorButtonHeader,
                        { backgroundColor: color || staticTheme.colors.gray300 },
                      ]}
                      onPress={handleColorButtonPress}
                      activeOpacity={0.7}
                    >
                      {/* Empty circle, just the background color */}
                    </TouchableOpacity>
                    <Text
                      style={[styles.title]}
                      numberOfLines={0}
                    >
                      {title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onPress}
                    style={styles.chevronButton}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name="chevronRight"
                      size={20}
                      color={staticTheme.colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Period date */}
                <Text style={styles.period}>{period}</Text>

                {/* Keywords - Scrollable horizontally */}
                {keywords && keywords.length > 0 && (
                  <View style={styles.keywordsScrollView}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.keywordsContainer}
                      nestedScrollEnabled={true}
                      scrollEnabled={true}
                      directionalLockEnabled={true}
                      scrollEventThrottle={16}
                      bounces={false}
                      alwaysBounceHorizontal={false}
                    >
                      {keywords.map((keyword, index) => (
                        <View
                          key={`${keyword}-${index}`}
                          style={styles.keywordWrapper}
                        >
                          <LiquidGlassView
                            style={[
                              styles.keywordPill,
                              !isLiquidGlassSupported && {
                                backgroundColor: staticTheme.colors.gray100,
                              }
                            ]}
                            interactive={false}
                          >
                            <Text style={styles.keywordText}>{keyword}</Text>
                          </LiquidGlassView>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </View>

      {/* Color Picker Modal */}
      <Modal visible={showColorPicker} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowColorPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.colorPickerContainer}>
                <LiquidGlassView
                  style={[
                    styles.colorPickerGlass,
                    !isLiquidGlassSupported && {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    },
                  ]}
                  interactive={false}
                >
                  <View style={styles.colorPickerContent}>
                    <Text style={styles.colorPickerTitle}>Choose Chapter Color</Text>
                    <ScrollView
                      contentContainerStyle={styles.colorGrid}
                      showsVerticalScrollIndicator={false}
                    >
                      {CHAPTER_COLORS.map((colorOption) => (
                        <TouchableOpacity
                          key={colorOption}
                          style={[
                            styles.colorOption,
                            { backgroundColor: colorOption },
                            color === colorOption && styles.colorOptionSelected,
                          ]}
                          onPress={() => handleColorSelect(colorOption)}
                          activeOpacity={0.7}
                        >
                          {color === colorOption && (
                            <View style={styles.selectedIndicator} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </LiquidGlassView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: staticTheme.spacing['3'],
  },
  currentCardWrapper: {
    marginBottom: staticTheme.spacing['4'], // More space for separator
    paddingBottom: staticTheme.spacing['2'], // Reduced space above separator
    borderBottomWidth: 1,
    borderBottomColor: staticTheme.colors.gray300, // More visible gray
  },
  glassContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    // Shadow for depth
    shadowColor: staticTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  currentGlassContainer: {
    // Stronger shadow for current chapter
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    padding: staticTheme.spacing['4'],
    position: 'relative',
    overflow: 'hidden',
    // No fixed height - adapts to content
  },
  currentCard: {
    // Same flexible height as other cards
  },
  chapterNumberBackground: {
    position: 'absolute',
    right: -10,
    top: '50%',
    fontSize: 140, // Large enough to fill card height
    fontWeight: '700',
    color: staticTheme.colors.ui.background, // Same as app background for knockout effect
    opacity: 0.5, // Very subtle, almost like a watermark
    fontFamily: 'Georgia', // Romanesque serif font
    letterSpacing: -4,
    includeFontPadding: false,
    lineHeight: 140,
    textAlign: 'right',
    transform: [{ translateY: -70 }], // Half of fontSize for perfect centering
    zIndex: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: staticTheme.spacing['2'],
    marginBottom: 0, // No spacing between title and date
    zIndex: 1, // Above chapter number
    position: 'relative',
  },
  titleWithColorIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
    flex: 1,
  },
  currentTitle: {
    // Same size as other titles
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: staticTheme.spacing['2'],
    flexShrink: 0,
  },
  colorButtonHeader: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  chevronButton: {
    padding: staticTheme.spacing['1'],
  },
  videoCount: {
    fontSize: 13,
    fontWeight: '500',
    color: staticTheme.colors.text.secondary,
    marginTop: staticTheme.spacing['2'],
  },
  currentVideoCount: {
    fontSize: 14,
    fontWeight: '600',
    color: staticTheme.colors.brand.primary,
  },
  period: {
    fontSize: 14,
    color: staticTheme.colors.text.secondary,
    marginTop: 0, // No top margin
    position: 'relative',
    zIndex: 1,
  },
  aiSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: staticTheme.colors.text.secondary,
    marginTop: staticTheme.spacing['2'],
    position: 'relative',
    zIndex: 1,
  },
  // Keywords Pills - Same style as Life Area bubbles
  keywordsScrollView: {
    maxHeight: 50,
    marginTop: staticTheme.spacing['3'], // Space from summary
    marginHorizontal: -staticTheme.spacing['4'], // Extend to card edges
    position: 'relative',
    zIndex: 1,
  },
  keywordsContainer: {
    flexDirection: 'row',
    paddingHorizontal: staticTheme.spacing['2'], // Reduced padding on sides
  },
  keywordWrapper: {
    marginRight: 8,
  },
  keywordPill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  keywordText: {
    fontSize: 14,
    fontWeight: '500',
    color: staticTheme.colors.text.secondary,
  },
  // Color button - Bottom right
  // Color Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: staticTheme.spacing['6'],
  },
  colorPickerContainer: {
    width: '95%',
    maxWidth: 400,
  },
  colorPickerGlass: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  colorPickerContent: {
    padding: staticTheme.spacing['6'],
  },
  colorPickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: staticTheme.colors.text.primary,
    marginBottom: staticTheme.spacing['5'],
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: staticTheme.spacing['3'],
    justifyContent: 'center',
    paddingBottom: staticTheme.spacing['2'],
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  colorOptionSelected: {
    borderColor: staticTheme.colors.black,
    transform: [{ scale: 1.1 }],
  },
  selectedIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: staticTheme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  // Current Chapter Interactive Styles
  currentChapterHeader: {
    flexDirection: 'row',
    justifyContent: 'center', // Center the title container
    alignItems: 'center',
    marginBottom: staticTheme.spacing['1'], // Minimal margin
    zIndex: 1,
    position: 'relative',
  },
  currentChapterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: staticTheme.spacing['2'], // Gap between color button and title
  },
  currentChapterTitle: {
    fontSize: 18, // Further reduced
    fontWeight: '700',
    color: staticTheme.colors.text.primary,
  },
  currentChapterScroll: {
    marginHorizontal: -staticTheme.spacing['4'],
    marginTop: staticTheme.spacing['1'], // Minimal top margin
  },
  currentChapterScrollContent: {
    paddingHorizontal: 0, // No horizontal padding in scroll
  },
  currentChapterPage: {
    width: SCREEN_WIDTH - (staticTheme.spacing['4'] * 2), // Just card padding left/right
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: staticTheme.spacing['1'], // Minimal vertical padding
    paddingHorizontal: staticTheme.spacing['4'], // Internal padding for content
  },
  // Momentum Page - Main card
  momentumPage: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentumScore: {
    fontSize: 64,
    fontWeight: '800',
    color: staticTheme.colors.text.primary,
    fontFamily: 'Georgia', // Romanesque serif font
    marginBottom: staticTheme.spacing['2'],
  },
  momentumScoreLabel: {
    fontSize: 12,
    color: staticTheme.colors.text.secondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Stats Page
  statsPage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentumStats: {
    flexDirection: 'row',
    gap: staticTheme.spacing['6'],
  },
  momentumStatsThree: {
    flexDirection: 'row',
    gap: staticTheme.spacing['4'], // Reduced gap for 3 items
    justifyContent: 'space-between',
    width: '100%',
  },
  momentumStatItem: {
    alignItems: 'center',
    gap: staticTheme.spacing['2'], // Increased gap between number and label
    flex: 1,
  },
  momentumStatValue: {
    fontSize: 36, // Increased from 24 (no icons anymore)
    fontWeight: '700',
    color: staticTheme.colors.text.primary,
    fontFamily: 'Georgia', // Romanesque serif font
  },
  momentumStatLabel: {
    fontSize: 12, // Slightly increased from 11
    color: staticTheme.colors.text.secondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Top Mentioned Life Areas Page
  topMentionedPage: {
    flexDirection: 'column',
    paddingVertical: staticTheme.spacing['2'],
  },
  topMentionedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  topMentionedList: {
    gap: staticTheme.spacing['3'],
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  blurredMax: {
    opacity: 0.08, // Maximum blur - barely visible
  },
  textOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // No background - transparent overlay
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: staticTheme.colors.text.secondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },
  topMentionedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: staticTheme.spacing['2'],
  },
  topMentionedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: staticTheme.spacing['2'],
    flex: 1,
  },
  topMentionedRank: {
    fontSize: 16,
    fontWeight: '600',
    color: staticTheme.colors.text.secondary,
    width: 30,
  },
  topMentionedEmoji: {
    fontSize: 24,
  },
  topMentionedName: {
    fontSize: 16,
    fontWeight: '500',
    color: staticTheme.colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topMentionedPercentage: {
    fontSize: 28,
    fontWeight: '700',
    color: staticTheme.colors.text.primary,
    fontFamily: 'Georgia', // Romanesque serif font
    minWidth: 60,
    textAlign: 'right',
  },
  // Life Area Detail Pages
  lifeAreaPage: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  lifeAreaEmoji: {
    fontSize: 36,
    marginBottom: staticTheme.spacing['2'],
  },
  lifeAreaName: {
    fontSize: 18,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
    marginBottom: staticTheme.spacing['1'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lifeAreaScore: {
    fontSize: 32,
    fontWeight: '800',
    color: staticTheme.colors.text.primary,
    marginBottom: staticTheme.spacing['3'],
    fontFamily: 'Georgia', // Romanesque serif font
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: staticTheme.colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: staticTheme.spacing['3'],
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  lifeAreaStats: {
    flexDirection: 'row',
    gap: staticTheme.spacing['6'],
  },
  lifeAreaStatItem: {
    alignItems: 'center',
    gap: staticTheme.spacing['1'],
  },
  lifeAreaStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: staticTheme.colors.text.primary,
    fontFamily: 'Georgia', // Romanesque serif font
  },
  lifeAreaStatLabel: {
    fontSize: 11,
    color: staticTheme.colors.text.secondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingText: {
    fontSize: 14,
    color: staticTheme.colors.text.secondary,
    textAlign: 'center',
  },
  // Quote Page
  quotePage: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  quoteMarkBackground: {
    position: 'absolute',
    left: -20,
    top: '30%',
    fontSize: 200, // Giant quotation mark
    fontWeight: '700',
    color: staticTheme.colors.gray300,
    opacity: 0.3, // Transparent
    fontFamily: 'Georgia', // Romanesque serif font
    includeFontPadding: false,
    lineHeight: 200,
    transform: [{ translateY: -100 }],
    zIndex: 0,
  },
  quoteText: {
    fontSize: 17,
    fontWeight: '400',
    color: staticTheme.colors.text.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
    zIndex: 1,
    position: 'relative',
    paddingHorizontal: staticTheme.spacing['4'],
  },
  // Question Page
  questionPage: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    fontSize: 17,
    fontWeight: '400',
    color: staticTheme.colors.text.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  // Pagination Dots
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: staticTheme.spacing['1'], // Reduced gap
    marginTop: staticTheme.spacing['2'],
    paddingBottom: staticTheme.spacing['1'],
  },
  dot: {
    width: 4, // Reduced from 6 to 4
    height: 4, // Reduced from 6 to 4
    borderRadius: 2,
    backgroundColor: staticTheme.colors.gray400,
    opacity: 0.2, // More transparent (was 0.4)
  },
  activeDot: {
    width: 5, // Reduced from 8 to 5
    height: 5, // Reduced from 8 to 5
    borderRadius: 2.5,
    opacity: 0.6, // More transparent (was 1)
    // backgroundColor and shadowColor are set inline with chapter.color (fallback to brandColor)
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.2, // Reduced shadow opacity
    shadowRadius: 2, // Reduced shadow radius
    elevation: 2, // Reduced elevation
  },
});