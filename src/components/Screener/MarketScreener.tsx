import React, { useState } from 'react';
import { Ticker } from '../../types/market';
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  X,
  ExternalLink,
} from 'lucide-react';
import { formatPriceCompact } from '../../utils/formatters';

interface MarketScreenerProps {
  isOpen: boolean;
  onClose: () => void;
  tickers: Ticker[];
  onSelectTicker: (ticker: Ticker) => void;
  lang: 'cz' | 'en';
}

export const MarketScreener: React.FC<MarketScreenerProps> = ({
  isOpen,
  onClose,
  tickers,
  onSelectTicker,
  lang,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'gainers' | 'losers' | 'tech' | 'crypto'>('all');

  if (!isOpen) return null;

  const filtered = tickers.filter((t) => {
    const matchesQuery =
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.sector.toLowerCase().includes(search.toLowerCase());

    if (!matchesQuery) return false;

    if (filterMode === 'gainers') return t.change >= 0;
    if (filterMode === 'losers') return t.change < 0;
    if (filterMode === 'tech') return t.sector.toLowerCase().includes('tech') || t.sector.toLowerCase().includes('cloud') || t.sector.toLowerCase().includes('semi');
    if (filterMode === 'crypto') return t.exchange.toLowerCase().includes('crypto');

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {lang === 'cz' ? 'Tržní Screener & Kvantitativní Filtry' : 'Market Screener & Quantitative Scanner'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'cz'
                ? 'Skenujte akcie podle momenta, změny ceny a sektorové expozice v reálném čase.'
                : 'Scan stocks by real-time momentum, daily change, and sector classification.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'cz' ? 'Hledat ticker, firmu nebo sektor...' : 'Search ticker, company, or sector...'}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filterMode === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'cz' ? 'Vše' : 'All'}
            </button>
            <button
              onClick={() => setFilterMode('gainers')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filterMode === 'gainers' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'cz' ? 'Růst' : 'Gainers'}
            </button>
            <button
              onClick={() => setFilterMode('losers')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filterMode === 'losers' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'cz' ? 'Pokles' : 'Losers'}
            </button>
            <button
              onClick={() => setFilterMode('tech')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filterMode === 'tech' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tech / AI
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-950/70 border border-slate-800 overflow-hidden font-mono text-xs">
            <div className="grid grid-cols-5 p-3 text-[11px] text-slate-500 font-sans uppercase font-medium bg-slate-950">
              <span className="col-span-2">{lang === 'cz' ? 'Aktivum / Sektor' : 'Asset / Sector'}</span>
              <span className="text-right">{lang === 'cz' ? 'Cena' : 'Price'}</span>
              <span className="text-right">{lang === 'cz' ? 'Změna 24h' : '24h Change'}</span>
              <span className="text-right">{lang === 'cz' ? 'Tržní Kap.' : 'Market Cap'}</span>
            </div>

            {filtered.map((item) => {
              const isPositive = item.change >= 0;
              return (
                <div
                  key={item.symbol}
                  onClick={() => {
                    onSelectTicker(item);
                    onClose();
                  }}
                  className="grid grid-cols-5 p-3 items-center hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="col-span-2 flex flex-col font-sans">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm tracking-tight">{item.symbol}</span>
                      <span className="text-[10px] text-slate-500 px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                        {item.exchange}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 truncate mt-0.5">{item.name}</span>
                  </div>

                  <div className="text-right font-bold text-white tabular-nums">
                    {formatPriceCompact(item.price, item.currency)}
                  </div>

                  <div className={`text-right tabular-nums font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? '+' : ''}
                    {item.changePercent.toFixed(2)}%
                  </div>

                  <div className="text-right text-slate-400 tabular-nums">
                    {item.marketCap}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
