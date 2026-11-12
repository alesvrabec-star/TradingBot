import React from 'react';
import { IndicatorConfig } from '../../types/market';
import { X, Check } from 'lucide-react';

interface IndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: IndicatorConfig;
  onChange: (update: Partial<IndicatorConfig>) => void;
  lang: 'cz' | 'en';
}

export const IndicatorModal: React.FC<IndicatorModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white">
              {lang === 'cz' ? 'Konfigurace Technických Indikátorů' : 'Technical Indicator Configuration'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'cz'
                ? 'Nastavte překryvné linie na grafu a parametry oscilátorů.'
                : 'Configure chart overlays and momentum oscillator parameters.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          {/* Moving Averages Section */}
          <div>
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2.5">
              {lang === 'cz' ? 'Klouzavé Průměry (Trend)' : 'Moving Averages (Trend)'}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showSma20}
                  onChange={(e) => onChange({ showSma20: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-xs text-slate-200">SMA 20 (Cyan)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showSma50}
                  onChange={(e) => onChange({ showSma50: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-xs text-slate-200">SMA 50 (Amber)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showSma200}
                  onChange={(e) => onChange({ showSma200: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-xs text-slate-200">SMA 200 (Purple)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showEma9}
                  onChange={(e) => onChange({ showEma9: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-xs text-slate-200">EMA 9 (Sky)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showEma21}
                  onChange={(e) => onChange({ showEma21: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-xs text-slate-200">EMA 21 (Orange)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showVwap}
                  onChange={(e) => onChange({ showVwap: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-xs text-slate-200">VWAP (Gold)</span>
              </label>
            </div>
          </div>

          {/* Volatility & Channels */}
          <div>
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2.5">
              {lang === 'cz' ? 'Volatilita & Pásma' : 'Volatility & Channels'}
            </h4>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showBollinger}
                    onChange={(e) => onChange({ showBollinger: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs font-medium text-slate-200">Bollinger Bands</span>
                </label>
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Perioda (Default: 20)</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={config.bollingerPeriod}
                      onChange={(e) => onChange({ bollingerPeriod: Number(e.target.value) || 20 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Násobek Odchylky (Default: 2)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={0.5}
                      value={config.bollingerStd}
                      onChange={(e) => onChange({ bollingerStd: Number(e.target.value) || 2 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showSuperTrend}
                    onChange={(e) => onChange({ showSuperTrend: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs font-medium text-slate-200">SuperTrend (ATR Stop)</span>
                </label>
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">ATR Perioda (Default: 10)</label>
                    <input
                      type="number"
                      min={3}
                      max={50}
                      value={config.superTrendPeriod}
                      onChange={(e) => onChange({ superTrendPeriod: Number(e.target.value) || 10 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Násobek (Default: 3)</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={config.superTrendMultiplier}
                      onChange={(e) => onChange({ superTrendMultiplier: Number(e.target.value) || 3 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subchart Oscillator Controls */}
          <div>
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2.5">
              {lang === 'cz' ? 'Spodní Panel Oscilátorů' : 'Subchart Oscillators'}
            </h4>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {(['rsi', 'macd', 'stoch', 'none'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChange({ activeSubchart: mode })}
                  className={`py-2 text-xs font-medium rounded-lg uppercase transition-colors ${
                    config.activeSubchart === mode
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {config.activeSubchart === 'rsi' && (
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">RSI Perioda</label>
                  <input
                    type="number"
                    value={config.rsiPeriod}
                    onChange={(e) => onChange({ rsiPeriod: Number(e.target.value) || 14 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Překoupeno</label>
                  <input
                    type="number"
                    value={config.rsiOverbought}
                    onChange={(e) => onChange({ rsiOverbought: Number(e.target.value) || 70 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Přeprodáno</label>
                  <input
                    type="number"
                    value={config.rsiOversold}
                    onChange={(e) => onChange({ rsiOversold: Number(e.target.value) || 30 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>{lang === 'cz' ? 'Použít & Zavřít' : 'Apply & Close'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
