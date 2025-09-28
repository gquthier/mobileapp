import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from './Icon';
import { theme } from '../styles';

interface RecordPillProps {
  onPress?: () => void;
}

export const RecordPill: React.FC<RecordPillProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.pill} onPress={onPress} activeOpacity={0.8}>
      <Icon name="mic" size={16} color={theme.colors.text.primary} />
      <Text style={styles.text}>Hold to record</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: theme.spacing['6'],
    left: '50%',
    transform: [{ translateX: -75 }], // Approximation de -50%
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
    paddingHorizontal: theme.spacing['5'],
    paddingVertical: theme.spacing['3'],
    borderRadius: theme.layout.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.text.primary,
    backgroundColor: theme.colors.white,
    ...theme.layout.shadows.sm,
  },
  text: {
    ...theme.typography.body2,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
});