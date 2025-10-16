import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';

// ✅ Composant réutilisable pour les boutons Glass optimisés (React Native safe)
export const GlassButton: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  interactive?: boolean;
  style?: any;
  fallbackStyle?: any;
  whiteContent?: boolean; // ✅ Nouvelle prop pour forcer le contenu en blanc
}> = ({ 
  children, 
  onPress, 
  interactive = true, 
  style = {},
  fallbackStyle = {},
  whiteContent = true // ✅ Par défaut, le contenu est en blanc pour respecter les guidelines Apple
}) => {
  
  return (
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
};

// ✅ Container pour grouper les effets Glass (simulation car LiquidGlassContainer n'existe pas en React Native)
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