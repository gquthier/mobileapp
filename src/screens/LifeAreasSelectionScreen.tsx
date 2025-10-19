// ============================================================================
// Life Areas Selection Screen
// Description: Écran d'onboarding pour sélectionner 3-5 domaines de vie
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { theme } from '../styles/theme';
import { LifeAreaTemplate } from '../types/momentum';
import { getLifeAreaTemplates, initializeMomentumSystem } from '../services/lifeAreasService';
import { supabase } from '../lib/supabase';

const MIN_AREAS = 3;
const MAX_AREAS = 5;

interface LifeAreasSelectionScreenProps {
  navigation: any;
  onComplete?: () => void; // Callback après initialisation réussie
}

export default function LifeAreasSelectionScreen({
  navigation,
  onComplete,
}: LifeAreasSelectionScreenProps) {
  const [templates, setTemplates] = useState<LifeAreaTemplate[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getLifeAreaTemplates();
      setTemplates(data);

      // Pré-sélectionner les 3 premiers recommandés
      const recommended = data.filter((t) => t.is_recommended).slice(0, 3);
      setSelectedAreas(new Set(recommended.map((t) => t.area_key)));
    } catch (error) {
      console.error('❌ Error loading templates:', error);
      Alert.alert('Erreur', 'Impossible de charger les domaines disponibles');
    } finally {
      setLoading(false);
    }
  };

  const toggleArea = (areaKey: string) => {
    const newSelected = new Set(selectedAreas);

    if (newSelected.has(areaKey)) {
      // Désélectionner (si on a plus que le minimum)
      if (newSelected.size > MIN_AREAS) {
        newSelected.delete(areaKey);
      }
    } else {
      // Sélectionner (si on n'a pas atteint le maximum)
      if (newSelected.size < MAX_AREAS) {
        newSelected.add(areaKey);
      }
    }

    setSelectedAreas(newSelected);
  };

  const handleContinue = async () => {
    if (selectedAreas.size < MIN_AREAS) {
      Alert.alert(
        'Sélection incomplète',
        `Veuillez sélectionner au moins ${MIN_AREAS} domaines de vie`
      );
      return;
    }

    try {
      setSubmitting(true);

      // Récupérer l'utilisateur actuel
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Récupérer la langue de l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('language')
        .eq('user_id', user.id)
        .single();

      const userLanguage = profile?.language || 'en';

      // Préparer les areas sélectionnés avec noms localisés
      const selectedTemplates = templates.filter((t) => selectedAreas.has(t.area_key));
      const areasToCreate = selectedTemplates.map((t) => ({
        area_key: t.area_key,
        display_name:
          userLanguage === 'fr' ? t.default_name_fr : t.default_name_en,
        emoji: t.default_emoji,
      }));

      // Initialiser le système
      const result = await initializeMomentumSystem({
        user_id: user.id,
        initial_score: 500,
        selected_life_areas: areasToCreate,
      });

      if (!result.success) {
        throw new Error(result.error || 'Initialization failed');
      }

      console.log('✅ Momentum system initialized successfully');

      // Navigation ou callback
      if (onComplete) {
        onComplete();
      } else {
        // Par défaut, aller au dashboard
        navigation.replace('MomentumDashboard');
      }
    } catch (error) {
      console.error('❌ Error initializing momentum:', error);
      Alert.alert(
        'Erreur',
        "Une erreur s'est produite lors de l'initialisation. Veuillez réessayer."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const canContinue = selectedAreas.size >= MIN_AREAS && selectedAreas.size <= MAX_AREAS;
  const selectedCount = selectedAreas.size;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choisis tes domaines de vie</Text>
        <Text style={styles.subtitle}>
          Sélectionne {MIN_AREAS} à {MAX_AREAS} domaines que tu veux tracker
        </Text>
        <Text style={styles.counter}>
          {selectedCount} / {MAX_AREAS} sélectionnés
        </Text>
      </View>

      {/* Templates Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {templates.map((template) => {
            const isSelected = selectedAreas.has(template.area_key);
            const isDisabled = !isSelected && selectedAreas.size >= MAX_AREAS;

            return (
              <TouchableOpacity
                key={template.area_key}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isDisabled && styles.cardDisabled,
                ]}
                onPress={() => toggleArea(template.area_key)}
                disabled={isDisabled && !isSelected}
                activeOpacity={0.7}
              >
                {/* Emoji */}
                <Text style={styles.emoji}>{template.default_emoji}</Text>

                {/* Name */}
                <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                  {template.default_name_fr}
                </Text>

                {/* Category badge */}
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: getCategoryColor(template.category) },
                  ]}
                >
                  <Text style={styles.categoryText}>{getCategoryLabel(template.category)}</Text>
                </View>

                {/* Selection indicator */}
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          {selectedCount < MIN_AREAS
            ? `Sélectionne encore ${MIN_AREAS - selectedCount} domaine${MIN_AREAS - selectedCount > 1 ? 's' : ''}`
            : 'Parfait ! Tu peux continuer'}
        </Text>

        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Commencer</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getCategoryColor(category?: string): string {
  switch (category) {
    case 'professional':
      return '#007AFF';
    case 'personal':
      return '#34C759';
    case 'health':
      return '#FF3B30';
    case 'social':
      return '#FF9500';
    default:
      return '#8E8E93';
  }
}

function getCategoryLabel(category?: string): string {
  switch (category) {
    case 'professional':
      return 'Pro';
    case 'personal':
      return 'Perso';
    case 'health':
      return 'Santé';
    case 'social':
      return 'Social';
    default:
      return 'Autre';
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.gray600,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.gray600,
    marginBottom: 12,
  },
  counter: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.gray200,
    position: 'relative',
  },
  cardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F0F9FF',
  },
  cardDisabled: {
    opacity: 0.4,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardTitleSelected: {
    color: theme.colors.primary,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.white,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
    backgroundColor: theme.colors.white,
  },
  footerHint: {
    fontSize: 14,
    color: theme.colors.gray600,
    textAlign: 'center',
    marginBottom: 16,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.gray300,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.white,
  },
});
