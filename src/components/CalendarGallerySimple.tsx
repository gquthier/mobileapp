import React, { useState, useMemo, useCallback, useRef, memo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { theme as staticTheme } from '../styles';
import { Icon } from './Icon';
import { VideoRecord } from '../lib/supabase';
import { SourceRect } from './library/types';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');
const CELL_SIZE = (screenWidth - 32) / 7; // 7 columns with padding
const CELL_HEIGHT = CELL_SIZE * 1.2; // Increased height for better video preview

interface CalendarGalleryProps {
  videos: VideoRecord[];
  onVideoPress?: (video: VideoRecord, allVideosFromDay?: VideoRecord[], index?: number) => void;
  onVideoPressWithRect?: (video: VideoRecord, rect: SourceRect, allVideosFromDay?: VideoRecord[], index?: number) => void;
  chapters?: Array<{
    id: string;
    title: string;
    periodStart: Date;
    periodEnd?: Date;
  }>;
  onScroll?: (event: any) => void;
  onScrollEndDrag?: (event: any) => void;
  onMomentumScrollEnd?: (event: any) => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  contentInsetTop?: number; // ✅ Padding top for floating header
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
  chapterColor?: string; // ✅ Couleur du chapitre pour le badge
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ✅ Wrap with React.memo to prevent unnecessary re-renders
const CalendarGallerySimpleComponent: React.FC<CalendarGalleryProps> = ({
  videos,
  onVideoPress,
  onVideoPressWithRect,
  chapters = [],
  onScroll,
  onScrollEndDrag,
  onMomentumScrollEnd,
  onEndReached,
  onEndReachedThreshold = 0.8,
  contentInsetTop = 0, // ✅ Default to 0 if not provided
}) => {
  const { brandColor } = useTheme(); // Dynamic theme color
  const dayCellRefs = useRef<{ [key: string]: View | null }>({});
  // Initialize with all months expanded by default
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    const allMonths = new Set<string>();
    for (let month = 0; month < 12; month++) {
      allMonths.add(`2025-${month}`);
    }
    return allMonths;
  });

  // ✅ FIX: Progressive rendering - start with 3 months, then load all after mount
  // This prevents 420 cells from rendering at once and blocking the UI
  const [visibleMonthCount, setVisibleMonthCount] = useState(3);

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
        const dayVideos = videosByDate[dateKey] || [];

        // ✅ Find chapter color for this day based on video date
        let chapterColor: string | undefined;
        if (dayVideos.length > 0 && dayVideos[0].created_at) {
          const videoDate = new Date(dayVideos[0].created_at);
          const dayChapter = chapters.find(ch => {
            const start = new Date(ch.periodStart);
            const end = ch.periodEnd ? new Date(ch.periodEnd) : new Date();
            return videoDate >= start && videoDate <= end;
          });
          chapterColor = dayChapter?.color;
        }

        days.push({
          date: day,
          dayOfWeek: (firstDayOfWeek + day - 1) % 7,
          videos: dayVideos,
          isCurrentMonth: true,
          chapterColor, // ✅ Couleur du chapitre
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

    // ✅ FIX: Reverse order so most recent months appear first (December at top)
    return months.reverse();
  }, [videosByDate, chapters]);

  const calendarData = useMemo(() => generateCalendarData(), [generateCalendarData]);

  const handleDayPress = async (day: DayData, cellKey: string) => {
    if (!day.videos.length || !day.isCurrentMonth) return;

    // ✅ Don't open video if it's still uploading
    if (day.videos[0].metadata?.isUploading) {
      console.log('⏳ Video is still uploading, cannot open yet');
      return;
    }

    const cellRef = dayCellRefs.current[cellKey];
    if (!cellRef) {
      // Fallback to old behavior
      if (onVideoPress) {
        onVideoPress(day.videos[0], day.videos, 0);
      }
      return;
    }

    if (onVideoPressWithRect) {
      cellRef.measureInWindow((x, y, width, height) => {
        const rect: SourceRect = {
          x: 0,
          y: 0,
          width,
          height,
          pageX: x,
          pageY: y,
        };
        onVideoPressWithRect(day.videos[0], rect, day.videos, 0);
      });
    } else if (onVideoPress) {
      onVideoPress(day.videos[0], day.videos, 0);
    }
  };

  const renderDayCell = (day: DayData, monthIndex: number, year: number, month: number, cellIndex: number) => {
    const hasVideos = day.videos.length > 0;
    const videoCount = day.videos.length;
    // ✅ FIXED: Use cellIndex to ensure unique keys (prevents "duplicate key" errors)
    // cellIndex is the position in the grid (0-34), guaranteed unique per month
    const cellKey = `${year}-${month}-cell-${cellIndex}`;

    return (
      <TouchableOpacity
        key={cellKey}
        style={styles.dayCell}
        onPress={() => handleDayPress(day, cellKey)}
        disabled={!hasVideos || !day.isCurrentMonth}
      >
        {hasVideos && day.isCurrentMonth ? (
          <View
            ref={(ref) => { dayCellRefs.current[cellKey] = ref; }}
            style={styles.dayWithVideo}
          >
            {day.videos[0].thumbnail_frames && day.videos[0].thumbnail_frames.length > 0 ? (
              <Image
                source={{ uri: day.videos[0].thumbnail_frames[0] }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : day.videos[0].thumbnail_path ? (
              <Image
                source={{ uri: getThumbnailUrl(day.videos[0].thumbnail_path) }}
                style={styles.thumbnail}
                resizeMode="cover"
                onError={() => console.log('❌ Failed to load thumbnail:', day.videos[0].thumbnail_path)}
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Icon name="cameraFilled" size={20} color={staticTheme.colors.gray400} />
              </View>
            )}
            {videoCount > 1 && (
              <View style={[
                styles.countBadge,
                // ✅ Use chapter color if available, otherwise use dynamic brand color
                { backgroundColor: day.chapterColor || brandColor }
              ]}>
                <Text style={styles.countText}>{videoCount}</Text>
              </View>
            )}
            {/* Uploading indicator */}
            {day.videos[0].metadata?.isUploading && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
            {/* Processing indicator (transcription) */}
            {!day.videos[0].metadata?.isUploading &&
             day.videos[0].transcription_status &&
             day.videos[0].transcription_status !== 'completed' &&
             day.videos[0].transcription_status !== 'failed' && (
              <View style={styles.processingOverlay}>
                <View style={styles.processingIndicator}>
                  <Icon name="loading" size={16} color={staticTheme.colors.white} />
                </View>
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

  const renderMonth = (monthData: MonthData, monthIndex: number) => {
    const monthKey = `${monthData.year}-${monthData.month}`;

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
        <View style={styles.monthHeader}>
          <Text style={styles.monthTitle}>{monthData.monthName} {monthData.year}</Text>
        </View>

        {/* Content - Always visible */}
        <View>
          {/* Day Labels */}
          <View style={styles.dayLabelsRow}>
            {DAYS.map((day, index) => (
              <View key={`day-${index}`} style={styles.dayLabelCell}>
                <Text style={styles.dayLabel}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {monthData.days.map((day, cellIndex) => renderDayCell(day, monthIndex, monthData.year, monthData.month, cellIndex))}
          </View>
        </View>
      </View>
    );
  };

  // ✅ FIX: Progressively load all months after initial render
  // Loads 3 months immediately (fast), then remaining 9 months after 200ms (invisible to user)
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleMonthCount(12); // Load all months after smooth initial render
    }, 200); // Short delay to let initial 3 months render first

    return () => clearTimeout(timer);
  }, []);

  // Handle scroll to detect end reached
  const handleScroll = useCallback((event: any) => {
    onScroll?.(event);

    if (onEndReached) {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = contentSize.height * (1 - onEndReachedThreshold);
      const isEndReached = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      if (isEndReached) {
        onEndReached();
      }
    }
  }, [onScroll, onEndReached, onEndReachedThreshold]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: contentInsetTop }} // ✅ Add padding top for floating header
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      onScrollEndDrag={onScrollEndDrag}
      onMomentumScrollEnd={onMomentumScrollEnd}
      scrollEventThrottle={64} // ✅ Increased from 16 to reduce JS callbacks (75% reduction)
    >
      {/* ✅ FIX: Only render visible months (progressive loading) */}
      {calendarData.slice(0, visibleMonthCount).map((month, index) => renderMonth(month, index))}
    </ScrollView>
  );
};

// ✅ Export memoized component
export const CalendarGallerySimple = memo(CalendarGallerySimpleComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent background
  },
  monthContainer: {
    marginTop: 0, // ✅ Remove top margin to eliminate white space
    marginBottom: staticTheme.spacing['6'],
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent background
  },
  chapterHeader: {
    paddingVertical: staticTheme.spacing['2'],
    paddingHorizontal: staticTheme.spacing['4'],
    backgroundColor: staticTheme.colors.gray50,
    marginBottom: staticTheme.spacing['2'],
  },
  chapterTitle: {
    ...staticTheme.typography.h3,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: staticTheme.spacing['4'],
    paddingTop: 0, // ✅ Remove top padding to eliminate white line
    paddingBottom: staticTheme.spacing['3'],
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent background
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: staticTheme.colors.text.primary,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    paddingHorizontal: staticTheme.spacing['4'],
    marginBottom: staticTheme.spacing['2'],
  },
  dayLabelCell: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  dayLabel: {
    ...staticTheme.typography.caption,
    color: staticTheme.colors.text.tertiary,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: staticTheme.spacing['4'],
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_HEIGHT,
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
    backgroundColor: staticTheme.colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    position: 'absolute',
    top: 4,
    left: 4,
    ...staticTheme.typography.tiny,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
  },
  dayNumberWithVideo: {
    color: staticTheme.colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dayNumberInactive: {
    color: staticTheme.colors.text.disabled,
  },
  countBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: staticTheme.colors.brand.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    ...staticTheme.typography.tiny,
    fontWeight: '700',
    color: staticTheme.colors.white,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  processingIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 20,
  },
});