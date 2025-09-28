import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { theme } from '../styles';

interface TopBarProps {
  title: string;
  right?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, right }) => {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Icon name="bookOpen" size={20} color={theme.colors.text.primary} />
        <Text style={styles.title}>{title}</Text>
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
    marginBottom: theme.spacing['4'],
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  title: {
    ...theme.typography.body,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
  },
});