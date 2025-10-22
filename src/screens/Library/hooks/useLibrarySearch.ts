/**
 * useLibrarySearch Hook
 *
 * Gère toute la logique de recherche dans LibraryScreen
 * - Recherche par texte avec debouncing
 * - Filtrage par Life Area
 * - Animations de la barre de recherche
 * - State de recherche (query, results, loading)
 *
 * Phase 3.3 - LibraryScreen Refactoring (Étape 4)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { VideoRecord } from '../../../lib/supabase';
import { VideoService } from '../../../services/videoService';

interface SearchState {
  query: string;
  results: VideoRecord[];
  isSearching: boolean;
  showSearch: boolean;
  showSearchBar: boolean;
  selectedLifeArea: string | null;
  lifeAreaResults: VideoRecord[];
  isSearchingLifeArea: boolean;
}

interface UseLibrarySearchReturn extends SearchState {
  setQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
  handleSearchPress: () => void;
  handleCloseSearch: () => void;
  toggleSearchBar: () => void;
  handleCollapseSearchBar: () => void;
  handleLifeAreaPress: (lifeArea: string) => Promise<void>;
  lifeAreaScrollViewRef: React.RefObject<any>;
}

export function useLibrarySearch(searchBarProgress: Animated.Value): UseLibrarySearchReturn {
  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Life Area filter state
  const [selectedLifeArea, setSelectedLifeArea] = useState<string | null>(null);
  const [lifeAreaResults, setLifeAreaResults] = useState<VideoRecord[]>([]);
  const [isSearchingLifeArea, setIsSearchingLifeArea] = useState(false);

  // Refs
  const lifeAreaScrollViewRef = useRef<any>(null);

  // Perform search against VideoService
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    // Don't search if query is too short (< 2 characters)
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      console.time('⏱️ Search request');
      const searchResults = await VideoService.searchVideos(searchQuery);
      console.timeEnd('⏱️ Search request');
      setResults(searchResults);
    } catch (error) {
      console.error('❌ Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search (500ms to avoid excessive database queries)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Wait 500ms after user stops typing before searching
    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  // Initialize scroll position to middle set (for infinite scroll)
  useEffect(() => {
    if (showSearch && lifeAreaScrollViewRef.current) {
      // Wait for layout then scroll to middle
      setTimeout(() => {
        // Rough estimate: each bubble is ~100px wide
        const approxBubbleWidth = 100;
        const LIFE_AREAS_COUNT = 12; // Fixed count
        const oneSetWidth = approxBubbleWidth * LIFE_AREAS_COUNT;
        lifeAreaScrollViewRef.current?.scrollTo({ x: oneSetWidth, animated: false });
      }, 100);
    }
  }, [showSearch]);

  // Handle search press (open search mode)
  const handleSearchPress = useCallback(() => {
    setShowSearch(true);
    setShowSearchBar(true);
  }, []);

  // Handle close search (exit search mode)
  const handleCloseSearch = useCallback(() => {
    setShowSearch(false);
    setShowSearchBar(false);
    setQuery('');
    setResults([]);
    setSelectedLifeArea(null);
    setLifeAreaResults([]);

    // Reset search bar animation to closed state (logo visible)
    Animated.spring(searchBarProgress, {
      toValue: 0,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [searchBarProgress]);

  // Toggle search bar visibility with animation
  const toggleSearchBar = useCallback(() => {
    const toValue = showSearchBar ? 0 : 1;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Update state immediately for conditional rendering
    setShowSearchBar(!showSearchBar);

    // Animate the transition
    Animated.spring(searchBarProgress, {
      toValue,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [showSearchBar, searchBarProgress]);

  // Handle tap on chevron to collapse search bar
  const handleCollapseSearchBar = useCallback(() => {
    console.log('◀ Chevron tapped - collapsing search bar');

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Collapse search bar
    setShowSearchBar(false);

    // Animate the transition
    Animated.spring(searchBarProgress, {
      toValue: 0,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [searchBarProgress]);

  // Handle life area selection
  const handleLifeAreaPress = useCallback(async (lifeArea: string) => {
    console.log('🎯 Life area selected:', lifeArea);

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Select this life area
    setSelectedLifeArea(lifeArea);
    setIsSearchingLifeArea(true);

    try {
      // Search videos by life area
      const searchResults = await VideoService.searchVideosByLifeArea(lifeArea);
      console.log(`✅ Found ${searchResults.length} videos for ${lifeArea}`);
      setLifeAreaResults(searchResults);
    } catch (error) {
      console.error('❌ Life area search failed:', error);
      setLifeAreaResults([]);
    } finally {
      setIsSearchingLifeArea(false);
    }
  }, []);

  return {
    // State
    query,
    results,
    isSearching,
    showSearch,
    showSearchBar,
    selectedLifeArea,
    lifeAreaResults,
    isSearchingLifeArea,

    // Setters
    setQuery,

    // Functions
    performSearch,
    handleSearchPress,
    handleCloseSearch,
    toggleSearchBar,
    handleCollapseSearchBar,
    handleLifeAreaPress,

    // Refs
    lifeAreaScrollViewRef,
  };
}
