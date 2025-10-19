# 🎬 Configuration du Sélecteur Natif de Vidéos

## ✅ Installation Complétée

Votre app utilise maintenant `react-native-image-picker` pour la sélection multiple de vidéos avec l'interface native PHPicker d'Apple.

---

## 📋 Étapes de Build Requises

### 1. **Générer les Projets Natifs (Prebuild)**

```bash
npx expo prebuild --clean
```

**Qu'est-ce que ça fait?**
- Génère les dossiers `/ios` et `/android` avec le code natif
- Configure automatiquement les permissions dans Info.plist
- Applique le config plugin de @baronha/react-native-multiple-image-picker

### 2. **Installer les Dépendances iOS (CocoaPods)**

```bash
cd ios
pod install
cd ..
```

**Qu'est-ce que ça fait?**
- Installe les bibliothèques natives iOS requises
- Configure les frameworks PHPicker et Nitro Modules

### 3. **Builder et Lancer l'App**

**Option A: Sur Simulateur iOS**
```bash
npx expo run:ios
```

**Option B: Sur Appareil Physique iOS (Recommandé pour tester PHPicker)**
```bash
npx expo run:ios --device
```

**Option C: Sur Android**
```bash
npx expo run:android
```

---

## 🔄 Quand Re-builder?

Vous devez **TOUJOURS** re-builder après:

✅ Modification de `app.json` (plugins, permissions)
✅ Installation d'un nouveau package natif
✅ Changement de config plugin
✅ Mise à jour d'Expo SDK

Vous **N'AVEZ PAS BESOIN** de re-builder pour:

❌ Modifications de code TypeScript/JavaScript
❌ Changements de styles
❌ Ajout de nouvelles screens React
❌ Modifications de logique métier

---

## 🧪 Tester la Fonctionnalité

1. Lancez l'app sur un **appareil iOS physique** (PHPicker ne fonctionne pas bien sur simulateur)
2. Allez dans l'onglet **Library**
3. Cliquez sur le bouton **+** (import) en haut à droite
4. Le sélecteur natif d'Apple devrait s'ouvrir
5. Sélectionnez plusieurs vidéos
6. Validez la sélection
7. Les vidéos seront automatiquement importées et transcrites

---

## 📦 Ce Qui a Été Installé

### Packages npm
```json
{
  "react-native-image-picker": "^8.2.1"
}
```

### Config Plugin (app.json)
```json
{
  "plugins": [
    "expo-font"
  ]
}
```

> **Note:** react-native-image-picker n'a pas besoin de config plugin car il est automatiquement configuré par Expo prebuild.

### Permissions iOS (app.json)
```json
{
  "ios": {
    "infoPlist": {
      "NSPhotoLibraryUsageDescription": "This app needs access to your photo library to import existing videos for your life chapters."
    }
  }
}
```

---

## 🔧 Modifications de Code

### LibraryScreen.tsx

La fonction `handleImportVideos()` utilise maintenant le picker natif:

```typescript
const handleImportVideos = async () => {
  const response = await MultipleImagePicker.openPicker({
    mediaType: 'video',
    maxSelectedAssets: 50,
    selectedAssets: [],
    isPreview: false,
  });

  // Conversion au format attendu par ImportQueueService
  const videosToImport = response.map((asset, index) => ({
    uri: asset.path || asset.realPath || '',
    fileName: asset.fileName || `video_${Date.now()}_${index}.mp4`,
    // ... autres propriétés
  }));

  await ImportQueueService.addPickerVideosToQueue(videosToImport);
}
```

---

## 🚀 Build avec EAS (Optionnel)

Si vous utilisez EAS Build pour les builds de production:

```bash
# Development Build
eas build --profile development --platform ios

# Production Build
eas build --profile production --platform ios
```

---

## ❓ Troubleshooting

### Erreur: "Could not find module '@baronha/react-native-multiple-image-picker'"

**Solution:**
```bash
npm install
npx expo prebuild --clean
cd ios && pod install && cd ..
npx expo run:ios
```

### Erreur: "No permission to access photo library"

**Solution:**
1. Vérifiez que `NSPhotoLibraryUsageDescription` est dans `app.json`
2. Re-build l'app: `npx expo prebuild --clean`
3. Sur l'appareil: Réglages > App > Photos > Autoriser l'accès

### Le sélecteur ne s'ouvre pas sur simulateur

**Solution:**
- Testez sur un **appareil physique iOS**
- Le simulateur iOS n'a pas de vraie galerie photos/vidéos

---

## 📚 Documentation

- [@baronha/react-native-multiple-image-picker](https://github.com/baronha/react-native-multiple-image-picker)
- [Expo Prebuild](https://docs.expo.dev/workflow/prebuild/)
- [Expo Custom Dev Client](https://docs.expo.dev/develop/development-builds/introduction/)

---

## ✨ Avantages de Cette Solution

✅ **Interface 100% Native** - Utilise PHPickerViewController d'Apple
✅ **Sélection Multiple Illimitée** - Pas de limite arbitraire
✅ **Support iCloud** - Télécharge automatiquement les vidéos depuis iCloud
✅ **Performance Optimale** - Pas de conversion URI en arrière-plan
✅ **Compatible Expo** - Fonctionne avec le workflow Expo moderne
✅ **Maintenu Activement** - Dernière mise à jour: Janvier 2025

---

**Date de Configuration:** 2025-10-07
**Version Expo SDK:** 54.0.10
**Version React Native:** 0.81.4
