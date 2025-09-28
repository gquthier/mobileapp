import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { theme } from '../styles';
import { Icon } from './Icon';
import { VideoRecord } from '../lib/supabase';

const { width: screenWidth } = Dimensions.get('window');
const CELL_SIZE = (screenWidth - 32) / 7; // 7 columns with padding

interface CalendarGalleryProps {
  videos: VideoRecord[];
  onVideoPress: (video: VideoRecord) => void;
  chapters?: Array<{
    id: string;
    title: string;
    periodStart: Date;
    periodEnd?: Date;
  }>;
}

interface MonthData {
  year: number;
  month: number;
  monthName: string;
  days: DayData[];
  chapter?: string;
}

interface DayData {
  date: number;
  dayOfWeek: number;
  videos: VideoRecord[];
  isCurrentMonth: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const CalendarGallerySimple: React.FC<CalendarGalleryProps> = ({
  videos,
  onVideoPress,
  chapters = [],
}) => {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Helper function to construct thumbnail URL
  const getThumbnailUrl = (thumbnailPath: string): string => {
    if (thumbnailPath.startsWith('http')) {
      return thumbnailPath;
    }

    const baseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos';
    const cleanPath = thumbnailPath.startsWith('/') ? thumbnailPath.substring(1) : thumbnailPath;
    return `${baseUrl}/${cleanPath}`;
  };

  // Group videos by date
  const videosByDate = useMemo(() => {
    const grouped: { [key: string]: VideoRecord[] } = {};

    videos.forEach(video => {
      if (video.created_at) {
        const date = new Date(video.created_at);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(video);
      }
    });

    return grouped;
  }, [videos]);

  // Generate calendar data for 2025
  const generateCalendarData = useCallback((): MonthData[] => {
    const months: MonthData[] = [];
    const currentYear = 2025;

    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(currentYear, month, 1);
      const lastDay = new Date(currentYear, month + 1, 0);
      const firstDayOfWeek = firstDay.getDay();
      const daysInMonth = lastDay.getDate();

      const days: DayData[] = [];

      // Add empty cells for days before month starts
      for (let i = 0; i < firstDayOfWeek; i++) {
        const prevMonthDay = new Date(currentYear, month, -firstDayOfWeek + i + 1);
        days.push({
          date: prevMonthDay.getDate(),
          dayOfWeek: i,
          videos: [],
          isCurrentMonth: false,
        });
      }

      // Add days of current month
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${currentYear}-${month}-${day}`;
        days.push({
          date: day,
          dayOfWeek: (firstDayOfWeek + day - 1) % 7,
          videos: videosByDate[dateKey] || [],
          isCurrentMonth: true,
        });
      }

      // Add empty cells to complete last week
      const remainingDays = 35 - days.length; // 5 rows * 7 columns
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          date: i,
          dayOfWeek: (days.length) % 7,
          videos: [],
          isCurrentMonth: false,
        });
      }

      // Find chapter for this month
      const monthDate = new Date(currentYear, month, 15); // Middle of month
      const chapter = chapters.find(ch => {
        const start = new Date(ch.periodStart);
        const end = ch.periodEnd ? new Date(ch.periodEnd) : new Date();
        return monthDate >= start && monthDate <= end;
      });

      months.push({
        year: currentYear,
        month,
        monthName: MONTHS[month],
        days,
        chapter: chapter?.title,
      });
    }

    return months;
  }, [videosByDate, chapters]);

  const calendarData = useMemo(() => generateCalendarData(), [generateCalendarData]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  const renderDayCell = (day: DayData) => {
    const hasVideos = day.videos.length > 0;
    const videoCount = day.videos.length;

    return (
      <TouchableOpacity
        key={`${day.date}-${day.dayOfWeek}`}
        style={styles.dayCell}
        onPress={() => hasVideos && onVideoPress(day.videos[0])}
        disabled={!hasVideos || !day.isCurrentMonth}
      >
        {hasVideos && day.isCurrentMonth ? (
          <View style={styles.dayWithVideo}>
            {day.videos[0].thumbnail_path ? (
              <Image
                source={{ uri: getThumbnailUrl(day.videos[0].thumbnail_path) }}
                style={styles.thumbnail}
                resizeMode="cover"
                onError={() => console.log('❌ Failed to load thumbnail:', day.videos[0].thumbnail_path)}
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Icon name="cameraFilled" size={20} color={theme.colors.gray400} />
              </View>
            )}
            {videoCount > 1 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{videoCount}</Text>
              </View>
            )}
            <Text style={[styles.dayNumber, styles.dayNumberWithVideo]}>
              {day.date}
            </Text>
          </View>
        ) : (
          <Text style={[
            styles.dayNumber,
            !day.isCurrentMonth && styles.dayNumberInactive
          ]}>
            {day.date}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderMonth = (monthData: MonthData) => {
    const monthKey = `${monthData.year}-${monthData.month}`;
    const isExpanded = expandedMonths.has(monthKey);

    // Count total videos in month
    const monthVideoCount = monthData.days.reduce((sum, day) =>
      sum + (day.isCurrentMonth ? day.videos.length : 0), 0
    );

    if (monthVideoCount === 0) return null; // Skip months without videos

    return (
      <View key={monthKey} style={styles.monthContainer}>
        {/* Chapter Header if applicable */}
        {monthData.chapter && (
          <View style={styles.chapterHeader}>
            <Text style={styles.chapterTitle}>{monthData.chapter}</Text>
          </View>
        )}

        {/* Month Header */}
        <TouchableOpacity
          style={styles.monthHeader}
          onPress={() => toggleMonth(monthKey)}
          activeOpacity={0.7}
        >
          <Text style={styles.monthTitle}>{monthData.monthName} {monthData.year}</Text>
          <Icon
            name={isExpanded ? "chevronUp" : "chevronDown"}
            size={18}
            color={theme.colors.text.secondary}
          />
        </TouchableOpacity>

        {/* Content (without animation) */}
        {isExpanded && (
          <View>
            {/* Day Labels */}
            <View style={styles.dayLabelsRow}>
              {DAYS.map(day => (
                <View key={day} style={styles.dayLabelCell}>
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {monthData.days.map(day => renderDayCell(day))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {calendarData.map(month => renderMonth(month))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthContainer: {
    marginBottom: theme.spacing['6'],
  },
  chapterHeader: {
    paddingVertical: theme.spacing['2'],
    paddingHorizontal: theme.spacing['4'],
    backgroundColor: theme.colors.gray50,
    marginBottom: theme.spacing['2'],
  },
  chapterTitle: {
    ...theme.typography.h3,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing['4'],
    marginBottom: theme.spacing['2'],
  },
  dayLabelCell: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  dayLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing['4'],
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    padding: 2,
  },
  dayWithVideo: {
    flex: 1,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: theme.colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    position: 'absolute',
    top: 4,
    left: 4,
    ...theme.typography.tiny,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  dayNumberWithVideo: {
    color: theme.colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dayNumberInactive: {
    color: theme.colors.text.disabled,
  },
  countBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: theme.colors.brand.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    ...theme.typography.tiny,
    fontWeight: '700',
    color: theme.colors.white,
  },
});