import React from 'react';
import { View, TouchableOpacity, Text, useColorScheme } from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';

// ✅ Types pour l'adaptation des couleurs
type ColorAdaptation = 'auto' | 'light' | 'dark' | 'forceWhite' | 'forceBlack';

// ✅ Hook simplifié pour les couleurs adaptatives
const useAdaptiveColors = (adaptation: ColorAdaptation = 'auto') => {
  const colorScheme = useColorScheme();
  
  switch (adaptation) {
    case 'forceWhite':
      return { text: '#FFFFFF', icon: '#FFFFFF' };
    case 'forceBlack':
      return { text: '#000000', icon: '#000000' };
    case 'light':
      return { text: '#000000', icon: '#000000' }; // Sur fond clair -> texte sombre
    case 'dark':
      return { text: '#FFFFFF', icon: '#FFFFFF' }; // Sur fond sombre -> texte clair
    case 'auto':
    default:
      // Système automatique selon le mode de l'appareil
      return colorScheme === 'dark' 
        ? { text: '#FFFFFF', icon: '#FFFFFF' }
        : { text: '#000000', icon: '#000000' };
  }
};

// ✅ Composant réutilisable pour les boutons Glass optimisés avec adaptation automatique
export const GlassButton: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  interactive?: boolean;
  style?: any;
  fallbackStyle?: any;
  colorAdaptation?: ColorAdaptation; // ✅ Nouvelle prop pour contrôler l'adaptation des couleurs
}> = ({ 
  children, 
  onPress, 
  interactive = true, 
  style = {},
  fallbackStyle = {},
  colorAdaptation = 'auto' // ✅ Par défaut, adaptation automatique
}) => {
  
  const adaptiveColors = useAdaptiveColors(colorAdaptation);

  // ✅ Fonction pour appliquer les couleurs adaptatives aux enfants
  const renderAdaptiveContent = (content: React.ReactNode): React.ReactNode => {
    return React.Children.map(content, (child) => {
      if (React.isValidElement(child)) {
        const childProps = child.props || {};
        
        // Si c'est un Text, on applique la couleur de texte adaptative
        if (child.type === Text || childProps.style) {
          return React.cloneElement(child as React.ReactElement<any>, {
            ...childProps,
            style: [
              childProps.style,
              { color: adaptiveColors.text }
            ],
            children: child.props.children && typeof child.props.children === 'object' 
              ? renderAdaptiveContent(child.props.children)
              : child.props.children
          });
        }
        
        // Si c'est un composant Icon avec une prop color, on l'adapte
        if (childProps.name || childProps.color !== undefined) {
          return React.cloneElement(child as React.ReactElement<any>, {
            ...childProps,
            color: adaptiveColors.icon,
          });
        }
        
        // Sinon on applique récursivement aux enfants
        if (child.props && child.props.children) {
          return React.cloneElement(child as React.ReactElement<any>, {
            ...childProps,
            children: renderAdaptiveContent(child.props.children),
          });
        }
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
          {renderAdaptiveContent(children)}
        </TouchableOpacity>
      ) : (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {renderAdaptiveContent(children)}
        </View>
      )}
    </LiquidGlassView>
  );
};

// ✅ Container pour grouper les effets Glass
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