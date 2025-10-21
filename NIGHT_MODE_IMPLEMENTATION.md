# 🌙 NIGHT MODE - Plan d'Implémentation Complet

## 📊 État Actuel

**Bonne nouvelle !** Le système de thème dark mode est déjà **70% implémenté**.

### ✅ Ce qui fonctionne déjà

1. **Système de thème complet** dans `/src/styles/theme.ts` avec palettes light/dark
2. **DarkModeContext** fonctionnel avec persistance AsyncStorage
3. **Toggle Night Mode** dans Settings (actuellement désactivé)
4. **Hook `useTheme()`** qui combine dark mode + couleurs de brand
5. **~50 composants** utilisent déjà le système de thème

### ⚠️ Ce qui manque (30%)

1. **StatusBar** ne change pas de couleur
2. **10 fichiers** avec des couleurs hardcodées en dur
3. Quelques composants n'utilisent pas encore `useTheme()`

---

## 🎯 Architecture du Système de Thème

### Fichiers Clés

```
/src/styles/theme.ts              → Palettes light/dark complètes
/src/contexts/DarkModeContext.tsx → État isDarkMode + toggle
/src/contexts/ThemeContext.tsx    → Couleur de brand (auto/custom)
/src/hooks/useTheme.ts            → Hook combiné
/App.tsx                          → Providers correctement configurés
```

### Structure du Thème

```typescript
// Light Theme
{
  colors: {
    ui: {
      background: '#FFFFFF',      // Blanc
      surface: '#FFFFFF',         // Blanc
      surfaceHover: '#FCFCFC'     // Gris très clair
    },
    text: {
      primary: '#0D0D0D',         // Noir
      secondary: '#666666',       // Gris foncé
      tertiary: '#999999'         // Gris moyen
    }
  }
}

// Dark Theme
{
  colors: {
    ui: {
      background: '#000000',      // Noir pur
      surface: '#0D0D0D',         // Gris très foncé
      surfaceHover: '#1A1A1A'     // Gris foncé
    },
    text: {
      primary: '#FFFFFF',         // Blanc
      secondary: '#E6E6E6',       // Gris très clair
      tertiary: '#CCCCCC'         // Gris clair
    }
  }
}
```

---

## 🛠️ Plan d'Implémentation - 3 Phases

### **PHASE 1 : Corrections Critiques** (Priorité Haute - 2h)

#### 1.1 StatusBar dynamique dans App.tsx

**Fichier** : `/App.tsx` (ligne ~25)

**Problème** : `<StatusBar style="auto" />` ne respecte pas le dark mode

**Solution** :
```typescript
import { useDarkMode } from './src/contexts/DarkModeContext';

export default function App() {
  const { isDarkMode } = useDarkMode();

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <DarkModeProvider>
            <StatusBar style={isDarkMode ? "light" : "dark"} />
            <AppNavigator />
          </DarkModeProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
```

---

#### 1.2 Corriger les couleurs hardcodées - VideoPlayer.tsx

**Fichier** : `/src/components/VideoPlayer.tsx`

**Problème** : 3 occurrences de `#000000` et `#FFFFFF` en dur

**Avant** :
```typescript
backgroundColor: '#000000'
color: '#FFFFFF'
```

**Après** :
```typescript
import { useTheme } from '../hooks/useTheme';

const VideoPlayer = () => {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.ui.background }}>
      <Text style={{ color: theme.colors.text.primary }}>
        ...
      </Text>
    </View>
  );
};
```

---

#### 1.3 TopBar.tsx - Utiliser useTheme() au lieu de static import

**Fichier** : `/src/components/TopBar.tsx`

**Problème** : `import { theme } from '../styles'` - theme statique

**Avant** :
```typescript
import { theme } from '../styles';

const TopBar = () => {
  return (
    <View style={{ backgroundColor: theme.colors.ui.surface }}>
      ...
    </View>
  );
};
```

**Après** :
```typescript
import { useTheme } from '../hooks/useTheme';

const TopBar = () => {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.ui.surface }}>
      ...
    </View>
  );
};
```

---

#### 1.4 Tab Bars (CustomTabBar + HybridTabBar)

**Fichiers** :
- `/src/components/CustomTabBar.tsx` (1 occurrence)
- `/src/components/HybridTabBar.tsx` (1 occurrence)

**Solution** : Remplacer hex colors par `theme.colors.*`

**Exemple** :
```typescript
// Avant
backgroundColor: '#FFFFFF'
borderTopColor: '#E6E6E6'

// Après
const theme = useTheme();
backgroundColor: theme.colors.ui.surface
borderTopColor: theme.colors.ui.border
```

---

### **PHASE 2 : Corrections des Composants** (Priorité Moyenne - 2h)

#### 2.1 RecordButton.tsx

**Fichier** : `/src/components/RecordButton.tsx`

**Action** : Remplacer couleur hardcodée par `theme.colors.brand.primary`

---

#### 2.2 Écrans avec couleurs hardcodées

**Fichiers à corriger** :
1. `/src/screens/ProfileScreen.tsx` (1 occurrence)
2. `/src/screens/LifeAreasSelectionScreen.tsx` (1 occurrence)
3. `/src/screens/ChapterSetupScreen.tsx` (1 occurrence)
4. `/src/components/SecureTranscriptionButton.tsx` (1 occurrence)

**Pour chaque fichier** :

1. Ajouter `const theme = useTheme();`
2. Remplacer couleurs hardcodées par `theme.colors.*`

**Exemple** :
```typescript
// Avant
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  text: {
    color: '#000000',
  },
});

// Après
const MyComponent = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.ui.background }]}>
      <Text style={[styles.text, { color: theme.colors.text.primary }]}>
        ...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 16,
  },
});
```

---

#### 2.3 Navigation (AppNavigator.tsx)

**Fichier** : `/src/navigation/AppNavigator.tsx`

**Problème potentiel** : Les couleurs de navigation peuvent ne pas s'adapter au dark mode

**Vérifier** :
- `screenOptions` dans les navigateurs
- Couleurs de header/background
- Tab bar colors

**Solution si nécessaire** :
```typescript
import { useTheme } from '../hooks/useTheme';

const AppNavigator = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.ui.surface,
        },
        headerTintColor: theme.colors.text.primary,
        headerShadowVisible: false,
      }}
    >
      {/* ... */}
    </Stack.Navigator>
  );
};
```

---

### **PHASE 3 : Tests & Polish** (Priorité Basse - 1h)

#### 3.1 Tests Visuels

**Actions** :
1. Activer Night Mode dans Settings
2. Parcourir TOUS les écrans :
   - HomeScreen
   - LibraryScreen (vue Calendar + Grid)
   - RecordScreen
   - ChapterDetailScreen
   - ChapterManagementScreen
   - SettingsScreen
   - ProfileScreen
   - VerticalFeedScreen
   - MomentumDashboardScreen
   - DayDebriefScreen

**Vérifier** :
- [ ] Backgrounds noirs
- [ ] Textes blancs/gris clairs
- [ ] Icônes visibles
- [ ] Borders/dividers visibles
- [ ] Modals/overlays corrects

---

#### 3.2 Vérifications Edge Cases

**Points à tester** :
- [ ] Modals (fond semi-transparent)
- [ ] Overlays (VideoPlayer, SearchScreen)
- [ ] LiquidGlass components (adapter opacity)
- [ ] Shadows (invisibles sur fond noir - peut-être retirer)
- [ ] Images/thumbnails (contraste)
- [ ] Status bar sur fond noir
- [ ] Navigation transitions

---

#### 3.3 Performance

**Vérifier** :
- [ ] Pas de re-renders excessifs lors du toggle
- [ ] Transition fluide light → dark
- [ ] Persistance AsyncStorage fonctionne
- [ ] App se relance dans le bon mode

---

## 📝 Mapping des Couleurs

### Backgrounds

| Élément | Light | Dark |
|---------|-------|------|
| Screen background | `#FFFFFF` | `#000000` |
| Cards/Surface | `#FFFFFF` | `#0D0D0D` |
| Surface hover | `#FCFCFC` | `#1A1A1A` |

### Textes

| Type | Light | Dark |
|------|-------|------|
| Primary | `#0D0D0D` | `#FFFFFF` |
| Secondary | `#666666` | `#E6E6E6` |
| Tertiary | `#999999` | `#CCCCCC` |
| Disabled | `#CCCCCC` | `#666666` |

### Borders/Dividers

| Type | Light | Dark |
|------|-------|------|
| Border | `#E6E6E6` | `#333333` |
| Divider | `#F5F5F5` | `#1A1A1A` |

---

## 🎯 Checklist Complète

### Phase 1 - Critiques (2h)
- [ ] StatusBar dynamique dans App.tsx
- [ ] VideoPlayer.tsx - 3 couleurs hardcodées
- [ ] TopBar.tsx - useTheme() au lieu de static import
- [ ] CustomTabBar.tsx - 1 couleur hardcodée
- [ ] HybridTabBar.tsx - 1 couleur hardcodée

### Phase 2 - Composants (2h)
- [ ] RecordButton.tsx - 1 couleur hardcodée
- [ ] ProfileScreen.tsx - 1 couleur hardcodée
- [ ] LifeAreasSelectionScreen.tsx - 1 couleur hardcodée
- [ ] ChapterSetupScreen.tsx - 1 couleur hardcodée
- [ ] SecureTranscriptionButton.tsx - 1 couleur hardcodée
- [ ] AppNavigator.tsx - vérifier navigation colors

### Phase 3 - Tests (1h)
- [ ] Test tous les écrans en dark mode
- [ ] Test modals/overlays
- [ ] Test persistence AsyncStorage
- [ ] Test performance toggle
- [ ] Test LiquidGlass components
- [ ] Test navigation transitions

---

## ⏱️ Estimation Totale

**Temps total estimé : 5 heures**

- **Phase 1** : 2h (Corrections critiques)
- **Phase 2** : 2h (Composants restants)
- **Phase 3** : 1h (Tests & polish)

---

## 🔧 Activer le Night Mode Toggle

Pour réactiver le toggle Night Mode dans SettingsScreen :

**Fichier** : `/src/screens/SettingsScreen.tsx`

**Ajouter dans la section "Appearance"** :
```typescript
<SettingsSection title="Appearance">
  <SettingsItem
    icon="moon"
    title="Night Mode"
    subtitle="Switch to dark theme"
    showSwitch
    switchValue={isDarkMode}
    onSwitchChange={toggleDarkMode}
  />
  <SettingsItem
    icon="droplet"
    title="App Color Theme"
    subtitle={getColorModeLabel()}
    colorCircle={brandColor}
    showChevron
    onPress={handleAppColorPress}
  />
</SettingsSection>
```

---

## 💡 Notes Importantes

1. **70% déjà fait** : Le gros du travail (architecture, contexts, hook) est déjà implémenté
2. **Seulement 10 fichiers** à corriger pour les couleurs hardcodées
3. **Toggle fonctionnel** : Le bouton dans Settings marche déjà (actuellement désactivé)
4. **Persistance OK** : Le mode choisi est sauvegardé en AsyncStorage

---

## 📚 Ressources

### Fichiers de Référence

- **Theme System** : `/src/styles/theme.ts`
- **Dark Mode Context** : `/src/contexts/DarkModeContext.tsx`
- **Theme Context** : `/src/contexts/ThemeContext.tsx`
- **useTheme Hook** : `/src/hooks/useTheme.ts`
- **App Setup** : `/App.tsx`
- **Settings Screen** : `/src/screens/SettingsScreen.tsx`

### Pattern à Suivre

```typescript
// ❌ Mauvais pattern
import { theme } from '../styles';

const MyComponent = () => (
  <View style={{ backgroundColor: '#FFFFFF' }}>
    <Text style={{ color: '#000000' }}>Hello</Text>
  </View>
);

// ✅ Bon pattern
import { useTheme } from '../hooks/useTheme';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.ui.background }}>
      <Text style={{ color: theme.colors.text.primary }}>Hello</Text>
    </View>
  );
};
```

---

## 🚀 Commencer l'Implémentation

1. **Créer une branche** : `git checkout -b feature/night-mode`
2. **Phase 1** : Corrections critiques (StatusBar, VideoPlayer, TopBar, TabBars)
3. **Phase 2** : Composants restants
4. **Phase 3** : Tests et polish
5. **Activer le toggle** dans Settings
6. **Pull Request** avec screenshots light/dark

---

**Bonne chance pour l'implémentation ! 🌙✨**
