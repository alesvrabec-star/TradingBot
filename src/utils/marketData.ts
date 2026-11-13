import { Candle, Ticker, Timeframe, OrderBook, MarketTrade } from '../types/market';

export const INITIAL_TICKERS: Ticker[] = [
  {
    symbol: 'CEZ.PR',
    name: 'ČEZ, a.s.',
    price: 1341.00,
    change: 6.00,
    changePercent: 0.45,
    high24h: 1342.00,
    low24h: 1335.00,
    volume24h: 420000,
    marketCap: '721 mld. Kč',
    currency: 'CZK',
    exchange: 'Burza cenných papírů Praha (PX)',
    sector: 'Energetika & Utility (ČR)',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 173.73,
    change: 4.93,
    changePercent: 2.92,
    high24h: 177.54,
    low24h: 170.77,
    volume24h: 281500000,
    marketCap: '$4.28T',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Semiconductors & AI',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    price: 521.13,
    change: -12.03,
    changePercent: -2.26,
    high24h: 534.76,
    low24h: 518.45,
    volume24h: 28560000,
    marketCap: '$3.89T',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Cloud & Software',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 355.63,
    change: 7.12,
    changePercent: 2.04,
    high24h: 355.90,
    low24h: 349.33,
    volume24h: 34020000,
    marketCap: '$3.92T',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Consumer Electronics',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 390.84,
    change: 11.06,
    changePercent: 2.91,
    high24h: 395.43,
    low24h: 386.35,
    volume24h: 27590000,
    marketCap: '$1.25T',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Automotive & Clean Energy',
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF',
    price: 759.81,
    change: 9.89,
    changePercent: 1.32,
    high24h: 762.51,
    low24h: 754.91,
    volume24h: 37700000,
    marketCap: '$780B',
    currency: 'USD',
    exchange: 'NYSE Arca',
    sector: 'US Broad Market Index',
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    price: 690.38,
    change: 15.62,
    changePercent: 2.31,
    high24h: 695.57,
    low24h: 683.60,
    volume24h: 42800000,
    marketCap: '$410B',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology 100 Index',
  },
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin / US Dollar',
    price: 73340.00,
    change: -584.59,
    changePercent: -0.79,
    high24h: 74072.00,
    low24h: 73218.00,
    volume24h: 21090000000,
    marketCap: '$1.45T',
    currency: 'USD',
    exchange: 'Crypto Spot',
    sector: 'Digital Assets',
  },
  {
    symbol: 'ERBAG.PR',
    name: 'Erste Group Bank AG',
    price: 2859.00,
    change: -2.00,
    changePercent: -0.07,
    high24h: 2878.00,
    low24h: 2837.00,
    volume24h: 110000,
    marketCap: '1180 mld. Kč',
    currency: 'CZK',
    exchange: 'Burza cenných papírů Praha (PX)',
    sector: 'Finanční sektor & Banky',
  },
  {
    symbol: 'KOMB.PR',
    name: 'Komerční banka, a.s.',
    price: 995.00,
    change: -1.00,
    changePercent: -0.10,
    high24h: 1000.00,
    low24h: 990.00,
    volume24h: 95000,
    marketCap: '189 mld. Kč',
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

  // Deterministic per-symbol seed so offline fallback never shows identical charts
  let seed = 0;
  for (let idx = 0; idx < ticker.symbol.length; idx++) {
    seed = (seed * 31 + ticker.symbol.charCodeAt(idx)) % 100000;
  }
  const seededRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const volatility = ticker.symbol.includes('BTC') ? 0.008 : ticker.symbol === 'TSLA' || ticker.symbol === 'NVDA' ? 0.006 : 0.0035;
  const rawPrices: number[] = [ticker.price];

  // Walk backwards from current real price so final candle connects smoothly
  for (let i = 1; i <= count; i++) {
    const prev = rawPrices[0];
    const shock = (seededRand() - 0.5) * volatility * 2;
    const wave = Math.sin((i / (12 + (seed % 9))) * Math.PI) * volatility * 0.6;
    rawPrices.unshift(Math.max(0.01, prev * (1 - shock - wave)));
  }

  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const time = startTime + i * stepSeconds;
    const open = rawPrices[i];
    const close = i === count - 1 ? ticker.price : rawPrices[i + 1];

    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);
    const highExtra = seededRand() * volatility * open * 1.1;
    const lowExtra = seededRand() * volatility * open * 1.1;

    const high = Number((maxOC + highExtra).toFixed(2));
    const low = Number(Math.max(0.01, minOC - lowExtra).toFixed(2));
    const finalOpen = Number(open.toFixed(2));
    const finalClose = Number(close.toFixed(2));

    const bodySize = Math.abs(finalClose - finalOpen) / finalOpen;
    const volumeMultiplier = 1 + bodySize * 60 + seededRand() * 0.5;
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
 * Fetches real historical market candles from backend API (with retry on serverless cold start)
 */
export async function fetchMarketCandles(symbol: string, timeframe: Timeframe, fallbackTicker: Ticker): Promise<Candle[]> {
  const url = `/api/market/candles/${encodeURIComponent(symbol)}?timeframe=${timeframe}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data.candles && data.candles.length >= 10) {
        return data.candles;
      }
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      console.warn(`Falling back to generated candles for ${symbol}:`, err);
    }
  }
  return generateHistoricalCandles(fallbackTicker, timeframe, 160);
}

/**
 * Fetches real market quotes for tickers list
 */
export async function fetchMarketTickers(): Promise<Ticker[]> {
  try {
    const res = await fetch('/api/market/tickers', { cache: 'no-store' });
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
    const res = await fetch(`/api/market/quote/${encodeURIComponent(symbol)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Error fetching quote for ${symbol}:`, err);
    return null;
  }
}

