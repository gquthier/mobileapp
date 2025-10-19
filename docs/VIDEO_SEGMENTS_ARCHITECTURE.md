# 🎯 Video Segments Architecture - Life Area Filtering

## Objectif

Quand l'utilisateur filtre par Life Area (Health, Family, etc.), les vidéos doivent démarrer directement au timestamp du highlight correspondant et se terminer à la fin du segment, au lieu de jouer la vidéo entière.

## Exemple d'utilisation

```
Vidéo "Ma journée" - 5 minutes
├─ 0:00-0:45 → Introduction (aucune Life Area)
├─ 0:45-1:30 → Highlight "Health" - "Morning workout"  ← Segment 1
├─ 1:30-2:15 → Travail (aucune Life Area)
├─ 2:15-3:00 → Highlight "Family" - "Dinner with kids" ← Segment 2
└─ 3:00-5:00 → Soirée (aucune Life Area)

User filtre par "Health":
- Feed affiche: Segment 1 (0:45-1:30) seulement
- Vidéo démarre à 0:45s
- Vidéo s'arrête à 1:30s
- Auto-scroll vers le segment suivant
```

## 📊 Architecture proposée

### 1. Nouveau type: `VideoSegment`

```typescript
// src/types/index.ts

export interface VideoSegment extends VideoRecord {
  // Timestamp de démarrage du segment (en secondes)
  segment_start_time?: number

  // Timestamp de fin du segment (en secondes)
  segment_end_time?: number

  // Life Area de ce segment (pour affichage)
  segment_life_area?: string

  // Titre du highlight (pour affichage dans VideoInfoBar)
  segment_title?: string

  // Flag pour indiquer que c'est un segment, pas une vidéo complète
  is_segment?: boolean
}
```

### 2. Modifier `VideoService.searchVideosByLifeArea()`

**Avant** (retourne vidéos complètes):
```typescript
searchVideosByLifeArea("Health") → [
  { id: "vid1", title: "Ma journée", file_path: "...", duration: 300 }
]
```

**Après** (retourne segments):
```typescript
searchVideosByLifeArea("Health") → [
  {
    id: "vid1",
    title: "Ma journée",
    file_path: "...",
    duration: 300,
    is_segment: true,
    segment_start_time: 45,    // 0:45
    segment_end_time: 90,       // 1:30
    segment_life_area: "Health",
    segment_title: "Morning workout"
  }
]
```

**Implémentation**:

```typescript
// src/services/videoService.ts

static async searchVideosByLifeArea(
  lifeArea: string,
  userId?: string,
  limit: number = 100
): Promise<VideoSegment[]> {
  // ... existing code to fetch videos ...

  // 🆕 Extract segments instead of whole videos
  const segments: VideoSegment[] = [];

  (videos || []).forEach(video => {
    const transcriptionJobs = video.transcription_jobs;
    if (!Array.isArray(transcriptionJobs) || transcriptionJobs.length === 0) {
      return;
    }

    transcriptionJobs.forEach((job: any) => {
      if (!job.transcript_highlight) return;

      const highlights = job.transcript_highlight.highlights;
      if (!Array.isArray(highlights)) return;

      // Extract all highlights matching this life area
      highlights.forEach((highlight: any) => {
        if (!highlight || !highlight.area) return;

        const areaMatch = highlight.area.toLowerCase() === lifeArea.toLowerCase();

        if (areaMatch) {
          // Create a video segment for this highlight
          const segment: VideoSegment = {
            ...video,
            is_segment: true,
            segment_start_time: highlight.start_time || highlight.startTime || 0,
            segment_end_time: highlight.end_time || highlight.endTime || video.duration || 0,
            segment_life_area: highlight.area,
            segment_title: highlight.title,
          };

          segments.push(segment);
        }
      });
    });
  });

  // Sort segments by creation date
  const sortedSegments = segments.sort((a, b) =>
    new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  return sortedSegments.slice(0, limit);
}
```

### 3. Modifier `VerticalVideoCard` pour supporter les segments

**Props update**:

```typescript
// src/features/vertical-feed/components/VerticalVideoCard.tsx

interface VerticalVideoCardProps {
  video: VideoSegment  // ← Changed from VideoRecord
  // ... existing props
}
```

**Ajout du playback avec start/end time**:

```typescript
// Dans VerticalVideoCard

useEffect(() => {
  if (!playerRef.current || !isActive) return;

  const player = playerRef.current;

  // 🆕 Si c'est un segment, démarrer au bon timestamp
  if (video.is_segment && video.segment_start_time !== undefined) {
    player.currentTime = video.segment_start_time;
    console.log(`⏩ Segment start: seeking to ${video.segment_start_time}s`);
  }

  player.play();
}, [isActive, video.is_segment, video.segment_start_time]);

// 🆕 Monitor playback time et arrêter à la fin du segment
useEffect(() => {
  if (!playerRef.current || !video.is_segment || !video.segment_end_time) return;

  const player = playerRef.current;
  const endTime = video.segment_end_time;

  const checkPlaybackTime = setInterval(() => {
    if (player.currentTime >= endTime) {
      console.log(`⏹️ Segment end reached at ${endTime}s`);
      player.pause();

      // Trigger onVideoEnd to auto-scroll to next segment
      if (onVideoEnd) {
        onVideoEnd();
      }

      clearInterval(checkPlaybackTime);
    }
  }, 100); // Check every 100ms

  return () => clearInterval(checkPlaybackTime);
}, [video.is_segment, video.segment_end_time, onVideoEnd]);
```

### 4. Modifier `VideoInfoBar` pour afficher le titre du segment

```typescript
// src/components/VideoInfoBar.tsx

<Text style={styles.minimizedTitle} numberOfLines={1}>
  {video.is_segment && video.segment_title
    ? video.segment_title
    : (video.title || 'Untitled Video')
  }
</Text>
```

### 5. Update du flow de navigation depuis LibraryScreen

```typescript
// src/screens/LibraryScreen.tsx

const handleLifeAreaPress = useCallback(async (lifeArea: string) => {
  console.log('🎯 Life area selected:', lifeArea);

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  dispatch({ type: 'SELECT_LIFE_AREA', lifeArea });
  dispatch({ type: 'SET_SEARCHING_LIFE_AREA', isSearching: true });

  try {
    // 🆕 Search returns VideoSegments instead of full videos
    const segments = await VideoService.searchVideosByLifeArea(lifeArea);
    console.log(`✅ Found ${segments.length} segments for ${lifeArea}`);

    dispatch({ type: 'SET_LIFE_AREA_RESULTS', results: segments });
  } catch (error) {
    console.error('❌ Life area search failed:', error);
    dispatch({ type: 'SET_LIFE_AREA_RESULTS', results: [] });
  } finally {
    dispatch({ type: 'SET_SEARCHING_LIFE_AREA', isSearching: false });
  }
}, []);
```

Quand l'utilisateur clique sur un thumbnail:

```typescript
<TouchableOpacity
  style={styles.lifeAreaGridThumbnail}
  onPress={() => {
    const itemIndex = state.search.lifeAreaResults.findIndex(v => v.id === item.id);

    // 🆕 Open VerticalFeed with segments (not full videos)
    navigation.navigate('VerticalFeed', {
      videos: state.search.lifeAreaResults,  // Contains VideoSegments
      initialIndex: itemIndex,
      sourceScreen: 'library-life-area',
      lifeAreaFilter: state.search.selectedLifeArea,  // Track which filter is active
    });
  }}
>
```

## 🎨 UX Enhancements

### Affichage du Life Area badge

Dans `VideoInfoBar`, ajouter un badge pour indiquer la Life Area active:

```typescript
{video.is_segment && video.segment_life_area && (
  <View style={styles.lifeAreaBadge}>
    <Text style={styles.lifeAreaBadgeText}>
      {video.segment_life_area}
    </Text>
  </View>
)}
```

### Progress bar du segment

Modifier la progress bar pour afficher le progrès dans le segment (0% à 100% du segment):

```typescript
const segmentProgress = video.is_segment
  ? ((currentTime - video.segment_start_time!) / (video.segment_end_time! - video.segment_start_time!)) * 100
  : (currentTime / video.duration) * 100;
```

## 🔄 Edge Cases à gérer

1. **Segment sans end_time**: Utiliser `duration` de la vidéo
2. **Vidéo avec plusieurs segments de la même Life Area**: Créer plusieurs segments
3. **Segments qui se chevauchent**: Les jouer tous séparément
4. **Vidéo complète + segments**: Gérer les 2 modes dans VerticalVideoCard

## ✅ Checklist d'implémentation

- [ ] 1. Créer le type `VideoSegment` dans `/src/types/index.ts`
- [ ] 2. Modifier `VideoService.searchVideosByLifeArea()` pour retourner des segments
- [ ] 3. Modifier `VerticalVideoCard` pour:
  - [ ] Accepter `VideoSegment` au lieu de `VideoRecord`
  - [ ] Démarrer au `segment_start_time`
  - [ ] Arrêter au `segment_end_time`
  - [ ] Trigger `onVideoEnd` à la fin du segment
- [ ] 4. Modifier `VideoInfoBar` pour afficher le titre du segment
- [ ] 5. Ajouter un badge Life Area dans le feed
- [ ] 6. Tester le flow complet: Filter Health → Play segment → Auto-scroll to next

## 🚀 Gains de cette approche

- ✅ **UX**: L'utilisateur voit directement le contenu pertinent
- ✅ **Performance**: Pas besoin de skip manuellement dans la vidéo
- ✅ **Discovery**: Révèle le contenu caché dans de longues vidéos
- ✅ **Engagement**: Chaque segment = une micro-expérience complète
