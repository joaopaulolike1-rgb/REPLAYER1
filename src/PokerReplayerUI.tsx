import React from 'react';
import { usePokerEngine } from './usePokerEngine';
import type { ParsedPokerHand, Card } from './types';
import './PokerReplayerStyles.css'; // Contém todo o CSS extraído do index.html

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

interface PokerReplayerUIProps {
  hand: ParsedPokerHand;
}

export const PokerReplayerUI: React.FC<PokerReplayerUIProps> = ({ hand }) => {
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
  } = usePokerEngine(hand);

  if (!currentStep) return <div>Carregando Engine...</div>;

  const renderCard = (card: Card | 'back' | null, key: string | number) => {
    if (!card) return null;

    if (card === 'back') {
      return <div key={key} className="card back" />;
    }

    const suitClass = card.suit === 'c' ? 'clubs' : card.suit === 'h' ? 'hearts' : card.suit === 's' ? 'spades' : 'diamonds';
    const symbol = suitSymbols[card.suit] || '';

    return (
      <div key={key} className={`card ${suitClass}`}>
        <div>{card.rank}</div>
        <div style={{ alignSelf: 'flex-end' }}>{symbol}</div>
      </div>
    );
  };

  return (
    <div className="replayer-wrapper">
      {/* 1. Cabeçalho de Metadados da Mesa */}
      <div className="header-bar">
        <div>
          <strong>{hand.gameInfo.tableName}</strong> | <span>{hand.gameInfo.pokerVariant}</span>
        </div>
        <div>
          Blinds: <strong>${hand.gameInfo.smallBlind.toFixed(2)}/${hand.gameInfo.bigBlind.toFixed(2)}</strong>
        </div>
      </div>

      {/* 2. Palco e Feltro Oval do Poker */}
      <div className="poker-stage">
        <div className="poker-table">
          {/* Pote Central e Bordo */}
          <div className="center-board">
            <div className="pot-container">
              Pote: ${currentStep.pot.toFixed(2)}
            </div>
            <div className="board-cards">
              {currentStep.boardCards.map((c, i) => renderCard(c, i))}
            </div>
          </div>

          {/* Jogadores Renderizados Dinamicamente */}
          <div id="seats-container">
            {currentStep.players.map((player) => (
              <div
                key={player.seatIndex}
                className={`seat ${player.isHero ? 'is-hero' : ''} ${player.isFolded ? 'folded' : ''}`}
                data-position={player.positionName}
              >
                {/* Cartas do Jogador */}
                {player.cards && (
                  <div className="player-cards">
                    {player.cards.map((c, i) => renderCard(c, i))}
                  </div>
                )}

                {/* Caixa de Informações do Player */}
                <div className={`player-box ${player.isCurrentActor ? 'active-actor' : ''}`}>
                  <div className="avatar">
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-stack">${player.stack.toFixed(2)}</div>
                  </div>

                  {/* Botão de Dealer (D) */}
                  {player.hasDealerButton && <div className="dealer-button">D</div>}
                </div>

                {/* Badge de Ação Ativa */}
                {player.currentActionBadge && (
                  <div className="action-badge">
                    {player.currentActionBadge.type}{' '}
                    {player.currentActionBadge.amount ? `$${player.currentActionBadge.amount.toFixed(2)}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Painel de Controle e Barra de Progresso */}
      <div className="controls-bar">
        <button className="btn" onClick={prevStep} disabled={currentStepIndex === 0}>
          ❮ Anterior
        </button>
        <button className="btn btn-primary" onClick={togglePlay}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button className="btn" onClick={nextStep} disabled={currentStepIndex === totalSteps - 1}>
          Próximo ❯
        </button>

        {/* Slider da Linha do Tempo */}
        <input
          type="range"
          min={0}
          max={totalSteps - 1}
          value={currentStepIndex}
          onChange={(e) => goToStep(Number(e.target.value))}
          style={{ width: '180px', cursor: 'pointer' }}
        />

        {/* Seletor de Velocidade */}
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

      {/* Descrição do Passo Atual */}
      <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#888', textAlign: 'center' }}>
        Ação ({currentStepIndex + 1}/{totalSteps}): <strong>{currentStep.description}</strong>
      </div>
    </div>
  );
};