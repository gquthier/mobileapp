// Composant bouton pour la transcription sécurisée
import React from 'react';
import { TouchableOpacity, Text, View, Alert } from 'react-native';
import { LoadingDots } from './LoadingDots';
import { useTheme } from '../contexts/ThemeContext';
import { useSecureTranscription } from '../hooks/useSecureTranscription';
import { theme } from '../styles/theme';

interface SecureTranscriptionButtonProps {
  videoId: string;
  localVideoUri?: string;    // ✅ URI local du fichier vidéo
  storageFilePath?: string;  // ✅ OU chemin dans Supabase Storage
  language?: string;
  style?: any;
  onTranscriptionComplete?: (text: string, segments: any[]) => void;
}

export const SecureTranscriptionButton: React.FC<SecureTranscriptionButtonProps> = ({
  videoId,
  localVideoUri,
  storageFilePath,
  language = 'fr',
  style,
  onTranscriptionComplete
}) => {
  const { brandColor } = useTheme();
  const {
    isTranscribing,
    transcriptionStatus,
    error,
    startTranscription,
    startTranscriptionFromStorage,
    retryTranscription,
    clearError,
    transcriptionText,
    transcriptionSegments
  } = useSecureTranscription(videoId);

  // Appeler le callback quand la transcription est terminée
  React.useEffect(() => {
    if (transcriptionStatus?.processing_status === 'completed' && transcriptionText && transcriptionSegments) {
      onTranscriptionComplete?.(transcriptionText, transcriptionSegments);
    }
  }, [transcriptionStatus, transcriptionText, transcriptionSegments, onTranscriptionComplete]);

  const handlePress = async () => {
    try {
      clearError();

      // Vérifier qu'on a au moins une source de fichier
      if (!localVideoUri && !storageFilePath) {
        Alert.alert('Erreur', 'Aucun fichier vidéo spécifié');
        return;
      }

      if (transcriptionStatus?.processing_status === 'failed') {
        // Retry si échec précédent - utiliser la même source
        if (localVideoUri) {
          await startTranscription(videoId, localVideoUri, language);
        } else if (storageFilePath) {
          await startTranscriptionFromStorage(videoId, storageFilePath, language);
        }
      } else if (!transcriptionStatus || transcriptionStatus.processing_status !== 'completed') {
        // Démarrer nouvelle transcription
        if (localVideoUri) {
          console.log('🚀 Starting transcription from local file');
          await startTranscription(videoId, localVideoUri, language);
        } else if (storageFilePath) {
          console.log('🚀 Starting transcription from storage');
          await startTranscriptionFromStorage(videoId, storageFilePath, language);
        }
      } else {
        // Déjà transcrit, montrer le résultat
        if (transcriptionText) {
          Alert.alert(
            'Transcription',
            transcriptionText.substring(0, 200) + (transcriptionText.length > 200 ? '...' : ''),
            [{ text: 'OK' }]
          );
        }
      }
    } catch (err) {
      console.error('Transcription action failed:', err);
    }
  };

  const getButtonText = () => {
    if (isTranscribing) return 'Transcription en cours...';
    if (error) return 'Réessayer';
    if (transcriptionStatus?.processing_status === 'completed') return 'Voir transcription';
    if (transcriptionStatus?.processing_status === 'failed') return 'Réessayer';
    return 'Transcrire';
  };

  const getButtonColor = () => {
    if (error || transcriptionStatus?.processing_status === 'failed') return '#ef4444';
    if (transcriptionStatus?.processing_status === 'completed') return '#22c55e';
    return theme.colors.primary;
  };

  return (
    <View style={style}>
      <TouchableOpacity
        style={[
          {
            backgroundColor: getButtonColor(),
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
          },
          isTranscribing && { opacity: 0.7 }
        ]}
        onPress={handlePress}
        disabled={isTranscribing}
        activeOpacity={0.7}
      >
        {isTranscribing ? (
          <>
            <View style={{ marginRight: 8 }}>
              <LoadingDots color={brandColor} size={6} />
            </View>
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
              {getButtonText()}
            </Text>
          </>
        ) : (
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
            {getButtonText()}
          </Text>
        )}
      </TouchableOpacity>

      {/* Affichage des erreurs */}
      {error && (
        <View style={{
          marginTop: 8,
          padding: 8,
          backgroundColor: '#fef2f2',
          borderRadius: 6,
          borderWidth: 1,
          borderColor: '#fecaca'
        }}>
          <Text style={{ color: '#dc2626', fontSize: 12 }}>
            Erreur: {error}
          </Text>
        </View>
      )}

      {/* Indicateur de statut */}
      {transcriptionStatus && !error && (
        <View style={{ marginTop: 4, alignItems: 'center' }}>
          <Text style={{
            fontSize: 11,
            color: theme.colors.gray600,
            textTransform: 'capitalize'
          }}>
            {transcriptionStatus.processing_status === 'processing' && '⏳ Traitement...'}
            {transcriptionStatus.processing_status === 'completed' && '✅ Terminé'}
            {transcriptionStatus.processing_status === 'failed' && '❌ Échec'}
          </Text>
          {transcriptionStatus.completed_at && (
            <Text style={{ fontSize: 10, color: theme.colors.gray500 }}>
              {new Date(transcriptionStatus.completed_at).toLocaleString('fr-FR')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};