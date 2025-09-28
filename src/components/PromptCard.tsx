import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles';

interface PromptCardProps {
  title: string;
  items: string[];
}

export const PromptCard: React.FC<PromptCardProps> = ({ title, items }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item, index) => (
        <Text key={index} style={styles.item}>
          • {item}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    borderRadius: 12,
    padding: theme.spacing['3'],
  },
  title: {
    ...theme.typography.caption,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['2'],
  },
  item: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing['1'],
  },
});