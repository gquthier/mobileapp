import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../hooks/useTheme';

interface TopBarProps {
  title: string;
  right?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, right }) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Icon name="bookOpen" size={20} color={theme.colors.text.primary} />
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>{title}</Text>
      </View>
      <View style={styles.right}>
        {right}
        <Icon name="settings" size={20} color={theme.colors.text.primary} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent background
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent background
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent background
  },
});