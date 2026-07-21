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

export function buildReplayTimeline(hand: HandHistory | null | undefined): ReplayStep[] {
  if (!hand || !Array.isArray(hand.players)) {
    return [];
  }

  const steps: ReplayStep[] = [];

  let currentPlayers: Player[] = hand.players.map((p) => ({
    ...p,
    chips: p.chips ?? 0,
    isFolded: false,
    isCurrentActor: false,
    currentActionBadge: undefined,
  }));

  let currentPot = 0;
  const currentBoard: string[] = [];
  const handBoard = Array.isArray(hand.board) ? hand.board : [];
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

  // Processa as ações
  actions.forEach((action, idx) => {
    // 1. Atualizar o board dinamicamente conforme a street
    if (action.street === 'flop' && currentBoard.length < 3 && handBoard.length >= 3) {
      currentBoard.length = 0;
      currentBoard.push(...handBoard.slice(0, 3));
    } else if (action.street === 'turn' && currentBoard.length < 4 && handBoard.length >= 4) {
      currentBoard.length = 0;
      currentBoard.push(...handBoard.slice(0, 4));
    } else if (action.street === 'river' && currentBoard.length < 5 && handBoard.length >= 5) {
      currentBoard.length = 0;
      currentBoard.push(...handBoard.slice(0, 5));
    }

    // 2. Atualizar o pote
    if (['posts_sb', 'posts_bb', 'posts_ante', 'call', 'bet', 'raise'].includes(action.type)) {
      currentPot += action.amount || 0;
    }

    // 3. Atualizar estado dos jogadores
    currentPlayers = currentPlayers.map((player) => {
      const isActor = player.name === action.player;
      let chips = player.chips;
      let isFolded = player.isFolded ?? false;

      if (isActor) {
        if (action.amount > 0 && ['posts_sb', 'posts_bb', 'posts_ante', 'call', 'bet', 'raise'].includes(action.type)) {
          chips = Math.max(0, player.chips - action.amount);
        }
        if (action.type === 'fold') {
          isFolded = true;
        }
      }

      return {
        ...player,
        chips,
        isFolded,
        isCurrentActor: isActor,
        currentActionBadge: isActor
          ? {
              type: action.type,
              amount: action.amount,
            }
          : player.currentActionBadge,
      };
    });

    const activePlayer = currentPlayers.find((p) => p.name === action.player);

    steps.push({
      stepIndex: idx + 1,
      street: action.street,
      description: `${action.player}: ${action.type.replace('_', ' ')} ${action.amount ? `$${action.amount.toFixed(2)}` : ''}`,
      pot: currentPot,
      board: [...currentBoard],
      players: JSON.parse(JSON.stringify(currentPlayers)),
      activePlayerSeat: activePlayer?.seat,
      lastAction: action,
    });
  });

  return steps;
}

export const generateReplaySteps = buildReplayTimeline;