import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 🔔 NOTIFICATION SERVICE
 *
 * Service centralisé pour gérer toutes les notifications locales de l'app.
 * Architecture modulaire pour faciliter les modifications futures.
 */

// ========================================
// 📋 CONFIGURATION CENTRALISÉE
// ========================================

/**
 * Configuration de toutes les notifications de l'app.
 *
 * ✏️ MODIFIER ICI pour changer les messages, horaires, etc.
 */
export const NOTIFICATION_CONFIG = {
  // Notification quotidienne pour enregistrer une vidéo
  dailyReminder: {
    title: '🎬 Daily Reflection',
    body: "It's time to capture your moment of the day",
    data: {
      type: 'daily_reminder',
      screen: 'RecordScreen'
    },
    // Horaire par défaut (modifiable par l'utilisateur plus tard)
    defaultHour: 19,    // 19h (7 PM)
    defaultMinute: 0,
    sound: 'default',
    priority: Notifications.AndroidNotificationPriority.HIGH,
  },

  // 🔮 FUTURS TYPES DE NOTIFICATIONS (à décommenter quand nécessaire)
  /*
  weeklyReview: {
    title: '📊 Weekly Review',
    body: 'Take a moment to reflect on your week',
    data: { type: 'weekly_review', screen: 'ChapterDetailScreen' },
    defaultDay: 0, // Sunday
    defaultHour: 10,
    defaultMinute: 0,
  },

  chapterMilestone: {
    title: '🎉 Chapter Milestone',
    body: "You've recorded 10 videos in this chapter!",
    data: { type: 'milestone' },
  },
  */
} as const;

// ========================================
// 🔑 STORAGE KEYS
// ========================================

const STORAGE_KEYS = {
  PERMISSION_STATUS: '@notification_permission_status',
  DAILY_REMINDER_ID: '@daily_reminder_notification_id',
  USER_PREFERENCES: '@notification_preferences',
} as const;

// ========================================
// 📱 TYPES
// ========================================

export type ReminderFrequency = '24h' | '3d' | '7d' | '14d' | '1m' | '2m';

export interface NotificationPreferences {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  reminderFrequency: ReminderFrequency;
  // 🔮 Futures préférences
  // weeklyReviewEnabled?: boolean;
  // weeklyReviewDay?: number;
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

// ========================================
// ⚙️ CONFIGURATION DU HANDLER
// ========================================

/**
 * Configure comment les notifications sont affichées quand l'app est au premier plan.
 *
 * ⚠️ Cette fonction DOIT être appelée au démarrage de l'app (dans App.tsx)
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,      // Afficher la notif même si app ouverte
      shouldPlaySound: true,       // Jouer le son
      shouldSetBadge: false,       // Ne pas mettre de badge sur l'icône
    }),
  });
}

// ========================================
// 🔐 GESTION DES PERMISSIONS
// ========================================

/**
 * Demande la permission d'envoyer des notifications à l'utilisateur.
 *
 * ⚠️ Sur iOS, cette popup ne peut être affichée qu'UNE SEULE FOIS.
 * Après refus, l'utilisateur doit aller manuellement dans Settings > Notifications.
 *
 * @returns Le statut de la permission
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  // Vérifier qu'on est sur un vrai appareil (pas simulateur)
  if (!Device.isDevice) {
    console.log('⚠️ Notifications ne fonctionnent pas sur simulateur');
    return 'denied';
  }

  try {
    // Vérifier le statut actuel
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    // Si pas encore demandé, demander la permission
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Sauvegarder le statut
    await AsyncStorage.setItem(STORAGE_KEYS.PERMISSION_STATUS, finalStatus);

    if (finalStatus !== 'granted') {
      console.log('❌ Permission refusée');
      return 'denied';
    }

    console.log('✅ Permission accordée');

    // Sur Android, créer le channel de notification
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return 'granted';
  } catch (error) {
    console.error('❌ Erreur lors de la demande de permission:', error);
    return 'denied';
  }
}

/**
 * Vérifie le statut actuel des permissions sans demander.
 */
export async function checkNotificationPermissions(): Promise<NotificationPermissionStatus> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as NotificationPermissionStatus;
  } catch (error) {
    console.error('❌ Erreur vérification permissions:', error);
    return 'denied';
  }
}

// ========================================
// 📅 NOTIFICATIONS QUOTIDIENNES
// ========================================

/**
 * Convertit une fréquence de reminder en secondes.
 */
function getFrequencyInSeconds(frequency: ReminderFrequency): number {
  const HOUR = 3600;
  const DAY = 86400; // 24 * 3600
  const MONTH = 2592000; // 30 * 24 * 3600

  switch (frequency) {
    case '24h':
      return DAY;
    case '3d':
      return 3 * DAY;
    case '7d':
      return 7 * DAY;
    case '14d':
      return 14 * DAY;
    case '1m':
      return MONTH;
    case '2m':
      return 2 * MONTH;
    default:
      return DAY;
  }
}

/**
 * Calcule le prochain déclenchement basé sur l'heure et la fréquence.
 */
function getNextTriggerDate(hour: number, minute: number, frequency: ReminderFrequency): Date {
  const now = new Date();
  const trigger = new Date();

  // Set to today at the specified time
  trigger.setHours(hour, minute, 0, 0);

  // If the time has already passed today, schedule for next occurrence based on frequency
  if (trigger <= now) {
    const frequencyInMs = getFrequencyInSeconds(frequency) * 1000;
    trigger.setTime(trigger.getTime() + frequencyInMs);
  }

  return trigger;
}

/**
 * Programme la notification quotidienne pour enregistrer une vidéo.
 *
 * @param hour Heure (0-23, défaut: 19h)
 * @param minute Minute (0-59, défaut: 0)
 * @param frequency Fréquence du reminder (défaut: '24h')
 * @returns L'ID de la notification programmée
 */
export async function scheduleDailyReminder(
  hour: number = NOTIFICATION_CONFIG.dailyReminder.defaultHour,
  minute: number = NOTIFICATION_CONFIG.dailyReminder.defaultMinute,
  frequency: ReminderFrequency = '24h'
): Promise<string | null> {
  try {
    // Vérifier les permissions d'abord
    const permission = await checkNotificationPermissions();
    if (permission !== 'granted') {
      console.log('⚠️ Pas de permission pour programmer des notifications');
      return null;
    }

    // Annuler l'ancienne notification quotidienne si elle existe
    const oldId = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_REMINDER_ID);
    if (oldId) {
      await Notifications.cancelScheduledNotificationAsync(oldId);
      console.log('🗑️ Ancienne notification quotidienne annulée');
    }

    // Programmer la nouvelle notification avec la fréquence
    let trigger: any;

    if (frequency === '24h') {
      // Pour 24h, utiliser le système de répétition quotidienne
      trigger = {
        hour,
        minute,
        repeats: true,
      };
    } else {
      // Pour les autres fréquences, utiliser un intervalle en secondes
      const intervalInSeconds = getFrequencyInSeconds(frequency);
      trigger = {
        seconds: intervalInSeconds,
        repeats: true,
      };
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: NOTIFICATION_CONFIG.dailyReminder.title,
        body: NOTIFICATION_CONFIG.dailyReminder.body,
        data: NOTIFICATION_CONFIG.dailyReminder.data,
        sound: NOTIFICATION_CONFIG.dailyReminder.sound,
        priority: NOTIFICATION_CONFIG.dailyReminder.priority,
      },
      trigger,
    });

    // Sauvegarder l'ID et les préférences
    await AsyncStorage.setItem(STORAGE_KEYS.DAILY_REMINDER_ID, notificationId);
    await saveNotificationPreferences({
      dailyReminderEnabled: true,
      dailyReminderHour: hour,
      dailyReminderMinute: minute,
      reminderFrequency: frequency,
    });

    const frequencyLabel = frequency === '24h' ? 'daily' : `every ${frequency}`;
    console.log(`✅ Notification programmée pour ${hour}:${minute.toString().padStart(2, '0')} (${frequencyLabel})`);
    console.log(`📝 ID: ${notificationId}`);

    return notificationId;
  } catch (error) {
    console.error('❌ Erreur programmation notification:', error);
    return null;
  }
}

/**
 * Met à jour l'horaire de la notification quotidienne.
 *
 * Utile quand l'utilisateur change ses préférences dans Settings.
 */
export async function updateDailyReminder(
  hour: number,
  minute: number,
  frequency?: ReminderFrequency
): Promise<void> {
  console.log(`🔄 Mise à jour notification quotidienne: ${hour}:${minute.toString().padStart(2, '0')}`);

  // Si pas de frequency fournie, récupérer depuis les préférences
  if (!frequency) {
    const prefs = await getNotificationPreferences();
    frequency = prefs.reminderFrequency;
  }

  await scheduleDailyReminder(hour, minute, frequency);
}

/**
 * Désactive la notification quotidienne.
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    const notificationId = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_REMINDER_ID);

    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_REMINDER_ID);

      // Mettre à jour les préférences
      const prefs = await getNotificationPreferences();
      await saveNotificationPreferences({
        ...prefs,
        dailyReminderEnabled: false,
      });

      console.log('✅ Notification quotidienne annulée');
    }
  } catch (error) {
    console.error('❌ Erreur annulation notification:', error);
  }
}

// ========================================
// 💾 PRÉFÉRENCES UTILISATEUR
// ========================================

/**
 * Sauvegarde les préférences de notification de l'utilisateur.
 */
async function saveNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(prefs));
  } catch (error) {
    console.error('❌ Erreur sauvegarde préférences:', error);
  }
}

/**
 * Récupère les préférences de notification de l'utilisateur.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);

    if (data) {
      return JSON.parse(data);
    }

    // Préférences par défaut
    return {
      dailyReminderEnabled: true,
      dailyReminderHour: NOTIFICATION_CONFIG.dailyReminder.defaultHour,
      dailyReminderMinute: NOTIFICATION_CONFIG.dailyReminder.defaultMinute,
      reminderFrequency: '24h',
    };
  } catch (error) {
    console.error('❌ Erreur lecture préférences:', error);
    return {
      dailyReminderEnabled: true,
      dailyReminderHour: NOTIFICATION_CONFIG.dailyReminder.defaultHour,
      dailyReminderMinute: NOTIFICATION_CONFIG.dailyReminder.defaultMinute,
      reminderFrequency: '24h',
    };
  }
}

// ========================================
// 🗑️ GESTION GLOBALE
// ========================================

/**
 * Annule TOUTES les notifications programmées.
 *
 * ⚠️ Utiliser avec précaution !
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_REMINDER_ID);
    console.log('🗑️ Toutes les notifications annulées');
  } catch (error) {
    console.error('❌ Erreur annulation notifications:', error);
  }
}

/**
 * Liste toutes les notifications programmées (pour debug).
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📋 ${notifications.length} notification(s) programmée(s)`);
    notifications.forEach((notif, index) => {
      console.log(`  ${index + 1}. ID: ${notif.identifier}`);
      console.log(`     Titre: ${notif.content.title}`);
      console.log(`     Trigger:`, notif.trigger);
    });
    return notifications;
  } catch (error) {
    console.error('❌ Erreur récupération notifications:', error);
    return [];
  }
}

// ========================================
// 🎯 LISTENERS (Gestion des clics)
// ========================================

/**
 * Configure le listener qui s'exécute quand l'utilisateur clique sur une notification.
 *
 * @param callback Fonction appelée avec les données de la notification
 * @returns Fonction de nettoyage (cleanup)
 *
 * @example
 * // Dans App.tsx ou navigation
 * useEffect(() => {
 *   const cleanup = setupNotificationClickListener((data) => {
 *     if (data.screen === 'RecordScreen') {
 *       navigation.navigate('RecordScreen');
 *     }
 *   });
 *   return cleanup;
 * }, []);
 */
export function setupNotificationClickListener(
  callback: (data: any) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('🔔 Notification cliquée:', data);
    callback(data);
  });

  // Retourner la fonction de nettoyage
  return () => subscription.remove();
}

/**
 * Configure le listener qui s'exécute quand une notification est reçue (app au premier plan).
 *
 * @param callback Fonction appelée avec la notification
 * @returns Fonction de nettoyage (cleanup)
 */
export function setupNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): () => void {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('🔔 Notification reçue:', notification.request.content.title);
    callback(notification);
  });

  return () => subscription.remove();
}

// ========================================
// 🚀 INITIALISATION COMPLÈTE
// ========================================

/**
 * Initialise le système de notifications au démarrage de l'app.
 *
 * Cette fonction:
 * 1. Configure le handler
 * 2. Vérifie les permissions
 * 3. Programme la notification quotidienne si activée
 *
 * ⚠️ À appeler dans App.tsx au démarrage
 */
export async function initializeNotifications(): Promise<void> {
  console.log('🔔 Initialisation du système de notifications...');

  try {
    // 1. Configurer le handler
    configureNotificationHandler();

    // 2. Vérifier les permissions
    const permission = await checkNotificationPermissions();
    console.log(`📋 Statut permissions: ${permission}`);

    // 3. Si granted, vérifier les préférences et programmer
    if (permission === 'granted') {
      const prefs = await getNotificationPreferences();

      if (prefs.dailyReminderEnabled) {
        await scheduleDailyReminder(
          prefs.dailyReminderHour,
          prefs.dailyReminderMinute,
          prefs.reminderFrequency
        );
      }
    }

    console.log('✅ Système de notifications initialisé');
  } catch (error) {
    console.error('❌ Erreur initialisation notifications:', error);
  }
}
