import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { colors } from '../styles/theme';

interface TopBarProps {
  title: string;
  right?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, right }) => {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Icon name="bookOpen" size={20} color={colors.black} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.right}>
        {right}
        <Icon name="settings" size={20} color={colors.black} />
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
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.black,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});