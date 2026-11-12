import React from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  Download,
  Share2,
  PlusSquare,
  X,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'cz' | 'en';
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Icon */}
        <div className="flex flex-col items-center text-center pb-5 border-b border-slate-800">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl ring-2 ring-emerald-500/30 mb-3 bg-slate-950 p-0.5">
            <img
              src="/apple-touch-icon.png"
              alt="QuantPulse Icon"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            QuantPulse Pro
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            {lang === 'cz'
              ? 'Přidejte si terminál na plochu svého telefonu pro rychlý přístup v reálném čase jako nativní aplikaci.'
              : 'Add the trading terminal to your home screen for instant full-screen real-time access.'}
          </p>
        </div>

        {/* Content based on Device / State */}
        <div className="py-5 space-y-4">
          {isInstalled ? (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                {lang === 'cz'
                  ? 'Aplikace je již nainstalována a spuštěna v samostatném režimu.'
                  : 'The app is already installed and running in standalone mode.'}
              </span>
            </div>
          ) : isIOS ? (
            /* iOS Safari Instructions */
            <div className="space-y-3">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>{lang === 'cz' ? 'Návod pro iPhone / iPad (Safari)' : 'iPhone / iPad (Safari) Instructions'}</span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="p-1 rounded bg-slate-800 text-sky-400 shrink-0 mt-0.5">
                    <Share2 className="w-3.5 h-3.5" />
                  </div>
                  <span>
                    {lang === 'cz'
                      ? '1. V dolní liště Safari klepněte na ikonu Sdílet (čtvereček se šipkou nahoru).'
                      : '1. In Safari bottom bar, tap the Share button (square with arrow up).'}
                  </span>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="p-1 rounded bg-slate-800 text-emerald-400 shrink-0 mt-0.5">
                    <PlusSquare className="w-3.5 h-3.5" />
                  </div>
                  <span>
                    {lang === 'cz'
                      ? '2. Sjeďte v nabídce níže a zvolte "Přidat na plochu".'
                      : '2. Scroll down the menu and select "Add to Home Screen".'}
                  </span>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="p-1 rounded bg-slate-800 text-amber-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>
                    {lang === 'cz'
                      ? '3. V pravém horním rohu klepněte na "Přidat". Na ploše se vytvoří krásná ikona QuantPulse!'
                      : '3. Tap "Add" in the top right. QuantPulse icon will appear on your home screen!'}
                  </span>
                </div>
              </div>
            </div>
          ) : isInstallable ? (
            /* Android / Chrome One-Click Install */
            <div className="space-y-3">
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all transform active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'cz' ? 'Přidat na plochu telefonu' : 'Install to Home Screen'}</span>
              </button>
              <p className="text-[11px] text-center text-slate-400">
                {lang === 'cz'
                  ? 'Funguje v celoobrazovkovém režimu offline i online bez nutnosti stahování z obchodu.'
                  : 'Works in full-screen standalone mode with live real-time feeds.'}
              </p>
            </div>
          ) : (
            /* Generic Guide for other browsers */
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                {lang === 'cz'
                  ? 'Pro přidání na plochu otevřete menu prohlížeče (tři tečky vpravo nahoře) a vyberte "Přidat na plochu" nebo "Instalovat aplikaci".'
                  : 'To add to home screen, open your browser menu and select "Add to Home Screen" or "Install App".'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            {lang === 'cz' ? 'Rozumím' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
