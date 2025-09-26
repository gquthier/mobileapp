export const colors = {
  white: '#FFFFFF',
  black: '#000000',
  tabBarBg: '#F7F7F7',
  divider: '#E6E6E6',
  inactive: '#B3B3B3',
  fabBg: '#0B0B0B',
  gray100: '#FAFAFA',
  gray200: '#F5F5F5',
  gray300: '#E6E6E6',
  gray400: '#CCCCCC',
  gray500: '#999999',
  gray600: '#666666',
  gray700: '#333333',
  gray800: '#1A1A1A',
  gray900: '#0D0D0D',

  // Purple accent colors
  accent: '#9A65FF',
  accentDark: '#7A3FFF',
  accent2: '#2D27FF',
  accent3: '#FF4D6D',

  // Accent transparencies
  accent06: 'rgba(154, 101, 255, 0.06)',
  accent10: 'rgba(154, 101, 255, 0.10)',
  accentShadow35: 'rgba(154, 101, 255, 0.35)',
  accentShadow40: 'rgba(122, 63, 255, 0.40)',
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  tiny: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
};