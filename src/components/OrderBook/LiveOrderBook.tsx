import React, { useState } from 'react';
import { OrderBook, MarketTrade } from '../../types/market';
import { Layers, History } from 'lucide-react';
import { formatPriceCompact, getCurrencySymbol } from '../../utils/formatters';

interface LiveOrderBookProps {
  orderBook: OrderBook;
  trades: MarketTrade[];
  currency?: string;
  lang: 'cz' | 'en';
}

export const LiveOrderBook: React.FC<LiveOrderBookProps> = ({
  orderBook,
  trades,
  currency = 'USD',
  lang,
}) => {
  const [tab, setTab] = useState<'book' | 'trades'>('book');

  const maxTotal = Math.max(
    ...orderBook.bids.map((b) => b.total),
    ...orderBook.asks.map((a) => a.total),
    1
  );

  const currSymbol = getCurrencySymbol(currency);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 text-xs text-slate-300">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab('book')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              tab === 'book'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{lang === 'cz' ? 'Kniha objednávek (L2)' : 'Order Book'}</span>
          </button>
          <button
            onClick={() => setTab('trades')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              tab === 'trades'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{lang === 'cz' ? 'Obchody (Tape)' : 'Time & Sales'}</span>
          </button>
        </div>

        <div className="text-[10px] font-mono text-slate-400">
          Spread: {formatPriceCompact(orderBook.spread, currency)} ({orderBook.spreadPercent.toFixed(2)}%)
        </div>
      </div>

      {tab === 'book' ? (
        <div className="flex flex-col flex-1 p-2 font-mono text-[11px] overflow-hidden">
          {/* Table Headers */}
          <div className="grid grid-cols-3 text-[10px] text-slate-500 pb-1 mb-1 border-b border-slate-800/80">
            <span>Cena ({currSymbol})</span>
            <span className="text-right">Objem</span>
            <span className="text-right">Celkem</span>
          </div>

          {/* Asks (Sell Orders - descending so lowest ask is near spread) */}
          <div className="flex flex-col-reverse justify-end flex-1 overflow-y-auto space-y-0.5 space-y-reverse">
            {orderBook.asks.slice(0, 7).map((ask, idx) => {
              const depthPct = (ask.total / maxTotal) * 100;
              return (
                <div key={`ask-${idx}`} className="relative grid grid-cols-3 py-0.5 px-1 items-center">
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-rose-500/10 pointer-events-none rounded"
                    style={{ width: `${depthPct}%` }}
                  />
                  <span className="text-rose-400 font-medium z-10">
                    {formatPriceCompact(ask.price, currency)}
                  </span>
                  <span className="text-right text-slate-300 z-10">{ask.size}</span>
                  <span className="text-right text-slate-400 z-10">{ask.total}</span>
                </div>
              );
            })}
          </div>

          {/* Middle Spread Banner */}
          <div className="py-1.5 my-1 px-2 rounded bg-slate-950 border-y border-slate-800 text-center flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">Střední cena:</span>
            <span className="text-sm font-bold text-white">
              {formatPriceCompact(orderBook.lastPrice, currency)}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Live</span>
          </div>

          {/* Bids (Buy Orders) */}
          <div className="flex flex-col flex-1 overflow-y-auto space-y-0.5">
            {orderBook.bids.slice(0, 7).map((bid, idx) => {
              const depthPct = (bid.total / maxTotal) * 100;
              return (
                <div key={`bid-${idx}`} className="relative grid grid-cols-3 py-0.5 px-1 items-center">
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-emerald-500/10 pointer-events-none rounded"
                    style={{ width: `${depthPct}%` }}
                  />
                  <span className="text-emerald-400 font-medium z-10">
                    {formatPriceCompact(bid.price, currency)}
                  </span>
                  <span className="text-right text-slate-300 z-10">{bid.size}</span>
                  <span className="text-right text-slate-400 z-10">{bid.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Live Time & Sales Tape */
        <div className="flex-1 p-2 font-mono text-[11px] overflow-y-auto">
          <div className="grid grid-cols-4 text-[10px] text-slate-500 pb-1 mb-1 border-b border-slate-800/80">
            <span>Čas</span>
            <span>Cena ({currSymbol})</span>
            <span className="text-right">Objem</span>
            <span className="text-right">Strana</span>
          </div>

          <div className="divide-y divide-slate-800/40">
            {trades.map((trade) => {
              const d = new Date(trade.time * 1000);
              const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const isBuy = trade.side === 'buy';

              return (
                <div key={trade.id} className="grid grid-cols-4 py-1 px-1 items-center hover:bg-slate-800/40 transition-colors">
                  <span className="text-slate-400 text-[10px]">{timeStr}</span>
                  <span className={isBuy ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {formatPriceCompact(trade.price, currency)}
                  </span>
                  <span className="text-right text-slate-200">{trade.size}</span>
                  <span className={`text-right font-bold text-[10px] ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isBuy ? 'BUY' : 'SELL'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
