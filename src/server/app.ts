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

  // Recover original URL path if rewritten via Vercel __path param or proxy headers
  try {
    const urlObj = new URL(req.url || '/', 'http://localhost');
    const pathParam = urlObj.searchParams.get('__path');
    if (pathParam !== null) {
      urlObj.searchParams.delete('__path');
      const qs = urlObj.searchParams.toString();
      const cleanPath = pathParam.startsWith('/') ? pathParam : `/${pathParam}`;
      const rewritten = `/api${cleanPath}${qs ? `?${qs}` : ''}`;
      req.url = rewritten;
      (req as any).originalUrl = rewritten;
    } else {
      const matchedPath =
        req.headers['x-matched-path'] ||
        req.headers['x-vercel-matched-path'] ||
        req.headers['x-forwarded-uri'] ||
        req.headers['x-original-url'];

      if (typeof matchedPath === 'string' && matchedPath.startsWith('/api/') && req.url === '/api') {
        const qs = urlObj.searchParams.toString();
        const rewritten = `${matchedPath}${qs ? `?${qs}` : ''}`;
        req.url = rewritten;
        (req as any).originalUrl = rewritten;
      }
    }
  } catch {
    // ignore URL parse errors
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

// In-memory cache for market quotes, candles, and Yahoo auth cookie/crumb
const quoteCache = new Map<string, { timestamp: number; data: any }>();
const candleCache = new Map<string, { timestamp: number; data: any }>();
let yahooAuthCache: { cookie: string; crumb: string; timestamp: number } | null = null;
let yahooAuthPromise: Promise<{ cookie: string; crumb: string } | null> | null = null;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function getYahooAuth(forceRefresh = false): Promise<{ cookie: string; crumb: string } | null> {
  const now = Date.now();
  if (!forceRefresh && yahooAuthCache && now - yahooAuthCache.timestamp < 15 * 60 * 1000) {
    return { cookie: yahooAuthCache.cookie, crumb: yahooAuthCache.crumb };
  }

  if (yahooAuthPromise) {
    return yahooAuthPromise;
  }

  yahooAuthPromise = (async () => {
    try {
      const cookieRes = await fetch('https://fc.yahoo.com', {
        redirect: 'manual',
        headers: { 'User-Agent': BROWSER_UA },
        signal: AbortSignal.timeout(5000),
      });
      const setCookie = cookieRes.headers.get('set-cookie');
      const cookie = setCookie ? setCookie.split(';')[0] : '';
      if (!cookie) return null;

      const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
        headers: {
          'User-Agent': BROWSER_UA,
          Cookie: cookie,
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!crumbRes.ok) return null;

      const crumb = (await crumbRes.text()).trim();
      if (!crumb || crumb.startsWith('<')) return null;

      yahooAuthCache = { cookie, crumb, timestamp: Date.now() };
      return { cookie, crumb };
    } catch {
      return null;
    } finally {
      yahooAuthPromise = null;
    }
  })();

  return yahooAuthPromise;
}

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

async function fetchYahooChart(symbol: string, interval: string, range: string, includePrePost = false) {
  const hosts = [
    'https://query1.finance.yahoo.com',
    'https://query2.finance.yahoo.com',
  ];

  let lastError: Error | null = null;
  const prePostParam = includePrePost ? '&includePrePost=true' : '';

  // Attempt 1: direct (or with cached crumb if already present)
  const cachedAuth = yahooAuthCache && Date.now() - yahooAuthCache.timestamp < 15 * 60 * 1000 ? yahooAuthCache : null;

  for (const host of hosts) {
    try {
      const crumbParam = cachedAuth ? `&crumb=${encodeURIComponent(cachedAuth.crumb)}` : '';
      const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}${prePostParam}${crumbParam}`;
      const headers: Record<string, string> = {
        'User-Agent': BROWSER_UA,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://finance.yahoo.com/',
      };
      if (cachedAuth?.cookie) {
        headers.Cookie = cachedAuth.cookie;
      }

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5500),
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

  // Attempt 2: Refresh cookie + crumb (essential when cloud/Vercel IPs receive 401/403)
  const freshAuth = await getYahooAuth(true);
  if (freshAuth) {
    for (const host of hosts) {
      try {
        const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}${prePostParam}&crumb=${encodeURIComponent(freshAuth.crumb)}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': BROWSER_UA,
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: 'https://finance.yahoo.com/',
            Cookie: freshAuth.cookie,
          },
          signal: AbortSignal.timeout(5500),
        });

        if (response.ok) {
          const json = await response.json();
          const result = json?.chart?.result?.[0];
          if (result) {
            return result;
          }
        } else {
          lastError = new Error(`Yahoo Finance auth (${host}) returned status ${response.status}`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error(`No data returned for symbol: ${symbol}`);
}

function extractYahooQuote(symbol: string, meta: any) {
  const nowSec = Math.floor(Date.now() / 1000);
  const periods = meta.currentTradingPeriod;
  let marketSession: 'pre' | 'regular' | 'post' = 'regular';

  if (meta.hasPrePostMarketData && periods) {
    if (periods.pre && nowSec >= periods.pre.start && nowSec < periods.pre.end) {
      marketSession = 'pre';
    } else if (periods.post && nowSec >= periods.post.start && nowSec < periods.post.end) {
      marketSession = 'post';
    } else if (periods.regular && nowSec < periods.regular.start) {
      marketSession = 'pre';
    } else if (periods.regular && nowSec > periods.regular.end) {
      marketSession = 'post';
    }
  }

  const regularPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 100;
  const hasExtendedPrice =
    meta.hasPrePostMarketData &&
    typeof meta.fulldayPrice === 'number' &&
    meta.fulldayPrice > 0 &&
    marketSession !== 'regular';

  const currentPrice = Number((hasExtendedPrice ? meta.fulldayPrice : regularPrice).toFixed(2));
  const prevClose = meta.regularMarketPreviousClose ?? meta.previousClose ?? meta.chartPreviousClose ?? regularPrice;

  let change: number;
  let changePercent: number;

  if (hasExtendedPrice && typeof meta.fulldayChange === 'number' && typeof meta.fulldayChangePercent === 'number') {
    change = Number(meta.fulldayChange.toFixed(2));
    changePercent = Number(meta.fulldayChangePercent.toFixed(2));
  } else if (typeof meta.fulldayChange === 'number' && typeof meta.fulldayChangePercent === 'number' && symbol === 'BTC-USD') {
    change = Number(meta.fulldayChange.toFixed(2));
    changePercent = Number(meta.fulldayChangePercent.toFixed(2));
  } else {
    change = Number((currentPrice - prevClose).toFixed(2));
    changePercent = Number((prevClose > 0 ? (change / prevClose) * 100 : 0).toFixed(2));
  }

  const metaInfo = DEFAULT_SYMBOLS_METADATA[symbol] || {
    name: meta.longName || meta.shortName || symbol,
    sector: meta.instrumentType || 'Equity',
  };

  return {
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
    marketSession,
    timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
  };
}

async function fetchKrakenBTC(timeframe: string) {
  const intervalMap: Record<string, number> = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '1h': 60,
    '4h': 240,
    '1D': 1440,
    '1W': 10080,
  };
  const kInterval = intervalMap[timeframe] || 15;
  const res = await fetch(`https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=${kInterval}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Kraken HTTP ${res.status}`);
  const json = await res.json();
  const rows = json?.result?.XXBTZUSD;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Empty Kraken OHLC');
  }
  return rows.slice(-180).map((r: any) => ({
    time: Number(r[0]),
    open: Number(parseFloat(r[1]).toFixed(2)),
    high: Number(parseFloat(r[2]).toFixed(2)),
    low: Number(parseFloat(r[3]).toFixed(2)),
    close: Number(parseFloat(r[4]).toFixed(2)),
    volume: Math.round(parseFloat(r[6]) * parseFloat(r[4])),
  }));
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

  res.set('Cache-Control', 'no-store, max-age=0');

  const cached = quoteCache.get(cacheKey);
  if (cached && now - cached.timestamp < 8000) {
    return res.json(cached.data);
  }

  try {
    const chart = await fetchYahooChart(symbol, '15m', '1d', true);
    const quoteData = extractYahooQuote(symbol, chart.meta);

    quoteCache.set(cacheKey, { timestamp: now, data: quoteData });
    res.json(quoteData);
  } catch (err: any) {
    console.error(`Error fetching quote for ${symbol}:`, err.message);
    res.status(502).json({ error: err.message });
  }
});

// 2. Get Real Historical Candles for a Symbol and Timeframe
router.get('/market/candles/:symbol', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  const timeframe = (req.query.timeframe as string) || '15m';
  const cacheKey = `candles_${symbol}_${timeframe}`;
  const now = Date.now();

  const cached = candleCache.get(cacheKey);
  if (cached && now - cached.timestamp < 15000) {
    res.set('Cache-Control', 'no-store, max-age=0');
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

  const includePrePost = ['1m', '5m', '15m', '1h', '4h'].includes(timeframe);

  try {
    const chart = await fetchYahooChart(symbol, interval, range, includePrePost);
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
    const quoteSummary = extractYahooQuote(symbol, meta);

    const payload = {
      symbol: meta.symbol || symbol,
      currency: quoteSummary.currency,
      exchange: quoteSummary.exchange,
      timeframe,
      candles: candlesToReturn,
      lastPrice: quoteSummary.price,
      marketSession: quoteSummary.marketSession,
      source: 'yahoo_live',
    };

    candleCache.set(cacheKey, { timestamp: now, data: payload });
    res.set('Cache-Control', 'no-store, max-age=0');
    res.json(payload);
  } catch (err: any) {
    if (symbol === 'BTC-USD') {
      try {
        const krakenCandles = await fetchKrakenBTC(timeframe);
        const lastPrice = krakenCandles[krakenCandles.length - 1]?.close || 73340;
        const payload = {
          symbol: 'BTC-USD',
          currency: 'USD',
          exchange: 'Kraken Spot',
          timeframe,
          candles: krakenCandles,
          lastPrice,
          source: 'kraken_live',
        };
        candleCache.set(cacheKey, { timestamp: now, data: payload });
        res.set('Cache-Control', 'no-store, max-age=0');
        return res.json(payload);
      } catch (kErr: any) {
        console.error('Kraken fallback failed:', kErr.message);
      }
    }
    console.error(`Error fetching candles for ${symbol}:`, err.message);
    res.set('Cache-Control', 'no-store, max-age=0');
    res.status(500).json({ error: err.message });
  }
});

// 3. Batch Fetch Quotes for All Watchlist Tickers (Parallel for Vercel Serverless Speed)
router.get('/market/tickers', async (req: Request, res: Response) => {
  const symbols = ['CEZ.PR', 'NVDA', 'AAPL', 'TSLA', 'MSFT', 'SPY', 'QQQ', 'BTC-USD', 'ERBAG.PR', 'KOMB.PR'];

  const results = await Promise.all(
    symbols.map(async (sym) => {
      try {
        const cacheKey = `quote_${sym}`;
        const now = Date.now();
        const cached = quoteCache.get(cacheKey);

        if (cached && now - cached.timestamp < 15000) {
          return cached.data;
        }

        const chart = await fetchYahooChart(sym, '15m', '1d', true);
        const item = extractYahooQuote(sym, chart.meta);

        quoteCache.set(cacheKey, { timestamp: now, data: item });
        return item;
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
        return {
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
        };
      }
    })
  );

  res.set('Cache-Control', 'no-store, max-age=0');
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
      horizon = 'short',
      horizonRec,
      gauge,
      indicators,
      recentPatterns,
      lang = 'cz',
    } = req.body;

    const currLabel = currency.toUpperCase() === 'CZK' ? 'Kč' : currency.toUpperCase() === 'EUR' ? '€' : '$';
    const horizonLabel =
      horizon === 'long'
        ? lang === 'cz'
          ? 'Dlouhodobý úsek (1–6 měsíců, denní/týdenní struktura SMA 50/200)'
          : 'Long-Term Horizon (1–6 months, Daily/Weekly SMA 50/200 trend)'
        : lang === 'cz'
        ? 'Krátkodobý úsek (1–5 dní, intradenní momentum EMA 9/21, RSI, MACD)'
        : 'Short-Term Horizon (1–5 days, intraday momentum EMA 9/21, RSI, MACD)';

    if (!ai) {
      return res.json({
        analysis: generateFallbackAnalysis(
          symbol,
          currentPrice,
          currency,
          currLabel,
          timeframe,
          horizon,
          horizonRec,
          gauge,
          indicators,
          recentPatterns,
          lang
        ),
        source: 'quant_engine',
      });
    }

    const prompt = `You are a chief quantitative technical analyst at an elite hedge fund.
Analyze the following asset market data for ${symbol} (${companyName}) specifically for the requested investment horizon:
- Target Analysis Horizon: ${horizonLabel}
- Current Price: ${currentPrice} ${currency} (${currLabel})
- Asset Currency: ${currency}
- Chart Timeframe: ${timeframe}
- Quantitative Horizon Signal: ${horizonRec?.action ?? 'HOLD'} (Score: ${horizonRec?.score ?? gauge?.score ?? 0}/100, Target: ${horizonRec?.targetPrice ?? 'N/A'}, Stop-Loss: ${horizonRec?.stopLoss ?? 'N/A'})
- Key Horizon Reasons: ${JSON.stringify(horizonRec?.reasons ?? [])}
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
CRITICAL: Give a clear BUY (NÁKUP) / SELL (PRODEJ) / NEUTRAL recommendation tailored specifically to the ${horizon === 'long' ? 'LONG-TERM' : 'SHORT-TERM'} horizon. All price numbers MUST be in the asset's currency (${currency} / ${currLabel}).

Respond ONLY with valid JSON conforming to this exact structure:
{
  "thesis": "Concise professional Buy/Sell recommendation and market analysis tailored to ${horizon === 'long' ? 'long-term investors (weeks-months)' : 'short-term traders (intraday-5 days)'}",
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
  "executionPlan": "Specific ${horizon === 'long' ? 'long-term accumulation/exit' : 'short-term entry/exit'} instructions with price trigger, stop-loss and profit target in ${currency}."
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
    const {
      symbol,
      currentPrice,
      currency = 'USD',
      timeframe,
      horizon = 'short',
      horizonRec,
      gauge,
      indicators,
      recentPatterns,
      lang = 'cz',
    } = req.body;
    const currLabel = currency.toUpperCase() === 'CZK' ? 'Kč' : currency.toUpperCase() === 'EUR' ? '€' : '$';
    return res.json({
      analysis: generateFallbackAnalysis(
        symbol,
        currentPrice,
        currency,
        currLabel,
        timeframe,
        horizon,
        horizonRec,
        gauge,
        indicators,
        recentPatterns,
        lang
      ),
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
  horizon: 'short' | 'long' = 'short',
  horizonRec: any,
  gauge: any,
  indicators: any,
  patterns: any[],
  lang: string
) {
  const score = typeof horizonRec?.score === 'number' ? horizonRec.score : (gauge?.score ?? 0);
  const isBull = horizonRec?.action ? horizonRec.action.includes('BUY') : score >= 15;
  const isBear = horizonRec?.action ? horizonRec.action.includes('SELL') : score <= -15;
  const bias = isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL';
  const confidence = horizonRec?.confidence ?? Math.min(94, Math.max(62, 55 + Math.abs(score) / 2));

  const atr = indicators?.atr || price * (horizon === 'long' ? 0.032 : 0.015);
  const mult1 = horizon === 'long' ? 3.0 : 1.6;
  const mult2 = horizon === 'long' ? 5.2 : 3.0;
  const stopMult = horizon === 'long' ? 2.0 : 1.1;

  const target1 = horizonRec?.targetPrice ?? (isBull ? price + atr * mult1 : price - atr * mult1);
  const target2 = isBull ? price + atr * mult2 : price - atr * mult2;
  const invalidation = horizonRec?.stopLoss ?? (isBull ? price - atr * stopMult : price + atr * stopMult);

  const s1 = gauge?.pivotPoints?.classic?.s1 || price * 0.98;
  const s2 = gauge?.pivotPoints?.classic?.s2 || price * 0.96;
  const r1 = gauge?.pivotPoints?.classic?.r1 || price * 1.02;
  const r2 = gauge?.pivotPoints?.classic?.r2 || price * 1.04;

  const priceFormatted = (p: number) =>
    currency === 'CZK' ? `${p.toFixed(2)} Kč` : `${currLabel}${p.toFixed(2)}`;

  const actionCz = isBull ? 'NÁKUP' : isBear ? 'PRODEJ' : 'VYČKAT / DRŽET';
  const actionEn = isBull ? 'BUY' : isBear ? 'SELL' : 'HOLD';
  const horizonTextCz = horizon === 'long' ? 'dlouhodobý úsek (1–6 měsíců)' : 'krátkodobý úsek (1–5 dní)';
  const horizonTextEn = horizon === 'long' ? 'long-term horizon (1–6 months)' : 'short-term horizon (1–5 days)';

  return {
    thesis:
      lang === 'cz'
        ? `Doporučení pro ${horizonTextCz} u ${symbol}: ${actionCz} (skóre ${score}/100). Kvantitativní analýza při ceně ${priceFormatted(price)} indikuje ${
            isBull
              ? horizon === 'long'
                ? 'zdravou dlouhodobou akumulační strukturu s podporou klíčových klouzavých průměrů'
                : 'krátkodobé nákupní momentum vhodné pro swing/intradenní vstup'
              : isBear
              ? horizon === 'long'
                ? 'dlouhodobý klesající trend pod hlavními průměry a tlak na nižší úrovně'
                : 'krátkodobé oslabení a prodejní tlak pod rychlými EMA'
              : 'neutrální konsolidační pásmo bez jednoznačného průrazu'
          }.`
        : `${actionEn} recommendation for ${symbol} (${horizonTextEn}, score ${score}/100) at ${priceFormatted(price)}.`,
    bias,
    confidence: Math.round(confidence),
    targetPrice1: Number(target1.toFixed(2)),
    targetPrice2: Number(target2.toFixed(2)),
    invalidationPrice: Number(Math.max(0.01, invalidation).toFixed(2)),
    riskRewardRatio: horizonRec?.riskReward || '1 : 2.2',
    keyLevels: {
      support: [Number(s1.toFixed(2)), Number(s2.toFixed(2))],
      resistance: [Number(r1.toFixed(2)), Number(r2.toFixed(2))],
    },
    insights: (horizonRec?.reasons?.length ? horizonRec.reasons : null) || [
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
      horizon === 'long'
        ? `Udržení dlouhodobé struktury nad/pod klouzavými průměry SMA 50 a SMA 200`
        : `Reakce ceny na denním pivotu (${priceFormatted(gauge?.pivotPoints?.classic?.p || price)}) a krátkodobých EMA`,
      `Objemové toky a proražení hranic Bollinger Bands`,
    ],
    executionPlan:
      lang === 'cz'
        ? `${actionCz} (${horizonTextCz}): vstup u ${priceFormatted(price)}, stop-loss na ${priceFormatted(Math.max(0.01, invalidation))}, hlavní cíl ${priceFormatted(target1)}.`
        : `${actionEn} (${horizonTextEn}): enter near ${priceFormatted(price)}, stop-loss at ${priceFormatted(Math.max(0.01, invalidation))}, target ${priceFormatted(target1)}.`,
  };
}

// Mount router on BOTH '/api' and '/' so that it matches both in standalone server and Vercel serverless function
app.use('/api', router);
app.use('/', router);

export default app;
