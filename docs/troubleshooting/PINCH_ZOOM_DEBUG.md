# 🐛 Debug: Pinch Zoom Crash

## ✅ Changements apportés

### 1. Logs détaillés ajoutés
J'ai ajouté des logs pour tracer exactement où le crash se produit :

- `🎨 Rendering with X columns` - Avant chaque render
- `👆 Pinch gesture started` - Quand vous commencez à pinch
- `👆 Pinch gesture ended` - Quand vous relâchez
- `📏 Scale X → Y columns` - Conversion du geste en colonnes
- `🔄 Changing columns from X to Y` - Avant le changement
- `✅ NumColumns state updated` - Après le changement
- `❌ Error in...` - Si une erreur se produit

### 2. LayoutAnimation désactivé par défaut
```typescript
const USE_LAYOUT_ANIMATION = false;
```

**Pour tester :**
1. Essayez d'abord avec `false` (désactivé)
2. Si ça fonctionne, mettez `true` pour voir si LayoutAnimation cause le crash

### 3. Propriété `gap` supprimée
Remplacée par `marginRight` et `marginBottom` pour meilleure compatibilité.

## 📊 Hypothèses à tester

### Hypothèse 1: LayoutAnimation crash sur iOS/Android
**Test:** `USE_LAYOUT_ANIMATION = false`
**Si ça marche:** Le problème vient de LayoutAnimation
**Solution:** Utiliser une animation CSS pure ou react-native-reanimated

### Hypothèse 2: GestureDetector conflit avec ScrollView
**Symptôme:** Crash immédiat au pinch
**Check logs:** Voyez-vous `👆 Pinch gesture started` ?
- **OUI** → Le geste fonctionne, crash après
- **NON** → Le geste lui-même crash

### Hypothèse 3: Re-render de trop de vidéos
**Check logs:** Combien de vidéos sont listées ?
**Solution temporaire:** Limiter à 20-30 vidéos pour tester

### Hypothèse 4: Dimensions NaN ou invalides
**Check logs:** `Rendering video 0 with dimensions: X x Y`
**Si NaN:** Le calcul des dimensions est cassé

## 🧪 Procédure de test

### Étape 1: Ouvrir les logs
```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android

# Ou dans Expo
npx expo start
```

### Étape 2: Reproduire le crash
1. Ouvrir l'app
2. Aller dans Library → Grid view
3. Essayer de pinch avec 2 doigts
4. **Noter le dernier log avant le crash**

### Étape 3: Analyser les logs

**Si vous voyez:**
```
👆 Pinch gesture started
👆 Pinch gesture ended, scale: 0.XX
📏 Scale 0.XX → 5 columns
🔄 Changing columns from 5 to 5
⏭️ Same columns, no change needed
```
→ **Le geste fonctionne, pas de changement = pas de crash**

**Si vous voyez:**
```
👆 Pinch gesture started
👆 Pinch gesture ended, scale: 1.XX
📏 Scale 1.XX → 2 columns
🔄 Changing columns from 5 to 2
⏭️ LayoutAnimation disabled
✅ NumColumns state updated
🎨 Rendering with 2 columns
[CRASH]
```
→ **Le changement de colonnes cause le crash**

**Si vous voyez:**
```
👆 Pinch gesture started
[CRASH]
```
→ **Le geste lui-même cause le crash**

## 💡 Solutions par hypothèse

### Si LayoutAnimation crashe
```typescript
// Dans ZoomableVideoGallery.tsx, ligne 30
const USE_LAYOUT_ANIMATION = false; // ✅ Laisser désactivé
```
→ Transition sera instantanée, mais pas de crash

### Si le geste crashe
Supprimer temporairement le GestureDetector pour tester :
```typescript
// Commenter ligne 117-118 et 122-123
// <GestureDetector gesture={pinchGesture}>
<ScrollView>
  {/* ... */}
</ScrollView>
// </GestureDetector>
```

### Si les dimensions sont invalides
Vérifier les logs et ajouter un fallback :
```typescript
const width = Math.max(50, (SCREEN_WIDTH - ...) / cols); // Min 50px
```

### Si trop de vidéos
Limiter temporairement dans le render :
```typescript
{videos.slice(0, 30).map((video, index) => {
  // ...
})}
```

## 📝 Ce dont j'ai besoin

**Envoyez-moi les logs complets du crash**, notamment :
1. Les 10 dernières lignes avant `[CRASH]`
2. Le message d'erreur exact (si visible)
3. Sur quel appareil ? (iOS/Android, version)
4. Combien de vidéos dans la galerie ?

Cela m'aidera à identifier exactement la cause !
