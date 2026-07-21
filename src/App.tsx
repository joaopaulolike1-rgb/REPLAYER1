import React, { useState, useMemo, ChangeEvent } from 'react';
import type { HandHistory, FilterType } from './types';
import { parsePokerstarsHandHistory, divideHandsByInvestment } from './pokerstarsParser';
import { buildReplayTimeline } from './replayerEngine';
import { usePokerEngine } from './usePokerEngine';
import { PokerReplayerUI } from './PokerReplayerUI';
import './PokerReplayerStyles.css';

const SAMPLE_HAND_TXT = `PokerStars Zoom Hand #261495545060:  Hold'em No Limit ($0.02/$0.05) - 2026/07/20 18:49:25 BRT [2026/07/20 17:49:25 ET]
Table 'Donati' 6-max Seat #1 is the button
Seat 1: Xumbin Jr ($13.97 in chips) 
Seat 2: billybrims ($5 in chips) 
Seat 3: McLovinAAKK ($5 in chips) 
Seat 4: EduA321 ($2.06 in chips) 
Seat 5: FlyerLeVraiCH ($6.99 in chips) 
Seat 6: ScriptPokker ($7.26 in chips) 
billybrims: posts small blind $0.02
McLovinAAKK: posts big blind $0.05
*** HOLE CARDS ***
Dealt to McLovinAAKK [9c Ac]
EduA321: folds 
FlyerLeVraiCH: folds 
ScriptPokker: folds 
Xumbin Jr: raises $0.05 to $0.10
billybrims: folds 
McLovinAAKK: calls $0.05
*** FLOP *** [Th 2h Js]
McLovinAAKK: checks 
Xumbin Jr: bets $0.07
McLovinAAKK: calls $0.07
*** TURN *** [Th 2h Js] [Jh]
McLovinAAKK: checks 
Xumbin Jr: bets $0.35
McLovinAAKK: folds 
Uncalled bet ($0.35) returned to Xumbin Jr
Xumbin Jr collected $0.36 from pot
*** SUMMARY ***
Total pot $0.36 | Rake $0.01 
Board [Th 2h Js Jh]
Seat 1: Xumbin Jr (button) collected ($0.35)
Seat 2: billybrims (small blind) folded before Flop
Seat 3: McLovinAAKK (big blind) folded on the Turn
Seat 4: EduA321 folded before Flop (didn't bet)
Seat 5: FlyerLeVraiCH folded before Flop (didn't bet)
Seat 6: ScriptPokker folded before Flop (didn't bet)
`;

export const App: React.FC = () => {
  const [rawText, setRawText] = useState<string>(SAMPLE_HAND_TXT);
  const [heroName, setHeroName] = useState<string>('McLovinAAKK');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedHandIndex, setSelectedHandIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'replayer' | 'hands_list' | 'json_view'>('replayer');

  // Estados de Ordenação da Tabela
  const [sortColumn, setSortColumn] = useState<'investedAmount' | 'totalPot' | 'netResult' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const parsedHands: HandHistory[] = useMemo(() => {
    if (!rawText.trim()) return [];
    return parsePokerstarsHandHistory(rawText);
  }, [rawText]);

  const categorizedHands = useMemo(() => {
    return divideHandsByInvestment(parsedHands, heroName);
  }, [parsedHands, heroName]);

  const filteredHands = useMemo(() => {
    switch (filterType) {
      case 'invested':
        return categorizedHands.invested;
      case 'non_invested':
        return categorizedHands.nonInvested;
      case 'vpip':
        return categorizedHands.vpip;
      default:
        return categorizedHands.all;
    }
  }, [categorizedHands, filterType]);

  // Lista Ordenada Dinamicamente
  const sortedHands = useMemo(() => {
    if (!sortColumn) return filteredHands;

    return [...filteredHands].sort((a, b) => {
      const summaryA = categorizedHands.summaries.get(a.game_info.hand_id);
      const summaryB = categorizedHands.summaries.get(b.game_info.hand_id);

      let valA = 0;
      let valB = 0;

      if (sortColumn === 'investedAmount') {
        valA = summaryA?.investedAmount ?? 0;
        valB = summaryB?.investedAmount ?? 0;
      } else if (sortColumn === 'totalPot') {
        valA = a.pot.total_pot ?? 0;
        valB = b.pot.total_pot ?? 0;
      } else if (sortColumn === 'netResult') {
        valA = summaryA?.netResult ?? 0;
        valB = summaryB?.netResult ?? 0;
      }

      if (valA === valB) return 0;
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredHands, sortColumn, sortDirection, categorizedHands]);

  const activeHand: HandHistory | undefined = filteredHands[selectedHandIndex] || filteredHands[0];
  const activeHeroSummary = activeHand ? categorizedHands.summaries.get(activeHand.game_info.hand_id) : undefined;

  const snapshots = useMemo(() => {
    if (!activeHand) return [];
    return buildReplayTimeline(activeHand);
  }, [activeHand]);

  const engine = usePokerEngine(snapshots);

  const handleFileUpload = (e: ChangeEvent<InputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        setSelectedHandIndex(0);

        const heroMatch = content.match(/Dealt to ([^\s\[]+)/);
        if (heroMatch && heroMatch[1]) {
          setHeroName(heroMatch[1]);
        }
      }
    };
    reader.readAsText(file);
  };

  const toggleSort = (column: 'investedAmount' | 'totalPot' | 'netResult') => {
    if (sortColumn === column) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortColumn(null);
        setSortDirection('desc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column: 'investedAmount' | 'totalPot' | 'netResult') => {
    if (sortColumn !== column) return ' ↕';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const sessionNet = categorizedHands.metrics.totalHeroNetResult;

  return (
    <div className="app-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* CABEÇALHO E UPLOAD */}
      <header style={{
        background: '#1a1d24',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid #2a2f3d',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '15px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#00d2ff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>♠️</span> PokerStars Hand Replayer & Analytics
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#8a94a6', fontSize: '0.9rem' }}>
            Análise estrutural de mãos, dividindo investimentos e reproduzindo a ação passo a passo.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: '#8a94a6', fontWeight: 'bold' }}>HERO (JOGADOR):</label>
            <input
              type="text"
              value={heroName}
              onChange={(e) => setHeroName(e.target.value)}
              placeholder="Ex: McLovinAAKK"
              style={{
                background: '#0d0f12',
                border: '1px solid #3a4153',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: '#8a94a6', fontWeight: 'bold' }}>ARQUIVO DE MÃOS (.TXT):</label>
            <label style={{
              background: '#00d2ff',
              color: '#000',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'inline-block',
              textAlign: 'center'
            }}>
              📁 Carregar Arquivo .txt
              <input type="file" accept=".txt" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </header>

      {/* DASHBOARD COM LUCRO/PERDA DA SESSÃO */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Total de Mãos Processadas</span>
          <span style={cardValueStyle}>{categorizedHands.metrics.totalHands}</span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Mãos Investidas (Total)</span>
          <span style={{ ...cardValueStyle, color: '#ffbd2e' }}>
            {categorizedHands.metrics.investedHands} 
            <small style={{ fontSize: '0.8rem', color: '#8a94a6', marginLeft: '6px' }}>
              ({categorizedHands.metrics.investedPercentage.toFixed(1)}%)
            </small>
          </span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Mãos VPIP (Voluntário)</span>
          <span style={{ ...cardValueStyle, color: '#00e676' }}>
            {categorizedHands.metrics.vpipHands} 
            <small style={{ fontSize: '0.8rem', color: '#8a94a6', marginLeft: '6px' }}>
              ({categorizedHands.metrics.vpipPercentage.toFixed(1)}%)
            </small>
          </span>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Lucro/Perda da Sessão (Hero)</span>
          <span style={{ ...cardValueStyle, color: sessionNet >= 0 ? '#00e676' : '#ff5252' }}>
            {sessionNet >= 0 ? '+' : ''}${sessionNet.toFixed(2)}
          </span>
        </div>
      </section>

      {/* BARRA DE FILTROS E ABAS */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#1a1d24',
        padding: '10px 15px',
        borderRadius: '8px 8px 0 0',
        borderBottom: '1px solid #2a2f3d',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setFilterType('all'); setSelectedHandIndex(0); }} style={filterButtonStyle(filterType === 'all')}>
            Todas ({categorizedHands.all.length})
          </button>
          <button onClick={() => { setFilterType('invested'); setSelectedHandIndex(0); }} style={filterButtonStyle(filterType === 'invested', '#ffbd2e')}>
            💰 Investiu ({categorizedHands.invested.length})
          </button>
          <button onClick={() => { setFilterType('non_invested'); setSelectedHandIndex(0); }} style={filterButtonStyle(filterType === 'non_invested', '#8a94a6')}>
            🚫 Não Investiu ({categorizedHands.nonInvested.length})
          </button>
          <button onClick={() => { setFilterType('vpip'); setSelectedHandIndex(0); }} style={filterButtonStyle(filterType === 'vpip', '#00e676')}>
            🔥 VPIP ({categorizedHands.vpip.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setActiveTab('replayer')} style={tabButtonStyle(activeTab === 'replayer')}>
            🃏 Replayer Visual
          </button>
          <button onClick={() => setActiveTab('hands_list')} style={tabButtonStyle(activeTab === 'hands_list')}>
            📋 Lista de Mãos
          </button>
          <button onClick={() => setActiveTab('json_view')} style={tabButtonStyle(activeTab === 'json_view')}>
            📄 JSON Estrutural
          </button>
        </div>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div style={{
        background: '#14161d',
        padding: '20px',
        borderRadius: '0 0 8px 8px',
        border: '1px solid #2a2f3d',
        borderTop: 'none',
        minHeight: '500px'
      }}>
        {filteredHands.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#1e222d',
            padding: '10px 15px',
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            <span style={{ fontSize: '0.85rem', color: '#aaa' }}>
              Exibindo Mão <strong>{selectedHandIndex + 1}</strong> de <strong>{filteredHands.length}</strong>:
            </span>

            <select
              value={selectedHandIndex}
              onChange={(e) => setSelectedHandIndex(Number(e.target.value))}
              style={{
                background: '#0d0f12',
                color: '#fff',
                border: '1px solid #3a4153',
                padding: '6px 12px',
                borderRadius: '4px',
                maxWidth: '450px',
                fontSize: '0.85rem'
              }}
            >
              {filteredHands.map((hand, idx) => (
                <option key={hand.game_info.hand_id} value={idx}>
                  #{hand.game_info.hand_id} - {hand.hero_cards ? `[${hand.hero_cards.join(' ')}]` : 'Sem cartas'} ({hand.game_info.stakes})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ABA 1: REPLAYER */}
        {activeTab === 'replayer' && activeHand && (
          <PokerReplayerUI 
            handData={activeHand} 
            engine={engine}
            heroSummary={activeHeroSummary}
            sessionNetResult={sessionNet}
          />
        )}

        {/* ABA 2: LISTA DE MÃOS COM CABEÇALHOS ORDENÁVEIS */}
        {activeTab === 'hands_list' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#1e222d', color: '#00d2ff', borderBottom: '2px solid #2a2f3d' }}>
                  <th style={thStyle}>ID da Mão</th>
                  <th style={thStyle}>Mesa / Stakes</th>
                  <th style={thStyle}>Cartas do Hero</th>

                  {/* Coluna Ordenável: Investimento Total */}
                  <th 
                    style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleSort('investedAmount')}
                  >
                    Investimento Total {getSortIcon('investedAmount')}
                  </th>

                  <th style={thStyle}>VPIP?</th>

                  {/* Coluna Ordenável: Resultado do Pote */}
                  <th 
                    style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleSort('totalPot')}
                  >
                    Resultado do Pote {getSortIcon('totalPot')}
                  </th>

                  {/* Coluna Ordenável: Lucro/Perda Hero */}
                  <th 
                    style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleSort('netResult')}
                  >
                    Lucro/Perda Hero {getSortIcon('netResult')}
                  </th>

                  <th style={thStyle}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {sortedHands.map((hand) => {
                  const summary = categorizedHands.summaries.get(hand.game_info.hand_id);
                  const isSelected = hand.game_info.hand_id === activeHand?.game_info.hand_id;
                  const net = summary?.netResult ?? 0;

                  return (
                    <tr
                      key={hand.game_info.hand_id}
                      style={{
                        borderBottom: '1px solid #2a2f3d',
                        background: isSelected ? '#252a38' : 'transparent'
                      }}
                    >
                      <td style={tdStyle}>#{hand.game_info.hand_id}</td>
                      <td style={tdStyle}>{hand.game_info.table_name} ({hand.game_info.stakes})</td>
                      <td style={tdStyle}>
                        <strong style={{ color: '#ffbd2e' }}>
                          {hand.hero_cards ? hand.hero_cards.join(' ') : 'N/A'}
                        </strong>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: summary?.investedTotal ? '#ff5252' : '#8a94a6' }}>
                        ${summary?.investedAmount.toFixed(2) || '0.00'}
                      </td>
                      <td style={tdStyle}>
                        {summary?.vpip ? (
                          <span style={{ color: '#00e676', fontWeight: 'bold' }}>Sim</span>
                        ) : (
                          <span style={{ color: '#8a94a6' }}>Não</span>
                        )}
                      </td>
                      <td style={tdStyle}>${hand.pot.total_pot.toFixed(2)}</td>
                      
                      {/* Lucro/Perda por Mão do Hero */}
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: net >= 0 ? '#00e676' : '#ff5252' }}>
                        {net >= 0 ? '+' : ''}${net.toFixed(2)}
                      </td>

                      <td style={tdStyle}>
                        <button
                          onClick={() => {
                            const realIdx = filteredHands.findIndex(h => h.game_info.hand_id === hand.game_info.hand_id);
                            setSelectedHandIndex(realIdx >= 0 ? realIdx : 0);
                            setActiveTab('replayer');
                          }}
                          style={{
                            background: '#00d2ff',
                            color: '#000',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          Assistir 🎬
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA 3: JSON */}
        {activeTab === 'json_view' && activeHand && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#aaa', fontSize: '0.9rem' }}>
                Estrutura JSON Extraída para a Mão <strong>#{activeHand.game_info.hand_id}</strong>:
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(activeHand, null, 2))}
                style={{
                  background: '#2a2f3d',
                  color: '#fff',
                  border: '1px solid #3a4153',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                📋 Copiar JSON
              </button>
            </div>
            <pre style={{
              background: '#0d0f12',
              color: '#00e676',
              padding: '15px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              maxHeight: '500px',
              overflowY: 'auto',
              border: '1px solid #2a2f3d'
            }}>
              {JSON.stringify(activeHand, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  background: '#1a1d24',
  padding: '15px',
  borderRadius: '8px',
  border: '1px solid #2a2f3d',
  display: 'flex',
  flexDirection: 'column',
  gap: '5px'
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#8a94a6',
  textTransform: 'uppercase',
  fontWeight: 'bold'
};

const cardValueStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 'bold',
  color: '#ffffff'
};

const filterButtonStyle = (active: boolean, activeColor = '#00d2ff'): React.CSSProperties => ({
  background: active ? activeColor : '#0d0f12',
  color: active ? '#000' : '#8a94a6',
  border: `1px solid ${active ? activeColor : '#3a4153'}`,
  padding: '6px 12px',
  borderRadius: '4px',
  fontWeight: 'bold',
  fontSize: '0.8rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
});

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#2a2f3d' : 'transparent',
  color: active ? '#ffffff' : '#8a94a6',
  border: 'none',
  padding: '6px 12px',
  borderRadius: '4px',
  fontWeight: 'bold',
  fontSize: '0.8rem',
  cursor: 'pointer'
});

const thStyle: React.CSSProperties = {
  padding: '10px 12px'
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: '#d1d5db'
};

export default App;