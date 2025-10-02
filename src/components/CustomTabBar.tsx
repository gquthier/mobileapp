import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';


export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  const handleLeftPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigation vers Library ou Home selon logique métier
    navigation.navigate('Library');
  };

  const handleCenterPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const currentRoute = state.routes[state.index].name;

    if (currentRoute === 'Record') {
      // Si on est déjà sur Record, déclencher l'enregistrement
      // On peut utiliser navigation.setParams ou un event système
      navigation.setParams({ triggerRecording: Date.now() });
    } else {
      // Sinon, naviguer vers Record
      navigation.navigate('Record');
    }
  };

  const handleRightPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigation vers Settings ou menu
    navigation.navigate('Settings');
  };

  const isRecordActive = state.routes[state.index].name === 'Record';
  const currentRoute = state.routes[state.index];
  const isRecording = currentRoute.params?.isRecording || false;
  const isPaused = currentRoute.params?.isPaused || false;

  return (
    <View style={[styles.container, isRecordActive && styles.containerTransparent]}>
      <View style={styles.contentContainer}>
        {/* Bouton gauche - Barres verticales + inclinée - Caché pendant l'enregistrement */}
        {!isRecording && (
          <TouchableOpacity
            style={[styles.sideButton, isRecordActive && styles.sideButtonRecording]}
            onPress={handleLeftPress}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Navigation gauche"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image
              source={require('../../assets/icon-nav-gauche.png')}
              style={[styles.sideIcon, isRecordActive && styles.sideIconRecording]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        {/* Bouton central - Rouge pendant l'enregistrement, noir transparent en pause */}
        <TouchableOpacity
          style={[
            styles.centerButton,
            isRecordActive && styles.centerButtonRecordScreen,
            isRecording && !isPaused && styles.centerButtonRecording, // Rouge si enregistrement actif
            isPaused && styles.centerButtonPaused // Noir transparent si en pause
          ]}
          onPress={handleCenterPress}
          activeOpacity={0.96}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={isRecordActive ? "Démarrer l'enregistrement" : "Aller à l'enregistrement"}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Image
            source={require('../../assets/logo-blanc.png')}
            style={[styles.centerIcon, isRecordActive && styles.centerIconRecordScreen, isRecording && styles.centerIconRecording]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Bouton Stop - Visible uniquement quand en pause */}
        {isRecording && isPaused && isRecordActive && (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={() => {
              // Naviguer vers RecordScreen avec l'action stop
              navigation.navigate('Record', { triggerStop: true });
            }}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Arrêter l'enregistrement"
          >
            <View style={styles.stopButtonInner} />
          </TouchableOpacity>
        )}

        {/* Bouton droite - Menu hamburger - Caché pendant l'enregistrement */}
        {!isRecording && (
          <TouchableOpacity
            style={[styles.sideButton, isRecordActive && styles.sideButtonRecording]}
            onPress={handleRightPress}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Menu options"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image
              source={require('../../assets/icon-nav-droite.png')}
              style={[styles.sideIcon, isRecordActive && styles.sideIconRecording]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  containerTransparent: {
    backgroundColor: 'transparent', // Complètement transparent sur la page Record
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    paddingHorizontal: theme.spacing['4'],
    paddingBottom: 15,
    height: 84,
  },
  sideButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.layout.borderRadius.full,
    marginBottom: 15, // Offset pour aligner avec le bouton central
  },
  sideIcon: {
    width: 26,
    height: 26,
    tintColor: theme.colors.black,
  },
  sideButtonRecording: {
    opacity: 0.5,
  },
  sideIconRecording: {
    opacity: 0.5,
  },
  centerButton: {
    width: 74,
    height: 74,
    borderRadius: theme.layout.borderRadius.full,
    backgroundColor: theme.colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonActive: {
    transform: [{ scale: 0.98 }],
  },
  centerButtonRecordScreen: {
    width: 100, // Bouton significativement plus grand
    height: 100,
    borderRadius: theme.layout.borderRadius.full,
  },
  centerIcon: {
    width: 34,
    height: 34,
    tintColor: theme.colors.white,
  },
  centerIconRecordScreen: {
    width: 48, // Icon plus grand pour le bouton agrandi
    height: 48,
  },
  centerButtonRecording: {
    width: 110, // Encore plus grand pendant l'enregistrement
    height: 110,
    borderRadius: theme.layout.borderRadius.full,
    backgroundColor: theme.colors.error500, // Rouge pendant l'enregistrement
  },
  centerIconRecording: {
    width: 52, // Icon encore plus grand pendant l'enregistrement
    height: 52,
  },
  centerButtonPaused: {
    width: 100, // Revient à taille normale en pause
    height: 100,
    borderRadius: theme.layout.borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Gris foncé semi-transparent comme les icônes du timer
  },
  stopButton: {
    position: 'absolute',
    right: '50%',
    marginRight: -100, // Positionné à droite du bouton central
    bottom: 36, // Même hauteur que le bouton central
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Noir transparent comme les icônes du timer
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  stopButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: theme.colors.white,
  },
});