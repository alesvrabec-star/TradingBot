import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Ticker,
  Candle,
  Timeframe,
  IndicatorConfig,
  Pattern,
  ChartDrawing,
  DrawingTool,
  OrderBook,
  MarketTrade,
} from './types/market';
import {
  INITIAL_TICKERS,
  generateHistoricalCandles,
  applyLiveTick,
  generateOrderBook,
  fetchMarketCandles,
  fetchMarketTickers,
  fetchMarketQuote,
} from './utils/marketData';
import { formatPrice, formatPriceCompact, formatVolume } from './utils/formatters';
import { evaluateTechnicalGauge } from './utils/indicators';
import { detectCandlePatterns } from './utils/patternDetection';
import { TopNav } from './components/Header/TopNav';
import { TickerBar } from './components/Watchlist/TickerBar';
import { TradingChart } from './components/Chart/TradingChart';
import { DrawingToolbar } from './components/Chart/DrawingToolbar';
import { TechnicalSummary } from './components/Sidebar/TechnicalSummary';
import { LiveOrderBook } from './components/OrderBook/LiveOrderBook';
import { IndicatorModal } from './components/Chart/IndicatorModal';
import { MarketScreener } from './components/Screener/MarketScreener';
import { GeminiAnalysisModal } from './components/AIAnalysis/GeminiAnalysisModal';
import {
  Sparkles,
  Search,
  Sliders,
  TrendingUp,
  TrendingDown,
  Layers,
  RefreshCw,
  Zap,
} from 'lucide-react';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];

const DEFAULT_INDICATORS: IndicatorConfig = {
  showSma20: true,
  showSma50: true,
  showSma200: false,
  showEma9: false,
  showEma21: false,
  showBollinger: true,
  bollingerPeriod: 20,
  bollingerStd: 2,
  showVwap: true,
  showSuperTrend: false,
  superTrendPeriod: 10,
  superTrendMultiplier: 3,
  activeSubchart: 'rsi',
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  stochK: 14,
  stochD: 3,
};

export default function App() {
  const [lang, setLang] = useState<'cz' | 'en'>('cz');
  const [tickers, setTickers] = useState<Ticker[]>(INITIAL_TICKERS);
  // Default to CEZ.PR (ČEZ a.s. at real 1332 Kč) so user immediately sees their requested asset
  const [activeTicker, setActiveTicker] = useState<Ticker>(INITIAL_TICKERS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [isDataSyncing, setIsDataSyncing] = useState<boolean>(false);

  // Indicators & Tools
  const [indicators, setIndicators] = useState<IndicatorConfig>(DEFAULT_INDICATORS);
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingTool>('select');
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);

  // Modals
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [isScreenerOpen, setIsScreenerOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Market Historical Data & Real-time State
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateHistoricalCandles(INITIAL_TICKERS[0], '15m', 160)
  );
  const [orderBook, setOrderBook] = useState<OrderBook>(() =>
    generateOrderBook(INITIAL_TICKERS[0].price)
  );
  const [trades, setTrades] = useState<MarketTrade[]>([]);
  const [lastTickTicker, setLastTickTicker] = useState<string | undefined>(undefined);
  const [lastTickDirection, setLastTickDirection] = useState<'up' | 'down'>('up');

  // 1. Initial Load: Fetch real quotes from Yahoo Finance for all tickers
  useEffect(() => {
    fetchMarketTickers().then((liveTickers) => {
      if (liveTickers && liveTickers.length > 0) {
        setTickers(liveTickers);
        // Find matching ticker to update activeTicker with true real quote
        const current = liveTickers.find((t) => t.symbol === activeTicker.symbol);
        if (current) {
          setActiveTicker(current);
        }
      }
    });
  }, []);

  // 2. Load Real Historical Candles on symbol or timeframe change
  useEffect(() => {
    let isCancelled = false;
    setIsDataSyncing(true);

    fetchMarketCandles(activeTicker.symbol, timeframe, activeTicker)
      .then((realCandles) => {
        if (isCancelled) return;
        setCandles(realCandles);
        const latestPrice = realCandles[realCandles.length - 1]?.close || activeTicker.price;
        setOrderBook(generateOrderBook(latestPrice));
        setDrawings([]); // Clear drawings when switching asset
      })
      .finally(() => {
        if (!isCancelled) setIsDataSyncing(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTicker.symbol, timeframe]);

  // 3. Real-time Live Market Tick Simulation & Periodic Quote Sync
  useEffect(() => {
    if (!isStreaming) return;

    // Fast micro-tick loop every 1.3s
    const tickInterval = setInterval(() => {
      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return prevCandles;
        const currentClose = prevCandles[prevCandles.length - 1].close;

        const { updatedCandles, newTrade, newPrice } = applyLiveTick(prevCandles, timeframe);

        const direction: 'up' | 'down' = newPrice >= currentClose ? 'up' : 'down';
        setLastTickTicker(activeTicker.symbol);
        setLastTickDirection(direction);

        // Update active ticker price and % change
        setTickers((prevTickers) =>
          prevTickers.map((t) => {
            if (t.symbol === activeTicker.symbol) {
              const delta = newPrice - (t.price - t.change);
              const changePercent = (delta / (t.price - t.change)) * 100;
              return {
                ...t,
                price: newPrice,
                change: Number(delta.toFixed(2)),
                changePercent: Number(changePercent.toFixed(2)),
                high24h: Math.max(t.high24h, newPrice),
                low24h: Math.min(t.low24h, newPrice),
              };
            }
            return t;
          })
        );

        setActiveTicker((prev) => ({
          ...prev,
          price: newPrice,
        }));

        // Update Order Book & Trades Tape
        setOrderBook(generateOrderBook(newPrice));
        setTrades((prevTrades) => [newTrade, ...prevTrades.slice(0, 35)]);

        return updatedCandles;
      });
    }, 1300);

    // Periodic live background market quote sync every 25s
    const syncInterval = setInterval(() => {
      fetchMarketQuote(activeTicker.symbol).then((q) => {
        if (q && q.price) {
          setActiveTicker((prev) => ({
            ...prev,
            price: q.price,
            change: q.change,
            changePercent: q.changePercent,
            high24h: q.high24h,
            low24h: q.low24h,
            volume24h: q.volume24h,
            currency: q.currency,
          }));
        }
      });
    }, 25000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(syncInterval);
    };
  }, [isStreaming, timeframe, activeTicker.symbol]);

  // Evaluate technical patterns
  const patterns: Pattern[] = useMemo(() => {
    return detectCandlePatterns(candles);
  }, [candles]);

  // Evaluate multi-factor quantitative gauge & indicator values
  const { summary: technicalGauge, lastValues: indicatorValues } = useMemo(() => {
    return evaluateTechnicalGauge(candles);
  }, [candles]);

  const handleUpdateIndicators = (update: Partial<IndicatorConfig>) => {
    setIndicators((prev) => ({ ...prev, ...update }));
  };

  const handleAddDrawing = (drawing: ChartDrawing) => {
    setDrawings((prev) => [...prev, drawing]);
  };

  const handleClearDrawings = () => {
    setDrawings([]);
  };

  // Manual refresh real market data
  const handleManualRefresh = async () => {
    setIsDataSyncing(true);
    try {
      const [liveTickers, liveCandles] = await Promise.all([
        fetchMarketTickers(),
        fetchMarketCandles(activeTicker.symbol, timeframe, activeTicker),
      ]);
      if (liveTickers) setTickers(liveTickers);
      const curr = liveTickers?.find((t) => t.symbol === activeTicker.symbol);
      if (curr) setActiveTicker(curr);
      if (liveCandles) setCandles(liveCandles);
    } finally {
      setIsDataSyncing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* 1. Header (Strict Top Bar Contract) */}
      <TopNav
        isStreaming={isStreaming}
        onToggleStream={() => setIsStreaming(!isStreaming)}
        onOpenScreener={() => setIsScreenerOpen(true)}
        onOpenIndicators={() => setIsIndicatorModalOpen(true)}
        onOpenAIAnalysis={() => setIsAIModalOpen(true)}
        lang={lang}
        onToggleLang={() => setLang(lang === 'cz' ? 'en' : 'cz')}
      />

      {/* 2. Real-time Ticker Watchlist Ribbon */}
      <TickerBar
        tickers={tickers}
        activeTicker={activeTicker}
        onSelectTicker={(t) => setActiveTicker(t)}
        lastTickTicker={lastTickTicker}
        lastTickDirection={lastTickDirection}
        lang={lang}
      />

      {/* 3. Sub-header: Active Ticker Quick Info & Timeframe Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6 py-2.5 bg-slate-900/60 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2.5">
            <span className="text-lg font-extrabold text-white tracking-tight">{activeTicker.symbol}</span>
            <span className="text-sm font-mono font-bold text-white tabular-nums">
              {formatPrice(activeTicker.price, activeTicker.currency)}
            </span>
            <span
              className={`text-xs font-mono font-bold tabular-nums flex items-center ${
                activeTicker.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {activeTicker.change >= 0 ? '+' : ''}
              {activeTicker.change.toFixed(2)} ({activeTicker.changePercent >= 0 ? '+' : ''}
              {activeTicker.changePercent.toFixed(2)}%)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-semibold border border-slate-700/60">
              {activeTicker.currency}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>
              24h H: <strong className="text-slate-200">{formatPriceCompact(activeTicker.high24h, activeTicker.currency)}</strong>
            </span>
            <span>
              24h L: <strong className="text-slate-200">{formatPriceCompact(activeTicker.low24h, activeTicker.currency)}</strong>
            </span>
            <span className="hidden md:inline">
              Vol: <strong className="text-slate-200">{formatVolume(activeTicker.volume24h)}</strong>
            </span>
          </div>
        </div>

        {/* Timeframe Segmented Control & Live Sync Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isDataSyncing}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            title={lang === 'cz' ? 'Aktualizovat reálná tržní data' : 'Refresh real market data'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDataSyncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeframe === tf
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Main Terminal Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row p-2 sm:p-3 lg:p-4 gap-3 overflow-hidden">
        {/* Left Column: Drawing Toolbar + Chart Canvas + Subchart */}
        <div className="flex-1 flex flex-col min-w-0 space-y-2.5 h-[620px] lg:h-[calc(100vh-175px)]">
          {/* Drawing and Indicator Tools */}
          <DrawingToolbar
            activeTool={activeDrawingTool}
            setActiveTool={setActiveDrawingTool}
            onClearDrawings={handleClearDrawings}
            drawingCount={drawings.length}
            onOpenIndicators={() => setIsIndicatorModalOpen(true)}
            lang={lang}
          />

          {/* Interactive Candlestick Chart */}
          <div className="flex-1 min-h-0">
            <TradingChart
              candles={candles}
              ticker={activeTicker}
              patterns={patterns}
              indicators={indicators}
              onUpdateIndicators={handleUpdateIndicators}
              activeDrawingTool={activeDrawingTool}
              setActiveDrawingTool={setActiveDrawingTool}
              drawings={drawings}
              onAddDrawing={handleAddDrawing}
              onClearDrawings={handleClearDrawings}
              lang={lang}
            />
          </div>
        </div>

        {/* Right Column: Quantitative Technical Summary & Order Book */}
        <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 flex flex-col space-y-3 h-auto lg:h-[calc(100vh-175px)]">
          {/* Top Half: Quantitative Technical Summary & Gauge */}
          <div className="h-[360px] lg:h-[55%] rounded-xl overflow-hidden border border-slate-800 shadow-md">
            <TechnicalSummary
              ticker={activeTicker}
              timeframe={timeframe}
              gauge={technicalGauge}
              indicators={indicatorValues}
              onOpenAIAnalysis={() => setIsAIModalOpen(true)}
              lang={lang}
            />
          </div>

          {/* Bottom Half: Live Level 2 Order Book & Trades Tape */}
          <div className="h-[300px] lg:h-[45%] rounded-xl overflow-hidden border border-slate-800 shadow-md">
            <LiveOrderBook
              orderBook={orderBook}
              trades={trades}
              currency={activeTicker.currency}
              lang={lang}
            />
          </div>
        </div>
      </main>

      {/* Modals & Dialogs */}
      <IndicatorModal
        isOpen={isIndicatorModalOpen}
        onClose={() => setIsIndicatorModalOpen(false)}
        config={indicators}
        onChange={handleUpdateIndicators}
        lang={lang}
      />

      <MarketScreener
        isOpen={isScreenerOpen}
        onClose={() => setIsScreenerOpen(false)}
        tickers={tickers}
        onSelectTicker={(t) => setActiveTicker(t)}
        lang={lang}
      />

      <GeminiAnalysisModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        ticker={activeTicker}
        timeframe={timeframe}
        candles={candles}
        gauge={technicalGauge}
        indicators={indicatorValues}
        patterns={patterns}
        lang={lang}
      />
    </div>
  );
}
