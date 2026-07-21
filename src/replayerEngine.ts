import type { HandHistory, Player, Action, Street } from './types';

export interface ReplayStep {
  stepIndex: number;
  street: Street;
  description: string;
  pot: number;
  board: string[];
  players: Player[];
  activePlayerSeat?: number;
  lastAction?: Action;
}

/**
 * Constrói a linha do tempo (steps) da simulação da mão com validações de segurança.
 */
export function buildReplayTimeline(hand: HandHistory | null | undefined): ReplayStep[] {
  // 🛡️ Guard Clause: Se a mão ou a lista de jogadores não existir, retorna array vazio
  if (!hand || !Array.isArray(hand.players)) {
    console.warn('buildReplayTimeline: Objeto "hand" nulo ou sem a propriedade "players".', hand);
    return [];
  }

  const steps: ReplayStep[] = [];

  // Mapeia os jogadores com segurança
  let currentPlayers: Player[] = hand.players.map((p) => ({
    ...p,
    chips: p.chips ?? 0,
  }));

  let currentPot = 0;
  const currentBoard: string[] = [];
  const actions: Action[] = Array.isArray(hand.actions) ? hand.actions : [];

  // Passo Inicial (Estado 0)
  steps.push({
    stepIndex: 0,
    street: 'preflop',
    description: 'Início da Mão - Blinds Postados',
    pot: 0,
    board: [],
    players: JSON.parse(JSON.stringify(currentPlayers)),
  });

  // Processa as ações caso existam
  actions.forEach((action, idx) => {
    if (['posts_sb', 'posts_bb', 'posts_ante', 'call', 'bet', 'raise'].includes(action.type)) {
      currentPot += action.amount || 0;
    }

    currentPlayers = currentPlayers.map((player) => {
      if (player.name === action.player && action.amount > 0) {
        return { ...player, chips: Math.max(0, player.chips - action.amount) };
      }
      return player;
    });

    const activePlayer = currentPlayers.find((p) => p.name === action.player);

    steps.push({
      stepIndex: idx + 1,
      street: action.street,
      description: `${action.player}: ${action.type.replace('_', ' ')} $${(action.amount || 0).toFixed(2)}`,
      pot: currentPot,
      board: [...currentBoard],
      players: JSON.parse(JSON.stringify(currentPlayers)),
      activePlayerSeat: activePlayer?.seat,
      lastAction: action,
    });
  });

  return steps;
}

// Alias para manter compatibilidade
export const generateReplaySteps = buildReplayTimeline;