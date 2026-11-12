import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Candle,
  IndicatorConfig,
  Pattern,
  ChartDrawing,
  DrawingTool,
  Ticker,
} from '../../types/market';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
  calculateStochastic,
  calculateVWAP,
  calculateSuperTrend,
} from '../../utils/indicators';
import {
  formatPrice,
  formatPriceCompact,
  getCurrencySymbol,
} from '../../utils/formatters';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Crosshair,
  TrendingUp,
  Minus,
  Sparkles,
  Ruler,
  Trash2,
} from 'lucide-react';

interface TradingChartProps {
  candles: Candle[];
  ticker: Ticker;
  patterns: Pattern[];
  indicators: IndicatorConfig;
  onUpdateIndicators: (config: Partial<IndicatorConfig>) => void;
  activeDrawingTool: DrawingTool;
  setActiveDrawingTool: (tool: DrawingTool) => void;
  drawings: ChartDrawing[];
  onAddDrawing: (drawing: ChartDrawing) => void;
  onClearDrawings: () => void;
  lang: 'cz' | 'en';
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  ticker,
  patterns,
  indicators,
  onUpdateIndicators,
  activeDrawingTool,
  setActiveDrawingTool,
  drawings,
  onAddDrawing,
  onClearDrawings,
  lang,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dynamic Chart Dimensions State
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Measure canvas container dimensions with ResizeObserver so chart immediately fills window on first load
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const measure = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width || container.clientWidth || 0);
      const h = Math.round(rect.height || container.clientHeight || 0);
      if (w > 0 && h > 0) {
        setDimensions((prev) => {
          if (prev.width === w && prev.height === h) return prev;
          return { width: w, height: h };
        });
      }
    };

    // Measure immediately
    measure();

    // Re-check after paint
    const rafId = requestAnimationFrame(measure);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        measure();
      });
      resizeObserver.observe(container);
    }

    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Viewport / Zoom & Pan State
  const [visibleCount, setVisibleCount] = useState<number>(75);
  const [scrollOffset, setScrollOffset] = useState<number>(0); // 0 = right-most (latest candles)
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);

  // Active drawing in progress
  const [drawingPoints, setDrawingPoints] = useState<{ time: number; price: number }[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [showPatternMarkers, setShowPatternMarkers] = useState(true);

  // Calculate Indicator Series
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);

  const sma20 = useMemo(() => (indicators.showSma20 ? calculateSMA(closes, 20) : []), [closes, indicators.showSma20]);
  const sma50 = useMemo(() => (indicators.showSma50 ? calculateSMA(closes, 50) : []), [closes, indicators.showSma50]);
  const sma200 = useMemo(() => (indicators.showSma200 ? calculateSMA(closes, 200) : []), [closes, indicators.showSma200]);
  const ema9 = useMemo(() => (indicators.showEma9 ? calculateEMA(closes, 9) : []), [closes, indicators.showEma9]);
  const ema21 = useMemo(() => (indicators.showEma21 ? calculateEMA(closes, 21) : []), [closes, indicators.showEma21]);
  const bollinger = useMemo(
    () => (indicators.showBollinger ? calculateBollingerBands(closes, indicators.bollingerPeriod, indicators.bollingerStd) : null),
    [closes, indicators.showBollinger, indicators.bollingerPeriod, indicators.bollingerStd]
  );
  const vwap = useMemo(() => (indicators.showVwap ? calculateVWAP(candles) : []), [candles, indicators.showVwap]);
  const superTrend = useMemo(
    () => (indicators.showSuperTrend ? calculateSuperTrend(candles, indicators.superTrendPeriod, indicators.superTrendMultiplier) : null),
    [candles, indicators.showSuperTrend, indicators.superTrendPeriod, indicators.superTrendMultiplier]
  );

  // Subchart Indicators
  const rsi = useMemo(() => calculateRSI(closes, indicators.rsiPeriod), [closes, indicators.rsiPeriod]);
  const macd = useMemo(
    () => calculateMACD(closes, indicators.macdFast, indicators.macdSlow, indicators.macdSignal),
    [closes, indicators.macdFast, indicators.macdSlow, indicators.macdSignal]
  );
  const stoch = useMemo(
    () => calculateStochastic(candles, indicators.stochK, indicators.stochD),
    [candles, indicators.stochK, indicators.stochD]
  );

  // Slice visible window
  const totalCandles = candles.length;
  const maxOffset = Math.max(0, totalCandles - 15);
  const safeOffset = Math.min(Math.max(0, scrollOffset), maxOffset);

  const endIndex = Math.max(0, totalCandles - safeOffset);
  const startIndex = Math.max(0, endIndex - visibleCount);
  const visibleCandles = useMemo(() => candles.slice(startIndex, endIndex), [candles, startIndex, endIndex]);

  // Convert chart coords to price & time
  const layout = useMemo(() => {
    const container = canvasContainerRef.current;
    const width = dimensions.width > 0 ? dimensions.width : (container?.clientWidth || 900);
    const height = dimensions.height > 0 ? dimensions.height : (container?.clientHeight || 560);

    const rightMargin = ticker.currency === 'CZK' ? 84 : 72; // Price axis width
    const bottomMargin = 28; // Time axis height
    const topMargin = 32; // Top padding

    const subchartHeight = indicators.activeSubchart === 'none' ? 0 : Math.round(height * 0.24);
    const mainChartHeight = Math.max(80, height - topMargin - bottomMargin - subchartHeight - (subchartHeight > 0 ? 12 : 0));

    return {
      width,
      height,
      chartWidth: Math.max(100, width - rightMargin),
      mainChartTop: topMargin,
      mainChartHeight,
      mainChartBottom: topMargin + mainChartHeight,
      subchartTop: topMargin + mainChartHeight + 12,
      subchartHeight,
      rightMargin,
      bottomMargin,
    };
  }, [dimensions.width, dimensions.height, indicators.activeSubchart, ticker.currency]);

  // Find min and max price in visible window
  const priceRange = useMemo(() => {
    if (visibleCandles.length === 0) return { min: 0, max: 100 };
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;

      const fullIdx = startIndex + i;
      if (indicators.showBollinger && bollinger) {
        const up = bollinger.upper[fullIdx];
        const low = bollinger.lower[fullIdx];
        if (up !== null && up > max) max = up;
        if (low !== null && low < min) min = low;
      }
    }

    // Add 4% padding
    const padding = (max - min) * 0.05 || 1;
    return {
      min: min - padding,
      max: max + padding,
    };
  }, [visibleCandles, startIndex, indicators.showBollinger, bollinger]);

  // Transform coordinates helper
  const getX = useCallback(
    (indexInVisible: number) => {
      const candleWidth = layout.chartWidth / Math.max(1, visibleCandles.length);
      return indexInVisible * candleWidth + candleWidth / 2;
    },
    [layout.chartWidth, visibleCandles.length]
  );

  const getY = useCallback(
    (price: number) => {
      const { min, max } = priceRange;
      const ratio = (price - min) / (max - min || 1);
      return layout.mainChartBottom - ratio * layout.mainChartHeight;
    },
    [priceRange, layout.mainChartBottom, layout.mainChartHeight]
  );

  const getPriceFromY = useCallback(
    (y: number) => {
      const { min, max } = priceRange;
      const ratio = (layout.mainChartBottom - y) / layout.mainChartHeight;
      return min + ratio * (max - min);
    },
    [priceRange, layout.mainChartBottom, layout.mainChartHeight]
  );

  const getTimeFromX = useCallback(
    (x: number) => {
      const candleWidth = layout.chartWidth / Math.max(1, visibleCandles.length);
      const idx = Math.floor(x / candleWidth);
      const safeIdx = Math.max(0, Math.min(visibleCandles.length - 1, idx));
      return visibleCandles[safeIdx]?.time || 0;
    },
    [layout.chartWidth, visibleCandles]
  );

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = layout;

    if (width <= 0 || height <= 0) return;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 1. Background Grid Lines
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);

    // Horizontal Price Grid
    const priceSteps = 6;
    for (let i = 0; i <= priceSteps; i++) {
      const y = layout.mainChartTop + (layout.mainChartHeight / priceSteps) * i;
      const priceAtY = getPriceFromY(y);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(layout.chartWidth, y);
      ctx.stroke();

      // Price Label
      ctx.fillStyle = '#64748b'; // slate-500
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(priceAtY.toFixed(2), layout.chartWidth + 6, y + 4);
    }

    // Vertical Time Grid
    const timeSteps = Math.max(2, Math.floor(layout.chartWidth / 120));
    for (let i = 0; i <= timeSteps; i++) {
      const candleIdx = Math.floor((visibleCandles.length / timeSteps) * i);
      if (candleIdx < visibleCandles.length) {
        const x = getX(candleIdx);
        const candleTime = visibleCandles[candleIdx]?.time;

        ctx.beginPath();
        ctx.moveTo(x, layout.mainChartTop);
        ctx.lineTo(x, layout.mainChartBottom);
        ctx.stroke();

        if (candleTime) {
          const date = new Date(candleTime * 1000);
          const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          ctx.fillStyle = '#64748b';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(timeStr, x, layout.mainChartBottom + 16);
        }
      }
    }
    ctx.setLineDash([]); // Reset line dash

    // 2. Volume Bars on bottom of main chart (semi-transparent)
    const maxVol = Math.max(...visibleCandles.map((c) => c.volume), 1);
    const volHeightMax = layout.mainChartHeight * 0.22;
    const candleWidth = layout.chartWidth / Math.max(1, visibleCandles.length);
    const barWidth = Math.max(1.5, candleWidth * 0.75);

    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.close >= c.open;
      const volBarH = (c.volume / maxVol) * volHeightMax;
      const volY = layout.mainChartBottom - volBarH;

      ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)';
      ctx.fillRect(x - barWidth / 2, volY, barWidth, volBarH);
    });

    // 3. Technical Indicator Overlays
    const drawLineSeries = (data: (number | null)[], color: string, width: number = 1.5, dashed: boolean = false) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dashed) ctx.setLineDash([4, 4]);
      else ctx.setLineDash([]);

      let started = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const fullIdx = startIndex + i;
        const val = data[fullIdx];
        if (val !== null && val !== undefined) {
          const x = getX(i);
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Bollinger Bands with subtle fill
    if (indicators.showBollinger && bollinger) {
      // Shading between upper and lower
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const fullIdx = startIndex + i;
        const up = bollinger.upper[fullIdx];
        if (up !== null) {
          const x = getX(i);
          const y = getY(up);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      for (let i = visibleCandles.length - 1; i >= 0; i--) {
        const fullIdx = startIndex + i;
        const low = bollinger.lower[fullIdx];
        if (low !== null) {
          const x = getX(i);
          const y = getY(low);
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.fill();

      drawLineSeries(bollinger.upper, 'rgba(56, 189, 248, 0.7)', 1, true);
      drawLineSeries(bollinger.middle, 'rgba(56, 189, 248, 0.9)', 1);
      drawLineSeries(bollinger.lower, 'rgba(56, 189, 248, 0.7)', 1, true);
    }

    if (indicators.showSma20) drawLineSeries(sma20, '#06b6d4', 1.5); // Cyan
    if (indicators.showSma50) drawLineSeries(sma50, '#f59e0b', 1.5); // Amber
    if (indicators.showSma200) drawLineSeries(sma200, '#a855f7', 1.8); // Purple
    if (indicators.showEma9) drawLineSeries(ema9, '#38bdf8', 1.5); // Sky
    if (indicators.showEma21) drawLineSeries(ema21, '#fb923c', 1.5); // Orange
    if (indicators.showVwap) drawLineSeries(vwap, '#eab308', 1.5, true); // Yellow

    if (indicators.showSuperTrend && superTrend) {
      for (let i = 1; i < visibleCandles.length; i++) {
        const fullIdx = startIndex + i;
        const prevIdx = startIndex + i - 1;
        const val1 = superTrend.values[prevIdx];
        const val2 = superTrend.values[fullIdx];
        const dir = superTrend.directions[fullIdx];

        if (val1 !== null && val2 !== null) {
          ctx.beginPath();
          ctx.strokeStyle = dir === 'up' ? '#10b981' : '#ef4444';
          ctx.lineWidth = 2;
          ctx.moveTo(getX(i - 1), getY(val1));
          ctx.lineTo(getX(i), getY(val2));
          ctx.stroke();
        }
      }
    }

    // 4. Candlesticks (Wick + Body)
    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.close >= c.open;
      const color = isUp ? '#10b981' : '#ef4444'; // Emerald / Rose

      const yHigh = getY(c.high);
      const yLow = getY(c.low);
      const yOpen = getY(c.open);
      const yClose = getY(c.close);

      // Draw Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Draw Candle Body
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));
      ctx.fillStyle = color;
      ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
    });

    // 5. Pattern Recognition Markers on Candles
    if (showPatternMarkers && patterns.length > 0) {
      patterns.forEach((pattern) => {
        const indexInVisible = pattern.candleIndex - startIndex;
        if (indexInVisible >= 0 && indexInVisible < visibleCandles.length) {
          const x = getX(indexInVisible);
          const c = visibleCandles[indexInVisible];
          const isBull = pattern.type === 'bullish';
          const isBear = pattern.type === 'bearish';
          const y = isBull ? getY(c.low) + 16 : getY(c.high) - 16;

          // Pin marker dot & tag
          ctx.beginPath();
          ctx.arc(x, y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = isBull ? '#10b981' : isBear ? '#ef4444' : '#38bdf8';
          ctx.fill();
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Small subtle text badge
          ctx.fillStyle = isBull ? '#34d399' : isBear ? '#f87171' : '#7dd3fc';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          const shortName = pattern.name.split(' ')[0];
          ctx.fillText(shortName, x, isBull ? y + 12 : y - 6);
        }
      });
    }

    // 6. User Chart Drawings (Trendlines, Horizontal, Fibonacci, Ruler)
    drawings.forEach((draw) => {
      ctx.strokeStyle = draw.color || '#38bdf8';
      ctx.lineWidth = 1.5;

      if (draw.type === 'horizontal' && draw.points.length >= 1) {
        const y = getY(draw.points[0].price);
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(layout.chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on axis
        ctx.fillStyle = draw.color || '#38bdf8';
        ctx.fillRect(layout.chartWidth, y - 9, layout.rightMargin, 18);
        ctx.fillStyle = '#0f172a';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(` ${formatPriceCompact(draw.points[0].price, ticker.currency)}`, layout.chartWidth + 2, y + 4);
      } else if (draw.type === 'trendline' && draw.points.length >= 2) {
        const [p1, p2] = draw.points;
        const i1 = visibleCandles.findIndex((c) => Math.abs(c.time - p1.time) < 180);
        const i2 = visibleCandles.findIndex((c) => Math.abs(c.time - p2.time) < 180);

        if (i1 !== -1 && i2 !== -1) {
          const x1 = getX(i1);
          const y1 = getY(p1.price);
          const x2 = getX(i2);
          const y2 = getY(p2.price);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else if (draw.type === 'fibonacci' && draw.points.length >= 2) {
        const p1 = draw.points[0].price;
        const p2 = draw.points[1].price;
        const high = Math.max(p1, p2);
        const low = Math.min(p1, p2);
        const diff = high - low;

        const fibLevels = [
          { ratio: 0, label: '0.0% (Low)' },
          { ratio: 0.236, label: '23.6%' },
          { ratio: 0.382, label: '38.2%' },
          { ratio: 0.5, label: '50.0%' },
          { ratio: 0.618, label: '61.8% (Golden)' },
          { ratio: 0.786, label: '78.6%' },
          { ratio: 1.0, label: '100.0% (High)' },
        ];

        fibLevels.forEach((level) => {
          const price = low + diff * level.ratio;
          const y = getY(price);

          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = level.ratio === 0.618 ? '#f59e0b' : 'rgba(148, 163, 184, 0.45)';
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(layout.chartWidth, y);
          ctx.stroke();

          ctx.fillStyle = level.ratio === 0.618 ? '#fbbf24' : '#94a3b8';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`${level.label} · ${formatPriceCompact(price, ticker.currency)}`, layout.chartWidth - 8, y - 3);
        });
        ctx.setLineDash([]);
      } else if (draw.type === 'ruler' && draw.points.length >= 2) {
        const [p1, p2] = draw.points;
        const i1 = visibleCandles.findIndex((c) => Math.abs(c.time - p1.time) < 180);
        const i2 = visibleCandles.findIndex((c) => Math.abs(c.time - p2.time) < 180);

        if (i1 !== -1 && i2 !== -1) {
          const x1 = getX(i1);
          const y1 = getY(p1.price);
          const x2 = getX(i2);
          const y2 = getY(p2.price);

          const deltaPrice = p2.price - p1.price;
          const percentChange = (deltaPrice / p1.price) * 100;
          const barCount = Math.abs(i2 - i1);

          ctx.fillStyle = deltaPrice >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
          ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
          ctx.strokeStyle = deltaPrice >= 0 ? '#10b981' : '#ef4444';
          ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));

          // Measurement badge in center
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(midX - 65, midY - 14, 130, 28);
          ctx.strokeStyle = '#475569';
          ctx.strokeRect(midX - 65, midY - 14, 130, 28);

          ctx.fillStyle = deltaPrice >= 0 ? '#34d399' : '#f87171';
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${deltaPrice >= 0 ? '+' : ''}${percentChange.toFixed(2)}% (${formatPriceCompact(deltaPrice, ticker.currency)})`, midX, midY - 1);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(`${barCount} svíček`, midX, midY + 10);
        }
      }
    });

    // 7. Active Live Price Line & Right Axis Tag
    const latestCandle = candles[candles.length - 1];
    if (latestCandle) {
      const currentY = getY(latestCandle.close);
      const isUp = latestCandle.close >= latestCandle.open;
      const tagBg = isUp ? '#10b981' : '#ef4444';

      ctx.beginPath();
      ctx.strokeStyle = tagBg;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 2]);
      ctx.moveTo(0, currentY);
      ctx.lineTo(layout.chartWidth, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Flashing Price Tag on axis
      ctx.fillStyle = tagBg;
      ctx.fillRect(layout.chartWidth, currentY - 10, layout.rightMargin, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(` ${formatPriceCompact(latestCandle.close, ticker.currency)}`, layout.chartWidth + 3, currentY + 4);
    }

    // 8. Subchart Rendering (RSI / MACD / Stochastic / Volume)
    if (indicators.activeSubchart !== 'none') {
      const { subchartTop, subchartHeight } = layout;

      // Divider line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, subchartTop - 6);
      ctx.lineTo(width, subchartTop - 6);
      ctx.stroke();

      if (indicators.activeSubchart === 'rsi') {
        // RSI levels: 70, 50, 30
        const getRsiY = (v: number) => subchartTop + subchartHeight - (v / 100) * subchartHeight;

        // Shaded 30-70 band
        ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
        ctx.fillRect(0, getRsiY(70), layout.chartWidth, getRsiY(30) - getRsiY(70));

        // Horizontal guides
        [70, 50, 30].forEach((level) => {
          const y = getRsiY(level);
          ctx.strokeStyle = level === 50 ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.4)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(layout.chartWidth, y);
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(level.toString(), layout.chartWidth + 6, y + 3);
        });
        ctx.setLineDash([]);

        // RSI Line
        ctx.beginPath();
        ctx.strokeStyle = '#a855f7'; // Purple line
        ctx.lineWidth = 1.6;
        let started = false;
        for (let i = 0; i < visibleCandles.length; i++) {
          const fullIdx = startIndex + i;
          const val = rsi[fullIdx];
          if (val !== null) {
            const x = getX(i);
            const y = getRsiY(val);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();
      } else if (indicators.activeSubchart === 'macd') {
        // MACD Histogram & Lines
        let maxMacd = 0.001;
        for (let i = 0; i < visibleCandles.length; i++) {
          const fullIdx = startIndex + i;
          const h = Math.abs(macd.histogram[fullIdx] || 0);
          const m = Math.abs(macd.macd[fullIdx] || 0);
          if (h > maxMacd) maxMacd = h;
          if (m > maxMacd) maxMacd = m;
        }
        maxMacd *= 1.25;

        const zeroY = subchartTop + subchartHeight / 2;
        const getMacdY = (v: number) => zeroY - (v / maxMacd) * (subchartHeight / 2);

        // Zero line
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(layout.chartWidth, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Histogram bars
        visibleCandles.forEach((_, i) => {
          const fullIdx = startIndex + i;
          const hist = macd.histogram[fullIdx];
          if (hist !== null) {
            const x = getX(i);
            const y = getMacdY(hist);
            const barH = Math.abs(y - zeroY);
            const isGreen = hist >= 0;
            ctx.fillStyle = isGreen ? 'rgba(16, 185, 129, 0.75)' : 'rgba(239, 68, 68, 0.75)';
            ctx.fillRect(x - barWidth / 2, Math.min(y, zeroY), barWidth, barH);
          }
        });

        // MACD line (Blue) & Signal line (Orange)
        const drawSubLine = (data: (number | null)[], color: string) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          let started = false;
          for (let i = 0; i < visibleCandles.length; i++) {
            const fullIdx = startIndex + i;
            const val = data[fullIdx];
            if (val !== null) {
              const x = getX(i);
              const y = getMacdY(val);
              if (!started) {
                ctx.moveTo(x, y);
                started = true;
              } else {
                ctx.lineTo(x, y);
              }
            }
          }
          ctx.stroke();
        };

        drawSubLine(macd.macd, '#38bdf8');
        drawSubLine(macd.signal, '#fb923c');
      } else if (indicators.activeSubchart === 'stoch') {
        const getStochY = (v: number) => subchartTop + subchartHeight - (v / 100) * subchartHeight;

        // 80 & 20 levels
        [80, 20].forEach((level) => {
          const y = getStochY(level);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(layout.chartWidth, y);
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(level.toString(), layout.chartWidth + 6, y + 3);
        });
        ctx.setLineDash([]);

        // %K (Blue) & %D (Orange)
        const drawStochLine = (data: (number | null)[], color: string) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          let started = false;
          for (let i = 0; i < visibleCandles.length; i++) {
            const fullIdx = startIndex + i;
            const val = data[fullIdx];
            if (val !== null) {
              const x = getX(i);
              const y = getStochY(val);
              if (!started) {
                ctx.moveTo(x, y);
                started = true;
              } else {
                ctx.lineTo(x, y);
              }
            }
          }
          ctx.stroke();
        };

        drawStochLine(stoch.k, '#38bdf8');
        drawStochLine(stoch.d, '#f59e0b');
      }
    }

    // 9. Interactive Crosshair and Hover Coordinate Tracking
    if (mousePos && mousePos.x <= layout.chartWidth && mousePos.y <= layout.height - layout.bottomMargin) {
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, layout.height - layout.bottomMargin);
      ctx.stroke();

      // Horizontal line in main chart or subchart
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(layout.chartWidth, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price box on Y-axis
      if (mousePos.y <= layout.mainChartBottom) {
        const hoveredPrice = getPriceFromY(mousePos.y);
        ctx.fillStyle = '#334155';
        ctx.fillRect(layout.chartWidth, mousePos.y - 10, layout.rightMargin, 20);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(` ${formatPriceCompact(hoveredPrice, ticker.currency)}`, layout.chartWidth + 3, mousePos.y + 4);
      }

      // Time box on X-axis
      const hoveredTime = getTimeFromX(mousePos.x);
      if (hoveredTime) {
        const d = new Date(hoveredTime * 1000);
        const timeBadge = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        ctx.fillStyle = '#334155';
        ctx.fillRect(mousePos.x - 55, layout.height - layout.bottomMargin, 110, 20);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(timeBadge, mousePos.x, layout.height - layout.bottomMargin + 14);
      }
    }
  }, [
    candles,
    visibleCandles,
    startIndex,
    layout,
    priceRange,
    getX,
    getY,
    getPriceFromY,
    getTimeFromX,
    indicators,
    sma20,
    sma50,
    sma200,
    ema9,
    ema21,
    bollinger,
    vwap,
    superTrend,
    rsi,
    macd,
    stoch,
    patterns,
    showPatternMarkers,
    drawings,
    mousePos,
  ]);

  // Handle Mouse Hover & Pan
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Find closest candle to hover
    const candleWidth = layout.chartWidth / Math.max(1, visibleCandles.length);
    const hoveredIdx = Math.floor(x / candleWidth);
    if (hoveredIdx >= 0 && hoveredIdx < visibleCandles.length) {
      setHoveredCandle(visibleCandles[hoveredIdx]);
    }

    // Check if dragging (panning)
    if (isDragging && activeDrawingTool === 'select') {
      const deltaX = x - dragStartX;
      const candlesShift = Math.round(deltaX / candleWidth);
      setScrollOffset(Math.max(0, dragStartOffset + candlesShift));
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeDrawingTool === 'select') {
      setIsDragging(true);
      setDragStartX(x);
      setDragStartOffset(scrollOffset);
    } else {
      // Drawing Tool Click
      const time = getTimeFromX(x);
      const price = getPriceFromY(y);

      if (activeDrawingTool === 'horizontal') {
        onAddDrawing({
          id: `draw-${Date.now()}`,
          type: 'horizontal',
          points: [{ time, price }],
          color: '#38bdf8',
        });
        setActiveDrawingTool('select');
      } else if (activeDrawingTool === 'trendline' || activeDrawingTool === 'fibonacci' || activeDrawingTool === 'ruler') {
        const nextPoints = [...drawingPoints, { time, price }];
        if (nextPoints.length === 2) {
          onAddDrawing({
            id: `draw-${Date.now()}`,
            type: activeDrawingTool,
            points: nextPoints,
            color: activeDrawingTool === 'fibonacci' ? '#f59e0b' : '#38bdf8',
          });
          setDrawingPoints([]);
          setActiveDrawingTool('select');
        } else {
          setDrawingPoints(nextPoints);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? 5 : -5;
    setVisibleCount((prev) => Math.min(220, Math.max(20, prev + zoomDelta)));
  };

  // Mobile Touch Gestures (Pan & Pinch-to-zoom)
  const touchStartRef = useRef<{ x: number; y: number; dist?: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.touches.length === 1) {
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      touchStartRef.current = { x, y };
      setDragStartX(x);
      setDragStartOffset(scrollOffset);
      setIsDragging(true);
      setMousePos({ x, y });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      touchStartRef.current = { x: 0, y: 0, dist };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !touchStartRef.current) return;

    if (e.touches.length === 1 && isDragging) {
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      setMousePos({ x, y });

      const candleWidth = layout.chartWidth / Math.max(1, visibleCandles.length);
      const deltaX = x - dragStartX;
      const candlesShift = Math.round(deltaX / candleWidth);
      setScrollOffset(Math.max(0, dragStartOffset + candlesShift));

      const hoveredIdx = Math.floor(x / candleWidth);
      if (hoveredIdx >= 0 && hoveredIdx < visibleCandles.length) {
        setHoveredCandle(visibleCandles[hoveredIdx]);
      }
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist - touchStartRef.current.dist;
      if (Math.abs(delta) > 6) {
        setVisibleCount((prev) => Math.min(220, Math.max(20, prev - (delta > 0 ? 3 : -3))));
        touchStartRef.current.dist = dist;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current = null;
  };

  // Active Candle for Header Display
  const displayCandle = hoveredCandle || candles[candles.length - 1];

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col w-full h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden select-none"
    >
      {/* Top Legend Bar: Symbol, O/H/L/C/V values, Active indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white text-sm tracking-tight">{ticker.symbol}</span>
          <span className="text-slate-400 hidden sm:inline">{ticker.name}</span>

          {displayCandle && (
            <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
              <span className="text-slate-400">O:</span>
              <span className="text-white">{formatPriceCompact(displayCandle.open, ticker.currency)}</span>
              <span className="text-slate-400">H:</span>
              <span className="text-emerald-400">{formatPriceCompact(displayCandle.high, ticker.currency)}</span>
              <span className="text-slate-400">L:</span>
              <span className="text-rose-400">{formatPriceCompact(displayCandle.low, ticker.currency)}</span>
              <span className="text-slate-400">C:</span>
              <span className={displayCandle.close >= displayCandle.open ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {formatPriceCompact(displayCandle.close, ticker.currency)}
              </span>
              <span className="text-slate-400 hidden md:inline">V:</span>
              <span className="text-slate-300 hidden md:inline">{displayCandle.volume.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Quick Zoom & Reset Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setVisibleCount((prev) => Math.max(20, prev - 15))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Přiblížit (Zoom In)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setVisibleCount((prev) => Math.min(220, prev + 15))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Oddálit (Zoom Out)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setScrollOffset(0);
              setVisibleCount(75);
            }}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Reset pohledu na nejnovější svíčky"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-1" />

          {/* Toggle Pattern Markers */}
          <button
            onClick={() => setShowPatternMarkers(!showPatternMarkers)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              showPatternMarkers ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">Patterny ({patterns.length})</span>
          </button>

          {/* Subchart Switcher */}
          <div className="flex items-center bg-slate-950 rounded p-0.5 border border-slate-800">
            {(['rsi', 'macd', 'stoch', 'none'] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => onUpdateIndicators({ activeSubchart: sub })}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors uppercase ${
                  indicators.activeSubchart === sub ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div ref={canvasContainerRef} className="relative flex-1 w-full h-full cursor-crosshair min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setMousePos(null)}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-0 block w-full h-full touch-none"
        />

        {/* In-chart Drawing in progress tooltip */}
        {drawingPoints.length > 0 && (
          <div className="absolute top-4 left-4 bg-sky-950/90 text-sky-200 border border-sky-800 px-3 py-1.5 rounded-lg text-xs shadow-lg backdrop-blur">
            {lang === 'cz'
              ? 'Klikněte pro umístění 2. bodu (dokončení formace/měření)'
              : 'Click to place second coordinate point to complete drawing'}
          </div>
        )}
      </div>

      {/* Quick Indicator Tags Strip */}
      <div className="flex items-center justify-between px-2 sm:px-3 py-1 bg-slate-950 border-t border-slate-900 text-[10px] sm:text-[11px] text-slate-500 font-mono gap-2 overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar shrink">
          {indicators.showSma20 && <span className="text-cyan-400 whitespace-nowrap">SMA 20</span>}
          {indicators.showSma50 && <span className="text-amber-400 whitespace-nowrap">SMA 50</span>}
          {indicators.showSma200 && <span className="text-purple-400 whitespace-nowrap">SMA 200</span>}
          {indicators.showEma9 && <span className="text-sky-400 whitespace-nowrap">EMA 9</span>}
          {indicators.showEma21 && <span className="text-orange-400 whitespace-nowrap">EMA 21</span>}
          {indicators.showBollinger && <span className="text-sky-300 whitespace-nowrap">BB (20, 2)</span>}
          {indicators.showSuperTrend && <span className="text-emerald-400 whitespace-nowrap">SuperTrend</span>}
          {indicators.showVwap && <span className="text-yellow-400 whitespace-nowrap">VWAP</span>}
        </div>
        <div className="text-slate-500 text-[9px] sm:text-[10px] whitespace-nowrap shrink-0">
          {lang === 'cz' ? 'Dotyk: 1 prst posun · 2 prsty zoom' : 'Touch: 1-finger pan · Pinch zoom'}
        </div>
      </div>
    </div>
  );
};
