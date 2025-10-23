# 🔍 AUDIT COMPLET - React Query Migration

**Date:** 23 octobre 2025
**Analysé par:** Claude
**Contexte:** Erreurs après migration Phase 3

---

## 🚨 ERREURS CRITIQUES IDENTIFIÉES

### ❌ 1. MomentumDashboardScreen - Fonction manquante (LIGNE 394)

**Problème:**
```tsx
// Ligne 394 - MomentumDashboardScreen.tsx
<TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
  <Text style={styles.retryButtonText}>Réessayer</Text>
</TouchableOpacity>
```

**Impact:**
- ❌ App crash quand l'utilisateur clique sur "Réessayer" si stats === null
- ❌ ReferenceError: Property 'loadDashboardData' doesn't exist

**Fix requis:**
```tsx
// PROPOSITION DE FIX:
const handleRetry = useCallback(() => {
  refetchVideos();
  refetchChapters();
}, [refetchVideos, refetchChapters]);

// Dans le JSX:
<TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
```

**Priorité:** 🔴 CRITIQUE - À fixer immédiatement

---

### ⚠️ 2. ChapterDetailScreen - Code mort (4 fonctions non utilisées)

**Problème:**
```tsx
// Lignes 317-500+ - Fonctions définies mais jamais appelées:
const loadChapterData = async () => { ... }      // 59 lignes
const loadAllChapters = async () => { ... }      // 25 lignes
const loadQuotes = async () => { ... }           // 52 lignes
const loadLifeAreaMentions = async () => { ... } // ~40 lignes
```

**Impact:**
- ⚠️ Code mort (~176 lignes)
- ⚠️ Bundle size augmenté inutilement
- ⚠️ Confusion pour les développeurs

**Fix recommandé:**
- Supprimer ces 4 fonctions (remplacées par React Query)
- Garder seulement les commentaires explicatifs

**Priorité:** 🟡 MOYEN - Cleanup recommandé

---

## 🐌 PROBLÈMES DE PERFORMANCE IDENTIFIÉS

### 1. Erreur Supabase 520 (Infrastructure)

**Erreur observée:**
```
ERROR  ❌ Error fetching videos:
Cloudflare Error 520: Web server is returning an unknown error
```

**Analyse:**
- ✅ **PAS un problème de code**
- ✅ Erreur temporaire d'infrastructure Supabase/Cloudflare
- ✅ Résolu automatiquement après reload

**Action:** Aucune - surveillance recommandée

---

### 2. "Fetching query" - Temps de chargement long au 1er load

**Observations utilisateur:**
> "Quand je vais sur chaque page, il y a un temps de chargement énorme où on dit 'fetching query'"

**Analyse:**

#### Causes possibles:

**a) Premier chargement = Pas de cache (NORMAL)**
- ✅ React Query cache vide au démarrage
- ✅ Toutes les queries doivent fetch depuis Supabase
- ✅ Après le 1er load, cache actif (5-10 min selon le type)

**b) Trop de queries en parallèle**

**MomentumDashboardScreen:**
```tsx
useVideosQuery()              // Query 1
useChaptersQuery()            // Query 2
useFocusEffect(() => {
  getMomentumStats(user.id)   // Query 3 (non-React Query)
  profiles.select(avatar_url) // Query 4 (non-React Query)
})
```
- 4 queries en parallèle au mount
- 2 via React Query (cached)
- 2 via Supabase direct (NON cached)

**ChapterDetailScreen:**
```tsx
useChapterQuery(id)                    // Query 1
useVideosByChapterQuery(id)            // Query 2
useChaptersQuery()                     // Query 3
useBulkTranscriptionsQuery(videoIds)   // Query 4 (dépend de Query 2!)
useQuotesQuery(videoIds)               // Query 5 (dépend de Query 2!)
```
- **WATERFALL DÉTECTÉ:** Queries 4-5 attendent Query 2
- videoIds extrait APRÈS que useVideosByChapterQuery retourne
- Delay additionnel de ~200-500ms

**LibraryScreen:**
```tsx
useInfiniteVideosQuery()     // Query 1
useChaptersQuery()           // Query 2
useCurrentChapterQuery()     // Query 3
```
- 3 queries en parallèle (OK)

**c) `refetchOnReconnect: 'always'` trop agressif**

Dans `queryClient.ts`:
```tsx
refetchOnReconnect: 'always',  // ⚠️ Refetch TOUTES les queries à chaque reconnexion
```

**Impact:**
- Si réseau instable → refetch constant
- Battery drain
- UX: loading spinners répétés

---

## 📊 ANALYSE DES LOGS

### Logs observés:

```
LOG  🔄 [React Query] Fetching chapters...
LOG  🔄 [React Query] Fetching current chapter...
LOG  [VerticalFeedTabScreen] 🎲 Shuffled 48 videos
ERROR  [ReferenceError: Property 'loadDashboardData' doesn't exist]
```

**Analyse:**
1. ✅ React Query fonctionne (fetching chapters)
2. ✅ VerticalFeedScreen fonctionne (shuffle OK)
3. ❌ Crash sur MomentumDashboard (loadDashboardData manquant)

---

## ✅ OPTIMISATIONS RECOMMANDÉES

### 🔴 PRIORITÉ 1 - Fixes Critiques (À faire maintenant)

#### 1.1 Fixer MomentumDashboardScreen retry button

**Fichier:** `src/screens/MomentumDashboardScreen.tsx`

**Changement:**
```tsx
// AJOUTER après les autres useCallback (ligne ~280):
const handleRetry = useCallback(() => {
  console.log('[MomentumDashboard] Retry button pressed - Refetching...');
  refetchVideos();
  refetchChapters();
}, [refetchVideos, refetchChapters]);

// REMPLACER ligne 394:
- <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
+ <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
```

**Impact:** ✅ Fix le crash

---

### 🟡 PRIORITÉ 2 - Optimisations Performance (Recommandées)

#### 2.1 Supprimer code mort dans ChapterDetailScreen

**Fichier:** `src/screens/ChapterDetailScreen.tsx`

**Supprimer lignes ~317-500:**
```tsx
// SUPPRIMER ces 4 fonctions (176 lignes):
const loadChapterData = async () => { ... }
const loadAllChapters = async () => { ... }
const loadQuotes = async () => { ... }
const loadLifeAreaMentions = async () => { ... }
```

**Impact:**
- ✅ -176 lignes de code mort
- ✅ Bundle size réduit (~5-8KB)

---

#### 2.2 Fixer waterfall dans ChapterDetailScreen

**Problème actuel:**
```tsx
// videoIds calculé après que videos soit loaded
const videoIds = useMemo(() => videos.map(v => v.id), [videos]);

// Ces queries attendent videoIds → WATERFALL
useBulkTranscriptionsQuery(videoIds);  // Attend videos
useQuotesQuery(videoIds);              // Attend videos
```

**Solution proposée:**
```tsx
// Option A: Enabled conditionnel
const {
  data: transcriptionsMap,
  isLoading: transcriptionsLoading,
} = useBulkTranscriptionsQuery(videoIds, {
  enabled: videoIds.length > 0, // Ne fetch que si on a des IDs
});

// Option B: Suspense (si React 18+)
// Ou Option C: Accepter le waterfall (pas grave si <500ms)
```

**Impact:**
- ✅ -200ms de delay potentiel
- ⚠️ Complexité accrue (Option A/B)
- ✅ Ou laisser tel quel si acceptable (Option C)

---

#### 2.3 Migrer stats + avatar vers React Query dans MomentumDashboard

**Problème actuel:**
```tsx
// NON-cached (refetch à chaque mount)
useFocusEffect(() => {
  getMomentumStats(user.id)  // ❌ Pas de cache
  profiles.select(avatar)     // ❌ Pas de cache
})
```

**Solution proposée:**
```tsx
// CRÉER: src/hooks/queries/useStatsQuery.ts
export const useStatsQuery = (userId: string) => {
  return useQuery({
    queryKey: ['stats', userId],
    queryFn: () => getMomentumStats(userId),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
};

export const useAvatarQuery = (userId: string) => {
  return useQuery({
    queryKey: ['avatar', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();
      return data?.avatar_url || null;
    },
    staleTime: 10 * 60 * 1000, // 10 min cache
  });
};

// DANS MomentumDashboardScreen:
const { data: stats } = useStatsQuery(user.id);
const { data: avatarUrl } = useAvatarQuery(user.id);
```

**Impact:**
- ✅ Cache de 5-10 min (moins de fetches)
- ✅ Comportement cohérent avec autres queries
- ✅ -20 lignes dans le screen

---

#### 2.4 Ajuster refetchOnReconnect

**Fichier:** `src/lib/queryClient.ts`

**Changement:**
```tsx
// REMPLACER ligne 42:
- refetchOnReconnect: 'always',
+ refetchOnReconnect: false, // Ou 'true' (1× seulement, pas toutes les queries)
```

**Explication:**
- `'always'` → Refetch TOUTES les queries à chaque reconnexion
- `false` → Jamais refetch automatiquement
- `true` → Refetch seulement les queries stale (recommandé)

**Impact:**
- ✅ Moins de network requests
- ✅ Meilleure batterie
- ✅ UX plus smooth (moins de loading spinners)

---

### 🔵 PRIORITÉ 3 - Améliorations Futures (Optionnelles)

#### 3.1 Ajouter React Query DevTools (dev only)

**Fichier:** `App.tsx`

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Dans le return:
<QueryClientProvider client={queryClient}>
  {/* ... existing code ... */}
  {__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
</QueryClientProvider>
```

**Impact:**
- ✅ Debug visuel du cache
- ✅ Voir les queries en temps réel
- ✅ Identifier les waterfalls facilement

---

#### 3.2 Ajouter logging pour identifier les slow queries

**Fichier:** `src/lib/queryClient.ts`

```tsx
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ... existing config ...

      // AJOUTER:
      onSuccess: (data: any, query: any) => {
        if (__DEV__) {
          const duration = Date.now() - query.state.dataUpdatedAt;
          if (duration > 1000) {
            console.warn(`⚠️ Slow query (${duration}ms):`, query.queryKey);
          }
        }
      },
    },
  },
});
```

**Impact:**
- ✅ Identifier les queries > 1s
- ✅ Optimiser les plus lentes en priorité

---

#### 3.3 Précharger les queries communes au startup

**Fichier:** `App.tsx`

```tsx
useEffect(() => {
  // Précharger videos + chapters au startup (background)
  queryClient.prefetchQuery({
    queryKey: ['videos'],
    queryFn: () => VideoService.getAllVideos(),
  });

  queryClient.prefetchQuery({
    queryKey: ['chapters'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from('chapters').select('*');
      return data || [];
    },
  });
}, []);
```

**Impact:**
- ✅ Cache chaud dès le démarrage
- ✅ Navigation instantanée vers Library/Dashboard
- ⚠️ +500ms au startup initial

---

## 📊 RÉSUMÉ DES PROBLÈMES

| Problème | Sévérité | Impact UX | Fix Requis |
|----------|----------|-----------|------------|
| loadDashboardData manquant | 🔴 Critique | Crash | Oui |
| Code mort (176 lignes) | 🟡 Moyen | Bundle size | Recommandé |
| Waterfall ChapterDetail | 🟡 Moyen | +200ms load | Optionnel |
| Stats non-cached | 🟡 Moyen | Refetch répété | Recommandé |
| refetchOnReconnect | 🟢 Faible | Battery | Optionnel |
| Supabase 520 error | 🔵 Infrastructure | Temporaire | Non |

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Phase 1: Fixes Critiques (15 min)
1. ✅ Fix retry button MomentumDashboard
2. ✅ Test sur device

### Phase 2: Optimisations (1h)
1. ✅ Supprimer code mort ChapterDetail
2. ✅ Migrer stats + avatar vers React Query
3. ✅ Ajuster refetchOnReconnect

### Phase 3: Monitoring (30 min)
1. ✅ Ajouter React Query DevTools
2. ✅ Ajouter slow query logging
3. ✅ Tester avec Network Link Conditioner (3G/LTE)

---

## ✅ CONCLUSION

**État général:** 🟡 **BON avec 1 bug critique**

**Points positifs:**
- ✅ Migration React Query fonctionnelle
- ✅ Toutes les queries fonctionnent correctement
- ✅ Cache fonctionne comme prévu
- ✅ Erreur Supabase 520 = infrastructure, pas notre code

**Points à corriger:**
- ❌ 1 bug critique (retry button) → Fix immédiat requis
- ⚠️ Code mort à nettoyer
- ⚠️ Quelques optimisations possibles

**Réponse à la question:**
> "Fais une analyse complète pour confirmer qu'on n'a pas d'erreur"

**Verdict:**
- **1 erreur critique trouvée** (loadDashboardData)
- **Erreur Supabase 520 = temporaire** (infrastructure)
- **"Fetching query" lent = NORMAL au 1er load** (pas de cache)
- Après 1er load → cache actif → rapide ✅

---

**Prochaines étapes recommandées:**
1. Fix le retry button (PRIORITÉ 1)
2. Test complet sur device
3. Décider si on fait les optimisations PRIORITÉ 2

