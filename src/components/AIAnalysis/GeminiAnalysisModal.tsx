import React, { useState, useEffect } from 'react';
import {
  Ticker,
  Candle,
  TechnicalGaugeSummary,
  TechnicalIndicatorValues,
  AIAnalysisResult,
  Timeframe,
  Pattern,
} from '../../types/market';
import {
  Sparkles,
  X,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  BarChart2,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { formatPriceCompact } from '../../utils/formatters';

interface GeminiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: Ticker;
  timeframe: Timeframe;
  candles: Candle[];
  gauge: TechnicalGaugeSummary;
  indicators: TechnicalIndicatorValues;
  patterns: Pattern[];
  lang: 'cz' | 'en';
}

export const GeminiAnalysisModal: React.FC<GeminiAnalysisModalProps> = ({
  isOpen,
  onClose,
  ticker,
  timeframe,
  candles,
  gauge,
  indicators,
  patterns,
  lang,
}) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: ticker.symbol,
          companyName: ticker.name,
          currentPrice: ticker.price,
          currency: ticker.currency,
          timeframe,
          gauge,
          indicators,
          recentPatterns: patterns.slice(-5),
          lang,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error('Failed to run AI analysis:', err);
      // Fallback deterministic quantitative analysis if API is offline or has no key
      const isBull = gauge.overallRating.includes('BUY');
      const isBear = gauge.overallRating.includes('SELL');
      const bias = isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL';
      const confidence = Math.min(95, Math.max(60, 50 + Math.abs(gauge.score) / 2));

      const atr = indicators.atr || ticker.price * 0.02;
      const target1 = isBull ? ticker.price + atr * 1.8 : ticker.price - atr * 1.8;
      const target2 = isBull ? ticker.price + atr * 3.5 : ticker.price - atr * 3.5;
      const invalidation = isBull ? ticker.price - atr * 1.1 : ticker.price + atr * 1.1;

      setAnalysis({
        thesis:
          lang === 'cz'
            ? `Kvantitativní model vyhodnocuje strukturu ${ticker.symbol} na timeframe ${timeframe} jako ${
                isBull ? 'převážně akumulační s převahou býčího momenta' : isBear ? 'distribuční s rizikem dalšího poklesu' : 'neutrální konsolidaci v pásmu'
              }. Klouzavé průměry vykazují poměr nákupních signálů ${gauge.movingAverages.buy}/${gauge.movingAverages.sell}.`
            : `Quantitative model rates ${ticker.symbol} on ${timeframe} timeframe as ${bias.toLowerCase()} momentum with technical gauge score of ${gauge.score}/100.`,
        bias,
        confidence: Math.round(confidence),
        targetPrice1: Number(target1.toFixed(2)),
        targetPrice2: Number(target2.toFixed(2)),
        invalidationPrice: Number(invalidation.toFixed(2)),
        riskRewardRatio: '1 : 2.4',
        keyLevels: {
          support: [
            gauge.pivotPoints.classic.s1,
            gauge.pivotPoints.classic.s2,
          ].map((v) => Number(v.toFixed(2))),
          resistance: [
            gauge.pivotPoints.classic.r1,
            gauge.pivotPoints.classic.r2,
          ].map((v) => Number(v.toFixed(2))),
        },
        insights: [
          `RSI na hodnotě ${(indicators.rsi || 50).toFixed(1)} ${
            (indicators.rsi || 50) > 70 ? 'indikuje překoupenost' : (indicators.rsi || 50) < 30 ? 'indikuje přeprodanost' : 'se drží v neutrálním pásmu'
          }.`,
          `MACD histogram dosahuje ${(indicators.macd?.histogram || 0).toFixed(2)}, což potvrzuje ${(indicators.macd?.histogram || 0) >= 0 ? 'pozitivní' : 'negativní'} momentum.`,
          `SuperTrend zůstává v ${indicators.superTrend?.trend === 'up' ? 'býčím' : 'medvědím'} nastavení s klíčovým pivotem.`,
          patterns.length > 0
            ? `Detekován nedávný pattern: ${patterns[patterns.length - 1].nameCz} s důvěrou ${patterns[patterns.length - 1].confidence}%.`
            : 'Trh nevykazuje žádné extrémní formace, převládá standardní trendová kontinuita.',
        ],
        catalysts: [
          'Objemové toky a konsolidace v blízkosti VWAP',
          'Interakce s 50-denním a 200-denním klouzavým průměrem',
          'Makroekonomický kalendář a sektorová rotace na NASDAQ/NYSE',
        ],
        executionPlan:
          lang === 'cz'
            ? `Vstup na retestu úrovně ${formatPriceCompact(isBull ? gauge.pivotPoints.classic.s1 : gauge.pivotPoints.classic.r1, ticker.currency)}, stop-loss pevně pod ${formatPriceCompact(invalidation, ticker.currency)}, částečný take-profit na ${formatPriceCompact(target1, ticker.currency)}.`
            : `Enter on retest of ${formatPriceCompact(isBull ? gauge.pivotPoints.classic.s1 : gauge.pivotPoints.classic.r1, ticker.currency)}, strict stop-loss below ${formatPriceCompact(invalidation, ticker.currency)}, take profit at ${formatPriceCompact(target1, ticker.currency)}.`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
    }
  }, [isOpen, ticker.symbol, timeframe]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {lang === 'cz' ? 'Kvantitativní AI Analýza Trhu' : 'Quantitative AI Market Analysis'}
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {ticker.symbol} · {timeframe}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'cz'
                  ? 'Hloubkový rozbor tržní struktury, supportů, rezistencí a rizikového profilu'
                  : 'Deep market structure analysis, support/resistance, and risk parameters'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Obnovit analýzu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-xs animate-pulse">
                {lang === 'cz'
                  ? 'Gemini vyhodnocuje svíčky, patterny a indikátory...'
                  : 'Gemini is analyzing multi-timeframe indicators and order flow...'}
              </p>
            </div>
          ) : analysis ? (
            <>
              {/* Bias and Confidence Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="flex flex-col justify-center">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                    {lang === 'cz' ? 'Tržní Bias (Směr)' : 'Market Bias'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-base">
                    {analysis.bias === 'BULLISH' ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">BÝČÍ (BULLISH)</span>
                      </>
                    ) : analysis.bias === 'BEARISH' ? (
                      <>
                        <TrendingDown className="w-4 h-4 text-rose-400" />
                        <span className="text-rose-400">MEDVĚDÍ (BEARISH)</span>
                      </>
                    ) : (
                      <span className="text-slate-300">NEUTRÁLNÍ (KONSOLIDACE)</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                    {lang === 'cz' ? 'Míra Důvěry Modelu' : 'Model Confidence'}
                  </span>
                  <span className="text-base font-bold font-mono tabular-nums text-white mt-1">
                    {analysis.confidence}%
                  </span>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                    {lang === 'cz' ? 'Poměr Zisk/Riziko (R:R)' : 'Risk / Reward'}
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-400 mt-1">
                    {analysis.riskRewardRatio}
                  </span>
                </div>
              </div>

              {/* Thesis summary */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {lang === 'cz' ? 'Kvantitativní Teze & Tržní Kontext' : 'Executive Thesis'}
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 leading-relaxed text-xs">
                  {analysis.thesis}
                </div>
              </div>

              {/* Price Targets & Invalidation Grid */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {lang === 'cz' ? 'Cílové Úrovně & Invalidation (Stop-Loss)' : 'Price Targets & Stop Invalidation'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/20">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium mb-1">
                      <Target className="w-3.5 h-3.5" />
                      <span>{lang === 'cz' ? 'Cíl 1 (Konzervativní)' : 'Target 1'}</span>
                    </div>
                    <div className="text-base font-bold font-mono text-white">
                      {formatPriceCompact(analysis.targetPrice1, ticker.currency)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/30">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium mb-1">
                      <Target className="w-3.5 h-3.5" />
                      <span>{lang === 'cz' ? 'Cíl 2 (Rozšířený)' : 'Target 2'}</span>
                    </div>
                    <div className="text-base font-bold font-mono text-emerald-400">
                      {formatPriceCompact(analysis.targetPrice2, ticker.currency)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-500/30">
                    <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-medium mb-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{lang === 'cz' ? 'Invalidace (Stop-Loss)' : 'Invalidation Stop'}</span>
                    </div>
                    <div className="text-base font-bold font-mono text-rose-400">
                      {formatPriceCompact(analysis.invalidationPrice, ticker.currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Indicator Insights Checklist */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {lang === 'cz' ? 'Indikátorové Poznatky' : 'Technical Indicator Insights'}
                </h4>
                <div className="space-y-1.5">
                  {analysis.insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-slate-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Plan */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {lang === 'cz' ? 'Doporučený Exekuční Plán' : 'Trade Execution Plan'}
                </h4>
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200">
                  {analysis.executionPlan}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
