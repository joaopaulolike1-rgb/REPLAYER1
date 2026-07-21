export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'summary';

export type ActionType = 
  | 'posts_sb' 
  | 'posts_bb' 
  | 'posts_ante' 
  | 'fold' 
  | 'check' 
  | 'call' 
  | 'bet' 
  | 'raise' 
  | 'uncalled_bet' 
  | 'collects';

export interface Action {
  player: string;
  type: ActionType;
  amount: number;
  street: Street;
  rawText?: string;
}

export interface Player {
  seat: number;
  name: string;
  chips: number;
  isHero: boolean;
  cards?: string[];
  position?: string;
  hasDealerButton?: boolean;
}

export interface GameInfo {
  hand_id: string;
  poker_variant: string;
  stakes: string;
  table_name: string;
  max_seats: number;
  button_seat: number;
  date_time: string;
}

export interface PotState {
  total_pot: number;
  rake: number;
}

export interface HandHistory {
  game_info: GameInfo;
  hero_name?: string;
  hero_cards?: string[];
  players: Player[];
  actions: Action[];
  board: string[];
  pot: PotState;
  raw_text: string;
}

export type FilterType = 'all' | 'invested' | 'non_invested' | 'vpip';

export interface HandInvestmentSummary {
  handId: string;
  heroName: string;
  investedTotal: boolean;
  vpip: boolean;
  investedAmount: number;
  collectedAmount: number;
  netResult: number;
}

export interface CategorizedHands {
  all: HandHistory[];
  invested: HandHistory[];
  nonInvested: HandHistory[];
  vpip: HandHistory[];
  summaries: Map<string, HandInvestmentSummary>;
  metrics: {
    totalHands: number;
    investedHands: number;
    nonInvestedHands: number;
    vpipHands: number;
    investedPercentage: number;
    vpipPercentage: number;
    totalHeroInvestment: number;
  };
}