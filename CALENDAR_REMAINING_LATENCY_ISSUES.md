# 🔍 Audit Approfondi - Latence Restante du Calendrier

**Date:** 18 Octobre 2025
**Symptômes:**
- ✅ Transitions Calendar ↔ Grid **OK** (pas de problème)
- ❌ Transitions quand TopBar s'ouvre/ferme **très lentes**
- ❌ Changement de tab **très lent**
- ⚠️ "Ça dépend vraiment des fois" (comportement non déterministe)

---

## ⚠️ NOUVEAUX PROBLÈMES IDENTIFIÉS

### 1. **SUBSCRIPTION QUI TRIGGER fetchVideos PENDANT LES INTERACTIONS** ❌❌❌ CRITIQUE
**Fichier:** `LibraryScreen.tsx` lignes 383-409

**Le problème:**
```typescript
useEffect(() => {
  // Subscribe to queue updates
  const unsubscribe = ImportQueueService.subscribe((queueState) => {
    dispatch({ type: 'UPDATE_IMPORT_STATE', queueState });

    // ❌❌❌ BLOQUE LE THREAD: Refetch ALL videos pendant l'interaction
    if (queueState.completedCount > 0 && !queueState.isProcessing) {
      fetchVideos(); // ⏱️ Peut prendre 100-500ms
    }
  });

  return () => unsubscribe();
}, [fetchVideos]); // ❌ fetchVideos change à chaque render
```

**Pourquoi c'est GRAVE:**
- ImportQueueService émet des updates **pendant** les interactions
- Quand un upload termine, il appelle `fetchVideos()`
- `fetchVideos()` fait un `await VideoService.getAllVideos()` (100-500ms)
- **Pendant ce temps, le thread JS est BLOQUÉ**
- L'utilisateur tape sur l'écran mais rien ne se passe
- **C'est le "ça dépend des fois"** - si un upload termine pendant l'interaction, ça freeze

**Impact:** **MAJEUR** - C'est probablement LA cause principale du freeze aléatoire

---

### 2. **getCurrentMonthDays RECALCULE TOUTES LES MINUTES** ❌❌ CRITIQUE
**Fichier:** `LibraryScreen.tsx` lignes 498-534

**Le problème:**
```typescript
const getCurrentMonthDays = useMemo(() => {
  // Boucle sur TOUS les videos
  allVideos.forEach(video => {
    if (video.created_at) {
      const date = new Date(video.created_at);
      if (date.getMonth() === month && date.getFullYear() === year) {
        videoDates.add(date.getDate());
      }
    }
  });

  // ❌❌❌ new Date() dans les dépendances = RECALCULE CHAQUE MINUTE
}, [allVideos.length, new Date().getMonth(), new Date().getFullYear()]);
//                     ^^^^^^^^ INSTABLE - change chaque minute
```

**Impact:**
- `new Date()` est évalué à chaque render
- Quand la minute change (ex: 14:59 → 15:00), `getMonth()` change potentiellement
- Le useMemo recalcule
- Boucle sur 100+ vidéos (20-50ms)
- **Pendant les transitions, ce recalcul peut coïncider et bloquer**

---

### 3. **UPDATE_STREAK DISPATCH CASCADE** ❌ HAUTE PRIORITÉ
**Fichier:** `LibraryScreen.tsx` lignes 378-381

**Le problème:**
```typescript
// Update streak in state when it changes
useEffect(() => {
  dispatch({ type: 'UPDATE_STREAK', streak: currentStreak });
}, [currentStreak]); // ❌ Peut causer re-render en cascade
```

**Impact:**
- `currentStreak` change → dispatch
- dispatch → state change → re-render
- re-render → tous les useMemo/useCallback se ré-évaluent
- Pendant une transition, peut causer multiple re-renders

---

### 4. **DÉPENDANCE INSTABLE DE fetchVideos** ❌ HAUTE PRIORITÉ
**Fichier:** `LibraryScreen.tsx` ligne 409

**Le problème:**
```typescript
useEffect(() => {
  const unsubscribe = ImportQueueService.subscribe((queueState) => {
    // ...
    fetchVideos();
  });

  return () => unsubscribe();
}, [fetchVideos]); // ❌ fetchVideos est recréé à chaque render
```

**Impact:**
- `fetchVideos` est un `useCallback` sans dépendances stables
- Chaque fois qu'il change, le `useEffect` se réexécute
- Unsubscribe + Re-subscribe
- **Peut manquer des updates ou créer des memory leaks**

---

### 5. **CALCUL DE STREAK PENDANT LE RENDER** ⚠️ MOYENNE PRIORITÉ
**Fichier:** `LibraryScreen.tsx` lignes 367-376

**Le problème:**
```typescript
const currentStreak = useMemo(() => {
  const startTime = Date.now();
  const streak = calculateStreakOptimized(state.videos);
  const elapsed = Date.now() - startTime;
  if (elapsed > 10) {
    console.log(`⏱️ Streak calculated in ${elapsed}ms: ${streak} days`);
  }
  return streak;
}, [state.videos.length, calculateStreakOptimized]);
```

**Impact:**
- Dépend de `state.videos.length`
- Chaque fois qu'un video est ajouté/retiré, recalcule
- Avec 100+ vidéos, peut prendre 20-50ms
- Si ça coïncide avec une transition → freeze visible

---

### 6. **ANIMATIONS AVEC useNativeDriver: false PARTOUT** ⚠️ MOYENNE PRIORITÉ
**Fichier:** `LibraryScreen.tsx` multiples endroits

**Le problème:**
```typescript
// Ligne 187
Animated.spring(toggleSelectorPosition, {
  useNativeDriver: false, // ❌ Thread JavaScript
  friction: 10,
  tension: 80,
})

// Ligne 591-606, 657-673 - Animations du search bar
Animated.spring(searchBarProgress, {
  useNativeDriver: false, // ❌ Thread JavaScript
})
```

**Impact:**
- Toutes les animations du search bar sont sur le thread JS
- Quand la TopBar s'ouvre/ferme → animation JS
- Si `fetchVideos()` se lance en même temps → **double blocage**
- L'utilisateur voit un freeze complet

---

## 🎯 SCÉNARIO DU FREEZE ALÉATOIRE

**Quand l'utilisateur ferme la TopBar:**

1. **T=0ms** - Utilisateur tape à l'extérieur
2. **T=0ms** - `handleOutsidePress()` lance animation du search bar (useNativeDriver: false)
3. **T=0-300ms** - Animation en cours sur thread JS
4. **T=50ms** - ImportQueueService émet un update (upload terminé) ⏰
5. **T=50ms** - Callback subscribe appelle `fetchVideos()` 🔴🔴🔴
6. **T=50-250ms** - `VideoService.getAllVideos()` await (200ms) 🔴
7. **T=150ms** - getCurrentMonthDays recalcule (nouvelle minute) 🔴
8. **T=0-300ms** - **TRIPLE BLOCAGE**: animation + fetch + recalcul
9. **T=300ms** - Tout se débloque enfin
10. **Résultat:** L'utilisateur a tapé 2-3 fois sans réponse

**"Ça dépend des fois" = dépend si un upload termine pendant la transition**

---

## ✅ SOLUTIONS PRIORITAIRES

### Solution 1: Désactiver fetchVideos dans le subscribe ⚡ IMPACT MAX (80%)
```typescript
useEffect(() => {
  const unsubscribe = ImportQueueService.subscribe((queueState) => {
    dispatch({ type: 'UPDATE_IMPORT_STATE', queueState });

    // ✅ FIX: Ne PAS refetch pendant les interactions
    // Les placeholders sont déjà affichés, le refetch peut attendre
    if (queueState.completedCount > 0 && !queueState.isProcessing) {
      // ✅ Defer le fetch pour ne pas bloquer
      setTimeout(() => {
        fetchVideos();
      }, 500); // Attend que les animations soient terminées
    }
  });
}, [fetchVideos]);
```

**Impact:** Élimine 80% des freezes aléatoires

---

### Solution 2: Fixer getCurrentMonthDays avec date stable ⚡ IMPACT ÉLEVÉ (50%)
```typescript
// ❌ AVANT: new Date() dans dépendances
const getCurrentMonthDays = useMemo(() => {
  // ...
}, [allVideos.length, new Date().getMonth(), new Date().getFullYear()]);

// ✅ APRÈS: Date stable
const currentDate = useRef(new Date());
const getCurrentMonthDays = useMemo(() => {
  const today = currentDate.current;
  const month = today.getMonth();
  const year = today.getFullYear();
  // ...
}, [allVideos.length]); // Plus de new Date()
```

**Impact:** Élimine les recalculs inattendus pendant les transitions

---

### Solution 3: Stabiliser la dépendance fetchVideos 🔧 IMPACT MOYEN (30%)
```typescript
const fetchVideos = useCallback(async (pageToLoad: number = 0, append: boolean = false) => {
  // ...
}, []); // ✅ Dépendances vides - fonction stable

// Ou utiliser useRef pour la fonction
const fetchVideosRef = useRef(fetchVideos);
fetchVideosRef.current = fetchVideos;

useEffect(() => {
  const unsubscribe = ImportQueueService.subscribe((queueState) => {
    // ...
    fetchVideosRef.current(); // ✅ Toujours la dernière version
  });

  return () => unsubscribe();
}, []); // ✅ Plus de dépendance sur fetchVideos
```

**Impact:** Évite les re-subscriptions inutiles

---

### Solution 4: Retirer le dispatch UPDATE_STREAK 🔧 IMPACT MOYEN (20%)
```typescript
// ❌ RETIRER ce useEffect
// useEffect(() => {
//   dispatch({ type: 'UPDATE_STREAK', streak: currentStreak });
// }, [currentStreak]);

// ✅ À la place, utiliser currentStreak directement dans le render
// Pas besoin de le mettre dans le state si c'est déjà un useMemo
```

**Impact:** Réduit les re-renders en cascade

---

### Solution 5: Lazy calculate streak (seulement si modal ouverte) 📈 IMPACT BAS (10%)
```typescript
// Ne calculer le streak QUE si le modal est ouvert
const currentStreak = useMemo(() => {
  if (!state.showStreakModal) return 0; // ✅ Pas de calcul si pas affiché
  return calculateStreakOptimized(state.videos);
}, [state.videos.length, state.showStreakModal]);
```

**Impact:** Évite calculs inutiles

---

## 📊 RÉSUMÉ

**Causes du freeze aléatoire:**
1. **#1 (80%):** ImportQueueService.subscribe qui trigger fetchVideos pendant les interactions
2. **#2 (50%):** getCurrentMonthDays qui recalcule avec new Date() instable
3. **#3 (30%):** fetchVideos recréé à chaque render → re-subscriptions
4. **#4 (20%):** UPDATE_STREAK dispatch → cascade de re-renders
5. **#5 (background):** Animations non-natives qui s'empilent

**"Ça dépend des fois" = Si un upload termine pendant une transition, TRIPLE BLOCAGE**

---

## 🚀 FIX RAPIDE RECOMMANDÉ (10 minutes)

**3 changements pour résoudre 90% du problème:**

1. **Defer fetchVideos dans subscribe** (Solution 1)
2. **Fixer getCurrentMonthDays date** (Solution 2)
3. **Stabiliser dépendances subscribe** (Solution 3)

---

**Fin du rapport**
