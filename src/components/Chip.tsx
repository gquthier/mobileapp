import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../styles/theme';

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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    borderWidth: 1,
    textAlign: 'center',
  },
  active: {
    backgroundColor: colors.black,
    color: colors.white,
    borderColor: colors.black,
  },
  inactive: {
    backgroundColor: colors.white,
    color: colors.black,
    borderColor: colors.gray300,
  },
});