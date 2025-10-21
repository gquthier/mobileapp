# 🌙 Night Mode - Guide de Restauration Rapide

## 📦 Fichiers de Sauvegarde

Les modifications Night Mode ont été sauvegardées dans les fichiers suivants :

- **`NIGHT_MODE_PATCH.diff`** : Patch Git complet avec toutes les modifications
- **`NIGHT_MODE_SCREENS_PATCH.diff`** : Patch des screens uniquement (HomeScreen, LibraryScreen, ChapterDetailScreen)
- **`NIGHT_MODE_IMPLEMENTATION.md`** : Documentation complète du plan d'implémentation

## 🔄 Comment Réactiver le Night Mode

### Méthode 1 : Appliquer le patch Git (Recommandée)

```bash
# Appliquer toutes les modifications Night Mode en une seule commande
git apply NIGHT_MODE_PATCH.diff

# Ou seulement les screens (si TopBar et App.tsx sont déjà modifiés)
git apply NIGHT_MODE_SCREENS_PATCH.diff
```

### Méthode 2 : Utiliser le commit Git existant

```bash
# Option A : Cherry-pick le commit Night Mode
git cherry-pick 3df0f25  # 🌙 FEATURE: Night Mode implementation complete

# Option B : Merger la branche feature/night-mode (si elle existe)
git merge feature/night-mode
```

### Méthode 3 : Modifications Manuelles

Si vous préférez réappliquer manuellement, voici les fichiers modifiés :

1. **`App.tsx`**
   - Créer composant `AppContent` qui utilise `useDarkMode()`
   - Rendre StatusBar dynamique : `<StatusBar style={isDarkMode ? "light" : "dark"} />`

2. **`src/components/TopBar.tsx`**
   - Remplacer `import { theme } from '../styles'` par `import { useTheme } from '../hooks/useTheme'`
   - Ajouter `const theme = useTheme();` dans le composant

3. **`src/screens/HomeScreen.tsx`**
   - Remplacer import statique par `useTheme()` hook
   - Background dynamique : `backgroundColor: theme.colors.ui.background`

4. **`src/screens/LibraryScreen.tsx`**
   - Import hybride : `import { theme as staticTheme }` pour StyleSheet
   - Utiliser `useTheme()` pour background dynamique
   - Remplacer `theme.` par `staticTheme.` dans les styles

5. **`src/screens/ChapterDetailScreen.tsx`**
   - Même approche que LibraryScreen
   - Background container dynamique

6. **`src/screens/SettingsScreen.tsx`**
   - Activer le toggle Night Mode dans la section "Appearance"

## ✅ Checklist de Vérification

Après réactivation, vérifier :

- [ ] Toggle Night Mode visible dans Settings → Appearance
- [ ] Background de HomeScreen change avec le toggle
- [ ] Background de LibraryScreen change (vues Calendar et Grid)
- [ ] Background de ChapterDetailScreen change
- [ ] StatusBar change de couleur (light/dark)
- [ ] TopBar s'adapte au thème
- [ ] Persistance AsyncStorage fonctionne (mode sauvegardé au redémarrage)

## 🎨 Palettes de Couleurs

### Light Theme
```typescript
{
  ui: {
    background: '#FFFFFF',      // Blanc
    surface: '#FFFFFF',
    surfaceHover: '#FCFCFC'
  },
  text: {
    primary: '#0D0D0D',         // Noir
    secondary: '#666666',
    tertiary: '#999999'
  }
}
```

### Dark Theme
```typescript
{
  ui: {
    background: '#000000',      // Noir pur
    surface: '#0D0D0D',
    surfaceHover: '#1A1A1A'
  },
  text: {
    primary: '#FFFFFF',         // Blanc
    secondary: '#E6E6E6',
    tertiary: '#CCCCCC'
  }
}
```

## 📚 Architecture Existante

**Déjà implémenté (70%)** :
- ✅ Système de thème complet dans `/src/styles/theme.ts`
- ✅ DarkModeContext avec persistance AsyncStorage
- ✅ Hook `useTheme()` qui combine dark mode + brand colors
- ✅ ~50 composants utilisent déjà le système de thème

**Ce qui manquait (30%)** :
- StatusBar dynamique
- Backgrounds des screens principaux
- TopBar utilisant le hook dynamique

## 🔧 Commandes Utiles

```bash
# Voir les différences entre backup et Night Mode
git diff backup-before-night-mode 3df0f25

# Voir uniquement les fichiers modifiés
git diff --name-only backup-before-night-mode 3df0f25

# Voir le patch complet
cat NIGHT_MODE_PATCH.diff
```

## 🏷️ Tags Git

- **`backup-before-night-mode`** : État juste avant Night Mode
- **`v1.0.0-night-mode`** : Version avec Night Mode complet

## 📝 Notes

- Le Night Mode a été désactivé le 2025-10-21
- Raison : Besoin de revenir à la version stable pour continuer le développement
- Tous les fichiers sont sauvegardés et prêts à être réappliqués
- Temps d'implémentation estimé : ~30 minutes avec les patchs
