import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/theme';

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
    borderColor: colors.gray300,
    borderRadius: 12,
    padding: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.black,
    marginBottom: 8,
  },
  item: {
    fontSize: 12,
    color: colors.gray700,
    marginBottom: 4,
  },
});