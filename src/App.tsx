import React, { useState, useEffect, useCallback } from 'react';
import { ProjectState, CatalogItem, PlacedComponent, ElectricalComponent, EnclosureConfig, DinRail } from './types/electrical';
import { TEMPLATES } from './data/templates';
import { Header, ActiveTab } from './components/Header';
import { OfficeRibbonToolbar, WorkspaceTab } from './components/OfficeRibbonToolbar';
import { exportWiringListToCsv, getProjectWiringList } from './utils/wiringListExporter';
import { generateDefaultWires } from './utils/wireSimulator';
import { CabinetLayout } from './components/CabinetLayout';
import { SchematicViewer } from './components/SchematicViewer';
import { BomTable } from './components/BomTable';
import { ProjectAnalyticsDashboard } from './components/ProjectAnalyticsDashboard';
import { ElectricalChecks } from './components/ElectricalChecks';
import { SimulationViewer } from './components/SimulationViewer';
import { ComponentPickerModal } from './components/ComponentPickerModal';
import { TemplatesModal } from './components/TemplatesModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { ProjectSaveModal } from './components/ProjectSaveModal';
import { ComponentIdentificationMapModal } from './components/ComponentIdentificationMapModal';
import { CadExportModal } from './components/CadExportModal';
import { NewProjectModal } from './components/NewProjectModal';
import { PrintCustomizationModal } from './components/PrintCustomizationModal';
import { SchematicPdfExportModal } from './components/SchematicPdfExportModal';
import { ComponentLibraryManagerModal } from './components/ComponentLibraryManagerModal';
import { WireCalculationModal } from './components/WireCalculationModal';
import { Iec60898AssistantModal } from './components/Iec60898AssistantModal';
import { IpIkVerificationModal } from './components/IpIkVerificationModal';
import { ComplianceDocsModal } from './components/ComplianceDocsModal';
import { ComponentLabelPrintModal } from './components/ComponentLabelPrintModal';
import { StandaloneGuideModal } from './components/StandaloneGuideModal';
import { WiringListModal } from './components/WiringListModal';
import { ControlPanelDesigner } from './components/ControlPanelDesigner';
import { runEngineeringValidations, calculatePowerBalance } from './utils/calculations';
import { getDefaultGlands } from './utils/glandUtils';
import { useAutoBackupOnIdle } from './hooks/useAutoBackupOnIdle';
import { downloadCompleteUnifilarDiagramPdf } from './utils/schematicPdfExporter';
import { exportBomToExcelXml } from './utils/bomExporter';
import { 
  saveProjectToLibrary, 
  CURRENT_PROJECT_KEY, 
  LAST_SAVED_TIMESTAMP_KEY, 
  formatSavedTime 
} from './utils/projectStorage';
import { 
  Zap, Layers, FileSpreadsheet, ShieldAlert, Plus, 
  CheckCircle, AlertTriangle, Activity, Save, Check, HardDrive 
} from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<ProjectState>(() => {
    const saved = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.glands || parsed.glands.length === 0) {
          parsed.glands = getDefaultGlands(parsed.config?.widthMm || 600, parsed.config?.supplyVoltage?.includes('400V'));
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse saved project', e);
      }
    }
    // Default to Siemens S7-1200 + Mean Well NDR-120
    const initial = TEMPLATES[0].state;
    if (!initial.glands || initial.glands.length === 0) {
      initial.glands = getDefaultGlands(initial.config.widthMm, false);
    }
    return initial;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('layout');
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogTargetRail, setCatalogTargetRail] = useState(0);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isIdMapModalOpen, setIsIdMapModalOpen] = useState(false);
  const [isCadExportModalOpen, setIsCadExportModalOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSchematicPdfModalOpen, setIsSchematicPdfModalOpen] = useState(false);
  const [isLibraryManagerOpen, setIsLibraryManagerOpen] = useState(false);
  const [isWireModalOpen, setIsWireModalOpen] = useState(false);
  const [isIecAssistantOpen, setIsIecAssistantOpen] = useState(false);
  const [isIpIkModalOpen, setIsIpIkModalOpen] = useState(false);
  const [isComplianceDocsOpen, setIsComplianceDocsOpen] = useState(false);
  const [isLabelPrintOpen, setIsLabelPrintOpen] = useState(false);
  const [isStandaloneGuideOpen, setIsStandaloneGuideOpen] = useState(false);
  const [isWiringListOpen, setIsWiringListOpen] = useState(false);

  // Ribbon Navigation & Collapsed state
  const [ribbonTab, setRibbonTab] = useState<WorkspaceTab>('layout');
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(false);

  // Controlled Layout and Wiring states
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showWiring, setShowWiring] = useState<boolean>(true);
  const [isWiringMode, setIsWiringMode] = useState<boolean>(false);
  const [showWireTags, setShowWireTags] = useState<boolean>(true);
  const [wireRouteStyle, setWireRouteStyle] = useState<'ducts' | 'direct'>('ducts');
  const [showHmiDoorOverlay, setShowHmiDoorOverlay] = useState<boolean>(false);
  const [showThermalZones, setShowThermalZones] = useState<boolean>(false);
  const [isGlandModalOpen, setIsGlandModalOpen] = useState(false);
  const [isAutoLayoutModalOpen, setIsAutoLayoutModalOpen] = useState(false);
  const [zoom, setZoom] = useState<number>(1);

  // Save feedback state
  const [isRecentlySaved, setIsRecentlySaved] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    return localStorage.getItem(LAST_SAVED_TIMESTAMP_KEY);
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Immersive layout editing mode (hides header, menus and status footer)
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);

  // Auto-save to localStorage on change (quiet background persistence)
  useEffect(() => {
    localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(project));
  }, [project]);

  // Show toast utility
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  }, []);

  // Automatic Backup on Inactivity (5 min default)
  const handleAutoBackupExported = useCallback((filename: string) => {
    showToast(`💾 Backup automático descarregado (5 min de inatividade): ${filename}`);
  }, [showToast]);

  const autoBackup = useAutoBackupOnIdle({
    project,
    onBackupExported: handleAutoBackupExported,
  });

  // Explicit Quick Save Handler
  const handleQuickSave = useCallback(() => {
    const saved = saveProjectToLibrary(project);
    setIsRecentlySaved(true);
    setLastSavedTime(saved.updatedAt);
    showToast(`Projeto "${saved.name}" gravado com sucesso!`);

    setTimeout(() => {
      setIsRecentlySaved(false);
    }, 2500);
  }, [project, showToast]);

  // Global Keyboard Shortcuts: Ctrl+S (Save), Shift+F / Alt+Z / F11 (Immersive Mode), Esc (Exit Immersive)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape exits immersive mode
      if (e.key === 'Escape' && isImmersiveMode) {
        setIsImmersiveMode(false);
        showToast('Modo Imersivo desativado');
        return;
      }

      // Check input elements so we don't interfere with typing in forms
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Shift+F or Alt+Z or F11 toggles immersive mode
      const isShiftF = e.shiftKey && e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey;
      const isAltZ = e.altKey && e.key.toLowerCase() === 'z';
      const isF11 = e.key === 'F11';

      if (!isInput && (isShiftF || isAltZ || isF11)) {
        e.preventDefault();
        e.stopPropagation();
        setIsImmersiveMode((prev) => {
          const next = !prev;
          if (next) {
            setActiveTab('layout');
            showToast('⚡ Modo Imersivo ATIVADO (Pressione ESC ou Shift+F para sair)');
          } else {
            showToast('Modo Imersivo desativado');
          }
          return next;
        });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        handleQuickSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleQuickSave, isImmersiveMode, showToast]);

  // Calculations
  const validations = runEngineeringValidations(project);
  const powerBalance = calculatePowerBalance(project);
  const errorCount = validations.filter((v) => v.type === 'error').length;

  // Add component handler with optional quantity (e.g. for multiple terminals/relays)
  const handleAddComponent = (catalogItem: CatalogItem, railIndex: number, quantity: number = 1) => {
    const targetRail = project.rails[railIndex];
    if (!targetRail) return;
    const qty = Math.max(1, Math.min(quantity, 50));

    let updatedRailItems = [...targetRail.items];
    let allCurrentItems = project.rails.flatMap((r) => r.items);

    for (let q = 0; q < qty; q++) {
      const prefix = catalogItem.tagPrefix;
      let nextNum = 1;
      while (allCurrentItems.some((it) => it.tag === `${prefix}${nextNum}`)) {
        nextNum++;
      }
      const tag = `${prefix}${nextNum}`;

      const currentUsedMm = updatedRailItems.reduce((sum, it) => sum + it.data.widthMm + 5, 0);
      const positionMm = currentUsedMm + 10;

      const data: ElectricalComponent = {
        ...catalogItem,
        id: `${tag}-${Math.random().toString(36).substring(2, 7)}`,
        tag,
      };

      const newPlaced: PlacedComponent = {
        instanceId: data.id,
        catalogId: catalogItem.catalogId,
        tag,
        railIndex,
        positionMm,
        data,
      };

      updatedRailItems.push(newPlaced);
      allCurrentItems.push(newPlaced);
    }

    const updatedRails = project.rails.map((r, idx) =>
      idx === railIndex ? { ...r, items: updatedRailItems } : r
    );

    setProject({ ...project, rails: updatedRails });
  };

  // Update config & adjust rails if count or dimensions changed
  const handleSaveConfig = (newConfig: EnclosureConfig) => {
    let currentRails = [...project.rails];
    const sideDuct = newConfig.sideDuctWidthMm || 40;
    const usable = Math.max(80, newConfig.widthMm - 2 * sideDuct - 40);
    const spacing = newConfig.railSpacingMm || 160;

    if (newConfig.railCount > currentRails.length) {
      // Add rails
      for (let i = currentRails.length; i < newConfig.railCount; i++) {
        currentRails.push({
          id: `rail-${i}-${Date.now()}`,
          index: i,
          name: `Calha ${i + 1}`,
          usableWidthMm: usable,
          yPositionMm: 80 + i * spacing,
          items: [],
        });
      }
    } else if (newConfig.railCount < currentRails.length) {
      // Shorten rails (keep items from deleted rails by putting them on last rail)
      const removedItems = currentRails.slice(newConfig.railCount).flatMap((r) => r.items);
      currentRails = currentRails.slice(0, newConfig.railCount);
      if (removedItems.length > 0 && currentRails.length > 0) {
        const last = currentRails[currentRails.length - 1];
        last.items = [...last.items, ...removedItems.map((it) => ({ ...it, railIndex: currentRails.length - 1 }))];
      }
    }

    // Always update usable width and Y position for every rail
    currentRails = currentRails.map((r, idx) => ({
      ...r,
      index: idx,
      name: r.name || `Calha ${idx + 1}`,
      usableWidthMm: usable,
      yPositionMm: 80 + idx * spacing,
    }));

    setProject({
      ...project,
      config: newConfig,
      rails: currentRails,
    });
  };

  const handleTabChange = (tab: WorkspaceTab) => {
    setRibbonTab(tab);
    if (tab === 'wiring') {
      setActiveTab('layout');
      setShowWiring(true);
    } else if (tab === 'export' || tab === 'standards') {
      // Stay on current workspace view while ribbon reveals export or standards tools
    } else {
      setActiveTab(tab as ActiveTab);
    }
  };

  const handleAddRail = () => {
    if (project.rails.length >= 8) {
      showToast('Limite máximo de 8 calhas DIN atingido.');
      return;
    }
    const sideDuct = project.config.sideDuctWidthMm || 40;
    const usable = Math.max(80, project.config.widthMm - 2 * sideDuct - 40);
    const spacing = project.config.railSpacingMm || 160;
    const newIdx = project.rails.length;
    const newRail: DinRail = {
      id: `rail-${newIdx}-${Date.now()}`,
      index: newIdx,
      name: `Calha ${newIdx + 1}`,
      usableWidthMm: usable,
      yPositionMm: 80 + newIdx * spacing,
      items: [],
    };
    setProject({
      ...project,
      config: { ...project.config, railCount: project.rails.length + 1 },
      rails: [...project.rails, newRail],
    });
    showToast(`Nova Calha ${newIdx + 1} adicionada ao quadro.`);
  };

  const handleAlignAllRails = (spacingMm: number = 5) => {
    const updatedRails = project.rails.map((rail) => {
      if (rail.items.length === 0) return rail;
      const sortedItems = [...rail.items].sort((a, b) => a.positionMm - b.positionMm);
      let curX = 10;
      const alignedItems = sortedItems.map((item) => {
        const placed = { ...item, positionMm: curX };
        curX += item.data.widthMm + spacingMm;
        return placed;
      });
      return { ...rail, items: alignedItems };
    });
    setProject({ ...project, rails: updatedRails });
    showToast(`Todas as calhas alinhadas com ${spacingMm}mm de espaçamento!`);
  };

  const handleResetWiresToDefault = () => {
    const defaultWires = generateDefaultWires(project);
    setProject({ ...project, wires: defaultWires });
    showToast('Cablagem reposta para as ligações padrão do esquema elétrico.');
  };

  const handleQuickExportWiringCsv = () => {
    try {
      const wiringList = getProjectWiringList(project);
      exportWiringListToCsv(wiringList, project.config.name || 'Quadro_Eletrico', { format: 'european_excel' });
      showToast('📥 Lista de Cablagem De-Para (CSV Excel) descarregada com sucesso!');
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar lista de cablagem.');
    }
  };

  const handleExportSvg = () => {
    const svgEl = document.querySelector('svg#cabinet-svg') || document.querySelector('svg');
    if (svgEl) {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svgEl);
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.config.projectCode || 'QUADRO'}_Layout_2D.svg`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Vetor SVG em alta definição descarregado!');
    } else {
      showToast('Layout SVG exportado.');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Microsoft Office Style Top Ribbon Navigation (Hidden in Immersive Mode) */}
      {!isImmersiveMode && (
        <OfficeRibbonToolbar
          activeTab={ribbonTab}
          onChangeTab={handleTabChange}
          isCollapsed={isRibbonCollapsed}
          onToggleCollapse={() => setIsRibbonCollapsed((prev) => !prev)}
          projectName={project.config.name}
          projectCode={project.config.projectCode}
          onOpenSaveModal={() => setIsSaveModalOpen(true)}
          onOpenNewProject={() => setIsNewProjectOpen(true)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onQuickSave={handleQuickSave}
          isRecentlySaved={isRecentlySaved}
          lastSavedTime={lastSavedTime}
          autoBackup={autoBackup}
          onToggleImmersiveMode={() => {
            setActiveTab('layout');
            setRibbonTab('layout');
            setIsImmersiveMode(true);
            showToast('⚡ Modo Imersivo ATIVADO (ESC para sair)');
          }}
          onOpenStandaloneGuide={() => setIsStandaloneGuideOpen(true)}
          onShowNotification={showToast}
          cabWidth={project.config.widthMm}
          cabHeight={project.config.heightMm}
          railsCount={project.rails.length}
          onOpenEnclosureSize={() => setIsSettingsOpen(true)}
          onOpenCatalog={() => {
            setCatalogTargetRail(0);
            setIsCatalogOpen(true);
          }}
          onAddRail={handleAddRail}
          canAddRail={project.rails.length < 8}
          onOpenGlands={() => setIsGlandModalOpen(true)}
          glandsCount={project.glands?.length || 0}
          snapToGrid={snapToGrid}
          onToggleSnap={() => {
            const next = !snapToGrid;
            setSnapToGrid(next);
            showToast(next ? 'Snap 5mm ATIVADO' : 'Snap DESATIVADO');
          }}
          onAlignAllRails={() => handleAlignAllRails(5)}
          onOpenAutoLayout={() => setIsAutoLayoutModalOpen(true)}
          thermalIssuesCount={errorCount}
          showThermalZones={showThermalZones}
          onToggleThermalZones={() => {
            const next = !showThermalZones;
            setShowThermalZones(next);
            showToast(next ? 'Zonas Térmicas ATIVADAS' : 'Zonas Térmicas DESATIVADAS');
          }}
          onOpenProjectNotes={() => setIsSettingsOpen(true)}
          hasProjectNotes={Boolean(project.config.notes && project.config.notes.trim().length > 0)}
          showHmiDoorOverlay={showHmiDoorOverlay}
          onToggleHmiDoorOverlay={() => {
            const next = !showHmiDoorOverlay;
            setShowHmiDoorOverlay(next);
            if (next && activeTab !== 'layout') {
              setActiveTab('layout');
              setRibbonTab('layout');
            }
            showToast(next ? '🚪 Sobreposição da Porta & Furação HMI ATIVADA' : 'Sobreposição HMI desativada');
          }}
          onOpenControlPanel={() => {
            setActiveTab('control_panel');
            setRibbonTab('control_panel');
          }}
          showWiring={showWiring}
          onToggleWiring={() => {
            const next = !showWiring;
            setShowWiring(next);
            showToast(next ? 'Condutores ATIVADOS' : 'Condutores OCULTOS');
          }}
          isWiringMode={isWiringMode}
          onToggleWiringMode={() => {
            const next = !isWiringMode;
            setIsWiringMode(next);
            if (next && !showWiring) setShowWiring(true);
            if (next && activeTab !== 'layout') {
              setActiveTab('layout');
              setRibbonTab('wiring');
            }
            showToast(next ? '⚡ Modo Cablagem Ativo: Ligue os bornes' : 'Modo Cablagem desativado');
          }}
          showWireTags={showWireTags}
          onToggleWireTags={() => {
            const next = !showWireTags;
            setShowWireTags(next);
            showToast(next ? 'Anilhas de Fios ATIVADAS' : 'Anilhas OCULTAS');
          }}
          wireRouteStyle={wireRouteStyle}
          onToggleWireRouteStyle={() => {
            const next = wireRouteStyle === 'ducts' ? 'direct' : 'ducts';
            setWireRouteStyle(next);
            showToast(next === 'direct' ? '✨ Rota Direta Ponto a Ponto' : '🛣️ Rota Ortogonal Manhattan');
          }}
          onOpenWiringList={() => setIsWiringListOpen(true)}
          onResetWiresToDefault={handleResetWiresToDefault}
          onQuickExportWiringCsv={handleQuickExportWiringCsv}
          onExportSvg={handleExportSvg}
          onOpenSchematicPdf={() => setIsSchematicPdfModalOpen(true)}
          onExportUnifilarPdf={async () => {
            showToast('A gerar Diagrama Unifilar Completo em PDF (IEC)...');
            try {
              await downloadCompleteUnifilarDiagramPdf(project, { theme: 'light' });
              showToast('Diagrama Unifilar IEC descarregado com sucesso!');
            } catch (e) {
              console.error(e);
              showToast('Erro ao gerar diagrama unifilar.');
            }
          }}
          onExportBomExcel={() => {
            exportBomToExcelXml(project);
            showToast('Planilha Excel (BOM) descarregada com sucesso!');
          }}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
          onOpenLabelPrint={() => setIsLabelPrintOpen(true)}
          onOpenCadExport={() => setIsCadExportModalOpen(true)}
          onOpenIecAssistant={() => setIsIecAssistantOpen(true)}
          onOpenWireCalc={() => setIsWireModalOpen(true)}
          onOpenIpIkVerification={() => setIsIpIkModalOpen(true)}
          onOpenLibraryManager={() => setIsLibraryManagerOpen(true)}
          onOpenIdMap={() => setIsIdMapModalOpen(true)}
          onOpenComplianceDocs={() => setIsComplianceDocsOpen(true)}
          validationErrorCount={errorCount}
          zoom={zoom}
          onZoomIn={() => setZoom((prev) => Math.min(Number((prev * 1.15).toFixed(2)), 4.0))}
          onZoomOut={() => setZoom((prev) => Math.max(Number((prev * 0.85).toFixed(2)), 0.35))}
          onResetZoom={() => setZoom(1)}
          onFitToScreen={() => setZoom(1)}
        />
      )}

      {/* Floating Save Notification Toast */}
      {toastMessage && (
        <div className="fixed top-14 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 text-xs font-semibold rounded-lg shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Workspace Area (Zero padding in Immersive Mode for 100% canvas coverage) */}
      <main className={`flex-1 overflow-hidden relative ${isImmersiveMode ? 'p-0' : 'p-3'}`}>
        {activeTab === 'layout' && (
          <CabinetLayout
            project={project}
            onUpdateProject={setProject}
            onOpenCatalog={(railIdx) => {
              setCatalogTargetRail(railIdx);
              setIsCatalogOpen(true);
            }}
            onAddComponent={handleAddComponent}
            onOpenNewProject={() => setIsNewProjectOpen(true)}
            onOpenLibraryManager={() => setIsLibraryManagerOpen(true)}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
            onOpenLabelPrint={() => setIsLabelPrintOpen(true)}
            onOpenWiringList={() => setIsWiringListOpen(true)}
            onOpenSchematicPdf={() => setIsSchematicPdfModalOpen(true)}
            onExportUnifilarPdf={async () => {
              showToast('A gerar Diagrama Unifilar Completo em PDF (IEC)...');
              try {
                await downloadCompleteUnifilarDiagramPdf(project, { theme: 'light' });
                showToast('Diagrama Unifilar IEC descarregado com sucesso!');
              } catch (e) {
                console.error(e);
                showToast('Erro ao gerar diagrama unifilar.');
              }
            }}
            onExportBomExcel={() => {
              exportBomToExcelXml(project);
              showToast('Planilha Excel (BOM) descarregada com sucesso!');
            }}
            onOpenIecAssistant={() => setIsIecAssistantOpen(true)}
            onOpenWireCalc={() => setIsWireModalOpen(true)}
            onOpenIpIkVerification={() => setIsIpIkModalOpen(true)}
            onOpenCadExport={() => setIsCadExportModalOpen(true)}
            onOpenIdMap={() => setIsIdMapModalOpen(true)}
            onOpenStandaloneGuide={() => setIsStandaloneGuideOpen(true)}
            onOpenControlPanel={() => {
              setActiveTab('control_panel');
              setRibbonTab('control_panel');
            }}
            isImmersiveMode={isImmersiveMode}
            onToggleImmersiveMode={() => {
              setIsImmersiveMode((prev) => {
                const next = !prev;
                showToast(next ? '⚡ Modo Imersivo ATIVADO (ESC para sair)' : 'Modo Imersivo desativado');
                return next;
              });
            }}
            onQuickSave={handleQuickSave}
            snapToGrid={snapToGrid}
            onToggleSnap={() => setSnapToGrid((prev) => !prev)}
            showWiring={showWiring}
            onToggleWiring={() => setShowWiring((prev) => !prev)}
            isWiringMode={isWiringMode}
            onToggleWiringMode={() => setIsWiringMode((prev) => !prev)}
            showWireTags={showWireTags}
            onToggleWireTags={() => setShowWireTags((prev) => !prev)}
            wireRouteStyle={wireRouteStyle}
            onToggleWireRouteStyle={() => setWireRouteStyle((prev) => prev === 'ducts' ? 'direct' : 'ducts')}
            showHmiDoorOverlay={showHmiDoorOverlay}
            onToggleHmiDoorOverlay={() => setShowHmiDoorOverlay((prev) => !prev)}
            showThermalZones={showThermalZones}
            onToggleThermalZones={() => setShowThermalZones((prev) => !prev)}
            isAutoLayoutModalOpen={isAutoLayoutModalOpen}
            onCloseAutoLayoutModal={() => setIsAutoLayoutModalOpen(false)}
            isGlandModalOpen={isGlandModalOpen}
            onCloseGlandModal={() => setIsGlandModalOpen(false)}
          />
        )}

        {activeTab === 'control_panel' && (
          <ControlPanelDesigner
            project={project}
            onUpdateProject={setProject}
            onShowNotification={showToast}
            onSwitchToInterior={() => {
              setActiveTab('layout');
              setRibbonTab('layout');
            }}
          />
        )}

        {activeTab === 'simulation' && <SimulationViewer project={project} />}

        {activeTab === 'schematic' && (
          <SchematicViewer
            project={project}
            onUpdateProject={setProject}
            onShowNotification={showToast}
          />
        )}

        {activeTab === 'bom' && <BomTable project={project} />}

        {activeTab === 'dashboard' && (
          <ProjectAnalyticsDashboard
            project={project}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'checks' && (
          <ElectricalChecks
            project={project}
            onOpenCatalog={(railIdx) => {
              setCatalogTargetRail(railIdx);
              setIsCatalogOpen(true);
            }}
            onOpenIpIkVerification={() => setIsIpIkModalOpen(true)}
            onOpenComplianceDocs={() => setIsComplianceDocsOpen(true)}
            onOpenIecAssistant={() => setIsIecAssistantOpen(true)}
            onUpdateConfig={handleSaveConfig}
          />
        )}
      </main>

      {/* Persistent Technical Status Strip (Hidden in Immersive Mode) */}
      {!isImmersiveMode && (
        <footer className="px-5 py-2 bg-slate-950 border-t border-slate-900 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4 no-print select-none">
          <div className="flex items-center gap-4 text-xs font-mono">
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              className="flex items-center gap-1.5 text-slate-300 font-bold hover:text-emerald-400 transition cursor-pointer"
              title="Clique para gerir ou gravar este projeto"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{project.config.projectCode}: {project.config.name}</span>
            </button>
            <span className="text-slate-500">|</span>
            <span>{project.config.supplyVoltage}</span>
            <span className="text-slate-500">|</span>
            <span>
              Fonte 24VDC:{' '}
              <strong className="text-sky-400">{powerBalance.totalDcSuppliedA}A ({powerBalance.totalDcSuppliedW}W)</strong>
            </span>
            <span className="text-slate-500">|</span>
            <span>
              Carga 24V:{' '}
              <strong className={powerBalance.loadingPercentage > 85 ? 'text-red-400' : 'text-emerald-400'}>
                {powerBalance.totalDcConsumedA}A ({powerBalance.loadingPercentage}%)
              </strong>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 hidden xl:flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isRecentlySaved ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`}></span>
              <span>{isRecentlySaved ? 'Gravado agora' : lastSavedTime ? `Gravado ${formatSavedTime(lastSavedTime)}` : 'Auto-salvamento ativo'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setCatalogTargetRail(0);
                setIsCatalogOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded border border-slate-800 text-xs transition"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Adicionar Componente</span>
            </button>

            {errorCount > 0 ? (
              <button
                onClick={() => setActiveTab('checks')}
                className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs font-mono transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{errorCount} Alerta(s) Elétricos</span>
              </button>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-mono">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Conforme EN 61439</span>
              </span>
            )}
          </div>
        </footer>
      )}

      {/* Modals */}
      {isSaveModalOpen && (
        <ProjectSaveModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          project={project}
          onUpdateProject={(updated) => setProject(updated)}
          onOpenNewProject={() => setIsNewProjectOpen(true)}
          onShowNotification={showToast}
          autoBackup={autoBackup}
        />
      )}

      {isIdMapModalOpen && (
        <ComponentIdentificationMapModal
          isOpen={isIdMapModalOpen}
          onClose={() => setIsIdMapModalOpen(false)}
          project={project}
          onUpdateProject={(updated) => setProject(updated)}
          onShowNotification={showToast}
        />
      )}

      {isCadExportModalOpen && (
        <CadExportModal
          isOpen={isCadExportModalOpen}
          onClose={() => setIsCadExportModalOpen(false)}
          project={project}
          onShowNotification={showToast}
        />
      )}

      {isPrintModalOpen && (
        <PrintCustomizationModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          project={project}
          onShowNotification={showToast}
        />
      )}

      {isSchematicPdfModalOpen && (
        <SchematicPdfExportModal
          isOpen={isSchematicPdfModalOpen}
          onClose={() => setIsSchematicPdfModalOpen(false)}
          project={project}
        />
      )}

      {isCatalogOpen && (
        <ComponentPickerModal
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          targetRailIndex={catalogTargetRail}
          railCount={project.rails.length}
          onAddComponent={handleAddComponent}
          onOpenLibraryManager={() => setIsLibraryManagerOpen(true)}
        />
      )}

      {isLibraryManagerOpen && (
        <ComponentLibraryManagerModal
          isOpen={isLibraryManagerOpen}
          onClose={() => setIsLibraryManagerOpen(false)}
          targetRailIndex={catalogTargetRail}
          railCount={project.rails.length}
          onAddComponent={handleAddComponent}
          onShowNotification={showToast}
        />
      )}

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={(newTemplateState) => {
          setProject(newTemplateState);
          setIsRecentlySaved(false);
          setLastSavedTime(null);
        }}
        onOpenNewProjectModal={() => setIsNewProjectOpen(true)}
      />

      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        currentProject={project}
        onCreateNewProject={(newEmptyState) => {
          setProject(newEmptyState);
          setIsRecentlySaved(false);
          setLastSavedTime(null);
        }}
        onShowNotification={showToast}
      />

      <ProjectSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={project.config}
        onSaveConfig={handleSaveConfig}
      />

      {isWireModalOpen && (
        <WireCalculationModal
          isOpen={isWireModalOpen}
          onClose={() => setIsWireModalOpen(false)}
          project={project}
          onShowNotification={showToast}
        />
      )}

      {isIecAssistantOpen && (
        <Iec60898AssistantModal
          isOpen={isIecAssistantOpen}
          onClose={() => setIsIecAssistantOpen(false)}
          project={project}
          onUpdateProject={(updated) => setProject(updated)}
          onShowNotification={showToast}
        />
      )}

      {isIpIkModalOpen && (
        <IpIkVerificationModal
          isOpen={isIpIkModalOpen}
          onClose={() => setIsIpIkModalOpen(false)}
          project={project}
          onUpdateConfig={handleSaveConfig}
          onShowNotification={showToast}
        />
      )}

      {isComplianceDocsOpen && (
        <ComplianceDocsModal
          isOpen={isComplianceDocsOpen}
          onClose={() => setIsComplianceDocsOpen(false)}
          project={project}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
          onShowNotification={showToast}
        />
      )}

      {isLabelPrintOpen && (
        <ComponentLabelPrintModal
          isOpen={isLabelPrintOpen}
          onClose={() => setIsLabelPrintOpen(false)}
          project={project}
          onShowNotification={showToast}
        />
      )}

      {isStandaloneGuideOpen && (
        <StandaloneGuideModal
          isOpen={isStandaloneGuideOpen}
          onClose={() => setIsStandaloneGuideOpen(false)}
          onShowNotification={showToast}
        />
      )}

      {isWiringListOpen && (
        <WiringListModal
          isOpen={isWiringListOpen}
          onClose={() => setIsWiringListOpen(false)}
          project={project}
          onShowNotification={showToast}
        />
      )}
    </div>
  );
}
