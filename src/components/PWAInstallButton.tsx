import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { StandaloneGuideModal } from './StandaloneGuideModal';
import { Download, Monitor, CheckCircle, WifiOff } from 'lucide-react';

interface PWAInstallButtonProps {
  onShowNotification?: (msg: string) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onShowNotification }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInstallable) {
      const success = await install();
      if (success && onShowNotification) {
        onShowNotification('ElectroCad DIN instalado com sucesso como aplicação standalone!');
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Offline indicator if disconnected */}
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs font-mono animate-pulse">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Modo Offline Ativo</span>
          </div>
        )}

        {/* If running in standalone window */}
        {isInstalled ? (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold transition"
            title="A aplicação está a correr no modo Standalone nativo. Clique para gerir ou descarregar lançador de pasta."
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>App Nativa</span>
          </button>
        ) : isInstallable ? (
          /* If install prompt is ready (Chrome/Edge/Brave desktop/mobile) */
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-900/40 transition active:scale-98"
            title="Instalar ElectroCad DIN como executável desktop ou descarregar lançador de pasta .bat"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>App Portátil (.bat / .exe)</span>
          </button>
        ) : (
          /* Standalone creation and install guide */
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-semibold transition shadow-xs"
            title="Descarregar lançador executável de pasta (.bat) ou ver como usar sem instalar nada"
          >
            <Monitor className="w-3.5 h-3.5 text-emerald-400" />
            <span>App Portátil (.bat)</span>
          </button>
        )}
      </div>

      {/* Guide Modal */}
      {isModalOpen && (
        <StandaloneGuideModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onShowNotification={onShowNotification}
        />
      )}
    </>
  );
};
