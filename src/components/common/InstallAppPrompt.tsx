import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type InstallPlatform = 'browser' | 'ios' | null;

export function InstallAppPrompt() {
  const [platform, setPlatform] = useState<InstallPlatform>(null);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) setPlatform('ios');

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setPlatform('browser');
    };

    const handleAppInstalled = () => {
      setPlatform(null);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!platform) return null;

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setPlatform(null);
  };

  return (
    <aside
      aria-label="Instalar ZAP Lanche"
      className="fixed bottom-24 left-3 right-3 z-[90] mx-auto max-w-md rounded-2xl border border-white/10 bg-[#17191f] p-3 shadow-2xl shadow-black/40"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
          <Download size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Tenha o ZAP Lanche no celular</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
            Acesse mais rápido pela tela inicial do seu aparelho.
          </p>
          {platform === 'ios' && showInstructions && (
            <p className="mt-2 text-xs leading-relaxed text-slate-200">
              No Safari, toque em <Share className="mx-0.5 inline-block" size={13} aria-label="Compartilhar" /> Compartilhar e escolha “Adicionar à Tela de Início”.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setPlatform(null)}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Fechar aviso de instalação"
        >
          <X size={17} />
        </button>
      </div>
      {platform === 'browser' ? (
        <button
          type="button"
          onClick={handleInstall}
          className="mt-3 w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-400"
        >
          Instalar aplicativo
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowInstructions((visible) => !visible)}
          className="mt-3 w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-400"
          aria-expanded={showInstructions}
        >
          {showInstructions ? 'Ocultar instruções' : 'Como instalar'}
        </button>
      )}
    </aside>
  );
}