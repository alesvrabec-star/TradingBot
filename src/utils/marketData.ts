import { Candle, Ticker, Timeframe, OrderBook, MarketTrade } from '../types/market';

export const INITIAL_TICKERS: Ticker[] = [
  {
    symbol: 'CEZ.PR',
    name: 'ČEZ, a.s.',
    price: 1332.00,
    change: -8.00,
    changePercent: -0.60,
    high24h: 1345.00,
    low24h: 1326.00,
    volume24h: 420000,
    marketCap: '716 mld. Kč',
    currency: 'CZK',
    exchange: 'Burza cenných papírů Praha (PX)',
    sector: 'Energetika & Utility (ČR)',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 168.89,
    change: -9.78,
    changePercent: -5.47,
    high24h: 178.40,
    low24h: 167.20,
    volume24h: 68240000,
    marketCap: '$4.12T',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Semiconductors & AI',
  },
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin / US Dollar',
    price: 74002.00,
    change: 1420.00,
    changePercent: 1.95,
    high24h: 75200.00,
    low24h: 72800.00,
    volume24h: 38200000000,
    marketCap: '$1.46T',
    currency: 'USD',
    exchange: 'Crypto Spot',
    sector: 'Digital Assets',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 236.40,
    change: 1.15,
    changePercent: 0.49,
    high24h: 237.90,
    low24h: 234.80,
    volume24h: 44120000,
    marketCap: '$3.61T',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Consumer Electronics',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 338.20,
    change: -4.80,
    changePercent: -1.40,
    high24h: 346.50,
    low24h: 333.90,
    volume24h: 68900000,
    marketCap: '$1.08T',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Automotive & Clean Energy',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    price: 428.60,
    change: 2.30,
    changePercent: 0.54,
    high24h: 430.20,
    low24h: 425.40,
    volume24h: 21300000,
    marketCap: '$3.18T',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Cloud & Software',
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF',
    price: 593.40,
    change: 2.10,
    changePercent: 0.36,
    high24h: 594.80,
    low24h: 590.20,
    volume24h: 72400000,
    marketCap: '$610B',
    currency: 'USD',
    exchange: 'NYSE Arca',
    sector: 'US Broad Market Index',
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    price: 516.30,
    change: 4.80,
    changePercent: 0.94,
    high24h: 518.10,
    low24h: 511.40,
    volume24h: 48900000,
    marketCap: '$312B',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology 100 Index',
  },
  {
    symbol: 'ERBAG.PR',
    name: 'Erste Group Bank AG',
    price: 1315.00,
    change: 12.00,
    changePercent: 0.92,
    high24h: 1324.00,
    low24h: 1302.00,
    volume24h: 110000,
    marketCap: '542 mld. Kč',
    currency: 'CZK',
    exchange: 'Burza cenných papírů Praha (PX)',
    sector: 'Finanční sektor & Banky',
  },
  {
    symbol: 'KOMB.PR',
    name: 'Komerční banka, a.s.',
    price: 885.00,
    change: 4.50,
    changePercent: 0.51,
    high24h: 890.00,
    low24h: 878.00,
    volume24h: 95000,
    marketCap: '168 mld. Kč',
    currency: 'CZK',
    exchange: 'Burza cenných papírů Praha (PX)',
    sector: 'Finanční sektor & Banky',
  },
];

export function timeframeToSeconds(tf: Timeframe): number {
  switch (tf) {
    case '1m': return 60;
    case '5m': return 300;
    case '15m': return 900;
    case '1h': return 3600;
    case '4h': return 14400;
    case '1D': return 86400;
    case '1W': return 604800;
  }
}

/**
 * Generates realistic historical market data with realistic trend cycles,
 * support/resistance retests, volatility clusters, and volume profile.
 */
export function generateHistoricalCandles(ticker: Ticker, timeframe: Timeframe, count: number = 180): Candle[] {
  const stepSeconds = timeframeToSeconds(timeframe);
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - count * stepSeconds;

  let basePrice = ticker.price * 0.88;
  const volatility = ticker.symbol.includes('BTC') ? 0.012 : ticker.symbol === 'TSLA' || ticker.symbol === 'NVDA' ? 0.008 : 0.005;

  const candles: Candle[] = [];
  let currentClose = basePrice;

  // Simulate market drift and cycles
  for (let i = 0; i < count; i++) {
    const time = startTime + i * stepSeconds;

    // Cycles: trend wave + micro shocks + periodic consolidation
    const cycle = Math.sin((i / 18) * Math.PI) * 0.003 + Math.cos((i / 40) * Math.PI) * 0.006;
    const randomShock = (Math.random() - 0.485) * volatility;
    const priceChangeRatio = 1 + cycle + randomShock;

    const open = currentClose;
    let close = open * priceChangeRatio;

    // Align the very last candle to the ticker's current price
    if (i === count - 1) {
      close = ticker.price;
    }

    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);

    const highExtra = Math.random() * volatility * open * 1.5;
    const lowExtra = Math.random() * volatility * open * 1.5;

    const high = Number((maxOC + highExtra).toFixed(2));
    const low = Number(Math.max(0.01, minOC - lowExtra).toFixed(2));
    const finalOpen = Number(open.toFixed(2));
    const finalClose = Number(close.toFixed(2));

    // Base volume with spikes on large candle bodies
    const bodySize = Math.abs(finalClose - finalOpen) / finalOpen;
    const volumeMultiplier = 1 + bodySize * 80 + Math.random() * 0.5;
    const baseVol = ticker.volume24h / (count * 2);
    const volume = Math.round(baseVol * volumeMultiplier);

    candles.push({
      time,
      open: finalOpen,
      high,
      low,
      close: finalClose,
      volume,
    });

    currentClose = finalClose;
  }

  return candles;
}

/**
 * Updates the latest candle with a simulated live market tick.
 * Returns updated candles array and the newly generated trade tick.
 */
export function applyLiveTick(
  candles: Candle[],
  timeframe: Timeframe,
  volatilityScale: number = 1.0
): { updatedCandles: Candle[]; newTrade: MarketTrade; newPrice: number } {
  if (candles.length === 0) {
    throw new Error('Candles array cannot be empty');
  }

  const stepSeconds = timeframeToSeconds(timeframe);
  const now = Math.floor(Date.now() / 1000);
  const lastIndex = candles.length - 1;
  const currentCandle = { ...candles[lastIndex] };

  // Calculate dynamic tick size based on asset price
  const tickVolatility = currentCandle.close * 0.0006 * volatilityScale;
  const tickDelta = (Math.random() - 0.495) * tickVolatility;
  const newPrice = Number(Math.max(0.01, currentCandle.close + tickDelta).toFixed(2));

  const tradeSize = Math.max(1, Math.round(Math.random() * 150));
  const side: 'buy' | 'sell' = newPrice >= currentCandle.close ? 'buy' : 'sell';

  const newTrade: MarketTrade = {
    id: `tr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    time: now,
    price: newPrice,
    size: tradeSize,
    side,
  };

  // Check if candle period has expired (create new candle) or update existing
  if (now - currentCandle.time >= stepSeconds) {
    const newCandle: Candle = {
      time: currentCandle.time + stepSeconds,
      open: currentCandle.close,
      high: Math.max(currentCandle.close, newPrice),
      low: Math.min(currentCandle.close, newPrice),
      close: newPrice,
      volume: tradeSize,
    };
    return {
      updatedCandles: [...candles.slice(1), newCandle],
      newTrade,
      newPrice,
    };
  } else {
    currentCandle.high = Math.max(currentCandle.high, newPrice);
    currentCandle.low = Math.min(currentCandle.low, newPrice);
    currentCandle.close = newPrice;
    currentCandle.volume += tradeSize;

    const newCandles = [...candles];
    newCandles[lastIndex] = currentCandle;

    return {
      updatedCandles: newCandles,
      newTrade,
      newPrice,
    };
  }
}

/**
 * Builds realistic Level 2 Order Book Depth centered on current price
 */
export function generateOrderBook(midPrice: number, spreadPercent: number = 0.02): OrderBook {
  const spread = Number((midPrice * (spreadPercent / 100)).toFixed(2));
  const halfSpread = spread / 2;

  const bids = [];
  const asks = [];

  let bidTotal = 0;
  let askTotal = 0;

  const levels = 10;
  const step = Math.max(0.01, Number((midPrice * 0.0003).toFixed(2)));

  for (let i = 0; i < levels; i++) {
    // Bids (buyers lower than mid)
    const bidPrice = Number((midPrice - halfSpread - i * step).toFixed(2));
    const bidSize = Math.round(20 + Math.random() * 180 + (levels - i) * 15);
    bidTotal += bidSize;
    bids.push({ price: bidPrice, size: bidSize, total: bidTotal });

    // Asks (sellers higher than mid)
    const askPrice = Number((midPrice + halfSpread + i * step).toFixed(2));
    const askSize = Math.round(20 + Math.random() * 180 + (levels - i) * 15);
    askTotal += askSize;
    asks.push({ price: askPrice, size: askSize, total: askTotal });
  }

  return {
    bids,
    asks,
    spread,
    spreadPercent,
    lastPrice: midPrice,
  };
}

/**
 * Fetches real historical market candles from backend API
 */
export async function fetchMarketCandles(symbol: string, timeframe: Timeframe, fallbackTicker: Ticker): Promise<Candle[]> {
  try {
    const res = await fetch(`/api/market/candles/${encodeURIComponent(symbol)}?timeframe=${timeframe}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.candles && data.candles.length >= 10) {
      return data.candles;
    }
  } catch (err) {
    console.warn(`Falling back to generated candles for ${symbol}:`, err);
  }
  return generateHistoricalCandles(fallbackTicker, timeframe, 160);
}

/**
 * Fetches real market quotes for tickers list
 */
export async function fetchMarketTickers(): Promise<Ticker[]> {
  try {
    const res = await fetch('/api/market/tickers');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.tickers && data.tickers.length > 0) {
      return data.tickers;
    }
  } catch (err) {
    console.warn('Falling back to initial tickers:', err);
  }
  return INITIAL_TICKERS;
}

/**
 * Fetches real quote for a single symbol
 */
export async function fetchMarketQuote(symbol: string): Promise<Ticker | null> {
  try {
    const res = await fetch(`/api/market/quote/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Error fetching quote for ${symbol}:`, err);
    return null;
  }
}

