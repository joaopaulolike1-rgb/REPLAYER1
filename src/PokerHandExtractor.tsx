import React, { useState, ChangeEvent } from 'react';
import { parseHandHistoryFile } from './pokerstarsParser';
import type { ParsedPokerHand } from './types';

export const PokerHandExtractor: React.FC = () => {
  const [parsedHands, setParsedHands] = useState<ParsedPokerHand[]>([]);
  const [selectedHandIndex, setSelectedHandIndex] = useState<number>(0);
  const [filterType, setFilterType] = useState<'all' | 'invested' | 'not_invested'>('all');

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const hands = parseHandHistoryFile(content);
        setParsedHands(hands);
        setSelectedHandIndex(0);
      }
    };
    reader.readAsText(file);
  };

  const filteredHands = parsedHands.filter(h => {
    if (filterType === 'invested') return h.heroInvested;
    if (filterType === 'not_invested') return !h.heroInvested;
    return true;
  });

  const totalHands = parsedHands.length;
  const investedHandsCount = parsedHands.filter(h => h.heroInvested).length;
  const nonInvestedHandsCount = parsedHands.filter(h => !h.heroInvested).length;
  const voluntaryInvestCount = parsedHands.filter(h => h.investmentType === 'voluntary').length;

  const currentHand = filteredHands[selectedHandIndex];

  return (
    <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif', backgroundColor: '#1e1e2e', color: '#cdd6f4', minHeight: '100vh' }}>
      <h1> Extrator de Hand Histories - PokerStars</h1>
      <p style={{ color: '#a6adc8' }}>
        Estrutura de extração desacoplada para renderização em Hand Replayer.
      </p>

      {/* Upload de Arquivo */}
      <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#313244', borderRadius: '8px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
          Selecione o arquivo de Hand History (.txt):
        </label>
        <input type="file" accept=".txt" onChange={handleFileUpload} style={{ color: '#cdd6f4' }} />
      </div>

      {/* Dashboard de Métricas de Investimento */}
      {totalHands > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#45475a', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <h3>Total de Mãos</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0' }}>{totalHands}</p>
          </div>
          <div style={{ backgroundColor: '#a6e3a1', color: '#11111b', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <h3>Com Investimento</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0' }}>{investedHandsCount}</p>
            <small>({((investedHandsCount / totalHands) * 100).toFixed(1)}%)</small>
          </div>
          <div style={{ backgroundColor: '#f38ba8', color: '#11111b', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <h3>Sem Investimento</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0' }}>{nonInvestedHandsCount}</p>
            <small>({((nonInvestedHandsCount / totalHands) * 100).toFixed(1)}%)</small>
          </div>
          <div style={{ backgroundColor: '#89b4fa', color: '#11111b', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <h3>Voluntário (VPIP)</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0' }}>{voluntaryInvestCount}</p>
            <small>({((voluntaryInvestCount / totalHands) * 100).toFixed(1)}%)</small>
          </div>
        </div>
      )}

      {/* Filtros e Lista de Mãos */}
      {totalHands > 0 && (
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Painel Esquerdo: Filtros e Seleção */}
          <div style={{ width: '35%', backgroundColor: '#313244', padding: '16px', borderRadius: '8px' }}>
            <h3> Filtrar Mãos</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button 
                onClick={() => { setFilterType('all'); setSelectedHandIndex(0); }}
                style={{ flex: 1, padding: '8px', backgroundColor: filterType === 'all' ? '#89b4fa' : '#45475a', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#11111b', fontWeight: 'bold' }}
              >
                Todas ({totalHands})
              </button>
              <button 
                onClick={() => { setFilterType('invested'); setSelectedHandIndex(0); }}
                style={{ flex: 1, padding: '8px', backgroundColor: filterType === 'invested' ? '#a6e3a1' : '#45475a', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#11111b', fontWeight: 'bold' }}
              >
                Investiu
              </button>
              <button 
                onClick={() => { setFilterType('not_invested'); setSelectedHandIndex(0); }}
                style={{ flex: 1, padding: '8px', backgroundColor: filterType === 'not_invested' ? '#f38ba8' : '#45475a', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#11111b', fontWeight: 'bold' }}
              >
                Não Investiu
              </button>
            </div>

            <h4>Mãos Filtradas ({filteredHands.length}):</h4>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {filteredHands.map((hand, idx) => (
                <div
                  key={hand.gameInfo.handId}
                  onClick={() => setSelectedHandIndex(idx)}
                  style={{
                    padding: '10px',
                    marginBottom: '8px',
                    borderRadius: '4px',
                    backgroundColor: idx === selectedHandIndex ? '#45475a' : '#1e1e2e',
                    borderLeft: `5px solid ${hand.heroInvested ? '#a6e3a1' : '#f38ba8'}`,
                    cursor: 'pointer',
                  }}
                >
                  <div><strong>ID: #{hand.gameInfo.handId}</strong></div>
                  <small>
                    Hero: {hand.heroName || 'N/A'} | Tipo: {hand.investmentType}
                  </small>
                </div>
              ))}
            </div>
          </div>

          {/* Painel Direito: Injeção JSON no Replayer */}
          <div style={{ width: '65%', backgroundColor: '#313244', padding: '16px', borderRadius: '8px' }}>
            <h3> Estado Gerado (Injeção no Poker Replayer)</h3>
            {currentHand ? (
              <div>
                <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#181825', borderRadius: '4px' }}>
                  <span><strong>Hero:</strong> {currentHand.heroName} | </span>
                  <span><strong>Investiu:</strong> {currentHand.heroInvested ? ' SIM' : ' NÃO'} | </span>
                  <span><strong>Classificação:</strong> {currentHand.investmentType}</span>
                </div>

                <h4>Estrutura JSON Pronta:</h4>
                <pre style={{ backgroundColor: '#181825', padding: '12px', borderRadius: '6px', overflowX: 'auto', maxHeight: '350px', fontSize: '12px', color: '#a6e3a1' }}>
                  {JSON.stringify(currentHand, null, 2)}
                </pre>
              </div>
            ) : (
              <p>Nenhuma mão selecionada.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PokerHandExtractor;