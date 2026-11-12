export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W';

export interface Ticker {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: string;
  currency: string;
  exchange: string;
  sector: string;
}

export interface IndicatorConfig {
  showSma20: boolean;
  showSma50: boolean;
  showSma200: boolean;
  showEma9: boolean;
  showEma21: boolean;
  showBollinger: boolean;
  bollingerPeriod: number;
  bollingerStd: number;
  showVwap: boolean;
  showSuperTrend: boolean;
  superTrendPeriod: number;
  superTrendMultiplier: number;
  // Subcharts
  activeSubchart: 'rsi' | 'macd' | 'stoch' | 'volume' | 'none';
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  stochK: number;
  stochD: number;
}

export interface Pattern {
  id: string;
  name: string;
  nameCz: string;
  type: 'bullish' | 'bearish' | 'neutral';
  candleIndex: number;
  price: number;
  time: number;
  description: string;
  descriptionCz: string;
  confidence: number; // 0 to 100
}

export type DrawingTool = 'select' | 'trendline' | 'horizontal' | 'fibonacci' | 'ruler';

export interface ChartDrawing {
  id: string;
  type: DrawingTool;
  points: { time: number; price: number }[];
  color?: string;
  text?: string;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
  lastPrice: number;
}

export interface MarketTrade {
  id: string;
  time: number;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

export interface TechnicalIndicatorValues {
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema9?: number;
  ema21?: number;
  rsi?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
    percentB: number;
  };
  stochastic?: {
    k: number;
    d: number;
  };
  atr?: number;
  vwap?: number;
  superTrend?: {
    value: number;
    trend: 'up' | 'down';
  };
}

export interface TechnicalGaugeSummary {
  overallRating: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  score: number; // -100 to +100
  oscillators: {
    buy: number;
    neutral: number;
    sell: number;
    rating: string;
  };
  movingAverages: {
    buy: number;
    neutral: number;
    sell: number;
    rating: string;
  };
  pivotPoints: {
    classic: { p: number; s1: number; s2: number; s3: number; r1: number; r2: number; r3: number };
    fibonacci: { p: number; s1: number; s2: number; s3: number; r1: number; r2: number; r3: number };
  };
}

export interface AIAnalysisResult {
  thesis: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  targetPrice1: number;
  targetPrice2: number;
  invalidationPrice: number;
  riskRewardRatio: string;
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  insights: string[];
  catalysts: string[];
  executionPlan: string;
}
