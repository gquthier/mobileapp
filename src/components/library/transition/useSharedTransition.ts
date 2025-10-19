import { useState, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { Asset, SourceRect, TransitionSpec, TRANSITION_DEFAULT } from '../types';
import { computeFitRect, TargetRect } from '../math/rectFit';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TransitionState {
  isTransitioning: boolean;
  direction: 'open' | 'close' | null;
  sourceRect: SourceRect | null;
  targetRect: TargetRect | null;
  asset: Asset | null;
}

interface UseSharedTransitionOptions {
  transitionSpec?: TransitionSpec;
  onOpenComplete?: () => void;
  onCloseComplete?: () => void;
}

export function useSharedTransition({
  transitionSpec = TRANSITION_DEFAULT,
  onOpenComplete,
  onCloseComplete,
}: UseSharedTransitionOptions = {}) {
  const [transitionState, setTransitionState] = useState<TransitionState>({
    isTransitioning: false,
    direction: null,
    sourceRect: null,
    targetRect: null,
    asset: null,
  });

  const open = useCallback(
    (asset: Asset, sourceRect: SourceRect) => {
      // Calculate target rect (fit mode for full-screen viewer)
      const targetRect = computeFitRect(
        asset.width,
        asset.height,
        SCREEN_WIDTH,
        SCREEN_HEIGHT,
        'fit'
      );

      setTransitionState({
        isTransitioning: true,
        direction: 'open',
        sourceRect,
        targetRect,
        asset,
      });
    },
    []
  );

  const close = useCallback(
    (sourceRect: SourceRect) => {
      if (!transitionState.asset || !transitionState.targetRect) {
        return;
      }

      setTransitionState((prev) => ({
        ...prev,
        isTransitioning: true,
        direction: 'close',
        sourceRect,
      }));
    },
    [transitionState.asset, transitionState.targetRect]
  );

  const handleAnimationComplete = useCallback(() => {
    if (transitionState.direction === 'open') {
      setTransitionState((prev) => ({
        ...prev,
        isTransitioning: false,
      }));
      onOpenComplete?.();
    } else if (transitionState.direction === 'close') {
      setTransitionState({
        isTransitioning: false,
        direction: null,
        sourceRect: null,
        targetRect: null,
        asset: null,
      });
      onCloseComplete?.();
    }
  }, [transitionState.direction, onOpenComplete, onCloseComplete]);

  return {
    transitionState,
    open,
    close,
    handleAnimationComplete,
    transitionSpec,
  };
}
