# 📋 Plan Complet d'Onboarding - Personal Life Recorder

## 🎯 Contexte de l'Application

**Personal Life Recorder** est une application de journaling vidéo qui permet aux utilisateurs de:
- Enregistrer des réflexions vidéo quotidiennes
- Organiser leur vie par **Chapitres** (périodes significatives)
- Bénéficier de **transcription AI automatique**
- Recevoir des **questions personnalisées** pour guider leurs réflexions
- Consulter leurs vidéos en mode **Calendrier**, **Galerie** ou **Vertical Feed**
- Explorer des **highlights** générés automatiquement

**Stack technique:**
- React Native + Expo
- Design System: **Liquid Glass** (glassmorphism)
- Backend: Supabase
- AI: OpenAI GPT-4.1 Nano, AssemblyAI
- Animations: react-native-reanimated

---

## 🔍 Analyse du Problème Actuel

### ❌ Parcours actuel (4 étapes)
```
AuthScreen → WelcomeFlow → OnboardingScreens → LifeAreasSelectionScreen → App vide
```

**Problèmes identifiés:**
1. ❌ **App complètement vide** après l'onboarding
2. ❌ **Aucune vidéo** à consulter
3. ❌ **Pas de chapitre** créé
4. ❌ **Design "moche"** selon l'utilisateur
5. ❌ **Manque de gamification** et d'engagement
6. ❌ **Friction élevée** - l'utilisateur doit tout créer manuellement
7. ❌ **Pas d'indication** sur comment utiliser l'app

### ✅ Vision cible
**Un utilisateur qui termine l'onboarding doit avoir:**
- ✅ Au moins 1 chapitre créé (ou en cours de création)
- ✅ Plusieurs vidéos importées (5-10 minimum)
- ✅ Un parcours guidé et engageant
- ✅ Des états vides avec indications pédagogiques
- ✅ Une expérience gamifiée et satisfaisante

---

## 🎨 Nouveau Parcours d'Onboarding Proposé

### Phase 1️⃣ : Bienvenue et Authentification
```
AuthScreen → WelcomeFlow (amélioré)-  dans ce Welcome Flow, j'aimerais vraiment que l'on pose la vision de Chapters en utilisant du copywriting et des animations qui permettent à l'utilisateur d'expliquer exactement le concept de l'application.

Faire en sorte que l'utilisateur puisse construire et garder un œil sur les chapitres de sa vie, et à la fois prendre le temps de réfléchir sur son évolution, ses objectifs et ses perspectives, mais aussi de contempler ce qu'il a déjà accompli.

En gros, j'aimerais vraiment qu'il y ait une sorte d'animation qui pose la vision dans un premier temps, où l'utilisateur peut simplement cliquer sur "Next", mais qu'il comprenne l'enjeu de l'application.

Pour ça, j'aimerais vraiment une animation sympa qui correspond exactement au style de l'application en termes du X et du Y. → Nom & Langue
```



### Phase 2️⃣ : Création du Premier Chapitre
```
ChapterCreationFlow (nouveau) → Sélection Life Areas
```

### Phase 3️⃣ : Import de Contenu (PRIORITÉ)
```
VideoImportFlow (nouveau) → Import Photos Library → Sélection 5-10 vidéos
```

### Phase 4️⃣ : Découverte Guidée
```
GuidedTour (nouveau) → Library → Record → Chapters → Feed
```

### Phase 5️⃣ : Premier Enregistrement
```
FirstRecordingPrompt (nouveau) → RecordScreen avec tutoriel.

Ici, il faudrait qu'on ajoute un type de vidéo qui correspond à la première vidéo.

En gros, l'idée est de pousser l'utilisateur à faire un statement en lui disant qu'il doit faire une vidéo pour le lui en mettre son prénom dans 10 ans.

Donc, en gros, il doit lui parler directement à la première personne en disant "si tu vois cette vidéo", et il doit pouvoir dire exactement ce que cette personne en disant.

Faudrait qu'elle soit. En gros, l'objectif est vraiment de lui faire expérimenter ce sentiment de parler à la future version de lui-même.
```

---

## 📱 Plan Détaillé par Écran

### 🟢 **PHASE 1: BIENVENUE (30 secondes)**

#### 1.1 AuthScreen (existant - à améliorer)
**État actuel:** Basique
**Améliorations:**
- [ ] Ajouter animation Liquid Glass sur le logo
- [ ] Hero message: "Your life, one chapter at a time"
- [ ] Animation de fond: vidéos en motion blur (style Apple)
- [ ] Boutons CTA: "Get Started" (gradient brandColor)

#### 1.2 WelcomeFlow (existant - à repenser)
**Nouveau concept: 3 slides maximum**

**Slide 1: "Capture Your Journey"**
- Animation: Téléphone qui enregistre → vidéo qui apparaît dans calendrier
- Texte: "Record your thoughts, build your chapters"
- Icône: 🎥 avec effet particules

**Slide 2: "AI-Powered Insights"**
- Animation: Transcription qui apparaît → highlights qui s'extraient
- Texte: "Automatic transcription & personalized questions"
- Icône: ✨ avec effet glow

**Slide 3: "Relive Your Moments"**
- Animation: Galerie qui défile → vertical feed
- Texte: "Watch, search, and explore your life"
- Icône: 📚 avec effet flip

**Design:**
- Background: Liquid Glass blur
- Progression: Dots + barre de progression (0-33-66-100%)
- Skip button: Toujours visible
- CTA: "Let's Begin" (dernière slide)

#### 1.3 Nom & Langue
**État actuel:** Dans ProfileScreen
**Nouveau:** Modal overlay

```
┌────────────────────────────┐
│   Welcome! What's your     │
│        first name?         │
│                            │
│  ┌──────────────────────┐  │
│  │  [Input: Name]       │  │
│  └──────────────────────┘  │
│                            │
│    Choose your language    │
│  ┌────┬────┬────┬────┐    │
│  │ EN │ FR │ ES │ DE │    │
│  └────┴────┴────┴────┘    │
│                            │
│       [Continue →]         │
└────────────────────────────┘
```

**Design:**
- Liquid Glass card centré
- Animation: slide from bottom
- Validation: Nom minimum 2 caractères
- Haptic feedback sur sélection langue

---

### 🟢 **PHASE 2: PREMIER CHAPITRE (60 secondes)**

#### 2.1 ChapterCreationFlow (NOUVEAU COMPOSANT)

**Concept:** Créer le premier chapitre de manière guidée et engageante

**Étape 1: Introduction**
```
┌────────────────────────────────┐
│       Every great story        │
│      starts with Chapter 1     │
│                                │
│   [Animation: Livre qui        │
│    s'ouvre avec effet pages]   │
│                                │
│   Let's create your first      │
│         chapter together       │
│                                │
│         [Let's Go! →]          │
└────────────────────────────────┘
```

**Étape 2: Titre du Chapitre**
```
┌────────────────────────────────┐
│    What's this chapter about?  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [Input with suggestions] │  │
│  └──────────────────────────┘  │
│                                │
│  💡 Suggestions:               │
│  • New Beginnings              │
│  • Finding Myself              │
│  • Growing Stronger            │
│  • [Custom...]                 │
│                                │
│         [Continue →]           │
└────────────────────────────────┘
```

**Suggestions intelligentes:**
- Basées sur la période (New Year, Summer, etc.)
- Templates communs
- Random inspirational titles

**Étape 3: Période du Chapitre**
```
┌────────────────────────────────┐
│   When did this chapter start? │
│                                │
│  📅 Start Date                 │
│  ┌──────────────────────────┐  │
│  │  [Date Picker]           │  │
│  └──────────────────────────┘  │
│                                │
│  ⏳ Still ongoing?             │
│  ┌──────────────────────────┐  │
│  │  ○ Yes  ○ No             │  │
│  └──────────────────────────┘  │
│                                │
│         [Continue →]           │
└────────────────────────────────┘
```

**Default:** Date du jour, ongoing: Yes

**Étape 4: Couleur du Chapitre**
```
┌────────────────────────────────┐
│    Choose your chapter color   │
│                                │
│  [Grille de couleurs avec      │
│   animation hover]             │
│                                │
│  🎨 This color will represent  │
│     this period of your life   │
│                                │
│  [Preview Card avec la couleur]│
│                                │
│         [Continue →]           │
└────────────────────────────────┘
```

**Design:**
- Utiliser CHAPTER_COLORS du theme
- Preview live de la ChapterCard
- Animation: couleur qui se diffuse dans le preview

**Étape 5: Life Areas (existant - à améliorer)**

**État actuel:** LifeAreasSelectionScreen
**Améliorations:**
- [ ] Meilleur contexte: "What areas of life matter to you?"
- [ ] Icônes plus grandes et animées
- [ ] Multi-sélection avec chips
- [ ] Minimum 3 areas requis
- [ ] Animation: selected items qui "volent" vers le haut

**Étape 6: Célébration** 🎉
```
┌────────────────────────────────┐
│                                │
│        ✨ Amazing! ✨          │
│                                │
│   [Animation: Confetti +       │
│    Chapter card qui apparaît]  │
│                                │
│  Your first chapter is ready!  │
│                                │
│   "New Beginnings"             │
│    Started: Nov 22, 2025       │
│                                │
│  Now let's add some memories → │
└────────────────────────────────┘
```

**Animations:**
- Confetti particles (react-native-confetti-cannon si disponible)
- Chapter card avec scale animation
- Haptic: Success feedback
- Sound effect (optionnel): Success chime

---

### 🟢 **PHASE 3: IMPORT DE VIDÉOS (120 secondes) - PRIORITÉ #1**

#### 3.1 VideoImportFlow (NOUVEAU COMPOSANT)

**Concept:** Permettre à l'utilisateur d'importer 5-10 vidéos existantes de sa galerie

**Étape 1: Introduction à l'import**
```
┌────────────────────────────────┐
│    Let's fill your chapter!    │
│                                │
│  [Animation: Photos qui        │
│   volent vers une timeline]    │
│                                │
│  Import videos from your       │
│  camera roll to start building │
│  your story                    │
│                                │
│  📱 We'll help you select       │
│     5-10 videos                │
│                                │
│    [Open Camera Roll →]        │
│    [Skip for now]              │
└────────────────────────────────┘
```

**Étape 2: Sélection de vidéos**

**UI:** Style iOS Photos multi-select
```
┌────────────────────────────────┐
│  Camera Roll         [5/10] ✓  │
├────────────────────────────────┤
│                                │
│  [Grille 3x∞ de vidéos avec    │
│   thumbnails animés]           │
│                                │
│  ┌───┬───┬───┐                 │
│  │☑1 │☑2 │ 3 │                 │
│  ├───┼───┼───┤                 │
│  │☑4 │ 5 │☑6 │                 │
│  └───┴───┴───┘                 │
│                                │
│  💡 Select 5-10 videos          │
│                                │
│        [Import Selected]       │
└────────────────────────────────┘
```

**Features:**
- Checkbox avec numéro d'ordre (1, 2, 3...)
- Compteur live: X/10 avec progression
- Animation sur sélection: scale + haptic
- Désactiver sélection si > 10
- Filtrer: Vidéos uniquement (pas de photos)
- Trier par: Date (plus récentes en premier)

**Étape 3: Import en cours**
```
┌────────────────────────────────┐
│      Importing your videos     │
│                                │
│  [Video 3/5]                   │
│  ▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱ 80%          │
│                                │
│  [Miniature de la vidéo        │
│   en cours d'import]           │
│                                │
│  ✓ Compression                 │
│  ✓ Thumbnail generation        │
│  ⏳ Upload to cloud...         │
│                                │
│  [LoadingDots animation]       │
└────────────────────────────────┘
```

**Technique:**
- Utiliser ImportQueueService existant
- Progress par vidéo + progress global
- Animations smooth avec Reanimated
- Gestion des erreurs: Retry automatique
- Background processing: Continuer même si l'utilisateur quitte

**Étape 4: Import réussi** 🎉
```
┌────────────────────────────────┐
│                                │
│       ✅ 5 videos added!       │
│                                │
│  [Animation: Grille de         │
│   thumbnails qui apparaissent] │
│                                │
│  [Miniatures 2x3]              │
│  ┌───┬───┐                     │
│  │ 1 │ 2 │                     │
│  ├───┼───┤                     │
│  │ 3 │ 4 │                     │
│  ├───┼───┤                     │
│  │ 5 │   │                     │
│  └───┴───┘                     │
│                                │
│  Your chapter is coming alive! │
│         [Continue →]           │
└────────────────────────────────┘
```

**Fallback si Skip:**
- Montrer message: "No worries! You can add videos anytime"
- Continuer vers la découverte guidée
- Montrer empty states plus tard

---

### 🟢 **PHASE 4: DÉCOUVERTE GUIDÉE (90 secondes)**

#### 4.1 GuidedTour (NOUVEAU COMPOSANT)

**Concept:** Tour interactif des 4 tabs avec tooltips et animations

**Architecture:**
```typescript
interface TourStep {
  tab: 'Library' | 'Feed' | 'Chapters' | 'Record';
  spotlight: { x: number; y: number; radius: number };
  tooltip: {
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  action?: 'tap' | 'swipe' | 'scroll';
  onComplete: () => void;
}
```

**Étape 1: Library Tab**
```
┌────────────────────────────────┐
│  [Spotlight sur Library tab]   │
│                                │
│  ┌──────────────────────────┐  │
│  │  📚 Your Library          │  │
│  │                          │  │
│  │  This is your home.      │  │
│  │  All your videos in      │  │
│  │  calendar & grid view.   │  │
│  │                          │  │
│  │  [Got it! →]             │  │
│  └──────────────────────────┘  │
│                                │
│  [Rest of screen dimmed 50%]   │
└────────────────────────────────┘
```

**Étape 2: Calendar View**
- Spotlight sur le calendrier
- Tooltip: "Videos organized by month & chapter"
- Action: Scroll pour explorer

**Étape 3: Search**
- Spotlight sur la barre de recherche
- Tooltip: "Find videos by title or date"
- Pas d'action (juste info)

**Étape 4: Feed Tab**
- Navigate vers Feed tab
- Spotlight sur le vertical feed
- Tooltip: "Swipe up/down like TikTok to watch videos"
- Action: Swipe pour démontrer

**Étape 5: Chapters Tab**
- Navigate vers Chapters
- Spotlight sur le premier chapitre
- Tooltip: "Your current chapter with progress tracking"
- Action: Tap pour voir détails

**Étape 6: Record Tab**
- Navigate vers Record
- Spotlight sur le bouton Record
- Tooltip: "Ready to record? Tap here anytime!"
- Animation: Pulse sur le bouton

**Design System:**
- Overlay: rgba(0, 0, 0, 0.7)
- Spotlight: Circular cutout avec blur edge
- Tooltip: Liquid Glass card avec arrow
- Navigation: Swipeable avec dots
- Skip: Bouton "Skip Tour" toujours visible

---

### 🟢 **PHASE 5: PREMIER ENREGISTREMENT (optionnel)**

#### 5.1 FirstRecordingPrompt (NOUVEAU COMPOSANT)

FirstRecordingPrompt (nouveau) → RecordScreen avec tutoriel.

Ici, il faudrait qu'on ajoute un type de vidéo qui correspond à la première vidéo.

En gros, l'idée est de pousser l'utilisateur à faire un statement en lui disant qu'il doit faire une vidéo pour le lui en mettre son prénom dans 10 ans.

Donc, en gros, il doit lui parler directement à la première personne en disant "si tu vois cette vidéo", et il doit pouvoir dire exactement ce que cette personne en disant.

Faudrait qu'elle soit. En gros, l'objectif est vraiment de lui faire expérimenter ce sentiment de parler à la future version de lui-même.

**Déclenchement:**
- Après le tour OU
- Quand l'utilisateur revient sur Library tab

**Modal Bottom Sheet:**
```
┌────────────────────────────────┐
│                                │
│  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀ (drag handle)  │
│                                │
│   🎬 Ready to record your      │
│       first video?             │
│                                │
│  [Animation: Téléphone qui     │
│   enregistre avec effet glow]  │
│                                │
│  We'll guide you through it:   │
│  ✓ Personalized question       │
│  ✓ Easy recording interface    │
│  ✓ Automatic transcription     │
│                                │
│    [Let's Record! →]           │
│    [Maybe later]               │
└────────────────────────────────┘
```

**Si "Let's Record!":**
- Navigate vers RecordScreen
- Montrer mini-tutorial overlay
- First recording badge (gamification)

**Si "Maybe later":**
- Dismiss modal
- Ne plus montrer (AsyncStorage flag)
- Montrer empty states si pas de vidéos

---

## 🎨 Design System & Gamification

### **Liquid Glass Theme**

Tous les nouveaux composants doivent utiliser:

```typescript
// Onboarding-specific colors
const OnboardingTheme = {
  gradient: {
    primary: [brandColor + '00', brandColor + 'FF'],
    success: ['#4CAF5000', '#4CAF50FF'],
    celebration: ['#FF6B6B00', '#4ECDC4FF', '#45B7D1FF'],
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
    blur: 20,
  },
  animations: {
    springConfig: { damping: 15, stiffness: 150 },
    timing: { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) },
  },
};
```

### **Animations Signature**

#### 1. Slide Transitions
```typescript
// Pour WelcomeFlow, ChapterCreationFlow
const slideAnimation = {
  enter: {
    from: { translateX: Dimensions.get('window').width, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
  },
  exit: {
    from: { translateX: 0, opacity: 1 },
    to: { translateX: -Dimensions.get('window').width, opacity: 0 },
  },
};
```

#### 2. Scale Pop
```typescript
// Pour célébrations, succès
const scalePopAnimation = {
  from: { scale: 0.8, opacity: 0 },
  to: { scale: 1, opacity: 1 },
  spring: { damping: 12, stiffness: 200 },
};
```

#### 3. Confetti
```typescript
// Pour fin de phase
const confettiColors = [brandColor, '#4CAF50', '#FF6B6B', '#FFC107'];
const confettiCount = 50;
```

#### 4. Shimmer Loading
```typescript
// Pour import de vidéos
const shimmerAnimation = {
  gradient: ['#E0E0E0', '#F5F5F5', '#E0E0E0'],
  duration: 1500,
  loop: true,
};
```

### **Gamification Elements**

#### Badges & Achievements
```typescript
interface Achievement {
  id: string;
  title: string;
  icon: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

const OnboardingAchievements: Achievement[] = [
  {
    id: 'first_chapter',
    title: 'Chapter One',
    icon: '📖',
    description: 'Created your first chapter',
  },
  {
    id: 'first_import',
    title: 'Memory Keeper',
    icon: '🎬',
    description: 'Imported 5+ videos',
  },
  {
    id: 'first_recording',
    title: 'Storyteller',
    icon: '🎤',
    description: 'Recorded your first video',
  },
  {
    id: 'tour_complete',
    title: 'Explorer',
    icon: '🗺️',
    description: 'Completed the guided tour',
  },
];
```

#### Progress Tracking
```typescript
interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedPhases: string[];
  achievements: string[];
  createdAt: Date;
}
```

#### Célébrations Micro
- ✅ Haptic feedback sur chaque action
- ✅ Sound effects (optionnel, désactivable)
- ✅ Particle effects sur succès
- ✅ Progress bar avec milestones
- ✅ Encouraging messages ("Great!", "Almost there!", "Perfect!")

---

## 📄 États Vides (Empty States)

### **Library Screen - Empty State**
```typescript
<EmptyState
  icon={<Icon name="calendar" size={80} color={brandColor + '40'} />}
  title="Your library is empty"
  description="Start by recording your first video or importing from your camera roll"
  actions={[
    {
      label: 'Import Videos',
      icon: 'upload',
      onPress: () => navigate('VideoImport'),
      variant: 'primary',
    },
    {
      label: 'Record Now',
      icon: 'video',
      onPress: () => navigate('Record'),
      variant: 'secondary',
    },
  ]}
/>
```

**Design:**
- Centré verticalement
- Icône avec animation subtle (pulse)
- Texte avec espacement généreux
- 2 boutons CTA (primary + secondary)
- Liquid Glass cards pour les boutons

### **Chapters Screen - Empty State**
```typescript
<EmptyState
  icon={<Icon name="book" size={80} color={brandColor + '40'} />}
  title="No chapters yet"
  description="Create your first chapter to organize your journey"
  actions={[
    {
      label: 'Create Chapter',
      icon: 'plus',
      onPress: () => navigate('ChapterSetup'),
      variant: 'primary',
    },
  ]}
  helpText="💡 Chapters help you organize different periods of your life"
/>
```

### **Feed Screen - Empty State**
```typescript
<EmptyState
  icon={<Icon name="film" size={80} color={brandColor + '40'} />}
  title="Nothing to watch yet"
  description="Record or import videos to start your feed"
  actions={[
    {
      label: 'Get Started',
      icon: 'play',
      onPress: () => navigate('Record'),
      variant: 'primary',
    },
  ]}
/>
```

### **Search - No Results**
```typescript
<EmptyState
  icon={<Icon name="search" size={60} color={brandColor + '40'} />}
  title="No videos found"
  description={`No results for "${searchQuery}"`}
  helpText="Try a different search term or date"
  compact={true}
/>
```

---

## 🎯 TODO List Prioritisée

### 🔴 **PRIORITÉ 1 - CORE FUNCTIONALITY (Semaine 1)**

#### Phase 3: Import de Vidéos (CRITIQUE)
- [ ] **3.1** Créer `VideoImportFlow.tsx` composant
- [ ] **3.2** Implémenter sélection multi-vidéos depuis Camera Roll
- [ ] **3.3** UI de sélection: Grille 3 colonnes avec checkboxes
- [ ] **3.4** Compteur live: X/10 avec validation min 5
- [ ] **3.5** Écran de progression import avec LoadingDots
- [ ] **3.6** Intégration avec ImportQueueService existant
- [ ] **3.7** Écran de célébration post-import avec animations
- [ ] **3.8** Gestion d'erreurs et retry automatique
- [ ] **3.9** Background processing avec état persistant
- [ ] **3.10** Tests: Import 1, 5, 10 vidéos + erreurs

#### Phase 2: Création Premier Chapitre
- [ ] **2.1** Créer `ChapterCreationFlow.tsx` composant
- [ ] **2.2** Écran 1: Introduction avec animation livre
- [ ] **2.3** Écran 2: Input titre + suggestions intelligentes
- [ ] **2.4** Écran 3: Date picker période (start + ongoing)
- [ ] **2.5** Écran 4: Color picker avec preview live
- [ ] **2.6** Écran 5: Améliorer LifeAreasSelectionScreen (icônes, animations)
- [ ] **2.7** Écran 6: Célébration avec confetti + haptic
- [ ] **2.8** Intégration avec Supabase: Créer chapter en DB
- [ ] **2.9** Navigation: Flow linéaire avec back navigation
- [ ] **2.10** Persistence: Sauvegarder si quit mid-flow

---

### 🟠 **PRIORITÉ 2 - UX POLISH (Semaine 2)**

#### Empty States
- [ ] **ES.1** Créer composant `EmptyState.tsx` réutilisable
- [ ] **ES.2** Props: icon, title, description, actions[], helpText
- [ ] **ES.3** Design: Liquid Glass cards, animations pulse
- [ ] **ES.4** Implémenter LibraryScreen empty state
- [ ] **ES.5** Implémenter ChaptersScreen empty state
- [ ] **ES.6** Implémenter FeedScreen empty state
- [ ] **ES.7** Implémenter SearchScreen no results state
- [ ] **ES.8** Animations: Fade in + scale subtle
- [ ] **ES.9** CTA buttons: Primary + Secondary variants
- [ ] **ES.10** Tests: Toutes les variantes d'empty states

#### Phase 1: Amélioration Welcome & Auth
- [ ] **1.1** Améliorer AuthScreen: Hero message + animations
- [ ] **1.2** Background animation: Vidéos motion blur (style Apple)
- [ ] **1.3** Refonte WelcomeFlow: 3 slides maximum
- [ ] **1.4** Slide 1: "Capture Your Journey" avec animation
- [ ] **1.5** Slide 2: "AI-Powered Insights" avec animation
- [ ] **1.6** Slide 3: "Relive Your Moments" avec animation
- [ ] **1.7** Progression: Dots + barre % (0-33-66-100%)
- [ ] **1.8** Créer modal Nom & Langue (overlay)
- [ ] **1.9** Validation: Nom min 2 chars, langue required
- [ ] **1.10** Haptic feedback + animations transitions

---

### 🟡 **PRIORITÉ 3 - GAMIFICATION (Semaine 3)**

#### Système d'Achievements
- [ ] **GM.1** Créer `AchievementSystem.ts` service
- [ ] **GM.2** Définir 10 achievements onboarding
- [ ] **GM.3** Badges: Icons + titles + descriptions
- [ ] **GM.4** Unlock logic: Trigger sur actions
- [ ] **GM.5** Persistence: AsyncStorage + Supabase
- [ ] **GM.6** Composant `AchievementBadge.tsx` (modal popup)
- [ ] **GM.7** Animation unlock: Scale + confetti + sound
- [ ] **GM.8** Écran "Achievements" dans Settings
- [ ] **GM.9** Progress tracking: OnboardingProgress interface
- [ ] **GM.10** Tests: Unlock tous les achievements

#### Phase 4: Guided Tour
- [ ] **4.1** Créer `GuidedTour.tsx` composant
- [ ] **4.2** Overlay dimming: rgba(0,0,0,0.7)
- [ ] **4.3** Spotlight circular cutout avec blur
- [ ] **4.4** Tooltip: Liquid Glass card avec arrow
- [ ] **4.5** Step 1: Library tab spotlight
- [ ] **4.6** Step 2: Calendar view spotlight
- [ ] **4.7** Step 3: Search spotlight
- [ ] **4.8** Step 4: Feed tab avec swipe demo
- [ ] **4.9** Step 5: Chapters tab spotlight
- [ ] **4.10** Step 6: Record tab avec pulse animation
- [ ] **4.11** Navigation: Swipeable avec dots
- [ ] **4.12** Skip button: Dismiss tour
- [ ] **4.13** Persistence: Ne montrer qu'une fois (AsyncStorage)
- [ ] **4.14** Tests: Full tour + skip + resume

---

### 🟢 **PRIORITÉ 4 - NICE TO HAVE (Semaine 4)**

#### Phase 5: Premier Enregistrement
- [ ] **5.1** Créer `FirstRecordingPrompt.tsx` bottom sheet
- [ ] **5.2** Animation: Slide from bottom
- [ ] **5.3** Contenu: Title + description + CTA
- [ ] **5.4** Déclenchement: Après tour OU sur Library return
- [ ] **5.5** Actions: "Let's Record!" → RecordScreen
- [ ] **5.6** Actions: "Maybe later" → Dismiss + flag
- [ ] **5.7** Mini-tutorial overlay sur RecordScreen
- [ ] **5.8** Badge "First Recording" achievement
- [ ] **5.9** Persistence: AsyncStorage flag
- [ ] **5.10** Tests: Trigger conditions + actions

#### Animations & Polish
- [ ] **AP.1** Créer `animations.ts` library centralisée
- [ ] **AP.2** Slide transitions (enter/exit)
- [ ] **AP.3** Scale pop animations
- [ ] **AP.4** Confetti particles (react-native-confetti-cannon)
- [ ] **AP.5** Shimmer loading states
- [ ] **AP.6** Haptic feedback: Impact, Success, Warning
- [ ] **AP.7** Sound effects (optionnel): Success, Error, Celebration
- [ ] **AP.8** Liquid Glass theme: OnboardingTheme config
- [ ] **AP.9** Testing: Toutes les animations smooth 60fps
- [ ] **AP.10** Accessibilité: Reduce motion support

#### Analytics & Metrics
- [ ] **AN.1** Track onboarding completion rate
- [ ] **AN.2** Track drop-off points (quit mid-flow)
- [ ] **AN.3** Track import success rate
- [ ] **AN.4** Track time to first recording
- [ ] **AN.5** Track achievement unlock rate
- [ ] **AN.6** A/B testing: Messages, CTA wording
- [ ] **AN.7** Supabase Analytics integration
- [ ] **AN.8** Dashboard: Onboarding funnel visualization
- [ ] **AN.9** Optimization: Identifier friction points
- [ ] **AN.10** Reporting: Weekly onboarding metrics

---

## 📊 Architecture Technique

### **Nouveaux Composants**

```
src/
├── components/
│   ├── onboarding/
│   │   ├── WelcomeFlow.tsx (améliorer existant)
│   │   ├── ChapterCreationFlow.tsx (nouveau)
│   │   ├── VideoImportFlow.tsx (nouveau)
│   │   ├── GuidedTour.tsx (nouveau)
│   │   ├── FirstRecordingPrompt.tsx (nouveau)
│   │   ├── EmptyState.tsx (nouveau)
│   │   ├── AchievementBadge.tsx (nouveau)
│   │   └── OnboardingProgress.tsx (nouveau)
│   └── ...
├── services/
│   ├── onboardingService.ts (nouveau)
│   ├── achievementService.ts (nouveau)
│   └── ...
├── hooks/
│   ├── useOnboarding.ts (nouveau)
│   ├── useAchievements.ts (nouveau)
│   └── ...
└── types/
    ├── onboarding.ts (nouveau)
    └── ...
```

### **Services**

#### `onboardingService.ts`
```typescript
export class OnboardingService {
  // Progression
  static async getProgress(): Promise<OnboardingProgress>;
  static async updateProgress(step: string): Promise<void>;
  static async completePhase(phase: string): Promise<void>;
  static async isOnboardingComplete(): Promise<boolean>;

  // Flags
  static async setFlag(key: string, value: boolean): Promise<void>;
  static async getFlag(key: string): Promise<boolean>;

  // Reset (dev only)
  static async resetOnboarding(): Promise<void>;
}
```

#### `achievementService.ts`
```typescript
export class AchievementService {
  static async unlockAchievement(id: string): Promise<void>;
  static async getAchievements(): Promise<Achievement[]>;
  static async getUnlockedCount(): Promise<number>;
  static async showAchievementModal(achievement: Achievement): void;
}
```

### **Hooks**

#### `useOnboarding.ts`
```typescript
export const useOnboarding = () => {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const completeStep = async (step: string) => { ... };
  const skipOnboarding = async () => { ... };

  return { progress, isComplete, completeStep, skipOnboarding };
};
```

---

## 🎬 Parcours Final Complet

```
┌─────────────────────────────────────────────────────────┐
│                    ONBOARDING FLOW                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1️⃣ BIENVENUE (30s)                                     │
│     ├─ AuthScreen (amélioré)                           │
│     ├─ WelcomeFlow (3 slides)                          │
│     └─ Nom & Langue                                    │
│                                                         │
│  2️⃣ PREMIER CHAPITRE (60s)                              │
│     ├─ Introduction                                    │
│     ├─ Titre du chapitre                               │
│     ├─ Période (dates)                                 │
│     ├─ Couleur                                         │
│     ├─ Life Areas                                      │
│     └─ Célébration 🎉                                  │
│                                                         │
│  3️⃣ IMPORT VIDÉOS (120s) ⭐ PRIORITÉ                    │
│     ├─ Introduction import                             │
│     ├─ Sélection 5-10 vidéos                           │
│     ├─ Progression import                              │
│     └─ Succès 🎉                                       │
│                                                         │
│  4️⃣ DÉCOUVERTE GUIDÉE (90s)                             │
│     ├─ Library tab                                     │
│     ├─ Calendar & Search                               │
│     ├─ Feed tab                                        │
│     ├─ Chapters tab                                    │
│     └─ Record tab                                      │
│                                                         │
│  5️⃣ PREMIER ENREGISTREMENT (optionnel)                  │
│     ├─ Prompt modal                                    │
│     ├─ RecordScreen tutoriel                           │
│     └─ Achievement 🎉                                  │
│                                                         │
│  ✅ APP READY!                                          │
│     ├─ 1 chapitre créé                                 │
│     ├─ 5-10 vidéos importées                           │
│     ├─ Tour complété                                   │
│     └─ Achievements débloqués                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Temps total:** 5-6 minutes
**Résultat:** App complètement fonctionnelle avec contenu

---

## 🎨 Design Mockups Clés

### Palette de Couleurs Onboarding
```typescript
const OnboardingColors = {
  celebration: {
    confetti: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFC107', '#4CAF50'],
    gradient: ['#667eea', '#764ba2', '#f093fb'],
  },
  progress: {
    incomplete: theme.colors.gray300,
    complete: brandColor,
    background: theme.colors.gray100,
  },
  glassmorphism: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
};
```

### Iconographie
- 📚 Library
- 🎬 Import
- 📖 Chapter
- ✨ AI Features
- 🎤 Recording
- 🗺️ Tour
- 🏆 Achievements
- ⭐ Success
- 🎉 Celebration

---

## 📈 Métriques de Succès

### KPIs Onboarding
- ✅ **Taux de complétion:** >80%
- ✅ **Temps moyen:** 5-6 minutes
- ✅ **Drop-off rate:** <15%
- ✅ **Vidéos importées:** Moyenne 7-8 vidéos
- ✅ **Premier enregistrement:** >60% dans les 24h
- ✅ **Retention J+7:** >70%

### Points de Mesure
1. Auth → Welcome: 95%+
2. Welcome → Chapter Creation: 90%+
3. Chapter → Video Import: 85%+
4. Import → Tour: 95%+
5. Tour → Active Use: 80%+

---

## ✨ Recommandations Finales

### 🎯 Quick Wins
1. **Commencer par Phase 3** (Import Vidéos) - Impact immédiat
2. **Empty States** - Faciles à implémenter, grande amélioration UX
3. **Améliorer WelcomeFlow** - 3 slides au lieu de 5+

### 🚀 Long Terme
1. **Smart Import** - AI pour suggérer quelles vidéos importer
2. **Onboarding personnalisé** - Différents flows selon use case
3. **Social Proof** - Exemples de chapitres célèbres
4. **Video Tutorial** - Vidéo explicative au lieu de slides

### 🎨 Polish
1. **Sound Design** - Sons subtils pour feedback
2. **Micro-interactions** - Chaque tap doit avoir feedback
3. **Loading States** - Shimmer partout
4. **Error Handling** - Messages friendly, jamais techniques

---

**Ce plan est prêt à être exécuté phase par phase.**

Commencer par **PRIORITÉ 1** (Import Vidéos + Premier Chapitre) pour avoir le maximum d'impact en minimum de temps.
