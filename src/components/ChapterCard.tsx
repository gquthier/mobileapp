import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../styles';

interface ChapterCardProps {
  title: string;
  period: string;
  count: number;
  progress?: number;
  onPress?: () => void;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  title,
  period,
  count,
  progress = 40,
  onPress,
}) => {
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={styles.card}
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
    >
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.period}>{period}</Text>
        </View>
        <Text style={styles.count}>{count} videos</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    </Component>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing['4'],
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    borderRadius: theme.layout.borderRadius.card,
    marginBottom: theme.spacing['3'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
  },
  title: {
    ...theme.typography.body2,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['0.5'],
  },
  period: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  count: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  progressContainer: {
    marginTop: theme.spacing['3'],
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.ui.border,
    borderRadius: theme.layout.borderRadius.xs,
  },
  progressFill: {
    height: 4,
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.layout.borderRadius.xs,
  },
});