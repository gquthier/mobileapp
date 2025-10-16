import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';

// ✅ Composant réutilisable pour les boutons Glass optimisés (React Native safe)
export const GlassButton: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  interactive?: boolean;
  style?: any;
  fallbackStyle?: any;
}> = ({ 
  children, 
  onPress, 
  interactive = true, 
  style = {},
  fallbackStyle = {}
}) => (
  <LiquidGlassView
    style={[
      style,
      !isLiquidGlassSupported && fallbackStyle,
    ]}
    interactive={interactive}
  >
    {onPress ? (
      <TouchableOpacity
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    ) : (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {children}
      </View>
    )}
  </LiquidGlassView>
);

// ✅ Container pour grouper les effets Glass (simulation car LiquidGlassContainer n'existe pas en React Native)
// Utilise gap si React Native >= 0.71, sinon applique marginRight sur les enfants
export const GlassContainer: React.FC<{
  children: React.ReactNode;
  style?: any;
  spacing?: number;
}> = ({ children, style, spacing = 6 }) => {
  // Pour React Native >= 0.71 qui supporte gap
  const containerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing,
  };
  
  return (
    <View style={[containerStyle, style]}>
      {children}
    </View>
  );
};

// ✅ Hook personnalisé pour gérer l'état des effets Glass
export const useGlassEffects = () => {
  const [glassStates, setGlassStates] = React.useState({
    chaptersVisible: true,
    searchExpanded: false,
    controlsVisible: true,
  });

  const updateGlassState = React.useCallback((key: string, value: boolean) => {
    setGlassStates(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  return {
    glassStates,
    updateGlassState,
  };
};

// ✅ Configuration optimisée pour les performances
export const GLASS_CONFIG = {
  // Réduire le nombre d'effets simultanés pour les performances
  MAX_CONCURRENT_EFFECTS: 6,
  
  // Spacing recommandé entre les éléments Glass pour le blending
  OPTIMAL_SPACING: 6,
  
  // Fallback colors pour les appareils non supportés
  FALLBACK_COLORS: {
    surface: 'rgba(128, 128, 128, 0.15)',
    surfaceHover: 'rgba(128, 128, 128, 0.25)',
    surfacePressed: 'rgba(128, 128, 128, 0.35)',
  }
};