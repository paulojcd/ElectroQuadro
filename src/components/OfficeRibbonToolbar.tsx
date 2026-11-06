import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Layers, Wrench, FolderOpen, Magnet, Grid, Sparkles, 
  Box, Wind, FileText, Zap, RotateCcw, Activity, Tag, 
  Sliders, Table, Download, FileSpreadsheet, Printer, 
  FileCode, Shield, ZoomIn, ZoomOut, Maximize2, ChevronUp, ChevronDown, Check, Save, Cpu, Layout, DoorClosed,
  Settings, BarChart3, ShieldAlert, ShieldCheck, HardDrive, PlusCircle, BookOpen, Scissors, CheckCircle
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { AutoBackupState } from '../hooks/useAutoBackupOnIdle';

export type WorkspaceTab = 
  | 'layout' 
  | 'control_panel' 
  | 'wiring' 
  | 'schematic' 
  | 'simulation' 
  | 'bom' 
  | 'export' 
  | 'standards' 
  | 'dashboard' 
  | 'checks';

export interface OfficeRibbonToolbarProps {
  // Active Workspace Tab & Switcher
  activeTab: WorkspaceTab;
  onChangeTab: (tab: WorkspaceTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;

  // Project Info & Top Bar
  projectName?: string;
  projectCode?: string;
  onOpenSaveModal: () => void;
  onOpenNewProject?: () => void;
  onOpenTemplates: () => void;
  onOpenSettings: () => void;
  onQuickSave: () => void;
  isRecentlySaved?: boolean;
  lastSavedTime?: string | null;
  autoBackup?: AutoBackupState;
  onToggleImmersiveMode?: () => void;
  onOpenStandaloneGuide?: () => void;
  onShowNotification?: (msg: string) => void;

  // Dimensions & Rails summary
  cabWidth: number;
  cabHeight: number;
  railsCount: number;
  onOpenEnclosureSize: () => void;

  // Layout Tab actions & states
  onOpenCatalog: () => void;
  onAddRail: () => void;
  canAddRail: boolean;
  onOpenGlands: () => void;
  glandsCount: number;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  onAlignAllRails: () => void;
  onOpenAutoLayout: () => void;
  thermalIssuesCount: number;
  showThermalZones: boolean;
  onToggleThermalZones: () => void;
  onOpenProjectNotes: () => void;
  hasProjectNotes: boolean;

  // Door & HMI actions & states
  showHmiDoorOverlay: boolean;
  onToggleHmiDoorOverlay: () => void;
  onOpenControlPanel: () => void;

  // Wiring Tab actions & states
  showWiring: boolean;
  onToggleWiring: () => void;
  isWiringMode: boolean;
  onToggleWiringMode: () => void;
  showWireTags: boolean;
  onToggleWireTags: () => void;
  wireRouteStyle: 'ducts' | 'direct';
  onToggleWireRouteStyle: () => void;
  onOpenWiringList: () => void;
  onResetWiresToDefault: () => void;
  onQuickExportWiringCsv: () => void;

  // Export Tab actions
  onExportSvg: () => void;
  onOpenSchematicPdf?: () => void;
  onExportUnifilarPdf?: () => void;
  onExportBomExcel?: () => void;
  onOpenPrintModal?: () => void;
  onOpenLabelPrint?: () => void;
  onOpenCadExport?: () => void;

  // Standards / Tools actions
  onOpenIecAssistant?: () => void;
  onOpenWireCalc?: () => void;
  onOpenIpIkVerification?: () => void;
  onOpenLibraryManager?: () => void;
  onOpenIdMap?: () => void;
  onOpenComplianceDocs?: () => void;

  // Validation
  validationErrorCount: number;

  // View & Zoom controls
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFitToScreen?: () => void;
}

export const OfficeRibbonToolbar: React.FC<OfficeRibbonToolbarProps> = ({
  activeTab,
  onChangeTab,
  isCollapsed,
  onToggleCollapse,

  projectName = 'Quadro Elétrico DIN',
  projectCode = 'PROJ-001',
  onOpenSaveModal,
  onOpenNewProject,
  onOpenTemplates,
  onOpenSettings,
  onQuickSave,
  isRecentlySaved = false,
  autoBackup,
  onToggleImmersiveMode,
  onOpenStandaloneGuide,
  onShowNotification,

  cabWidth,
  cabHeight,
  railsCount,
  onOpenEnclosureSize,

  onOpenCatalog,
  onAddRail,
  canAddRail,
  onOpenGlands,
  glandsCount,
  snapToGrid,
  onToggleSnap,
  onAlignAllRails,
  onOpenAutoLayout,
  thermalIssuesCount,
  showThermalZones,
  onToggleThermalZones,
  onOpenProjectNotes,
  hasProjectNotes,

  showHmiDoorOverlay,
  onToggleHmiDoorOverlay,
  onOpenControlPanel,

  showWiring,
  onToggleWiring,
  isWiringMode,
  onToggleWiringMode,
  showWireTags,
  onToggleWireTags,
  wireRouteStyle,
  onToggleWireRouteStyle,
  onOpenWiringList,
  onResetWiresToDefault,
  onQuickExportWiringCsv,

  onExportSvg,
  onOpenSchematicPdf,
  onExportUnifilarPdf,
  onExportBomExcel,
  onOpenPrintModal,
  onOpenLabelPrint,
  onOpenCadExport,

  onOpenIecAssistant,
  onOpenWireCalc,
  onOpenIpIkVerification,
  onOpenLibraryManager,
  onOpenIdMap,
  onOpenComplianceDocs,

  validationErrorCount,

  zoom = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
}) => {
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProjectMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setIsProjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProjectMenuOpen]);

  return (
    <header className="bg-slate-950 border-b border-slate-800 shadow-md select-none shrink-0 no-print z-40">
      
      {/* ========================================================
          1. SLIM TITLE BAR (32px de altura: Marca, Projeto, Ações Rápidas)
         ======================================================== */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-slate-850 bg-slate-950 text-slate-200">
        
        {/* Left: Brand + Quick Project Selector */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
              ⚡
            </span>
            <span className="text-xs font-extrabold tracking-tight text-white hidden sm:inline">
              ElectroCad DIN
            </span>
          </div>

          <div className="h-3.5 w-px bg-slate-800"></div>

          {/* Project Tag & Title (Opens Save Modal) */}
          <div ref={projectMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProjectMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-left transition group cursor-pointer"
              title="Gerir projetos, abrir modelos ou novo quadro"
            >
              <span className="font-mono text-[10px] font-bold px-1 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                {projectCode}
              </span>
              <span className="text-[11px] font-medium text-slate-300 group-hover:text-white max-w-[130px] sm:max-w-[180px] truncate">
                {projectName}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isProjectMenuOpen ? 'rotate-180 text-blue-400' : ''}`} />
            </button>

            {/* Project Quick Dropdown (Portaled style, z-50) */}
            {isProjectMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-750 rounded-lg shadow-2xl py-1.5 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
                {onOpenNewProject && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectMenuOpen(false);
                      onOpenNewProject();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Novo Quadro Vazio</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    onOpenTemplates();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Modelos de Automação & AVAC</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    onOpenSaveModal();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <HardDrive className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Gerir Projetos (.json)</span>
                </button>

                <div className="border-t border-slate-800 my-1"></div>

                <button
                  type="button"
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
                >
                  <Settings className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Configurações do Armário</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Save Button */}
          <button
            type="button"
            onClick={onQuickSave}
            className={`h-6 flex items-center gap-1 px-2 rounded text-[11px] font-semibold transition ${
              isRecentlySaved
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-98'
            }`}
            title="Gravar projeto imediatamente no navegador (Atalho: Ctrl+S)"
          >
            {isRecentlySaved ? (
              <>
                <Check className="w-3 h-3 text-white" />
                <span>Gravado!</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 text-white" />
                <span>Gravar</span>
                <span className="hidden md:inline text-[9px] font-mono opacity-80">Ctrl+S</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Dimension Badge, Backup, EXE, Settings & PWA */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Dimension badge */}
          <button
            type="button"
            onClick={onOpenEnclosureSize}
            className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-850 text-sky-400 border border-slate-800 text-[10.5px] font-mono transition"
            title="Dimensões do Armário (Clique para editar)"
          >
            <Box className="w-3 h-3" />
            <span>{cabWidth}×{cabHeight}mm</span>
            <span className="text-[9px] text-slate-400">({railsCount} Calhas)</span>
          </button>

          {/* Auto Backup Badge */}
          {autoBackup && (
            <button
              type="button"
              onClick={() => {
                const filename = autoBackup.triggerManualBackup();
                if (onShowNotification) {
                  onShowNotification(`💾 Backup exportado: ${filename}`);
                }
              }}
              className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-[10px] font-mono transition"
              title="Backup automático ativo (dispara após inatividade)"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Auto 5m</span>
            </button>
          )}

          {/* Standalone Windows .EXE Guide */}
          {onOpenStandaloneGuide && (
            <button
              type="button"
              onClick={onOpenStandaloneGuide}
              className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-[10px] font-mono transition"
              title="Guia para gerar executável Windows (.exe) e arrancar offline"
            >
              <Cpu className="w-3 h-3 text-emerald-400" />
              <span>.EXE</span>
            </button>
          )}

          {/* Immersive Mode (Shift+F) */}
          {onToggleImmersiveMode && (
            <button
              type="button"
              onClick={onToggleImmersiveMode}
              className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-850 rounded transition"
              title="Modo Imersivo Ecrã Total (Shift+F / Alt+Z)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-850 rounded transition"
            title="Configurações Técnicas do Quadro"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton onShowNotification={onShowNotification} />
        </div>
      </div>

      {/* ========================================================
          2. RIBBON TABS STRIP (28px de altura: Separadores Organizados Estilo Office)
         ======================================================== */}
      <div className="flex items-center justify-between px-2 pt-1 border-b border-slate-850 bg-slate-950">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {/* Tab 1: Layout / Disposição */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('layout');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-t-md transition border-t border-x ${
              activeTab === 'layout'
                ? 'bg-slate-900 text-sky-400 border-slate-750 shadow-xs border-b-2 border-b-sky-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Disposição (Layout)</span>
          </button>

          {/* Tab 2: Porta & HMI (Painel Frontal) */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('control_panel');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-t-md transition border-t border-x ${
              activeTab === 'control_panel'
                ? 'bg-slate-900 text-purple-400 border-slate-750 shadow-xs border-b-2 border-b-purple-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <Layout className="w-3.5 h-3.5 text-purple-400" />
            <span>Porta & HMI</span>
            {showHmiDoorOverlay && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" title="Sobreposição gráfica ativa no interior" />
            )}
          </button>

          {/* Tab 3: Fios & Cablagem */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('wiring');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-t-md transition border-t border-x ${
              activeTab === 'wiring'
                ? 'bg-slate-900 text-amber-400 border-slate-750 shadow-xs border-b-2 border-b-amber-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Fios & Cablagem</span>
            {isWiringMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          {/* Tab 4: Esquemas */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('schematic');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-t-md transition border-t border-x ${
              activeTab === 'schematic'
                ? 'bg-slate-900 text-blue-400 border-slate-750 shadow-xs border-b-2 border-b-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>Esquemas</span>
          </button>

          {/* Tab 5: Simulação */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('simulation');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-t-md transition border-t border-x ${
              activeTab === 'simulation'
                ? 'bg-slate-900 text-emerald-400 border-slate-750 shadow-xs border-b-2 border-b-emerald-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulação</span>
          </button>

          {/* Tab 6: BOM / Materiais */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('bom');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-t-md transition border-t border-x ${
              activeTab === 'bom'
                ? 'bg-slate-900 text-sky-400 border-slate-750 shadow-xs border-b-2 border-b-sky-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
            <span>BOM / Materiais</span>
          </button>

          {/* Tab 7: Exportação & Relatórios */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('export');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-t-md transition border-t border-x ${
              activeTab === 'export'
                ? 'bg-slate-900 text-emerald-400 border-slate-750 shadow-xs border-b-2 border-b-emerald-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportação & Relatórios</span>
          </button>

          {/* Tab 8: Normas & Assistência */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('standards');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-t-md transition border-t border-x ${
              activeTab === 'standards'
                ? 'bg-slate-900 text-amber-400 border-slate-750 shadow-xs border-b-2 border-b-amber-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>Normas & Dimensionamento</span>
          </button>

          {/* Tab 9: Dashboard */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('dashboard');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-t-md transition border-t border-x ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-sky-400 border-slate-750 shadow-xs border-b-2 border-b-sky-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
            <span>Dashboard</span>
          </button>

          {/* Tab 10: Validação */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('checks');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-t-md transition border-t border-x ${
              activeTab === 'checks'
                ? 'bg-slate-900 text-red-400 border-slate-750 shadow-xs border-b-2 border-b-red-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Validação</span>
            {validationErrorCount > 0 && (
              <span className="text-[9px] bg-red-600 text-white rounded-full px-1 py-0.2 font-mono font-bold leading-none">
                {validationErrorCount}
              </span>
            )}
          </button>
        </div>

        {/* Right side: Compact Zoom & Collapse Toggle */}
        <div className="flex items-center gap-1.5 pb-0.5 shrink-0">
          {/* Zoom Controls */}
          {onZoomIn && onZoomOut && (
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 text-[10.5px] font-mono">
              <button
                type="button"
                onClick={onZoomOut}
                className="p-0.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                title="Diminuir Zoom (-)"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={onResetZoom}
                className="font-bold text-sky-400 px-1 hover:text-white"
                title="Repor Zoom 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={onZoomIn}
                className="p-0.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                title="Aumentar Zoom (+)"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              {onFitToScreen && (
                <button
                  type="button"
                  onClick={onFitToScreen}
                  className="p-0.5 ml-0.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded border-l border-slate-800"
                  title="Ajustar ao Ecrã (F)"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}

          {/* Ribbon Collapse Toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
            title={isCollapsed ? 'Expandir Faixa de Opções (Ribbon)' : 'Recolher Faixa de Opções (Ribbon)'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ========================================================
          3. COMPACT RIBBON TOOL STRIP (Ultra-Otimizado em Espaço: h-7.5 buttons, icons 14px, sem dropdowns presos)
         ======================================================== */}
      {!isCollapsed && (
        <div className="px-2.5 py-1.5 bg-slate-900 flex items-center gap-2 overflow-x-auto scrollbar-thin animate-in slide-in-from-top-1 duration-100">
          
          {/* ========================================================
              TAB 1: DISPOSIÇÃO / LAYOUT INTERIOR
             ======================================================== */}
          {activeTab === 'layout' && (
            <>
              {/* Grupo: Componentes & Calhas */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onOpenCatalog}
                    className="h-7 flex items-center gap-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold shadow-xs transition active:scale-98"
                    title="Inserir componente a partir do catálogo técnico"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Inserir</span>
                  </button>

                  <button
                    type="button"
                    onClick={onAddRail}
                    disabled={!canAddRail}
                    className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 hover:text-white rounded text-[11px] font-medium transition disabled:opacity-40"
                    title="Adicionar nova Calha DIN 35mm"
                  >
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>Nova Calha ({railsCount}/8)</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenGlands}
                    className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-amber-300 hover:text-white rounded text-[11px] font-medium transition"
                    title="Furação e bucins de entrada/saída de cabos"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bucins ({glandsCount})</span>
                  </button>
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Componentes & Calhas
                </span>
              </div>

              {/* Grupo: Porta Frontal & HMI (Acesso Direto sem Dropdown Preso) */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onOpenControlPanel}
                    className="h-7 flex items-center gap-1.5 px-2.5 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/50 text-purple-200 hover:text-white rounded text-[11px] font-bold transition shadow-xs group"
                    title="Abrir editor da porta frontal: Ecrãs HMI, botões 22mm e tabela de furação CNC"
                  >
                    <Layout className="w-3.5 h-3.5 text-purple-400 group-hover:scale-105 transition-transform" />
                    <span>Editor da Porta</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleHmiDoorOverlay}
                    className={`h-7 flex items-center gap-1.5 px-2 rounded text-[11px] transition ${
                      showHmiDoorOverlay
                        ? 'bg-purple-600 text-white shadow-xs font-bold ring-1 ring-purple-300'
                        : 'bg-slate-850 hover:bg-slate-800 border border-purple-600/40 text-purple-300 hover:text-white font-medium'
                    }`}
                    title="Alternar sobreposição gráfica da porta e cotas de furação da HMI no interior"
                  >
                    <DoorClosed className={`w-3.5 h-3.5 ${showHmiDoorOverlay ? 'text-white' : 'text-purple-400'}`} />
                    <span>{showHmiDoorOverlay ? 'Furação HMI: LIGADA' : 'Furação HMI'}</span>
                  </button>
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-purple-400 block text-center mt-0.5">
                  Porta & HMI
                </span>
              </div>

              {/* Grupo: Alinhamento & Otimização */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onToggleSnap}
                    className={`h-7 flex items-center gap-1.5 px-2 rounded text-[11px] font-semibold transition border ${
                      snapToGrid
                        ? 'bg-sky-600 text-white border-sky-400 shadow-xs'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                    }`}
                    title="Alinhamento magnético com passo de 5mm"
                  >
                    <Magnet className={`w-3.5 h-3.5 ${snapToGrid ? 'text-amber-300' : 'text-slate-400'}`} />
                    <span>Snap 5mm</span>
                  </button>

                  <button
                    type="button"
                    onClick={onAlignAllRails}
                    className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-[11px] font-medium transition border border-slate-750"
                    title="Alinhar magneticamente todos os componentes a 5mm"
                  >
                    <Grid className="w-3.5 h-3.5 text-sky-400" />
                    <span>Alinhar Tudo</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenAutoLayout}
                    className="h-7 flex items-center gap-1.5 px-2.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded text-[11px] font-bold transition shadow-xs"
                    title="Auto-Layout: Reorganizar componentes com otimização térmica EN 61439"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Auto-Layout</span>
                    {thermalIssuesCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </button>
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Alinhamento & Snap
                </span>
              </div>

              {/* Grupo: Armário & Canaletas */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onOpenEnclosureSize}
                    className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-750 rounded text-[11px] font-mono transition"
                    title="Ajustar dimensões do armário e canaletas"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>{cabWidth}×{cabHeight}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleThermalZones}
                    className={`h-7 flex items-center gap-1.5 px-2 rounded text-[11px] font-semibold transition border ${
                      showThermalZones
                        ? 'bg-amber-600 text-white border-amber-400 shadow-xs'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                    }`}
                    title="Exibir zonas térmicas recomendadas (EN 61439)"
                  >
                    <Wind className={`w-3.5 h-3.5 ${showThermalZones ? 'text-white' : 'text-amber-400'}`} />
                    <span>Zonas Térmicas</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenProjectNotes}
                    className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-emerald-400 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                    title="Caderno de encargos e notas do projeto"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Notas</span>
                    {hasProjectNotes && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Armário & Zonas
                </span>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 2: PORTA & HMI (PAINEL FRONTAL)
             ======================================================== */}
          {activeTab === 'control_panel' && (
            <>
              {/* Grupo: Navegação da Porta */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onChangeTab('layout')}
                    className="h-7 flex items-center gap-1.5 px-2.5 bg-slate-850 hover:bg-slate-800 text-sky-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                    title="Voltar ao layout interior das calhas DIN"
                  >
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>← Ver Interior (Calhas)</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleHmiDoorOverlay}
                    className={`h-7 flex items-center gap-1.5 px-2.5 rounded text-[11px] transition ${
                      showHmiDoorOverlay
                        ? 'bg-purple-600 text-white shadow-xs font-bold ring-1 ring-purple-300'
                        : 'bg-purple-950/60 hover:bg-purple-900 border border-purple-600/40 text-purple-300 hover:text-white font-medium'
                    }`}
                    title="Ativar sobreposição gráfica e verificação de colisão da porta sobre as calhas interiores"
                  >
                    <DoorClosed className={`w-3.5 h-3.5 ${showHmiDoorOverlay ? 'text-white' : 'text-purple-400'}`} />
                    <span>{showHmiDoorOverlay ? 'Sobreposição Interior: LIGADA' : 'Ver Sobreposição no Interior'}</span>
                  </button>
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Vistas do Quadro
                </span>
              </div>

              {/* Grupo: Informações & Furação CNC */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  {onOpenSchematicPdf && (
                    <button
                      type="button"
                      onClick={onOpenSchematicPdf}
                      className="h-7 flex items-center gap-1.5 px-2.5 bg-blue-600/30 hover:bg-blue-600 border border-blue-500/50 text-blue-200 hover:text-white rounded text-[11px] font-bold transition shadow-xs"
                      title="Gerar Dossiê Técnico Completo com página dedicada da Porta e Furação HMI"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Exportar Dossier PDF (Porta)</span>
                    </button>
                  )}

                  {onOpenCadExport && (
                    <button
                      type="button"
                      onClick={onOpenCadExport}
                      className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                      title="Exportar furações CNC para ficheiro DXF / CAD"
                    >
                      <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Furação DXF / CAD</span>
                    </button>
                  )}
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-purple-400 block text-center mt-0.5">
                  Documentação & CNC
                </span>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 3: FIOS & CABLAGEM
             ======================================================== */}
          {activeTab === 'wiring' && (
            <>
              {/* Grupo: Modo de Ligação */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleWiringMode();
                    }}
                    className={`h-7 flex items-center gap-1.5 px-2.5 rounded text-[11px] font-bold transition shadow-xs ${
                      isWiringMode
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-[0_0_8px_#f59e0b]'
                        : 'bg-amber-950/60 hover:bg-amber-900 border border-amber-600/40 text-amber-300'
                    }`}
                    title="Ligar condutores: clique num borne e arraste até ao destino"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isWiringMode ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
                    <span>{isWiringMode ? '⚡ Modo Ligação ATIVO' : 'Ligar Condutores'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onResetWiresToDefault}
                    className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                    title="Repor cablagem padrão das regras de esquema"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Repor Padrão</span>
                  </button>
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Ferramentas de Ligação
                </span>
              </div>

              {/* Grupo: Visualização & Traçado */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onToggleWiring}
                    className={`h-7 flex items-center gap-1.5 px-2 rounded text-[11px] font-semibold transition border ${
                      showWiring
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                    }`}
                    title="Ligar ou desligar visualização dos condutores"
                  >
                    <Activity className={`w-3.5 h-3.5 ${showWiring ? 'text-white' : 'text-emerald-400'}`} />
                    <span>{showWiring ? 'Fios: LIGADOS' : 'Fios: OCULTOS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleWireTags}
                    disabled={!showWiring}
                    className={`h-7 flex items-center gap-1.5 px-2 rounded text-[11px] font-semibold transition border ${
                      showWireTags
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                    } disabled:opacity-40`}
                    title="Mostrar anilhas e identificadores de condutores"
                  >
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Anilhas</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleWireRouteStyle}
                    disabled={!showWiring}
                    className={`h-7 flex items-center gap-1.5 px-2.5 rounded text-[11px] font-semibold transition border ${
                      wireRouteStyle === 'ducts'
                        ? 'bg-purple-900/60 text-purple-300 border-purple-500/60 shadow-xs'
                        : 'bg-slate-850 text-slate-300 border-slate-750'
                    } disabled:opacity-40`}
                    title="Alternar estilo: Manhattan Ortogonal (Canaletas com Curvas) ou Curvas Diretas"
                  >
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    <span>{wireRouteStyle === 'ducts' ? 'Manhattan' : 'Direto'}</span>
                  </button>
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Visualização & Roteamento
                </span>
              </div>

              {/* Grupo: Engenharia & Listas */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onOpenWiringList}
                    className="h-7 flex items-center gap-1.5 px-2.5 bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-white rounded text-[11px] font-bold transition shadow-xs border border-purple-500/50"
                    title="Abrir Lista de Cablagem Detalhada (De-Para), cores EN 60204-1 e comprimentos"
                  >
                    <Table className="w-3.5 h-3.5 text-purple-300" />
                    <span>Lista Cabos (De-Para)</span>
                  </button>

                  <button
                    type="button"
                    onClick={onQuickExportWiringCsv}
                    className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-emerald-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                    title="Descarregar ficheiro CSV para Excel imediatamente"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Exportar CSV</span>
                  </button>
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Engenharia EN 60204-1
                </span>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 4: ESQUEMAS
             ======================================================== */}
          {activeTab === 'schematic' && (
            <>
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  {onExportUnifilarPdf && (
                    <button
                      type="button"
                      onClick={onExportUnifilarPdf}
                      className="h-7 flex items-center gap-1.5 px-2.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 hover:text-white rounded text-[11px] font-bold transition shadow-xs"
                      title="Gerar Diagrama Elétrico Unifilar Completo (Norma IEC 60617)"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Descarregar Unifilar IEC (PDF)</span>
                    </button>
                  )}

                  {onOpenSchematicPdf && (
                    <button
                      type="button"
                      onClick={onOpenSchematicPdf}
                      className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-blue-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                      title="Dossiê Técnico com esquemas elétricos"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Dossiê Completo (PDF)</span>
                    </button>
                  )}
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Diagramas & Exportação
                </span>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 5: SIMULAÇÃO
             ======================================================== */}
          {activeTab === 'simulation' && (
            <>
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <div className="h-7 flex items-center gap-1.5 px-2.5 bg-emerald-950/50 border border-emerald-600/30 text-emerald-300 rounded text-[11px] font-medium">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Simulação em Tempo Real Ativa</span>
                  </div>
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Estado do Circuito
                </span>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 6: BOM / MATERIAIS
             ======================================================== */}
          {activeTab === 'bom' && (
            <>
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  {onExportBomExcel && (
                    <button
                      type="button"
                      onClick={onExportBomExcel}
                      className="h-7 flex items-center gap-1.5 px-2.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 hover:text-white rounded text-[11px] font-bold transition shadow-xs"
                      title="Exportar Lista de Materiais BOM para Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Exportar Lista BOM (Excel)</span>
                    </button>
                  )}

                  {onOpenLabelPrint && (
                    <button
                      type="button"
                      onClick={onOpenLabelPrint}
                      className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                      title="Imprimir etiquetas de componentes"
                    >
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Etiquetas DIN</span>
                    </button>
                  )}
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Planilhas & Etiquetas
                </span>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 7: EXPORTAÇÃO & RELATÓRIOS
             ======================================================== */}
          {activeTab === 'export' && (
            <>
              {/* Documentação Técnica PDF */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  {onOpenSchematicPdf && (
                    <button
                      type="button"
                      onClick={onOpenSchematicPdf}
                      className="h-7 flex items-center gap-1.5 px-2.5 bg-blue-600/30 hover:bg-blue-600 border border-blue-500/50 text-blue-200 hover:text-white rounded text-[11px] font-bold transition shadow-xs"
                      title="Gerar Dossiê Técnico Completo em PDF (8 Folhas com carimbo, layout e esquemas)"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Dossier Técnico (PDF 8 Folhas)</span>
                    </button>
                  )}

                  {onExportUnifilarPdf && (
                    <button
                      type="button"
                      onClick={onExportUnifilarPdf}
                      className="h-7 flex items-center gap-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 hover:text-white rounded text-[11px] font-bold transition"
                      title="Gerar Diagrama Elétrico Unifilar Completo (Norma IEC 60617)"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Unifilar IEC (PDF)</span>
                    </button>
                  )}

                  {onOpenPrintModal && (
                    <button
                      type="button"
                      onClick={onOpenPrintModal}
                      className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                      title="Imprimir relatório técnico A4"
                    >
                      <Printer className="w-3.5 h-3.5 text-sky-400" />
                      <span>Imprimir A4</span>
                    </button>
                  )}
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Documentação Técnica (PDF)
                </span>
              </div>

              {/* Planilhas & Dados (Excel / CSV) */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onOpenWiringList}
                    className="h-7 flex items-center gap-1.5 px-2 bg-purple-950/60 hover:bg-purple-900 border border-purple-600/40 text-purple-300 hover:text-white rounded text-[11px] font-bold transition"
                    title="Exportar Lista de Cablagem De-Para com secções e cores"
                  >
                    <Table className="w-3.5 h-3.5 text-purple-400" />
                    <span>Lista Cabos (CSV)</span>
                  </button>

                  {onExportBomExcel && (
                    <button
                      type="button"
                      onClick={onExportBomExcel}
                      className="h-7 flex items-center gap-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 hover:text-white rounded text-[11px] font-bold transition"
                      title="Exportar Lista de Materiais BOM para Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Lista BOM (Excel)</span>
                    </button>
                  )}

                  {onOpenLabelPrint && (
                    <button
                      type="button"
                      onClick={onOpenLabelPrint}
                      className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                      title="Gerar etiquetas para impressão física"
                    >
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Etiquetas</span>
                    </button>
                  )}
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Planilhas & Dados
                </span>
              </div>

              {/* Gráficos & CAD */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onExportSvg}
                    className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-blue-300 hover:text-white border border-slate-750 rounded text-[11px] font-semibold transition"
                    title="Descarregar vetor SVG em alta definição do quadro"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Exportar SVG</span>
                  </button>

                  {onOpenCadExport && (
                    <button
                      type="button"
                      onClick={onOpenCadExport}
                      className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                      title="Exportar para DXF / CAD"
                    >
                      <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                      <span>CAD / DXF</span>
                    </button>
                  )}
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Gráficos & Vetores
                </span>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 8: NORMAS & ASSISTÊNCIA TÉCNICA
             ======================================================== */}
          {activeTab === 'standards' && (
            <>
              {/* Assistentes de Conformidade */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  {onOpenIecAssistant && (
                    <button
                      type="button"
                      onClick={onOpenIecAssistant}
                      className="h-7 flex items-center gap-1.5 px-2.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-600/40 text-amber-300 hover:text-white rounded text-[11px] font-bold transition shadow-xs"
                      title="Assistente IEC 60898: Curvas B, C, D e calibre In para disjuntores"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Assistente IEC 60898</span>
                    </button>
                  )}

                  {onOpenWireCalc && (
                    <button
                      type="button"
                      onClick={onOpenWireCalc}
                      className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-sky-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                      title="Dimensionamento de condutores e queda de tensão (EN 60204-1)"
                    >
                      <Zap className="w-3.5 h-3.5 text-sky-400" />
                      <span>Cálculo Cabos</span>
                    </button>
                  )}

                  {onOpenIpIkVerification && (
                    <button
                      type="button"
                      onClick={onOpenIpIkVerification}
                      className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-sky-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                      title="Verificador de proteção IP & IK (EN 60529 / 62262)"
                    >
                      <Shield className="w-3.5 h-3.5 text-sky-400" />
                      <span>Verificador IP/IK</span>
                    </button>
                  )}
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Dimensionamento & Cálculos
                </span>
              </div>

              {/* Biblioteca & Normas */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  {onOpenLibraryManager && (
                    <button
                      type="button"
                      onClick={onOpenLibraryManager}
                      className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                      title="Gerir biblioteca e catálogo Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Biblioteca & Excel</span>
                    </button>
                  )}

                  {onOpenIdMap && (
                    <button
                      type="button"
                      onClick={onOpenIdMap}
                      className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                      title="Mapa de identificação de circuitos para a porta"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Placa Identificação</span>
                    </button>
                  )}

                  {onOpenComplianceDocs && (
                    <button
                      type="button"
                      onClick={onOpenComplianceDocs}
                      className="h-7 flex items-center gap-1.5 px-2 bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-white border border-slate-750 rounded text-[11px] font-medium transition"
                      title="Manual de normas RTIEBT e EN 61439"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Manual Normas</span>
                    </button>
                  )}
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Catálogo & Documentação
                </span>
              </div>

              {/* Standalone Windows .EXE */}
              {onOpenStandaloneGuide && (
                <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={onOpenStandaloneGuide}
                      className="h-7 flex items-center gap-1.5 px-2.5 bg-gradient-to-r from-emerald-950/80 to-slate-900 hover:from-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white rounded text-[11px] font-bold transition shadow-xs"
                      title="Transformar em .EXE executável e resolver arranque do ficheiro .bat"
                    >
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Gerar Executável .EXE</span>
                    </button>
                  </div>
                  <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                    Modo Offline
                  </span>
                </div>
              )}
            </>
          )}

          {/* ========================================================
              TAB 9: DASHBOARD
             ======================================================== */}
          {activeTab === 'dashboard' && (
            <>
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <div className="h-7 flex items-center gap-1.5 px-2.5 bg-sky-950/50 border border-sky-600/30 text-sky-300 rounded text-[11px] font-medium">
                    <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Métricas de Potência, Ocupação e Componentes</span>
                  </div>
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Análise do Quadro
                </span>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 10: VALIDAÇÃO
             ======================================================== */}
          {activeTab === 'checks' && (
            <>
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <div className={`h-7 flex items-center gap-1.5 px-2.5 rounded text-[11px] font-bold border ${
                    validationErrorCount > 0
                      ? 'bg-red-950/60 border-red-500/50 text-red-300'
                      : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  }`}>
                    {validationErrorCount > 0 ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                        <span>{validationErrorCount} Não Conformidades Detetadas (EN 61439)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Quadro 100% Conforme com Normas IEC</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Auditoria Normativa
                </span>
              </div>
            </>
          )}

        </div>
      )}
    </header>
  );
};
