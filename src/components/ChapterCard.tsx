import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../styles/theme';

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
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 16,
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: '500',
    color: colors.black,
    marginBottom: 2,
  },
  period: {
    fontSize: 12,
    color: colors.gray600,
  },
  count: {
    fontSize: 12,
    color: colors.gray600,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.black,
    borderRadius: 2,
  },
});