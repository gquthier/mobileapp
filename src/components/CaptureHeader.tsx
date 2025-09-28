import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { theme } from '../styles';
import { Icon } from './Icon';

interface CaptureHeaderProps {
  date?: string;
  chapter?: string;
  arc?: string;
}

export const CaptureHeader: React.FC<CaptureHeaderProps> = ({
  date,
  chapter = "Chapter 3",
  arc = "Arc 7",
}) => {
  // Format current date if not provided
  const formattedDate = date || formatCurrentDate();

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.dateText}>{formattedDate}</Text>
        <Text style={styles.chapterText}>{chapter}, {arc}</Text>
      </View>

      <View style={styles.iconContainer}>
        <Icon
          name="clock"
          size={24}
          color={theme.colors.white}
          style={styles.icon}
        />
      </View>
    </View>
  );
};

// Helper function to format current date
function formatCurrentDate(): string {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayName = days[now.getDay()];
  const day = now.getDate();
  const month = months[now.getMonth()];

  // Add ordinal suffix
  const getOrdinalSuffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return `${dayName}, ${day}${getOrdinalSuffix(day)} ${month}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['6'],
    paddingTop: theme.spacing['4'],
    backgroundColor: 'transparent',
    width: '100%',
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    ...theme.typography.h3,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: theme.spacing['1'],
  },
  chapterText: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});