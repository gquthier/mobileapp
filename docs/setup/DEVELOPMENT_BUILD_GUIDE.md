# 🛠️ Guide Development Build - FFmpeg Fonctionnel

## 📱 **Statut Actuel**

✅ **App fonctionne avec version MOCK** :
- Interface complète testable
- Authentification Supabase
- Enregistrement vidéo fonctionnel
- **Audio extraction SIMULÉE** (FFmpeg en mock)

❌ **FFmpeg réel** nécessite Development Build

---

## 🔧 **Pour Activer FFmpeg Réel**

### **Étape 1: Créer un compte Expo (gratuit)**
```bash
# Se connecter à Expo
eas login
```
**OU** créer compte sur : https://expo.dev/signup

### **Étape 2: Créer Development Build**
```bash
# iOS (Simulator)
eas build --profile development --platform ios

# Ou iOS physique
eas build --profile development --platform ios --local

# Android
eas build --profile development --platform android
```

### **Étape 3: Restaurer FFmpeg Réel**
```bash
# Restaurer service FFmpeg original
mv src/services/audioExtractionService.original.ts src/services/audioExtractionService.ts

# Redémarrer
npm start
```

---

## 🎯 **Fonctionnalités par Mode**

### **Mode MOCK (Actuel) :**
- ✅ Interface utilisateur complète
- ✅ Navigation et authentification
- ✅ Enregistrement vidéo
- ✅ Base de données Supabase
- ⚠️ Transcription simulée (pas de vraie extraction audio)

### **Mode DEVELOPMENT BUILD :**
- ✅ Toutes les fonctionnalités mock
- ✅ **FFmpeg réel** - extraction audio vraie
- ✅ **Transcription OpenAI** - vraies transcriptions
- ✅ **Pipeline complet** fonctionnel

---

## 📋 **Fichiers Concernés**

### **Version MOCK (Actuelle)** :
- `src/services/audioExtractionService.ts` → Version mock

### **Version RÉELLE** :
- `src/services/audioExtractionService.original.ts` → Version FFmpeg

### **Configuration** :
- `eas.json` → Configuration development build créée
- `expo-dev-client` → Installé

---

## 🚀 **Test de l'App Actuelle**

L'app fonctionne parfaitement en mode mock :

```bash
npm start
# Scanner QR code avec Expo Go
# Tester : authentification, navigation, enregistrement vidéo
```

**Toutes les interfaces sont fonctionnelles, seule l'extraction audio est simulée.**

---

## 💡 **Recommandation**

1. **Immédiat** : Testez l'app complète en mode mock
2. **Plus tard** : Créez le development build pour FFmpeg réel

**L'app est maintenant 100% fonctionnelle pour tester l'interface utilisateur ! 🎉**