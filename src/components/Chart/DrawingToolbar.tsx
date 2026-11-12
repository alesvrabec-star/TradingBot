import React from 'react';
import { DrawingTool } from '../../types/market';
import {
  MousePointer,
  TrendingUp,
  Minus,
  Binary,
  Ruler,
  Trash2,
  Sliders,
} from 'lucide-react';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  onClearDrawings: () => void;
  drawingCount: number;
  onOpenIndicators: () => void;
  lang: 'cz' | 'en';
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  setActiveTool,
  onClearDrawings,
  drawingCount,
  onOpenIndicators,
  lang,
}) => {
  const tools: { id: DrawingTool; labelCz: string; labelEn: string; icon: React.ReactNode }[] = [
    {
      id: 'select',
      labelCz: 'Kurzor / Posun',
      labelEn: 'Cursor / Pan',
      icon: <MousePointer className="w-4 h-4" />,
    },
    {
      id: 'trendline',
      labelCz: 'Trendová linie',
      labelEn: 'Trendline',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'horizontal',
      labelCz: 'Horizontální support/rezistence',
      labelEn: 'Horizontal Line',
      icon: <Minus className="w-4 h-4" />,
    },
    {
      id: 'fibonacci',
      labelCz: 'Fibonacci Retracement',
      labelEn: 'Fibonacci Retracement',
      icon: <Binary className="w-4 h-4" />,
    },
    {
      id: 'ruler',
      labelCz: 'Měřítko změny ceny & svíček',
      labelEn: 'Price & Bar Ruler',
      icon: <Ruler className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs">
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mr-2 hidden sm:inline">
          {lang === 'cz' ? 'Nástroje grafu:' : 'Chart Tools:'}
        </span>

        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={lang === 'cz' ? t.labelCz : t.labelEn}
            >
              {t.icon}
              <span className="hidden md:inline">{lang === 'cz' ? t.labelCz : t.labelEn}</span>
            </button>
          );
        })}

        {drawingCount > 0 && (
          <button
            onClick={onClearDrawings}
            className="flex items-center gap-1 px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-md transition-colors ml-1"
            title={lang === 'cz' ? 'Smazat všechny kresby' : 'Clear all drawings'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">({drawingCount})</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenIndicators}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors border border-slate-700/60"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span>{lang === 'cz' ? 'Nastavení indikátorů' : 'Indicators'}</span>
        </button>
      </div>
    </div>
  );
};
