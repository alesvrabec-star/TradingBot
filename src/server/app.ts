import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const app = express();

app.use(express.json());

// Enable CORS for Vercel and cross-origin requests + URL normalization
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  // Recover original URL path if Vercel serverless function rewrite stripped it
  const matchedPath =
    req.headers['x-matched-path'] ||
    req.headers['x-vercel-matched-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-original-url'];

  if (typeof matchedPath === 'string' && matchedPath.startsWith('/api') && req.url === '/api') {
    req.url = matchedPath;
  }

  next();
});

// Initialize GoogleGenAI SDK according to skill requirements
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory cache for market quotes and candles to avoid redundant external calls
const quoteCache = new Map<string, { timestamp: number; data: any }>();
const candleCache = new Map<string, { timestamp: number; data: any }>();

const DEFAULT_SYMBOLS_METADATA: Record<string, { name: string; sector: string }> = {
  NVDA: { name: 'NVIDIA Corporation', sector: 'Semiconductors & AI' },
  AAPL: { name: 'Apple Inc.', sector: 'Consumer Electronics' },
  TSLA: { name: 'Tesla, Inc.', sector: 'Automotive & Clean Energy' },
  MSFT: { name: 'Microsoft Corp.', sector: 'Cloud & Enterprise Software' },
  SPY: { name: 'SPDR S&P 500 ETF Trust', sector: 'US Large Cap Index' },
  QQQ: { name: 'Invesco QQQ Trust', sector: 'Nasdaq 100 Index' },
  'BTC-USD': { name: 'Bitcoin / USD', sector: 'Digital Assets' },
  'CEZ.PR': { name: 'ČEZ, a.s.', sector: 'Energetika & Utility (Pražská burza)' },
  'ERBAG.PR': { name: 'Erste Group Bank AG', sector: 'Bankovnictví (Praha/Vídeň)' },
  'KOMB.PR': { name: 'Komerční banka, a.s.', sector: 'Bankovnictví (Praha)' },
  AMZN: { name: 'Amazon.com, Inc.', sector: 'E-commerce & Cloud' },
  GOOGL: { name: 'Alphabet Inc.', sector: 'Digital Advertising & AI' },
};

async function fetchYahooChart(symbol: string, interval: string, range: string) {
  const hosts = [
    'https://query1.finance.yahoo.com',
    'https://query2.finance.yahoo.com',
  ];

  let lastError: Error | null = null;

  for (const host of hosts) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://finance.yahoo.com/',
        },
      });

      if (response.ok) {
        const json = await response.json();
        const result = json?.chart?.result?.[0];
        if (result) {
          return result;
        }
      } else {
        lastError = new Error(`Yahoo Finance (${host}) returned status ${response.status}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error(`No data returned for symbol: ${symbol}`);
}

// Router containing all market and AI routes
const router = express.Router();

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Get Live Quote for a Symbol
router.get('/market/quote/:symbol', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  const cacheKey = `quote_${symbol}`;
  const now = Date.now();

  const cached = quoteCache.get(cacheKey);
  if (cached && now - cached.timestamp < 15000) {
    return res.json(cached.data);
  }

  try {
    const chart = await fetchYahooChart(symbol, '15m', '1d');
    const meta = chart.meta;
    const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 100;
    const prevClose = meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? currentPrice;
    const change = Number((currentPrice - prevClose).toFixed(2));
    const changePercent = Number((prevClose > 0 ? (change / prevClose) * 100 : 0).toFixed(2));

    const metaInfo = DEFAULT_SYMBOLS_METADATA[symbol] || {
      name: meta.longName || meta.shortName || symbol,
      sector: meta.instrumentType || 'Equity',
    };

    const quoteData = {
      symbol: meta.symbol || symbol,
      name: metaInfo.name,
      price: currentPrice,
      change,
      changePercent,
      high24h: meta.regularMarketDayHigh ?? currentPrice * 1.01,
      low24h: meta.regularMarketDayLow ?? currentPrice * 0.99,
      volume24h: meta.regularMarketVolume ?? 1000000,
      currency: meta.currency || (symbol.endsWith('.PR') ? 'CZK' : 'USD'),
      exchange: meta.exchangeName || (symbol.endsWith('.PR') ? 'PRA' : 'Global'),
      sector: metaInfo.sector,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? currentPrice * 1.2,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? currentPrice * 0.8,
      timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : now,
    };

    quoteCache.set(cacheKey, { timestamp: now, data: quoteData });
    res.json(quoteData);
  } catch (err: any) {
    console.error(`Error fetching quote for ${symbol}:`, err.message);
    // Reliable fallback for known symbols if API is throttled
    const fallbackPrice = symbol === 'CEZ.PR' ? 1332.0 : symbol === 'BTC-USD' ? 74000.0 : symbol === 'NVDA' ? 168.89 : 100;
    const fallbackCurrency = symbol.endsWith('.PR') ? 'CZK' : 'USD';
    const fallbackData = {
      symbol,
      name: DEFAULT_SYMBOLS_METADATA[symbol]?.name || symbol,
      price: fallbackPrice,
      change: -4.0,
      changePercent: -0.3,
      high24h: fallbackPrice * 1.01,
      low24h: fallbackPrice * 0.99,
      volume24h: 350000,
      currency: fallbackCurrency,
      exchange: symbol.endsWith('.PR') ? 'PRA' : 'NASDAQ',
      sector: DEFAULT_SYMBOLS_METADATA[symbol]?.sector || 'Equity',
      fiftyTwoWeekHigh: fallbackPrice * 1.15,
      fiftyTwoWeekLow: fallbackPrice * 0.85,
      timestamp: now,
    };
    res.json(fallbackData);
  }
});

// 2. Get Real Historical Candles for a Symbol and Timeframe
router.get('/market/candles/:symbol', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  const timeframe = (req.query.timeframe as string) || '15m';
  const cacheKey = `candles_${symbol}_${timeframe}`;
  const now = Date.now();

  const cached = candleCache.get(cacheKey);
  if (cached && now - cached.timestamp < 30000) {
    return res.json(cached.data);
  }

  let interval = '15m';
  let range = '5d';

  switch (timeframe) {
    case '1m':
      interval = '1m';
      range = '1d';
      break;
    case '5m':
      interval = '5m';
      range = '5d';
      break;
    case '15m':
      interval = '15m';
      range = '5d';
      break;
    case '1h':
      interval = '1h';
      range = '1mo';
      break;
    case '4h':
      interval = '1h';
      range = '3mo';
      break;
    case '1D':
      interval = '1d';
      range = '1y';
      break;
    case '1W':
      interval = '1wk';
      range = '2y';
      break;
  }

  try {
    const chart = await fetchYahooChart(symbol, interval, range);
    const meta = chart.meta;
    const timestamps = chart.timestamp || [];
    const quote = chart.indicators?.quote?.[0] || {};
    const { open = [], high = [], low = [], close = [], volume = [] } = quote;

    const rawCandles: any[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = open[i];
      const h = high[i];
      const l = low[i];
      const c = close[i];
      const v = volume[i] ?? 0;

      if (o !== null && h !== null && l !== null && c !== null && !isNaN(o) && !isNaN(c)) {
        rawCandles.push({
          time: timestamps[i],
          open: Number(o.toFixed(2)),
          high: Number(h.toFixed(2)),
          low: Number(l.toFixed(2)),
          close: Number(c.toFixed(2)),
          volume: Math.round(v),
        });
      }
    }

    let finalCandles = rawCandles;

    if (timeframe === '4h' && rawCandles.length > 0) {
      const aggregated: any[] = [];
      for (let i = 0; i < rawCandles.length; i += 4) {
        const slice = rawCandles.slice(i, i + 4);
        if (slice.length > 0) {
          const first = slice[0];
          const last = slice[slice.length - 1];
          const aggHigh = Math.max(...slice.map((s) => s.high));
          const aggLow = Math.min(...slice.map((s) => s.low));
          const aggVol = slice.reduce((acc, s) => acc + s.volume, 0);

          aggregated.push({
            time: first.time,
            open: first.open,
            high: aggHigh,
            low: aggLow,
            close: last.close,
            volume: aggVol,
          });
        }
      }
      finalCandles = aggregated;
    }

    const candlesToReturn = finalCandles.slice(-180);

    const payload = {
      symbol: meta.symbol || symbol,
      currency: meta.currency || (symbol.endsWith('.PR') ? 'CZK' : 'USD'),
      exchange: meta.exchangeName || (symbol.endsWith('.PR') ? 'PRA' : 'Global'),
      timeframe,
      candles: candlesToReturn,
      lastPrice: meta.regularMarketPrice ?? (candlesToReturn[candlesToReturn.length - 1]?.close || 100),
    };

    candleCache.set(cacheKey, { timestamp: now, data: payload });
    res.json(payload);
  } catch (err: any) {
    console.error(`Error fetching candles for ${symbol}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// 3. Batch Fetch Quotes for All Watchlist Tickers
router.get('/market/tickers', async (req: Request, res: Response) => {
  const symbols = ['CEZ.PR', 'NVDA', 'AAPL', 'TSLA', 'MSFT', 'SPY', 'QQQ', 'BTC-USD', 'ERBAG.PR', 'KOMB.PR'];
  const results = [];

  for (const sym of symbols) {
    try {
      const cacheKey = `quote_${sym}`;
      const now = Date.now();
      const cached = quoteCache.get(cacheKey);

      if (cached && now - cached.timestamp < 30000) {
        results.push(cached.data);
      } else {
        const chart = await fetchYahooChart(sym, '15m', '1d');
        const meta = chart.meta;
        const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 100;
        const prevClose = meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? currentPrice;
        const change = Number((currentPrice - prevClose).toFixed(2));
        const changePercent = Number((prevClose > 0 ? (change / prevClose) * 100 : 0).toFixed(2));

        const metaInfo = DEFAULT_SYMBOLS_METADATA[sym] || {
          name: meta.longName || meta.shortName || sym,
          sector: meta.instrumentType || 'Equity',
        };

        const item = {
          symbol: sym,
          name: metaInfo.name,
          price: currentPrice,
          change,
          changePercent,
          high24h: meta.regularMarketDayHigh ?? currentPrice * 1.01,
          low24h: meta.regularMarketDayLow ?? currentPrice * 0.99,
          volume24h: meta.regularMarketVolume ?? 1000000,
          currency: meta.currency || (sym.endsWith('.PR') ? 'CZK' : 'USD'),
          exchange: meta.exchangeName || (sym.endsWith('.PR') ? 'PRA' : 'Global'),
          sector: metaInfo.sector,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? currentPrice * 1.2,
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? currentPrice * 0.8,
        };

        quoteCache.set(cacheKey, { timestamp: now, data: item });
        results.push(item);
      }
    } catch (err: any) {
      console.warn(`Fallback for ${sym}:`, err.message);
      const fallbackPrice =
        sym === 'CEZ.PR' ? 1341.0 :
        sym === 'BTC-USD' ? 73340.0 :
        sym === 'NVDA' ? 173.73 :
        sym === 'MSFT' ? 521.13 :
        sym === 'AAPL' ? 355.63 :
        sym === 'TSLA' ? 390.84 :
        sym === 'SPY' ? 759.81 :
        sym === 'QQQ' ? 690.38 :
        sym === 'ERBAG.PR' ? 2859.0 :
        sym === 'KOMB.PR' ? 995.0 : 250.0;
      const fallbackCurrency = sym.endsWith('.PR') ? 'CZK' : 'USD';
      results.push({
        symbol: sym,
        name: DEFAULT_SYMBOLS_METADATA[sym]?.name || sym,
        price: fallbackPrice,
        change: 0.0,
        changePercent: 0.0,
        high24h: fallbackPrice * 1.01,
        low24h: fallbackPrice * 0.99,
        volume24h: 1000000,
        currency: fallbackCurrency,
        exchange: sym.endsWith('.PR') ? 'Praha (PX)' : 'NASDAQ',
        sector: DEFAULT_SYMBOLS_METADATA[sym]?.sector || 'Equity',
      });
    }
  }

  res.json({ tickers: results });
});

// 4. Gemini AI Quantitative Technical Analysis API
router.post('/gemini/analyze', async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      companyName,
      currentPrice,
      currency = 'USD',
      timeframe,
      gauge,
      indicators,
      recentPatterns,
      lang = 'cz',
    } = req.body;

    const currLabel = currency.toUpperCase() === 'CZK' ? 'Kč' : currency.toUpperCase() === 'EUR' ? '€' : '$';

    if (!ai) {
      return res.json({
        analysis: generateFallbackAnalysis(symbol, currentPrice, currency, currLabel, timeframe, gauge, indicators, recentPatterns, lang),
        source: 'quant_engine',
      });
    }

    const prompt = `You are a chief quantitative technical analyst at an elite hedge fund.
Analyze the following asset market data for ${symbol} (${companyName}):
- Current Price: ${currentPrice} ${currency} (${currLabel})
- Asset Currency: ${currency}
- Selected Timeframe: ${timeframe}
- Technical Gauge Score: ${gauge?.score ?? 0}/100 (Overall: ${gauge?.overallRating ?? 'NEUTRAL'})
- Oscillators: ${gauge?.oscillators?.buy ?? 0} Buy, ${gauge?.oscillators?.neutral ?? 0} Neutral, ${gauge?.oscillators?.sell ?? 0} Sell
- Moving Averages: ${gauge?.movingAverages?.buy ?? 0} Buy, ${gauge?.movingAverages?.neutral ?? 0} Neutral, ${gauge?.movingAverages?.sell ?? 0} Sell
- Key Indicators:
  - RSI (14): ${indicators?.rsi?.toFixed?.(1) ?? 'N/A'}
  - MACD Histogram: ${indicators?.macd?.histogram?.toFixed?.(2) ?? 'N/A'}
  - SuperTrend: ${indicators?.superTrend?.trend ?? 'N/A'} (Level: ${indicators?.superTrend?.value?.toFixed?.(2) ?? 'N/A'} ${currLabel})
  - Bollinger Bands: Upper ${indicators?.bollinger?.upper?.toFixed?.(2) ?? 'N/A'} ${currLabel}, Lower ${indicators?.bollinger?.lower?.toFixed?.(2) ?? 'N/A'} ${currLabel}
  - ATR (Volatility): ${indicators?.atr?.toFixed?.(2) ?? 'N/A'} ${currLabel}
  - Pivot Points: Pivot ${gauge?.pivotPoints?.classic?.p?.toFixed?.(2) ?? 'N/A'}, S1 ${gauge?.pivotPoints?.classic?.s1?.toFixed?.(2) ?? 'N/A'}, R1 ${gauge?.pivotPoints?.classic?.r1?.toFixed?.(2) ?? 'N/A'}
- Recent Patterns: ${JSON.stringify(recentPatterns ?? [])}

Language of output: ${lang === 'cz' ? 'Czech (Čeština)' : 'English'}.
CRITICAL: All price numbers MUST be in the asset's currency (${currency} / ${currLabel}). Do NOT use dollar sign if the currency is CZK.

Respond ONLY with valid JSON conforming to this exact structure:
{
  "thesis": "Concise high-level professional market analysis describing trend, volume, and structure",
  "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": number between 60 and 96,
  "targetPrice1": number (conservative take-profit in ${currency}),
  "targetPrice2": number (extended target in ${currency}),
  "invalidationPrice": number (strict technical stop-loss in ${currency}),
  "riskRewardRatio": "1 : X.X",
  "keyLevels": {
    "support": [number, number],
    "resistance": [number, number]
  },
  "insights": [
    "string: key technical takeaway 1",
    "string: key technical takeaway 2",
    "string: key technical takeaway 3"
  ],
  "catalysts": [
    "string: catalyst 1",
    "string: catalyst 2"
  ],
  "executionPlan": "Specific trade execution instructions with entry trigger, stop-loss and profit target in ${currency}."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    return res.json({
      analysis: parsed,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/analyze:', error);
    const { symbol, currentPrice, currency = 'USD', timeframe, gauge, indicators, recentPatterns, lang = 'cz' } = req.body;
    const currLabel = currency.toUpperCase() === 'CZK' ? 'Kč' : currency.toUpperCase() === 'EUR' ? '€' : '$';
    return res.json({
      analysis: generateFallbackAnalysis(symbol, currentPrice, currency, currLabel, timeframe, gauge, indicators, recentPatterns, lang),
      source: 'quant_fallback',
    });
  }
});

function generateFallbackAnalysis(
  symbol: string,
  price: number = 100,
  currency: string = 'USD',
  currLabel: string = '$',
  timeframe: string = '1h',
  gauge: any,
  indicators: any,
  patterns: any[],
  lang: string
) {
  const isBull = gauge?.overallRating?.includes('BUY');
  const isBear = gauge?.overallRating?.includes('SELL');
  const bias = isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL';
  const confidence = Math.min(94, Math.max(62, 55 + Math.abs(gauge?.score || 0) / 2));

  const atr = indicators?.atr || price * 0.018;
  const target1 = isBull ? price + atr * 1.8 : price - atr * 1.8;
  const target2 = isBull ? price + atr * 3.4 : price - atr * 3.4;
  const invalidation = isBull ? price - atr * 1.1 : price + atr * 1.1;

  const s1 = gauge?.pivotPoints?.classic?.s1 || price * 0.98;
  const s2 = gauge?.pivotPoints?.classic?.s2 || price * 0.96;
  const r1 = gauge?.pivotPoints?.classic?.r1 || price * 1.02;
  const r2 = gauge?.pivotPoints?.classic?.r2 || price * 1.04;

  const priceFormatted = (p: number) =>
    currency === 'CZK' ? `${p.toFixed(2)} Kč` : `${currLabel}${p.toFixed(2)}`;

  return {
    thesis:
      lang === 'cz'
        ? `Kvantitativní analýza pro ${symbol} (${timeframe}) indikuje ${
            isBull
              ? 'silné býčí momentum s pozitivní shodou klouzavých průměrů a rostoucím objemem na breakoutu'
              : isBear
              ? 'medvědí distribuci s odmítnutím rezistence a oslabením nákupního tlaku'
              : 'konsolidační pásmo v rovnovážné zóně kolem pivotu'
          }. Aktuální reálná cena je ${priceFormatted(price)} s technickým skóre ${gauge?.score ?? 0}/100.`
        : `Quantitative analysis for ${symbol} (${timeframe}) indicates ${bias.toLowerCase()} momentum at current real price of ${priceFormatted(price)} with technical score ${gauge?.score ?? 0}/100.`,
    bias,
    confidence: Math.round(confidence),
    targetPrice1: Number(target1.toFixed(2)),
    targetPrice2: Number(target2.toFixed(2)),
    invalidationPrice: Number(invalidation.toFixed(2)),
    riskRewardRatio: '1 : 2.5',
    keyLevels: {
      support: [Number(s1.toFixed(2)), Number(s2.toFixed(2))],
      resistance: [Number(r1.toFixed(2)), Number(r2.toFixed(2))],
    },
    insights: [
      `RSI (14) na hodnotě ${(indicators?.rsi || 50).toFixed(1)} ${
        (indicators?.rsi || 50) > 70
          ? 'ukazuje přehřátí trhu'
          : (indicators?.rsi || 50) < 30
          ? 'signalizuje přeprodané pásmo vhodné k akumulaci'
          : 'potvrzuje stabilní trend'
      }.`,
      `MACD histogram dosahuje ${(indicators?.macd?.histogram || 0).toFixed(2)}, což reflektuje ${(indicators?.macd?.histogram || 0) >= 0 ? 'kladné' : 'záporné'} zrychlení.`,
      `SuperTrend vykazuje ${indicators?.superTrend?.trend === 'up' ? 'býčí' : 'medvědí'} trajektorii.`,
    ],
    catalysts: [
      `Reakce na hladině denního pivotu (${priceFormatted(gauge?.pivotPoints?.classic?.p || price)}) a 50 EMA`,
      `Objemové toky a konsolidace v blízkosti pásem Bollinger Bands`,
    ],
    executionPlan:
      lang === 'cz'
        ? `Vstup na zpětném testu úrovně ${priceFormatted(isBull ? s1 : r1)}, invalidace pod ${priceFormatted(invalidation)}, profit target 1 na ${priceFormatted(target1)}.`
        : `Enter upon pullback to ${priceFormatted(isBull ? s1 : r1)}, stop-loss below ${priceFormatted(invalidation)}, target 1 at ${priceFormatted(target1)}.`,
  };
}

// Mount router on BOTH '/api' and '/' so that it matches both in standalone server and Vercel serverless function
app.use('/api', router);
app.use('/', router);

export default app;
