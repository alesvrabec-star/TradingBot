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
  onOpenInstallModal: () => void;
  lang: 'cz' | 'en';
  onToggleLang: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  isStreaming,
  onToggleStream,
  onOpenScreener,
  onOpenIndicators,
  onOpenAIAnalysis,
  onOpenInstallModal,
  lang,
  onToggleLang,
}) => {
  return (
    <header className="shrink-0 flex items-center justify-between gap-2 sm:gap-4 px-2.5 sm:px-4 lg:px-6 py-1.5 sm:py-3 bg-slate-950 border-b border-slate-800">
      {/* Zone 1: Wordmark & Logo */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg overflow-hidden border border-emerald-500/30 shrink-0 bg-slate-900 shadow-xs">
          <img
            src="/apple-touch-icon.png"
            alt="QuantPulse Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <a href="/" className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap flex items-center gap-1.5">
            <span>QuantPulse</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
              PRO
            </span>
          </a>
        </div>
      </div>

      {/* Zone 2: Navigation links on desktop */}
      <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-400">
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
          <span>{lang === 'cz' ? 'CZ' : 'EN'}</span>
        </button>
      </nav>

      {/* Zone 3: Actions & Mobile Quick Access */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Mobile Quick Action Buttons (< md) */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={onOpenScreener}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            title={lang === 'cz' ? 'Screener trhu' : 'Market Screener'}
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenIndicators}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            title={lang === 'cz' ? 'Indikátory' : 'Indicators'}
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenAIAnalysis}
            className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
            title={lang === 'cz' ? 'AI Analýza' : 'AI Analysis'}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* Install / Add to Home Screen Button */}
        <button
          onClick={onOpenInstallModal}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition-colors shrink-0"
          title={lang === 'cz' ? 'Přidat aplikaci na plochu telefonu' : 'Add to home screen'}
        >
          <img
            src="/pwa-192x192.png"
            alt="PWA Icon"
            className="w-3.5 h-3.5 rounded object-cover ring-1 ring-emerald-400/40"
          />
          <span className="hidden sm:inline">
            {lang === 'cz' ? 'Přidat na plochu' : 'Add to Home'}
          </span>
          <span className="sm:hidden text-[11px] font-bold">
            {lang === 'cz' ? 'Na plochu' : 'Install'}
          </span>
        </button>

        {/* Live Stream Controller */}
        <button
          onClick={onToggleStream}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            isStreaming
              ? 'bg-slate-900 border border-emerald-500/40 text-emerald-400 hover:bg-slate-800'
              : 'bg-slate-850 border border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          {isStreaming ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">{lang === 'cz' ? 'Živá data' : 'Live'}</span>
              <Pause className="w-3 h-3" />
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="hidden sm:inline">{lang === 'cz' ? 'Pozastaveno' : 'Paused'}</span>
              <Play className="w-3 h-3" />
            </>
          )}
        </button>
      </div>
    </header>
  );
};
