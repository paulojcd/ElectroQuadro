import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  X, Monitor, Download, WifiOff, HardDrive, Check, 
  Terminal, ShieldCheck, Sparkles, Laptop, Smartphone, Apple, Copy, FolderArchive, Play, Folder,
  Cpu, AlertTriangle, FileCode, CheckCircle2, ExternalLink
} from 'lucide-react';
import { 
  getPortableScripts, 
  downloadFile, 
  downloadPortableZip 
} from '../utils/portableLauncherGenerator';

interface StandaloneGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowNotification?: (msg: string) => void;
}

export const StandaloneGuideModal: React.FC<StandaloneGuideModalProps> = ({
  isOpen,
  onClose,
  onShowNotification,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'exe' | 'portable' | 'desktop' | 'mobile' | 'code'>('exe');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedSed, setCopiedSed] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok && onShowNotification) {
        onShowNotification('ElectroCad DIN instalado com sucesso como aplicação standalone!');
        onClose();
      }
    }
  };

  const handleDownloadZipClick = async () => {
    try {
      setIsGeneratingZip(true);
      await downloadPortableZip(undefined, (msg) => {
        if (onShowNotification) onShowNotification(msg);
      });
      if (onShowNotification) {
        onShowNotification('Pacote portátil ZIP descarregado com gerador de .EXE incluído!');
      }
    } catch (err) {
      console.error('Erro ao gerar zip portátil:', err);
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const scripts = getPortableScripts();

  const handleDownloadBat = () => {
    downloadFile(scripts.batContent, 'ElectroCad-DIN.bat');
    if (onShowNotification) onShowNotification('Ficheiro ElectroCad-DIN.bat descarregado!');
  };

  const handleDownloadCriarExe = () => {
    downloadFile(scripts.criarExeBatContent, 'Criar-EXE.bat');
    if (onShowNotification) onShowNotification('Ficheiro Criar-EXE.bat descarregado!');
  };

  const handleDownloadLauncherCs = () => {
    downloadFile(scripts.launcherCsContent, 'Launcher.cs');
    if (onShowNotification) onShowNotification('Ficheiro Launcher.cs descarregado!');
  };

  const handleDownloadStandaloneBat = () => {
    const standaloneBatCode = `@echo off
cd /d "%~dp0"
chcp 65001 >nul 2>&1
title ElectroCad DIN - Standalone Local Server
color 0b
cls
echo ==============================================================================
echo   ⚡ ElectroCad DIN - Arranque em Modo Standalone Local (Windows)
echo ==============================================================================
echo.
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] O Node.js nao foi encontrado no seu Windows.
    echo Por favor instale o Node.js v18 ou superior em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
if not exist "node_modules\\" (
    echo [INFO] A instalar dependencias necessarias (npm install)...
    call npm install
)
start "ElectroCad Server" /min cmd /c "call npm run dev"
ping 127.0.0.1 -n 3 >nul 2>&1
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="http://localhost:3000" --start-maximized
    exit
)
start "" "http://localhost:3000"
exit
`;
    downloadFile(standaloneBatCode, 'standalone.bat');
    if (onShowNotification) onShowNotification('Ficheiro standalone.bat blindado descarregado!');
  };

  const handleDownloadVbs = () => {
    downloadFile(scripts.vbsContent, 'ElectroCad-Silencioso.vbs');
    if (onShowNotification) onShowNotification('Ficheiro ElectroCad-Silencioso.vbs descarregado!');
  };

  const handleDownloadMac = () => {
    downloadFile(scripts.macContent, 'ElectroCad-Mac.command');
    if (onShowNotification) onShowNotification('Ficheiro ElectroCad-Mac.command descarregado!');
  };

  const handleDownloadLinux = () => {
    downloadFile(scripts.linuxContent, 'ElectroCad-Linux.sh');
    if (onShowNotification) onShowNotification('Ficheiro ElectroCad-Linux.sh descarregado!');
  };

  const localRunScript = `# 1. Instalar dependências
npm install

# 2. Iniciar a aplicação localmente
npm run dev

# Ou arrancar em modo de produção otimizado:
npm run build
npm run preview`;

  const copyScript = () => {
    navigator.clipboard.writeText(localRunScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
    if (onShowNotification) {
      onShowNotification('Comandos copiados para a área de transferência.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-bold">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Executar Localmente & Criar Ficheiro .EXE</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                  WINDOWS .EXE DISPONÍVEL
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Soluções para o ficheiro .bat e ferramentas para compilar num executável Windows .exe nativo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('exe')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'exe'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>⚡ Transformar em .EXE (Solução do .BAT)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('portable')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'portable'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-sky-400" />
            <span>📁 Pacote Portátil (ZIP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'desktop'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>App Desktop Oficial (PWA)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Servidor Local & Node.js</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mobile')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'mobile'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Tablet / Telemóvel</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* TAB: TRANSFORMAR EM .EXE & DIAGNÓSTICO DO .BAT */}
          {activeTab === 'exe' && (
            <div className="space-y-4">
              {/* Question Direct Answer Banner */}
              <div className="p-4 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/50 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Sim, é 100% possível transformar num executável .EXE para Windows!
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Criámos um compilador automático que utiliza as ferramentas nativas da Microsoft já instaladas no seu Windows 10 ou 11 (sem precisar de instalar nenhum programa extra).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadCriarExe}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descarregar Criar-EXE.bat</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadLauncherCs}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <FileCode className="w-4 h-4 text-sky-400" />
                    <span>Descarregar Launcher.cs (Código Fonte)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadZipClick}
                    disabled={isGeneratingZip}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <FolderArchive className="w-4 h-4 text-amber-400" />
                    <span>{isGeneratingZip ? 'A gerar...' : 'Descarregar Pacote Completo (ZIP)'}</span>
                  </button>
                </div>
              </div>

              {/* Por que é que o .bat não arrancou? */}
              <div className="bg-slate-950 border border-amber-900/50 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Porque é que o ficheiro .BAT não arrancou no seu computador? (Diagnóstico)</span>
                </div>
                <div className="text-slate-300 space-y-2 leading-relaxed text-[11px]">
                  <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                    <strong className="text-white block mb-0.5">1. Diretório de Execução do Windows (CWD)</strong>
                    No Windows, quando se dá duplo clique num ficheiro .bat ou se executa como Administrador, o sistema define frequentemente a diretoria de trabalho como <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">C:\Windows\System32</code>. Como não encontra os ficheiros da aplicação aí, a consola fecha-se num milissegundo.
                    <br />
                    <span className="text-emerald-400 font-semibold">✓ Solução:</span> O novo ficheiro corrigido já inclui <code className="text-slate-200 font-mono">cd /d "%~dp0"</code>, garantindo que corre sempre na pasta certa.
                  </div>

                  <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                    <strong className="text-white block mb-0.5">2. Node.js em falta (Se estiver no modo de servidor local)</strong>
                    Se descarregou o código fonte e tentou correr o <code className="text-sky-300">standalone.bat</code> localmente, este necessita do runtime Node.js instalado no Windows para iniciar o servidor local.
                    <br />
                    <span className="text-emerald-400 font-semibold">✓ Solução:</span> Se não tem o Node.js, pode instalar em <a href="https://nodejs.org/" target="_blank" rel="noreferrer" className="text-sky-400 underline font-mono">nodejs.org</a> ou utilizar o nosso gerador de <strong>.EXE</strong> / aplicação <strong>PWA</strong> que não requer Node.js!
                  </div>

                  <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                    <strong className="text-white block mb-0.5">3. Bloqueio de Segurança do Windows SmartScreen</strong>
                    Ficheiros .bat descarregados da internet são frequentemente bloqueados pelo Windows por omissão.
                    <br />
                    <span className="text-emerald-400 font-semibold">✓ Solução:</span> Clique com o botão direito no ficheiro <code className="text-slate-200">.bat</code> → <strong>Propriedades</strong> → marque a caixa <strong>«Desbloquear»</strong> (Unblock) em baixo → <strong>OK</strong>.
                  </div>
                </div>
              </div>

              {/* 3 Métodos para ter o .EXE */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3 Formas Práticas de Ter o Executável .EXE no Windows:</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Opção 1 */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                        <span>Compilador 1-Clique</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Coloque o ficheiro <code className="text-emerald-300">Criar-EXE.bat</code> e o <code className="text-slate-300">Launcher.cs</code> na mesma pasta e dê 2 cliques.
                      </p>
                      <div className="mt-2 text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                        O Windows compila automaticamente o <strong className="text-white">ElectroCad-DIN.exe</strong> através do compilador nativo Microsoft .NET (<code className="text-slate-300">csc.exe</code>).
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadCriarExe}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold rounded border border-slate-700 text-center transition text-[11px] flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Criar-EXE.bat</span>
                    </button>
                  </div>

                  {/* Opção 2 */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                        <span>Instalação Oficial PWA</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        No Microsoft Edge ou Google Chrome, clique no botão <strong>«Instalar»</strong> na barra de endereços do navegador.
                      </p>
                      <div className="mt-2 text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                        O Windows cria um ficheiro executável genuíno com o logótipo oficial no Menu Iniciar e Ambiente de Trabalho. 100% offline.
                      </div>
                    </div>
                    {isInstallable ? (
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-center transition text-[11px] flex items-center justify-center gap-1"
                      >
                        <Laptop className="w-3.5 h-3.5" />
                        <span>Instalar no Windows</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-mono text-center py-1">
                        ✓ Pronto a utilizar
                      </span>
                    )}
                  </div>

                  {/* Opção 3 */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                        <span>Conversor IExpress</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Pressione <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-slate-200">Win + R</kbd>, digite <code className="text-purple-300 font-bold">iexpress</code> e prima Enter.
                      </p>
                      <div className="mt-2 text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                        É a ferramenta de empacotamento oficial da Microsoft que transforma qualquer script .bat ou conjunto de ficheiros num único <strong className="text-white">.exe</strong> autónomo.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadBat}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold rounded border border-slate-700 text-center transition text-[11px] flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar .BAT Corrigido</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PACOTE PORTÁTIL (ZIP) */}
          {activeTab === 'portable' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-sky-950/70 via-slate-900 to-slate-900 border border-sky-500/50 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      <span>Pacote Portátil para Pasta ou Pen-Drive (Zero Instalação)</span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      O arquivo ZIP inclui todos os scripts de arranque (<code className="text-sky-300 font-mono">ElectroCad-DIN.bat</code>, <code className="text-purple-300 font-mono">Criar-EXE.bat</code>, scripts Mac e Linux) e o manual com resolução de problemas.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadZipClick}
                    disabled={isGeneratingZip}
                    className="w-full sm:w-auto px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-lg shadow-sky-950/60 transition active:scale-98 shrink-0 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FolderArchive className="w-4 h-4" />
                    <span>{isGeneratingZip ? 'A preparar...' : 'Descarregar Pacote ZIP'}</span>
                  </button>
                </div>
              </div>

              {/* Individual Download Buttons */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-sky-400" />
                  <span>Descarregar Ficheiros Individuais:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadCriarExe}
                    className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/60 rounded-lg text-left transition group"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Criar-EXE.bat</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Compilador automático para .EXE nativo</div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadBat}
                    className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/60 rounded-lg text-left transition group"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                        <span>ElectroCad-DIN.bat</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Script corrigido com UTF-8 e pasta fixa</div>
                    </div>
                    <Download className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadVbs}
                    className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/60 rounded-lg text-left transition group"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        <span>ElectroCad-Silencioso.vbs</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Arranca direto sem mostrar ecrã preto</div>
                    </div>
                    <Download className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadMac}
                    className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/60 rounded-lg text-left transition group"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span>ElectroCad-Mac.command</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Executável nativo para Apple Mac</div>
                    </div>
                    <Download className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DESKTOP PWA INSTALLATION */}
          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/40 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>Instalar como Programa no Menu Iniciar & Ambiente de Trabalho</span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Instala o ElectroCad DIN diretamente no sistema operativo (Windows 10/11, macOS ou Linux). Cria um atalho nativo no Ambiente de Trabalho e regista o programa no Menu Iniciar.
                    </p>
                  </div>

                  {isInstallable && (
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/50 transition active:scale-98 shrink-0 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Instalar Agora</span>
                    </button>
                  )}
                </div>

                {isInstalled && (
                  <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-lg flex items-center gap-2.5 text-emerald-300">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Esta aplicação já se encontra instalada como programa no seu computador!</span>
                  </div>
                )}
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <WifiOff className="w-4 h-4 text-amber-400" />
                    <span>100% Offline</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Funciona em obras ou fábricas sem qualquer ligação à internet através do Service Worker.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span>Armazenamento Local</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Todos os projetos, modelos e esquemas ficam guardados no disco rígido do computador.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Monitor className="w-4 h-4 text-blue-400" />
                    <span>Janela Nativa</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Janela dedicada sem separadores nem barras de endereço de browser, aproveitando 100% do ecrã.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MODO LOCAL / NODE.JS */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <h4 className="font-bold text-white text-xs">Ficheiro standalone.bat Atualizado e Blindado</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Substitua o seu ficheiro <code className="text-amber-300">standalone.bat</code> antigo por este para resolver o encerramento imediato.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadStandaloneBat}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition shrink-0 flex items-center gap-1.5 text-[11px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descarregar standalone.bat</span>
                </button>
              </div>

              <p className="text-slate-400 leading-relaxed">
                Para quem pretende compilar e executar o servidor a partir do código fonte no terminal:
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 relative font-mono text-xs">
                <button
                  type="button"
                  onClick={copyScript}
                  className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] transition"
                >
                  {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedScript ? 'Copiado' : 'Copiar'}</span>
                </button>
                <pre className="text-sky-300 whitespace-pre-wrap">{localRunScript}</pre>
              </div>

              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Requer Node.js 18+ ou 20+. O projeto inicia em <code className="text-white">http://localhost:3000</code>.</span>
              </div>
            </div>
          )}

          {/* TAB: MOBILE & TABLET */}
          {activeTab === 'mobile' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Apple className="w-4 h-4 text-slate-400" />
                  <span>No iPad / iPhone (Safari):</span>
                </h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-400 text-xs">
                  <li>Abra o ElectroCad DIN no navegador <strong>Safari</strong>.</li>
                  <li>Toque no botão de <strong>Partilha</strong> (ícone com um quadrado e uma seta para cima).</li>
                  <li>Escolha a opção <strong>«Adicionar ao Ecrã Principal»</strong>.</li>
                  <li>O ícone fica disponível no ecrã do iPad para desenhar esquemas e verificar quadros em obra.</li>
                </ol>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Em Tablets e Telefones Android (Chrome / Edge):</span>
                </h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-400 text-xs">
                  <li>Toque no menu de três pontos (⋮) no canto superior direito do Chrome.</li>
                  <li>Selecione <strong>«Instalar aplicação»</strong> ou «Adicionar ao ecrã inicial».</li>
                  <li>Confirme para adicionar o atalho ao ecrã do dispositivo.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-t border-slate-800 shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            ElectroCad DIN · Suporte Windows .EXE & Standalone
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
