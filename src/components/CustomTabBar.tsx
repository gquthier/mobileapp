import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiquidGlassView, LiquidGlassContainerView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { Icon } from './Icon';


export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const handleLeftPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Library', { screen: 'LibraryMain' });
  };

  const handleCenterPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const currentRoute = state.routes[state.index].name;

    if (currentRoute === 'Record') {
      // Si on est déjà sur Record, déclencher l'enregistrement
      navigation.setParams({ triggerRecording: Date.now() });
    } else {
      // Sinon, naviguer vers Record
      navigation.navigate('Record');
    }
  };

  const handleRightPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigation vers Momentum Dashboard
    navigation.navigate('Momentum');
  };

  const isRecordActive = state.routes[state.index].name === 'Record';
  const isLibraryActive = state.routes[state.index].name === 'Library';
  const isMomentumActive = state.routes[state.index].name === 'Momentum';
  const currentRoute = state.routes[state.index];
  const isRecording = currentRoute.params?.isRecording || false;
  const isPaused = currentRoute.params?.isPaused || false;

  // 🎯 Masquer complètement la tab bar pendant l'enregistrement
  if (isRecording && isRecordActive) {
    console.log('🚫 [TabBar] Hiding tab bar - recording in progress');
    return null;
  }

  // Animated values for smooth transitions
  const buttonSize = useRef(new Animated.Value(74)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const backgroundColor = useRef(new Animated.Value(0)).current; // 0 = black, 1 = red, 2 = transparent

  // Animate button size based on state
  useEffect(() => {
    let targetSize = 74;
    let targetScale = 1; // 34px base
    let targetBgColor = 0; // black

    if (isPaused) {
      targetSize = 100;
      targetScale = 48 / 34; // ~1.41
      targetBgColor = 2; // transparent black
    } else if (isRecording) {
      targetSize = 110;
      targetScale = 52 / 34; // ~1.53
      targetBgColor = 1; // red
    } else if (isRecordActive) {
      targetSize = 100;
      targetScale = 48 / 34; // ~1.41
      targetBgColor = 0; // black
    }

    Animated.parallel([
      Animated.spring(buttonSize, {
        toValue: targetSize,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }),
      Animated.spring(iconScale, {
        toValue: targetScale,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(backgroundColor, {
        toValue: targetBgColor,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isRecordActive, isRecording, isPaused, buttonSize, iconScale, backgroundColor]);

  // Interpolate background color
  const animatedBackgroundColor = backgroundColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      theme.colors.text.primary, // black
      '#EF4444', // red
      'rgba(0, 0, 0, 0.8)', // transparent black
    ],
  });

  return (
    <View style={[
      styles.container,
      {
        paddingBottom: insets.bottom > 0 ? insets.bottom : 15,
      },
      isRecordActive && styles.containerTransparent
    ]}>
      {/* Liquid Glass Container with Merging Effect */}
      <LiquidGlassView
        style={[
          styles.glassContainer,
          !isLiquidGlassSupported && {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
          }
        ]}
        interactive={false}
      >
        {/* Container for merging glass effects when elements are close */}
        <LiquidGlassContainerView spacing={20} style={styles.contentContainer}>

          {/* Bouton gauche - Library - Caché pendant l'enregistrement */}
          {!isRecording && (
            <LiquidGlassView
              style={[styles.tabIconContainer, isLibraryActive && styles.tabIconActive]}
              effect={isLibraryActive ? "clear" : "none"}
              tintColor={isLibraryActive ? "rgba(0, 0, 0, 0.1)" : undefined}
              interactive={true}
            >
              <TouchableOpacity
                style={styles.sideButton}
                onPress={handleLeftPress}
                activeOpacity={0.6}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Library"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Image
                  source={require('../../assets/icons/icon-nav-gauche.png')}
                  style={[
                    styles.sideIcon,
                    {
                      tintColor: isLibraryActive
                        ? theme.colors.text.primary
                        : theme.colors.text.secondary
                    },
                  ]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </LiquidGlassView>
          )}

          {/* Bouton central - Record - Rouge pendant l'enregistrement, noir transparent en pause */}
          <Animated.View
            style={[
              styles.centerButton,
              {
                width: buttonSize,
                height: buttonSize,
                backgroundColor: animatedBackgroundColor,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.centerButtonTouchable}
              onPress={handleCenterPress}
              activeOpacity={0.96}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={isRecordActive ? "Démarrer l'enregistrement" : "Aller à l'enregistrement"}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                <Icon name="recordButton" size={42} color="white" />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* Bouton Delete - Visible uniquement quand en pause */}
          {isRecording && isPaused && isRecordActive && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                navigation.navigate('Record', { triggerCancel: true });
              }}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Supprimer l'enregistrement"
            >
              <Icon name="trash" size={24} color={theme.colors.white} />
            </TouchableOpacity>
          )}

          {/* Bouton Stop - Visible uniquement quand en pause */}
          {isRecording && isPaused && isRecordActive && (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={() => {
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

          {/* Bouton droite - Momentum - Caché pendant l'enregistrement */}
          {!isRecording && (
            <LiquidGlassView
              style={[styles.tabIconContainer, isMomentumActive && styles.tabIconActive]}
              effect={isMomentumActive ? "clear" : "none"}
              tintColor={isMomentumActive ? "rgba(0, 0, 0, 0.1)" : undefined}
              interactive={true}
            >
              <TouchableOpacity
                style={styles.sideButton}
                onPress={handleRightPress}
                activeOpacity={0.6}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Momentum"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Image
                  source={require('../../assets/icons/icon-nav-droite.png')}
                  style={[
                    styles.sideIcon,
                    {
                      tintColor: isMomentumActive
                        ? theme.colors.text.primary
                        : theme.colors.text.secondary
                    },
                  ]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </LiquidGlassView>
          )}
        </LiquidGlassContainerView>
      </LiquidGlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  containerTransparent: {
    backgroundColor: 'transparent',
  },
  glassContainer: {
    width: '100%',
    maxWidth: 380, // Compact tab bar
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: 'relative',
  },
  tabIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    // Active state with Liquid Glass effect applied via effect prop
  },
  sideButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    zIndex: 1,
  },
  sideIcon: {
    width: 28,
    height: 28,
  },
  centerButton: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  centerButtonTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    position: 'absolute',
    left: '50%',
    marginLeft: -100,
    bottom: '100%',
    marginBottom: 12,
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  stopButton: {
    position: 'absolute',
    right: '50%',
    marginRight: -100,
    bottom: '100%',
    marginBottom: 12,
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    backgroundColor: '#FFFFFF',
  },
});
