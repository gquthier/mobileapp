// Service de sauvegarde et upload en arrière-plan pour les vidéos
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

interface PendingVideo {
  id: string;
  localUri: string;
  title: string;
  userId: string;
  createdAt: string;
  uploadAttempts: number;
  fileSize: number;
}

const PENDING_VIDEOS_KEY = '@pending_videos';
const BACKUP_FOLDER_NAME = 'video_backups'; // ✅ Relatif (survit aux changements de container iOS)

/**
 * Obtenir le chemin absolu du dossier de backup
 * Reconstruit dynamiquement à chaque accès pour survivre aux changements de container iOS
 */
const getBackupDirectory = (): string => {
  return `${FileSystem.documentDirectory}${BACKUP_FOLDER_NAME}/`;
};

export class VideoBackupService {

  /**
   * Sauvegarde une vidéo localement AVANT l'upload
   * Cela garantit qu'on ne perd jamais une vidéo même en cas de crash
   * Retourne { backupUri, videoId }
   */
  static async backupVideoLocally(
    videoUri: string,
    title: string,
    userId: string
  ): Promise<{ backupUri: string; videoId: string }> {
    try {
      console.log('💾 Backing up video locally before upload...');

      // Créer le dossier de backup s'il n'existe pas
      const backupDirectory = getBackupDirectory();
      const dirInfo = await FileSystem.getInfoAsync(backupDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupDirectory, { intermediates: true });
        console.log('📁 Created backup directory:', backupDirectory);
      }

      // Copier la vidéo dans le dossier permanent
      const timestamp = Date.now();
      const backupFileName = `backup_${timestamp}.mov`;
      const backupUri = `${backupDirectory}${backupFileName}`;

      await FileSystem.copyAsync({
        from: videoUri,
        to: backupUri,
      });

      console.log('✅ Video backed up to:', backupUri);

      // Sauvegarder les métadonnées dans AsyncStorage
      const fileInfo = await FileSystem.getInfoAsync(backupUri);
      const videoId = `pending_${timestamp}`;
      const pendingVideo: PendingVideo = {
        id: videoId,
        localUri: backupFileName, // ✅ Stocker SEULEMENT le filename relatif (pas le chemin absolu)
        title,
        userId,
        createdAt: new Date().toISOString(),
        uploadAttempts: 0,
        fileSize: fileInfo.size || 0,
      };

      await this.addPendingVideo(pendingVideo);
      console.log('📝 Stored relative path in AsyncStorage:', backupFileName);

      return { backupUri, videoId };
    } catch (error) {
      console.error('❌ Error backing up video:', error);
      throw error;
    }
  }

  /**
   * Ajoute une vidéo à la liste des uploads en attente
   */
  private static async addPendingVideo(video: PendingVideo): Promise<void> {
    try {
      const pending = await this.getPendingVideos();
      pending.push(video);
      await AsyncStorage.setItem(PENDING_VIDEOS_KEY, JSON.stringify(pending));
      console.log('📝 Added to pending videos:', video.id);
    } catch (error) {
      console.error('❌ Error adding pending video:', error);
    }
  }

  /**
   * Récupère toutes les vidéos en attente d'upload
   * ✅ Reconstruit dynamiquement les chemins absolus à partir des noms relatifs
   * ✅ Backward compatible avec les anciens chemins absolus (file://)
   */
  static async getPendingVideos(): Promise<PendingVideo[]> {
    try {
      const data = await AsyncStorage.getItem(PENDING_VIDEOS_KEY);
      if (!data) return [];

      const videos: PendingVideo[] = JSON.parse(data);
      const backupDirectory = getBackupDirectory();

      // ✅ Reconstruire les chemins absolus à partir des noms relatifs
      return videos.map(video => {
        // Détection: ancien format (chemin absolu) vs nouveau format (filename relatif)
        const isLegacyAbsolutePath = video.localUri.startsWith('file://') ||
                                      video.localUri.includes('/Documents/') ||
                                      video.localUri.includes('/video_backups/');

        if (isLegacyAbsolutePath) {
          // Legacy: déjà un chemin absolu (backward compatible)
          console.log('📦 [Legacy] Found absolute path:', video.localUri);
          return video;
        } else {
          // Nouveau: filename relatif → reconstruire chemin absolu
          const absolutePath = `${backupDirectory}${video.localUri}`;
          console.log(`🔄 [Relative] Reconstructed path: ${video.localUri} → ${absolutePath}`);
          return {
            ...video,
            localUri: absolutePath
          };
        }
      });
    } catch (error) {
      console.error('❌ Error getting pending videos:', error);
      return [];
    }
  }

  /**
   * Supprime une vidéo de la liste des uploads en attente
   */
  static async removePendingVideo(videoId: string): Promise<void> {
    try {
      const pending = await this.getPendingVideos();
      const filtered = pending.filter(v => v.id !== videoId);
      await AsyncStorage.setItem(PENDING_VIDEOS_KEY, JSON.stringify(filtered));
      console.log('🗑️ Removed from pending videos:', videoId);
    } catch (error) {
      console.error('❌ Error removing pending video:', error);
    }
  }

  /**
   * Supprime le fichier local de backup après upload réussi
   */
  static async deleteLocalBackup(videoUri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(videoUri, { idempotent: true });
        console.log('🗑️ Deleted local backup:', videoUri);
      }
    } catch (error) {
      console.error('❌ Error deleting local backup:', error);
    }
  }

  /**
   * Tente d'uploader toutes les vidéos en attente
   * Appelé au démarrage de l'app pour reprendre les uploads interrompus
   */
  static async uploadPendingVideos(): Promise<void> {
    try {
      const pending = await this.getPendingVideos();

      if (pending.length === 0) {
        console.log('✅ No pending videos to upload');
        return;
      }

      console.log(`📤 Found ${pending.length} pending video(s) to upload`);

      for (const video of pending) {
        try {
          // Vérifier que le fichier existe toujours
          const fileInfo = await FileSystem.getInfoAsync(video.localUri);
          if (!fileInfo.exists) {
            console.warn('⚠️ Backup file not found, removing from pending:', video.id);
            await this.removePendingVideo(video.id);
            continue;
          }

          console.log(`🔄 Attempting to upload pending video: ${video.title}`);

          // Import VideoService dynamiquement pour éviter circular dependency
          const { VideoService } = require('./videoService');
          const uploadedVideo = await VideoService.uploadVideo(
            video.localUri,
            video.title,
            video.userId
          );

          if (uploadedVideo) {
            console.log('✅ Pending video uploaded successfully:', video.title);

            // Supprimer le backup local et de la liste
            await this.deleteLocalBackup(video.localUri);
            await this.removePendingVideo(video.id);
          }

        } catch (uploadError) {
          console.error('❌ Failed to upload pending video:', video.title, uploadError);

          // Incrémenter le compteur de tentatives
          const pending = await this.getPendingVideos();
          const updated = pending.map(v =>
            v.id === video.id
              ? { ...v, uploadAttempts: v.uploadAttempts + 1 }
              : v
          );
          await AsyncStorage.setItem(PENDING_VIDEOS_KEY, JSON.stringify(updated));

          // Abandonner après 5 tentatives
          if (video.uploadAttempts >= 5) {
            console.error('❌ Max upload attempts reached for:', video.title);
            // Garder le fichier local mais retirer de la queue
            await this.removePendingVideo(video.id);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error uploading pending videos:', error);
    }
  }

  /**
   * Récupère le nombre total de vidéos en attente
   */
  static async getPendingCount(): Promise<number> {
    const pending = await this.getPendingVideos();
    return pending.length;
  }

  /**
   * Récupère la taille totale des vidéos en attente (en MB)
   */
  static async getPendingSize(): Promise<number> {
    const pending = await this.getPendingVideos();
    const totalBytes = pending.reduce((sum, v) => sum + v.fileSize, 0);
    return totalBytes / (1024 * 1024); // Convert to MB
  }

  /**
   * ✅ Nettoie les backups avec chemins invalides (après reinstall/update app)
   * Supprime les entrées AsyncStorage pour les fichiers qui n'existent plus
   * À appeler au démarrage de l'app après uploadPendingVideos()
   */
  static async cleanupInvalidBackups(): Promise<void> {
    try {
      console.log('🧹 [Cleanup] Checking for invalid backup paths...');
      const data = await AsyncStorage.getItem(PENDING_VIDEOS_KEY);
      if (!data) {
        console.log('✅ [Cleanup] No pending videos to check');
        return;
      }

      const videos: PendingVideo[] = JSON.parse(data);
      let removedCount = 0;

      // Filtrer les vidéos dont les fichiers existent
      const validVideos: PendingVideo[] = [];

      for (const video of videos) {
        const backupDirectory = getBackupDirectory();

        // Reconstruire le chemin absolu si nécessaire
        const isLegacy = video.localUri.startsWith('file://') ||
                         video.localUri.includes('/Documents/') ||
                         video.localUri.includes('/video_backups/');

        const absolutePath = isLegacy
          ? video.localUri
          : `${backupDirectory}${video.localUri}`;

        // Vérifier si le fichier existe
        const fileInfo = await FileSystem.getInfoAsync(absolutePath);

        if (fileInfo.exists) {
          // ✅ Fichier existe, le garder (mais migrer vers format relatif si legacy)
          if (isLegacy) {
            // Extraire le filename du chemin absolu
            const filename = absolutePath.split('/').pop() || video.localUri;
            console.log(`🔄 [Cleanup] Migrating legacy path to relative: ${video.localUri} → ${filename}`);
            validVideos.push({
              ...video,
              localUri: filename // Migrer vers format relatif
            });
          } else {
            validVideos.push(video);
          }
        } else {
          // ❌ Fichier n'existe pas, le supprimer
          console.warn(`🗑️ [Cleanup] Removing invalid backup: ${video.id} (path: ${absolutePath})`);
          removedCount++;
        }
      }

      // Sauvegarder la liste nettoyée
      if (removedCount > 0) {
        await AsyncStorage.setItem(PENDING_VIDEOS_KEY, JSON.stringify(validVideos));
        console.log(`✅ [Cleanup] Removed ${removedCount} invalid backup(s), ${validVideos.length} remaining`);
      } else {
        console.log(`✅ [Cleanup] All ${validVideos.length} backup(s) are valid`);
      }
    } catch (error) {
      console.error('❌ [Cleanup] Error cleaning up invalid backups:', error);
    }
  }
}
