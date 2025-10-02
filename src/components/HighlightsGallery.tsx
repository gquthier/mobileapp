import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { theme } from '../styles';
import { Icon } from './Icon';
import { TranscriptionJob } from '../services/transcriptionJobService';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 32; // Full width with padding

interface HighlightsGalleryProps {
  transcriptionJobs: TranscriptionJob[];
  onHighlightPress?: (job: TranscriptionJob, highlight: any) => void;
}

interface HighlightData {
  title: string;
  summary: string;
  startTime?: number;
  endTime?: number;
  importance: number;
  themes: string[];
  category: string;
}

interface HighlightDisplay {
  job: TranscriptionJob;
  highlight: HighlightData;
  date: Date;
}

export const HighlightsGallery: React.FC<HighlightsGalleryProps> = ({
  transcriptionJobs,
  onHighlightPress,
}) => {
  // Extraire tous les highlights de tous les jobs
  const allHighlights = useMemo(() => {
    const highlights: HighlightDisplay[] = [];

    transcriptionJobs.forEach(job => {
      if (job.transcript_highlight?.highlights && Array.isArray(job.transcript_highlight.highlights)) {
        job.transcript_highlight.highlights.forEach((highlight: HighlightData) => {
          highlights.push({
            job,
            highlight,
            date: new Date(job.completed_at || job.created_at),
          });
        });
      }
    });

    // Trier par importance puis par date
    return highlights.sort((a, b) => {
      if (a.highlight.importance !== b.highlight.importance) {
        return b.highlight.importance - a.highlight.importance; // Plus importante en premier
      }
      return b.date.getTime() - a.date.getTime(); // Plus récent en premier
    });
  }, [transcriptionJobs]);

  // Grouper par date pour l'affichage
  const highlightsByDate = useMemo(() => {
    const grouped: { [key: string]: HighlightDisplay[] } = {};

    allHighlights.forEach(item => {
      const dateKey = item.date.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });

    return grouped;
  }, [allHighlights]);

  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
  };

  const getImportanceColor = (importance: number): string => {
    if (importance >= 8) return theme.colors.brand.primary;
    if (importance >= 6) return '#FFA500'; // Orange for medium importance
    return theme.colors.text.secondary;
  };

  const getCategoryIcon = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'achievement':
      case 'accomplishment':
        return 'trophy';
      case 'emotion':
      case 'emotional':
        return 'heart';
      case 'insight':
      case 'reflection':
        return 'lightbulb';
      case 'goal':
      case 'project':
        return 'target';
      case 'relationship':
        return 'users';
      default:
        return 'star';
    }
  };

  const renderHighlightCard = (item: HighlightDisplay) => {
    const { job, highlight } = item;

    return (
      <TouchableOpacity
        key={`${job.id}-${highlight.title}`}
        style={styles.highlightCard}
        onPress={() => onHighlightPress?.(job, highlight)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Icon
              name={getCategoryIcon(highlight.category)}
              size={20}
              color={getImportanceColor(highlight.importance)}
            />
            <Text style={styles.highlightTitle} numberOfLines={1}>
              {highlight.title}
            </Text>
          </View>
          <View style={styles.importanceContainer}>
            <View style={[
              styles.importanceBadge,
              { backgroundColor: getImportanceColor(highlight.importance) }
            ]}>
              <Text style={styles.importanceText}>{highlight.importance}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.highlightSummary} numberOfLines={2}>
          {highlight.summary}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.themes}>
            {highlight.themes?.slice(0, 3).map((theme: string, index: number) => (
              <View key={index} style={styles.themeChip}>
                <Text style={styles.themeText}>{theme}</Text>
              </View>
            ))}
            {highlight.themes?.length > 3 && (
              <Text style={styles.moreThemes}>+{highlight.themes.length - 3}</Text>
            )}
          </View>

          {highlight.startTime !== undefined && (
            <View style={styles.timeContainer}>
              <Icon name="clock" size={12} color={theme.colors.text.tertiary} />
              <Text style={styles.timeText}>
                {Math.floor(highlight.startTime)}s
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDateSection = (dateKey: string, highlights: HighlightDisplay[]) => {
    const date = new Date(dateKey);

    return (
      <View key={dateKey} style={styles.dateSection}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateTitle}>{formatDate(date)}</Text>
          <Text style={styles.highlightCount}>
            {highlights.length} moment{highlights.length > 1 ? 's' : ''} clé{highlights.length > 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.highlightsContainer}>
          {highlights.map(item => renderHighlightCard(item))}
        </View>
      </View>
    );
  };

  if (allHighlights.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="lightbulb" size={48} color={theme.colors.text.disabled} />
        <Text style={styles.emptyTitle}>Aucun highlight disponible</Text>
        <Text style={styles.emptyText}>
          Les moments clés de vos vidéos apparaîtront ici une fois qu'elles seront transcrites et analysées
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {Object.entries(highlightsByDate).map(([dateKey, highlights]) =>
        renderDateSection(dateKey, highlights)
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing['6'],
  },
  dateSection: {
    marginBottom: theme.spacing['6'],
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    backgroundColor: theme.colors.gray50,
  },
  dateTitle: {
    ...theme.typography.h3,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textTransform: 'capitalize',
  },
  highlightCount: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  highlightsContainer: {
    paddingHorizontal: theme.spacing['4'],
    paddingTop: theme.spacing['2'],
    gap: theme.spacing['3'],
  },
  highlightCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: theme.spacing['4'],
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing['2'],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
    flex: 1,
  },
  highlightTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  importanceContainer: {
    marginLeft: theme.spacing['2'],
  },
  importanceBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  importanceText: {
    ...theme.typography.tiny,
    fontWeight: '700',
    color: theme.colors.white,
  },
  highlightSummary: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing['3'],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themes: {
    flexDirection: 'row',
    gap: theme.spacing['2'],
    flex: 1,
    flexWrap: 'wrap',
  },
  themeChip: {
    backgroundColor: theme.colors.gray100,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  themeText: {
    ...theme.typography.tiny,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  moreThemes: {
    ...theme.typography.tiny,
    color: theme.colors.text.tertiary,
    marginLeft: theme.spacing['1'],
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: theme.spacing['2'],
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['10'],
  },
  emptyTitle: {
    ...theme.typography.h2,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing['4'],
    marginBottom: theme.spacing['2'],
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});