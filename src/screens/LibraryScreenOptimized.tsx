// Exemple d'optimisation Liquid Glass pour votre LibraryScreen
import { LiquidGlassView, LiquidGlassContainer, isLiquidGlassSupported } from '@callstack/liquid-glass';

// ✅ 1. Créer un composant réutilisable pour les éléments Glass
const GlassButton = ({ 
  children, 
  onPress, 
  interactive = true, 
  tintColor, 
  unionId,
  style,
  ...props 
}) => (
  <LiquidGlassView
    style={[
      {
        borderRadius: 18,
        overflow: 'hidden',
      },
      !isLiquidGlassSupported && {
        backgroundColor: 'rgba(128, 128, 128, 0.15)',
      },
      style,
    ]}
    interactive={interactive}
    tintColor={tintColor}
    unionId={unionId}
    reactsToPointer={true}
    {...props}
  >
    <TouchableOpacity
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  </LiquidGlassView>
);

// ✅ 2. Header optimisé avec container
const OptimizedHeader = ({ insets, theme, state, handlers }) => (
  <View style={[styles.header, { paddingTop: insets.top + theme.spacing['3'] }]}>
    {!state.search.showSearchBar ? (
      <>
        {/* Chapters bubble - Standalone */}
        <LiquidGlassView
          style={[styles.chaptersGlassContainer]}
          interactive={false}
          tintColor={theme.colors.brand.primary.withAlpha(0.1)}
          transitionId="chapters"
        >
          <View style={styles.chaptersTextContainer}>
            <Text style={styles.title}>Chapters</Text>
          </View>
        </LiquidGlassView>

        <View style={{ flex: 1 }} />

        {/* Container pour les contrôles de droite - permet le blending */}
        <LiquidGlassContainer spacing={6}>
          <View style={styles.headerRight}>
            {/* Chevron Button */}
            <GlassButton
              onPress={handlers.toggleSearchBar}
              style={styles.chevronGlassContainer}
              tintColor={theme.colors.ui.surfaceHover.withAlpha(0.1)}
            >
              <Icon name="chevronLeft" size={16} color={theme.colors.text.primary} />
            </GlassButton>

            {/* View Mode Toggle - Union des boutons */}
            <LiquidGlassContainer spacing={2}>
              <View style={styles.viewToggleInner}>
                <GlassButton
                  unionId="viewToggle"
                  onPress={() => handlers.setViewMode('calendar')}
                  style={[
                    styles.viewToggleOption,
                    state.viewMode === 'calendar' && styles.viewToggleOptionActive,
                  ]}
                  tintColor={state.viewMode === 'calendar' ? '#9B66FF' : undefined}
                >
                  <Icon
                    name="calendar"
                    size={16}
                    color={state.viewMode === 'calendar' ? '#9B66FF' : theme.colors.text.secondary}
                  />
                </GlassButton>

                <GlassButton
                  unionId="viewToggle"
                  onPress={() => handlers.setViewMode('grid')}
                  style={[
                    styles.viewToggleOption,
                    state.viewMode === 'grid' && styles.viewToggleOptionActive,
                  ]}
                  tintColor={state.viewMode === 'grid' ? '#9B66FF' : undefined}
                >
                  <Icon
                    name="grid"
                    size={16}
                    color={state.viewMode === 'grid' ? '#9B66FF' : theme.colors.text.secondary}
                  />
                </GlassButton>
              </View>
            </LiquidGlassContainer>

            {/* Streak Button */}
            <GlassButton
              onPress={() => handlers.toggleStreakModal(true)}
              style={styles.streakGlassContainer}
              tintColor={theme.colors.brand.primary.withAlpha(0.1)}
            >
              <View style={styles.streakContainer}>
                <Image
                  source={require('../../assets/ui-elements/fire.png')}
                  style={styles.fireIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.streakText, { color: theme.colors.text.primary }]}>
                  {state.currentStreak}
                </Text>
              </View>
            </GlassButton>
          </View>
        </LiquidGlassContainer>
      </>
    ) : (
      // Mode de recherche étendu...
      <></>
    )}
  </View>
);

// ✅ 3. Composant pour les transitions fluides
const GlassTransition = ({ 
  isVisible, 
  transitionId, 
  children, 
  style,
  ...props 
}) => {
  return (
    <LiquidGlassView
      style={[
        style,
        { opacity: isVisible ? 1 : 0 }
      ]}
      transitionId={transitionId}
      {...props}
    >
      {children}
    </LiquidGlassView>
  );
};

// ✅ 4. Hook pour gérer les états Glass de manière optimisée
const useGlassEffects = () => {
  const [glassStates, setGlassStates] = useState({
    chaptersVisible: true,
    searchExpanded: false,
    controlsVisible: true,
  });

  const updateGlassState = useCallback((key, value) => {
    setGlassStates(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  return {
    glassStates,
    updateGlassState,
  };
};

export {
  GlassButton,
  OptimizedHeader,
  GlassTransition,
  useGlassEffects,
};