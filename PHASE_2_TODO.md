# 📋 PHASE 2 - TODO LIST & PROGRESS TRACKER

**Date de début:** 23 octobre 2025
**Objectif:** Optimisations importantes pour +15-20% performance globale
**Approche:** Code scalable, maintenable, senior iOS React Native engineer standards

---

## ✅ OPTIMISATION #1 - CalendarGallery Backend (COMPLÉTÉ)

### Tâches Complétées

- [x] **1.1** Créer migration SQL `010_calendar_materialized_view.sql`
  - Materialized view `user_calendar_data`
  - Indexes pour performance (user_id, year/month, day)
  - Trigger auto-refresh sur INSERT/UPDATE/DELETE videos
  - ✅ Migration appliquée sur Supabase

- [x] **1.2** Créer Edge Function `get-calendar-data`
  - Query materialized view avec auth user
  - Support CORS
  - Gestion erreurs + fallback gracieux
  - ⚠️ **À DÉPLOYER:** `supabase functions deploy get-calendar-data`

- [x] **1.3** Modifier CalendarGallerySimple.tsx
  - Fetch backend data au mount (useEffect)
  - Transform backend data → MonthData[] format
  - Backend-first approach avec console.log

- [x] **1.4** Ajouter fallback client-side
  - Si backend échoue → calcul JavaScript (code existant)
  - Graceful degradation (aucun impact UX)
  - Error logging pour debugging

- [x] **1.5** Backup & Commit
  - Backup: `CalendarGallerySimple.tsx.BACKUP-phase2-before-backend-2025-10-23`
  - Commit: `6d78134` - "Phase 2.1: CalendarGallery Backend Optimization"

### Gains Attendus
- **-80% load time** (500ms → 100ms)
- **-95% re-renders** (calcul 1× au mount)
- **SQL processing** au lieu de JavaScript O(n×m)

---

## 🚧 OPTIMISATION #2 - RecordScreen useReducer (EN COURS)

### Tâches à Effectuer

- [ ] **2.1** Définir RecordingState TypeScript interface
  - Regrouper 18 états existants en 1 seul objet
  - Types stricts pour chaque propriété
  - Documentation inline pour chaque field

- [ ] **2.2** Définir RecordingAction union type
  - Actions: START_RECORDING, PAUSE, RESUME, STOP, RESET
  - Actions: UPDATE_TIMER, TOGGLE_FLASH, SET_ORIENTATION
  - Actions: SHOW_QUESTIONS, SET_QUESTION, TOGGLE_DRAGGING
  - Actions: SHOW_VALIDATION, SET_PENDING_VIDEO
  - Payloads typés pour chaque action

- [ ] **2.3** Créer recordingReducer function
  - Switch/case pour chaque action type
  - Immutable state updates (spread operator)
  - Validation des transitions d'état
  - Error handling pour états invalides

- [ ] **2.4** Remplacer useState par useReducer
  - Supprimer 18 useState individuels
  - Implémenter `const [state, dispatch] = useReducer(...)`
  - Définir initialState avec valeurs par défaut

- [ ] **2.5** Mettre à jour tous les setters
  - Remplacer `setIsRecording(true)` → `dispatch({ type: 'START_RECORDING' })`
  - Remplacer `setRecordingTime(t => t + 1)` → `dispatch({ type: 'UPDATE_TIMER' })`
  - Chercher tous les `set*` dans le fichier (18 occurrences)
  - Vérifier logique conditionnelle (if/else → actions)

- [ ] **2.6** Tests complets
  - Test: Enregistrement (start → timer increment → stop)
  - Test: Pause/Resume
  - Test: Flash toggle
  - Test: Questions overlay (show/hide/drag)
  - Test: Validation modal (save/delete/retry)
  - Test: Orientation changes
  - Test: Long press detection
  - Vérifier aucun changement fonctionnel

- [ ] **2.7** Backup & Commit
  - Backup: `RecordScreen.tsx.BACKUP-phase2-before-reducer-2025-10-23`
  - Commit message descriptif avec gains

### Gains Attendus
- **-60% re-renders** (1 state vs 18)
- **Meilleur debugging** (Redux DevTools compatible)
- **Code plus maintenable** (actions centralisées)
- **Moins de bugs** (transitions d'état validées)

---

## ⚠️ PROBLÉMATIQUES RENCONTRÉES

### Optimisation #1 - CalendarGallery

**Aucune problématique majeure** ✅

**Notes:**
- TypeScript errors existants (node_modules conflicts) - non liés à nos changes
- Materialized view nécessite refresh trigger → implémenté ✅
- Edge Function doit utiliser service role key pour bypass RLS → implémenté ✅

---

## 📝 NOTES & OPTIMISATIONS FUTURES

### Optimisation #1 - CalendarGallery

**Skips / À faire plus tard:**

1. **Blurhash pour thumbnails** (Phase 3+)
   - Ajouter colonne `thumbnail_blurhash` à videos table
   - Générer blurhash lors de l'upload
   - Afficher blurhash pendant chargement image
   - Gain: Preview instantané (-200ms perceived load)

2. **Incremental refresh de materialized view** (Phase 3+)
   - Actuellement: Full refresh sur chaque INSERT/UPDATE/DELETE
   - Optimisation: Incremental refresh (update seulement rows affectées)
   - Complexité: Nécessite custom trigger function
   - Gain: -95% refresh time pour 1 video upload

3. **Cron job backup pour refresh** (Production)
   - Actuellement: Refresh sur trigger seulement
   - Ajouter: Cron job toutes les heures (safety net)
   - Use case: Si trigger échoue, cron rattrape
   - Implémentation: `SELECT cron.schedule(...)`

4. **Cache Edge Function response** (Phase 3+)
   - Cache calendar data côté client (AsyncStorage)
   - TTL: 5 minutes
   - Invalidate: Sur pull-to-refresh
   - Gain: -100ms sur réouverture LibraryScreen

### Optimisation #2 - RecordScreen

**Best Practices à suivre:**

1. **Reducer Testing**
   - Créer `recordingReducer.test.ts` (Phase 3+)
   - Unit tests pour chaque action
   - Test invalid state transitions
   - Test edge cases (pause sans recording actif, etc.)

2. **Action Creators** (Optionnel - Phase 3+)
   - Créer helper functions pour dispatch
   - `startRecording()` au lieu de `dispatch({ type: 'START_RECORDING' })`
   - Plus lisible, moins de typos
   - Type-safe avec TypeScript

3. **Middleware pour logging** (Debug - Phase 3+)
   - Logger chaque action dispatched
   - Logger state before/after
   - Utile pour debugging production issues
   - Désactivable en production

4. **Persist state** (Phase 3+)
   - Sauvegarder state dans AsyncStorage
   - Restaurer sur crash/reload
   - Use case: Ne pas perdre recording en cours
   - Attention: Nettoyer state après save vidéo

---

## 🎯 DÉPLOIEMENT FINAL

### À faire avant de considérer Phase 2 complète:

- [ ] Déployer Edge Function: `supabase functions deploy get-calendar-data`
- [ ] Tester backend endpoint en production
- [ ] Vérifier materialized view se refresh correctement
- [ ] Vérifier fallback fonctionne si backend down
- [ ] Tests manuels RecordScreen (tous les flows)
- [ ] Run `npx tsc --noEmit` - vérifier 0 nouveaux errors
- [ ] Commit final avec résumé Phase 2 complète
- [ ] Tag Git: `v1.2.0-phase2-complete`

---

## 📊 GAINS CUMULÉS PHASE 2 (Estimation)

| Métrique | Avant | Après Phase 2.1 | Après Phase 2.2 | Total |
|----------|-------|-----------------|-----------------|-------|
| **CalendarGallery load** | 500ms | **100ms** | 100ms | **-80%** |
| **RecordScreen re-renders** | ~50/session | ~50/session | **~20/session** | **-60%** |
| **Code maintenabilité** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **+40%** |

**Impact global:** +15-20% performance, code plus maintenable, moins de bugs

---

**Dernière mise à jour:** 2025-10-23 (Optimisation #1 complète, #2 à faire)
