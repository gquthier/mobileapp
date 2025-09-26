import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from './Icon';
import { colors } from '../styles/theme';

interface RecordPillProps {
  onPress?: () => void;
}

export const RecordPill: React.FC<RecordPillProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.pill} onPress={onPress} activeOpacity={0.8}>
      <Icon name="mic" size={16} color={colors.black} />
      <Text style={styles.text}>Hold to record</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: [{ translateX: -75 }], // Approximation de -50%
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.black,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.black,
  },
});