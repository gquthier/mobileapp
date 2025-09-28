import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../styles';

interface ChipProps {
  children: React.ReactNode;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  active = false,
  onPress,
  style,
}) => {
  const Component = onPress ? TouchableOpacity : React.Fragment;

  return (
    <Component {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}>
      <Text
        style={[
          styles.chip,
          active ? styles.active : styles.inactive,
          style,
        ]}
      >
        {children}
      </Text>
    </Component>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: theme.spacing['3'],
    paddingVertical: theme.spacing['1.5'],
    borderRadius: theme.layout.borderRadius.full,
    ...theme.typography.caption,
    borderWidth: 1,
    textAlign: 'center',
  },
  active: {
    backgroundColor: theme.colors.brand.primary,
    color: theme.colors.white,
    borderColor: theme.colors.brand.primary,
  },
  inactive: {
    backgroundColor: theme.colors.white,
    color: theme.colors.text.primary,
    borderColor: theme.colors.ui.border,
  },
});