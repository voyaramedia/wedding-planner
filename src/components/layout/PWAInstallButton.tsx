import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle2, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../lib/usePWAInstall.ts';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'banner' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'nav',
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed, show subtle badge or hide on nav
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-medium border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>App Installed & Ready Offline</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await promptInstall();
      } finally {
        setIsInstalling(false);
      }
    } else {
      // In non-Chrome browsers or where prompt is not fired, show manual guide modal
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {variant === 'nav' ? (
        <button
          onClick={handleClick}
          title="Install Wedding App"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-amber-900 bg-gradient-to-r from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 border border-amber-300 shadow-sm transition-all active:scale-95 ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-amber-800 animate-bounce" />
          <span className="hidden sm:inline font-serif font-semibold tracking-wide">Install App</span>
          <span className="sm:hidden font-semibold">Install</span>
        </button>
      ) : variant === 'banner' ? (
        <div className="bg-gradient-to-r from-[#4A1E27] to-[#311219] text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md mb-4 border border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-100">Install Our Wedding Planner</p>
              <p className="text-xs text-stone-300">Fast offline access to guests, schedule & expenses</p>
            </div>
          </div>
          <button
            onClick={handleClick}
            disabled={isInstalling}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-bold text-xs rounded-xl shadow transition-all active:scale-95 shrink-0"
          >
            {isInstalling ? 'Installing...' : 'Install Now'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleClick}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Install App to Home Screen</span>
        </button>
      )}

      {/* Manual / iOS Safari Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 relative text-stone-800">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#4A1E27] p-2.5 shadow-lg border border-amber-300/40 flex items-center justify-center">
                <img src="/icon.svg" alt="App Icon" className="w-full h-full object-contain" />
              </div>
              <h3 className="font-serif text-xl font-bold text-stone-900">Install to Home Screen</h3>
              <p className="text-xs text-stone-500 mt-1">
                Install as a standalone native app on your phone, tablet, or laptop.
              </p>
            </div>

            <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-100 text-xs text-stone-700">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 text-[11px]">
                  1
                </div>
                <p>
                  Tap the <strong className="text-stone-900">Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> in your browser toolbar (Safari or Chrome).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 text-[11px]">
                  2
                </div>
                <p>
                  Scroll down the menu and choose <strong className="text-stone-900">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-stone-700 mx-0.5" />.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 text-[11px]">
                  3
                </div>
                <p>
                  Tap <strong className="text-stone-900">Add</strong> in the top right corner. The app will launch with full offline support.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
