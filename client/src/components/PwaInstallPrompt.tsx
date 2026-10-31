import { Download, Smartphone, Share, X, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('bmf_pwa_dismissed') === 'true';
  });
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalledSuccessfully(true);
      setDeferredPrompt(null);
      setTimeout(() => setIsDismissed(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalledSuccessfully(true);
        setTimeout(() => setIsDismissed(true), 3000);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const dismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('bmf_pwa_dismissed', 'true');
  };

  // If already installed or dismissed, do not render
  if (isStandalone || isDismissed) {
    return null;
  }

  // Only display if deferredPrompt is available or if on iOS Safari
  if (!deferredPrompt && !isIos) {
    return null;
  }

  return (
    <>
      <div className="relative mx-auto my-3 w-full max-w-7xl px-4 sm:px-6 lg:px-8 animate-fadeIn">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 rounded-2xl border border-emerald-300/60 bg-gradient-to-r from-[#1f5943] via-[#1a4b39] to-[#164030] p-3.5 sm:p-4 text-white shadow-md">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#1f5943] font-black text-xl shadow-xs">
              <Smartphone size={22} className="text-[#1f5943]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white">
                  Installer BMF Community sur mobile
                </span>
                <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-[#d9ed74]">
                  Application PWA
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-emerald-100/90 line-clamp-1">
                Accès direct depuis votre écran d’accueil, alertes vibrations et notifications au téléphone.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {installedSuccessfully ? (
              <span className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-white border border-emerald-400/40">
                <Check size={14} /> Installée !
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void handleInstallClick()}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#d9ed74] px-4 py-2 text-xs font-bold text-[#18342a] shadow-xs hover:bg-[#e4f58c] transition cursor-pointer flex-1 sm:flex-initial"
              >
                <Download size={14} />
                <span>Installer l'app</span>
              </button>
            )}

            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl p-1.5 text-emerald-200/70 hover:bg-white/10 hover:text-white transition cursor-pointer"
              aria-label="Ignorer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#14201c] p-6 shadow-2xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-sm font-bold">Installer sur iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  1
                </span>
                <p>
                  Dans Safari, appuyez sur le bouton de <strong>Partage</strong>{' '}
                  <Share size={13} className="inline mx-1 text-blue-500" /> en bas de l'écran.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  2
                </span>
                <p>
                  Faites défiler vers le bas et choisissez <strong>« Sur l'écran d'accueil »</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  3
                </span>
                <p>
                  Appuyez sur <strong>Ajouter</strong> en haut à droite. L'icône BMF s'ajoutera à vos applications !
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="mt-5 w-full rounded-xl bg-[#1f5943] py-2.5 text-xs font-bold text-white hover:bg-[#164332] transition cursor-pointer"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
