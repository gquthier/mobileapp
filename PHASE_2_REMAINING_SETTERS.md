# 🔄 Phase 2.2 - Remaining Setter Replacements

**Total setters à remplacer:** ~80
**Complété:** 3/84 (START_RECORDING, PAUSE/RESUME, INCREMENT_TIMER)
**Restant:** 81

---

## 📋 Patterns de Remplacement

### Recording Actions
```typescript
// ❌ OLD
setIsPaused(false);
setIsRecording(false);
setIsPaused(false);
setRecordingTime(0);

// ✅ NEW
dispatch({ type: 'RESUME_RECORDING' });
dispatch({ type: 'STOP_RECORDING' }); // Fait automatiquement les 3
```

### Camera Actions
```typescript
// ❌ OLD
setCameraKey(prev => prev + 1);
setShowControls(false);
setShowControls(true);
setOrientation(newOrientation);
setFlashEnabled(!flashEnabled);

// ✅ NEW
dispatch({ type: 'REMOUNT_CAMERA' });
dispatch({ type: 'TOGGLE_CONTROLS', payload: false });
dispatch({ type: 'TOGGLE_CONTROLS', payload: true });
dispatch({ type: 'SET_ORIENTATION', payload: newOrientation });
dispatch({ type: 'TOGGLE_FLASH' });
```

### Questions Actions
```typescript
// ❌ OLD
setShowQuestions(true);
setShowQuestions(false);
setCurrentQuestion(question);
setCacheIndex(prev => prev + 1);
setQuestionsCache(questions);
setIsLoadingCache(true);
setFallbackToStatic(true);

// ✅ NEW
dispatch({ type: 'SHOW_QUESTIONS' });
dispatch({ type: 'HIDE_QUESTIONS' });
dispatch({ type: 'SET_QUESTION', payload: question });
dispatch({ type: 'NEXT_QUESTION' });
dispatch({ type: 'SET_QUESTIONS_CACHE', payload: questions });
dispatch({ type: 'SET_LOADING_CACHE', payload: true });
dispatch({ type: 'ENABLE_FALLBACK' });
```

### Drag Actions
```typescript
// ❌ OLD
setIsDragging(true);
setDragFingerPosition({ x, y });
setDragCurrentZone('delete');
setIsDragging(false);
setDragFingerPosition({ x: 0, y: 0 });
setDragCurrentZone(null);

// ✅ NEW
dispatch({ type: 'START_DRAG', payload: { x, y } });
dispatch({ type: 'UPDATE_DRAG', payload: { x, y, zone: 'delete' } });
dispatch({ type: 'END_DRAG' });
```

### Long Press Actions
```typescript
// ❌ OLD
setIsLongPressing(true);
setLongPressPosition({ x, y });
setIsLongPressing(false);

// ✅ NEW
dispatch({ type: 'START_LONG_PRESS', payload: { x, y } });
dispatch({ type: 'END_LONG_PRESS' });
```

### Post-Recording Actions
```typescript
// ❌ OLD
setShowValidationModal(true);
setPendingVideoUri(uri);
setShowValidationModal(false);
setShowRecordingControls(true);
setShowRecordingControls(false);

// ✅ NEW
dispatch({ type: 'SHOW_VALIDATION', payload: uri });
dispatch({ type: 'HIDE_VALIDATION' });
dispatch({ type: 'SHOW_RECORDING_CONTROLS' });
dispatch({ type: 'HIDE_RECORDING_CONTROLS' });
```

---

## 🔍 Occurrences à Remplacer (par numéro de ligne)

### setShowControls (8 occurrences)
- [ ] Ligne ~xxx: Start recording context
- [ ] Ligne ~xxx: Stop recording context
- [ ] Etc.

### setShowQuestions (6 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setFlashEnabled (4 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setCameraKey (3 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setCurrentQuestion (12 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setQuestionsCache (4 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setCacheIndex (3 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setIsLoadingCache (6 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setFallbackToStatic (2 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setIsDragging (4 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setDragFingerPosition (4 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setDragCurrentZone (4 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setIsLongPressing (3 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setLongPressPosition (3 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setShowValidationModal (4 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setPendingVideoUri (4 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

### setShowRecordingControls (4 occurrences)
- [ ] Ligne ~xxx
- [ ] Etc.

---

## 📊 Progression

- [x] RecordingState interface
- [x] RecordingAction union type
- [x] recordingReducer function
- [x] useReducer setup
- [ ] **Remplacer tous les setters (EN COURS)**
- [ ] Tests complets
- [ ] Commit final

**Dernière mise à jour:** 2025-10-23 (Architecture complète)
