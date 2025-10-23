# 🚀 Phase 3 - TanStack Query Migration - Micro Plan d'Action

**Date:** 23 octobre 2025
**Objectif:** Migrer TOUS les screens vers TanStack Query (useQuery) - ZÉRO changement UX/UI
**Contrainte:** Aucune modification visuelle, seulement refactoring backend data fetching

---

## 📊 ÉTAT ACTUEL - Analyse Complète

### ✅ Déjà Complété

#### 1. Infrastructure React Query (100%)
- ✅ `@tanstack/react-query` installé (package.json)
- ✅ `@tanstack/react-query-devtools` installé
- ✅ `src/lib/queryClient.ts` créé avec config optimale
- ✅ `App.tsx` wrapped avec `<QueryClientProvider>`

#### 2. Hooks React Query Créés (75%)
- ✅ `src/hooks/queries/useVideosQuery.ts`
  - useVideosQuery (fetch all)
  - useInfiniteVideosQuery (pagination)
  - useVideosByChapterQuery
  - useVideoQuery (single)
  - useDeleteVideoMutation
  - useUpdateVideoMutation
  - usePrefetchVideo
  - useVideoCache

- ✅ `src/hooks/queries/useChaptersQuery.ts`
  - useChaptersQuery
  - useCurrentChapterQuery
  - useChapterQuery
  - useCreateChapterMutation
  - useUpdateChapterMutation
  - useDeleteChapterMutation
  - useChapterCache

- ✅ `src/hooks/queries/useHighlightsQuery.ts`
  - useHighlightsQuery (single)
  - useBulkHighlightsQuery (optimisation N+1)
  - useTranscriptionStatusQuery (polling)
  - usePrefetchHighlights
  - useHighlightsCache

- ❌ `src/hooks/queries/useTranscriptionQuery.ts` **MANQUANT**

#### 3. LibraryScreen Migration (90% complété)
- ✅ `src/screens/Library/hooks/useLibraryDataV2.ts` créé (React Query version)
- ✅ `src/screens/LibraryScreenV2.tsx` créé
- ✅ `src/screens/LibraryScreen.migration-guide.md` écrit
- ⚠️ **Pas encore activé** - Utilise toujours l'ancien useLibraryData.ts

---

## ❌ RESTE À FAIRE - Par Ordre de Priorité

### 🎯 TÂCHE 1: Créer useTranscriptionQuery Hook

**Fichier:** `src/hooks/queries/useTranscriptionQuery.ts`

**Raison:** Hook manquant pour compléter la suite de hooks

**Contenu requis:**
```typescript
export const useTranscriptionQuery = (videoId: string | null)
export const useTranscriptionTextQuery = (videoId: string | null)
export const useTranscriptionSegmentsQuery = (videoId: string | null)
export const useTranscriptionFullQuery = (videoId: string | null) // text + segments + highlights
```

**Utilisation:**
- VideoPlayer.tsx (pour afficher transcript)
- ChapterDetailScreen.tsx (pour quotes)
- Potentiellement ChatScreen (pour contexte)

**Estimation:** 30 min

---

### 🎯 TÂCHE 2: Finaliser LibraryScreen Migration

**Fichiers à modifier:**
- `src/screens/LibraryScreen.tsx`

**Actions:**
1. ~~Créer flag `ENABLE_REACT_QUERY_LIBRARY`~~ (déjà fait dans V2)
2. **Remplacer complètement** ancien code par LibraryScreenV2
3. **Supprimer** `useLibraryData.ts` (ancien)
4. **Tester** que tout fonctionne identique

**Validation UX/UI:**
- ✅ Calendar view affichage identique
- ✅ Grid view affichage identique
- ✅ Search fonctionne pareil
- ✅ Pull-to-refresh fonctionne
- ✅ Infinite scroll fonctionne
- ✅ Import queue updates en temps réel
- ✅ Streak modal fonctionne
- ✅ Aucun changement visuel

**Estimation:** 1h

---

### 🎯 TÂCHE 3: Migrer ChapterDetailScreen

**Fichier:** `src/screens/ChapterDetailScreen.tsx`

**État actuel (useState/useEffect):**
```typescript
// Ligne 82-100 (approximatif)
const [loading, setLoading] = useState(true);
const [chapter, setChapter] = useState<Chapter>(initialChapter);
const [videos, setVideos] = useState<VideoRecord[]>([]);
const [transcriptionJobs, setTranscriptionJobs] = useState<{...}>({});
const [showChaptersModal, setShowChaptersModal] = useState(false);
const [allChapters, setAllChapters] = useState<Chapter[]>([]);
const [quotes, setQuotes] = useState<Quote[]>([]);
const [lifeAreaMentions, setLifeAreaMentions] = useState<{...}>({});
const [leastMentionedAreas, setLeastMentionedAreas] = useState<{...}>({});

// Multiple useEffect pour fetching (lignes 155-169+)
useEffect(() => { loadChapterData(); }, []);
useEffect(() => { loadVideos(); }, []);
useEffect(() => { loadTranscriptions(); }, []);
```

**Migration vers React Query:**
```typescript
// ✅ Remplacer par hooks
const { data: chapter, isLoading: chapterLoading } = useChapterQuery(chapterId);
const { data: videos = [], isLoading: videosLoading } = useVideosByChapterQuery(chapterId);
const { data: chapters = [] } = useChaptersQuery();
const { data: highlightsMap } = useBulkHighlightsQuery(videoIds);

// Garder state UI seulement
const [showChaptersModal, setShowChaptersModal] = useState(false);
const [showFullStory, setShowFullStory] = useState(false);
const [showColorPicker, setShowColorPicker] = useState(false);
const [quotesCurrentPage, setQuotesCurrentPage] = useState(0);
```

**Steps détaillés:**
1. Identifier tous les data fetching (videos, chapter, transcriptions)
2. Remplacer par hooks React Query appropriés
3. Garder uniquement UI state (modals, pages, etc.)
4. Tester affichage identique
5. Vérifier swipe entre quotes fonctionne
6. Vérifier color picker fonctionne

**Validation UX/UI:**
- ✅ Chapter header identique
- ✅ Videos grid identique
- ✅ Quotes swipeable
- ✅ Life areas mentions identiques
- ✅ Color picker fonctionne
- ✅ Aucun changement visuel

**Estimation:** 2h

---

### 🎯 TÂCHE 4: Migrer MomentumDashboardScreen

**Fichier:** `src/screens/MomentumDashboardScreen.tsx`

**État actuel (useState/useEffect):**
```typescript
// Lignes 66-74
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [stats, setStats] = useState<MomentumStats | null>(null);
const [chapters, setChapters] = useState<Chapter[]>([]);
const [videos, setVideos] = useState<VideoRecord[]>([]);
const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
const [showStreakModal, setShowStreakModal] = useState(false);
```

**Migration vers React Query:**
```typescript
// ✅ Data fetching avec React Query
const { data: chapters = [], isLoading: chaptersLoading } = useChaptersQuery();
const { data: videos = [], isLoading: videosLoading, refetch } = useVideosQuery();
const { data: currentChapter } = useCurrentChapterQuery();

// Garder UI state
const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
const [showStreakModal, setShowStreakModal] = useState(false);
const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // Local image

// Stats calculées avec useMemo
const stats = useMemo(() => calculateStats(videos, chapters), [videos, chapters]);

// Pull to refresh simplifié
const onRefresh = () => refetch();
```

**Steps détaillés:**
1. Remplacer chapters fetch par useChaptersQuery
2. Remplacer videos fetch par useVideosQuery
3. Calculer stats avec useMemo au lieu de useState
4. Simplifier pull-to-refresh avec refetch()
5. Tester loading states
6. Vérifier streak modal fonctionne

**Validation UX/UI:**
- ✅ Stats cards identiques
- ✅ Chapters list identique
- ✅ Videos preview identique
- ✅ Pull-to-refresh fonctionne
- ✅ Streak modal fonctionne
- ✅ Aucun changement visuel

**Estimation:** 1.5h

---

### 🎯 TÂCHE 5: Migrer VideoPlayer

**Fichier:** `src/components/VideoPlayer.tsx`

**État actuel (useState/useEffect):**
```typescript
// Lignes 120-125
const [currentIndex, setCurrentIndex] = useState(safeInitialIndex);
const [transcriptionHighlights, setTranscriptionHighlights] = useState<any[]>([]);
const [isInfoBarExpanded, setIsInfoBarExpanded] = useState(false);
const [position, setPosition] = useState(0);
const [duration, setDuration] = useState(0);
const [isDragging, setIsDragging] = useState(false);
const [tempPosition, setTempPosition] = useState(0);

// Multiple useEffect pour highlights (lignes 160+)
useEffect(() => {
  // Fetch transcription job pour current video
  loadHighlights(videos[currentIndex].id);
}, [currentIndex]);
```

**Migration vers React Query:**
```typescript
// ✅ Bulk fetch TOUS les highlights d'un coup (optimisation Phase 3)
const videoIds = useMemo(() => videos.map(v => v.id), [videos]);
const { data: highlightsMap } = useBulkHighlightsQuery(videoIds);

// Highlights pour la vidéo actuelle
const currentHighlights = useMemo(() => {
  const videoId = videos[currentIndex]?.id;
  return highlightsMap?.get(videoId)?.highlights || [];
}, [currentIndex, highlightsMap, videos]);

// Garder UI state
const [currentIndex, setCurrentIndex] = useState(safeInitialIndex);
const [isInfoBarExpanded, setIsInfoBarExpanded] = useState(false);
const [position, setPosition] = useState(0);
const [duration, setDuration] = useState(0);
const [isDragging, setIsDragging] = useState(false);
```

**Optimisation majeure:**
- ❌ **AVANT:** 1 fetch par vidéo (N queries si swipe 10 vidéos)
- ✅ **APRÈS:** 1 seul bulk fetch pour toutes les vidéos (1 query)

**Steps détaillés:**
1. Extraire tous les videoIds des videos prop
2. Utiliser useBulkHighlightsQuery(videoIds)
3. Calculer currentHighlights avec useMemo
4. Supprimer ancien useEffect de fetch
5. Tester swipe entre vidéos
6. Vérifier highlights s'affichent
7. Vérifier tap-to-seek fonctionne

**Validation UX/UI:**
- ✅ Video playback identique
- ✅ Highlights affichés pareil
- ✅ Tap to seek fonctionne
- ✅ Swipe entre vidéos smooth
- ✅ Info bar expand/collapse
- ✅ Aucun changement visuel

**Estimation:** 1.5h

---

### 🎯 TÂCHE 6: Migrer VerticalFeedTabScreen

**Fichier:** `src/screens/VerticalFeedTabScreen.tsx`

**État actuel (useState/useEffect):**
```typescript
// Lignes 23-24
const [videos, setVideos] = useState<VideoRecord[]>([]);
const [loading, setLoading] = useState(true);

// useEffect ligne 26
useEffect(() => {
  loadVideos();
}, []);
```

**Migration vers React Query:**
```typescript
// ✅ Simple replacement
const {
  data: videos = [],
  isLoading,
  refetch,
} = useVideosQuery();

// Pull to refresh
const onRefresh = () => refetch();
```

**Steps détaillés:**
1. Remplacer useState/useEffect par useVideosQuery
2. Tester loading state
3. Vérifier vertical scroll fonctionne
4. Vérifier pull-to-refresh

**Validation UX/UI:**
- ✅ Vertical feed identique
- ✅ Videos scroll smooth
- ✅ Aucun changement visuel

**Estimation:** 30 min

---

## 📋 PLAN D'EXÉCUTION FINAL - Step by Step

### Phase A: Hooks Manquants (30 min)
- [ ] **A.1** Créer `useTranscriptionQuery.ts`
- [ ] **A.2** Tester le hook avec console.log

### Phase B: Screens Simples (1h)
- [ ] **B.1** Migrer VerticalFeedTabScreen (30 min)
- [ ] **B.2** Tester VerticalFeed sur simulateur (10 min)
- [ ] **B.3** Finaliser LibraryScreen (remplacer ancien) (20 min)

### Phase C: Screens Complexes (3.5h)
- [ ] **C.1** Migrer MomentumDashboardScreen (1.5h)
- [ ] **C.2** Tester Dashboard complet (20 min)
- [ ] **C.3** Migrer ChapterDetailScreen (2h)
- [ ] **C.4** Tester ChapterDetail complet (20 min)

### Phase D: VideoPlayer Optimisation (1.5h)
- [ ] **D.1** Migrer VideoPlayer avec bulk fetch (1h)
- [ ] **D.2** Tester swipe + highlights (30 min)

### Phase E: Testing & Validation (1h)
- [ ] **E.1** Test complet de l'app (tous les screens)
- [ ] **E.2** Vérifier aucun changement UX/UI
- [ ] **E.3** Vérifier cache fonctionne (DevTools)
- [ ] **E.4** Commit final avec documentation

---

## 🎯 OBJECTIFS DE PERFORMANCE

### Avant Migration (useState/useEffect)
- ❌ 3-5 useState par screen
- ❌ 2-4 useEffect par screen
- ❌ Cache manuel avec AsyncStorage
- ❌ N+1 queries pour highlights (VideoPlayer)
- ❌ Pas de déduplication
- ❌ Memory leaks potentiels
- ❌ ~200 lignes de boilerplate par screen

### Après Migration (React Query)
- ✅ 1 useQuery par data type
- ✅ 0 useEffect pour data fetching
- ✅ Cache automatique (10-30 min selon type)
- ✅ 1 bulk query pour highlights (VideoPlayer)
- ✅ Déduplication automatique
- ✅ Cleanup automatique
- ✅ ~50 lignes par screen (-75%)

### Gains Attendus
- **-60% network requests** (cache + déduplication)
- **-75% code boilerplate** (hooks réutilisables)
- **-30% memory usage** (cleanup automatique)
- **+50% developer experience** (moins de bugs)
- **0% UX changes** (comportement identique)

---

## ⚠️ CONTRAINTES CRITIQUES

### 1. ZÉRO Changement Visuel
- ✅ Même loading states
- ✅ Même error states
- ✅ Mêmes animations
- ✅ Même layout
- ✅ Même comportement

### 2. Backward Compatibility
- ✅ Garder anciens services intacts
- ✅ Ne pas casser imports existants
- ✅ Tester sur device réel si possible

### 3. Testing Checklist
Pour CHAQUE screen migré:
- [ ] Affichage initial identique
- [ ] Loading state identique
- [ ] Pull-to-refresh fonctionne
- [ ] Error handling fonctionne
- [ ] Navigation fonctionne
- [ ] Aucun console.error nouveau
- [ ] TypeScript compile sans erreur

---

## 📊 FICHIERS À MODIFIER - Liste Complète

### À Créer
1. `src/hooks/queries/useTranscriptionQuery.ts`

### À Modifier (Migration)
1. `src/screens/LibraryScreen.tsx` (remplacer par V2)
2. `src/screens/ChapterDetailScreen.tsx`
3. `src/screens/MomentumDashboardScreen.tsx`
4. `src/components/VideoPlayer.tsx`
5. `src/screens/VerticalFeedTabScreen.tsx`

### À Supprimer (Après tests)
1. `src/screens/LibraryScreenV2.tsx` (merger dans LibraryScreen)
2. `src/screens/Library/hooks/useLibraryData.ts` (ancien)
3. `src/screens/LibraryScreen.modal-backup.tsx` (backup)

---

## 🚀 COMMANDES DE TEST

### 1. TypeScript Check
```bash
npx tsc --noEmit
```

### 2. Build Test
```bash
npx expo start --clear
```

### 3. Tests Manuels
- Ouvrir chaque screen migré
- Vérifier loading states
- Tester pull-to-refresh
- Vérifier navigation
- Tester offline → online
- Vérifier cache (ouvrir 2× le même screen)

---

## 📝 COMMIT STRATEGY

### Commits Progressifs
```bash
# Après Phase A
git add src/hooks/queries/useTranscriptionQuery.ts
git commit -m "✨ Phase 3.1: Add useTranscriptionQuery hook"

# Après Phase B
git add src/screens/VerticalFeedTabScreen.tsx src/screens/LibraryScreen.tsx
git commit -m "🔄 Phase 3.2: Migrate VerticalFeed + LibraryScreen to React Query"

# Après Phase C
git add src/screens/MomentumDashboardScreen.tsx src/screens/ChapterDetailScreen.tsx
git commit -m "🔄 Phase 3.3: Migrate Dashboard + ChapterDetail to React Query"

# Après Phase D
git add src/components/VideoPlayer.tsx
git commit -m "⚡ Phase 3.4: VideoPlayer bulk fetch optimization"

# Commit final
git commit -m "✅ Phase 3 Complete: Full TanStack Query migration (0% UX changes)"
```

---

## ✅ CHECKLIST FINALE

### Avant de dire "Go"
- [x] Analyse complète des screens existants
- [x] Identification de tous les useState/useEffect
- [x] Plan d'action détaillé créé
- [x] Contraintes UX/UI comprises
- [x] Estimation temps réaliste
- [ ] User approval pour commencer

### Après Migration
- [ ] Tous les screens migrés
- [ ] 0 TypeScript errors
- [ ] 0 nouveaux console.errors
- [ ] Tests manuels passés
- [ ] Documentation mise à jour
- [ ] Commits propres et documentés

---

**TEMPS TOTAL ESTIMÉ:** 6-7 heures
**GAIN DE PERFORMANCE:** -60% network, -75% code, -30% memory
**CHANGEMENT UX/UI:** 0% (impératif)

**Prochaine étape:** Attendre approval de l'utilisateur pour commencer Phase A! 🚀
