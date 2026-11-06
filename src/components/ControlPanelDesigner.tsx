import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  ProjectState, 
  ControlPanelConfig, 
  ControlPanelDevice, 
  ControlPanelDeviceType 
} from '../types/electrical';
import { 
  CONTROL_PANEL_CATALOG, 
  ControlPanelCatalogItem, 
  getDefaultControlPanelConfig 
} from '../data/controlPanelCatalog';
import { SchematicPdfExportModal } from './SchematicPdfExportModal';
import { 
  Layout, Plus, Trash2, Copy, Move, ZoomIn, ZoomOut, Maximize2, 
  Download, FileText, Check, Settings2, Sliders, Shield, AlertTriangle, 
  RotateCcw, Sparkles, Grid, Eye, CheckCircle2, ChevronRight, Layers, Box
} from 'lucide-react';

interface ControlPanelDesignerProps {
  project: ProjectState;
  onUpdateProject: (updated: ProjectState) => void;
  onShowNotification?: (msg: string) => void;
  onSwitchToInterior?: () => void;
  onOpenDossierPdf?: () => void;
}

const PRESET_DIMENSIONS = [
  { label: '400 × 500 mm (Caixa Pequena)', width: 400, height: 500 },
  { label: '600 × 800 mm (Padrão Automação)', width: 600, height: 800 },
  { label: '800 × 1000 mm (Armário Chão)', width: 800, height: 1000 },
  { label: '800 × 1200 mm (Média Força/Comando)', width: 800, height: 1200 },
  { label: '1000 × 1400 mm (Grande Porte)', width: 1000, height: 1400 },
  { label: '1200 × 2000 mm (Armário Duplo)', width: 1200, height: 2000 },
];

export const ControlPanelDesigner: React.FC<ControlPanelDesignerProps> = ({
  project,
  onUpdateProject,
  onShowNotification,
  onSwitchToInterior,
}) => {
  // Ensure control panel config exists, initialized from project.config dimensions
  const controlPanel = useMemo<ControlPanelConfig>(() => {
    if (project.controlPanel && project.controlPanel.devices) {
      return project.controlPanel;
    }
    return getDefaultControlPanelConfig(project.config.widthMm || 600, project.config.heightMm || 800);
  }, [project.controlPanel, project.config.widthMm, project.config.heightMm]);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [activeCatalogCategory, setActiveCatalogCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'catalog' | 'properties' | 'drilling' | 'dimensions'>('catalog');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [snapGridSize, setSnapGridSize] = useState<number>(25); // 10, 25, 50mm
  const [showDimensionGuides, setShowDimensionGuides] = useState<boolean>(true);
  const [showGasketZone, setShowGasketZone] = useState<boolean>(true);

  // Canvas zoom & pan
  const [zoom, setZoom] = useState<number>(0.9);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Drag device state
  const [dragState, setDragState] = useState<{
    deviceId: string;
    startMouseX: number;
    startMouseY: number;
    initialDevX: number;
    initialDevY: number;
  } | null>(null);

  // Selected device object
  const selectedDevice = useMemo(() => {
    return controlPanel.devices.find((d) => d.id === selectedDeviceId) || null;
  }, [controlPanel.devices, selectedDeviceId]);

  // Update control panel config in project state
  const updateControlPanel = (newConfig: ControlPanelConfig) => {
    onUpdateProject({
      ...project,
      controlPanel: newConfig,
    });
  };

  // Check collision / clearances: devices within 40mm of each other or < 45mm from gasket edge
  const collisionIssues = useMemo(() => {
    const issues: Array<{ deviceId: string; message: string; severity: 'warning' | 'error' }> = [];
    const minEdgeMargin = 45; // mm from door gasket seal

    for (let i = 0; i < controlPanel.devices.length; i++) {
      const d1 = controlPanel.devices[i];

      // Edge clearance
      if (
        d1.xMm - d1.widthMm / 2 < minEdgeMargin ||
        d1.xMm + d1.widthMm / 2 > controlPanel.widthMm - minEdgeMargin ||
        d1.yMm - d1.heightMm / 2 < minEdgeMargin ||
        d1.yMm + d1.heightMm / 2 > controlPanel.heightMm - minEdgeMargin
      ) {
        issues.push({
          deviceId: d1.id,
          message: `${d1.tag}: Muito próximo da zona de vedação/dobradiças (< ${minEdgeMargin}mm). Risco de perda de estanquidade IP65.`,
          severity: 'warning',
        });
      }

      // Mutual clearance between holes
      for (let j = i + 1; j < controlPanel.devices.length; j++) {
        const d2 = controlPanel.devices[j];
        const dist = Math.sqrt(Math.pow(d1.xMm - d2.xMm, 2) + Math.pow(d1.yMm - d2.yMm, 2));
        const requiredMinDist = (d1.widthMm + d2.widthMm) / 2 + 10;

        if (dist < requiredMinDist) {
          issues.push({
            deviceId: d1.id,
            message: `Sobreposição entre ${d1.tag} e ${d2.tag}: Distância (${Math.round(dist)}mm) inferior ao mínimo mecânico (${Math.round(requiredMinDist)}mm).`,
            severity: 'error',
          });
        }
      }
    }

    return issues;
  }, [controlPanel.devices, controlPanel.widthMm, controlPanel.heightMm]);

  // Handle add device from catalog
  const handleAddDevice = (catalogItem: ControlPanelCatalogItem) => {
    // Generate next tag
    const prefix = catalogItem.tag.replace(/[0-9]/g, '') || 'S';
    let nextNum = 1;
    while (controlPanel.devices.some((d) => d.tag === `${prefix}${nextNum}`)) {
      nextNum++;
    }
    const newTag = `${prefix}${nextNum}`;

    // Smart placement: find comfortable X/Y in middle
    const newDevice: ControlPanelDevice = {
      id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tag: newTag,
      name: catalogItem.name,
      type: catalogItem.type,
      xMm: Math.round(controlPanel.widthMm / 2),
      yMm: Math.round(controlPanel.heightMm * 0.45),
      widthMm: catalogItem.widthMm,
      heightMm: catalogItem.heightMm,
      holeDiameterMm: catalogItem.holeDiameterMm,
      cutoutType: catalogItem.cutoutType,
      color: catalogItem.color,
      label: catalogItem.label || catalogItem.defaultLabel,
      voltage: catalogItem.voltage,
      contactConfig: catalogItem.contactConfig,
      brand: catalogItem.brand,
      partNumber: catalogItem.partNumber,
      priceEur: catalogItem.priceEur,
    };

    const updatedDevices = [...controlPanel.devices, newDevice];
    updateControlPanel({ ...controlPanel, devices: updatedDevices });
    setSelectedDeviceId(newDevice.id);
    setActiveTab('properties');

    if (onShowNotification) {
      onShowNotification(`Dispositivo ${newTag} (${catalogItem.name}) adicionado ao painel.`);
    }
  };

  // Handle remove device
  const handleRemoveDevice = (id: string) => {
    const updated = controlPanel.devices.filter((d) => d.id !== id);
    updateControlPanel({ ...controlPanel, devices: updated });
    if (selectedDeviceId === id) {
      setSelectedDeviceId(null);
    }
  };

  // Handle duplicate device
  const handleDuplicateDevice = (device: ControlPanelDevice) => {
    const prefix = device.tag.replace(/[0-9]/g, '') || 'S';
    let nextNum = 1;
    while (controlPanel.devices.some((d) => d.tag === `${prefix}${nextNum}`)) {
      nextNum++;
    }
    const newTag = `${prefix}${nextNum}`;

    const duplicated: ControlPanelDevice = {
      ...device,
      id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tag: newTag,
      xMm: Math.min(controlPanel.widthMm - 60, device.xMm + 60),
      yMm: device.yMm,
    };

    updateControlPanel({
      ...controlPanel,
      devices: [...controlPanel.devices, duplicated],
    });
    setSelectedDeviceId(duplicated.id);
  };

  // Dimension Change
  const handleDimensionPreset = (w: number, h: number) => {
    updateControlPanel({
      ...controlPanel,
      widthMm: w,
      heightMm: h,
    });
    if (onShowNotification) {
      onShowNotification(`Dimensão do painel alterada para ${w} × ${h} mm.`);
    }
  };

  // Horizontal Alignment of all selected or all buttons on same row
  const handleAlignHorizontal = () => {
    if (!selectedDevice) return;
    const targetY = selectedDevice.yMm;
    const updated = controlPanel.devices.map((d) => {
      // align items within 50mm vertical distance
      if (Math.abs(d.yMm - targetY) < 60) {
        return { ...d, yMm: targetY };
      }
      return d;
    });
    updateControlPanel({ ...controlPanel, devices: updated });
    if (onShowNotification) onShowNotification('Dispositivos alinhados horizontalmente.');
  };

  // Distribute spacing evenly for a row of buttons
  const handleDistributeRow = () => {
    if (!selectedDevice) return;
    const targetY = selectedDevice.yMm;
    const rowDevices = controlPanel.devices
      .filter((d) => Math.abs(d.yMm - targetY) < 50)
      .sort((a, b) => a.xMm - b.xMm);

    if (rowDevices.length < 2) return;

    const firstX = rowDevices[0].xMm;
    const lastX = rowDevices[rowDevices.length - 1].xMm;
    const step = (lastX - firstX) / (rowDevices.length - 1);

    const updated = controlPanel.devices.map((d) => {
      const idx = rowDevices.findIndex((rd) => rd.id === d.id);
      if (idx >= 0) {
        return { ...d, xMm: Math.round(firstX + idx * step), yMm: targetY };
      }
      return d;
    });

    updateControlPanel({ ...controlPanel, devices: updated });
    if (onShowNotification) onShowNotification('Espaçamento distribuído uniformemente na linha.');
  };

  // Reset to default layout
  const handleResetToDefault = () => {
    const defaultCfg = getDefaultControlPanelConfig(controlPanel.widthMm, controlPanel.heightMm);
    updateControlPanel(defaultCfg);
    if (onShowNotification) onShowNotification('Painel de comando reposto para a configuração de fábrica.');
  };

  // Export Drilling Table to CSV
  const handleExportDrillingCsv = () => {
    const headers = [
      'N_Furo',
      'Tag',
      'Designacao',
      'Tipo_Furacao',
      'Diametro_mm',
      'Largura_mm',
      'Altura_mm',
      'Coord_X_mm',
      'Coord_Y_mm',
      'Cota_Margem_Esquerda_mm',
      'Cota_Margem_Topo_mm',
      'Tensao_Sinal',
      'Contactos',
      'Referencia',
    ];

    const rows = controlPanel.devices.map((d, idx) => [
      idx + 1,
      `"${d.tag}"`,
      `"${d.name.replace(/"/g, '""')}"`,
      d.cutoutType === 'round' ? 'Circular_22mm' : 'Retangular_HMI',
      d.holeDiameterMm || (d.cutoutType === 'round' ? 22.5 : ''),
      d.widthMm,
      d.heightMm,
      d.xMm,
      d.yMm,
      d.xMm,
      d.yMm,
      `"${d.voltage || ''}"`,
      `"${d.contactConfig || ''}"`,
      `"${d.partNumber || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mapa_Furacao_Painel_${project.config.projectCode || 'Porta'}_${controlPanel.widthMm}x${controlPanel.heightMm}mm.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (onShowNotification) {
      onShowNotification('Mapa de Furação CSV descarregado com sucesso!');
    }
  };

  // SVG Mouse handlers for dragging devices
  const handleMouseDownDevice = (e: React.MouseEvent, dev: ControlPanelDevice) => {
    e.stopPropagation();
    setSelectedDeviceId(dev.id);
    setDragState({
      deviceId: dev.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialDevX: dev.xMm,
      initialDevY: dev.yMm,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragState) {
      const dx = (e.clientX - dragState.startMouseX) / zoom;
      const dy = (e.clientY - dragState.startMouseY) / zoom;

      let newX = Math.round(dragState.initialDevX + dx);
      let newY = Math.round(dragState.initialDevY + dy);

      if (snapToGrid) {
        newX = Math.round(newX / snapGridSize) * snapGridSize;
        newY = Math.round(newY / snapGridSize) * snapGridSize;
      }

      // Constrain within door boundaries
      const targetDev = controlPanel.devices.find((d) => d.id === dragState.deviceId);
      const halfW = targetDev ? targetDev.widthMm / 2 : 15;
      const halfH = targetDev ? targetDev.heightMm / 2 : 15;

      newX = Math.max(halfW + 15, Math.min(controlPanel.widthMm - halfW - 15, newX));
      newY = Math.max(halfH + 15, Math.min(controlPanel.heightMm - halfH - 15, newY));

      const updated = controlPanel.devices.map((d) => {
        if (d.id === dragState.deviceId) {
          return { ...d, xMm: newX, yMm: newY };
        }
        return d;
      });

      updateControlPanel({ ...controlPanel, devices: updated });
    } else if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDragState(null);
    setIsPanning(false);
  };

  // Canvas zoom
  const handleZoom = (factor: number) => {
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.35), 2.5));
  };

  const handleResetZoom = () => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
  };

  // Keyboard shortcut to delete selected device
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDeviceId) {
        e.preventDefault();
        handleRemoveDevice(selectedDeviceId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedDeviceId, controlPanel.devices]);

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    if (activeCatalogCategory === 'all') return CONTROL_PANEL_CATALOG;
    return CONTROL_PANEL_CATALOG.filter((i) => i.category === activeCatalogCategory);
  }, [activeCatalogCategory]);

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] text-slate-100 select-none overflow-hidden">
      {/* 1. TOP HEADER & WORKSPACE TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-950 border-b border-slate-800 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20 text-xs">
            🎛️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Painel de Controlo Frontal & HMI
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                {controlPanel.widthMm} × {controlPanel.heightMm} mm
              </span>
              {collisionIssues.some((c) => c.severity === 'error') && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800 flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span>Sobreposição</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Desenho da porta do armário com HMI, botões Ø22.5mm e mapa de furação para serralharia.
            </p>
          </div>
        </div>

        {/* Quick Actions & Navigation back to interior DIN chassis */}
        <div className="flex items-center gap-2">
          {onSwitchToInterior && (
            <button
              type="button"
              onClick={onSwitchToInterior}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold transition"
              title="Voltar à vista do interior do quadro elétrico (Calhas DIN e Disjuntores)"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Ver Interior DIN</span>
            </button>
          )}

          {/* Dimension Selector Quick Dropdown */}
          <div className="relative">
            <select
              value={`${controlPanel.widthMm}x${controlPanel.heightMm}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split('x').map(Number);
                handleDimensionPreset(w, h);
              }}
              className="h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 hover:border-slate-700 cursor-pointer focus:outline-hidden"
              title="Escolher dimensões normalizadas da porta / armário"
            >
              {PRESET_DIMENSIONS.map((preset) => (
                <option key={`${preset.width}x${preset.height}`} value={`${preset.width}x${preset.height}`}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Export Drilling CSV */}
          <button
            type="button"
            onClick={handleExportDrillingCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md shadow-emerald-950/60 transition active:scale-98"
            title="Descarregar lista de coordenadas X/Y para furar a chapa na oficina"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Furação (CSV)</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN SPLIT VIEW (Toolbar + Canvas + Side Inspector) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Interactive Canvas Viewport */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-[#090d16] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => {
            if (e.button === 0 && !dragState) {
              setIsPanning(true);
              setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => setSelectedDeviceId(null)}
        >
          {/* Subtle Grid Background */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
              backgroundSize: '25px 25px',
            }}
          />

          {/* Floating Canvas Controls (Zoom, Snap, Gasket, Align) */}
          <div className="absolute top-3 left-4 z-20 flex items-center gap-1 bg-slate-950/90 backdrop-blur-md border border-slate-800 px-2 py-1.5 rounded-xl shadow-xl text-xs font-mono">
            {/* Zoom Controls */}
            <button
              type="button"
              onClick={() => handleZoom(0.85)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-sky-400 font-bold min-w-[36px] text-center select-none text-[11px]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(1.15)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition text-[10px]"
              title="Ajustar ao Ecrã"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            {/* Snap Toggle */}
            <button
              type="button"
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                snapToGrid ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Ajustar automaticamente a coordenadas múltiplas"
            >
              <Grid className="w-3 h-3" />
              <span>Snap {snapGridSize}mm</span>
            </button>

            {/* Gasket Zone Toggle */}
            <button
              type="button"
              onClick={() => setShowGasketZone(!showGasketZone)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                showGasketZone ? 'bg-amber-600/40 text-amber-300 border border-amber-600/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Mostrar margem de vedação estanque da borracha IP65 (45mm)"
            >
              <Shield className="w-3 h-3" />
              <span>Zona IP65</span>
            </button>

            {/* Alignment Quick Tools */}
            {selectedDevice && (
              <>
                <div className="h-4 w-px bg-slate-800 mx-1" />
                <button
                  type="button"
                  onClick={handleAlignHorizontal}
                  className="px-2 py-0.5 bg-slate-850 hover:bg-slate-800 text-purple-300 rounded text-[11px] font-semibold transition border border-purple-500/40"
                  title="Alinhar outros botões da mesma linha à altura deste botão"
                >
                  Alinhar Linha
                </button>
                <button
                  type="button"
                  onClick={handleDistributeRow}
                  className="px-2 py-0.5 bg-slate-850 hover:bg-slate-800 text-sky-300 rounded text-[11px] font-semibold transition border border-sky-500/40"
                  title="Distribuir espaçamento uniforme na linha"
                >
                  Distribuir
                </button>
              </>
            )}
          </div>

          {/* Industrial Control Panel Door SVG Rendering */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: dragState || isPanning ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            <svg
              ref={svgRef}
              width={controlPanel.widthMm}
              height={controlPanel.heightMm}
              viewBox={`0 0 ${controlPanel.widthMm} ${controlPanel.heightMm}`}
              className="shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-visible"
              style={{ filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.7))' }}
            >
              {/* Gradients & Filters */}
              <defs>
                {/* RAL 7035 Industrial Textured Metal Powdercoat */}
                <linearGradient id="doorPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="35%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                <linearGradient id="doorBevel" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                {/* HMI Glossy Screen Glass */}
                <linearGradient id="hmiGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="40%" stopColor="#090d16" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>

                {/* Metallic Chrome Ring for Pushbuttons */}
                <linearGradient id="chromeRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e2e8f0" />
                  <stop offset="45%" stopColor="#64748b" />
                  <stop offset="55%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>

                {/* Emergency Stop Collar Yellow */}
                <radialGradient id="eStopYellow">
                  <stop offset="70%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ca8a04" />
                </radialGradient>
              </defs>

              {/* 1. Main Outer Door Body (with chamfered metallic edges) */}
              <rect
                x="0"
                y="0"
                width={controlPanel.widthMm}
                height={controlPanel.heightMm}
                rx="6"
                fill="url(#doorPlateGrad)"
                stroke="#64748b"
                strokeWidth="2.5"
              />

              {/* Inner Pressed Frame Border */}
              <rect
                x="8"
                y="8"
                width={controlPanel.widthMm - 16}
                height={controlPanel.heightMm - 16}
                rx="4"
                fill="none"
                stroke="#334155"
                strokeWidth="1.5"
              />

              {/* 2. Rubber Gasket Seal Boundary (45mm margin) */}
              {showGasketZone && (
                <rect
                  x="45"
                  y="45"
                  width={controlPanel.widthMm - 90}
                  height={controlPanel.heightMm - 90}
                  rx="3"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="1"
                  strokeDasharray="6,4"
                  opacity="0.4"
                />
              )}

              {/* 3. Door Hinges (Dobradiças Industriais) */}
              {controlPanel.hingeSide === 'left' ? (
                <>
                  {/* Top Hinge */}
                  <rect x="-6" y={Math.round(controlPanel.heightMm * 0.15)} width="8" height="50" rx="3" fill="#64748b" stroke="#334155" strokeWidth="1" />
                  <circle cx="-2" cy={Math.round(controlPanel.heightMm * 0.15) + 12} r="2" fill="#0f172a" />
                  <circle cx="-2" cy={Math.round(controlPanel.heightMm * 0.15) + 38} r="2" fill="#0f172a" />
                  {/* Bottom Hinge */}
                  <rect x="-6" y={Math.round(controlPanel.heightMm * 0.85) - 50} width="8" height="50" rx="3" fill="#64748b" stroke="#334155" strokeWidth="1" />
                  <circle cx="-2" cy={Math.round(controlPanel.heightMm * 0.85) - 38} r="2" fill="#0f172a" />
                  <circle cx="-2" cy={Math.round(controlPanel.heightMm * 0.85) - 12} r="2" fill="#0f172a" />
                </>
              ) : (
                <>
                  {/* Right Hinges */}
                  <rect x={controlPanel.widthMm - 2} y={Math.round(controlPanel.heightMm * 0.15)} width="8" height="50" rx="3" fill="#64748b" stroke="#334155" strokeWidth="1" />
                  <rect x={controlPanel.widthMm - 2} y={Math.round(controlPanel.heightMm * 0.85) - 50} width="8" height="50" rx="3" fill="#64748b" stroke="#334155" strokeWidth="1" />
                </>
              )}

              {/* 4. Quarter-Turn Lock Handle (Fecho de Maçaneta com Chave) */}
              <g transform={`translate(${controlPanel.hingeSide === 'left' ? controlPanel.widthMm - 26 : 26}, ${Math.round(controlPanel.heightMm / 2)})`}>
                <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                <rect x="-5" y="-18" width="10" height="36" rx="2" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
                <circle cx="0" cy="0" r="4" fill="#020617" />
                <line x1="-3" y1="0" x2="3" y2="0" stroke="#94a3b8" strokeWidth="1.2" />
              </g>

              {/* 5. Door Earth Stud (Perno de Ligação à Terra da Porta M6) */}
              <g transform={`translate(${controlPanel.hingeSide === 'left' ? 22 : controlPanel.widthMm - 22}, ${controlPanel.heightMm - 24})`}>
                <circle cx="0" cy="0" r="7" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
                <circle cx="0" cy="0" r="3" fill="#854d0e" />
                <text x="12" y="3" fill="#eab308" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold">PE</text>
              </g>

              {/* 6. Render All Devices on Panel */}
              {controlPanel.devices.map((dev) => {
                const isSelected = dev.id === selectedDeviceId;
                const hasError = collisionIssues.some((c) => c.deviceId === dev.id && c.severity === 'error');
                const hasWarning = collisionIssues.some((c) => c.deviceId === dev.id && c.severity === 'warning');

                return (
                  <g
                    key={dev.id}
                    transform={`translate(${dev.xMm}, ${dev.yMm})`}
                    onMouseDown={(e) => handleMouseDownDevice(e, dev)}
                    className="cursor-pointer group"
                  >
                    {/* Selected / Collision Outline Halo */}
                    {isSelected && (
                      <rect
                        x={-dev.widthMm / 2 - 8}
                        y={-dev.heightMm / 2 - 8}
                        width={dev.widthMm + 16}
                        height={dev.heightMm + (dev.label ? 36 : 16)}
                        rx="6"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeDasharray="4,3"
                        className="animate-pulse"
                      />
                    )}

                    {hasError && (
                      <rect
                        x={-dev.widthMm / 2 - 6}
                        y={-dev.heightMm / 2 - 6}
                        width={dev.widthMm + 12}
                        height={dev.heightMm + 12}
                        rx="4"
                        fill="#ef4444"
                        fillOpacity="0.2"
                        stroke="#ef4444"
                        strokeWidth="2"
                      />
                    )}

                    {/* ========================================================
                        TYPE A: HMI TOUCHSCREEN (Siemens / Weintek / Schneider)
                       ======================================================== */}
                    {dev.type === 'hmi' ? (
                      <g>
                        {/* Outer Industrial Bezel */}
                        <rect
                          x={-dev.widthMm / 2}
                          y={-dev.heightMm / 2}
                          width={dev.widthMm}
                          height={dev.heightMm}
                          rx="4"
                          fill="#1e293b"
                          stroke="#64748b"
                          strokeWidth="2"
                        />
                        {/* Screen Inset Bezel */}
                        <rect
                          x={-dev.widthMm / 2 + 10}
                          y={-dev.heightMm / 2 + 10}
                          width={dev.widthMm - 20}
                          height={dev.heightMm - 28}
                          rx="2"
                          fill="url(#hmiGlass)"
                          stroke="#020617"
                          strokeWidth="1.5"
                        />
                        {/* Brand Badge */}
                        <text
                          x={-dev.widthMm / 2 + 14}
                          y={-dev.heightMm / 2 + 22}
                          fill="#38bdf8"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono"
                        >
                          {dev.brand || 'SIEMENS'}
                        </text>

                        {/* Simulated HMI UI graphics */}
                        <rect
                          x={-dev.widthMm / 2 + 14}
                          y={-dev.heightMm / 2 + 28}
                          width={dev.widthMm - 28}
                          height={dev.heightMm - 50}
                          rx="1"
                          fill="#0f172a"
                        />
                        <text
                          x="0"
                          y={-dev.heightMm / 2 + 50}
                          fill="#22c55e"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="JetBrains Mono"
                        >
                          {dev.label || 'SISTEMA AUTOMÁTICO'}
                        </text>
                        {/* Status bar */}
                        <rect x={-dev.widthMm / 2 + 20} y={-dev.heightMm / 2 + 62} width={dev.widthMm - 40} height="12" rx="2" fill="#0284c7" fillOpacity="0.4" />
                        <text x="0" y={-dev.heightMm / 2 + 71} fill="#e0f2fe" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono">
                          ONLINE · PROFINET 192.168.0.1
                        </text>

                        {/* Tag Label at bottom of HMI */}
                        <text
                          x="0"
                          y={dev.heightMm / 2 - 6}
                          fill="#94a3b8"
                          fontSize="8"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="JetBrains Mono"
                        >
                          {dev.tag} ({dev.widthMm}×{dev.heightMm}mm)
                        </text>
                      </g>
                    ) : /* ========================================================
                        TYPE B: EMERGENCY STOP PUSHBUTTON (Cogumelo 40mm)
                       ======================================================== */
                    dev.type === 'emergency_stop' ? (
                      <g>
                        {/* Yellow Backing Plate Ø60mm */}
                        <circle cx="0" cy="0" r="28" fill="url(#eStopYellow)" stroke="#854d0e" strokeWidth="1.5" />
                        <text x="0" y="-17" fill="#0f172a" fontSize="5.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif" letterSpacing="0.5">
                          EMERGENCY STOP
                        </text>
                        <text x="0" y="22" fill="#0f172a" fontSize="5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                          PARAGEM
                        </text>

                        {/* Chrome Ring Bezel */}
                        <circle cx="0" cy="0" r="21" fill="url(#chromeRing)" />

                        {/* Red Mushroom Actuator Ø40mm */}
                        <circle cx="0" cy="0" r="19" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
                        <circle cx="0" cy="0" r="12" fill="#ef4444" />

                        {/* Rotation Arrows to Reset */}
                        <path d="M -6 -5 A 8 8 0 0 1 6 -5" fill="none" stroke="#fecaca" strokeWidth="1.2" strokeDasharray="3,2" />
                        <polygon points="6,-7 8,-5 6,-3" fill="#fecaca" />
                        <path d="M 6 5 A 8 8 0 0 1 -6 5" fill="none" stroke="#fecaca" strokeWidth="1.2" strokeDasharray="3,2" />
                        <polygon points="-6,7 -8,5 -6,3" fill="#fecaca" />
                      </g>
                    ) : /* ========================================================
                        TYPE C: ROTARY SELECTOR SWITCH (Man / Auto / 3-Pos)
                       ======================================================== */
                    dev.type === 'selector' ? (
                      <g>
                        {/* 22mm Chrome / Black Ring */}
                        <circle cx="0" cy="0" r="14" fill="url(#chromeRing)" stroke="#1e293b" strokeWidth="1" />
                        <circle cx="0" cy="0" r="12" fill="#0f172a" />
                        {/* Rotary Handle Knob */}
                        <rect x="-4" y="-12" width="8" height="24" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                        {/* Pointer line */}
                        <rect x="-1.5" y="-11" width="3" height="8" rx="1" fill="#ffffff" />
                        {/* Position indicators */}
                        <circle cx="-9" cy="-7" r="1.5" fill="#94a3b8" />
                        <circle cx="9" cy="-7" r="1.5" fill="#94a3b8" />
                      </g>
                    ) : /* ========================================================
                        TYPE D: PILOT LIGHT LED Ø22.5mm
                       ======================================================== */
                    dev.type === 'pilot_light' ? (
                      <g>
                        {/* Chrome Outer Bezel */}
                        <circle cx="0" cy="0" r="14" fill="url(#chromeRing)" stroke="#334155" strokeWidth="1" />
                        {/* Colored Fluted Lens */}
                        <circle
                          cx="0"
                          cy="0"
                          r="11"
                          fill={dev.color || '#22c55e'}
                          stroke="#ffffff"
                          strokeWidth="1"
                          strokeOpacity="0.4"
                        />
                        {/* Lens facets */}
                        <circle cx="0" cy="0" r="6" fill="#ffffff" fillOpacity="0.3" />
                        <line x1="-8" y1="0" x2="8" y2="0" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
                        <line x1="0" y1="-8" x2="0" y2="8" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
                      </g>
                    ) : /* ========================================================
                        TYPE E: DIGITAL PANEL METER (96x96 or 72x72)
                       ======================================================== */
                    dev.type === 'meter' ? (
                      <g>
                        <rect
                          x={-dev.widthMm / 2}
                          y={-dev.heightMm / 2}
                          width={dev.widthMm}
                          height={dev.heightMm}
                          rx="3"
                          fill="#0f172a"
                          stroke="#64748b"
                          strokeWidth="1.5"
                        />
                        {/* Bezel inner */}
                        <rect
                          x={-dev.widthMm / 2 + 6}
                          y={-dev.heightMm / 2 + 6}
                          width={dev.widthMm - 12}
                          height={dev.heightMm - 12}
                          rx="2"
                          fill="#020617"
                          stroke="#334155"
                        />
                        {/* 7-Segment Digital Display */}
                        <text x="0" y="-8" fill="#ef4444" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                          230.4 V
                        </text>
                        <text x="0" y="10" fill="#22c55e" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                          12.8 A
                        </text>
                        <text x="0" y="24" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                          2.94 kW
                        </text>
                      </g>
                    ) : /* ========================================================
                        TYPE F: STANDARD PUSHBUTTON Ø22.5mm
                       ======================================================== */
                    (
                      <g>
                        {/* Outer Chrome Bezel Ring */}
                        <circle cx="0" cy="0" r="14" fill="url(#chromeRing)" stroke="#1e293b" strokeWidth="1" />
                        {/* Actuator Button Face */}
                        <circle
                          cx="0"
                          cy="0"
                          r="11"
                          fill={dev.color || '#16a34a'}
                          stroke="#000000"
                          strokeWidth="1"
                          strokeOpacity="0.3"
                        />
                        {/* Soft button highlight */}
                        <circle cx="-3" cy="-3" r="5" fill="#ffffff" fillOpacity="0.25" />
                      </g>
                    )}

                    {/* Standard Engraved Nameplate (Plaqueta de Identificação em Acrílico Preto) */}
                    {dev.label && dev.type !== 'hmi' && (
                      <g transform={`translate(0, ${dev.heightMm / 2 + 10})`}>
                        <rect
                          x="-26"
                          y="0"
                          width="52"
                          height="14"
                          rx="1.5"
                          fill="#020617"
                          stroke="#475569"
                          strokeWidth="0.8"
                        />
                        <text
                          x="0"
                          y="9.5"
                          fill="#f8fafc"
                          fontSize="6.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="JetBrains Mono"
                          letterSpacing="0.2"
                        >
                          {dev.label}
                        </text>
                        {/* Tag Sub-badge */}
                        <text
                          x="0"
                          y="20"
                          fill="#64748b"
                          fontSize="6"
                          textAnchor="middle"
                          fontFamily="JetBrains Mono"
                        >
                          {dev.tag}
                        </text>
                      </g>
                    )}

                    {/* Dimension Marker Line from Top and Left on Selected Device */}
                    {isSelected && showDimensionGuides && (
                      <g className="pointer-events-none" opacity="0.8">
                        {/* Line to Left Edge */}
                        <line x1={-dev.widthMm / 2} y1="0" x2={-dev.xMm} y2="0" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />
                        <rect x={-dev.xMm / 2 - 18} y="-9" width="36" height="13" rx="2" fill="#020617" stroke="#38bdf8" strokeWidth="0.8" />
                        <text x={-dev.xMm / 2} y="0" fill="#38bdf8" fontSize="8" textAnchor="middle" dominantBaseline="middle" fontFamily="JetBrains Mono">
                          X:{dev.xMm}mm
                        </text>

                        {/* Line to Top Edge */}
                        <line x1="0" y1={-dev.heightMm / 2} x2="0" y2={-dev.yMm} stroke="#a855f7" strokeWidth="1" strokeDasharray="3,3" />
                        <rect x="-18" y={-dev.yMm / 2 - 6} width="36" height="13" rx="2" fill="#020617" stroke="#a855f7" strokeWidth="0.8" />
                        <text x="0" y={-dev.yMm / 2} fill="#c084fc" fontSize="8" textAnchor="middle" dominantBaseline="middle" fontFamily="JetBrains Mono">
                          Y:{dev.yMm}mm
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Inspector & Tools Sidebar */}
        <div className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0 overflow-hidden text-xs">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-800 bg-slate-900/60 p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 py-1.5 px-2 rounded font-semibold text-center transition ${
                activeTab === 'catalog' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Catálogo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('properties')}
              className={`flex-1 py-1.5 px-2 rounded font-semibold text-center transition ${
                activeTab === 'properties' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Item ({selectedDevice ? selectedDevice.tag : '—'})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('drilling')}
              className={`flex-1 py-1.5 px-2 rounded font-semibold text-center transition ${
                activeTab === 'drilling' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Furação
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dimensions')}
              className={`flex-1 py-1.5 px-2 rounded font-semibold text-center transition ${
                activeTab === 'dimensions' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Medidas
            </button>
          </div>

          {/* TAB 1: CATALOG OF CONTROL PANEL DEVICES */}
          {activeTab === 'catalog' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'hmi', label: 'HMI 7"-12"' },
                  { id: 'pushbutton', label: 'Botões 22mm' },
                  { id: 'emergency_stop', label: 'Emergência' },
                  { id: 'selector', label: 'Seletores' },
                  { id: 'pilot_light', label: 'Sinalizadores' },
                  { id: 'meter', label: 'Instrumentos' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCatalogCategory(cat.id)}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                      activeCatalogCategory === cat.id
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {filteredCatalog.map((item) => (
                  <div
                    key={item.name}
                    className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 rounded-xl transition space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white text-xs">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.brand} · Ref: {item.partNumber}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400 font-mono shrink-0">
                        {(item.priceEur ?? 0).toFixed(2)} €
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 leading-snug">
                      {item.description}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.cutoutType === 'round' ? `Furo Ø${item.holeDiameterMm}mm` : `Recorte ${item.widthMm}×${item.heightMm}mm`}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAddDevice(item)}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-[11px] transition flex items-center gap-1 active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Inserir</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: DEVICE PROPERTIES & COORDINATES */}
          {activeTab === 'properties' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {selectedDevice ? (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] text-sky-400 font-mono uppercase font-bold">Dispositivo Selecionado</span>
                      <h4 className="text-sm font-bold text-white">{selectedDevice.tag}: {selectedDevice.name}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDevice(selectedDevice.id)}
                      className="p-1.5 text-red-400 hover:text-white hover:bg-red-950/60 rounded border border-red-900 transition"
                      title="Eliminar dispositivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Exact Coordinates Inputs */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 block">Posicionamento Preciso (mm)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Coord. X (Margem Esq.)</label>
                        <input
                          type="number"
                          value={selectedDevice.xMm}
                          onChange={(e) => {
                            const val = Math.max(20, Math.min(controlPanel.widthMm - 20, Number(e.target.value)));
                            const updated = controlPanel.devices.map((d) => d.id === selectedDevice.id ? { ...d, xMm: val } : d);
                            updateControlPanel({ ...controlPanel, devices: updated });
                          }}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-sky-400 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Coord. Y (Margem Topo)</label>
                        <input
                          type="number"
                          value={selectedDevice.yMm}
                          onChange={(e) => {
                            const val = Math.max(20, Math.min(controlPanel.heightMm - 20, Number(e.target.value)));
                            const updated = controlPanel.devices.map((d) => d.id === selectedDevice.id ? { ...d, yMm: val } : d);
                            updateControlPanel({ ...controlPanel, devices: updated });
                          }}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-purple-400 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Identification & Engraved Plaque Label */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-300 block">Identificação & Plaqueta</span>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Identificador (Tag)</label>
                      <input
                        type="text"
                        value={selectedDevice.tag}
                        onChange={(e) => {
                          const updated = controlPanel.devices.map((d) => d.id === selectedDevice.id ? { ...d, tag: e.target.value.toUpperCase() } : d);
                          updateControlPanel({ ...controlPanel, devices: updated });
                        }}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-white text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Texto Gravado na Plaqueta</label>
                      <input
                        type="text"
                        value={selectedDevice.label || ''}
                        onChange={(e) => {
                          const updated = controlPanel.devices.map((d) => d.id === selectedDevice.id ? { ...d, label: e.target.value.toUpperCase() } : d);
                          updateControlPanel({ ...controlPanel, devices: updated });
                        }}
                        placeholder="Ex: ARRANQUE, PARAGEM, EM MARCHA"
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  {/* Alignment & Actions */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleDuplicateDevice(selectedDevice)}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 font-semibold rounded-lg border border-slate-800 transition flex items-center justify-center gap-1.5 text-[11px]"
                    >
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                      <span>Duplicar Dispositivo</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 space-y-2 text-slate-400">
                  <Move className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="font-semibold text-slate-300">Nenhum componente selecionado</p>
                  <p className="text-[11px]">
                    Clique em qualquer botão ou ecrã no painel gráfico para inspecionar e editar as coordenadas.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DRILLING / FURAÇÃO TABLE (CNC / WORKSHOP) */}
          {activeTab === 'drilling' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">Tabela de Furação CNC</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{controlPanel.devices.length} Furos / Recortes</span>
                </div>
                <button
                  type="button"
                  onClick={handleExportDrillingCsv}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {controlPanel.devices.map((d, idx) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      setSelectedDeviceId(d.id);
                      setActiveTab('properties');
                    }}
                    className={`p-2 rounded-lg border transition cursor-pointer text-[11px] ${
                      d.id === selectedDeviceId
                        ? 'bg-sky-950/60 border-sky-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span className="text-sky-400">#{idx + 1} {d.tag}</span>
                      <span className="text-slate-400 text-[10px]">
                        X:{d.xMm}mm · Y:{d.yMm}mm
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {d.cutoutType === 'round' ? `Furação Circular Ø${d.holeDiameterMm || 22.5}mm` : `Recorte HMI ${d.widthMm}×${d.heightMm}mm`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ENCLOSURE & DOOR DIMENSIONS */}
          {activeTab === 'dimensions' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div>
                <h4 className="font-bold text-white text-xs">Dimensões da Porta / Painel</h4>
                <p className="text-[11px] text-slate-400">Ajuste as medidas da chapa conforme a carcaça do projeto.</p>
              </div>

              {/* Custom Width & Height Inputs */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-semibold">Largura da Porta</span>
                    <span className="text-sky-400 font-mono font-bold">{controlPanel.widthMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="1600"
                    step="50"
                    value={controlPanel.widthMm}
                    onChange={(e) => handleDimensionPreset(Number(e.target.value), controlPanel.heightMm)}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-semibold">Altura da Porta</span>
                    <span className="text-purple-400 font-mono font-bold">{controlPanel.heightMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="400"
                    max="2200"
                    step="50"
                    value={controlPanel.heightMm}
                    onChange={(e) => handleDimensionPreset(controlPanel.widthMm, Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Hinge Side & Finish */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-300 block">Opções Construtivas</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Lado das Dobradiças</span>
                  <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800">
                    <button
                      type="button"
                      onClick={() => updateControlPanel({ ...controlPanel, hingeSide: 'left' })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        controlPanel.hingeSide === 'left' ? 'bg-sky-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Esquerda
                    </button>
                    <button
                      type="button"
                      onClick={() => updateControlPanel({ ...controlPanel, hingeSide: 'right' })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        controlPanel.hingeSide === 'right' ? 'bg-sky-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Direita
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset to Factory Setup */}
              <button
                type="button"
                onClick={handleResetToDefault}
                className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition text-[11px] flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Repor Layout Padrão</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
