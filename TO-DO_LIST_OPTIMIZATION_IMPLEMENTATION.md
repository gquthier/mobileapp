# 📋 To-Do List Optimization & Implementation

## 🎯 Vue d'ensemble
Ce document contient une liste détaillée des fonctionnalités à implémenter ou optimiser dans l'application mobile. Chaque entrée inclut des informations précises pour qu'une IA puisse comprendre exactement quoi faire et où aller dans le code.

---

## 🔧 Fonctionnalités à Implémenter/Optimiser

### 1. 🔄 Revoir le process d'accélération dans la vue librairie

**Statut :** ⏳ En attente  
**Priorité :** Moyenne  
**Complexité :** Faible à Moyenne  

**Description :**
Optimiser le système d'accélération (speed control) dans la vue librairie pour s'assurer qu'il fonctionne de manière cohérente avec l'implémentation du VideoPlayer modal.

**Contexte :**
- Le speed control fonctionne parfaitement dans le VideoPlayer modal
- Nécessité de vérifier et optimiser le comportement dans la vue librairie
- Assurer une cohérence d'expérience utilisateur entre les deux vues

**Fichiers concernés :**
- `src/screens/LibraryScreen.tsx` - Écran principal de la librairie
- `src/features/vertical-feed/components/VerticalVideoCard.tsx` - Composant vidéo de la librairie
- `src/components/VideoPlayer.tsx` - Player modal (référence pour l'implémentation)

**Actions à effectuer :**
1. Tester le speed control dans la vue librairie
2. Vérifier la cohérence des timings (0.3s tap, 0.5s long press)
3. S'assurer que la logique de détection tap vs long press fonctionne
4. Vérifier l'animation du badge "1.6x"
5. Tester la transition entre librairie et modal
6. Optimiser si nécessaire

**Critères de validation :**
- [ ] Tap simple (< 0.3s) : play/pause fonctionne
- [ ] Long press (≥ 0.5s) sur partie droite : speed 1.6x activé
- [ ] Badge "1.6x" apparaît et disparaît correctement
- [ ] Pas de conflit entre tap et long press
- [ ] Feedback haptique présent pour les taps simples
- [ ] Comportement identique entre librairie et modal

### 2. 🔄 Système de swipe horizontal pour navigation entre vidéos

**Statut :** ⏳ En attente  
**Priorité :** Haute  
**Complexité :** Élevée  

**Description :**
Implémenter un système de swipe horizontal (gauche/droite) dans le VideoPlayer modal pour permettre à l'utilisateur de naviguer entre les vidéos dans l'ordre exact de la vue d'origine.

**Contexte :**
L'utilisateur doit pouvoir swiper entre les vidéos dans le même ordre que celui de la vue d'où il vient :
- **Vue Librairie** : Ordre chronologique des vidéos
- **Vue Recherche** : Ordre des résultats de recherche (ex: filtres "Gross")
- **Vue Chapitres** : Ordre des vidéos du chapitre
- **Vue Highlights** : Ordre des vidéos avec highlights

**Fichiers concernés :**
- `src/components/VideoPlayer.tsx` - Composant principal à modifier
- `src/screens/LibraryScreen.tsx` - Passage de la liste de vidéos
- `src/screens/HomeScreen.tsx` - Passage de la liste de vidéos des chapitres
- `src/features/search/` - Composants de recherche (à identifier)

**Actions à effectuer :**

1. **Analyse de l'état actuel :**
   - Examiner comment `VideoPlayer` reçoit actuellement les vidéos
   - Identifier les props existantes (`videos`, `initialIndex`)
   - Comprendre la logique de navigation actuelle

2. **Implémentation du swipe horizontal :**
   - Ajouter `PanGestureHandler` ou `ScrollView` horizontal
   - Gérer les gestes swipe gauche/droite
   - Mettre à jour l'index de la vidéo courante
   - Synchroniser avec le player vidéo

3. **Gestion des transitions :**
   - Animation fluide entre les vidéos
   - Préchargement des vidéos adjacentes
   - Gestion des états de loading/error

4. **Intégration avec les vues sources :**
   - Modifier `LibraryScreen` pour passer la liste complète
   - Modifier `HomeScreen` pour passer les vidéos du chapitre
   - Modifier les composants de recherche pour passer les résultats
   - Calculer l'index initial basé sur la vidéo sélectionnée

5. **Optimisations :**
   - Mise en cache des vidéos adjacentes
   - Gestion mémoire pour les longues listes
   - Indicateurs visuels de navigation (dots, progress)

**Spécifications techniques :**

- **Geste** : Swipe horizontal gauche/droite
- **Animation** : Transition fluide avec momentum
- **Préchargement** : Vidéos N-1, N, N+1 en mémoire
- **Limites** : Gestion des bords (première/dernière vidéo)
- **Performance** : Lazy loading pour les listes longues

**Critères de validation :**
- [ ] Swipe gauche/droite navigue entre les vidéos
- [ ] L'ordre respecte exactement celui de la vue source
- [ ] Transition fluide sans lag
- [ ] Préchargement des vidéos adjacentes
- [ ] Gestion des bords (pas de swipe au-delà)
- [ ] Fonctionne depuis la vue Librairie
- [ ] Fonctionne depuis la vue Recherche
- [ ] Fonctionne depuis la vue Chapitres
- [ ] Fonctionne depuis la vue Highlights
- [ ] Indicateur de position (optionnel)
- [ ] Gestion mémoire optimisée

**Exemples d'usage :**
- Librairie : Swipe entre vidéos du 15 oct → 16 oct → 17 oct
- Recherche "Gross" : Swipe entre les 5 vidéos trouvées
- Chapitre "Vacances" : Swipe entre les 12 vidéos du chapitre

---

## 📝 Notes d'implémentation

### Format des entrées
Chaque entrée doit inclure :
- **Statut** : En attente, En cours, Terminé, Annulé
- **Priorité** : Critique, Haute, Moyenne, Faible
- **Complexité** : Très faible, Faible, Moyenne, Élevée, Très élevée
- **Description** : Explication claire de ce qui doit être fait
- **Contexte** : Pourquoi cette fonctionnalité est nécessaire
- **Fichiers concernés** : Liste des fichiers à modifier
- **Actions à effectuer** : Liste détaillée des étapes
- **Critères de validation** : Checklist pour valider l'implémentation

### Mise à jour
Ce document doit être mis à jour à chaque nouvelle demande de fonctionnalité ou optimisation.

---

**Dernière mise à jour :** [Date actuelle]  
**Version :** 1.0
