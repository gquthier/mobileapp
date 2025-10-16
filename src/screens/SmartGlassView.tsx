import React, { useEffect, useState } from 'react';
import { View, Text, useColorScheme, Image } from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';

// ✅ Hook pour détecter la luminosité du fond en temps réel
const useBackgroundLuminance = () => {
  const [backgroundType, setBackgroundType] = useState<'light' | 'dark'>('light');
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Pour l'instant, on se base sur le color scheme système
    // Dans une implémentation plus avancée, on pourrait analyser l'image de fond
    setBackgroundType(colorScheme === 'dark' ? 'dark' : 'light');
  }, [colorScheme]);

  return backgroundType;
};

// ✅ Hook pour obtenir les couleurs adaptées selon la luminosité détectée
const useGlassAdaptiveColors = () => {
  const backgroundType = useBackgroundLuminance();
  
  return {
    text: backgroundType === 'dark' ? '#FFFFFF' : '#000000',
    icon: backgroundType === 'dark' ? '#FFFFFF' : '#000000',
    iconSecondary: backgroundType === 'dark' ? '#CCCCCC' : '#666666',
  };
};

// ✅ Wrapper intelligent qui applique automatiquement les couleurs
const SmartGlassView: React.FC<{
  children: React.ReactNode;
  style?: any;
  interactive?: boolean;
  onPress?: () => void;
  fallbackStyle?: any;
}> = ({ children, style, interactive = true, onPress, fallbackStyle }) => {
  
  const adaptiveColors = useGlassAdaptiveColors();

  // ✅ Fonction récursive pour appliquer les couleurs à tous les enfants
  const applyAdaptiveColors = (element: React.ReactNode): React.ReactNode => {
    return React.Children.map(element, (child) => {
      if (!React.isValidElement(child)) {
        return child;
      }

      const props = child.props;

      // Si c'est un Text, on applique la couleur de texte
      if (child.type === Text) {
        return React.cloneElement(child, {
          ...props,
          style: [
            props.style,
            { color: adaptiveColors.text }
          ],
          children: props.children && typeof props.children === 'object'
            ? applyAdaptiveColors(props.children)
            : props.children
        });
      }

      // Si c'est un Image avec tintColor ou un Icon
      if (props.name || props.tintColor !== undefined) {
        return React.cloneElement(child, {
          ...props,
          style: [
            props.style,
            { tintColor: adaptiveColors.icon }
          ]
        });
      }

      // Si c'est un composant avec une prop color (comme Icon)
      if (props.color !== undefined) {
        return React.cloneElement(child, {
          ...props,
          color: adaptiveColors.icon,
          children: props.children ? applyAdaptiveColors(props.children) : undefined
        });
      }

      // Pour les autres composants, on applique récursivement aux enfants
      if (props.children) {
        return React.cloneElement(child, {
          ...props,
          children: applyAdaptiveColors(props.children)
        });
      }

      return child;
    });
  };

  const adaptedChildren = applyAdaptiveColors(children);

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
          onPress={onPress}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={0.7}
        >
          {adaptedChildren}
        </TouchableOpacity>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {adaptedChildren}
        </View>
      )}
    </LiquidGlassView>
  );
};

export { SmartGlassView, useGlassAdaptiveColors, useBackgroundLuminance };