export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface TradingSession {
  id: string;
  user_id: string;
  name: string;
  initial_capital: number;
  current_capital: number;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  session_id: string;
  margin: number;
  roi: number;
  entry_side: 'Long' | 'Short';
  profit_loss: number;
  comments?: string;
  created_at: string;
}

export interface SessionStats {
  totalTrades: number;
  winRate: number;
  currentCapital: number;
  netProfitLoss: number;
  netProfitLossPercentage: number;
  totalMarginUsed: number;
  averageROI: number;
  winningTrades: number;
  losingTrades: number;
}

export interface QuoteResponse {
  content: string;
  author: string;
}