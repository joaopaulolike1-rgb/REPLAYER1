import React from 'react';
import { usePokerEngine } from './usePokerEngine';
import type { HandHistory, Player, HandInvestmentSummary } from './types';
import './PokerReplayerStyles.css';

const suitSymbols: Record<string, string> = {
  clubs: '♣',
  hearts: '♥',
  spades: '♠',
  diamonds: '♦',
  c: '♣',
  h: '♥',
  s: '♠',
  d: '♦',
};

interface CardObject {
  rank: string;
  suit: string;
}

function parseCard(cardInput: string | CardObject | null | undefined): CardObject | 'back' | null {
  if (!cardInput) return null;
  if (cardInput === 'back') return 'back';
  if (typeof cardInput === 'object' && cardInput.rank && cardInput.suit) {
    return cardInput;
  }
  if (typeof cardInput === 'string') {
    const trimmed = cardInput.trim();
    if (trimmed.length >= 2) {
      let rank = trimmed.slice(0, -1);
      const suit = trimmed.slice(-1).toLowerCase();
      if (rank === 'T') rank = '10';
      return { rank, suit };
    }
  }
  return null;
}

const getSeatPositionStyle = (seatNumber: number, maxSeats: number = 6): React.CSSProperties => {
  const total = maxSeats || 6;
  const angle = ((seatNumber - 1) / total) * 2 * Math.PI + Math.PI / 2;
  
  const rx = 40;
  const ry = 36;

  const left = 50 + rx * Math.cos(angle);
  const top = 50 + ry * Math.sin(angle);

  return {
    position: 'absolute',
    left: `${left.toFixed(2)}%`,
    top: `${top.toFixed(2)}%`,
    transform: 'translate(-50%, -50%)',
  };
};

interface PokerReplayerUIProps {
  hand?: HandHistory;
  handData?: HandHistory;
  heroSummary?: HandInvestmentSummary;
  sessionNetResult?: number;
  engine?: ReturnType<typeof usePokerEngine>;
}

export const PokerReplayerUI: React.FC<PokerReplayerUIProps> = ({
  hand,
  handData,
  heroSummary,
  sessionNetResult,
  engine: externalEngine,
}) => {
  const activeHand = hand || handData || null;
  const internalEngine = usePokerEngine(activeHand);
  const engine = externalEngine || internalEngine;

  const {
    currentStep,
    currentStepIndex,
    totalSteps,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    togglePlay,
    nextStep,
    prevStep,
    goToStep,
  } = engine;

  if (!currentStep) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#8a94a6' }}>
        Nenhuma ação/mão selecionada para carregar no replayer.
      </div>
    );
  }

  // Renderizador de Carta com Naipe no Canto Superior Direito
  const renderCard = (cardInput: any, key: string | number) => {
    const card = parseCard(cardInput);
    if (!card) return null;

    if (card === 'back') {
      return <div key={key} className="card back" />;
    }

    const suitClass =
      card.suit === 'c' || card.suit === 'clubs'
        ? 'clubs'
        : card.suit === 'h' || card.suit === 'hearts'
        ? 'hearts'
        : card.suit === 's' || card.suit === 'spades'
        ? 'spades'
        : 'diamonds';

    const symbol = suitSymbols[card.suit] || suitSymbols[suitClass] || '';

    return (
      <div key={key} className={`card ${suitClass}`}>
        <div className="card-top-row">
          <span className="card-rank">{card.rank}</span>
          <span className="card-suit-top">{symbol}</span>
        </div>
        <div className="card-bottom-suit">{symbol}</div>
      </div>
    );
  };

  const tableName = activeHand?.game_info?.table_name || 'Mesa';
  const pokerVariant = activeHand?.game_info?.poker_variant || "Hold'em";
  const stakes = activeHand?.game_info?.stakes || '';
  const maxSeats = activeHand?.game_info?.max_seats || 6;

  const handNet = heroSummary?.netResult;

  return (
    <div className="replayer-wrapper">
      {/* Cabeçalho do Replayer com Informações de Lucro */}
      <div className="header-bar">
        <div>
          <strong>{tableName}</strong> | <span>{pokerVariant}</span> | Stakes: <strong>{stakes}</strong>
        </div>

        <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem' }}>
          {handNet !== undefined && (
            <span>
              Lucro Mão: <strong style={{ color: handNet >= 0 ? '#00e676' : '#ff5252' }}>
                {handNet >= 0 ? '+' : ''}${handNet.toFixed(2)}
              </strong>
            </span>
          )}

          {sessionNetResult !== undefined && (
            <span>
              Sessão: <strong style={{ color: sessionNetResult >= 0 ? '#00e676' : '#ff5252' }}>
                {sessionNetResult >= 0 ? '+' : ''}${sessionNetResult.toFixed(2)}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Feltro da Mesa */}
      <div className="poker-stage">
        <div className="poker-table">
          <div className="center-board">
            <div className="pot-container">
              Pote: ${currentStep.pot.toFixed(2)}
            </div>
            <div className="board-cards">
              {currentStep.board && currentStep.board.map((c, i) => renderCard(c, i))}
            </div>
          </div>

          <div id="seats-container">
            {currentStep.players.map((player: Player) => (
              <div
                key={player.seat || player.name}
                className={`seat seat-${player.seat} ${player.isHero ? 'is-hero' : ''} ${player.isFolded ? 'folded' : ''}`}
                data-seat={player.seat}
                data-position={player.position || `Seat ${player.seat}`}
                style={getSeatPositionStyle(player.seat, maxSeats)}
              >
                {/* Cartas do Jogador */}
                {player.cards && player.cards.length > 0 && (
                  <div className="player-cards">
                    {player.cards.map((c, i) =>
                      renderCard(player.isFolded ? 'back' : c, i)
                    )}
                  </div>
                )}

                {/* Box de Informações do Jogador */}
                <div className={`player-box ${player.isCurrentActor ? 'active-actor' : ''}`}>
                  <div className="avatar">
                    {player.name ? player.name.substring(0, 2).toUpperCase() : 'P'}
                  </div>
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-stack">${(player.chips ?? 0).toFixed(2)}</div>
                  </div>

                  {player.hasDealerButton && <div className="dealer-button">D</div>}
                </div>

                {player.currentActionBadge && (
                  <div className="action-badge">
                    {player.currentActionBadge.type.replace('_', ' ')}{' '}
                    {player.currentActionBadge.amount ? `$${player.currentActionBadge.amount.toFixed(2)}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controles de Reprodução */}
      <div className="controls-bar">
        <button className="btn" onClick={prevStep} disabled={currentStepIndex === 0}>
          ❮ Anterior
        </button>
        <button className="btn btn-primary" onClick={togglePlay}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button className="btn" onClick={nextStep} disabled={currentStepIndex === totalSteps - 1 || totalSteps === 0}>
          Próximo ❯
        </button>

        <input
          type="range"
          min={0}
          max={Math.max(0, totalSteps - 1)}
          value={currentStepIndex}
          onChange={(e) => goToStep(Number(e.target.value))}
          style={{ width: '180px', cursor: 'pointer' }}
        />

        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          className="btn"
          style={{ padding: '4px' }}
        >
          <option value={1500}>0.75x</option>
          <option value={1000}>1.0x</option>
          <option value={500}>2.0x</option>
        </select>
      </div>

      <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#888', textAlign: 'center' }}>
        Ação ({totalSteps > 0 ? currentStepIndex + 1 : 0}/{totalSteps}): <strong>{currentStep.description}</strong>
      </div>
    </div>
  );
};