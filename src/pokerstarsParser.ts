import type { 
  HandHistory, 
  Action, 
  Player, 
  GameInfo, 
  Street, 
  ActionType, 
  HandInvestmentSummary, 
  CategorizedHands 
} from './types';

export function parsePokerstarsHandHistory(rawText: string): HandHistory[] {
  if (!rawText || !rawText.trim()) return [];

  const handBlocks = rawText
    .split(/(?=PokerStars (?:Zoom )?Hand #)/g)
    .filter((block) => block.trim().length > 0);

  return handBlocks.map((block) => parseSingleHand(block)).filter((h): h is HandHistory => h !== null);
}

function parseSingleHand(block: string): HandHistory | null {
  const lines = block.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  const headerMatch = lines[0].match(/Hand #(\d+):\s+([^(]+)\s+\(([^)]+)\)\s+-\s+(.+)/);
  if (!headerMatch) return null;

  const handId = headerMatch[1];
  const pokerVariant = headerMatch[2].trim();
  const stakes = headerMatch[3].trim();
  const dateTime = headerMatch[4].trim();

  let tableName = 'Table';
  let buttonSeat = 1;
  let maxSeats = 6;

  const tableMatch = block.match(/Table '([^']+)' (\d+)-max Seat #(\d+) is the button/);
  if (tableMatch) {
    tableName = tableMatch[1];
    maxSeats = parseInt(tableMatch[2], 10);
    buttonSeat = parseInt(tableMatch[3], 10);
  }

  const gameInfo: GameInfo = {
    hand_id: handId,
    poker_variant: pokerVariant,
    stakes: stakes,
    table_name: tableName,
    max_seats: maxSeats,
    button_seat: buttonSeat,
    date_time: dateTime,
  };

  const players: Player[] = [];
  const seatRegex = /^Seat (\d+):\s+(.+)\s+\(\$(\d+(?:\.\d+)?) in chips\)/;

  lines.forEach((line) => {
    const match = line.match(seatRegex);
    if (match) {
      const seatNum = parseInt(match[1], 10);
      const name = match[2].trim();
      const chips = parseFloat(match[3]);

      players.push({
        seat: seatNum,
        name,
        chips,
        isHero: false,
        hasDealerButton: seatNum === buttonSeat,
      });
    }
  });

  let heroName: string | undefined;
  let heroCards: string[] | undefined;
  const dealtMatch = block.match(/Dealt to ([^\s\[]+) \[([^\]]+)\]/);

  if (dealtMatch) {
    heroName = dealtMatch[1];
    heroCards = dealtMatch[2].split(' ');

    const heroPlayer = players.find((p) => p.name === heroName);
    if (heroPlayer) {
      heroPlayer.isHero = true;
      heroPlayer.cards = heroCards;
    }
  }

  const actions: Action[] = [];
  const board: string[] = [];
  let currentStreet: Street = 'preflop';
  let totalPot = 0;
  let rake = 0;

  lines.forEach((line) => {
    if (line.startsWith('*** HOLE CARDS ***')) {
      currentStreet = 'preflop';
      return;
    }
    if (line.startsWith('*** FLOP ***')) {
      currentStreet = 'flop';
      const boardMatch = line.match(/\[([^\]]+)\]/);
      if (boardMatch) board.push(...boardMatch[1].split(' '));
      return;
    }
    if (line.startsWith('*** TURN ***')) {
      currentStreet = 'turn';
      const turnMatch = line.match(/\[([^\]]+)\]\s+\[([^\]]+)\]/);
      if (turnMatch) board.push(turnMatch[2]);
      return;
    }
    if (line.startsWith('*** RIVER ***')) {
      currentStreet = 'river';
      const riverMatch = line.match(/\[([^\]]+)\]\s+\[([^\]]+)\]/);
      if (riverMatch) board.push(riverMatch[2]);
      return;
    }
    if (line.startsWith('*** SUMMARY ***')) {
      currentStreet = 'summary';
      return;
    }

    if (line.startsWith('Total pot')) {
      const potMatch = line.match(/Total pot \$(\d+(?:\.\d+)?)\s+\|\s+Rake \$(\d+(?:\.\d+)?)/);
      if (potMatch) {
        totalPot = parseFloat(potMatch[1]);
        rake = parseFloat(potMatch[2]);
      }
      return;
    }

    if (currentStreet !== 'summary') {
      parseActionLine(line, currentStreet, actions);
    }
  });

  return {
    game_info: gameInfo,
    hero_name: heroName,
    hero_cards: heroCards,
    players,
    actions,
    board,
    pot: { total_pot: totalPot, rake },
    raw_text: block,
  };
}

function parseActionLine(line: string, street: Street, actions: Action[]) {
  let match = line.match(/^([^:]+):\s+posts\s+(small blind|big blind|ante)\s+\$(\d+(?:\.\d+)?)/);
  if (match) {
    const type: ActionType = match[2] === 'small blind' ? 'posts_sb' : match[2] === 'big blind' ? 'posts_bb' : 'posts_ante';
    actions.push({ player: match[1].trim(), type, amount: parseFloat(match[3]), street, rawText: line });
    return;
  }

  match = line.match(/^([^:]+):\s+folds/);
  if (match) {
    actions.push({ player: match[1].trim(), type: 'fold', amount: 0, street, rawText: line });
    return;
  }

  match = line.match(/^([^:]+):\s+checks/);
  if (match) {
    actions.push({ player: match[1].trim(), type: 'check', amount: 0, street, rawText: line });
    return;
  }

  match = line.match(/^([^:]+):\s+calls\s+\$(\d+(?:\.\d+)?)/);
  if (match) {
    actions.push({ player: match[1].trim(), type: 'call', amount: parseFloat(match[2]), street, rawText: line });
    return;
  }

  match = line.match(/^([^:]+):\s+bets\s+\$(\d+(?:\.\d+)?)/);
  if (match) {
    actions.push({ player: match[1].trim(), type: 'bet', amount: parseFloat(match[2]), street, rawText: line });
    return;
  }

  match = line.match(/^([^:]+):\s+raises\s+\$(\d+(?:\.\d+)?)\s+to\s+\$(\d+(?:\.\d+)?)/);
  if (match) {
    actions.push({ player: match[1].trim(), type: 'raise', amount: parseFloat(match[3]), street, rawText: line });
    return;
  }

  match = line.match(/^Uncalled bet\s+\(\$(\d+(?:\.\d+)?)\)\s+returned to\s+(.+)/);
  if (match) {
    actions.push({ player: match[2].trim(), type: 'uncalled_bet', amount: parseFloat(match[1]), street, rawText: line });
    return;
  }

  match = line.match(/^(.+)\s+collected\s+\$(\d+(?:\.\d+)?)\s+from pot/);
  if (match) {
    actions.push({ player: match[1].trim(), type: 'collects', amount: parseFloat(match[2]), street, rawText: line });
    return;
  }
}

export function divideHandsByInvestment(hands: HandHistory[], heroName: string): CategorizedHands {
  const summaries = new Map<string, HandInvestmentSummary>();

  const invested: HandHistory[] = [];
  const nonInvested: HandHistory[] = [];
  const vpip: HandHistory[] = [];

  let totalHeroInvestment = 0;
  let totalHeroNetResult = 0;

  hands.forEach((hand) => {
    const heroActions = hand.actions.filter((a) => a.player === heroName);

    let investedAmount = 0;
    let isVpip = false;

    heroActions.forEach((act) => {
      if (['posts_sb', 'posts_bb', 'posts_ante', 'call', 'bet', 'raise'].includes(act.type)) {
        investedAmount += act.amount;
      }
      if (['call', 'bet', 'raise'].includes(act.type)) {
        isVpip = true;
      }
    });

    const uncalled = hand.actions.find((a) => a.player === heroName && a.type === 'uncalled_bet');
    if (uncalled) {
      investedAmount = Math.max(0, investedAmount - uncalled.amount);
    }

    const collected = hand.actions.find((a) => a.player === heroName && a.type === 'collects');
    const collectedAmount = collected ? collected.amount : 0;

    const isInvested = investedAmount > 0;
    const netResult = collectedAmount - investedAmount;

    const summary: HandInvestmentSummary = {
      handId: hand.game_info.hand_id,
      heroName,
      investedTotal: isInvested,
      vpip: isVpip,
      investedAmount,
      collectedAmount,
      netResult,
    };

    summaries.set(hand.game_info.hand_id, summary);

    if (isInvested) invested.push(hand);
    else nonInvested.push(hand);

    if (isVpip) vpip.push(hand);

    totalHeroInvestment += investedAmount;
    totalHeroNetResult += netResult;
  });

  const totalHands = hands.length;
  const investedHands = invested.length;
  const nonInvestedHands = nonInvested.length;
  const vpipHands = vpip.length;

  return {
    all: hands,
    invested,
    nonInvested,
    vpip,
    summaries,
    metrics: {
      totalHands,
      investedHands,
      nonInvestedHands,
      vpipHands,
      investedPercentage: totalHands > 0 ? (investedHands / totalHands) * 100 : 0,
      vpipPercentage: totalHands > 0 ? (vpipHands / totalHands) * 100 : 0,
      totalHeroInvestment,
      totalHeroNetResult,
    },
  };
}