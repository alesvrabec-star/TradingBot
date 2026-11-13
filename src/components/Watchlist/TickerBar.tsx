import React from 'react';
import { Ticker } from '../../types/market';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatPriceCompact } from '../../utils/formatters';

interface TickerBarProps {
  tickers: Ticker[];
  activeTicker: Ticker;
  onSelectTicker: (ticker: Ticker) => void;
  lastTickTicker?: string;
  lastTickDirection?: 'up' | 'down';
  lang: 'cz' | 'en';
}

export const TickerBar: React.FC<TickerBarProps> = ({
  tickers,
  activeTicker,
  onSelectTicker,
  lastTickTicker,
  lastTickDirection,
  lang,
}) => {
  return (
    <div className="shrink-0 w-full bg-slate-900/90 border-b border-slate-800/80 px-2 sm:px-4 py-1 sm:py-1.5 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
        {tickers.map((t) => {
          const isSelected = t.symbol === activeTicker.symbol;
          const isPositive = t.change >= 0;
          const isTickFlashing = lastTickTicker === t.symbol;

          let tickFlashClass = '';
          if (isTickFlashing) {
            tickFlashClass = lastTickDirection === 'up' ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50' : 'bg-rose-500/20 ring-1 ring-rose-500/50';
          }

          return (
            <button
              key={t.symbol}
              onClick={() => onSelectTicker(t)}
              className={`flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-left transition-all duration-150 ${
                isSelected
                  ? 'bg-slate-800 border border-slate-700 shadow-xs'
                  : 'hover:bg-slate-800/60 border border-transparent'
              } ${tickFlashClass}`}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {t.symbol}
                  </span>
                  <span className="text-[10px] text-slate-500 hidden md:inline truncate max-w-[80px]">
                    {t.exchange}
                  </span>
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-300 font-semibold">
                  {formatPriceCompact(t.price, t.currency)}
                </div>
              </div>

              <div className={`flex items-center text-xs font-mono tabular-nums font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                <span>
                  {isPositive ? '+' : ''}
                  {t.changePercent.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
