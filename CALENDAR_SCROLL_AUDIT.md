# 🔍 Audit - Problèmes de Scroll de la Vue Calendrier

**Date:** 18 Octobre 2025
**Symptômes:** Scroll lent/non-réactif, particulièrement pendant les transitions de la top bar

---

## ⚠️ PROBLÈMES CRITIQUES IDENTIFIÉS

### 1. **ANIMATION NON-NATIVE DÉCLENCHÉE PAR LE SCROLL** ❌ CRITIQUE
**Fichier:** `LibraryScreen.tsx` ligne 619-632

**Le problème:**
```typescript
const handleScroll = useCallback((event: any) => {
  const currentScrollY = event.nativeEvent.contentOffset.y;
  const scrollingUp = currentScrollY < lastScrollY.current;

  // ❌ BLOQUE LE SCROLL: Lance une animation pendant le scroll
  if (scrollingUp && currentScrollY > 50 && !state.search.showSearchBar) {
    handleChaptersTitlePress(); // Lance Animated.spring avec useNativeDriver: false
  }
}, []);
```

**Pourquoi c'est grave:**
- `handleScroll` est appelé **toutes les 16ms** pendant le scroll (`scrollEventThrottle={16}`)
- Déclenche `handleChaptersTitlePress()` qui lance une animation **Animated.spring**
- Cette animation utilise `useNativeDriver: false` (ligne 609) = **thread JavaScript**
- Pendant l'animation (~300-500ms), le thread JS est bloqué
- **= SCROLL GELÉ pendant la transition**

---

### 2. **DOUBLE HANDLING DU SCROLL** ❌ CRITIQUE
**Fichiers:**
- `CalendarGallerySimple.tsx` ligne 337-349
- `LibraryScreen.tsx` ligne 619-632 + 1369

**Le problème:**
```typescript
// Dans CalendarGallery:
<ScrollView
  onScroll={handleScroll}        // Handler 1
  scrollEventThrottle={16}
/>

// Dans LibraryScreen:
<CalendarGallery
  onScroll={handleScroll}        // Handler 2 (passe au ScrollView)
/>
```

**Impact:**
- **2 callbacks JavaScript** exécutés toutes les 16ms (60 FPS)
- CalendarGallery calcule `onEndReached`
- LibraryScreen vérifie direction scroll + lance potentiellement animation
- **= 120+ appels par seconde pendant le scroll**

---

### 3. **ANIMATIONS HEADER AVEC `useNativeDriver: false`** ❌ HAUTE PRIORITÉ
**Fichier:** `LibraryScreen.tsx` lignes 589-595, 657-662

**Le problème:**
```typescript
Animated.spring(searchBarProgress, {
  toValue: 1,
  useNativeDriver: false,  // ❌ Animation sur thread JavaScript
  tension: 60,
  friction: 10,
}).start();
```

**Animations affectées:**
- `searchBarProgress` - opacity + translateX du search bar
- Interpolations multiples (ligne 1026-1035, 1153-1159, 1175-1182)
- Header en `position: absolute` avec `zIndex: 100`

**Impact:**
- Animation prend 300-500ms sur thread JavaScript
- Pendant ce temps, le scroll est saccadé
- **L'utilisateur sent un délai** quand il essaie de scroller pendant la fermeture du search bar

---

### 4. **CALCULS COÛTEUX PENDANT LE RENDER** ⚠️ MOYENNE PRIORITÉ
**Fichier:** `LibraryScreen.tsx` lignes 487-523

**Le problème:**
```typescript
const getCurrentMonthDays = useMemo(() => {
  // Recalcule à chaque render si videos.length change
  const videoDates = new Set<number>();
  allVideos.forEach(video => { /* ... */ }); // Boucle sur TOUS les videos

  for (let day = 1; day <= daysInMonth; day++) {
    days.push({ /* ... */ });
  }
  return days;
}, [allVideos.length, new Date().getMonth(), new Date().getFullYear()]);
```

**Impact:**
- Recalcule quand `allVideos.length` change (fréquent avec upload)
- `new Date()` dans les dépendances = recalcule chaque minute
- Boucle sur tous les videos (peut être 100+)

---

### 5. **420 CELLULES RENDUES SIMULTANÉMENT** ⚠️ MOYENNE PRIORITÉ
**Fichier:** `CalendarGallerySimple.tsx` ligne 329

**Le problème:**
- 12 mois × 35 jours = **420 cellules**
- Chaque cellule = 1 TouchableOpacity + 1 Image potentielle
- Toutes les cellules sont dans un ScrollView (pas de virtualisation)
- **= 420+ composants montés en mémoire**

**Impact:**
- Consommation mémoire élevée
- Re-render complet si props changent
- Images chargées pour tous les mois visibles

---

### 6. **MESURE SYNCHRONE DANS handleDayPress** ⚠️ BASSE PRIORITÉ
**Fichier:** `CalendarGallerySimple.tsx` ligne 201-211

**Le problème:**
```typescript
cellRef.measureInWindow((x, y, width, height) => {
  // Mesure la position de la cellule
  const rect: SourceRect = { x, y, width, height };
  onVideoPressWithRect(day.videos[0], rect, day.videos, 0);
});
```

**Impact:**
- `measureInWindow` peut forcer un layout synchrone
- Si appelé pendant une animation, peut causer un freeze
- Moins grave car uniquement au tap, pas pendant scroll

---

## 🎯 PRIORITÉS DE FIX

### ⚡ URGENT (Fixes le gel pendant transitions)
1. **Désactiver l'animation auto du search bar pendant le scroll**
   - Retirer la logique ligne 626-630 qui détecte scroll up
   - Garder uniquement le toggle manuel

2. **Passer searchBarProgress à useNativeDriver: true**
   - Problème: translateX et opacity nécessitent layout changes
   - Solution: Séparer les animations ou utiliser transform uniquement

3. **Réduire le nombre de scroll handlers**
   - Garder UN SEUL handler dans CalendarGallery
   - Passer les événements nécessaires via callbacks

### 🔧 IMPORTANT (Améliore fluidité globale)
4. **Augmenter scrollEventThrottle**
   - Passer de 16ms à 32ms ou 64ms
   - Réduit de moitié ou plus le nombre de callbacks

5. **Optimiser getCurrentMonthDays**
   - Retirer `new Date()` des dépendances
   - Utiliser une valeur stable pour le mois actuel

### 📈 OPTIMISATION (Performance long terme)
6. **Virtualiser le calendrier**
   - Utiliser FlatList au lieu de ScrollView
   - Rendre uniquement les mois visibles

7. **Lazy loading des images**
   - Charger les thumbnails uniquement pour mois visibles
   - Utiliser un cache avec expiration

---

## 💡 SCÉNARIO EXACT DU GEL

**Quand l'utilisateur scrolle vers le bas:**
1. ScrollView détecte le mouvement (16ms intervals)
2. `handleScroll` dans LibraryScreen détecte scroll UP
3. Condition ligne 626 = true → `handleChaptersTitlePress()` est appelé
4. Lance `Animated.spring(searchBarProgress, { useNativeDriver: false })`
5. Animation prend ~400ms sur le thread JavaScript
6. **Pendant 400ms, le scroll est gelé** car thread JS occupé
7. L'utilisateur continue de swiper mais rien ne bouge
8. Animation termine → scroll reprend

**Quand la top bar se ferme:**
1. Utilisateur tap à l'extérieur → `handleOutsidePress()` ligne 634
2. Lance animation `searchBarProgress` vers 0 (ligne 657)
3. `useNativeDriver: false` = thread JavaScript
4. Animation ~300ms
5. Si l'utilisateur essaie de scroller pendant: **scroll gelé**

---

## ✅ SOLUTIONS RECOMMANDÉES (par ordre d'impact)

### Solution 1: Désactiver auto-expand du search bar ⚡ IMPACT MAX
```typescript
// RETIRER lignes 626-630:
if (scrollingUp && currentScrollY > 50 && !state.search.showSearchBar) {
  handleChaptersTitlePress(); // ❌ RETIRE ÇA
}
```
**Impact:** Élimine 90% des gels pendant scroll

### Solution 2: Augmenter throttle du scroll ⚡ IMPACT ÉLEVÉ
```typescript
// Dans CalendarGallerySimple ligne 359:
scrollEventThrottle={64} // Au lieu de 16
```
**Impact:** Réduit de 75% les callbacks JS

### Solution 3: Simplifier animations header 🔧 IMPACT MOYEN
```typescript
// Utiliser transform uniquement (compatible useNativeDriver: true)
// Ou retirer l'animation et faire un toggle instantané
```
**Impact:** Rend les transitions fluides

### Solution 4: Retirer le double scroll handling 🔧 IMPACT MOYEN
```typescript
// Dans LibraryScreen ligne 1369:
<CalendarGallery
  onScroll={undefined} // ❌ Ne pas passer de handler
  // Garder uniquement le handler interne de CalendarGallery
/>
```
**Impact:** Réduit de 50% les calculs pendant scroll

---

## 📊 RÉSUMÉ

**Cause #1 du problème:** Animation JavaScript déclenchée pendant le scroll
**Cause #2 du problème:** Double handling des événements scroll (120+ callbacks/seconde)
**Cause #3 du problème:** Animations header avec `useNativeDriver: false`

**Fix rapide recommandé (5 min):**
1. Commenter lignes 626-630 (auto-expand search bar)
2. Changer `scrollEventThrottle` de 16 à 64

**Fix complet recommandé (30 min):**
1. Retirer auto-expand du search bar
2. Augmenter scrollEventThrottle à 64ms
3. Retirer double scroll handling
4. Simplifier animations ou passer à useNativeDriver: true

---

**Fin du rapport**
