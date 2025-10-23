# 📚 LibraryScreen Migration Guide - TanStack Query
## Phase 3 Optimization - 23/10/2024

Ce guide montre comment migrer LibraryScreen de useState/useEffect vers TanStack Query.

---

## 🔴 AVANT: Pattern Actuel (useState + useEffect)

```typescript
// ❌ Pattern actuel dans LibraryScreen.tsx (lignes ~150-200)
const [videos, setVideos] = useState<VideoRecord[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [page, setPage] = useState(0);

// Fetch initial
useEffect(() => {
  const loadVideos = async () => {
    setLoading(true);
    try {
      // 1. Charger depuis le cache d'abord
      const cached = await VideoCacheService.loadFromCache();
      if (cached.videos.length > 0) {
        setVideos(cached.videos);
      }

      // 2. Fetch depuis Supabase
      const freshVideos = await VideoService.getAllVideos();
      setVideos(freshVideos);

      // 3. Sauvegarder en cache
      await VideoCacheService.saveToCache(freshVideos);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  loadVideos();
}, []); // ⚠️ Pas de cleanup, pas d'AbortController

// Pull to refresh
const onRefresh = async () => {
  setRefreshing(true);
  const freshVideos = await VideoService.getAllVideos();
  setVideos(freshVideos);
  setRefreshing(false);
};

// Pagination (infinite scroll)
const loadMore = async () => {
  if (!hasMore || loading) return;

  setLoading(true);
  const newVideos = await VideoService.getVideosPage(page);
  setVideos([...videos, ...newVideos]);
  setPage(page + 1);
  setHasMore(newVideos.length === 50);
  setLoading(false);
};
```

### Problèmes avec cette approche:
1. ❌ **Cache manuel** - Gestion complexe avec AsyncStorage
2. ❌ **Pas d'AbortController** - Memory leaks potentiels
3. ❌ **État dupliqué** - videos, loading, refreshing, hasMore...
4. ❌ **Pas de déduplication** - Si 2 composants fetch, 2 requêtes
5. ❌ **Pagination complexe** - Gestion manuelle de page/hasMore

---

## 🟢 APRÈS: Pattern React Query

### Option A: Query Simple (pour petites collections)

```typescript
import { useVideosQuery, useDeleteVideoMutation } from '../hooks/queries/useVideosQuery';

export default function LibraryScreen() {
  // ✅ Une seule ligne remplace tout le fetching logic!
  const {
    data: videos = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useVideosQuery();

  // ✅ Mutation avec optimistic update automatique
  const deleteVideoMutation = useDeleteVideoMutation();

  // Pull to refresh simplifié
  const onRefresh = () => {
    refetch(); // C'est tout!
  };

  // Delete avec optimistic update
  const handleDelete = (videoId: string) => {
    deleteVideoMutation.mutate(videoId, {
      onSuccess: () => {
        // Toast ou feedback
        console.log('Video deleted!');
      },
    });
  };

  // Loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Error state
  if (isError) {
    return <ErrorScreen error={error} onRetry={refetch} />;
  }

  return (
    <FlatList
      data={videos}
      refreshing={isRefetching}
      onRefresh={onRefresh}
      renderItem={({ item }) => (
        <VideoCard
          video={item}
          onDelete={() => handleDelete(item.id)}
        />
      )}
    />
  );
}
```

### Option B: Infinite Query (pour grandes collections avec pagination)

```typescript
import { useInfiniteVideosQuery } from '../hooks/queries/useVideosQuery';

export default function LibraryScreen() {
  // ✅ Infinite scroll automatique!
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteVideosQuery({ pageSize: 50 });

  // Flatten pages into single array
  const videos = useMemo(() => {
    return data?.pages.flatMap(page => page) ?? [];
  }, [data]);

  // Load more handler
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Pull to refresh
  const onRefresh = () => {
    refetch(); // Refetch toutes les pages
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return <ErrorScreen error={error} onRetry={refetch} />;
  }

  return (
    <FlatList
      data={videos}
      refreshing={isRefetching}
      onRefresh={onRefresh}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator /> : null
      }
      renderItem={({ item }) => <VideoCard video={item} />}
    />
  );
}
```

---

## 🚀 Migration Step by Step

### Étape 1: Importer les hooks

```typescript
// En haut du fichier LibraryScreen.tsx
import {
  useInfiniteVideosQuery,
  useDeleteVideoMutation,
  useVideoCache
} from '../hooks/queries/useVideosQuery';
```

### Étape 2: Remplacer useState/useEffect

```typescript
// ❌ SUPPRIMER
const [videos, setVideos] = useState<VideoRecord[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);

// ✅ REMPLACER PAR
const {
  data,
  isLoading,
  isRefetching,
  refetch,
  fetchNextPage,
  hasNextPage,
} = useInfiniteVideosQuery({ pageSize: 50 });

const videos = useMemo(() => {
  return data?.pages.flatMap(page => page) ?? [];
}, [data]);
```

### Étape 3: Simplifier les handlers

```typescript
// ❌ AVANT
const onRefresh = async () => {
  setRefreshing(true);
  try {
    const videos = await VideoService.getAllVideos();
    setVideos(videos);
    await VideoCacheService.saveToCache(videos);
  } catch (error) {
    console.error(error);
  } finally {
    setRefreshing(false);
  }
};

// ✅ APRÈS
const onRefresh = () => refetch();
```

### Étape 4: Utiliser les mutations

```typescript
// Pour delete
const deleteMutation = useDeleteVideoMutation();

const handleDelete = (videoId: string) => {
  deleteMutation.mutate(videoId);
};

// Pour update
const updateMutation = useUpdateVideoMutation();

const handleUpdate = (id: string, title: string) => {
  updateMutation.mutate({ id, updates: { title } });
};
```

---

## 🎯 Avantages de React Query

| Aspect | Avant | Après |
|--------|-------|-------|
| **Lines of code** | ~200 | ~50 |
| **Cache management** | Manuel (AsyncStorage) | Automatique |
| **Network requests** | Dupliqués | Dédupliqués |
| **Memory leaks** | Possible | Impossible |
| **Optimistic updates** | Manuel | Automatique |
| **Error handling** | Manuel | Automatique |
| **Loading states** | 3+ useState | 1 query state |
| **Background refetch** | Non | Oui |
| **Stale while revalidate** | Non | Oui |

---

## 💡 Tips & Best Practices

### 1. Utiliser les DevTools

```typescript
// Dans App.tsx (dev only)
if (__DEV__) {
  const { ReactQueryDevtools } = require('@tanstack/react-query-devtools');

  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 2. Prefetch pour navigation

```typescript
// Prefetch avant navigation vers VideoPlayer
const prefetch = usePrefetchVideo();

const navigateToVideo = (videoId: string) => {
  prefetch(videoId); // Prefetch en background
  navigation.navigate('VideoPlayer', { videoId });
};
```

### 3. Invalidation intelligente

```typescript
// Après upload d'une nouvelle vidéo
queryClient.invalidateQueries({ queryKey: ['videos'] });

// Après changement de chapitre
queryClient.invalidateQueries({ queryKey: ['videos', 'byChapter'] });
```

### 4. Cache persistant (optionnel)

```typescript
// Pour persister le cache entre sessions
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const asyncStoragePersister = {
  persistClient: async (client) => {
    await AsyncStorage.setItem('REACT_QUERY_CACHE', JSON.stringify(client));
  },
  restoreClient: async () => {
    const cache = await AsyncStorage.getItem('REACT_QUERY_CACHE');
    return cache ? JSON.parse(cache) : undefined;
  },
};

persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
});
```

---

## ⚠️ Points d'Attention

1. **Ne pas mixer patterns** - Éviter d'utiliser useState ET useQuery
2. **Éviter over-fetching** - Utiliser `enabled` pour conditionner
3. **Gérer les erreurs** - Toujours avoir un error boundary
4. **Tester sur device** - Performance différente du simulateur

---

## 📊 Métriques à Surveiller

Après migration, mesurer:
- **Time to Interactive**: Devrait diminuer de 50%
- **Network requests**: Devrait diminuer de 60%
- **Memory usage**: Devrait diminuer de 30%
- **Code complexity**: Devrait diminuer de 70%

---

## 🎉 Résultat Final

Une fois migré, LibraryScreen sera:
- ✅ Plus rapide (cache automatique)
- ✅ Plus stable (pas de memory leaks)
- ✅ Plus simple (moins de code)
- ✅ Plus maintenable (patterns standards)
- ✅ Meilleure UX (optimistic updates)

---

**Prochaine étape**: Migrer ChapterDetailScreen avec le même pattern!