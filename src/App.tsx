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
import { PWAInstallModal } from './components/PWA/PWAInstallModal';
import {
  Sparkles,
  Search,
  Sliders,
  TrendingUp,
  TrendingDown,
  Layers,
  RefreshCw,
  Zap,
  BarChart2,
  Gauge,
  BookOpen,
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

  // Modals & Navigation
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [isScreenerOpen, setIsScreenerOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chart' | 'summary' | 'book'>('chart');

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
    <div className="flex flex-col min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* 1. Header (Strict Top Bar Contract) */}
      <TopNav
        isStreaming={isStreaming}
        onToggleStream={() => setIsStreaming(!isStreaming)}
        onOpenScreener={() => setIsScreenerOpen(true)}
        onOpenIndicators={() => setIsIndicatorModalOpen(true)}
        onOpenAIAnalysis={() => setIsAIModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
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
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-4 lg:px-6 py-2 bg-slate-900/60 border-b border-slate-800">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-extrabold text-white tracking-tight">{activeTicker.symbol}</span>
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
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 font-semibold border border-slate-700/60">
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
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <button
            onClick={handleManualRefresh}
            disabled={isDataSyncing}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50 shrink-0"
            title={lang === 'cz' ? 'Aktualizovat reálná tržní data' : 'Refresh real market data'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDataSyncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <div className="flex items-center gap-0.5 p-0.5 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto no-scrollbar max-w-full">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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

      {/* Mobile Responsive Navigation Tab Bar (< lg screens) */}
      <div className="flex lg:hidden items-center justify-around px-3 py-1.5 bg-slate-900/95 border-b border-slate-800 sticky top-0 z-20 backdrop-blur-xs">
        <button
          onClick={() => setMobileTab('chart')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === 'chart'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>{lang === 'cz' ? 'Graf' : 'Chart'}</span>
        </button>

        <button
          onClick={() => setMobileTab('summary')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === 'summary'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>{lang === 'cz' ? 'Signály & AI' : 'Signals & AI'}</span>
          <span
            className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
              technicalGauge.score > 20
                ? 'bg-emerald-500/30 text-emerald-300'
                : technicalGauge.score < -20
                ? 'bg-rose-500/30 text-rose-300'
                : 'bg-amber-500/30 text-amber-300'
            }`}
          >
            {technicalGauge.score > 0 ? `+${technicalGauge.score}` : technicalGauge.score}
          </span>
        </button>

        <button
          onClick={() => setMobileTab('book')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === 'book'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{lang === 'cz' ? 'Order Book' : 'Order Book'}</span>
        </button>
      </div>

      {/* 4. Main Terminal Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row p-2 sm:p-3 lg:p-4 gap-2.5 sm:gap-3 w-full min-w-0">
        {/* Left Column: Drawing Toolbar + Chart Canvas (Visible when mobileTab === 'chart' on mobile, or always on desktop lg+) */}
        <div
          className={`flex-col w-full min-w-0 space-y-2 ${
            mobileTab === 'chart' ? 'flex' : 'hidden'
          } lg:flex lg:flex-1 lg:h-[calc(100vh-175px)]`}
        >
          {/* Drawing and Indicator Tools */}
          <DrawingToolbar
            activeTool={activeDrawingTool}
            setActiveTool={setActiveDrawingTool}
            onClearDrawings={handleClearDrawings}
            drawingCount={drawings.length}
            onOpenIndicators={() => setIsIndicatorModalOpen(true)}
            lang={lang}
          />

          {/* Interactive Candlestick Chart with explicit mobile height so iOS Safari never collapses flex canvas */}
          <div className="flex flex-col w-full h-[460px] sm:h-[540px] lg:flex-1 lg:h-full lg:min-h-0">
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
        {/* On mobile: displayed conditionally according to mobileTab */}
        {/* On desktop (lg+): displayed simultaneously in side-by-side column */}
        <div
          className={`w-full lg:w-[360px] xl:w-[400px] shrink-0 flex-col space-y-3 ${
            mobileTab !== 'chart' ? 'flex' : 'hidden'
          } lg:flex lg:h-[calc(100vh-175px)]`}
        >
          {/* Top Half: Quantitative Technical Summary & Gauge */}
          <div
            className={`rounded-xl overflow-hidden border border-slate-800 shadow-md ${
              mobileTab === 'summary' ? 'flex flex-col w-full h-[520px]' : 'hidden'
            } lg:flex lg:flex-col lg:h-[55%]`}
          >
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
          <div
            className={`rounded-xl overflow-hidden border border-slate-800 shadow-md ${
              mobileTab === 'book' ? 'flex flex-col w-full h-[480px]' : 'hidden'
            } lg:flex lg:flex-col lg:h-[45%]`}
          >
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

      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
