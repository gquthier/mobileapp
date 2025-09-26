import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon } from './Icon';
import { colors } from '../styles/theme';

const { width: screenWidth } = Dimensions.get('window');

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  const handleTabPress = (routeName: string, index: number) => {
    Haptics.impactAsync(
      routeName === 'Record'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );

    navigation.navigate(routeName);
  };

  const getIconName = (routeName: string): string => {
    switch (routeName) {
      case 'Home':
        return 'chapters';
      case 'Library':
        return 'library';
      case 'Record':
        return 'cameraFilled';
      case 'Settings':
        return 'settingsSimple';
      default:
        return 'chapters';
    }
  };

  const getLabel = (routeName: string): string => {
    const route = state.routes.find(r => r.name === routeName);
    const { options } = descriptors[route?.key || ''];
    return options?.tabBarLabel || routeName;
  };

  // Tous les onglets avec Record
  const tabRoutes = ['Home', 'Library', 'Settings', 'Record'];

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.divider} />

      {/* Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {/* 3 onglets principaux resserrés à gauche */}
        <View style={styles.leftTabs}>
          {tabRoutes.slice(0, 3).map((routeName) => {
            const isActive = state.routes[state.index].name === routeName;
            const iconColor = isActive ? colors.black : colors.inactive;
            const textColor = isActive ? colors.black : colors.inactive;
            const label = getLabel(routeName);

            return (
              <TouchableOpacity
                key={routeName}
                style={styles.tab}
                onPress={() => handleTabPress(routeName, 0)}
                activeOpacity={0.8}
                accessibilityLabel={label}
                accessibilityRole="button"
              >
                <Icon
                  name={getIconName(routeName)}
                  size={24}
                  color={iconColor}
                  strokeWidth={1.5}
                />
                <Text style={[styles.label, { color: textColor }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bouton Record intégré comme 4ème onglet plus gros */}
        <TouchableOpacity
          style={styles.recordTab}
          onPress={() => handleTabPress('Record', 0)}
          activeOpacity={0.8}
          accessibilityLabel="Record"
          accessibilityRole="button"
        >
          <View style={styles.recordButton}>
            <Icon
              name="cameraFilled"
              size={32}
              color={colors.white}
            />
          </View>
          <Text style={styles.recordLabel}>Record</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  tabBar: {
    backgroundColor: colors.tabBarBg,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  leftTabs: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around', // Répartir équitablement les 3 tabs
    marginRight: 20, // Espace pour séparer du bouton Record
    maxWidth: screenWidth * 0.6, // Limiter à 60% de l'écran
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 60, // Un peu plus large pour l'espacement
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0,
  },
  recordTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.fabBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  recordLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0,
    color: colors.black,
  },
});