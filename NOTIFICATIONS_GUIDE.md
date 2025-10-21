# 🔔 Guide des Notifications - Chapters App

## 📋 Vue d'ensemble

Le système de notifications locales est **entièrement configuré et fonctionnel**. Tous les utilisateurs recevront une notification quotidienne à **19h (7 PM)** pour les rappeler d'enregistrer leur vidéo du jour.

---

## ✅ Ce qui est déjà configuré

- ✅ Package `expo-notifications` installé
- ✅ Configuration iOS dans `app.json`
- ✅ Service centralisé dans `src/services/notificationService.ts`
- ✅ Initialisation au démarrage de l'app
- ✅ Demande de permission après l'onboarding
- ✅ Navigation automatique vers RecordScreen au clic
- ✅ Notification quotidienne programmée à 19h

---

## 🎯 Comment utiliser

### 1️⃣ Tester sur un vrai iPhone

⚠️ **IMPORTANT** : Les notifications **ne fonctionnent PAS sur simulateur**, seulement sur un vrai iPhone.

```bash
# Rebuild l'app avec le nouveau plugin
eas build --platform ios --profile development

# Ou pour production
eas build --platform ios --profile production
```

### 2️⃣ Tester la notification

Après installation sur iPhone:
1. L'app demandera la permission de notifications après l'onboarding
2. Accepter la permission
3. La notification quotidienne est automatiquement programmée pour 19h
4. Pour tester immédiatement, voir "Debug" ci-dessous

---

## ✏️ Modifier la notification quotidienne

### Changer le message

Ouvrir `src/services/notificationService.ts` et modifier `NOTIFICATION_CONFIG`:

```typescript
export const NOTIFICATION_CONFIG = {
  dailyReminder: {
    title: '🎬 Daily Reflection',          // ← MODIFIER ICI
    body: "It's time to capture your moment", // ← MODIFIER ICI
    defaultHour: 19,    // ← Heure (0-23)
    defaultMinute: 0,   // ← Minutes (0-59)
  },
}
```

### Changer l'horaire par défaut

Modifier `defaultHour` et `defaultMinute` dans la config ci-dessus.

**Exemples:**
- `defaultHour: 8` → Notification à 8h du matin
- `defaultHour: 21, defaultMinute: 30` → Notification à 21h30

---

## 🔧 Fonctions disponibles

Dans ton code, tu peux utiliser ces fonctions:

```typescript
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  updateDailyReminder,
  getNotificationPreferences,
  getAllScheduledNotifications,
} from '../services/notificationService';

// Programmer à une heure spécifique
await scheduleDailyReminder(20, 30); // 20h30

// Annuler la notification quotidienne
await cancelDailyReminder();

// Mettre à jour l'horaire
await updateDailyReminder(18, 0); // Changer à 18h

// Voir les préférences
const prefs = await getNotificationPreferences();
console.log(prefs.dailyReminderHour); // 19

// Debug: lister toutes les notifications programmées
await getAllScheduledNotifications();
```

---

## 🎨 Ajouter des préférences utilisateur (TODO futur)

Pour permettre à l'utilisateur de choisir son horaire dans Settings:

### 1. Ajouter un picker dans `SettingsScreen.tsx`

```typescript
import { scheduleDailyReminder } from '../services/notificationService';

// Dans le composant
const [hour, setHour] = useState(19);
const [minute, setMinute] = useState(0);

// Quand l'utilisateur change l'heure
const handleTimeChange = async (newHour: number, newMinute: number) => {
  setHour(newHour);
  setMinute(newMinute);
  await scheduleDailyReminder(newHour, newMinute);
};
```

### 2. Ajouter un toggle ON/OFF

```typescript
import { scheduleDailyReminder, cancelDailyReminder } from '../services/notificationService';

const [enabled, setEnabled] = useState(true);

const handleToggle = async (value: boolean) => {
  setEnabled(value);

  if (value) {
    await scheduleDailyReminder(hour, minute);
  } else {
    await cancelDailyReminder();
  }
};
```

---

## 🐛 Debug et tests

### Voir toutes les notifications programmées

```typescript
import { getAllScheduledNotifications } from '../services/notificationService';

// Dans n'importe quel écran
await getAllScheduledNotifications();
// Affiche dans la console toutes les notifs avec leurs horaires
```

### Tester immédiatement (sans attendre 19h)

Ouvrir `src/services/notificationService.ts` et chercher la fonction `scheduleDailyReminder`:

```typescript
// TEMPORAIRE POUR TEST: Notif dans 10 secondes
trigger: {
  seconds: 10,  // ← Ajouter ça temporairement
  // hour,      // ← Commenter ça
  // minute,    // ← Commenter ça
  // repeats: true,
}
```

Rebuild l'app, et la notification apparaîtra dans 10 secondes!

⚠️ **N'oublie pas de remettre le code normal après le test!**

### Forcer une nouvelle demande de permission

Si tu as refusé la permission et veux re-tester:

1. Sur iPhone: Settings → Chapters → Notifications → Activer
2. Ou: Supprimer l'app et réinstaller

---

## 🔮 Futurs types de notifications (déjà préparés)

Le système est **extensible**. Dans `NOTIFICATION_CONFIG`, tu peux décommenter:

```typescript
weeklyReview: {
  title: '📊 Weekly Review',
  body: 'Take a moment to reflect on your week',
  defaultDay: 0, // Sunday
  defaultHour: 10,
},

chapterMilestone: {
  title: '🎉 Chapter Milestone',
  body: "You've recorded 10 videos!",
},
```

Il faudra créer les fonctions `scheduleWeeklyReview()` et `triggerMilestoneNotification()` en suivant le pattern de `scheduleDailyReminder()`.

---

## ❓ FAQ

### La notification n'apparaît pas?

1. ✅ Vérifier que tu es sur un **vrai iPhone** (pas simulateur)
2. ✅ Vérifier que l'app a la **permission** (Settings → Notifications)
3. ✅ Vérifier qu'une notification est programmée: `await getAllScheduledNotifications()`
4. ✅ Tester avec `trigger: { seconds: 10 }` pour avoir une notif immédiate

### Comment changer le son?

Dans `NOTIFICATION_CONFIG`:

```typescript
sound: 'default',  // Son par défaut iOS
// ou
sound: 'custom_sound.wav',  // Ajouter le fichier dans assets/sounds/
```

### Puis-je envoyer des notifications depuis Supabase?

Oui! Pour ça il faudra passer aux **Push Notifications** (plus complexe):
1. Compte Apple Developer payant (99$/an)
2. Créer une APNs Key
3. Configurer EAS Credentials
4. Utiliser Expo Push API depuis Supabase Edge Functions

Voir le guide détaillé que je t'ai fourni précédemment.

---

## 📞 Support

Le code est **entièrement commenté** dans `src/services/notificationService.ts`. Chaque fonction a une description claire de ce qu'elle fait.

**Fichiers importants:**
- `src/services/notificationService.ts` → Service principal
- `src/navigation/AppNavigator.tsx` → Navigation au clic
- `App.tsx` → Initialisation
- `app.json` → Configuration iOS

---

**✅ Le système est prêt à l'emploi! Rebuild l'app et teste sur iPhone!** 🚀
