import { useState, useEffect, useCallback } from 'react';
// IMPORTANTE: Use 'import type' para interfaces/tipos
import type { HandHistory } from './types';
import { buildReplayTimeline } from './replayerEngine';
import type { ReplayStep } from './replayerEngine'; // 👈 Adicionado 'type' aqui

export function usePokerEngine(hand: HandHistory | null) {
  const [steps, setSteps] = useState<ReplayStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms por passo

  // Gera a lista de passos da simulação ao carregar a mão
  useEffect(() => {
    if (hand && Array.isArray(hand.players)) {
      const generatedSteps = buildReplayTimeline(hand);
      setSteps(generatedSteps);
      setCurrentStepIndex(0);
      setIsPlaying(false);
    } else {
      setSteps([]);
      setCurrentStepIndex(0);
      setIsPlaying(false);
    }
  }, [hand]);

  // Execução automática do Replay (Play/Pause)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && steps.length > 0) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, steps.length, playbackSpeed]);

  // Controles do Replayer
  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const togglePlay = useCallback(() => setIsPlaying((prev) => !prev), []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  }, [steps.length]);

  const currentStep: ReplayStep | null = steps[currentStepIndex] || null;

  return {
    steps,
    currentStepIndex,
    currentStep,
    totalSteps: steps.length,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    play,
    pause,
    togglePlay,
    nextStep,
    prevStep,
    goToStep,
  };
}