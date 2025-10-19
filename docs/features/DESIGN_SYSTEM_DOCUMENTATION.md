# 🎨 Design System Documentation

*Dernière mise à jour : 28 septembre 2025*

## 📱 Vue d'ensemble

Ce design system fournit une architecture modulaire et cohérente pour l'application mobile de journaling vidéo. Il utilise un système de tokens centralisé qui évite la destructuration au niveau des modules pour garantir la compatibilité iOS.

## 🏗️ Architecture des Styles

### Structure des Fichiers

```
src/styles/
├── theme.ts                    # Point d'entrée principal
├── tokens/
│   ├── colors.ts              # Palette de couleurs
│   ├── typography.ts          # Système typographique
│   ├── spacing.ts             # Espacement et marges
│   └── layout.ts              # Radius, ombres, dimensions
├── components/
│   ├── buttons.ts             # Styles de boutons
│   ├── inputs.ts              # Styles de champs de saisie
│   └── navigation.ts          # Styles de navigation
└── utilities/
    └── helpers.ts             # Utilitaires et helpers
```

### Principe Clé : Accès Direct

**❌ Éviter la destructuration de modules :**
```typescript
// MAUVAIS - Cause des erreurs iOS
const { colors, spacing } = theme;
```

**✅ Utiliser l'accès direct :**
```typescript
// BON - Compatible iOS
backgroundColor: theme.colors.primary400,
padding: theme.spacing['4'],
```

## 🎨 Système de Couleurs

### Palette Principale

```typescript
// Accès via theme.colors.*
theme.colors.primary400     // Couleur principale
theme.colors.white          // Blanc pur
theme.colors.black          // Noir pur
theme.colors.error500       // Rouge d'erreur
theme.colors.success500     // Vert de succès
```

### Couleurs Sémantiques

```typescript
// Marque
theme.colors.brand.primary          // #6366F1
theme.colors.brand.primaryHover     // #4F46E5
theme.colors.brand.primaryPressed   // #4338CA

// Interface
theme.colors.ui.background          // #FFFFFF
theme.colors.ui.surface             // #FFFFFF
theme.colors.ui.border              // #D1D5DB

// Texte
theme.colors.text.primary           // #111827
theme.colors.text.secondary         // #6B7280
theme.colors.text.tertiary          // #9CA3AF
```

### Overlays et Transparences

```typescript
theme.colors.blackOverlay60         // rgba(0, 0, 0, 0.6)
theme.colors.whiteOverlay20         // rgba(255, 255, 255, 0.2)
```

## ✍️ Système Typographique

### Police

**Police actuelle :** `System` (San Francisco sur iOS, Roboto sur Android)

### Hiérarchie Typographique

```typescript
// Headlines
theme.typography.h1      // 28px, Bold
theme.typography.h2      // 20px, Semibold
theme.typography.h3      // 18px, Semibold

// Corps de texte
theme.typography.body        // 16px, Regular
theme.typography.bodyBold    // 16px, Bold
theme.typography.bodySmall   // 14px, Regular

// Support
theme.typography.caption     // 14px, Regular
theme.typography.button      // 16px, Semibold
```

### Graisses

```typescript
theme.typography.weights.light      // '300'
theme.typography.weights.regular    // '400'
theme.typography.weights.medium     // '500'
theme.typography.weights.semibold   // '600'
theme.typography.weights.bold       // '700'
```

## 📐 Système d'Espacement

### Échelle d'Espacement

```typescript
theme.spacing['0']      // 0px
theme.spacing['1']      // 4px
theme.spacing['2']      // 8px
theme.spacing['3']      // 12px
theme.spacing['4']      // 16px
theme.spacing['6']      // 24px
theme.spacing['8']      // 32px
theme.spacing['12']     // 48px
```

### Espacement Sémantique

```typescript
theme.spacing.component.screenPaddingHorizontal    // 16px
theme.spacing.component.cardPadding                // 16px
theme.spacing.component.buttonPaddingHorizontal    // 24px
```

## 🎯 Système de Layout

### Border Radius

```typescript
theme.layout.borderRadius.xs        // 4px
theme.layout.borderRadius.sm        // 8px
theme.layout.borderRadius.input     // 12px
theme.layout.borderRadius.button    // 12px
theme.layout.borderRadius.xl        // 16px
theme.layout.borderRadius.full      // 999px
```

### Ombres

```typescript
theme.layout.shadows.sm     // Ombre légère
theme.layout.shadows.md     // Ombre moyenne
theme.layout.shadows.lg     // Ombre forte
```

## 🔘 Composants de Style

### Boutons

```typescript
import { buttonVariants, getButtonStyle } from '../styles/components/buttons';

// Utilisation
const buttonStyle = getButtonStyle('primary', 'medium', isPressed, isDisabled);

// Variants disponibles
buttonVariants.primary      // Bouton principal
buttonVariants.secondary    // Bouton secondaire
buttonVariants.ghost        // Bouton fantôme
buttonVariants.danger       // Bouton de danger
buttonVariants.link         // Bouton lien
```

### Champs de Saisie

```typescript
import { inputVariants, getInputStyle } from '../styles/components/inputs';

// Utilisation
const inputStyle = getInputStyle('default', 'medium', 'focused');

// Variants disponibles
inputVariants.default       // Champ par défaut
inputVariants.filled        // Champ rempli
inputVariants.outline       // Champ avec bordure
inputVariants.underline     // Champ souligné
```

## 🧰 Utilitaires

### Layout

```typescript
import { layoutUtils } from '../styles/utilities/helpers';

// Flexbox
layoutUtils.flexCenter      // Centré
layoutUtils.flexBetween     // Espace entre
layoutUtils.flexRow         // Direction ligne
layoutUtils.flex1           // flex: 1
```

### Couleurs

```typescript
import { colorUtils } from '../styles/utilities/helpers';

colorUtils.bgWhite          // Fond blanc
colorUtils.textPrimary      // Texte principal
colorUtils.bgPrimary        // Fond principal
```

### Espacement

```typescript
import { spacingUtils } from '../styles/utilities/helpers';

spacingUtils.p4             // padding: 16px
spacingUtils.mx3            // marginHorizontal: 12px
spacingUtils.mt6            // marginTop: 24px
```

## 📱 Composants Spécialisés

### Interface de Capture Vidéo

Nouveaux composants créés pour l'interface de capture :

#### CaptureHeader
```typescript
import { CaptureHeader } from '../components/CaptureHeader';

<CaptureHeader
  chapter="Chapter 3"
  arc="Arc 7"
/>
```

**Fonctionnalités :**
- Affichage de la date formatée automatiquement
- Affichage du chapitre et arc
- Icône de sablier (horloge)
- Text shadow pour lisibilité sur vidéo

#### CaptureNavigationBar
```typescript
import { CaptureNavigationBar } from '../components/CaptureNavigationBar';

<CaptureNavigationBar
  onLeftPress={handleLeftPress}
  onCenterPress={handleCenterPress}
  onRightPress={handleRightPress}
  isRecording={isRecording}
/>
```

**Fonctionnalités :**
- 3 boutons : gauche, centre (principal), droite
- Utilise les assets personnalisés
- État visuel pour l'enregistrement
- Centré avec espacement équilibré

### Grille Zoomable (ZoomableGifGrid)

```typescript
import { ZoomableGifGrid } from '../components/ZoomableGifGrid';

<ZoomableGifGrid
  videos={filteredVideos}
  onVideoPress={handleVideoPress}
  loading={loading}
/>
```

**Fonctionnalités :**
- Grille style iPhone Photos
- Zoom par boutons +/- (1-5 colonnes)
- Vignettes vidéo intelligentes
- Virtualisation pour performance
- Accessibilité complète

## 🎨 Bonnes Pratiques

### 1. Utilisation des Tokens

```typescript
// ✅ BON - Accès direct aux tokens
const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.ui.background,
    padding: theme.spacing['4'],
    borderRadius: theme.layout.borderRadius.input,
  }
});
```

### 2. Composants Consistants

```typescript
// ✅ BON - Réutiliser les styles existants
const customButton = {
  ...buttonVariants.primary.container,
  marginTop: theme.spacing['3'],
};
```

### 3. Responsive Design

```typescript
// ✅ BON - Utiliser les dimensions d'écran
const { width: screenWidth } = Dimensions.get('window');
const cellSize = (screenWidth - theme.spacing['4'] * 2) / columns;
```

### 4. Accessibilité

```typescript
// ✅ BON - Labels et touch targets
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Start recording"
  style={{ minWidth: 44, minHeight: 44 }}
>
```

## 🚫 Erreurs à Éviter

### 1. Destructuration de Modules

```typescript
// ❌ MAUVAIS - Cause des erreurs iOS
const { colors } = theme;
backgroundColor: colors.primary400,

// ✅ BON
backgroundColor: theme.colors.primary400,
```

### 2. Valeurs Hardcodées

```typescript
// ❌ MAUVAIS
padding: 16,
borderRadius: 8,

// ✅ BON
padding: theme.spacing['4'],
borderRadius: theme.layout.borderRadius.sm,
```

### 3. Couleurs Non-Sémantiques

```typescript
// ❌ MAUVAIS
backgroundColor: '#6366F1',

// ✅ BON
backgroundColor: theme.colors.brand.primary,
```

## 🔄 Workflow de Développement

### 1. Nouveau Composant

1. Utiliser les tokens existants du theme
2. Réutiliser les styles de composants si possible
3. Ajouter des utilitaires si nécessaire
4. Tester sur iOS et Android

### 2. Modifications de Style

1. Vérifier si un token existe déjà
2. Modifier dans le fichier de tokens approprié
3. Mettre à jour la documentation
4. Tester l'impact sur les composants existants

### 3. Assets Personnalisés

Les assets sont stockés dans `/assets/` :
- `icon-nav-gauche.png` - Icône navigation gauche
- `icon-nav-droite.png` - Icône navigation droite
- `logo-blanc.png` - Logo application blanc

## 📊 Métriques de Performance

### Optimisations Appliquées

1. **Accès direct aux tokens** - Évite les cycles de destructuration
2. **Memoization des composants** - React.memo sur les grilles
3. **Virtualisation native** - FlatList pour les listes longues
4. **Lazy loading** - Images chargées à la demande

## 🎯 Roadmap

### Améliorations Futures

1. **Police personnalisée** - Inter font family
2. **Mode sombre** - Thème alternatif
3. **Animations** - Système de transitions
4. **Responsive breakpoints** - Support tablette
5. **Pinch-to-zoom** - Quand Reanimated sera stable

---

*Cette documentation est maintenue automatiquement et reflète l'état actuel du design system.*

### Objectifs du Design System

Ce design system a été créé pour :
- **Cohérence Visuelle** : Uniformiser l'apparence de l'application
- **Scalabilité** : Permettre des changements rapides et globaux
- **Maintenabilité** : Réduire la duplication de code
- **Performance** : Optimiser les styles et réduire la taille du bundle
- **Collaboration** : Faciliter le travail entre designers et développeurs

### Philosophie de Design

L'application se concentre sur :
- **Simplicité** : Interface épurée pour favoriser la réflexion
- **Accessibilité** : Contraste élevé et tailles de police lisibles
- **Émotions** : Couleurs et typographie qui inspirent la confiance
- **Mobile-First** : Optimisé pour l'utilisation mobile

---

## 🏗️ Architecture du Système {#architecture}

### Structure des Fichiers

```
src/styles/
├── tokens/                 # Design tokens de base
│   ├── colors.ts          # Système de couleurs complet
│   ├── typography.ts      # Échelle typographique
│   ├── spacing.ts         # Système d'espacement
│   ├── layout.ts          # Bordures, ombres, dimensions
│   └── index.ts           # Export principal des tokens
├── components/            # Styles de composants réutilisables
│   ├── buttons.ts         # Tous les styles de boutons
│   ├── inputs.ts          # Champs de saisie et formulaires
│   ├── cards.ts           # Cartes et conteneurs
│   ├── navigation.ts      # Navigation et barres
│   └── index.ts           # Export des composants
├── utilities/             # Classes utilitaires
│   ├── helpers.ts         # Fonctions helper et utils
│   └── index.ts           # Export des utilitaires
├── examples/              # Exemples d'utilisation
│   ├── component-examples.tsx
│   └── migration-guide.md
├── theme.ts              # Configuration principale du thème
└── index.ts              # Export principal du design system
```

### Import et Utilisation

```tsx
// Import principal (recommandé)
import { theme } from '../styles';

// Import spécifique pour les composants
import { getButtonStyle, getCardStyle } from '../styles';

// Import des utilitaires
import { spacingUtils, colorUtils, layoutUtils } from '../styles';
```

---

## 🎨 Design Tokens {#design-tokens}

### Système de Couleurs

#### Palette Principale

```tsx
// Couleurs de marque (Violet/Purple)
theme.colors.primary400    // #9A65FF - Couleur principale
theme.colors.primary500    // #7A3FFF - Version foncée
theme.colors.primary50     // #F5F0FF - Version très claire

// Couleurs secondaires (Bleu)
theme.colors.secondary500  // #2D27FF
theme.colors.tertiary500   // #FF4D6D - Rose/Rouge
```

#### Couleurs Sémantiques

```tsx
// Interface utilisateur
theme.colors.ui.background      // Arrière-plan principal
theme.colors.ui.surface         // Surface des cartes
theme.colors.ui.border          // Bordures
theme.colors.ui.divider         // Séparateurs

// Texte
theme.colors.text.primary       // Texte principal (noir)
theme.colors.text.secondary     // Texte secondaire (gris foncé)
theme.colors.text.tertiary      // Texte tertiaire (gris)
theme.colors.text.inverse       // Texte sur fond sombre (blanc)

// États de feedback
theme.colors.feedback.error     // Erreur (rouge)
theme.colors.feedback.warning   // Attention (orange)
theme.colors.feedback.success   // Succès (vert)
theme.colors.feedback.info      // Information (bleu)

// Overlays (transparences)
theme.colors.overlay.backdrop   // rgba(0, 0, 0, 0.6)
theme.colors.overlay.surface    // rgba(0, 0, 0, 0.8)
theme.colors.overlay.light      // rgba(255, 255, 255, 0.2)
```

#### Utilisation des Couleurs

```tsx
// ✅ Recommandé
const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.ui.background,
    borderColor: theme.colors.ui.border,
  },
  title: {
    color: theme.colors.text.primary,
  },
  overlay: {
    backgroundColor: theme.colors.overlay.surface,
  },
});

// ❌ À éviter
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6E6E6',
  },
  title: {
    color: '#000000',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});
```

### Système Typographique

#### Échelle de Tailles

```tsx
// Titres principaux
theme.typography.display1       // 48px - Très gros titre
theme.typography.h1            // 36px - Titre principal
theme.typography.h2            // 32px - Sous-titre important
theme.typography.h3            // 28px - Titre de section
theme.typography.h4            // 24px - Sous-titre
theme.typography.h5            // 20px - Petit titre
theme.typography.h6            // 18px - Titre de composant

// Corps de texte
theme.typography.bodyLarge     // 18px - Texte important
theme.typography.body          // 16px - Texte standard
theme.typography.bodySmall     // 14px - Texte secondaire

// Texte de support
theme.typography.caption       // 14px - Légendes
theme.typography.tiny          // 12px - Petit texte
theme.typography.micro         // 10px - Micro texte

// Éléments UI
theme.typography.button        // 16px - Texte de bouton
theme.typography.label         // 14px - Labels de formulaire
theme.typography.input         // 16px - Texte de saisie
```

#### Exemple d'Utilisation

```tsx
const styles = StyleSheet.create({
  title: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing['2'],
  },
});
```

### Système d'Espacement

#### Échelle de Base (4px)

```tsx
theme.spacing['0']     // 0px
theme.spacing['1']     // 4px
theme.spacing['2']     // 8px
theme.spacing['3']     // 12px
theme.spacing['4']     // 16px
theme.spacing['5']     // 20px
theme.spacing['6']     // 24px
theme.spacing['8']     // 32px
theme.spacing['10']    // 40px
theme.spacing['12']    // 48px
```

#### Espacement Sémantique

```tsx
// Espacement d'écran
theme.spacing.component.screenPaddingHorizontal  // 16px
theme.spacing.component.screenPaddingVertical    // 24px

// Espacement de carte
theme.spacing.component.cardPadding              // 16px
theme.spacing.component.cardGap                  // 12px

// Espacement de bouton
theme.spacing.component.buttonPaddingHorizontal  // 16px
theme.spacing.component.buttonPaddingVertical    // 12px
```

### Système de Layout

#### Bordures et Rayons

```tsx
theme.layout.borderRadius.sm       // 4px
theme.layout.borderRadius.md       // 8px
theme.layout.borderRadius.lg       // 12px
theme.layout.borderRadius.xl       // 16px
theme.layout.borderRadius.card     // 16px
theme.layout.borderRadius.button   // 12px
theme.layout.borderRadius.full     // 999px
```

#### Ombres

```tsx
theme.layout.shadows.xs    // Ombre très légère
theme.layout.shadows.sm    // Ombre légère
theme.layout.shadows.md    // Ombre moyenne
theme.layout.shadows.lg    // Ombre forte
theme.layout.shadows.xl    // Ombre très forte
```

---

## 🧩 Composants UI {#composants-ui}

### Boutons

#### Variantes Disponibles

```tsx
import { getButtonStyle } from '../styles';

// Bouton principal
const primaryStyle = getButtonStyle('primary', 'medium');

// Bouton secondaire
const secondaryStyle = getButtonStyle('secondary', 'small');

// Bouton fantôme
const ghostStyle = getButtonStyle('ghost', 'large');

// Bouton dangereux
const dangerStyle = getButtonStyle('danger', 'medium');
```

#### Tailles

- `small` : 36px de hauteur
- `medium` : 48px de hauteur (défaut)
- `large` : 56px de hauteur

#### Exemple d'Utilisation

```tsx
const MyButton = ({ title, onPress, variant = 'primary', size = 'medium' }) => {
  const buttonStyle = getButtonStyle(variant, size);

  return (
    <Pressable style={buttonStyle.container} onPress={onPress}>
      <Text style={buttonStyle.text}>{title}</Text>
    </Pressable>
  );
};
```

### Champs de Saisie

#### Variantes Disponibles

```tsx
import { getInputStyle } from '../styles';

// Input par défaut
const defaultStyle = getInputStyle('default', 'medium');

// Input rempli
const filledStyle = getInputStyle('filled', 'large');

// Input avec contour
const outlineStyle = getInputStyle('outline', 'small');

// Input avec ligne de base
const underlineStyle = getInputStyle('underline', 'medium');
```

#### États

```tsx
// Input focalisé
const focusedStyle = getInputStyle('default', 'medium', 'focused');

// Input avec erreur
const errorStyle = getInputStyle('default', 'medium', 'error');

// Input désactivé
const disabledStyle = getInputStyle('default', 'medium', 'disabled');
```

### Cartes

#### Types de Cartes

```tsx
import { getCardStyle, chapterCardStyles, videoCardStyles } from '../styles';

// Carte élevée (avec ombre)
const elevatedCard = getCardStyle('elevated');

// Carte plate (sans ombre)
const flatCard = getCardStyle('flat');

// Carte avec contour
const outlinedCard = getCardStyle('outlined');

// Carte de chapitre (spécifique à l'app)
const chapterCard = chapterCardStyles.container;

// Carte vidéo
const videoCard = videoCardStyles.container;
```

### Navigation

#### Barre d'Onglets

```tsx
import { tabBarStyles } from '../styles';

const TabBar = () => (
  <View style={tabBarStyles.container}>
    <View style={tabBarStyles.tabItem}>
      <Image style={[tabBarStyles.tabIcon, tabBarStyles.tabIconActive]} />
      <Text style={[tabBarStyles.tabLabel, tabBarStyles.tabLabelActive]}>
        Home
      </Text>
    </View>
  </View>
);
```

#### Barre Supérieure

```tsx
import { topBarStyles } from '../styles';

const TopBar = ({ title, subtitle }) => (
  <View style={topBarStyles.container}>
    <View style={topBarStyles.leftSection}>
      <Pressable style={topBarStyles.backButton}>
        {/* Icône de retour */}
      </Pressable>
    </View>

    <View style={topBarStyles.centerSection}>
      <Text style={topBarStyles.title}>{title}</Text>
      {subtitle && (
        <Text style={topBarStyles.subtitle}>{subtitle}</Text>
      )}
    </View>

    <View style={topBarStyles.rightSection}>
      {/* Actions */}
    </View>
  </View>
);
```

---

## 🔄 Patterns d'Utilisation {#patterns-dutilisation}

### Pattern 1 : Overlay Vidéo

```tsx
import { theme, layoutUtils, spacingUtils } from '../styles';

const VideoOverlay = () => (
  <View style={styles.videoContainer}>
    {/* Overlay principal */}
    <View style={[
      layoutUtils.absoluteFill,
      { backgroundColor: theme.colors.overlay.backdrop }
    ]}>

      {/* Bouton play centré */}
      <View style={[layoutUtils.flexCenter, layoutUtils.flex1]}>
        <Pressable style={styles.playButton}>
          <Text style={styles.playIcon}>▶</Text>
        </Pressable>
      </View>

      {/* Contrôles en bas */}
      <View style={[
        layoutUtils.flexRow,
        layoutUtils.flexBetween,
        spacingUtils.p4
      ]}>
        <Text style={styles.timeText}>0:00</Text>
        <Text style={styles.timeText}>2:34</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  videoContainer: {
    aspectRatio: 16 / 9,
    borderRadius: theme.layout.borderRadius.lg,
    overflow: 'hidden',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: theme.layout.borderRadius.full,
    backgroundColor: theme.colors.overlay.surface,
    ...theme.layout.shadows.lg,
    ...layoutUtils.flexCenter,
  },
  playIcon: {
    ...theme.typography.buttonLarge,
    color: theme.colors.text.inverse,
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.text.inverse,
  },
});
```

### Pattern 2 : Carte de Chapitre

```tsx
import { theme, layoutUtils, spacingUtils, colorUtils } from '../styles';

const ChapterCard = ({ chapter }) => (
  <View style={styles.container}>
    {/* En-tête */}
    <View style={[layoutUtils.flexRow, layoutUtils.flexBetween, spacingUtils.mb2]}>
      <Text style={styles.title}>{chapter.title}</Text>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{chapter.status}</Text>
      </View>
    </View>

    {/* Période */}
    <Text style={styles.period}>
      {chapter.startDate} - {chapter.endDate}
    </Text>

    {/* Barre de progression */}
    <View style={spacingUtils.mt3}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${chapter.progress}%` }]} />
      </View>

      {/* Statistiques */}
      <View style={[layoutUtils.flexRow, spacingUtils.mt2]}>
        <View style={spacingUtils.mr4}>
          <Text style={styles.statValue}>{chapter.videoCount}</Text>
          <Text style={styles.statLabel}>Videos</Text>
        </View>
        <View>
          <Text style={styles.statValue}>{chapter.duration}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.ui.surface,
    borderRadius: theme.layout.borderRadius.xl,
    padding: theme.spacing['4'],
    marginBottom: theme.spacing['3'],
    ...theme.layout.shadows.sm,
  },
  title: {
    ...theme.typography.h5,
    color: theme.colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: theme.colors.brand.primaryLight,
    paddingHorizontal: theme.spacing['2'],
    paddingVertical: theme.spacing['1'],
    borderRadius: theme.layout.borderRadius.sm,
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.brand.primary,
  },
  period: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing['3'],
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.ui.border,
    borderRadius: theme.layout.borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.layout.borderRadius.full,
  },
  statValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.text.primary,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
  },
});
```

### Pattern 3 : Formulaire avec Validation

```tsx
import { getInputStyle, inputHelperStyles, inputLabelStyles } from '../styles';

const FormField = ({ label, error, helperText, ...inputProps }) => {
  const inputStyle = getInputStyle('default', 'medium', error ? 'error' : undefined);

  return (
    <View style={inputGroupStyles.container}>
      {/* Label */}
      <Text style={inputLabelStyles.label}>
        {label}
        {inputProps.required && (
          <Text style={inputLabelStyles.required}> *</Text>
        )}
      </Text>

      {/* Input */}
      <TextInput
        style={inputStyle.input}
        placeholderTextColor={inputStyle.placeholder.color}
        {...inputProps}
      />

      {/* Helper text ou erreur */}
      {error ? (
        <Text style={inputHelperStyles.error}>{error}</Text>
      ) : helperText ? (
        <Text style={inputHelperStyles.helper}>{helperText}</Text>
      ) : null}
    </View>
  );
};
```

---

## 📈 Guide de Migration {#guide-de-migration}

### Étapes de Migration

1. **Installer le nouveau système**
   ```tsx
   import { theme } from '../styles';
   ```

2. **Remplacer les couleurs hardcodées**
   ```tsx
   // Avant
   backgroundColor: '#FFFFFF'
   // Après
   backgroundColor: theme.colors.ui.background
   ```

3. **Remplacer la typographie**
   ```tsx
   // Avant
   fontSize: 16, fontWeight: '600'
   // Après
   ...theme.typography.bodyBold
   ```

4. **Remplacer l'espacement**
   ```tsx
   // Avant
   padding: 16, margin: 24
   // Après
   padding: theme.spacing['4'], margin: theme.spacing['6']
   ```

### Référence Rapide de Migration

| Ancien | Nouveau |
|--------|---------|
| `#FFFFFF` | `theme.colors.ui.background` |
| `#000000` | `theme.colors.text.primary` |
| `#9A65FF` | `theme.colors.brand.primary` |
| `rgba(0, 0, 0, 0.8)` | `theme.colors.overlay.surface` |
| `fontSize: 16` | `theme.typography.body` |
| `padding: 16` | `theme.spacing['4']` |

---

## 🎭 Personnalisation et Thèmes {#personnalisation}

### Mode Sombre (Préparé)

Le système est prêt pour le mode sombre :

```tsx
import { darkTheme } from '../styles/theme';

// Le thème sombre est déjà configuré avec :
// - Arrière-plans sombres
// - Texte clair
// - Couleurs adaptées
```

### Personnalisation des Couleurs

Pour changer la couleur principale de l'app :

```tsx
// Dans theme.ts
const customTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    brand: {
      primary: '#FF6B6B',        // Nouvelle couleur principale
      primaryHover: '#FF5252',   // Version hover
      // ...
    },
  },
};
```

### Ajout de Nouveaux Composants

Pour ajouter un nouveau composant stylé :

```tsx
// Dans src/styles/components/newComponent.ts
export const newComponentStyles = {
  container: {
    backgroundColor: theme.colors.ui.surface,
    padding: theme.spacing['4'],
    borderRadius: theme.layout.borderRadius.lg,
    ...theme.layout.shadows.sm,
  },
  // ...
};
```

---

## ✅ Meilleures Pratiques {#meilleures-pratiques}

### Do ✅

1. **Utilisez les tokens de design**
   ```tsx
   backgroundColor: theme.colors.ui.background
   ```

2. **Préférez les styles de composants**
   ```tsx
   const buttonStyle = getButtonStyle('primary', 'medium');
   ```

3. **Utilisez les utilitaires pour des patterns communs**
   ```tsx
   style={[layoutUtils.flexCenter, spacingUtils.p4]}
   ```

4. **Restez cohérent avec la nomenclature**
   ```tsx
   theme.colors.text.primary (pas theme.colors.textPrimary)
   ```

### Don't ❌

1. **N'utilisez pas de valeurs hardcodées**
   ```tsx
   // ❌
   backgroundColor: '#FFFFFF'
   fontSize: 16
   padding: 20
   ```

2. **N'inventez pas vos propres conventions**
   ```tsx
   // ❌
   backgroundColor: theme.colors.white
   // ✅
   backgroundColor: theme.colors.ui.background
   ```

3. **N'ignorez pas les variantes d'état**
   ```tsx
   // ❌ Même style pour tous les états
   // ✅ Styles différents pour pressed, disabled, etc.
   ```

### Performance

1. **Réutilisez les styles**
   ```tsx
   const styles = StyleSheet.create({
     container: getCardStyle('elevated'),
   });
   ```

2. **Évitez la création de styles inline**
   ```tsx
   // ❌
   <View style={{ backgroundColor: theme.colors.ui.background }} />

   // ✅
   <View style={styles.container} />
   ```

### Accessibilité

1. **Respectez les contrastes minimums**
   - Le système respecte déjà les ratios WCAG AA

2. **Utilisez des tailles de police lisibles**
   - Minimum 14px pour le texte principal

3. **Respectez les zones de touch minimum**
   - 44px minimum pour les éléments interactifs

---

## 🚀 Conclusion

Ce design system vous permet de :

- **Développer plus rapidement** avec des composants prêts à l'emploi
- **Maintenir la cohérence** visuelle à travers l'application
- **Changer le style globalement** en modifiant les tokens
- **Préparer l'avenir** avec le support du mode sombre
- **Collaborer efficacement** entre design et développement

### Support et Questions

Pour toute question sur l'utilisation du design system :
1. Consultez les exemples dans `/src/styles/examples/`
2. Référez-vous à cette documentation
3. Testez vos changements avec les patterns fournis

### Évolution du Système

Le design system est vivant et évoluera avec les besoins de l'application. Toute modification doit être :
- Documentée
- Testée sur tous les composants
- Compatible avec l'existant (backward compatibility)

---

**🎨 Happy Designing! 🎨**