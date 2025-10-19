# Memories Bubbles System - Saved for Future Use

## Description
Système de 3 bulles circulaires avec vidéos en lecture automatique (muted), défilement horizontal infini, et cache 24h.

## Fichier principal
`/src/components/MemoriesSection.tsx`

## Fonctionnalités

### 1. **Affichage**
- 3 bulles circulaires (180px diameter)
- Bulle centrale agrandie: scale 1.1x (198px effective)
- Bulles latérales réduites: scale 0.8x + opacity 0.5
- Vidéos en lecture automatique (muted, looping)
- Animation smooth lors du scroll

### 2. **Navigation infinie**
- Array tripication: `[v1, v2, v3, v1, v2, v3, v1, v2, v3]`
- Start au middle set (index 3)
- Jump automatique quand on atteint les bords (index <= 1 ou >= 7)
- Snap to center avec `snapToOffsets`

### 3. **Interactions**
- Tap sur bulle centrale → Circular Preview modal
- Long press 2s → VideoPlayer fullscreen
- Red progress circle pendant long press

### 4. **Cache 24h** (AsyncStorage)
- Clés: `@memories_videos_{user_id}`, `@memories_timestamp_{user_id}`
- Durée: 24h (86400000 ms)
- Régénération automatique après expiration
- Sauvegarde de l'ordre des vidéos

### 5. **Sélection intelligente**
- 3 vidéos UNIQUES de life areas différents
- Basé sur les highlights de transcription
- Fallback sur vidéos aléatoires si pas assez de life areas

## Dimensions & Layout

```typescript
const BUBBLE_SIZE = 180;
const BUBBLE_SPACING = 12;
const CENTER_SCALE = 1.1;
const CENTER_BUBBLE_SIZE = 198; // 180 * 1.1
const SCALE_OVERFLOW = 9; // (198 - 180) / 2
const VERTICAL_PADDING = 21; // 9 + 12 breathing room
const CONTAINER_HEIGHT = 240; // 198 + (21 * 2)
```

## Intégration

### Import
```typescript
import { MemoriesSection } from '../components/MemoriesSection';
```

### Usage
```tsx
<View style={styles.memoriesSection}>
  <MemoriesSection />
</View>
```

### Styles recommandés
```typescript
memoriesSection: {
  paddingHorizontal: 0, // Full width for perfect centering
  paddingTop: theme.spacing['2'],
  paddingBottom: theme.spacing['2'],
}
```

## Dépendances
- `@react-native-async-storage/async-storage` - Cache persistant
- `expo-av` - Video playback
- `react-native-svg` - Progress circle
- `expo-haptics` - Tactile feedback
- `react-native-reanimated` - Animations

## Notes techniques
- Le padding vertical (21px) compense le scale overflow de la bulle centrale
- Le `borderRadius` sur le parent TouchableOpacity crée la forme circulaire
- Les vidéos n'ont pas de borderRadius direct pour éviter les glitches iOS
- Le cache est par user_id pour multi-user support

## Future improvements possibles
- Pull to refresh pour forcer la régénération
- Settings pour changer la durée du cache
- Sélection manuelle des vidéos
- Indicateurs de position (dots)
- Swipe vertical pour changer de "set" de memories

---
**Date sauvegardé**: 2025-10-17
**Raison**: Retiré de MomentumDashboardScreen, gardé pour utilisation future ailleurs
