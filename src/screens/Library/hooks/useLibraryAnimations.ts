/**
 * useLibraryAnimations Hook
 *
 * Centralise toutes les Animated.Values utilisées dans LibraryScreen
 * - Animations du modal de chapitres
 * - Animations de la barre de recherche
 * - Animations des icônes de vue
 * - Animations du header
 *
 * Phase 3.3 - LibraryScreen Refactoring (Étape 3)
 */

import { useMemo, useRef } from 'react';
import { Animated } from 'react-native';

interface LibraryAnimations {
  // Chapter modal animations
  modalScale: Animated.Value;
  modalOpacity: Animated.Value;
  filterButtonScale: Animated.Value;
  chapterScrollY: Animated.Value;
  chapterTitleSlide: Animated.Value;
  chapterTitleOpacity: Animated.Value;

  // Search & view toggle animations
  searchBarProgress: Animated.Value;
  calendarIconScale: Animated.Value;
  gridIconScale: Animated.Value;
  toggleSelectorPosition: Animated.Value;

  // Header animations
  scrollY: Animated.Value;
  headerOpacity: Animated.Value;
}

export function useLibraryAnimations(viewMode: 'calendar' | 'grid'): LibraryAnimations {
  // Animation values for chapter modal (iOS native-style animation)
  const modalScale = useRef(new Animated.Value(0.95)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const filterButtonScale = useRef(new Animated.Value(1)).current;
  const chapterScrollY = useRef(new Animated.Value(0)).current;

  // Animation values for chapter title swipe (wheel effect)
  const chapterTitleSlide = useRef(new Animated.Value(0)).current;
  const chapterTitleOpacity = useRef(new Animated.Value(1)).current;

  // 🚀 OPTIMIZATION: Lazy animation initialization with useMemo (grouped for performance)
  const groupedAnimations = useMemo(() => ({
    searchBarProgress: new Animated.Value(0),
    calendarIconScale: new Animated.Value(1),
    gridIconScale: new Animated.Value(1),
    toggleSelectorPosition: new Animated.Value(viewMode === 'calendar' ? 0 : 1),
    scrollY: new Animated.Value(0),
    headerOpacity: new Animated.Value(1),
  }), []); // ✅ Init once, never recreate

  return {
    // Chapter modal
    modalScale,
    modalOpacity,
    filterButtonScale,
    chapterScrollY,
    chapterTitleSlide,
    chapterTitleOpacity,

    // Search & view toggle
    searchBarProgress: groupedAnimations.searchBarProgress,
    calendarIconScale: groupedAnimations.calendarIconScale,
    gridIconScale: groupedAnimations.gridIconScale,
    toggleSelectorPosition: groupedAnimations.toggleSelectorPosition,

    // Header
    scrollY: groupedAnimations.scrollY,
    headerOpacity: groupedAnimations.headerOpacity,
  };
}
