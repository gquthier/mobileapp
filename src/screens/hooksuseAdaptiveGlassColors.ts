import { useColorScheme } from 'react-native';
import { useMemo } from 'react';

// ✅ Hook pour gérer l'adaptation automatique des couleurs dans Liquid Glass
export const useAdaptiveGlassColors = () => {
  const colorScheme = useColorScheme();

  return useMemo(() => {
    // Couleurs adaptatives selon le fond et le mode sombre/clair
    const colors = {
      // Pour Liquid Glass sur fond clair -> texte/icônes sombres
      onLightBackground: {
        text: '#000000',
        icon: '#000000',
        iconSecondary: '#666666',
      },
      // Pour Liquid Glass sur fond sombre -> texte/icônes clairs
      onDarkBackground: {
        text: '#FFFFFF',
        icon: '#FFFFFF', 
        iconSecondary: '#CCCCCC',
      },
      // Pour mode système automatique
      auto: colorScheme === 'dark' ? {
        text: '#FFFFFF',
        icon: '#FFFFFF',
        iconSecondary: '#CCCCCC',
      } : {
        text: '#000000', 
        icon: '#000000',
        iconSecondary: '#666666',
      }
    };

    return colors;
  }, [colorScheme]);
};

// ✅ Hook pour détecter la luminosité du fond d'écran
export const useBackgroundLuminance = (backgroundColor?: string) => {
  return useMemo(() => {
    if (!backgroundColor) return 'auto';
    
    // Convertir la couleur hex en RGB et calculer la luminance
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Formule de luminance relative
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Seuil pour déterminer si le fond est clair ou sombre
    return luminance > 0.5 ? 'light' : 'dark';
  }, [backgroundColor]);
};

// ✅ Fonction utilitaire pour obtenir les bonnes couleurs selon le contexte
export const getAdaptiveColors = (
  adaptiveColors: ReturnType<typeof useAdaptiveGlassColors>,
  backgroundType: 'light' | 'dark' | 'auto' = 'auto'
) => {
  switch (backgroundType) {
    case 'light':
      return adaptiveColors.onLightBackground;
    case 'dark':
      return adaptiveColors.onDarkBackground;
    default:
      return adaptiveColors.auto;
  }
};