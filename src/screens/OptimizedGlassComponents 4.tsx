import React from 'react';
import { View, TouchableOpacity, Text, useColorScheme } from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';

// ✅ Hook pour obtenir les couleurs selon le mode système
const useSystemAdaptiveColors = () => {
  const colorScheme = useColorScheme();
  
  // Force les couleurs selon le mode système détecté
  return {
    text: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    icon: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    iconSecondary: colorScheme === 'dark' ? '#CCCCCC' : '#666666',
  };
};

// ✅ Composant GlassButton avec adaptation système forcée
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
}) => {
  
  const adaptiveColors = useSystemAdaptiveColors();

  // ✅ Force l'application des couleurs adaptatives
  const renderWithAdaptiveColors = (content: React.ReactNode): React.ReactNode => {
    return React.Children.map(content, (child) => {
      if (!React.isValidElement(child)) {
        return child;
      }

      const childProps = child.props || {};
      
      // Si c'est un Text, force la couleur adaptée
      if (child.type === Text) {
        return React.cloneElement(child as React.ReactElement, {
          ...childProps,
          style: [
            childProps.style,
            { color: adaptiveColors.text } // ✅ Force la couleur système
          ],
          children: childProps.children && typeof childProps.children === 'object'
            ? renderWithAdaptiveColors(childProps.children)
            : childProps.children
        });
      }
      
      // Si c'est un composant Icon avec prop color
      if (childProps.name || childProps.color !== undefined) {
        return React.cloneElement(child as React.ReactElement, {
          ...childProps,
          color: adaptiveColors.icon, // ✅ Force la couleur système
        });
      }
      
      // Pour les autres composants, applique récursivement
      if (childProps.children) {
        return React.cloneElement(child as React.ReactElement, {
          ...childProps,
          children: renderWithAdaptiveColors(childProps.children),
        });
      }
      
      return child;
    });
  };

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
          {renderWithAdaptiveColors(children)}
        </TouchableOpacity>
      ) : (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {renderWithAdaptiveColors(children)}
        </View>
      )}
    </LiquidGlassView>
  );
};

// ✅ Container inchangé
export const GlassContainer: React.FC<{
  children: React.ReactNode;
  style?: any;
  spacing?: number;
}> = ({ children, style, spacing = 6 }) => {
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