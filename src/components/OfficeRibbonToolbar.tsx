import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Layers, Wrench, FolderOpen, Magnet, Grid, Sparkles, 
  Box, Wind, FileText, Zap, RotateCcw, Activity, Tag, 
  Sliders, Table, Download, FileSpreadsheet, Printer, 
  FileCode, Shield, ZoomIn, ZoomOut, Maximize2, ChevronUp, ChevronDown, Check, Save, Cpu, Layout, DoorClosed,
  Settings, BarChart3, ShieldAlert, ShieldCheck, HardDrive, PlusCircle, BookOpen, Scissors, CheckCircle, Award
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
  onExportTechnicalReportPdf?: () => void;
  onOpenSchematicPdf?: () => void;
  onExportUnifilarPdf?: () => void;
  onExportBomExcel?: () => void;
  onOpenPrintModal?: () => void;
  onOpenLabelPrint?: () => void;
  onOpenCadExport?: () => void;
  onOpenDrillingTemplate?: () => void;

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
  onExportTechnicalReportPdf,
  onOpenSchematicPdf,
  onExportUnifilarPdf,
  onExportBomExcel,
  onOpenPrintModal,
  onOpenLabelPrint,
  onOpenCadExport,
  onOpenDrillingTemplate,

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
                    className="h-7.5 w-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-md shadow-xs transition active:scale-95 cursor-pointer"
                    title="Inserir Componente: Abrir catálogo técnico completo para seleção"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onAddRail}
                    disabled={!canAddRail}
                    className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 border border-slate-750 text-sky-400 hover:text-white rounded-md transition disabled:opacity-40 cursor-pointer active:scale-95"
                    title={`Adicionar Nova Calha DIN 35mm (${railsCount}/8 calhas instaladas)`}
                  >
                    <Layers className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onOpenGlands}
                    className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 border border-slate-750 text-amber-300 hover:text-white rounded-md transition cursor-pointer active:scale-95"
                    title={`Furação e Bucins de Entrada/Saída de Cabos (${glandsCount} bucins configurados)`}
                  >
                    <Wrench className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Calhas
                </span>
              </div>

              {/* Grupo: Porta Frontal & HMI */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onOpenControlPanel}
                    className="h-7.5 w-8 flex items-center justify-center bg-purple-950/70 hover:bg-purple-900 border border-purple-500/50 text-purple-200 hover:text-white rounded-md transition shadow-xs cursor-pointer active:scale-95"
                    title="Editor da Porta: Painel frontal, ecrãs HMI, botões 22mm e cotas CNC"
                  >
                    <Layout className="w-4 h-4 text-purple-400" />
                  </button>

                  <button
                    type="button"
                    onClick={onToggleHmiDoorOverlay}
                    className={`h-7.5 w-8 flex items-center justify-center rounded-md transition cursor-pointer active:scale-95 ${
                      showHmiDoorOverlay
                        ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-300'
                        : 'bg-slate-850 hover:bg-slate-800 border border-purple-600/40 text-purple-300 hover:text-white'
                    }`}
                    title={showHmiDoorOverlay ? 'Furação HMI na Porta: LIGADA (clique para ocultar)' : 'Furação HMI na Porta: DESLIGADA (clique para sobrepor no interior)'}
                  >
                    <DoorClosed className={`w-4 h-4 ${showHmiDoorOverlay ? 'text-white' : 'text-purple-400'}`} />
                  </button>
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-purple-400 block text-center mt-0.5">
                  Porta & HMI
                </span>
              </div>

              {/* Grupo: Alinhamento & Snap */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onToggleSnap}
                    className={`h-7.5 w-8 flex items-center justify-center rounded-md transition border cursor-pointer active:scale-95 ${
                      snapToGrid
                        ? 'bg-sky-600 text-white border-sky-400 shadow-xs ring-1 ring-sky-300/40'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                    }`}
                    title={snapToGrid ? 'Snap Magnético 5mm: ATIVADO (clique para desligar)' : 'Snap Magnético 5mm: DESATIVADO (clique para ligar)'}
                  >
                    <Magnet className={`w-4 h-4 ${snapToGrid ? 'text-amber-300' : 'text-slate-400'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={onAlignAllRails}
                    className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md transition border border-slate-750 cursor-pointer active:scale-95"
                    title="Alinhar Todos os Componentes magneticamente ao passo de 5mm"
                  >
                    <Grid className="w-4 h-4 text-sky-400" />
                  </button>

                  <button
                    type="button"
                    onClick={onOpenAutoLayout}
                    className="h-7.5 w-8 flex items-center justify-center bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-md transition shadow-xs relative cursor-pointer active:scale-95"
                    title="Auto-Layout: Reorganização automática otimizada termicamente (EN 61439)"
                  >
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    {thermalIssuesCount > 0 && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </button>
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Alinhamento
                </span>
              </div>

              {/* Grupo: Armário & Documentação */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onOpenEnclosureSize}
                    className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                    title={`Dimensões do Armário: ${cabWidth}×${cabHeight}mm (Clique para editar invólucro e calhas)`}
                  >
                    <Box className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onToggleThermalZones}
                    className={`h-7.5 w-8 flex items-center justify-center rounded-md transition border cursor-pointer active:scale-95 ${
                      showThermalZones
                        ? 'bg-amber-600 text-white border-amber-400 shadow-xs ring-1 ring-amber-300/40'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                    }`}
                    title={showThermalZones ? 'Zonas Térmicas EN 61439: VISÍVEIS (clique para ocultar)' : 'Zonas Térmicas EN 61439: OCULTAS (clique para mostrar)'}
                  >
                    <Wind className={`w-4 h-4 ${showThermalZones ? 'text-white' : 'text-amber-400'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={onOpenProjectNotes}
                    className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-emerald-400 hover:text-white border border-slate-750 rounded-md transition relative cursor-pointer active:scale-95"
                    title="Caderno de Encargos, Notas e Instruções de Montagem"
                  >
                    <FileText className="w-4 h-4" />
                    {hasProjectNotes && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Armário
                </span>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 2: PORTA & HMI (PAINEL FRONTAL)
             ======================================================== */}
          {activeTab === 'control_panel' && (
            <>
              {/* Grupo: Navegação da Porta & Gabarito */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onChangeTab('layout')}
                    className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-sky-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                    title="Voltar ao Layout Interior das Calhas DIN"
                  >
                    <Layers className="w-4 h-4 text-sky-400" />
                  </button>

                  <button
                    type="button"
                    onClick={onToggleHmiDoorOverlay}
                    className={`h-7.5 w-8 flex items-center justify-center rounded-md transition cursor-pointer active:scale-95 ${
                      showHmiDoorOverlay
                        ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-300'
                        : 'bg-purple-950/60 hover:bg-purple-900 border border-purple-600/40 text-purple-300 hover:text-white'
                    }`}
                    title={showHmiDoorOverlay ? 'Sobreposição no Interior: LIGADA (clique para ocultar)' : 'Ver Sobreposição e Colisão no Interior'}
                  >
                    <DoorClosed className={`w-4 h-4 ${showHmiDoorOverlay ? 'text-white' : 'text-purple-400'}`} />
                  </button>

                  {onOpenDrillingTemplate && (
                    <button
                      type="button"
                      onClick={onOpenDrillingTemplate}
                      className="h-7.5 w-8 flex items-center justify-center bg-amber-950/70 hover:bg-amber-900 border border-amber-500/50 text-amber-300 hover:text-white rounded-md transition shadow-xs cursor-pointer active:scale-95"
                      title="Imprimir Gabarito / Template de Furações da Porta com Cotas para as Margens (A4 / A3 / SVG)"
                    >
                      <Ruler className="w-4 h-4 text-amber-400" />
                    </button>
                  )}
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Vistas & Furação
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
                    onClick={onToggleWiringMode}
                    className={`h-7.5 w-8 flex items-center justify-center rounded-md transition cursor-pointer active:scale-95 ${
                      isWiringMode
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-[0_0_8px_#f59e0b]'
                        : 'bg-amber-950/60 hover:bg-amber-900 border border-amber-600/40 text-amber-300 hover:text-white'
                    }`}
                    title={isWiringMode ? 'Modo Cablagem: ATIVO (Clique num borne e arraste)' : 'Modo Cablagem: Iniciar ligação ponto a ponto entre bornes'}
                  >
                    <Zap className={`w-4 h-4 ${isWiringMode ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={onToggleWiring}
                    className={`h-7.5 w-8 flex items-center justify-center rounded-md transition border cursor-pointer active:scale-95 ${
                      showWiring
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs ring-1 ring-emerald-300/40'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                    }`}
                    title={showWiring ? 'Condutores: VISÍVEIS (clique para ocultar)' : 'Condutores: OCULTOS (clique para mostrar)'}
                  >
                    <Activity className={`w-4 h-4 ${showWiring ? 'text-white' : 'text-emerald-400'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={onToggleWireTags}
                    disabled={!showWiring}
                    className={`h-7.5 w-8 flex items-center justify-center rounded-md transition border cursor-pointer active:scale-95 ${
                      showWireTags
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                    } disabled:opacity-40`}
                    title={showWireTags ? 'Anilhas de Fio (Marcadores): VISÍVEIS' : 'Anilhas de Fio: OCULTAS'}
                  >
                    <Tag className="w-4 h-4 text-amber-400" />
                  </button>

                  <button
                    type="button"
                    onClick={onToggleWireRouteStyle}
                    disabled={!showWiring}
                    className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95 disabled:opacity-40"
                    title={`Estilo de Rota: ${wireRouteStyle === 'ducts' ? 'Ortogonal por Canaletas (Manhattan)' : 'Direto Ponto a Ponto'}`}
                  >
                    <Sliders className="w-4 h-4 text-purple-400" />
                  </button>
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Cablagem
                </span>
              </div>

              {/* Grupo: Gestão de Cabos */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onOpenWiringList}
                    className="h-7.5 w-8 flex items-center justify-center bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-white rounded-md transition shadow-xs border border-purple-500/50 cursor-pointer active:scale-95"
                    title="Caderno de Cablagem: Mapa detalhado de condutores (De-Para), cores e anilhas EN 60204-1"
                  >
                    <Table className="w-4 h-4 text-purple-300" />
                  </button>

                  <button
                    type="button"
                    onClick={onResetWiresToDefault}
                    className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-rose-400 hover:text-rose-300 border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                    title="Repor Cablagem Padrão (Auto-Router IEC)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Gestão
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
                  <button
                    type="button"
                    onClick={onExportUnifilarPdf}
                    className="h-7.5 w-8 flex items-center justify-center bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 hover:text-white rounded-md transition cursor-pointer active:scale-95"
                    title="Descarregar Diagrama Elétrico Unifilar em PDF (Norma IEC 60617)"
                  >
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Diagrama
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
                  <div
                    className="h-7.5 w-8 flex items-center justify-center bg-emerald-950/50 border border-emerald-600/30 text-emerald-300 rounded-md"
                    title="Simulação Elétrica em Tempo Real Ativa"
                  >
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Simulação
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
                      className="h-7.5 w-8 flex items-center justify-center bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 hover:text-white rounded-md transition shadow-xs cursor-pointer active:scale-95"
                      title="Exportar Lista de Materiais BOM para Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    </button>
                  )}

                  {onOpenLabelPrint && (
                    <button
                      type="button"
                      onClick={onOpenLabelPrint}
                      className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-amber-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                      title="Imprimir Etiquetas de Componentes e Bornes DIN"
                    >
                      <Tag className="w-4 h-4 text-amber-400" />
                    </button>
                  )}
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Planilha
                </span>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 7: EXPORTAÇÃO & RELATÓRIOS (HUB CENTRALIZADO DE EXPORTAÇÃO)
             ======================================================== */}
          {activeTab === 'export' && (
            <>
              {/* Grupo 1: Documentação & Relatórios PDF */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  {onExportTechnicalReportPdf && (
                    <button
                      type="button"
                      onClick={onExportTechnicalReportPdf}
                      className="h-7.5 w-8 flex items-center justify-center bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 border border-sky-400/40 text-white rounded-md transition shadow-xs cursor-pointer active:scale-95"
                      title="Relatório Técnico Oficial Consolidado em PDF (Norma EN 61439, Balanço 24V e BOM)"
                    >
                      <Award className="w-4 h-4 text-amber-300" />
                    </button>
                  )}

                  {onOpenSchematicPdf && (
                    <button
                      type="button"
                      onClick={onOpenSchematicPdf}
                      className="h-7.5 w-8 flex items-center justify-center bg-blue-600/30 hover:bg-blue-600 border border-blue-500/50 text-blue-200 hover:text-white rounded-md transition shadow-xs cursor-pointer active:scale-95"
                      title="Dossier Técnico Completo em PDF (8 Folhas com carimbo, layout e esquemas CAD)"
                    >
                      <FileText className="w-4 h-4 text-blue-400" />
                    </button>
                  )}

                  {onExportUnifilarPdf && (
                    <button
                      type="button"
                      onClick={onExportUnifilarPdf}
                      className="h-7.5 w-8 flex items-center justify-center bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 hover:text-white rounded-md transition cursor-pointer active:scale-95"
                      title="Diagrama Elétrico Unifilar em PDF (Norma IEC 60617)"
                    >
                      <Zap className="w-4 h-4 text-emerald-400" />
                    </button>
                  )}

                  {onOpenPrintModal && (
                    <button
                      type="button"
                      onClick={onOpenPrintModal}
                      className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                      title="Imprimir Relatório Técnico A4"
                    >
                      <Printer className="w-4 h-4 text-sky-400" />
                    </button>
                  )}

                  {onOpenDrillingTemplate && (
                    <button
                      type="button"
                      onClick={onOpenDrillingTemplate}
                      className="h-7.5 w-8 flex items-center justify-center bg-amber-950/70 hover:bg-amber-900 border border-amber-500/50 text-amber-300 hover:text-white rounded-md transition shadow-xs cursor-pointer active:scale-95"
                      title="Template de Furações: Desenho técnico com cotas e medidas para as margens para serralheiro (A4 / A3 / SVG)"
                    >
                      <Ruler className="w-4 h-4 text-amber-400" />
                    </button>
                  )}
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  PDF & Impressão
                </span>
              </div>

              {/* Grupo 2: Planilhas & Dados (Excel / CSV) */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  {onExportBomExcel && (
                    <button
                      type="button"
                      onClick={onExportBomExcel}
                      className="h-7.5 w-8 flex items-center justify-center bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 hover:text-white rounded-md transition shadow-xs cursor-pointer active:scale-95"
                      title="Exportar Lista de Materiais BOM para Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    </button>
                  )}

                  {onOpenWiringList && (
                    <button
                      type="button"
                      onClick={onOpenWiringList}
                      className="h-7.5 w-8 flex items-center justify-center bg-purple-950/60 hover:bg-purple-900 border border-purple-600/40 text-purple-300 hover:text-white rounded-md transition cursor-pointer active:scale-95"
                      title="Exportar Lista de Cablagem / Fios (CSV)"
                    >
                      <Table className="w-4 h-4 text-purple-400" />
                    </button>
                  )}

                  {onOpenLabelPrint && (
                    <button
                      type="button"
                      onClick={onOpenLabelPrint}
                      className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                      title="Imprimir Etiquetas de Componentes e Bornes DIN"
                    >
                      <Tag className="w-4 h-4 text-amber-400" />
                    </button>
                  )}
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Planilhas
                </span>
              </div>

              {/* Grupo 3: Gráficos & CAD */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onExportSvg}
                    className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-blue-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                    title="Exportar Vetor SVG do Layout em Alta Resolução"
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                  </button>

                  {onOpenCadExport && (
                    <button
                      type="button"
                      onClick={onOpenCadExport}
                      className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                      title="Exportar Furações CNC e Layout para DXF / CAD 2D"
                    >
                      <FileCode className="w-4 h-4 text-indigo-400" />
                    </button>
                  )}
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  CAD / SVG
                </span>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 8: NORMAS & ASSISTÊNCIA TÉCNICA
             ======================================================== */}
          {activeTab === 'standards' && (
            <>
              {/* Grupo 1: Dimensionamento & Cálculos */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  {onOpenIecAssistant && (
                    <button
                      type="button"
                      onClick={onOpenIecAssistant}
                      className="h-7.5 w-8 flex items-center justify-center bg-amber-950/60 hover:bg-amber-900 border border-amber-600/40 text-amber-300 hover:text-white rounded-md transition shadow-xs cursor-pointer active:scale-95"
                      title="Assistente IEC 60898: Seleção de curvas B, C, D e calibres In de proteção"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </button>
                  )}

                  {onOpenWireCalc && (
                    <button
                      type="button"
                      onClick={onOpenWireCalc}
                      className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-sky-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                      title="Dimensionamento de Condutores e Queda de Tensão (EN 60204-1)"
                    >
                      <Zap className="w-4 h-4 text-sky-400" />
                    </button>
                  )}

                  {onOpenIpIkVerification && (
                    <button
                      type="button"
                      onClick={onOpenIpIkVerification}
                      className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-sky-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                      title="Verificador de Estanqueidade IP (EN 60529) e Impactos IK (EN 62262)"
                    >
                      <Shield className="w-4 h-4 text-sky-400" />
                    </button>
                  )}
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Dimensionamento
                </span>
              </div>

              {/* Grupo 2: Catálogo & Documentação */}
              <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                <div className="flex items-center gap-1">
                  {onOpenLibraryManager && (
                    <button
                      type="button"
                      onClick={onOpenLibraryManager}
                      className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                      title="Gerir Biblioteca de Componentes & Importar/Exportar Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    </button>
                  )}

                  {onOpenIdMap && (
                    <button
                      type="button"
                      onClick={onOpenIdMap}
                      className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                      title="Mapa de Identificação de Circuitos para Colar na Porta do Quadro"
                    >
                      <FileText className="w-4 h-4 text-indigo-400" />
                    </button>
                  )}

                  {onOpenComplianceDocs && (
                    <button
                      type="button"
                      onClick={onOpenComplianceDocs}
                      className="h-7.5 w-8 flex items-center justify-center bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-white border border-slate-750 rounded-md transition cursor-pointer active:scale-95"
                      title="Manual de Normas RTIEBT e EN 61439"
                    >
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                    </button>
                  )}
                </div>
                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block text-center mt-0.5">
                  Catálogo
                </span>
              </div>

              {/* Grupo 3: Standalone Windows .EXE */}
              {onOpenStandaloneGuide && (
                <div className="flex flex-col pr-2 border-r border-slate-800 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={onOpenStandaloneGuide}
                      className="h-7.5 w-8 flex items-center justify-center bg-gradient-to-r from-emerald-950/80 to-slate-900 hover:from-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white rounded-md transition shadow-xs cursor-pointer active:scale-95"
                      title="Guia Executável Offline: Criar .EXE Windows autónomo sem dependências"
                    >
                      <Cpu className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                  <span className="text-[8px] uppercase tracking-wider font-bold text-emerald-400 block text-center mt-0.5">
                    Offline
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
