import React from 'react';
import {
  Ticker,
  TechnicalGaugeSummary,
  TechnicalIndicatorValues,
  Timeframe,
} from '../../types/market';
import {
  Activity,
  Compass,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatPriceCompact } from '../../utils/formatters';

interface TechnicalSummaryProps {
  ticker: Ticker;
  timeframe: Timeframe;
  gauge: TechnicalGaugeSummary;
  indicators: TechnicalIndicatorValues;
  onOpenAIAnalysis: () => void;
  lang: 'cz' | 'en';
}

export const TechnicalSummary: React.FC<TechnicalSummaryProps> = ({
  ticker,
  timeframe,
  gauge,
  indicators,
  onOpenAIAnalysis,
  lang,
}) => {
  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'STRONG_BUY':
        return {
          label: lang === 'cz' ? 'SILNÝ NÁKUP' : 'STRONG BUY',
          bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
          color: '#10b981',
        };
      case 'BUY':
        return {
          label: lang === 'cz' ? 'NÁKUP' : 'BUY',
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          color: '#34d399',
        };
      case 'STRONG_SELL':
        return {
          label: lang === 'cz' ? 'SILNÝ PRODEJ' : 'STRONG SELL',
          bg: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
          color: '#ef4444',
        };
      case 'SELL':
        return {
          label: lang === 'cz' ? 'PRODEJ' : 'SELL',
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          color: '#f87171',
        };
      default:
        return {
          label: lang === 'cz' ? 'NEUTRÁLNÍ' : 'NEUTRAL',
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          color: '#94a3b8',
        };
    }
  };

  const overall = getRatingBadge(gauge.overallRating);
  const oscRating = getRatingBadge(gauge.oscillators.rating);
  const maRating = getRatingBadge(gauge.movingAverages.rating);

  // Meter gauge calculation (-100 to 100 maps to 0% to 100%)
  const gaugePercent = Math.min(100, Math.max(0, ((gauge.score + 100) / 200) * 100));

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-200 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {lang === 'cz' ? 'Technický Přehled & Signály' : 'Technical Summary & Signals'}
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            TF: {timeframe}
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-xl font-bold tracking-tight text-white">{ticker.symbol}</span>
          <span className="text-xs text-slate-400">{ticker.sector}</span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Main Quantitative Gauge Meter */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">
              {lang === 'cz' ? 'Celkový Kvantitativní Signál' : 'Overall Quantitative Signal'}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${overall.bg}`}>
              {overall.label}
            </span>
          </div>

          {/* Visual Gauge Meter Bar */}
          <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden my-3">
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 rounded-full"
              style={{ width: '100%' }}
            />
            {/* Needle indicator */}
            <div
              className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-md transform -translate-x-1/2 transition-all duration-300"
              style={{ left: `${gaugePercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>{lang === 'cz' ? 'Silný prodej' : 'Strong Sell'}</span>
            <span>{lang === 'cz' ? 'Neutrál' : 'Neutral'}</span>
            <span>{lang === 'cz' ? 'Silný nákup' : 'Strong Buy'}</span>
          </div>

          {/* Oscillators & MA Breakdown Pill Strip */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[11px] text-slate-400 mb-1">{lang === 'cz' ? 'Oscilátory' : 'Oscillators'}</div>
              <div className="font-bold text-white text-sm">{oscRating.label}</div>
              <div className="flex items-center gap-2 mt-1.5 font-mono text-[11px]">
                <span className="text-emerald-400">{gauge.oscillators.buy} N</span>
                <span className="text-slate-400">{gauge.oscillators.neutral} 0</span>
                <span className="text-rose-400">{gauge.oscillators.sell} P</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[11px] text-slate-400 mb-1">{lang === 'cz' ? 'Klouzavé Průměry' : 'Moving Averages'}</div>
              <div className="font-bold text-white text-sm">{maRating.label}</div>
              <div className="flex items-center gap-2 mt-1.5 font-mono text-[11px]">
                <span className="text-emerald-400">{gauge.movingAverages.buy} N</span>
                <span className="text-slate-400">{gauge.movingAverages.neutral} 0</span>
                <span className="text-rose-400">{gauge.movingAverages.sell} P</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Analysis CTA Button */}
        <button
          onClick={onOpenAIAnalysis}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all transform active:scale-98"
        >
          <Sparkles className="w-4 h-4" />
          <span>{lang === 'cz' ? 'AI Analýza & Kvantitativní Rozbor' : 'Gemini AI Quantitative Analysis'}</span>
        </button>

        {/* Live Indicator Snapshot */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>{lang === 'cz' ? 'Klíčové Indikátory' : 'Key Technical Metrics'}</span>
            <Activity className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <div className="divide-y divide-slate-800 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono">
            <div className="flex items-center justify-between p-2.5">
              <span className="text-slate-400">RSI (14)</span>
              <span
                className={`font-bold ${
                  (indicators.rsi || 50) > 70
                    ? 'text-rose-400'
                    : (indicators.rsi || 50) < 30
                    ? 'text-emerald-400'
                    : 'text-slate-200'
                }`}
              >
                {(indicators.rsi || 50).toFixed(1)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5">
              <span className="text-slate-400">MACD Hist</span>
              <span
                className={`font-bold ${
                  (indicators.macd?.histogram || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {(indicators.macd?.histogram || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5">
              <span className="text-slate-400">Stochastic %K</span>
              <span className="text-slate-200 font-bold">
                {(indicators.stochastic?.k || 50).toFixed(1)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5">
              <span className="text-slate-400">ATR Volatilita</span>
              <span className="text-slate-200 font-bold">{formatPriceCompact(indicators.atr || 0, ticker.currency)}</span>
            </div>

            <div className="flex items-center justify-between p-2.5">
              <span className="text-slate-400">SuperTrend</span>
              <span
                className={`font-bold ${
                  indicators.superTrend?.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {indicators.superTrend?.trend === 'up' ? 'BÝČÍ (BULL)' : 'MEDVĚDÍ (BEAR)'}
              </span>
            </div>
          </div>
        </div>

        {/* Pivot Points Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>{lang === 'cz' ? 'Pivotní Úrovně (S/R)' : 'Pivot Support & Resistance'}</span>
            <Compass className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono">
            <div className="grid grid-cols-3 gap-1 pb-2 border-b border-slate-800/80 text-[10px] text-slate-500 uppercase">
              <span>Úroveň</span>
              <span className="text-right">Classic</span>
              <span className="text-right">Fibonacci</span>
            </div>

            <div className="divide-y divide-slate-800/40 text-[11px] pt-1">
              <div className="flex justify-between py-1 text-rose-400">
                <span>R2 Rezistence</span>
                <span>{formatPriceCompact(gauge.pivotPoints.classic.r2, ticker.currency)}</span>
                <span>{formatPriceCompact(gauge.pivotPoints.fibonacci.r2, ticker.currency)}</span>
              </div>
              <div className="flex justify-between py-1 text-rose-400/80">
                <span>R1 Rezistence</span>
                <span>{formatPriceCompact(gauge.pivotPoints.classic.r1, ticker.currency)}</span>
                <span>{formatPriceCompact(gauge.pivotPoints.fibonacci.r1, ticker.currency)}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-amber-400">
                <span>P Pivot</span>
                <span>{formatPriceCompact(gauge.pivotPoints.classic.p, ticker.currency)}</span>
                <span>{formatPriceCompact(gauge.pivotPoints.fibonacci.p, ticker.currency)}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-400/80">
                <span>S1 Support</span>
                <span>{formatPriceCompact(gauge.pivotPoints.classic.s1, ticker.currency)}</span>
                <span>{formatPriceCompact(gauge.pivotPoints.fibonacci.s1, ticker.currency)}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-400">
                <span>S2 Support</span>
                <span>{formatPriceCompact(gauge.pivotPoints.classic.s2, ticker.currency)}</span>
                <span>{formatPriceCompact(gauge.pivotPoints.fibonacci.s2, ticker.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
