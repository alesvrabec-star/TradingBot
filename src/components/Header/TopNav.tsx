import React from 'react';
import {
  Activity,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Search,
  Globe,
} from 'lucide-react';

interface TopNavProps {
  isStreaming: boolean;
  onToggleStream: () => void;
  onOpenScreener: () => void;
  onOpenIndicators: () => void;
  onOpenAIAnalysis: () => void;
  lang: 'cz' | 'en';
  onToggleLang: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  isStreaming,
  onToggleStream,
  onOpenScreener,
  onOpenIndicators,
  onOpenAIAnalysis,
  lang,
  onToggleLang,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-4 lg:px-6 py-3.5 bg-slate-950 border-b border-slate-800">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <Activity className="w-4 h-4" />
        </div>
        <a href="/" className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          QuantPulse Pro
        </a>
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links / tool triggers */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={onOpenScreener}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>{lang === 'cz' ? 'Screener trhu' : 'Market Screener'}</span>
        </button>

        <button
          onClick={onOpenIndicators}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span>{lang === 'cz' ? 'Indikátory' : 'Indicators'}</span>
        </button>

        <button
          onClick={onOpenAIAnalysis}
          className="hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 text-slate-300"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{lang === 'cz' ? 'AI Analýza' : 'AI Analysis'}</span>
        </button>

        <button
          onClick={onToggleLang}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
          title="Změnit jazyk (CZ / EN)"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>{lang === 'cz' ? 'Jazyk: CZ' : 'Language: EN'}</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action (Live Stream controller) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleStream}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            isStreaming
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
              : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          {isStreaming ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{lang === 'cz' ? 'Živý tok: AKTIVNÍ' : 'Live Stream: ACTIVE'}</span>
              <Pause className="w-3 h-3 ml-1" />
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>{lang === 'cz' ? 'Živý tok: POZASTAVEN' : 'Live Stream: PAUSED'}</span>
              <Play className="w-3 h-3 ml-1" />
            </>
          )}
        </button>
      </div>
    </header>
  );
};
