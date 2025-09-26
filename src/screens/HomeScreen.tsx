import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/theme';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { Chip } from '../components/Chip';
import { ChapterCard } from '../components/ChapterCard';
import { PromptCard } from '../components/PromptCard';

const HomeScreen: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filters = ['All', 'In Progress', 'Completed'];

  const chapters = [
    {
      title: 'Chapter 3 — New City',
      period: 'Jan–Apr 2025',
      count: 12,
      progress: 60,
    },
    {
      title: 'Chapter 2 — Startup',
      period: 'Aug–Dec 2024',
      count: 26,
      progress: 100,
    },
    {
      title: 'Chapter 1 — Graduation',
      period: 'May–Jul 2024',
      count: 18,
      progress: 100,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TopBar
          title="Your Chapters"
          right={<Icon name="search" size={20} color={colors.black} />}
        />

        <View style={styles.filters}>
          {filters.map((filter) => (
            <Chip
              key={filter}
              active={selectedFilter === filter}
              onPress={() => setSelectedFilter(filter)}
            >
              {filter}
            </Chip>
          ))}
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {chapters.map((chapter, index) => (
            <ChapterCard
              key={index}
              title={chapter.title}
              period={chapter.period}
              count={chapter.count}
              progress={chapter.progress}
              onPress={() => {}}
            />
          ))}

          <View style={styles.wordOfDaySection}>
            <PromptCard
              title="Word of the Day"
              items={['Focus — Compare progress to your past self.']}
            />
          </View>

          {/* Espace pour la navigation bottom */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  wordOfDaySection: {
    marginTop: 16,
  },
});

export default HomeScreen;