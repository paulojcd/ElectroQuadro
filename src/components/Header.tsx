import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, Zap, FileSpreadsheet, ShieldAlert, FolderOpen, 
  Settings, Activity, Save, Check, HardDrive, ChevronDown, FileText, Download, PlusCircle, Printer, BookOpen, Shield, Tag, Wrench, Maximize2, Folder, ShieldCheck, BarChart3, Sparkles, Table, Cpu, Layout, Ruler 
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { AutoBackupState } from '../hooks/useAutoBackupOnIdle';

export type ActiveTab = 'layout' | 'control_panel' | 'simulation' | 'schematic' | 'bom' | 'dashboard' | 'checks';

interface HeaderProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenNewProject?: () => void;
  onOpenTemplates: () => void;
  onOpenSettings: () => void;
  onOpenSaveModal: () => void;
  onOpenIdMap?: () => void;
  onOpenCadExport?: () => void;
  onOpenPrintModal?: () => void;
  onOpenDrillingTemplate?: () => void;
  onOpenSchematicPdf?: () => void;
  onOpenLabelPrint?: () => void;
  onOpenLibraryManager?: () => void;
  onOpenWireCalc?: () => void;
  onOpenIecAssistant?: () => void;
  onOpenComplianceDocs?: () => void;
  onOpenIpIkVerification?: () => void;
  onExportUnifilarPdf?: () => void;
  onExportBomExcel?: () => void;
  onOpenWiringList?: () => void;
  onQuickSave: () => void;
  isRecentlySaved?: boolean;
  lastSavedTime?: string | null;
  projectName?: string;
  projectCode?: string;
  validationErrorCount: number;
  onShowNotification?: (msg: string) => void;
  onToggleImmersiveMode?: () => void;
  onOpenStandaloneGuide?: () => void;
  autoBackup?: AutoBackupState;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onChangeTab,
  onOpenNewProject,
  onOpenTemplates,
  onOpenSettings,
  onOpenSaveModal,
  onOpenIdMap,
  onOpenCadExport,
  onOpenPrintModal,
  onOpenDrillingTemplate,
  onOpenSchematicPdf,
  onOpenLabelPrint,
  onOpenLibraryManager,
  onOpenWireCalc,
  onOpenIecAssistant,
  onOpenComplianceDocs,
  onOpenIpIkVerification,
  onExportUnifilarPdf,
  onExportBomExcel,
  onOpenWiringList,
  onQuickSave,
  isRecentlySaved = false,
  projectName = 'Quadro Elétrico DIN',
  projectCode = 'PROJ-001',
  validationErrorCount,
  onShowNotification,
  onToggleImmersiveMode,
  onOpenStandaloneGuide,
  autoBackup,
}) => {
  const [activeMenu, setActiveMenu] = useState<'none' | 'project' | 'tools' | 'export' | 'layout'>('none');
  const navContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navContainerRef.current && !navContainerRef.current.contains(event.target as Node)) {
        setActiveMenu('none');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu: 'project' | 'tools' | 'export' | 'layout') => {
    setActiveMenu((prev) => (prev === menu ? 'none' : menu));
  };

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-950 border-b border-slate-800 text-slate-100 select-none no-print">
      {/* Zone 1: Brand Wordmark & Active Project Identification */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="/" className="text-base font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-xs font-mono font-bold text-white shadow-md shadow-blue-500/20">
            ⚡
          </span>
          <span className="hidden sm:inline font-bold">ElectroCad DIN</span>
        </a>

        {/* Project Tag & Title Badge (Opens Save & Projects Modal) */}
        <button
          type="button"
          onClick={onOpenSaveModal}
          className="hidden xl:flex items-center gap-2 px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition group cursor-pointer"
          title="Clique para gerir, renomear ou abrir projetos"
        >
          <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
            {projectCode}
          </span>
          <span className="text-xs font-semibold text-slate-300 group-hover:text-white max-w-[150px] truncate">
            {projectName}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
        </button>
      </div>

      {/* Zone 2: Main Workspace Tabs */}
      <nav ref={navContainerRef} className="flex items-center gap-1 sm:gap-2 md:gap-3 text-xs font-semibold overflow-x-auto">
        {/* GRUPO DE FERRAMENTAS: DISPOSIÇÃO & PORTA HMI (Com Menu Dropdown) */}
        <div className="relative flex items-center shrink-0">
          <div className={`flex items-center rounded-lg border transition p-0.5 ${
            activeTab === 'layout' || activeTab === 'control_panel'
              ? 'bg-slate-900 border-purple-500/70 shadow-sm shadow-purple-950/40 ring-1 ring-purple-500/20'
              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
          }`}>
            {/* Botão 1: Disposição Interior */}
            <button
              type="button"
              onClick={() => {
                onChangeTab('layout');
                setActiveMenu('none');
              }}
              className={`flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-md text-xs transition ${
                activeTab === 'layout'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Disposição interior: Placa de montagem, calhas DIN 35mm e componentes"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Disposição</span>
            </button>

            {/* Separador vertical subtil */}
            <span className="w-px h-3.5 bg-slate-750 mx-0.5"></span>

            {/* Botão 2: Porta Frontal & HMI */}
            <button
              type="button"
              onClick={() => {
                onChangeTab('control_panel');
                setActiveMenu('none');
              }}
              className={`flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-md text-xs transition ${
                activeTab === 'control_panel'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Porta & Painel Frontal: Ecrã tátil HMI, botões 22mm e mapa de furação"
            >
              <Layout className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Porta & HMI</span>
            </button>

            {/* Botão Dropdown ▾ */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMenu('layout');
              }}
              className={`p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition ml-0.5 ${
                activeMenu === 'layout' ? 'bg-slate-800 text-white' : ''
              }`}
              title="Menu dropdown: Alternar vistas do quadro e furação"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${activeMenu === 'layout' ? 'rotate-180 text-purple-400' : ''}`} />
            </button>
          </div>

          {/* Dropdown Menu com opções e atalhos de layout */}
          {activeMenu === 'layout' && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                Vistas do Quadro Elétrico
              </div>

              <button
                type="button"
                onClick={() => {
                  onChangeTab('layout');
                  setActiveMenu('none');
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left transition ${
                  activeTab === 'layout' ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Layout Interior (Calhas DIN)</div>
                  <div className="text-[10px] text-slate-400">Placa de montagem, canaletas e aparelhos elétricos</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeTab('control_panel');
                  setActiveMenu('none');
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left transition mt-1 ${
                  activeTab === 'control_panel' ? 'bg-purple-600/20 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Layout className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Painel da Porta Frontal & HMI</div>
                  <div className="text-[10px] text-slate-400">Desenho da porta, botões 22mm e tabela CNC</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => onChangeTab('simulation')}
          className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-md transition ${
            activeTab === 'simulation'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Simulação</span>
        </button>

        <button
          onClick={() => onChangeTab('schematic')}
          className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-md transition ${
            activeTab === 'schematic'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Esquemas</span>
        </button>

        <button
          onClick={() => onChangeTab('bom')}
          className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-md transition ${
            activeTab === 'bom'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span>BOM / Materiais</span>
        </button>

        <button
          onClick={() => onChangeTab('dashboard')}
          className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-md transition ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => onChangeTab('checks')}
          className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-md transition ${
            activeTab === 'checks'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Validação</span>
          {validationErrorCount > 0 && (
            <span className="text-[10px] bg-red-600 text-white rounded-full px-1.5 py-0.2 font-mono font-bold">
              {validationErrorCount}
            </span>
          )}
        </button>
      </nav>

      {/* Zone 3: Unified, Non-Duplicated Action Menus & Save */}
      <div className="flex items-center gap-2 shrink-0" ref={navContainerRef}>
        
        {/* 1. MENU PROJETO */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('project')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition border ${
              activeMenu === 'project'
                ? 'bg-slate-800 text-white border-blue-500'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-200 border-slate-800'
            }`}
            title="Menu do Projeto (Novo quadro, modelos, gravar ficheiros)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="hidden md:inline">Projeto</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeMenu === 'project' ? 'rotate-180' : ''}`} />
          </button>

          {activeMenu === 'project' && (
            <div className="absolute right-0 mt-1.5 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans">
              {onOpenNewProject && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenNewProject();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Novo Quadro Vazio</div>
                    <div className="text-[10px] text-slate-400">Iniciar um novo projeto em branco</div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveMenu('none');
                  onOpenTemplates();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
              >
                <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Modelos Prontos</div>
                  <div className="text-[10px] text-slate-400">Automação, bombas, potência e AVAC</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMenu('none');
                  onOpenSaveModal();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
              >
                <HardDrive className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Os Meus Projetos</div>
                  <div className="text-[10px] text-slate-400">Projetos gravados, exportar e importar .JSON</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMenu('none');
                  onOpenSaveModal();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-emerald-200 hover:text-white hover:bg-slate-800 transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>Backup Automático (.json)</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      5 MIN
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">Dispara e descarrega após 5 min de inatividade</div>
                </div>
              </button>

              {onOpenStandaloneGuide && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenStandaloneGuide();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-emerald-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Gerar Executável Windows (.EXE)</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        .EXE
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">Solução do ficheiro .bat e compilação para .exe nativo</div>
                  </div>
                </button>
              )}

              <div className="border-t border-slate-800 my-1"></div>

              <button
                type="button"
                onClick={() => {
                  setActiveMenu('none');
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
              >
                <Settings className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Configurações Gerais</div>
                  <div className="text-[10px] text-slate-400">Dimensões do quadro, tensão e rede</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 2. MENU FERRAMENTAS & NORMAS */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('tools')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition border ${
              activeMenu === 'tools'
                ? 'bg-slate-800 text-white border-amber-500'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-200 border-slate-800'
            }`}
            title="Ferramentas Técnicas: Cálculo de cabos, conformidade IP/IK, catálogo Excel e normas"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden md:inline">Ferramentas</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeMenu === 'tools' ? 'rotate-180' : ''}`} />
          </button>

          {activeMenu === 'tools' && (
            <div className="absolute right-0 mt-1.5 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans">
              <button
                type="button"
                onClick={() => {
                  setActiveMenu('none');
                  onChangeTab('dashboard');
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-sky-200 hover:text-white hover:bg-slate-800 transition border-b border-slate-800"
              >
                <BarChart3 className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="font-semibold text-sky-300">Dashboard de Análise (Métricas)</div>
                  <div className="text-[10px] text-slate-400">Gráficos de barras, pizza, disjuntores, bornes e PLCs</div>
                </div>
              </button>
              {onOpenWireCalc && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenWireCalc();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-amber-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-300">Cálculo de Fiação (EN 60204-1)</div>
                    <div className="text-[10px] text-slate-400">Bitolas ideais (mm²), correntes Iz e queda ΔU%</div>
                  </div>
                </button>
              )}

              {onOpenIecAssistant && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenIecAssistant();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left bg-gradient-to-r from-amber-950/40 to-orange-950/20 text-amber-200 hover:text-white hover:bg-amber-900/40 transition border-t border-b border-slate-800"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <span>Assistente IEC 60898 (Curvas & In)</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-900 text-amber-200 border border-amber-700 font-bold">
                        B, C, D
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">Dimensionamento automático por carga de consumo</div>
                  </div>
                </button>
              )}

              {onOpenIpIkVerification && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenIpIkVerification();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-sky-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-sky-300">Verificador IP & IK (EN 60529 / 62262)</div>
                    <div className="text-[10px] text-slate-400">Conformidade com o ambiente de instalação</div>
                  </div>
                </button>
              )}

              {onOpenLibraryManager && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenLibraryManager();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Biblioteca & Excel (.xlsx)</div>
                    <div className="text-[10px] text-slate-400">Criar componentes, importar e exportar catálogo</div>
                  </div>
                </button>
              )}

              {onOpenIdMap && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenIdMap();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Mapa de Identificação</div>
                    <div className="text-[10px] text-slate-400">Placa técnica de circuito para a porta do quadro</div>
                  </div>
                </button>
              )}

              {onOpenComplianceDocs && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenComplianceDocs();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-indigo-200 hover:text-white hover:bg-slate-800 transition border-t border-slate-800 mt-1 pt-1.5"
                >
                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-indigo-300">Manual & Normas Técnicas</div>
                    <div className="text-[10px] text-slate-400">Documentação RTIEBT, EN 61439 e EN 60204</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. MENU EXPORTAR & IMPRIMIR */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('export')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition border ${
              activeMenu === 'export'
                ? 'bg-slate-800 text-white border-purple-500'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-200 border-slate-800'
            }`}
            title="Exportar dossiê técnico PDF, etiquetas de componentes ou ficheiros CAD"
          >
            <Download className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="hidden md:inline">Exportar</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeMenu === 'export' ? 'rotate-180' : ''}`} />
          </button>

          {activeMenu === 'export' && (
            <div className="absolute right-0 mt-1.5 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans">
              {onOpenSchematicPdf && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenSchematicPdf();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left bg-gradient-to-r from-blue-900/30 to-indigo-900/20 text-blue-200 hover:text-white hover:bg-blue-800/30 transition border-b border-slate-800"
                >
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Dossier Técnico Completo (PDF)</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                        8 FOLHAS
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">Layout 2D, esquemas, fiação lógica, BOM e ensaios</div>
                  </div>
                </button>
              )}

              {onExportUnifilarPdf && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onExportUnifilarPdf();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-emerald-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <span>Diagrama Unifilar IEC (PDF)</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        IEC 60617
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">Potência, derivações, bornes e tabela de circuitos</div>
                  </div>
                </button>
              )}

              {onExportBomExcel && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onExportBomExcel();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-emerald-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-300">Lista de Materiais BOM (Excel / CSV)</div>
                    <div className="text-[10px] text-slate-400">Planilha formatada para orçamentação e compra</div>
                  </div>
                </button>
              )}

              {onOpenWiringList && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenWiringList();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-purple-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <Table className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-purple-300 flex items-center gap-1.5">
                      <span>Lista de Cablagem De-Para (CSV)</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                        EN 60204
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">From-To, secções nominais, cores e metragem total</div>
                  </div>
                </button>
              )}

              {onOpenPrintModal && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenPrintModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <Printer className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Relatório de Obra / Imprimir (A4)</div>
                    <div className="text-[10px] text-slate-400">Configurar cabeçalhos, notas e imprimir direto</div>
                  </div>
                </button>
              )}

              {onOpenDrillingTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenDrillingTemplate();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-amber-200 hover:text-white hover:bg-slate-800 transition bg-amber-950/20"
                >
                  <Ruler className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-300">Gabarito de Furação (Cotas das Margens)</div>
                    <div className="text-[10px] text-slate-400">Desenho técnico com medidas para as 4 margens (A4 / A3 / SVG)</div>
                  </div>
                </button>
              )}

              {onOpenLabelPrint && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenLabelPrint();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <Tag className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Etiquetas DIN & Térmicas (PDF)</div>
                    <div className="text-[10px] text-slate-400">Réguas sob disjuntores e impressoras térmicas</div>
                  </div>
                </button>
              )}

              {onOpenCadExport && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu('none');
                    onOpenCadExport();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-slate-200 hover:text-white hover:bg-slate-800 transition border-t border-slate-800 mt-1 pt-1.5"
                >
                  <Download className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-white">Exportar CAD / SVG</div>
                    <div className="text-[10px] text-slate-400">QElectroTech (.qet), draw.io, DXF ou SVG</div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveMenu('none');
                  if (autoBackup) {
                    const filename = autoBackup.triggerManualBackup();
                    if (onShowNotification) {
                      onShowNotification(`💾 Backup exportado para a pasta de transferências: ${filename}`);
                    }
                  } else {
                    onOpenSaveModal();
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left text-emerald-200 hover:text-white hover:bg-slate-800 transition border-t border-slate-800 mt-1 pt-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>Exportar Backup JSON</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Auto 5m
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">Salvar cópia completa na pasta de downloads</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 4. THE ONLY SAVE BUTTON IN THE HEADER */}
        <button
          type="button"
          onClick={onQuickSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
            isRecentlySaved
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-98'
          }`}
          title="Gravar projeto imediatamente no navegador (Atalho: Ctrl+S)"
        >
          {isRecentlySaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-white animate-bounce shrink-0" />
              <span>Gravado! ✓</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Gravar</span>
              <span className="hidden lg:inline-block text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-700/80 text-emerald-100 ml-0.5">
                Ctrl+S
              </span>
            </>
          )}
        </button>

        {/* Utilities Separator & Settings */}
        <div className="h-4 w-px bg-slate-800 mx-0.5"></div>

        {onToggleImmersiveMode && (
          <button
            type="button"
            onClick={onToggleImmersiveMode}
            className="p-1.5 text-sky-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
            title="Modo de Edição Imersiva (Atalho: Shift+F ou Alt+Z)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
          title="Configurações do Armário e Dimensões"
        >
          <Settings className="w-4 h-4" />
        </button>

        <PWAInstallButton onShowNotification={onShowNotification} />
      </div>
    </header>
  );
};
