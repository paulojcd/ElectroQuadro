import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ProjectState, PlacedComponent, DinRail, CatalogItem, WireConnection, SimulationState, CableGland, GlandMetric, GlandLocation, GlandCircuitType, ControlPanelConfig, ControlPanelDevice } from '../types/electrical';
import { COMPONENT_CATALOG } from '../data/componentLibrary';
import { getDefaultControlPanelConfig } from '../data/controlPanelCatalog';
import { 
  generateDefaultWires, 
  simulateCircuit, 
  createInitialSimulationState, 
  WIRE_COLORS 
} from '../utils/wireSimulator';
import { 
  getDefaultGlands, 
  GLAND_SPECS, 
  CIRCUIT_TYPE_INFO, 
  autoDistributeGlands 
} from '../utils/glandUtils';
import { GlandScheduleModal } from './GlandScheduleModal';
import { AutoLayoutModal } from './AutoLayoutModal';
import { checkThermalCompliance, THERMAL_SPECS } from '../utils/autoLayoutUtils';
import { 
  Plus, Trash2, ArrowLeft, ArrowRight, Zap, Cpu, Settings2, Sliders, 
  CheckCircle, AlertTriangle, Sparkles, Check, Layers, Box,
  ZoomIn, ZoomOut, Maximize2, Minimize2, Download, Activity, Power, RotateCcw,
  Eye, EyeOff, Radio, Wrench, ArrowUpCircle, ArrowDownCircle, Save, FileCode, FileText, PlusCircle, Ruler, Tag,
  Magnet, Grid, FileSpreadsheet, Printer, Copy, BookOpen, ShieldAlert, ListChecks, Clock, Wind, Flame, Table,
  DoorClosed, Move, ExternalLink, Scissors, SlidersHorizontal, ChevronDown, ChevronUp, Layout
} from 'lucide-react';
import { useComponentCatalog } from '../utils/customComponentStorage';
import { 
  ComponentTerminalAnchor, 
  getAllProjectTerminals, 
  deduceWireProperties, 
  generateNextWireTag 
} from '../utils/terminalLayoutUtils';
import { routeManhattanWire } from '../utils/manhattanRouter';
import { WiringListModal } from './WiringListModal';
import { exportWiringListToCsv, getProjectWiringList } from '../utils/wiringListExporter';
import { ComponentTechnicalTooltip } from './ComponentTechnicalTooltip';

export interface HmiPresetSpec {
  id: string;
  name: string;
  brand: string;
  widthMm: number; // Bezel
  heightMm: number; // Bezel
  cutoutWidthMm: number; // Furação CNC
  cutoutHeightMm: number; // Furação CNC
  depthMm: number; // Profundidade interior
  diagonalInches: string;
}

export const HMI_PRESETS: HmiPresetSpec[] = [
  {
    id: 'siemens_ktp700',
    name: 'Siemens SIMATIC KTP700 Basic 7"',
    brand: 'Siemens',
    widthMm: 214,
    heightMm: 158,
    cutoutWidthMm: 198,
    cutoutHeightMm: 142,
    depthMm: 50,
    diagonalInches: '7.0"',
  },
  {
    id: 'siemens_ktp1200',
    name: 'Siemens SIMATIC KTP1200 Basic 12"',
    brand: 'Siemens',
    widthMm: 310,
    heightMm: 221,
    cutoutWidthMm: 293,
    cutoutHeightMm: 205,
    depthMm: 60,
    diagonalInches: '12.0"',
  },
  {
    id: 'weintek_cmt3072',
    name: 'Weintek cMT3072XH 7" Cloud HMI',
    brand: 'Weintek',
    widthMm: 192,
    heightMm: 138,
    cutoutWidthMm: 175,
    cutoutHeightMm: 121,
    depthMm: 48,
    diagonalInches: '7.0"',
  },
  {
    id: 'schneider_st6400',
    name: 'Schneider Harmony ST6 7" Wide',
    brand: 'Schneider Electric',
    widthMm: 190,
    heightMm: 135,
    cutoutWidthMm: 175,
    cutoutHeightMm: 120,
    depthMm: 52,
    diagonalInches: '7.0"',
  },
  {
    id: 'omron_nb7w',
    name: 'Omron NB7W-TW00B 7" TFT',
    brand: 'Omron',
    widthMm: 202,
    heightMm: 148,
    cutoutWidthMm: 191,
    cutoutHeightMm: 137,
    depthMm: 54,
    diagonalInches: '7.0"',
  },
];

interface CabinetLayoutProps {
  project: ProjectState;
  onUpdateProject: (updated: ProjectState) => void;
  onOpenCatalog: (railIndex: number) => void;
  onAddComponent?: (item: CatalogItem, railIndex: number, quantity?: number) => void;
  onOpenNewProject?: () => void;
  onOpenLibraryManager?: () => void;
  onOpenPrintModal?: () => void;
  onOpenLabelPrint?: () => void;
  onOpenWiringList?: () => void;
  onOpenSchematicPdf?: () => void;
  onExportUnifilarPdf?: () => void;
  onExportBomExcel?: () => void;
  onOpenIecAssistant?: () => void;
  onOpenWireCalc?: () => void;
  onOpenIpIkVerification?: () => void;
  onOpenCadExport?: () => void;
  onOpenIdMap?: () => void;
  onOpenStandaloneGuide?: () => void;
  onOpenControlPanel?: () => void;
  isImmersiveMode?: boolean;
  onToggleImmersiveMode?: () => void;
  onQuickSave?: () => void;

  // Controlled layout & wiring states from top Ribbon
  snapToGrid?: boolean;
  onToggleSnap?: () => void;
  showWiring?: boolean;
  onToggleWiring?: () => void;
  isWiringMode?: boolean;
  onToggleWiringMode?: () => void;
  showWireTags?: boolean;
  onToggleWireTags?: () => void;
  wireRouteStyle?: 'ducts' | 'direct';
  onToggleWireRouteStyle?: () => void;
  showHmiDoorOverlay?: boolean;
  onToggleHmiDoorOverlay?: () => void;
  showThermalZones?: boolean;
  onToggleThermalZones?: () => void;
  isAutoLayoutModalOpen?: boolean;
  onCloseAutoLayoutModal?: () => void;
  isGlandModalOpen?: boolean;
  onCloseGlandModal?: () => void;
}

const truncateText = (text: string | undefined | null, maxChars: number): string => {
  if (!text) return '';
  if (maxChars <= 0) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 1)) + '…';
};

export const CabinetLayout: React.FC<CabinetLayoutProps> = ({
  project,
  onUpdateProject,
  onOpenCatalog,
  onAddComponent,
  onOpenNewProject,
  onOpenLibraryManager,
  onOpenPrintModal,
  onOpenLabelPrint,
  onOpenWiringList,
  onOpenSchematicPdf,
  onExportUnifilarPdf,
  onExportBomExcel,
  onOpenIecAssistant,
  onOpenWireCalc,
  onOpenIpIkVerification,
  onOpenCadExport,
  onOpenIdMap,
  onOpenStandaloneGuide,
  onOpenControlPanel,
  isImmersiveMode = false,
  onToggleImmersiveMode,
  onQuickSave,

  snapToGrid: controlledSnapToGrid,
  onToggleSnap: controlledOnToggleSnap,
  showWiring: controlledShowWiring,
  onToggleWiring: controlledOnToggleWiring,
  isWiringMode: controlledIsWiringMode,
  onToggleWiringMode: controlledOnToggleWiringMode,
  showWireTags: controlledShowWireTags,
  onToggleWireTags: controlledOnToggleWireTags,
  wireRouteStyle: controlledWireRouteStyle,
  onToggleWireRouteStyle: controlledOnToggleWireRouteStyle,
  showHmiDoorOverlay: controlledShowHmiDoorOverlay,
  onToggleHmiDoorOverlay: controlledOnToggleHmiDoorOverlay,
  showThermalZones: controlledShowThermalZones,
  onToggleThermalZones: controlledOnToggleThermalZones,
  isAutoLayoutModalOpen: controlledIsAutoLayoutModalOpen,
  onCloseAutoLayoutModal,
  isGlandModalOpen: controlledIsGlandModalOpen,
  onCloseGlandModal,
}) => {
  const { allComponents, customComponents } = useComponentCatalog();
  const [selectedItem, setSelectedItem] = useState<PlacedComponent | null>(null);
  const [selectedRailIndex, setSelectedRailIndex] = useState<number | null>(null);
  const [activeSideTab, setActiveSideTab] = useState<'quick_add' | 'item_details' | 'enclosure_size' | 'glands' | 'project_notes'>('quick_add');
  const [isFloatingDrawerOpen, setIsFloatingDrawerOpen] = useState(false);
  const [notesSubTab, setNotesSubTab] = useState<'editor' | 'templates' | 'structured'>('editor');
  const [copiedNotes, setCopiedNotes] = useState(false);
  const [quickRailIdx, setQuickRailIdx] = useState<number>(0);
  const [quickCategory, setQuickCategory] = useState<'custom' | 'generic' | 'meanwell' | 'siemens' | 'viking' | 'relays'>('generic');
  const [recentNotification, setRecentNotification] = useState<string | null>(null);

  const [internalIsGlandModalOpen, setInternalIsGlandModalOpen] = useState(false);
  const isGlandModalOpen = controlledIsGlandModalOpen !== undefined ? controlledIsGlandModalOpen : internalIsGlandModalOpen;
  const setIsGlandModalOpen = (val: boolean | ((p: boolean) => boolean)) => {
    if (onCloseGlandModal && !val) onCloseGlandModal();
    else setInternalIsGlandModalOpen(val);
  };

  const [isWiringListModalOpen, setIsWiringListModalOpen] = useState(false);
  const [selectedGlandId, setSelectedGlandId] = useState<string | null>(null);

  const [internalIsAutoLayoutModalOpen, setInternalIsAutoLayoutModalOpen] = useState(false);
  const isAutoLayoutModalOpen = controlledIsAutoLayoutModalOpen !== undefined ? controlledIsAutoLayoutModalOpen : internalIsAutoLayoutModalOpen;
  const setIsAutoLayoutModalOpen = (val: boolean | ((p: boolean) => boolean)) => {
    if (onCloseAutoLayoutModal && !val) onCloseAutoLayoutModal();
    else setInternalIsAutoLayoutModalOpen(val);
  };

  const [internalShowThermalZones, setInternalShowThermalZones] = useState(false);
  const showThermalZones = controlledShowThermalZones !== undefined ? controlledShowThermalZones : internalShowThermalZones;
  const setShowThermalZones = (val: boolean | ((p: boolean) => boolean)) => {
    if (controlledOnToggleThermalZones) controlledOnToggleThermalZones();
    else setInternalShowThermalZones(val);
  };
  const [hoveredComponentInfo, setHoveredComponentInfo] = useState<{
    item: PlacedComponent;
    railIndex: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  // Thermal compliance evaluation
  const thermalAssessment = useMemo(() => checkThermalCompliance(project.rails), [project.rails]);

  // Snap-to-grid & Magnetic alignment system (5mm uniform spacing)
  const [internalSnapToGrid, setInternalSnapToGrid] = useState<boolean>(true);
  const snapToGrid = controlledSnapToGrid !== undefined ? controlledSnapToGrid : internalSnapToGrid;
  const setSnapToGrid = (val: boolean | ((p: boolean) => boolean)) => {
    if (controlledOnToggleSnap) controlledOnToggleSnap();
    else setInternalSnapToGrid(val);
  };
  const [snapSpacingMm, setSnapSpacingMm] = useState<number>(5);
  const [dragState, setDragState] = useState<{
    item: PlacedComponent;
    railIndex: number;
    railWidth: number;
    startSvgX: number;
    initialCompX: number;
    currentCompX: number;
    snapGuideX: number | null;
    snapGuideLabel: string | null;
  } | null>(null);

  // Zoom and Pan states for interactive cabinet exploration
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const cabinetSvgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Wiring and live simulation state
  const [internalShowWiring, setInternalShowWiring] = useState<boolean>(true);
  const showWiring = controlledShowWiring !== undefined ? controlledShowWiring : internalShowWiring;
  const setShowWiring = (val: boolean | ((p: boolean) => boolean)) => {
    if (controlledOnToggleWiring) controlledOnToggleWiring();
    else setInternalShowWiring(val);
  };

  const [internalShowWireTags, setInternalShowWireTags] = useState<boolean>(true);
  const showWireTags = controlledShowWireTags !== undefined ? controlledShowWireTags : internalShowWireTags;
  const setShowWireTags = (val: boolean | ((p: boolean) => boolean)) => {
    if (controlledOnToggleWireTags) controlledOnToggleWireTags();
    else setInternalShowWireTags(val);
  };

  const [internalIsWiringMode, setInternalIsWiringMode] = useState<boolean>(false);
  const isWiringMode = controlledIsWiringMode !== undefined ? controlledIsWiringMode : internalIsWiringMode;
  const setIsWiringMode = (val: boolean | ((p: boolean) => boolean)) => {
    if (controlledOnToggleWiringMode) controlledOnToggleWiringMode();
    else setInternalIsWiringMode(val);
  };
  const [wireDragState, setWireDragState] = useState<{
    fromAnchor: ComponentTerminalAnchor;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    hoveredAnchor: ComponentTerminalAnchor | null;
  } | null>(null);
  const [selectedWire, setSelectedWire] = useState<WireConnection | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [internalWireRouteStyle, setInternalWireRouteStyle] = useState<'ducts' | 'direct'>('ducts');
  const wireRouteStyle = controlledWireRouteStyle !== undefined ? controlledWireRouteStyle : internalWireRouteStyle;
  const setWireRouteStyle = (val: 'ducts' | 'direct' | ((p: 'ducts' | 'direct') => 'ducts' | 'direct')) => {
    if (controlledOnToggleWireRouteStyle) controlledOnToggleWireRouteStyle();
    else setInternalWireRouteStyle(val);
  };
  const [simState, setSimState] = useState<SimulationState>(createInitialSimulationState);

  // All interactive terminal anchors across all components in current project
  const allProjectTerminals = useMemo(() => {
    return getAllProjectTerminals(project);
  }, [project]);

  // Derived wires and circuit simulation (pure, reactive, zero infinite loop risk)
  const baseWires = useMemo(() => generateDefaultWires(project), [project]);
  const { updatedWires, updatedState } = useMemo(() => {
    return simulateCircuit(project, baseWires, simState);
  }, [project, baseWires, simState]);

  // Circuit Tracing & Isolation state: checks if a wire is focused / connected to selected component
  const isWireHighlighted = (wire: WireConnection): boolean => {
    if (selectedWire && selectedWire.id === wire.id) return true;
    if (hoveredWireId && hoveredWireId === wire.id) return true;
    if (
      selectedItem &&
      (wire.fromComponentId === selectedItem.instanceId ||
        wire.toComponentId === selectedItem.instanceId ||
        wire.fromComponentTag === selectedItem.tag ||
        wire.toComponentTag === selectedItem.tag)
    ) {
      return true;
    }
    return false;
  };

  const hasAnyWireFocus = Boolean(
    selectedWire ||
      hoveredWireId ||
      (selectedItem &&
        updatedWires.some(
          (w) =>
            w.fromComponentId === selectedItem.instanceId ||
            w.toComponentId === selectedItem.instanceId ||
            w.fromComponentTag === selectedItem.tag ||
            w.toComponentTag === selectedItem.tag
        ))
  );

  // Non-passive wheel event listener on containerRef for 100% reliable zoom across all browsers & trackpads
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom((prev) => Math.min(Math.max(Number((prev * zoomFactor).toFixed(2)), 0.35), 4.0));
    };
    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelNative);
  }, []);

  // Keyboard shortcuts (+, -, 0, f)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((prev) => Math.min(Number((prev * 1.15).toFixed(2)), 4.0));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom((prev) => Math.max(Number((prev * 0.85).toFixed(2)), 0.35));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFitToScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project.config.widthMm, project.config.heightMm]);

  const handleZoom = (factor: number) => {
    setHoveredComponentInfo(null);
    setZoom((prev) => Math.min(Math.max(Number((prev * factor).toFixed(2)), 0.35), 4.0));
  };

  const handleResetZoom = () => {
    setHoveredComponentInfo(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    if (!containerRef.current) return;
    setHoveredComponentInfo(null);
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleW = (clientWidth - 60) / project.config.widthMm;
    const scaleH = (clientHeight - 60) / project.config.heightMm;
    const fitScale = Math.min(scaleW, scaleH, 1.4);
    setZoom(Number(Math.max(fitScale, 0.4).toFixed(2)));
    setPan({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    setHoveredComponentInfo(null);
    setZoom((prev) => (prev >= 1.7 ? 1.0 : Number((prev * 1.35).toFixed(2))));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setHasMoved(false);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setHoveredComponentInfo(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - startPan.x;
      const dy = e.clientY - startPan.y;
      if (Math.abs(dx - pan.x) > 3 || Math.abs(dy - pan.y) > 3) {
        setHasMoved(true);
      }
      setPan({ x: dx, y: dy });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleExportCabinetSvg = () => {
    if (!cabinetSvgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(cabinetSvgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.config.projectCode || 'quadro'}_disposicao_2d.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const { config, rails } = project;

  // Fundamental CAD Rule: NO TWO ELECTRICAL COMPONENTS CAN EVER OVERLAP ON A DIN RAIL
  const resolveRailNonOverlapping = (
    items: PlacedComponent[],
    spacingMm: number = 5,
    railWidth?: number
  ): PlacedComponent[] => {
    if (items.length <= 1) {
      return items.map((it) => ({
        ...it,
        positionMm: Math.max(10, it.positionMm || 10),
      }));
    }

    // Sort items by positionMm so sequential order on rail is preserved
    const sorted = [...items].sort((a, b) => a.positionMm - b.positionMm);

    let curX = 10;
    const resolved = sorted.map((it) => {
      // Must start at least at curX (which includes previous component width + spacingMm)
      const validX = Math.max(curX, it.positionMm);
      curX = validX + it.data.widthMm + spacingMm;
      return { ...it, positionMm: validX };
    });

    // If components exceeded rail width, pack tightly from 10mm with exact uniform spacing
    if (railWidth && curX > railWidth + 5) {
      let packX = 10;
      return resolved.map((it) => {
        const p = { ...it, positionMm: packX };
        packX += it.data.widthMm + spacingMm;
        return p;
      });
    }

    return resolved;
  };

  // Proactively eliminate any pre-existing overlapping components on all rails
  useEffect(() => {
    let hasOverlaps = false;
    const cleanedRails = project.rails.map((rail) => {
      if (rail.items.length <= 1) return rail;
      const sorted = [...rail.items].sort((a, b) => a.positionMm - b.positionMm);
      let needsFix = false;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].positionMm < sorted[i - 1].positionMm + sorted[i - 1].data.widthMm + 0.5) {
          needsFix = true;
          hasOverlaps = true;
          break;
        }
      }
      if (!needsFix) return rail;
      return {
        ...rail,
        items: resolveRailNonOverlapping(rail.items, 5, rail.usableWidthMm),
      };
    });

    if (hasOverlaps) {
      onUpdateProject({ ...project, rails: cleanedRails });
    }
  }, [project.rails]);

  const handleNudgeItem = (instanceId: string, deltaMm: number) => {
    const targetRail = rails.find((r) => r.items.some((it) => it.instanceId === instanceId));
    if (!targetRail) return;

    const item = targetRail.items.find((it) => it.instanceId === instanceId);
    if (!item) return;

    const newX = Math.max(10, item.positionMm + deltaMm);
    const updatedItems = targetRail.items.map((it) =>
      it.instanceId === instanceId ? { ...it, positionMm: newX } : it
    );

    const resolved = resolveRailNonOverlapping(updatedItems, 5, targetRail.usableWidthMm);
    const updatedRails = rails.map((r) => (r.id === targetRail.id ? { ...r, items: resolved } : r));
    onUpdateProject({ ...project, rails: updatedRails });

    const placed = resolved.find((it) => it.instanceId === instanceId);
    if (placed) setSelectedItem(placed);
  };

  const handleSetItemPosition = (instanceId: string, newPositionMm: number) => {
    const targetRail = rails.find((r) => r.items.some((it) => it.instanceId === instanceId));
    if (!targetRail) return;

    const newX = Math.max(10, newPositionMm);
    const updatedItems = targetRail.items.map((it) =>
      it.instanceId === instanceId ? { ...it, positionMm: newX } : it
    );

    const resolved = resolveRailNonOverlapping(updatedItems, 5, targetRail.usableWidthMm);
    const updatedRails = rails.map((r) => (r.id === targetRail.id ? { ...r, items: resolved } : r));
    onUpdateProject({ ...project, rails: updatedRails });

    const placed = resolved.find((it) => it.instanceId === instanceId);
    if (placed) setSelectedItem(placed);
  };

  // Convert screen/client coordinates to SVG workspace units (1 unit = 1 mm)
  const getSvgCoordinates = (clientX: number, clientY: number) => {
    if (!cabinetSvgRef.current) return { x: 0, y: 0 };
    const svg = cabinetSvgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const screenCTM = svg.getScreenCTM();
    if (screenCTM) {
      const transformed = pt.matrixTransform(screenCTM.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    return { x: 0, y: 0 };
  };

  // Calculate position with snap-to-grid & magnetic alignment (5mm uniform spacing)
  const calculateSnappedPosition = (
    rawX: number,
    railIndex: number,
    movingInstanceId: string,
    compWidth: number,
    railWidth: number,
    spacing: number = 5,
    isSnapEnabled: boolean = true
  ): { x: number; guideX: number | null; guideLabel: string | null } => {
    const minX = 10;
    const maxX = Math.max(minX, railWidth - compWidth - 5);
    const clampedRaw = Math.max(5, Math.min(maxX + 10, rawX));

    if (!isSnapEnabled) {
      return {
        x: Math.max(minX, Math.min(maxX, Math.round(clampedRaw))),
        guideX: null,
        guideLabel: null,
      };
    }

    const rail = rails[railIndex];
    if (!rail) return { x: clampedRaw, guideX: null, guideLabel: null };

    const otherItems = rail.items.filter((it) => it.instanceId !== movingInstanceId);
    const snapThreshold = 14; // mm magnetic attraction radius

    let bestDist = Math.abs(clampedRaw - 10);
    let bestX = 10;
    let bestGuideX: number | null = 10;
    let bestLabel: string | null = 'Início da Calha (10mm)';

    // Magnetic snap to neighboring components with uniform spacing (5mm)
    otherItems.forEach((other) => {
      // Snap to right of other with spacing (5mm)
      const rightSnap = other.positionMm + other.data.widthMm + spacing;
      const distRight = Math.abs(clampedRaw - rightSnap);
      if (distRight < bestDist) {
        bestDist = distRight;
        bestX = rightSnap;
        bestGuideX = rightSnap;
        bestLabel = `Espaçamento Magnético 5mm de ${other.tag}`;
      }

      // Snap to left of other with spacing (5mm)
      const leftSnap = other.positionMm - compWidth - spacing;
      const distLeft = Math.abs(clampedRaw - leftSnap);
      if (distLeft < bestDist) {
        bestDist = distLeft;
        bestX = leftSnap;
        bestGuideX = leftSnap + compWidth;
        bestLabel = `Espaçamento Magnético 5mm de ${other.tag}`;
      }

      // Flush contact (0mm) if both are terminals
      if (other.data.category === 'terminals') {
        const flushRight = other.positionMm + other.data.widthMm;
        if (Math.abs(clampedRaw - flushRight) < bestDist) {
          bestDist = Math.abs(clampedRaw - flushRight);
          bestX = flushRight;
          bestGuideX = flushRight;
          bestLabel = `Encostado (0mm) a ${other.tag}`;
        }
      }
    });

    // Snap to 5mm grid multiples if not close to neighbor
    const gridSnapX = Math.round(clampedRaw / 5) * 5;
    const distGrid = Math.abs(clampedRaw - gridSnapX);
    if (bestDist > snapThreshold && distGrid <= 6) {
      bestDist = distGrid;
      bestX = gridSnapX;
      bestGuideX = gridSnapX;
      bestLabel = `Grelha 5mm (${gridSnapX}mm)`;
    }

    if (bestDist <= snapThreshold) {
      const finalX = Math.max(minX, Math.min(maxX, bestX));
      return { x: finalX, guideX: bestGuideX, guideLabel: bestLabel };
    }

    return {
      x: Math.max(minX, Math.min(maxX, Math.round(clampedRaw))),
      guideX: null,
      guideLabel: null,
    };
  };

  // Start dragging component along the DIN rail
  const handleStartDragItem = (
    e: React.MouseEvent,
    item: PlacedComponent,
    railIndex: number,
    railWidth: number
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setIsPanning(false);
    setHoveredComponentInfo(null);

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    setDragState({
      item,
      railIndex,
      railWidth,
      startSvgX: coords.x,
      initialCompX: item.positionMm,
      currentCompX: item.positionMm,
      snapGuideX: null,
      snapGuideLabel: null,
    });
    setSelectedItem(item);
  };

  // Global window listeners for drag & drop snapping
  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (e: MouseEvent) => {
      const svgCoords = getSvgCoordinates(e.clientX, e.clientY);
      const deltaX = svgCoords.x - dragState.startSvgX;
      const rawCompX = dragState.initialCompX + deltaX;

      const snapResult = calculateSnappedPosition(
        rawCompX,
        dragState.railIndex,
        dragState.item.instanceId,
        dragState.item.data.widthMm,
        dragState.railWidth,
        snapSpacingMm,
        snapToGrid
      );

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentCompX: snapResult.x,
              snapGuideX: snapResult.guideX,
              snapGuideLabel: snapResult.guideLabel,
            }
          : null
      );
    };

    const onMouseUp = () => {
      if (dragState) {
        const finalX = dragState.currentCompX;
        const targetRail = rails[dragState.railIndex];
        if (targetRail) {
          const otherItems = targetRail.items.filter((it) => it.instanceId !== dragState.item.instanceId);
          const compCenter = finalX + dragState.item.data.widthMm / 2;

          let insertIdx = 0;
          while (
            insertIdx < otherItems.length &&
            compCenter > otherItems[insertIdx].positionMm + otherItems[insertIdx].data.widthMm / 2
          ) {
            insertIdx++;
          }

          const reordered = [
            ...otherItems.slice(0, insertIdx),
            { ...dragState.item, positionMm: finalX },
            ...otherItems.slice(insertIdx),
          ];

          const resolved = resolveRailNonOverlapping(reordered, 5, targetRail.usableWidthMm);

          const updatedRails = rails.map((r, i) =>
            i === dragState.railIndex ? { ...r, items: resolved } : r
          );
          onUpdateProject({ ...project, rails: updatedRails });

          const placed = resolved.find((it) => it.instanceId === dragState.item.instanceId);
          if (placed) setSelectedItem(placed);
        }
        setDragState(null);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, snapToGrid, snapSpacingMm, rails, project, onUpdateProject]);

  // Start dragging a wire connection from a terminal anchor
  const handleStartWireDrag = (e: React.MouseEvent, anchor: ComponentTerminalAnchor) => {
    e.stopPropagation();
    e.preventDefault();
    setIsPanning(false);
    setWireDragState({
      fromAnchor: anchor,
      startX: anchor.x,
      startY: anchor.y,
      currentX: anchor.x,
      currentY: anchor.y,
      hoveredAnchor: null,
    });
  };

  // Delete a wire (custom or default)
  const handleDeleteWire = (wireToDelete: WireConnection) => {
    const existing = project.wires || [];
    const isCustom = existing.some((w) => w.id === wireToDelete.id);
    let updated: WireConnection[];
    if (isCustom) {
      updated = existing.filter((w) => w.id !== wireToDelete.id);
    } else {
      updated = baseWires.filter(
        (w) =>
          w.id !== wireToDelete.id &&
          !(
            w.fromComponentId === wireToDelete.fromComponentId &&
            w.fromTerminal === wireToDelete.fromTerminal &&
            w.toComponentId === wireToDelete.toComponentId &&
            w.toTerminal === wireToDelete.toTerminal
          )
      );
    }
    onUpdateProject({
      ...project,
      wires: updated,
    });
    setSelectedWire(null);
    setRecentNotification(`🗑️ Condutor ${wireToDelete.wireTag} removido.`);
    setTimeout(() => setRecentNotification(null), 2500);
  };

  // Reset all wires to standard schematic defaults
  const handleResetWiresToDefault = () => {
    onUpdateProject({
      ...project,
      wires: undefined,
    });
    setSelectedWire(null);
    setRecentNotification('🔄 Cablagem reposta para as ligações padrão.');
    setTimeout(() => setRecentNotification(null), 2500);
  };

  // Global window listeners for drag & drop wiring
  useEffect(() => {
    if (!wireDragState) return;

    const onMouseMove = (e: MouseEvent) => {
      const svgCoords = getSvgCoordinates(e.clientX, e.clientY);

      // Find closest anchor within magnetic snap radius (24mm)
      let closest: ComponentTerminalAnchor | null = null;
      let minDist = 24;
      for (const a of allProjectTerminals) {
        if (
          a.componentId === wireDragState.fromAnchor.componentId &&
          a.terminalId === wireDragState.fromAnchor.terminalId
        ) {
          continue;
        }
        const dist = Math.hypot(a.x - svgCoords.x, a.y - svgCoords.y);
        if (dist < minDist) {
          minDist = dist;
          closest = a;
        }
      }

      setWireDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: closest ? closest.x : svgCoords.x,
              currentY: closest ? closest.y : svgCoords.y,
              hoveredAnchor: closest,
            }
          : null
      );
    };

    const onMouseUp = () => {
      if (wireDragState) {
        const { fromAnchor, hoveredAnchor } = wireDragState;
        if (hoveredAnchor) {
          const existingWires = project.wires || [];
          const isDuplicate = existingWires.some(
            (w) =>
              (w.fromComponentId === fromAnchor.componentId &&
                w.fromTerminal === fromAnchor.terminalId &&
                w.toComponentId === hoveredAnchor.componentId &&
                w.toTerminal === hoveredAnchor.terminalId) ||
              (w.fromComponentId === hoveredAnchor.componentId &&
                w.fromTerminal === hoveredAnchor.terminalId &&
                w.toComponentId === fromAnchor.componentId &&
                w.toTerminal === fromAnchor.terminalId)
          );

          if (isDuplicate) {
            setRecentNotification('⚠️ Esta ligação já existe no esquema elétrico.');
            setTimeout(() => setRecentNotification(null), 2500);
          } else {
            const props = deduceWireProperties(fromAnchor, hoveredAnchor);
            const allCurrentWires = [...baseWires, ...existingWires];
            const prefix =
              props.netType === 'pe_ground'
                ? 'PE'
                : props.netType === 'ac_neutral'
                ? 'N'
                : props.netType === 'dc_positive'
                ? '24V'
                : 'W';
            const nextTag = generateNextWireTag(allCurrentWires, prefix);

            const newWire: WireConnection = {
              id: `wire-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              wireTag: nextTag,
              fromComponentId: fromAnchor.componentId,
              fromComponentTag: fromAnchor.componentTag,
              fromTerminal: fromAnchor.terminalId,
              toComponentId: hoveredAnchor.componentId,
              toComponentTag: hoveredAnchor.componentTag,
              toTerminal: hoveredAnchor.terminalId,
              netType: props.netType,
              color: props.color,
              crossSectionMm2: props.crossSectionMm2,
              notes: `Ligação manual: ${fromAnchor.componentTag} [${fromAnchor.label}] ➔ ${hoveredAnchor.componentTag} [${hoveredAnchor.label}]`,
            };

            const updatedWiresList = [...existingWires, newWire];
            onUpdateProject({
              ...project,
              wires: updatedWiresList,
            });

            setRecentNotification(
              `✅ Ligação criada: ${fromAnchor.componentTag}:${fromAnchor.label} ➔ ${hoveredAnchor.componentTag}:${hoveredAnchor.label} (${nextTag})`
            );
            setTimeout(() => setRecentNotification(null), 3000);
          }
        }
        setWireDragState(null);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [wireDragState, allProjectTerminals, project, baseWires, onUpdateProject]);

  // Align single rail with uniform 5mm spacing
  const handleAlignRailWithUniformSpacing = (railIndex: number, spacingMm: number = 5) => {
    const rail = rails[railIndex];
    if (!rail || rail.items.length === 0) return;

    const sortedItems = [...rail.items].sort((a, b) => a.positionMm - b.positionMm);
    let curX = 10;
    const alignedItems = sortedItems.map((item) => {
      const placed = { ...item, positionMm: curX };
      curX += item.data.widthMm + spacingMm;
      return placed;
    });

    const updatedRails = rails.map((r, i) => (i === railIndex ? { ...r, items: alignedItems } : r));
    onUpdateProject({ ...project, rails: updatedRails });

    if (selectedItem) {
      const refreshed = alignedItems.find((it) => it.instanceId === selectedItem.instanceId);
      if (refreshed) setSelectedItem(refreshed);
    }

    setRecentNotification(`Calha ${railIndex + 1} alinhada magneticamente com ${spacingMm}mm de espaçamento uniforme!`);
    setTimeout(() => setRecentNotification(null), 2500);
  };

  // Align all rails with uniform 5mm spacing
  const handleAlignAllRailsWithUniformSpacing = (spacingMm: number = 5) => {
    const updatedRails = rails.map((rail) => {
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

    onUpdateProject({ ...project, rails: updatedRails });
    setRecentNotification(`Todas as ${rails.length} calhas alinhadas com ${spacingMm}mm de espaçamento uniforme!`);
    setTimeout(() => setRecentNotification(null), 2500);
  };

  // Snap gap between two specific components to 5mm
  const handleSnapGapTo5mm = (railIndex: number, itemAInstanceId: string, itemBInstanceId: string) => {
    const rail = rails[railIndex];
    if (!rail) return;
    const itemA = rail.items.find((it) => it.instanceId === itemAInstanceId);
    const itemB = rail.items.find((it) => it.instanceId === itemBInstanceId);
    if (!itemA || !itemB) return;

    const newPositionB = itemA.positionMm + itemA.data.widthMm + 5;
    const updatedItems = rail.items.map((it) =>
      it.instanceId === itemBInstanceId ? { ...it, positionMm: newPositionB } : it
    );
    const resolved = resolveRailNonOverlapping(updatedItems, 5, rail.usableWidthMm);

    const updatedRails = rails.map((r, i) => (i === railIndex ? { ...r, items: resolved } : r));
    onUpdateProject({ ...project, rails: updatedRails });

    if (selectedItem?.instanceId === itemBInstanceId) {
      const refreshed = resolved.find((it) => it.instanceId === itemBInstanceId);
      if (refreshed) setSelectedItem(refreshed);
    }
  };

  // Move component within rail
  const handleShiftItem = (railIndex: number, itemIndex: number, direction: 'left' | 'right') => {
    const rail = rails[railIndex];
    if (!rail) return;
    const newItems = [...rail.items];
    const targetIndex = direction === 'left' ? itemIndex - 1 : itemIndex + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap items
    const temp = newItems[itemIndex];
    newItems[itemIndex] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Recompute positions
    let currentX = 10;
    newItems.forEach((it) => {
      it.positionMm = currentX;
      currentX += it.data.widthMm + 5;
    });

    const updatedRails = rails.map((r, i) => (i === railIndex ? { ...r, items: newItems } : r));
    onUpdateProject({ ...project, rails: updatedRails });

    if (selectedItem?.instanceId === temp.instanceId) {
      setSelectedItem({ ...temp, positionMm: newItems[targetIndex].positionMm });
    }
  };

  // Move component to another rail
  const handleMoveToRail = (item: PlacedComponent, targetRailIndex: number) => {
    if (item.railIndex === targetRailIndex) return;

    // Remove from old rail
    const sourceRail = rails[item.railIndex];
    const updatedSourceItems = sourceRail.items.filter((it) => it.instanceId !== item.instanceId);

    // Add to target rail
    const targetRail = rails[targetRailIndex];
    const updatedTargetItems = [...targetRail.items, { ...item, railIndex: targetRailIndex }];

    // Re-pack target positions
    let curX = 10;
    updatedTargetItems.forEach((it) => {
      it.positionMm = curX;
      curX += it.data.widthMm + 5;
    });

    const updatedRails = rails.map((r, i) => {
      if (i === item.railIndex) return { ...r, items: updatedSourceItems };
      if (i === targetRailIndex) return { ...r, items: updatedTargetItems };
      return r;
    });

    onUpdateProject({ ...project, rails: updatedRails });
    setSelectedItem(null);
  };

  // Delete component
  const handleDeleteItem = (instanceId: string) => {
    const updatedRails = rails.map((r) => ({
      ...r,
      items: r.items.filter((it) => it.instanceId !== instanceId),
    }));
    onUpdateProject({ ...project, rails: updatedRails });
    if (selectedItem?.instanceId === instanceId) setSelectedItem(null);
  };

  // Edit Tag
  const handleUpdateTag = (instanceId: string, newTag: string) => {
    const updatedRails = rails.map((r) => ({
      ...r,
      items: r.items.map((it) => (it.instanceId === instanceId ? { ...it, tag: newTag } : it)),
    }));
    onUpdateProject({ ...project, rails: updatedRails });
    if (selectedItem?.instanceId === instanceId) {
      setSelectedItem({ ...selectedItem, tag: newTag });
    }
  };

  // Edit Component Dimensions (Real physical size: width/length, height, depth)
  const handleUpdateDimensions = (instanceId: string, newWidth: number, newHeight: number, newDepth?: number) => {
    const safeW = Math.max(4, Math.min(600, Math.round(Number(newWidth) * 10) / 10 || 18));
    const safeH = Math.max(30, Math.min(350, Math.round(Number(newHeight) * 10) / 10 || 90));
    const safeModules = Math.max(0.2, Math.round((safeW / 18) * 10) / 10);

    const targetRail = rails.find((r) => r.items.some((it) => it.instanceId === instanceId));
    if (!targetRail) return;

    const updatedRails = rails.map((r) => {
      if (r.id !== targetRail.id) return r;

      // Update item dimensions
      const updatedItems = r.items.map((it) => {
        if (it.instanceId !== instanceId) return it;
        return {
          ...it,
          data: {
            ...it.data,
            widthMm: safeW,
            heightMm: safeH,
            dinModules: safeModules,
            depthMm: newDepth !== undefined ? newDepth : it.data.depthMm || 75,
          },
        };
      });

      // Re-pack positions on this rail to maintain spacing and prevent overlapping
      let curX = 10;
      const repacked = updatedItems.map((it) => {
        const placed = { ...it, positionMm: curX };
        curX += it.data.widthMm + 5;
        return placed;
      });

      return { ...r, items: repacked };
    });

    onUpdateProject({ ...project, rails: updatedRails });

    if (selectedItem?.instanceId === instanceId) {
      const updatedPlaced = updatedRails
        .flatMap((r) => r.items)
        .find((it) => it.instanceId === instanceId);
      if (updatedPlaced) {
        setSelectedItem(updatedPlaced);
      }
    }
  };

  // Auto-arrange according to industrial standards
  const handleAutoOrganize = () => {
    const all = rails.flatMap((r) => r.items);
    if (rails.length < 2) return;

    // Rail 0: AC Protections + Mean Well PSU + DC Protections + SPD
    const rail0Items = all.filter((i) => 
      i.data.category === 'protection_ac' || 
      i.data.category === 'power_supply' || 
      i.data.category === 'protection_dc' || 
      i.data.category === 'safety_relays'
    );

    // Rail 1: Siemens PLCs + Expansions + Network + Relays
    const rail1Items = all.filter((i) => 
      i.data.category === 'plc_cpu' || 
      i.data.category === 'plc_expansion' || 
      i.data.category === 'relays' ||
      (i.data.category === 'accessories' && i.data.name.includes('Switch'))
    );

    // Rail 2 (or rest): Power contactors, motor starters, terminals (Viking, Weidmüller)
    const rail2Items = all.filter((i) => 
      !rail0Items.some((x) => x.instanceId === i.instanceId) &&
      !rail1Items.some((x) => x.instanceId === i.instanceId)
    );

    const newRails: DinRail[] = rails.map((r, idx) => {
      let chosenItems: PlacedComponent[] = [];
      if (idx === 0) chosenItems = rail0Items;
      else if (idx === 1) chosenItems = rail1Items;
      else if (idx === 2) chosenItems = rail2Items;

      let curX = 10;
      const packed = chosenItems.map((item) => {
        const updated = { ...item, railIndex: idx, positionMm: curX };
        curX += item.data.widthMm + 5;
        return updated;
      });

      return { ...r, items: packed };
    });

    onUpdateProject({ ...project, rails: newRails });
  };

  // Scale calculations for SVG rendering
  const cabWidth = config.widthMm;
  const cabHeight = config.heightMm;
  const sideDuct = config.sideDuctWidthMm || 40;
  const horizDuct = config.horizontalDuctHeightMm || 40;
  const usableWidth = Math.max(80, cabWidth - 2 * sideDuct - 40); // in mm

  // Dynamic Enclosure & Rail/Duct sizing handlers
  const handleUpdateCabinetDimensions = (partial: Partial<typeof config>) => {
    const updatedConfig = { ...config, ...partial };
    const sDuct = updatedConfig.sideDuctWidthMm || 40;
    const spacing = updatedConfig.railSpacingMm || 160;
    const usable = Math.max(80, updatedConfig.widthMm - 2 * sDuct - 40);

    let currentRails = [...rails];
    if (updatedConfig.railCount > currentRails.length) {
      for (let i = currentRails.length; i < updatedConfig.railCount; i++) {
        currentRails.push({
          id: `rail-${i}-${Date.now()}`,
          index: i,
          name: `Calha ${i + 1}`,
          usableWidthMm: usable,
          yPositionMm: 80 + i * spacing,
          items: [],
        });
      }
    } else if (updatedConfig.railCount < currentRails.length) {
      const removedItems = currentRails.slice(updatedConfig.railCount).flatMap((r) => r.items);
      currentRails = currentRails.slice(0, updatedConfig.railCount);
      if (removedItems.length > 0 && currentRails.length > 0) {
        const last = currentRails[currentRails.length - 1];
        last.items = [...last.items, ...removedItems.map((it) => ({ ...it, railIndex: currentRails.length - 1 }))];
      }
    }

    currentRails = currentRails.map((r, idx) => ({
      ...r,
      index: idx,
      name: r.name || `Calha ${idx + 1}`,
      usableWidthMm: usable,
      yPositionMm: 80 + idx * spacing,
    }));

    onUpdateProject({
      ...project,
      config: updatedConfig,
      rails: currentRails,
    });
  };

  const handleAddRail = () => {
    if (rails.length >= 8) return;
    handleUpdateCabinetDimensions({ railCount: rails.length + 1 });
  };

  const handleRemoveRail = (railIdx: number) => {
    if (rails.length <= 1) return;
    const target = rails[railIdx];
    let newRails = rails.filter((_, idx) => idx !== railIdx);
    if (target.items.length > 0 && newRails.length > 0) {
      const fallbackIdx = Math.min(railIdx, newRails.length - 1);
      newRails[fallbackIdx].items = [
        ...newRails[fallbackIdx].items,
        ...target.items.map((it) => ({ ...it, railIndex: fallbackIdx })),
      ];
    }
    const sDuct = config.sideDuctWidthMm || 40;
    const spacing = config.railSpacingMm || 160;
    const usable = Math.max(80, config.widthMm - 2 * sDuct - 40);

    newRails = newRails.map((r, idx) => ({
      ...r,
      index: idx,
      name: `Calha ${idx + 1}`,
      usableWidthMm: usable,
      yPositionMm: 80 + idx * spacing,
    }));

    onUpdateProject({
      ...project,
      config: { ...config, railCount: newRails.length },
      rails: newRails,
    });
  };

  // Gland (Bucins) calculations & handlers
  const glands: CableGland[] = useMemo(() => {
    if (project.glands && project.glands.length > 0) return project.glands;
    return getDefaultGlands(cabWidth, config.supplyVoltage.includes('400V'));
  }, [project.glands, cabWidth, config.supplyVoltage]);

  const handleUpdateGlands = (newGlands: CableGland[]) => {
    onUpdateProject({
      ...project,
      glands: newGlands,
    });
  };

  const handleAddGland = (location: 'top' | 'bottom') => {
    const nextNum = glands.length + 1;
    const size: GlandMetric = location === 'top' ? 'M20' : 'M16';
    const spec = GLAND_SPECS[size];
    const existingCount = glands.filter((g) => g.location === location).length;
    const nextX = Math.min(cabWidth - 50, 70 + existingCount * 65);
    const newGland: CableGland = {
      id: `gland-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tag: location === 'top' ? `BG-IN-0${nextNum}` : `BG-OUT-0${nextNum}`,
      location,
      size,
      xOffsetMm: nextX,
      label: location === 'top' ? 'Entrada Circuito Auxiliar' : 'Saída Circuito Campo',
      cableDiameterRangeMm: spec.cableRange,
      holeDiameterMm: spec.holeDiameterMm,
      circuitType: location === 'top' ? 'control' : 'sensors',
      material: 'polyamide',
      estimatedPriceEur: spec.estimatedPriceEur,
    };
    handleUpdateGlands([...glands, newGland]);
    setSelectedGlandId(newGland.id);
  };

  const handleDeleteGland = (id: string) => {
    handleUpdateGlands(glands.filter((g) => g.id !== id));
    if (selectedGlandId === id) setSelectedGlandId(null);
  };

  const handleChangeGlandMetric = (id: string, newMetric: GlandMetric) => {
    const spec = GLAND_SPECS[newMetric];
    handleUpdateGlands(
      glands.map((g) =>
        g.id === id
          ? {
              ...g,
              size: newMetric,
              holeDiameterMm: spec.holeDiameterMm,
              cableDiameterRangeMm: spec.cableRange,
              estimatedPriceEur: spec.estimatedPriceEur,
            }
          : g
      )
    );
  };

  const handleAutoAlignGlands = (location: 'top' | 'bottom') => {
    handleUpdateGlands(autoDistributeGlands(glands, location, cabWidth));
  };

  // =========================================================================
  // HMI DOOR & CNC DRILLING CUTOUT OVERLAY SYSTEM (CAMADA DE SOBREPOSIÇÃO)
  // =========================================================================
  const [internalShowHmiDoorOverlay, setInternalShowHmiDoorOverlay] = useState<boolean>(false);
  const showHmiDoorOverlay = controlledShowHmiDoorOverlay !== undefined ? controlledShowHmiDoorOverlay : internalShowHmiDoorOverlay;
  const setShowHmiDoorOverlay = (val: boolean | ((p: boolean) => boolean)) => {
    if (controlledOnToggleHmiDoorOverlay) controlledOnToggleHmiDoorOverlay();
    else setInternalShowHmiDoorOverlay(val);
  };
  const [selectedHmiModelId, setSelectedHmiModelId] = useState<string>('siemens_ktp700');
  const [hmiCustomCoords, setHmiCustomCoords] = useState<{ xMm: number; yMm: number } | null>(null);
  const [isHmiOverlayDragging, setIsHmiOverlayDragging] = useState<boolean>(false);
  const [hmiOverlayDragOrigin, setHmiOverlayDragOrigin] = useState<{
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [isHmiInspectorCollapsed, setIsHmiInspectorCollapsed] = useState<boolean>(false);

  // Active HMI device from project.controlPanel or fallback preset
  const existingHmiDevice = useMemo(() => {
    return project.controlPanel?.devices.find((d) => d.type === 'hmi');
  }, [project.controlPanel?.devices]);

  const activeHmiModel = useMemo(() => {
    return HMI_PRESETS.find((p) => p.id === selectedHmiModelId) || HMI_PRESETS[0];
  }, [selectedHmiModelId]);

  const hmiX = hmiCustomCoords ? hmiCustomCoords.xMm : (existingHmiDevice?.xMm ?? Math.round(cabWidth / 2));
  const hmiY = hmiCustomCoords ? hmiCustomCoords.yMm : (existingHmiDevice?.yMm ?? Math.round(cabHeight * 0.28));

  const hmiBezelW = existingHmiDevice?.widthMm || activeHmiModel.widthMm;
  const hmiBezelH = existingHmiDevice?.heightMm || activeHmiModel.heightMm;
  const hmiCutoutW = activeHmiModel ? activeHmiModel.cutoutWidthMm : Math.max(80, hmiBezelW - 16);
  const hmiCutoutH = activeHmiModel ? activeHmiModel.cutoutHeightMm : Math.max(60, hmiBezelH - 16);
  const hmiDepthMm = activeHmiModel?.depthMm || 55;

  const cutoutLeft = hmiX - hmiCutoutW / 2;
  const cutoutRight = hmiX + hmiCutoutW / 2;
  const cutoutTop = hmiY - hmiCutoutH / 2;
  const cutoutBottom = hmiY + hmiCutoutH / 2;

  const bezelLeft = hmiX - hmiBezelW / 2;
  const bezelRight = hmiX + hmiBezelW / 2;
  const bezelTop = hmiY - hmiBezelH / 2;
  const bezelBottom = hmiY + hmiBezelH / 2;

  // Safe gasket margin (45mm clearance from door perimeter)
  const isOutsideGasket =
    bezelLeft < 45 ||
    bezelRight > cabWidth - 45 ||
    bezelTop < 45 ||
    bezelBottom > cabHeight - 45;

  // Real-time Mechanical Interference / Collision Check
  const hmiMechanicalClash = useMemo(() => {
    const hmiBoxLeft = cutoutLeft - 5;
    const hmiBoxRight = cutoutRight + 5;
    const hmiBoxTop = cutoutTop - 5;
    const hmiBoxBottom = cutoutBottom + 5;

    const collidingRails: { index: number; name: string; yMm: number }[] = [];
    const collidingComponents: {
      instanceId: string;
      tag: string;
      name: string;
      railIndex: number;
      xMm: number;
      yMm: number;
      widthMm: number;
      heightMm: number;
    }[] = [];

    const sideDuctW = config.sideDuctWidthMm || 40;
    const railX = 24 + sideDuctW + 10;
    const usableW = cabWidth - 48 - (sideDuctW * 2) - 20;

    rails.forEach((rail, rIdx) => {
      const railY = 80 + rIdx * config.railSpacingMm;
      const railBarTop = railY + 37.5;
      const railBarBottom = railY + 72.5;

      const railIntersectsY = !(railBarBottom < hmiBoxTop || railBarTop > hmiBoxBottom);
      const railIntersectsX = !(railX + usableW < hmiBoxLeft || railX > hmiBoxRight);

      if (railIntersectsY && railIntersectsX) {
        collidingRails.push({
          index: rIdx + 1,
          name: rail.name || `Calha DIN ${rIdx + 1}`,
          yMm: railY,
        });
      }

      rail.items.forEach((item) => {
        const compX = railX + item.positionMm;
        const compW = item.data.widthMm;
        const compH = item.data.heightMm || 90;
        const compY = railY + 55 - compH / 2;

        const compLeft = compX;
        const compRight = compX + compW;
        const compTop = compY;
        const compBottom = compY + compH;

        const overlapsX = !(compRight < hmiBoxLeft || compLeft > hmiBoxRight);
        const overlapsY = !(compBottom < hmiBoxTop || compTop > hmiBoxBottom);

        if (overlapsX && overlapsY) {
          collidingComponents.push({
            instanceId: item.instanceId,
            tag: item.tag,
            name: item.data.name,
            railIndex: rIdx + 1,
            xMm: compX,
            yMm: compY,
            widthMm: compW,
            heightMm: compH,
          });
        }
      });
    });

    const hasClash = collidingComponents.length > 0 || collidingRails.length > 0;

    return {
      hasClash,
      collidingRails,
      collidingComponents,
      isOutsideGasket,
      chassisDepthMm: hmiDepthMm,
    };
  }, [
    cutoutLeft, cutoutRight, cutoutTop, cutoutBottom,
    rails, config.railSpacingMm, config.sideDuctWidthMm, cabWidth, hmiDepthMm, isOutsideGasket
  ]);

  // Synchronize HMI to project controlPanel state
  const handleSyncHmiToDoorProject = (newX?: number, newY?: number, modelSpec?: HmiPresetSpec) => {
    const targetX = newX !== undefined ? newX : hmiX;
    const targetY = newY !== undefined ? newY : hmiY;
    const model = modelSpec || activeHmiModel;

    const currentCp = project.controlPanel || getDefaultControlPanelConfig(cabWidth, cabHeight);
    const existingIndex = currentCp.devices.findIndex((d) => d.type === 'hmi');

    const updatedDevices = [...currentCp.devices];
    if (existingIndex >= 0) {
      const existing = updatedDevices[existingIndex];
      updatedDevices[existingIndex] = {
        ...existing,
        xMm: Math.round(targetX),
        yMm: Math.round(targetY),
        widthMm: model.widthMm,
        heightMm: model.heightMm,
        name: model.name,
        brand: model.brand,
      };
    } else {
      updatedDevices.push({
        id: `cp_hmi_${Date.now()}`,
        tag: 'HMI1',
        name: model.name,
        type: 'hmi',
        xMm: Math.round(targetX),
        yMm: Math.round(targetY),
        widthMm: model.widthMm,
        heightMm: model.heightMm,
        cutoutType: 'rectangular',
        color: '#0f172a',
        label: 'INTERFACE HMI',
        voltage: '24V DC',
        brand: model.brand,
        priceEur: 540,
      });
    }

    onUpdateProject({
      ...project,
      controlPanel: {
        ...currentCp,
        devices: updatedDevices,
      },
    });

    setRecentNotification(`✅ Posição do recorte HMI atualizada na porta: X=${Math.round(targetX)}mm, Y=${Math.round(targetY)}mm`);
    setTimeout(() => setRecentNotification(null), 2500);
  };

  const handleAdjustHmiPosition = (dx: number, dy: number) => {
    const nextX = Math.max(30, Math.min(cabWidth - 30, hmiX + dx));
    const nextY = Math.max(30, Math.min(cabHeight - 30, hmiY + dy));
    const snappedX = snapToGrid ? Math.round(nextX / 5) * 5 : Math.round(nextX);
    const snappedY = snapToGrid ? Math.round(nextY / 5) * 5 : Math.round(nextY);

    setHmiCustomCoords({ xMm: snappedX, yMm: snappedY });
    handleSyncHmiToDoorProject(snappedX, snappedY);
  };

  const handleSetHmiPreset = (preset: 'centerX' | 'ergonomicTop' | 'doorCenter' | 'alignRight') => {
    let targetX = hmiX;
    let targetY = hmiY;

    if (preset === 'centerX') {
      targetX = Math.round(cabWidth / 2);
    } else if (preset === 'ergonomicTop') {
      targetY = Math.round(cabHeight * 0.30);
    } else if (preset === 'doorCenter') {
      targetX = Math.round(cabWidth / 2);
      targetY = Math.round(cabHeight / 2);
    } else if (preset === 'alignRight') {
      targetX = Math.round(cabWidth - 45 - hmiBezelW / 2 - 20);
    }

    if (snapToGrid) {
      targetX = Math.round(targetX / 5) * 5;
      targetY = Math.round(targetY / 5) * 5;
    }

    setHmiCustomCoords({ xMm: targetX, yMm: targetY });
    handleSyncHmiToDoorProject(targetX, targetY);
  };

  const handleStartHmiDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setIsPanning(false);
    const svgCoords = getSvgCoordinates(e.clientX, e.clientY);
    setIsHmiOverlayDragging(true);
    setHmiOverlayDragOrigin({
      startMouseX: svgCoords.x,
      startMouseY: svgCoords.y,
      startX: hmiX,
      startY: hmiY,
    });
  };

  useEffect(() => {
    if (!isHmiOverlayDragging || !hmiOverlayDragOrigin) return;

    const onMouseMove = (e: MouseEvent) => {
      const svgCoords = getSvgCoordinates(e.clientX, e.clientY);
      const deltaX = svgCoords.x - hmiOverlayDragOrigin.startMouseX;
      const deltaY = svgCoords.y - hmiOverlayDragOrigin.startMouseY;

      let nextX = hmiOverlayDragOrigin.startX + deltaX;
      let nextY = hmiOverlayDragOrigin.startY + deltaY;

      nextX = Math.max(30, Math.min(cabWidth - 30, nextX));
      nextY = Math.max(30, Math.min(cabHeight - 30, nextY));

      if (snapToGrid) {
        nextX = Math.round(nextX / 5) * 5;
        nextY = Math.round(nextY / 5) * 5;
      } else {
        nextX = Math.round(nextX);
        nextY = Math.round(nextY);
      }

      setHmiCustomCoords({ xMm: nextX, yMm: nextY });
    };

    const onMouseUp = () => {
      setIsHmiOverlayDragging(false);
      if (hmiCustomCoords) {
        handleSyncHmiToDoorProject(hmiCustomCoords.xMm, hmiCustomCoords.yMm);
      }
      setHmiOverlayDragOrigin(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isHmiOverlayDragging, hmiOverlayDragOrigin, hmiCustomCoords, snapToGrid, cabWidth, cabHeight]);

  return (
    <div className={`flex flex-col lg:flex-row h-full overflow-hidden ${isImmersiveMode ? 'p-0 gap-0' : 'gap-4 p-4'}`}>
      {/* Main Drawing Viewport */}
      <div className={`flex-1 flex flex-col bg-slate-900 border-slate-800 overflow-hidden shadow-xl relative ${isImmersiveMode ? 'border-0 rounded-none' : 'border rounded-lg'}`}>
        {/* Scaled Cabinet SVG Canvas with Pan & Zoom */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden bg-[#0b1120] relative flex items-center justify-center p-4 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          {/* Subtle Grid Dots Background */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Floating HUD Tool Palette in Immersive Mode */}
          {isImmersiveMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-1.5 bg-slate-950/95 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-2xl shadow-2xl text-xs font-sans animate-in slide-in-from-top-3 duration-200 max-w-[96vw]">
              {/* Sair do Modo Imersivo Button */}
              {onToggleImmersiveMode && (
                <button
                  type="button"
                  onClick={onToggleImmersiveMode}
                  className="h-7 flex items-center gap-1.5 px-2.5 bg-red-600/90 hover:bg-red-500 text-white rounded-lg font-bold text-[11px] transition shadow-xs active:scale-95"
                  title="Sair do Modo Imersivo (Atalho: Tecla ESC ou Shift+F)"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Sair (ESC)</span>
                </button>
              )}

              <div className="h-4 w-px bg-slate-800"></div>

              {/* Quick Dimension Badge */}
              <button
                type="button"
                onClick={() => {
                  setIsFloatingDrawerOpen(true);
                  setActiveSideTab('enclosure_size');
                }}
                className="h-7 flex items-center gap-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-400 font-mono text-[11px] border border-slate-800"
                title="Ajustar dimensões do armário e calhas"
              >
                <Box className="w-3 h-3" />
                <span>{cabWidth}×{cabHeight}mm</span>
              </button>

              {/* Compact Zoom */}
              <div className="h-7 flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg px-1 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => handleZoom(0.85)}
                  className="p-1 hover:text-white text-slate-400"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="font-bold text-sky-400 min-w-[34px] text-center select-none">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => handleZoom(1.15)}
                  className="p-1 hover:text-white text-slate-400"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleFitToScreen}
                  className="px-1.5 py-0.5 text-[10px] text-sky-400 hover:text-white border-l border-slate-800"
                  title="Ajustar ao ecrã (Tecla F)"
                >
                  Ajustar
                </button>
              </div>

              {/* Toggles */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setShowWiring(!showWiring)}
                  className={`h-7 px-2 rounded flex items-center gap-1 text-[11px] font-semibold transition ${
                    showWiring ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mostrar fios e corrente"
                >
                  <Activity className="w-3 h-3" />
                  <span>Fios</span>
                </button>
                {showWiring && (
                  <button
                    type="button"
                    onClick={() => setShowWireTags(!showWireTags)}
                    className={`h-7 px-2 rounded flex items-center gap-1 text-[11px] font-semibold transition ${
                      showWireTags ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Anilhas de condutores"
                  >
                    <Tag className="w-3 h-3 text-amber-400" />
                    <span>Anilhas</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isWiringMode;
                    setIsWiringMode(next);
                    if (next && !showWiring) setShowWiring(true);
                    setRecentNotification(
                      next
                        ? '⚡ Modo Cablagem: Clique e arraste de um borne para outro'
                        : 'Modo Cablagem Desativado'
                    );
                    setTimeout(() => setRecentNotification(null), 2500);
                  }}
                  className={`h-7 px-2.5 rounded flex items-center gap-1.5 text-[11px] font-bold transition ${
                    isWiringMode
                      ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_#f59e0b]'
                      : 'text-amber-300 hover:text-white bg-amber-950/50 border border-amber-600/40'
                  }`}
                  title="Ligar condutores: clique num borne e arraste até ao destino"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Ligar Fios</span>
                </button>
                {showWiring && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = wireRouteStyle === 'ducts' ? 'direct' : 'ducts';
                      setWireRouteStyle(next);
                      setRecentNotification(
                        next === 'direct'
                          ? '✨ Roteamento Direto Ponto a Ponto (Flywire)'
                          : '🛣️ Roteamento Ortogonal Manhattan (Canaletas)'
                      );
                      setTimeout(() => setRecentNotification(null), 2500);
                    }}
                    className={`h-7 px-2 rounded flex items-center gap-1 text-[11px] font-semibold transition ${
                      wireRouteStyle === 'direct'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="Alternar entre roteamento ortogonal Manhattan (canaletas) e curvas diretas"
                  >
                    <span>{wireRouteStyle === 'direct' ? 'Curvas Diretas' : 'Manhattan'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenWiringList) {
                      onOpenWiringList();
                    } else {
                      setIsWiringListModalOpen(true);
                    }
                  }}
                  className="h-7 px-2 rounded flex items-center gap-1 text-[11px] font-semibold transition text-purple-300 hover:text-white bg-purple-950/50 border border-purple-600/40"
                  title="Lista de Cablagem De-Para e exportar CSV"
                >
                  <Table className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cabos (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showThermalZones;
                    setShowThermalZones(next);
                    setRecentNotification(next ? 'Zonas Térmicas ON' : 'Zonas Térmicas OFF');
                    setTimeout(() => setRecentNotification(null), 1500);
                  }}
                  className={`h-7 px-2 rounded flex items-center gap-1 text-[11px] font-semibold transition ${
                    showThermalZones ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Zonas Térmicas (EN 61439)"
                >
                  <Wind className="w-3 h-3 text-amber-400" />
                  <span>Térmica</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !snapToGrid;
                    setSnapToGrid(next);
                    setRecentNotification(next ? 'Snap 5mm ON' : 'Snap OFF');
                    setTimeout(() => setRecentNotification(null), 1500);
                  }}
                  className={`h-7 px-2 rounded flex items-center gap-1 text-[11px] font-semibold transition ${
                    snapToGrid ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Alinhamento magnético com passo 5mm"
                >
                  <Magnet className="w-3 h-3 text-amber-300" />
                  <span>Snap</span>
                </button>
              </div>

              {/* Auto-Layout */}
              <button
                type="button"
                onClick={() => setIsAutoLayoutModalOpen(true)}
                className="h-7 flex items-center gap-1 px-2.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white rounded-lg text-[11px] font-bold transition shadow-xs"
                title="Otimização térmica e auto-layout"
              >
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>Auto-Layout</span>
              </button>

              {/* Furação HMI Door Overlay Toggle in Immersive HUD */}
              <button
                type="button"
                onClick={() => {
                  const next = !showHmiDoorOverlay;
                  setShowHmiDoorOverlay(next);
                  setRecentNotification(next ? '🚪 Sobreposição da Porta & Recorte HMI ATIVADA' : 'Sobreposição HMI desativada');
                  setTimeout(() => setRecentNotification(null), 2000);
                }}
                className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-bold transition shadow-xs ${
                  showHmiDoorOverlay
                    ? 'bg-purple-600 text-white shadow-purple-500/30 ring-1 ring-purple-300'
                    : 'bg-purple-950/60 hover:bg-purple-900 border border-purple-500/50 text-purple-300 hover:text-white'
                }`}
                title="Sobreposição gráfica da porta e furação da HMI com cotas e colisão mecânica"
              >
                <DoorClosed className="w-3 h-3 text-purple-300" />
                <span>{showHmiDoorOverlay ? 'HMI Porta: ON' : 'HMI Porta'}</span>
              </button>

              <div className="h-4 w-px bg-slate-800"></div>

              {/* Paleta Flutuante Drawer Toggle */}
              <button
                type="button"
                onClick={() => setIsFloatingDrawerOpen((prev) => !prev)}
                className={`h-7 flex items-center gap-1.5 px-3 rounded-lg text-[11px] font-bold transition shadow-xs active:scale-95 ${
                  isFloatingDrawerOpen
                    ? 'bg-purple-600 text-white shadow-purple-500/30 ring-1 ring-purple-400'
                    : 'bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/50'
                }`}
                title="Abrir ou ocultar a Paleta Flutuante de Ferramentas e Componentes"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isFloatingDrawerOpen ? 'Fechar Paleta' : 'Paleta Flutuante'}</span>
              </button>

              {/* Gravar (Ctrl+S) */}
              {onQuickSave && (
                <button
                  type="button"
                  onClick={onQuickSave}
                  className="h-7 flex items-center gap-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition shadow-xs active:scale-95"
                  title="Gravar Projeto Imediatamente (Ctrl+S)"
                >
                  <Save className="w-3 h-3" />
                  <span>Gravar</span>
                </button>
              )}
            </div>
          )}

          {/* Floating Navigation & Zoom Tips Pill */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-950/85 backdrop-blur-xs border border-slate-800 text-[11px] text-slate-300 px-3 py-1.5 rounded-lg pointer-events-none font-mono shadow-md">
            <span>🧲 Arraste componente: Snap 5mm</span>
            <span className="text-slate-600">|</span>
            <span>🖐️ Arrastar fundo: Mover</span>
            <span className="text-slate-600">|</span>
            <span className="text-sky-400">Roda: Zoom</span>
            {isWiringMode && (
              <>
                <span className="text-slate-600">|</span>
                <span className="text-amber-400 font-bold animate-pulse">⚡ Clique num borne e arraste para ligar</span>
              </>
            )}
            {isImmersiveMode && (
              <>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400 font-bold">✨ Edição Imersiva (ESC para sair)</span>
              </>
            )}
          </div>

          {/* Quick Canvas Action: Layout & Porta HMI Tool Cluster */}
          <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-1.5 pointer-events-auto">
            {onOpenControlPanel && (
              <button
                type="button"
                onClick={onOpenControlPanel}
                className="h-7.5 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold transition shadow-md bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 hover:text-white"
                title="Abrir editor completo da porta: Ecrã HMI, botões 22mm e mapa de furação"
              >
                <Layout className="w-3.5 h-3.5 text-purple-400" />
                <span>Porta & HMI</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const next = !showHmiDoorOverlay;
                setShowHmiDoorOverlay(next);
                setRecentNotification(
                  next
                    ? '🚪 Sobreposição da Porta & Recorte HMI ATIVADA'
                    : 'Sobreposição da Porta desativada'
                );
                setTimeout(() => setRecentNotification(null), 2000);
              }}
              className={`h-7.5 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold transition shadow-md ${
                showHmiDoorOverlay
                  ? 'bg-purple-600 text-white shadow-purple-500/30 ring-1 ring-purple-300'
                  : 'bg-slate-950/90 hover:bg-slate-850 border border-purple-500/40 text-purple-300 hover:text-white'
              }`}
              title="Exibir ou ocultar sobreposição da porta e cotas de furação da HMI"
            >
              <DoorClosed className="w-3.5 h-3.5" />
              <span>{showHmiDoorOverlay ? 'Furação HMI (ON)' : 'Furação HMI'}</span>
            </button>
          </div>

          {/* Live Mini Simulation Testing Dock at Bottom of Canvas (when showWiring is enabled) */}
          {showWiring && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 bg-slate-950/95 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-xl shadow-2xl font-mono text-xs text-slate-200">
              <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800 text-emerald-400 font-bold">
                <Activity className="w-4 h-4 animate-pulse" />
                <span className="hidden md:inline">TESTE AO VIVO:</span>
              </div>

              {/* Master Power Toggle */}
              <button
                type="button"
                onClick={() => setSimState((prev) => ({ ...prev, isPowered: !prev.isPowered }))}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition ${
                  simState.isPowered
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
                title="Ligar ou desligar alimentação geral AC 230V do armário"
              >
                <Power className="w-3 h-3" />
                <span>{simState.isPowered ? 'Rede AC: ON' : 'Rede AC: OFF'}</span>
              </button>

              {/* Start Button (DI 0.0) */}
              <button
                type="button"
                onMouseDown={() => setSimState((prev) => ({
                  ...prev,
                  digitalInputs: { ...prev.digitalInputs, 'DI0': true },
                }))}
                onMouseUp={() => setSimState((prev) => ({
                  ...prev,
                  digitalInputs: { ...prev.digitalInputs, 'DI0': false },
                }))}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition ${
                  simState.digitalInputs['DI0']
                    ? 'bg-emerald-500 text-white shadow-[0_0_8px_#10b981]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title="Pressione para simular botão de arranque NA (Liga DQ 0.0 e Relé K1)"
              >
                <span>🟢 Marcha (DI0)</span>
              </button>

              {/* Stop Button (DI 0.1) */}
              <button
                type="button"
                onClick={() => setSimState((prev) => ({
                  ...prev,
                  digitalInputs: { ...prev.digitalInputs, 'DI1': !prev.digitalInputs['DI1'] },
                }))}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition ${
                  simState.digitalInputs['DI1']
                    ? 'bg-red-600 text-white shadow-[0_0_8px_#ef4444]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title="Simular botão de paragem NF (Corta comando do relé)"
              >
                <span>🔴 Paragem (DI1)</span>
              </button>

              {/* Differential Test Button */}
              <button
                type="button"
                onClick={() => setSimState((prev) => ({ ...prev, isRcdTripped: !prev.isRcdTripped }))}
                className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition ${
                  simState.isRcdTripped
                    ? 'bg-amber-600 text-white shadow-[0_0_8px_#f59e0b]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title="Simular disparo por fuga à terra do interruptor diferencial"
              >
                <span>⚠️ {simState.isRcdTripped ? 'Diferencial Armar' : 'Teste RCD'}</span>
              </button>

              {/* Wire Identification Tags Toggle */}
              <button
                type="button"
                onClick={() => setShowWireTags((prev) => !prev)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition ${
                  showWireTags
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_#f59e0b]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title="Mostrar ou ocultar anilhas de identificação nos fios e bornes"
              >
                <Tag className="w-3 h-3" />
                <span>Anilhas: {showWireTags ? 'ON' : 'OFF'}</span>
              </button>

              {/* Reset Custom Wiring button if user modified wiring */}
              {project.wires && project.wires.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetWiresToDefault}
                  className="px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 bg-slate-850 hover:bg-slate-750 text-slate-300 border border-slate-700 transition"
                  title="Repor todas as ligações para o padrão inicial do projeto"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" />
                  <span>Repor Padrão ({project.wires.length})</span>
                </button>
              )}

              {/* Live Status Readings */}
              <div className="hidden lg:flex items-center gap-3 pl-2 border-l border-slate-800 text-[11px] text-slate-300">
                <span>⚡ AC: <strong className="text-white">{updatedState.measuredAcVoltage}V</strong></span>
                <span>🔋 DC: <strong className="text-emerald-400">{updatedState.measuredDcVoltage}V</strong></span>
                <span>🔌 <strong className="text-sky-400">{updatedState.measuredTotalCurrentA}A</strong></span>
                <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                  updatedState.relayStates['K1'] ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500'
                }`}>
                  {updatedState.relayStates['K1'] ? 'RELÉ K1: FECHADO' : 'RELÉ K1: ABERTO'}
                </span>
              </div>
            </div>
          )}

          {/* Zoom & Pan Transform Container */}
          <div
            className="transition-transform duration-75 origin-center flex items-center justify-center pointer-events-auto"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <svg
              ref={cabinetSvgRef}
              viewBox={`0 -26 ${cabWidth} ${cabHeight + 52}`}
              onClick={() => {
                if (!hasMoved) {
                  setSelectedItem(null);
                  setSelectedGlandId(null);
                  setSelectedRailIndex(null);
                }
              }}
              className="drop-shadow-2xl select-none"
              style={{
                width: `${Math.min(cabWidth, 840)}px`,
                height: `${(Math.min(cabWidth, 840) / cabWidth) * (cabHeight + 52)}px`,
                maxWidth: 'none',
              }}
            >
            {/* Cabinet Outer Enclosure Metallic Frame */}
            <rect
              x="0"
              y="0"
              width={cabWidth}
              height={cabHeight}
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="4"
              rx="8"
            />
            {/* Interior Mounting Plate (Zinc-Plated Steel Sheet) */}
            <rect
              x="16"
              y="16"
              width={cabWidth - 32}
              height={cabHeight - 32}
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="2"
              rx="4"
            />

            {/* ========================================================
                TOP CABLE GLAND PLATE (Placa Passa-Cabos Superior - Entrada)
               ======================================================== */}
            <g className="top-gland-plate">
              {/* Flange plate metal base */}
              <rect
                x="22"
                y="3"
                width={cabWidth - 44}
                height="15"
                fill="#090d16"
                stroke="#475569"
                strokeWidth="1"
                rx="2"
              />
              {/* Screws */}
              <circle cx="28" cy="10.5" r="1.8" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />
              <circle cx={cabWidth - 28} cy="10.5" r="1.8" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />

              {/* Watermark label */}
              <text
                x={cabWidth / 2}
                y="13"
                fill="#475569"
                fontSize="6.5"
                fontFamily="JetBrains Mono"
                fontWeight="bold"
                textAnchor="middle"
                letterSpacing="1.5"
                opacity="0.7"
              >
                ENTRADA DE CABOS (FLANGE DE BUCINS)
              </text>

              {/* Top Cable Glands (Bucins de Entrada) */}
              {glands.filter((g) => g.location === 'top').map((gland) => {
                const spec = GLAND_SPECS[gland.size] || GLAND_SPECS.M20;
                const isSelected = selectedGlandId === gland.id;
                const cx = gland.xOffsetMm;
                const cy = 10.5;
                const holeR = Math.min(6.5, spec.holeDiameterMm / 3.6);
                const outerR = holeR + 2.2;
                const color = CIRCUIT_TYPE_INFO[gland.circuitType]?.color || '#f59e0b';

                return (
                  <g
                    key={gland.id}
                    transform={`translate(${cx}, ${cy})`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGlandId(gland.id);
                      setActiveSideTab('glands');
                    }}
                  >
                    <title>{`${gland.tag} · ${gland.size} (Furo Ø${spec.holeDiameterMm}mm)\n${gland.label}\nCabo: ${gland.cableDiameterRangeMm} · ${spec.recommendedTorqueNm}Nm`}</title>
                    
                    {/* Glowing highlight halo if selected */}
                    {isSelected && (
                      <circle cx="0" cy="0" r={outerR + 3.5} fill="#f59e0b" opacity="0.35" className="animate-ping" />
                    )}

                    {/* Outer Hex Nut / Flange Body */}
                    <circle
                      cx="0"
                      cy="0"
                      r={outerR}
                      fill="#1e293b"
                      stroke={isSelected ? '#f59e0b' : '#94a3b8'}
                      strokeWidth={isSelected ? 1.8 : 1}
                      className="group-hover:stroke-amber-400 transition"
                    />

                    {/* Drill Hole Diameter */}
                    <circle cx="0" cy="0" r={holeR} fill="#020617" stroke="#334155" strokeWidth="0.8" />

                    {/* Rubber Gasket / Cable Entry core */}
                    <circle cx="0" cy="0" r={Math.max(1.5, holeR - 2)} fill={color} />

                    {/* Downward Entry Arrow (Entrada) */}
                    <path
                      d="M -1.8 0.5 L 0 2.2 L 1.8 0.5"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                      strokeLinecap="round"
                    />

                    {/* Tag & Metric Label Badge above plate */}
                    <g transform="translate(0, -18)">
                      <rect
                        x="-20"
                        y="-4"
                        width="40"
                        height="11"
                        rx="2"
                        fill="#090d16"
                        stroke={isSelected ? '#f59e0b' : '#475569'}
                        strokeWidth="1"
                        className="group-hover:stroke-amber-400 transition"
                      />
                      <text
                        x="0"
                        y="4"
                        fill={isSelected ? '#fbbf24' : '#f1f5f9'}
                        fontSize="6.8"
                        fontWeight="bold"
                        fontFamily="JetBrains Mono"
                        textAnchor="middle"
                      >
                        {gland.tag} · {gland.size}
                      </text>
                    </g>

                    {/* Selected Dimension Marker */}
                    {isSelected && (
                      <g transform="translate(0, 14)">
                        <line x1="0" y1="0" x2="0" y2="12" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2 2" />
                        <text x="0" y="20" fill="#f59e0b" fontSize="6.5" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">
                          X = {gland.xOffsetMm}mm
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* ========================================================
                BOTTOM CABLE GLAND PLATE (Placa Passa-Cabos Inferior - Saída)
               ======================================================== */}
            <g className="bottom-gland-plate">
              {/* Flange plate metal base */}
              <rect
                x="22"
                y={cabHeight - 18}
                width={cabWidth - 44}
                height="15"
                fill="#090d16"
                stroke="#475569"
                strokeWidth="1"
                rx="2"
              />
              <circle cx="28" cy={cabHeight - 10.5} r="1.8" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />
              <circle cx={cabWidth - 28} cy={cabHeight - 10.5} r="1.8" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />

              <text
                x={cabWidth / 2}
                y={cabHeight - 8}
                fill="#475569"
                fontSize="6.5"
                fontFamily="JetBrains Mono"
                fontWeight="bold"
                textAnchor="middle"
                letterSpacing="1.5"
                opacity="0.7"
              >
                SAÍDA DE CABOS PARA CAMPO (FLANGE DE BUCINS)
              </text>

              {/* Bottom Cable Glands (Bucins de Saída) */}
              {glands.filter((g) => g.location === 'bottom').map((gland) => {
                const spec = GLAND_SPECS[gland.size] || GLAND_SPECS.M16;
                const isSelected = selectedGlandId === gland.id;
                const cx = gland.xOffsetMm;
                const cy = cabHeight - 10.5;
                const holeR = Math.min(6.5, spec.holeDiameterMm / 3.6);
                const outerR = holeR + 2.2;
                const color = CIRCUIT_TYPE_INFO[gland.circuitType]?.color || '#10b981';

                return (
                  <g
                    key={gland.id}
                    transform={`translate(${cx}, ${cy})`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGlandId(gland.id);
                      setActiveSideTab('glands');
                    }}
                  >
                    <title>{`${gland.tag} · ${gland.size} (Furo Ø${spec.holeDiameterMm}mm)\n${gland.label}\nCabo: ${gland.cableDiameterRangeMm} · ${spec.recommendedTorqueNm}Nm`}</title>
                    
                    {isSelected && (
                      <circle cx="0" cy="0" r={outerR + 3.5} fill="#10b981" opacity="0.35" className="animate-ping" />
                    )}

                    <circle
                      cx="0"
                      cy="0"
                      r={outerR}
                      fill="#1e293b"
                      stroke={isSelected ? '#10b981' : '#94a3b8'}
                      strokeWidth={isSelected ? 1.8 : 1}
                      className="group-hover:stroke-emerald-400 transition"
                    />

                    <circle cx="0" cy="0" r={holeR} fill="#020617" stroke="#334155" strokeWidth="0.8" />
                    <circle cx="0" cy="0" r={Math.max(1.5, holeR - 2)} fill={color} />

                    {/* Downward Exit Arrow (Saída) */}
                    <path
                      d="M -1.8 -0.8 L 0 0.8 L 1.8 -0.8"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                      strokeLinecap="round"
                    />

                    {/* Tag & Metric Label Badge below plate */}
                    <g transform="translate(0, 16)">
                      <rect
                        x="-20"
                        y="-4"
                        width="40"
                        height="11"
                        rx="2"
                        fill="#090d16"
                        stroke={isSelected ? '#10b981' : '#475569'}
                        strokeWidth="1"
                        className="group-hover:stroke-emerald-400 transition"
                      />
                      <text
                        x="0"
                        y="4"
                        fill={isSelected ? '#6ee7b7' : '#f1f5f9'}
                        fontSize="6.8"
                        fontWeight="bold"
                        fontFamily="JetBrains Mono"
                        textAnchor="middle"
                      >
                        {gland.tag} · {gland.size}
                      </text>
                    </g>

                    {/* Selected Dimension Marker */}
                    {isSelected && (
                      <g transform="translate(0, -14)">
                        <line x1="0" y1="0" x2="0" y2="-12" stroke="#10b981" strokeWidth="0.8" strokeDasharray="2 2" />
                        <text x="0" y="-16" fill="#10b981" fontSize="6.5" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="bold">
                          X = {gland.xOffsetMm}mm
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Left Wire Duct (Canaleta Ranhurada) */}
            <g transform={`translate(24, 24)`}>
              <rect
                x="0"
                y="0"
                width={sideDuct}
                height={cabHeight - 48}
                fill="#334155"
                stroke="#475569"
                strokeWidth="1"
              />
              {/* Duct Slits */}
              {Array.from({ length: Math.floor((cabHeight - 60) / 25) }).map((_, i) => (
                <line
                  key={i}
                  x1="6"
                  y1={15 + i * 25}
                  x2={sideDuct - 6}
                  y2={15 + i * 25}
                  stroke="#1e293b"
                  strokeWidth="2.5"
                />
              ))}
              <text
                x={sideDuct / 2}
                y={cabHeight / 2}
                fill="#94a3b8"
                fontSize="10"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
                transform={`rotate(-90, ${sideDuct / 2}, ${cabHeight / 2})`}
              >
                CANALETA LATERAL {sideDuct}mm
              </text>
            </g>

            {/* Right Wire Duct */}
            <g transform={`translate(${cabWidth - 24 - sideDuct}, 24)`}>
              <rect
                x="0"
                y="0"
                width={sideDuct}
                height={cabHeight - 48}
                fill="#334155"
                stroke="#475569"
                strokeWidth="1"
              />
              {Array.from({ length: Math.floor((cabHeight - 60) / 25) }).map((_, i) => (
                <line
                  key={i}
                  x1="6"
                  y1={15 + i * 25}
                  x2={sideDuct - 6}
                  y2={15 + i * 25}
                  stroke="#1e293b"
                  strokeWidth="2.5"
                />
              ))}
            </g>

            {/* DIN Rails and Placed Components */}
            {rails.map((rail, rIdx) => {
              const railX = 24 + sideDuct + 10;
              const railY = 80 + rIdx * config.railSpacingMm;
              const railWidth = usableWidth;
              const usedWidth = rail.items.reduce((acc, it) => acc + it.data.widthMm + 5, 0);
              const isOverfull = usedWidth > railWidth;
              const isSelectedRail = selectedRailIndex === rIdx;

              return (
                <g key={rail.id} transform={`translate(${railX}, ${railY})`}>
                  {/* Horizontal Wire Duct above rail (Scaled to config.horizontalDuctHeightMm) */}
                  <g transform={`translate(-10, ${-18 - horizDuct / 2})`}>
                    <rect
                      x="0"
                      y="0"
                      width={railWidth + 20}
                      height={horizDuct}
                      fill="#1e293b"
                      stroke="#334155"
                      strokeWidth="1"
                      rx="2"
                    />
                    {Array.from({ length: Math.floor((railWidth + 20) / 30) }).map((_, slotIdx) => (
                      <line
                        key={slotIdx}
                        x1={15 + slotIdx * 30}
                        y1="2"
                        x2={15 + slotIdx * 30}
                        y2={horizDuct - 2}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                    ))}
                    <text
                      x={(railWidth + 20) / 2}
                      y={horizDuct / 2 + 3}
                      fill="#64748b"
                      fontSize="7"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                      opacity="0.8"
                    >
                      CANALETA HORIZONTAL {horizDuct}mm
                    </text>
                  </g>

                  {/* DIN Rail 35mm Metallic Steel Bar & Click Interaction */}
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!hasMoved) {
                        setSelectedRailIndex(rIdx);
                        setQuickRailIdx(rIdx);
                        setSelectedItem(null);
                        setActiveSideTab('quick_add');
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onOpenCatalog(rIdx);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Hit target zone around DIN rail */}
                    <rect
                      x="0"
                      y="35"
                      width={railWidth}
                      height="40"
                      fill="transparent"
                    />

                    {/* Active highlight glow when rail is selected */}
                    {isSelectedRail && (
                      <rect
                        x="-3"
                        y="42"
                        width={railWidth + 6}
                        height="26"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeDasharray="6 3"
                        rx="3"
                        className="animate-pulse"
                      />
                    )}

                    {/* DIN Rail 35mm Metallic Steel Bar */}
                    <rect
                      x="0"
                      y="45"
                      width={railWidth}
                      height="20"
                      fill={isSelectedRail ? "#475569" : "#64748b"}
                      stroke={isSelectedRail ? "#38bdf8" : "#94a3b8"}
                      strokeWidth={isSelectedRail ? "2" : "1.5"}
                      rx="1"
                      className="group-hover:stroke-sky-400 group-hover:fill-slate-600 transition"
                    />
                    {/* DIN Rail perforations */}
                    {Array.from({ length: Math.floor(railWidth / 25) }).map((_, i) => (
                      <rect
                        key={i}
                        x={10 + i * 25}
                        y="51"
                        width="12"
                        height="8"
                        fill="#334155"
                        rx="2"
                      />
                    ))}
                    <title>{`Calha DIN ${rIdx + 1} (${rail.name}) — Clique para selecionar e ver botão de inserir componente`}</title>
                  </g>

                  {/* Placed Components on this DIN Rail (Real-time collision-free layout) */}
                  {(() => {
                    const isDraggingThisRail = dragState && dragState.railIndex === rIdx;
                    let railDisplayItems = rail.items;

                    if (isDraggingThisRail) {
                      const otherItems = rail.items.filter((it) => it.instanceId !== dragState.item.instanceId);
                      const compCenter = dragState.currentCompX + dragState.item.data.widthMm / 2;
                      let insertIdx = 0;
                      while (
                        insertIdx < otherItems.length &&
                        compCenter > otherItems[insertIdx].positionMm + otherItems[insertIdx].data.widthMm / 2
                      ) {
                        insertIdx++;
                      }
                      const previewList = [
                        ...otherItems.slice(0, insertIdx),
                        { ...dragState.item, positionMm: dragState.currentCompX },
                        ...otherItems.slice(insertIdx),
                      ];
                      railDisplayItems = resolveRailNonOverlapping(previewList, 5, railWidth);
                    }

                    return railDisplayItems.map((item, itemIdx) => {
                      const isSelected = selectedItem?.instanceId === item.instanceId;
                      const isBeingDragged = dragState?.item.instanceId === item.instanceId;
                      const compX = isBeingDragged ? dragState.currentCompX : item.positionMm;
                      const compW = item.data.widthMm;
                      const compH = item.data.heightMm || 90; // real component physical height in mm
                      const compY = 55 - compH / 2;

                    return (
                      <g
                        key={item.instanceId}
                        transform={`translate(${compX}, ${compY})`}
                        onMouseDown={(e) => {
                          setHoveredComponentInfo(null);
                          handleStartDragItem(e, item, rIdx, railWidth);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!hasMoved) {
                            setSelectedItem(item);
                            setActiveSideTab('item_details');
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!dragState && !wireDragState) {
                            const rect = containerRef.current?.getBoundingClientRect();
                            if (rect) {
                              setHoveredComponentInfo({
                                item,
                                railIndex: rIdx,
                                clientX: e.clientX - rect.left,
                                clientY: e.clientY - rect.top,
                              });
                            }
                          }
                        }}
                        onMouseMove={(e) => {
                          if (!dragState && !wireDragState) {
                            const rect = containerRef.current?.getBoundingClientRect();
                            if (rect) {
                              setHoveredComponentInfo({
                                item,
                                railIndex: rIdx,
                                clientX: e.clientX - rect.left,
                                clientY: e.clientY - rect.top,
                              });
                            }
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredComponentInfo((prev) => (prev?.item.instanceId === item.instanceId ? null : prev));
                        }}
                        className={`cursor-grab active:cursor-grabbing group ${isBeingDragged ? 'opacity-90 drop-shadow-2xl' : ''}`}
                      >
                        {/* Selection Glow */}
                        {isSelected && (
                          <rect
                            x="-2"
                            y="-2"
                            width={compW + 4}
                            height={compH + 4}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="3"
                            rx="4"
                          />
                        )}

                        {/* Thermal Clearance Halos (Dissipation & Airflow Buffer) */}
                        {(showThermalZones || isSelected) && item.data.category === 'power_supply' && (
                          <g className="pointer-events-none">
                            <rect
                              x={-20}
                              y={-25}
                              width={compW + 40}
                              height={compH + 50}
                              fill="rgba(245, 158, 11, 0.08)"
                              stroke="#f59e0b"
                              strokeWidth="1.2"
                              strokeDasharray="4 2"
                              rx="4"
                            />
                            <path
                              d={`M ${compW / 2 - 8} ${-8} L ${compW / 2} ${-16} L ${compW / 2 + 8} ${-8}`}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                            <text
                              x={compW / 2}
                              y={-18}
                              fill="#f59e0b"
                              fontSize="6"
                              fontFamily="JetBrains Mono"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              20mm CONVECÇÃO
                            </text>
                          </g>
                        )}

                        {(showThermalZones || isSelected) && item.data.category === 'plc_cpu' && (
                          <g className="pointer-events-none">
                            <rect
                              x={-10}
                              y={-15}
                              width={compW + 20}
                              height={compH + 30}
                              fill="rgba(56, 189, 248, 0.08)"
                              stroke="#38bdf8"
                              strokeWidth="1.2"
                              strokeDasharray="3 3"
                              rx="3"
                            />
                            <text
                              x={compW / 2}
                              y={-8}
                              fill="#38bdf8"
                              fontSize="5.5"
                              fontFamily="JetBrains Mono"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              10mm ISOLAMENTO
                            </text>
                          </g>
                        )}

                        {/* Thermal Warning Indicator if clearance is violated */}
                        {(() => {
                          const issue = thermalAssessment.issues.find((iss) => iss.componentId === item.instanceId);
                          if (!issue) return null;
                          return (
                            <g transform={`translate(${compW - 2}, -10)`}>
                              <circle cx="0" cy="0" r="5.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                              <text x="0" y="2.5" fill="#ffffff" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">!</text>
                              <title>{`Aviso Térmico EN 61439: ${issue.message}`}</title>
                            </g>
                          );
                        })()}

                        {/* =====================================
                            1. MEAN WELL POWER SUPPLY RENDERING
                           ===================================== */}
                        {item.data.category === 'power_supply' ? (
                          <g>
                            {/* Body casing (Deep Blue / Metal) */}
                            <rect
                              x="0"
                              y="0"
                              width={compW}
                              height={compH}
                              fill="#0369a1"
                              stroke="#38bdf8"
                              strokeWidth="1.5"
                              rx="3"
                            />
                            {/* Top terminal area */}
                            <rect x="2" y="2" width={compW - 4} height="18" fill="#0c4a6e" rx="2" />
                            <text
                              x={compW / 2}
                              y="14"
                              fill="#ffffff"
                              fontSize="8"
                              fontWeight="bold"
                              fontFamily="JetBrains Mono"
                              textAnchor="middle"
                            >
                              L N PE
                            </text>

                            {/* Ventilation grille */}
                            <rect x="4" y="24" width={compW - 8} height={Math.min(14, Math.max(8, compH * 0.1))} fill="#082f49" rx="1" />
                            {Array.from({ length: 4 }).map((_, gIdx) => (
                              <line
                                key={gIdx}
                                x1="6"
                                y1={26 + gIdx * 2.5}
                                x2={compW - 6}
                                y2={26 + gIdx * 2.5}
                                stroke="#38bdf8"
                                strokeWidth="1"
                              />
                            ))}

                            {/* Center Logo & Model */}
                            <text
                              x={compW / 2}
                              y={compH / 2 - 2}
                              fill="#f8fafc"
                              fontSize={compW < 35 ? '7' : '9'}
                              fontWeight="bold"
                              fontFamily="Plus Jakarta Sans"
                              textAnchor="middle"
                              style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                            >
                              <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                              MEAN WELL
                            </text>
                            <text
                              x={compW / 2}
                              y={compH / 2 + 10}
                              fill="#38bdf8"
                              fontSize={compW < 35 ? '7' : '8'}
                              fontWeight="bold"
                              fontFamily="JetBrains Mono"
                              textAnchor="middle"
                              style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                            >
                              <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                              {truncateText(item.data.partNumber, Math.floor((compW - 6) / 4.5))}
                            </text>

                            {/* DC OK LED */}
                            <circle cx="10" cy={compH - 28} r="3" fill="#22c55e" />
                            <text x="16" y={compH - 25} fill="#86efac" fontSize="7" fontFamily="JetBrains Mono">
                              DC OK
                            </text>

                            {/* Bottom DC Terminals */}
                            <rect x="2" y={compH - 20} width={compW - 4} height="18" fill="#0c4a6e" rx="2" />
                            <text
                              x={compW / 2}
                              y={compH - 8}
                              fill="#ef4444"
                              fontSize="8"
                              fontWeight="bold"
                              fontFamily="JetBrains Mono"
                              textAnchor="middle"
                            >
                              +V -V
                            </text>
                          </g>
                        ) : /* =====================================
                            2. SIEMENS PLC CPU OR EXPANSION
                           ===================================== */
                        item.data.category === 'plc_cpu' || item.data.category === 'plc_expansion' ? (
                          <g>
                            {/* Siemens Grey Body */}
                            <rect
                              x="0"
                              y="0"
                              width={compW}
                              height={compH}
                              fill="#334155"
                              stroke="#0d9488"
                              strokeWidth="1.5"
                              rx="3"
                            />
                            {/* Siemens Turquoise Accent Banner */}
                            <rect x="0" y="0" width={compW} height="14" fill="#0f766e" rx="2" />
                            <text
                              x={compW / 2}
                              y="10"
                              fill="#ffffff"
                              fontSize={compW < 40 ? '7' : '8'}
                              fontWeight="bold"
                              fontFamily="Plus Jakarta Sans"
                              textAnchor="middle"
                            >
                              SIEMENS
                            </text>

                            {/* LOGO! Display or S7 Door */}
                            {item.data.name.includes('LOGO!') ? (
                              <g transform={`translate(${Math.max(4, (compW - 55) / 2)}, 20)`}>
                                {/* Backlit LCD display */}
                                <rect x="0" y="0" width="55" height={Math.min(40, compH - 45)} fill="#0369a1" rx="2" stroke="#0284c7" />
                                <text x="27" y="16" fill="#e0f2fe" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle">
                                  LOGO! 8
                                </text>
                                <text x="27" y="28" fill="#38bdf8" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">
                                  RUN / STOP
                                </text>
                                {compH >= 80 && (
                                  <>
                                    {/* Keypad Buttons */}
                                    <circle cx="15" cy="46" r="3" fill="#64748b" />
                                    <circle cx="27" cy="46" r="3" fill="#64748b" />
                                    <circle cx="39" cy="46" r="3" fill="#64748b" />
                                  </>
                                )}
                              </g>
                            ) : (
                              <g>
                                {/* S7-1200 / S7-1500 Status LEDs */}
                                <g transform="translate(6, 20)">
                                  <circle cx="4" cy="4" r="2.5" fill="#22c55e" />
                                  <text x="10" y="6" fill="#cbd5e1" fontSize="6" fontFamily="JetBrains Mono">RUN</text>
                                  <circle cx="4" cy="12" r="2.5" fill="#64748b" />
                                  <text x="10" y="14" fill="#cbd5e1" fontSize="6" fontFamily="JetBrains Mono">ERR</text>
                                  <circle cx="4" cy="20" r="2.5" fill="#eab308" />
                                  <text x="10" y="22" fill="#cbd5e1" fontSize="6" fontFamily="JetBrains Mono">MAINT</text>
                                </g>

                                {/* PROFINET green jack */}
                                {compW >= 80 && (
                                  <rect x={compW - 28} y="20" width="22" height="18" fill="#15803d" rx="2" />
                                )}

                                {/* S7-1500 Front Flap Display Window (if tall PLC e.g. >= 130mm) */}
                                {compH >= 130 && (
                                  <g transform={`translate(${Math.max(4, (compW - 28) / 2)}, 46)`}>
                                    <rect x="0" y="0" width={Math.max(24, compW - 8)} height="46" fill="#0f172a" stroke="#047857" strokeWidth="1" rx="2" />
                                    <rect x="3" y="3" width={Math.max(18, compW - 14)} height="22" fill="#064e3b" rx="1" />
                                    <text x={Math.max(12, (compW - 8) / 2)} y="15" fill="#6ee7b7" fontSize="6" fontFamily="JetBrains Mono" textAnchor="middle">
                                      S7-1500
                                    </text>
                                    <circle cx={Math.max(8, (compW - 8) / 4)} cy="36" r="2" fill="#64748b" />
                                    <circle cx={Math.max(14, (compW - 8) / 2)} cy="36" r="2" fill="#64748b" />
                                    <circle cx={Math.max(20, (3 * (compW - 8)) / 4)} cy="36" r="2" fill="#64748b" />
                                  </g>
                                )}

                                {/* Part Number label */}
                                <text
                                  x={compW / 2}
                                  y={compH >= 130 ? compH - 28 : compH / 2 + 12}
                                  fill="#2dd4bf"
                                  fontSize={compW < 60 ? '7' : '8'}
                                  fontWeight="bold"
                                  fontFamily="JetBrains Mono"
                                  textAnchor="middle"
                                  style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                >
                                  <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                  {truncateText(item.data.partNumber, Math.floor((compW - 8) / 4.5))}
                                </text>
                              </g>
                            )}

                            {/* Terminal Strips Top & Bottom */}
                            <rect x="2" y={compH - 18} width={compW - 4} height="16" fill="#1e293b" rx="1" />
                            <text
                              x={compW / 2}
                              y={compH - 7}
                              fill="#94a3b8"
                              fontSize="7"
                              fontFamily="JetBrains Mono"
                              textAnchor="middle"
                            >
                              I/O BORNES
                            </text>
                          </g>
                        ) : /* =====================================
                            3. CIRCUIT BREAKER / RCCB / SWITCHGEAR
                           ===================================== */
                        item.data.category === 'protection_ac' || item.data.category === 'protection_dc' ? (
                          <g>
                            <rect
                              x="0"
                              y="0"
                              width={compW}
                              height={compH}
                              fill="#1e293b"
                              stroke="#64748b"
                              strokeWidth="1.5"
                              rx="2"
                            />
                            {/* Toggle Switch */}
                            <rect
                              x={compW / 2 - 4}
                              y={compH / 2 - 12}
                              width="8"
                              height="22"
                              fill={item.data.category === 'protection_dc' ? '#ef4444' : '#0f172a'}
                              rx="2"
                            />
                            {/* Test button if RCCB */}
                            {item.data.name.includes('Diferencial') && (
                              <circle cx={compW / 2} cy={compH / 2 - 24} r="4" fill="#3b82f6" />
                            )}
                            <text
                              x={compW / 2}
                              y={compH / 2 + 22}
                              fill="#f8fafc"
                              fontSize={compW < 22 ? '7' : '8'}
                              fontWeight="bold"
                              fontFamily="JetBrains Mono"
                              textAnchor="middle"
                            >
                              {item.data.ratedCurrentA}A
                            </text>
                            {/* Part Number / Model: For narrow MCBs (1P / <= 22mm), rotate vertically down the body for 100% legibility */}
                            {compW <= 22 ? (
                              <g transform={`translate(${compW / 2}, ${compH / 2 + 6}) rotate(-90)`}>
                                <text
                                  x="0"
                                  y="2.5"
                                  fill="#94a3b8"
                                  fontSize="6.5"
                                  fontFamily="JetBrains Mono"
                                  textAnchor="middle"
                                  style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                >
                                  <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                  {truncateText(item.data.partNumber.split('-')[0], Math.floor((compH - 20) / 4.2))}
                                </text>
                              </g>
                            ) : (
                              <text
                                x={compW / 2}
                                y={compH - 8}
                                fill="#94a3b8"
                                fontSize={compW < 40 ? '7' : '8'}
                                fontFamily="JetBrains Mono"
                                textAnchor="middle"
                                style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                              >
                                <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                {truncateText(item.data.partNumber.split('-')[0], Math.floor((compW - 4) / 4.5))}
                              </text>
                            )}
                          </g>
                        ) : /* =====================================
                            4. RELAYS (INTERFACES, INDUSTRIAL, TIMERS)
                           ===================================== */
                        item.data.category === 'relays' ? (
                          <g>
                            {/* Relay DIN Socket Base */}
                            <rect
                              x="0"
                              y="0"
                              width={compW}
                              height={compH}
                              fill="#1e293b"
                              stroke="#2563eb"
                              strokeWidth="1.5"
                              rx="2"
                            />
                            {/* Top & Bottom Terminal Strips */}
                            <rect x="1" y="2" width={compW - 2} height="14" fill="#0f172a" rx="1" />
                            <rect x="1" y={compH - 16} width={compW - 2} height="14" fill="#0f172a" rx="1" />
                            
                            {/* Clear Relay Body / Window */}
                            <rect
                              x="2"
                              y="20"
                              width={compW - 4}
                              height={compH - 40}
                              fill="#172554"
                              stroke="#3b82f6"
                              strokeWidth="1"
                              rx="2"
                            />

                            {/* Internal Coil / Test Button / Dials */}
                            {item.data.partNumber.includes('80.01') || item.data.partNumber.includes('7PV15') ? (
                              /* Timer Rotary Dials */
                              <g transform={`translate(${compW / 2}, 38)`}>
                                <circle cx="0" cy="0" r="7" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                                <line x1="0" y1="0" x2="4" y2="-4" stroke="#38bdf8" strokeWidth="1.5" />
                                <circle cx="0" cy="20" r="7" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                                <line x1="0" y1="20" x2="-3" y2="16" stroke="#38bdf8" strokeWidth="1.5" />
                              </g>
                            ) : (
                              /* Standard Relay Coil & LED */
                              <g>
                                <circle cx={compW / 2} cy="30" r="3" fill="#22c55e" />
                                <rect
                                  x={compW / 2 - 3}
                                  y="40"
                                  width="6"
                                  height="18"
                                  fill="#d97706"
                                  rx="1"
                                />
                              </g>
                            )}

                            {/* Relay Model / Brand Tag (Vertical if narrow like Finder 39.11 6.2mm) */}
                            {compW < 14 ? (
                              <g transform={`translate(${compW / 2}, ${compH / 2}) rotate(-90)`}>
                                <text
                                  x="0"
                                  y="2.5"
                                  fill="#93c5fd"
                                  fontSize="6.5"
                                  fontWeight="bold"
                                  fontFamily="JetBrains Mono"
                                  textAnchor="middle"
                                  style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                >
                                  <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                  {item.tag} {truncateText(item.data.partNumber, Math.floor((compH - 25) / 4.2))}
                                </text>
                              </g>
                            ) : (
                              <>
                                <text
                                  x={compW / 2}
                                  y={compH - 22}
                                  fill="#93c5fd"
                                  fontSize={compW < 20 ? '6.5' : '7.5'}
                                  fontWeight="bold"
                                  fontFamily="JetBrains Mono"
                                  textAnchor="middle"
                                  style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                >
                                  <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                  {truncateText(item.tag, Math.floor((compW - 2) / 4.5))}
                                </text>
                                <text
                                  x={compW / 2}
                                  y={compH - 6}
                                  fill="#cbd5e1"
                                  fontSize="6"
                                  fontFamily="JetBrains Mono"
                                  textAnchor="middle"
                                  style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                >
                                  <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                  {item.data.ratedCurrentA ? `${item.data.ratedCurrentA}A` : 'RELÉ'}
                                </text>
                              </>
                            )}
                          </g>
                        ) : /* =====================================
                            5. TERMINALS & BORNES VIKING 3 (LEGRAND)
                           ===================================== */
                        item.data.category === 'terminals' ? (
                          <g>
                            {/* Viking 3 Legrand or Standard Terminals */}
                            {item.data.brand === 'Legrand' || item.data.name.includes('Viking') ? (
                              <g>
                                {/* Viking Main Casing */}
                                <rect
                                  x="0"
                                  y="8"
                                  width={compW}
                                  height={compH - 16}
                                  fill={
                                    item.data.name.includes('Terra')
                                      ? '#84cc16'
                                      : item.data.name.includes('Neutro')
                                      ? '#2563eb'
                                      : item.data.name.includes('Seccion')
                                      ? '#475569'
                                      : '#64748b'
                                  }
                                  stroke="#94a3b8"
                                  strokeWidth="1.2"
                                  rx="2"
                                />

                                {/* Dual-Color Stripe for Viking PE (Verde/Amarelo) */}
                                {item.data.name.includes('Terra') && (
                                  <rect
                                    x="0"
                                    y="20"
                                    width={compW}
                                    height="20"
                                    fill="#eab308"
                                  />
                                )}

                                {/* Orange Disconnect Lever for Viking Seccionável / Fusível */}
                                {item.data.name.includes('Seccion') && (
                                  <g transform={`translate(${compW / 2 - 5}, 28)`}>
                                    <rect x="0" y="0" width="10" height="28" fill="#ea580c" stroke="#f97316" rx="2" />
                                    {/* LED Indicator for Blown Fuse */}
                                    <circle cx="5" cy="8" r="2.5" fill="#ef4444" />
                                    <line x1="2" y1="16" x2="8" y2="16" stroke="#ffffff" strokeWidth="1" />
                                  </g>
                                )}

                                {/* Multi-tier steps if 2 pisos or 3 pisos */}
                                {(item.data.name.includes('Piso') || item.data.name.includes('Sensor')) && (
                                  <g>
                                    <line x1="0" y1="35" x2={compW} y2="35" stroke="#334155" strokeWidth="1" />
                                    <circle cx={compW / 2} cy="22" r="2.5" fill="#cbd5e1" />
                                    <circle cx={compW / 2} cy="48" r="2.5" fill="#cbd5e1" />
                                  </g>
                                )}

                                {/* Standard Terminal Screws Top & Bottom */}
                                {!item.data.name.includes('Piso') && (
                                  <g>
                                    <circle cx={compW / 2} cy="18" r="3" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
                                    <line x1={compW / 2 - 2} y1="18" x2={compW / 2 + 2} y2="18" stroke="#1e293b" strokeWidth="1" />
                                    <circle cx={compW / 2} cy={compH - 18} r="3" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
                                    <line x1={compW / 2 - 2} y1={compH - 18} x2={compW / 2 + 2} y2={compH - 18} stroke="#1e293b" strokeWidth="1" />
                                  </g>
                                )}

                                {/* Legrand Viking Marker Label Strip */}
                                <rect x="1" y="44" width={Math.max(2, compW - 2)} height="12" fill="#0f172a" rx="1" />
                                {compW < 10 ? (
                                  <g transform={`translate(${compW / 2}, 50) rotate(-90)`}>
                                    <text
                                      x="0"
                                      y="2"
                                      fill="#ffffff"
                                      fontSize="6"
                                      fontWeight="bold"
                                      fontFamily="JetBrains Mono"
                                      textAnchor="middle"
                                      style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                    >
                                      <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                      {item.tag}
                                    </text>
                                  </g>
                                ) : (
                                  <text
                                    x={compW / 2}
                                    y="53"
                                    fill="#ffffff"
                                    fontSize="7"
                                    fontWeight="bold"
                                    fontFamily="JetBrains Mono"
                                    textAnchor="middle"
                                    style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                  >
                                    <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                    {truncateText(item.tag, Math.floor((compW - 2) / 4.2))}
                                  </text>
                                )}
                                {compW >= 24 && (
                                  <text
                                    x={compW / 2}
                                    y="68"
                                    fill="#f8fafc"
                                    fontSize="6"
                                    fontFamily="Plus Jakarta Sans"
                                    textAnchor="middle"
                                    style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                  >
                                    <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                    VIKING 3
                                  </text>
                                )}
                              </g>
                            ) : (
                              /* Other Terminals (Weidmüller, etc.) */
                              <g>
                                <rect
                                  x="0"
                                  y="10"
                                  width={compW}
                                  height={compH - 20}
                                  fill={item.data.name.includes('Terra') ? '#65a30d' : '#475569'}
                                  stroke="#94a3b8"
                                  strokeWidth="1"
                                  rx="1"
                                />
                                <circle cx={compW / 2} cy="20" r="3" fill="#cbd5e1" />
                                <circle cx={compW / 2} cy={compH - 20} r="3" fill="#cbd5e1" />
                                {compW < 10 ? (
                                  <g transform={`translate(${compW / 2}, 50) rotate(-90)`}>
                                    <text
                                      x="0"
                                      y="2"
                                      fill="#ffffff"
                                      fontSize="6"
                                      fontWeight="bold"
                                      fontFamily="JetBrains Mono"
                                      textAnchor="middle"
                                      style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                    >
                                      <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                      {item.tag}
                                    </text>
                                  </g>
                                ) : (
                                  <text
                                    x={compW / 2}
                                    y="52"
                                    fill="#ffffff"
                                    fontSize="7.5"
                                    fontWeight="bold"
                                    fontFamily="JetBrains Mono"
                                    textAnchor="middle"
                                    style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                  >
                                    <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                    {truncateText(item.tag, Math.floor((compW - 2) / 4.5))}
                                  </text>
                                )}
                              </g>
                            )}
                          </g>
                        ) : (
                          /* Other components (Contactors, Sockets, etc.) */
                          <g>
                            <rect
                              x="0"
                              y="0"
                              width={compW}
                              height={compH}
                              fill="#1e293b"
                              stroke="#64748b"
                              strokeWidth="1.5"
                              rx="2"
                            />
                            {compW < 24 ? (
                              <g transform={`translate(${compW / 2}, 50) rotate(-90)`}>
                                <text
                                  x="0"
                                  y="2.5"
                                  fill="#f8fafc"
                                  fontSize="6.5"
                                  fontWeight="bold"
                                  fontFamily="JetBrains Mono"
                                  textAnchor="middle"
                                  style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                >
                                  <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                  {truncateText(item.data.partNumber, Math.floor((compH - 20) / 4.2))}
                                </text>
                              </g>
                            ) : (
                              <text
                                x={compW / 2}
                                y="45"
                                fill="#f8fafc"
                                fontSize={compW < 40 ? '7' : '8'}
                                fontWeight="bold"
                                fontFamily="JetBrains Mono"
                                textAnchor="middle"
                                style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                              >
                                <title>{`${item.data.name} (${item.data.partNumber})`}</title>
                                {truncateText(item.data.partNumber, Math.floor((compW - 6) / 4.5))}
                              </text>
                            )}
                          </g>
                        )}

                        {/* Tag Label Badge Above Component (Adaptive Width to prevent overlapping) */}
                        {(compW >= 8 || isSelected) && (
                          <g transform={`translate(${compW / 2}, -6)`}>
                            {(() => {
                              const tagStr = item.tag || '';
                              const tagLength = tagStr.length || 3;
                              const naturalW = Math.max(16, tagLength * 6.5 + 8);
                              const badgeW = Math.min(naturalW, Math.max(16, compW - 2));
                              const halfW = badgeW / 2;
                              const fontSize = badgeW < 20 ? 6.5 : 7.5;
                              return (
                                <>
                                  <rect
                                    x={-halfW}
                                    y="-14"
                                    width={badgeW}
                                    height="14"
                                    fill="#0f172a"
                                    stroke={isSelected ? '#38bdf8' : '#64748b'}
                                    strokeWidth="1"
                                    rx="2"
                                  />
                                  <text
                                    x="0"
                                    y="-4"
                                    fill={isSelected ? '#38bdf8' : '#f8fafc'}
                                    fontSize={fontSize}
                                    fontWeight="bold"
                                    fontFamily="JetBrains Mono"
                                    textAnchor="middle"
                                    style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                  >
                                    <title>{`${item.tag}: ${item.data.name} (${item.data.partNumber})`}</title>
                                    {item.tag}
                                  </text>
                                </>
                              );
                            })()}
                          </g>
                        )}

                        {/* Live Dimension Badge Below Component when Selected */}
                        {isSelected && (
                          <g transform={`translate(${compW / 2}, ${compH + 11})`}>
                            <rect
                              x="-27"
                              y="-7"
                              width="54"
                              height="12"
                              fill="#0284c7"
                              stroke="#38bdf8"
                              strokeWidth="0.8"
                              rx="2"
                            />
                            <text
                              x="0"
                              y="1.5"
                              fill="#ffffff"
                              fontSize="6.5"
                              fontWeight="bold"
                              fontFamily="JetBrains Mono"
                              textAnchor="middle"
                            >
                              {compW}×{compH}mm
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  });
                })()}

                  {/* Magnetic Snap Guide Line & Floating Badge (Visible while dragging on this rail) */}
                  {dragState && dragState.railIndex === rIdx && dragState.snapGuideX !== null && (
                    <g className="pointer-events-none" transform={`translate(${dragState.snapGuideX}, 0)`}>
                      <line
                        x1="0"
                        y1="-15"
                        x2="0"
                        y2="125"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        className="animate-pulse"
                      />
                      <g transform="translate(0, -18)">
                        <rect
                          x="-70"
                          y="-13"
                          width="140"
                          height="22"
                          fill="#0284c7"
                          rx="4"
                          stroke="#38bdf8"
                          strokeWidth="1.2"
                          className="shadow-xl"
                        />
                        <text
                          x="0"
                          y="2.5"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="Plus Jakarta Sans"
                          textAnchor="middle"
                        >
                          🧲 {dragState.snapGuideLabel || 'Snap: 5mm'}
                        </text>
                      </g>
                    </g>
                  )}

                  {/* Inter-Component Uniform 5mm Spacing Indicators */}
                  {(() => {
                    const sortedItems = [...rail.items].sort((a, b) => a.positionMm - b.positionMm);
                    return sortedItems.map((itA, idxA) => {
                      if (idxA >= sortedItems.length - 1) return null;
                      const itB = sortedItems[idxA + 1];
                      const endA = itA.positionMm + itA.data.widthMm;
                      const startB = itB.positionMm;
                      const gap = Math.round((startB - endA) * 10) / 10;
                      if (gap < 0 || gap > 75) return null;
                      const isUniform5mm = Math.abs(gap - 5) <= 0.3;
                      const midX = (endA + startB) / 2;

                      return (
                        <g key={`gap-${itA.instanceId}-${itB.instanceId}`}>
                          <line
                            x1={endA}
                            y1="106"
                            x2={startB}
                            y2="106"
                            stroke={isUniform5mm ? "#10b981" : "#f59e0b"}
                            strokeWidth={isUniform5mm ? "1.5" : "1"}
                            strokeDasharray={isUniform5mm ? "none" : "2 2"}
                          />
                          <circle cx={endA} cy="106" r="1.5" fill={isUniform5mm ? "#10b981" : "#f59e0b"} />
                          <circle cx={startB} cy="106" r="1.5" fill={isUniform5mm ? "#10b981" : "#f59e0b"} />

                          {isUniform5mm ? (
                            <g transform={`translate(${midX}, 113)`} className="pointer-events-none">
                              <rect
                                x="-12"
                                y="-5.5"
                                width="24"
                                height="11"
                                fill="#064e3b"
                                stroke="#10b981"
                                strokeWidth="0.8"
                                rx="2"
                              />
                              <text
                                x="0"
                                y="2.5"
                                fill="#6ee7b7"
                                fontSize="6.5"
                                fontFamily="JetBrains Mono"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                5mm
                              </text>
                            </g>
                          ) : (
                            <g
                              transform={`translate(${midX}, 113)`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSnapGapTo5mm(rIdx, itA.instanceId, itB.instanceId);
                              }}
                              className="cursor-pointer group"
                            >
                              <title>{`Espaçamento atual: ${gap}mm. Clique para ajustar magneticamente a 5mm`}</title>
                              <rect
                                x="-16"
                                y="-6"
                                width="32"
                                height="12"
                                fill="#451a03"
                                stroke="#f59e0b"
                                strokeWidth="0.8"
                                rx="2"
                                className="group-hover:fill-amber-900 group-hover:stroke-amber-300 transition"
                              />
                              <text
                                x="0"
                                y="2.5"
                                fill="#fde68a"
                                fontSize="6.5"
                                fontFamily="JetBrains Mono"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {gap}mm 🧲
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    });
                  })()}

                  {/* Action Card: Inserir Componente (Appears ONLY when this DIN Rail is clicked / selected) */}
                  {isSelectedRail && (
                    <g
                      transform={`translate(${Math.min(Math.max(10, railWidth - 175), Math.max(10, usedWidth + 12))}, 18)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCatalog(rIdx);
                      }}
                      className="cursor-pointer group"
                    >
                      {/* High-contrast solid container over the DIN rail */}
                      <rect
                        x="0"
                        y="0"
                        width="170"
                        height="74"
                        fill="#090d16"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        rx="8"
                        className="group-hover:fill-sky-950/90 group-hover:stroke-sky-300 drop-shadow-xl transition"
                      />
                      {/* Main action pill button */}
                      <rect
                        x="10"
                        y="10"
                        width="150"
                        height="32"
                        fill="#0284c7"
                        rx="6"
                        className="group-hover:fill-sky-500 transition"
                      />
                      <circle cx="28" cy="26" r="8" fill="#0369a1" />
                      <text
                        x="28"
                        y="30"
                        fill="#ffffff"
                        fontSize="14"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        +
                      </text>
                      <text
                        x="88"
                        y="30"
                        fill="#ffffff"
                        fontSize="10.5"
                        fontWeight="bold"
                        fontFamily="Plus Jakarta Sans"
                        textAnchor="middle"
                      >
                        Inserir Componente
                      </text>
                      {/* Remaining capacity info */}
                      <text
                        x="85"
                        y="55"
                        fill={isOverfull ? '#f87171' : '#94a3b8'}
                        fontSize="8.5"
                        fontFamily="JetBrains Mono"
                        textAnchor="middle"
                      >
                        {railWidth - usedWidth > 0
                          ? `Restam ${Math.max(0, Math.round(railWidth - usedWidth))}mm livres`
                          : 'Capacidade máxima atingida'}
                      </text>
                      <text
                        x="85"
                        y="66"
                        fill="#38bdf8"
                        fontSize="7.5"
                        fontFamily="Plus Jakarta Sans"
                        textAnchor="middle"
                      >
                        Clique para abrir o catálogo
                      </text>
                    </g>
                  )}

                  {/* Rail Header Bar (Clean, without colliding buttons) */}
                  <g transform="translate(0, -28)">
                    {/* Dark contrast pill behind header spanning full rail width */}
                    <rect
                      x="-4"
                      y="-12"
                      width={railWidth + 8}
                      height="24"
                      fill="#090d16"
                      stroke={isSelectedRail ? "#38bdf8" : "#334155"}
                      strokeWidth={isSelectedRail ? "1.5" : "1"}
                      rx="4"
                      className="drop-shadow-md"
                    />
                    <text
                      x="8"
                      y="4"
                      fill="#f8fafc"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="Plus Jakarta Sans"
                    >
                      {rail.name} <tspan fill="#38bdf8" fontSize="9">· Calha DIN 35mm</tspan>
                    </text>

                    {/* Selection status or click hint */}
                    {isSelectedRail ? (
                      <g transform="translate(160, -9)">
                        <rect
                          x="0"
                          y="0"
                          width="125"
                          height="18"
                          fill="#0284c7"
                          rx="3"
                        />
                        <text
                          x="62.5"
                          y="12.5"
                          fill="#ffffff"
                          fontSize="8.5"
                          fontWeight="bold"
                          fontFamily="Plus Jakarta Sans"
                          textAnchor="middle"
                        >
                          CALHA SELECIONADA
                        </text>
                      </g>
                    ) : (
                      <text
                        x="160"
                        y="3.5"
                        fill="#64748b"
                        fontSize="8"
                        fontFamily="JetBrains Mono"
                        opacity="0.8"
                      >
                        Clique na calha p/ inserir
                      </text>
                    )}

                    {/* Magnetic 5mm Align Rail Button */}
                    {isSelectedRail && rail.items.length > 1 && (
                      <g
                        transform={`translate(${Math.max(295, Math.min(railWidth - 160, 305))}, -9)`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAlignRailWithUniformSpacing(rIdx, 5);
                        }}
                        className="cursor-pointer group"
                      >
                        <rect
                          x="0"
                          y="0"
                          width="125"
                          height="18"
                          fill="#0369a1"
                          stroke="#38bdf8"
                          strokeWidth="1"
                          rx="3"
                          className="group-hover:fill-sky-600 transition shadow-xs"
                        />
                        <text
                          x="62.5"
                          y="12.5"
                          fill="#ffffff"
                          fontSize="8.5"
                          fontWeight="bold"
                          fontFamily="Plus Jakarta Sans"
                          textAnchor="middle"
                        >
                          🧲 Alinhar Calha (5mm)
                        </text>
                      </g>
                    )}

                    {/* Rail occupancy meter - unobstructed and clear on the right */}
                    <text
                      x={railWidth}
                      y="3"
                      fill={isOverfull ? '#ef4444' : '#94a3b8'}
                      fontSize="9.5"
                      fontFamily="JetBrains Mono"
                      textAnchor="end"
                      className="font-bold"
                    >
                      {Math.round(usedWidth)}mm / {railWidth}mm ({Math.round((usedWidth / railWidth) * 100)}%)
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Quick Add Rail Button in Canvas */}
            {rails.length < 8 && (
              <g
                transform={`translate(${24 + sideDuct + 10}, ${Math.min(cabHeight - 65, 80 + rails.length * (config.railSpacingMm || 160) - 25)})`}
                onClick={handleAddRail}
                className="cursor-pointer group"
              >
                <rect
                  x="0"
                  y="0"
                  width={usableWidth}
                  height="28"
                  fill="#0f172a"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  rx="6"
                  className="group-hover:fill-blue-950/60 group-hover:stroke-blue-400 transition"
                />
                <text
                  x={usableWidth / 2}
                  y="18"
                  fill="#93c5fd"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="Plus Jakarta Sans"
                  textAnchor="middle"
                  className="group-hover:fill-white transition"
                >
                  + Adicionar Calha DIN 35mm (Calha {rails.length + 1})
                </text>
              </g>
            )}

            {/* ========================================================
                WIRING & CURRENT SIMULATION LAYER (Condutores e Fiação)
               ======================================================== */}
            {showWiring && (
              <g className="wiring-layer pointer-events-none">
                <defs>
                  <style>
                    {`
                      @keyframes wireFlow {
                        from { stroke-dashoffset: 24; }
                        to { stroke-dashoffset: 0; }
                      }
                      .animate-wire-flow {
                        animation: wireFlow 1.0s linear infinite;
                      }
                      .animate-wire-pulse {
                        animation: wireFlow 0.6s linear infinite;
                      }
                    `}
                  </style>
                </defs>

                {/* Calculate and draw each wire path */}
                {(() => {
                  // Build absolute position lookup for all components
                  const compPosMap: Record<string, { railIdx: number; railY: number; centerX: number; topY: number; bottomY: number; item: PlacedComponent }> = {};
                  rails.forEach((rail, rIdx) => {
                    const railX = 24 + sideDuct + 10;
                    const railY = 80 + rIdx * config.railSpacingMm;
                    rail.items.forEach((it) => {
                      const itH = it.data.heightMm || 90;
                      const itY = railY + (55 - itH / 2);
                      const centerX = railX + it.positionMm + it.data.widthMm / 2;
                      const topY = itY;
                      const bottomY = itY + itH;
                      compPosMap[it.tag] = { railIdx: rIdx, railY, centerX, topY, bottomY, item: it };
                      compPosMap[it.instanceId] = { railIdx: rIdx, railY, centerX, topY, bottomY, item: it };
                    });
                  });

                  return updatedWires.map((wire, wIdx) => {
                    const fromPos = compPosMap[wire.fromComponentTag] || compPosMap[wire.fromComponentId];
                    const toPos = compPosMap[wire.toComponentTag] || compPosMap[wire.toComponentId];

                    if (!fromPos || !toPos) return null;

                    // Match exact physical terminal pin coordinates from allProjectTerminals
                    const fromAnchor = allProjectTerminals.find(
                      (a) =>
                        (a.componentId === wire.fromComponentId || a.componentTag === wire.fromComponentTag) &&
                        (a.terminalId.toLowerCase() === wire.fromTerminal.toLowerCase() ||
                          a.label.toLowerCase() === wire.fromTerminal.toLowerCase() ||
                          a.label.includes(wire.fromTerminal))
                    ) || allProjectTerminals.find(
                      (a) => a.componentId === wire.fromComponentId || a.componentTag === wire.fromComponentTag
                    );

                    const toAnchor = allProjectTerminals.find(
                      (a) =>
                        (a.componentId === wire.toComponentId || a.componentTag === wire.toComponentTag) &&
                        (a.terminalId.toLowerCase() === wire.toTerminal.toLowerCase() ||
                          a.label.toLowerCase() === wire.toTerminal.toLowerCase() ||
                          a.label.includes(wire.toTerminal))
                    ) || allProjectTerminals.find(
                      (a) => a.componentId === wire.toComponentId || a.componentTag === wire.toComponentTag
                    );

                    const fromIsTop = fromAnchor
                      ? fromAnchor.isTop
                      : !(
                          wire.fromTerminal.includes('2') ||
                          wire.fromTerminal.includes('out') ||
                          wire.fromTerminal.includes('-V') ||
                          wire.fromTerminal.includes('M') ||
                          wire.fromTerminal.includes('DQ') ||
                          wire.fromTerminal.includes('14')
                        );
                    const toIsTop = toAnchor
                      ? toAnchor.isTop
                      : !(
                          wire.toTerminal.includes('2') ||
                          wire.toTerminal.includes('out') ||
                          wire.toTerminal.includes('-V') ||
                          wire.toTerminal.includes('M') ||
                          wire.toTerminal.includes('DQ') ||
                          wire.toTerminal.includes('14')
                        );

                    const x1 = fromAnchor ? fromAnchor.x : fromPos.centerX;
                    const y1 = fromAnchor ? fromAnchor.y : (fromIsTop ? fromPos.topY : fromPos.bottomY);

                    const x2 = toAnchor ? toAnchor.x : toPos.centerX;
                    const y2 = toAnchor ? toAnchor.y : (toIsTop ? toPos.topY : toPos.bottomY);

                    const isEnergized = Boolean(wire.isEnergized);
                    const isSelectedWire = selectedWire?.id === wire.id;
                    const isHoveredWire = hoveredWireId === wire.id;
                    const isHighlighted = isWireHighlighted(wire);
                    const isDimmed = hasAnyWireFocus && !isHighlighted;

                    const baseStrokeWidth = wire.crossSectionMm2 >= 4 ? 3 : 2;
                    const strokeWidth = isHighlighted ? baseStrokeWidth + 2 : baseStrokeWidth;
                    const wireOpacity = isDimmed ? 0.12 : isHighlighted ? 1.0 : (isEnergized ? 0.95 : 0.65);

                    // ========================================================
                    // ROUTING COMPUTATION: Multi-lane Desfasado vs Direct Flywire
                    // ========================================================
                    let pathData = '';
                    let midX = 0;
                    let midY = 0;

                    if (wireRouteStyle === 'direct') {
                      // Direct Point-to-Point Smooth S-Curves (Zero duct clutter)
                      const dy = y2 - y1;
                      const ctrlDist = Math.max(35, Math.min(130, Math.abs(dy) * 0.45));
                      const c1y = fromIsTop ? y1 - ctrlDist : y1 + ctrlDist;
                      const c2y = toIsTop ? y2 - ctrlDist : y2 + ctrlDist;
                      pathData = `M ${x1} ${y1} C ${x1} ${c1y}, ${x2} ${c2y}, ${x2} ${y2}`;
                      midX = (x1 + x2) / 2;
                      midY = (y1 + y2) / 2;
                    } else {
                      // Professional Manhattan / Orthogonal Routing with corner fillets & multi-channel canaletas
                      const route = routeManhattanWire({
                        x1,
                        y1,
                        fromIsTop,
                        fromRailIdx: fromPos.railIdx,
                        fromRailY: fromPos.railY,
                        x2,
                        y2,
                        toIsTop,
                        toRailIdx: toPos.railIdx,
                        toRailY: toPos.railY,
                        cabWidth,
                        cabHeight,
                        sideDuctWidth: sideDuct,
                        horizontalDuctHeight: horizDuct,
                        wireIndex: wIdx,
                        cornerRadius: 5,
                        terminalSlackMm: 100,
                      });
                      pathData = route.pathData;
                      midX = route.midX;
                      midY = route.midY;
                    }

                    return (
                      <g
                        key={wire.id}
                        className={`pointer-events-auto cursor-pointer group transition-opacity duration-200 ${
                          isDimmed ? 'opacity-20' : 'opacity-100'
                        }`}
                        onMouseEnter={() => setHoveredWireId(wire.id)}
                        onMouseLeave={() => setHoveredWireId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWire(wire);
                        }}
                      >
                        <title>{`Condutor ${wire.wireTag} (${wire.crossSectionMm2}mm²)\nDe: ${wire.fromComponentTag} [Term. ${wire.fromTerminal}]\nPara: ${wire.toComponentTag} [Term. ${wire.toTerminal}]\nTipo: ${wire.netType}\nEstado: ${isEnergized ? '⚡ Em Tensão / Ativo' : '⚪ Sem Tensão'}\nClique para inspecionar ou eliminar`}</title>

                        {/* Transparent wide hover hit target */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={strokeWidth + 16}
                          className="cursor-pointer"
                        />

                        {/* Circuit Isolation Glowing Halo when focused/selected */}
                        {isHighlighted && (
                          <path
                            d={pathData}
                            fill="none"
                            stroke={isSelectedWire ? '#38bdf8' : wire.color}
                            strokeWidth={strokeWidth + 7}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.65"
                            className="animate-pulse"
                          />
                        )}

                        {/* Glow halo when energized (in normal state) */}
                        {isEnergized && !isHighlighted && (
                          <path
                            d={pathData}
                            fill="none"
                            stroke={wire.color}
                            strokeWidth={strokeWidth + 3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.3"
                          />
                        )}

                        {/* Solid underlying cable */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke={wire.color}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={wireOpacity}
                        />

                        {/* Animated current flow dashed pulses */}
                        {(isEnergized || isHighlighted) && (
                          <path
                            d={pathData}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth={strokeWidth * 0.75}
                            strokeDasharray={isHighlighted ? '8 6' : '6 8'}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={isHighlighted ? 'animate-wire-pulse' : 'animate-wire-flow'}
                            opacity={isHighlighted ? 0.95 : 0.8}
                          />
                        )}

                        {/* Terminal connection dots with outer glow */}
                        <circle
                          cx={x1}
                          cy={y1}
                          r={isHighlighted ? 4.5 : 2.8}
                          fill={wire.color}
                          stroke="#ffffff"
                          strokeWidth={isHighlighted ? 1.8 : 1}
                        />
                        <circle
                          cx={x2}
                          cy={y2}
                          r={isHighlighted ? 4.5 : 2.8}
                          fill={wire.color}
                          stroke="#ffffff"
                          strokeWidth={isHighlighted ? 1.8 : 1}
                        />

                        {/* ========================================================
                            ORIGIN & DESTINATION PROMINENT CALLOUTS (When Focused)
                           ======================================================== */}
                        {isHighlighted && (
                          <>
                            {/* Origin Flag Badge */}
                            <g transform={`translate(${x1}, ${fromIsTop ? y1 - 22 : y1 + 22})`} className="pointer-events-none drop-shadow-xl animate-in zoom-in-75 duration-150">
                              <rect
                                x="-48"
                                y="-10"
                                width="96"
                                height="20"
                                rx="4"
                                fill="#065f46"
                                stroke="#34d399"
                                strokeWidth="1.5"
                              />
                              <text
                                x="0"
                                y="3"
                                fill="#ffffff"
                                fontSize="7.5"
                                fontWeight="bold"
                                fontFamily="Plus Jakarta Sans"
                                textAnchor="middle"
                              >
                                🟢 DE: {wire.fromComponentTag} [{wire.fromTerminal}]
                              </text>
                            </g>

                            {/* Destination Flag Badge */}
                            <g transform={`translate(${x2}, ${toIsTop ? y2 - 22 : y2 + 22})`} className="pointer-events-none drop-shadow-xl animate-in zoom-in-75 duration-150">
                              <rect
                                x="-48"
                                y="-10"
                                width="96"
                                height="20"
                                rx="4"
                                fill="#0369a1"
                                stroke="#38bdf8"
                                strokeWidth="1.5"
                              />
                              <text
                                x="0"
                                y="3"
                                fill="#ffffff"
                                fontSize="7.5"
                                fontWeight="bold"
                                fontFamily="Plus Jakarta Sans"
                                textAnchor="middle"
                              >
                                🎯 PARA: {wire.toComponentTag} [{wire.toTerminal}]
                              </text>
                            </g>

                            {/* Midpoint Directional Callout Tag */}
                            <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none drop-shadow-2xl animate-in zoom-in-75 duration-150">
                              <rect
                                x="-55"
                                y="-11"
                                width="110"
                                height="22"
                                rx="5"
                                fill="#090d16"
                                stroke={wire.color}
                                strokeWidth="2"
                              />
                              <text
                                x="0"
                                y="3.5"
                                fill="#ffffff"
                                fontSize="7.5"
                                fontWeight="bold"
                                fontFamily="JetBrains Mono"
                                textAnchor="middle"
                              >
                                {wire.wireTag} · {wire.fromComponentTag} ➔ {wire.toComponentTag}
                              </text>
                            </g>
                          </>
                        )}

                        {/* Standard Wire Identification Ferrules / Anilhas (when enabled and not dimmed) */}
                        {showWireTags && !isDimmed && !isHighlighted && (
                          <>
                            {/* Anilha no Terminal Origem (from) */}
                            <g transform={`translate(${x1}, ${fromIsTop ? y1 - 9 : y1 + 9})`}>
                              <rect
                                x="-13"
                                y="-5.5"
                                width="26"
                                height="11"
                                fill="#fef08a"
                                stroke="#ca8a04"
                                strokeWidth="0.8"
                                rx="2"
                                className="drop-shadow-xs"
                              />
                              <text
                                x="0"
                                y="2.5"
                                fill="#1c1917"
                                fontSize="6"
                                fontWeight="bold"
                                fontFamily="JetBrains Mono"
                                textAnchor="middle"
                              >
                                {wire.wireTag}
                              </text>
                              {/* Terminal label */}
                              <text
                                x="0"
                                y={fromIsTop ? -7 : 12}
                                fill="#93c5fd"
                                fontSize="5.5"
                                fontWeight="bold"
                                fontFamily="JetBrains Mono"
                                textAnchor="middle"
                              >
                                {wire.fromTerminal}
                              </text>
                            </g>

                            {/* Anilha no Terminal Destino (to) */}
                            <g transform={`translate(${x2}, ${toIsTop ? y2 - 9 : y2 + 9})`}>
                              <rect
                                x="-13"
                                y="-5.5"
                                width="26"
                                height="11"
                                fill="#fef08a"
                                stroke="#ca8a04"
                                strokeWidth="0.8"
                                rx="2"
                                className="drop-shadow-xs"
                              />
                              <text
                                x="0"
                                y="2.5"
                                fill="#1c1917"
                                fontSize="6"
                                fontWeight="bold"
                                fontFamily="JetBrains Mono"
                                textAnchor="middle"
                              >
                                {wire.wireTag}
                              </text>
                              {/* Terminal label */}
                              <text
                                x="0"
                                y={toIsTop ? -7 : 12}
                                fill="#93c5fd"
                                fontSize="5.5"
                                fontWeight="bold"
                                fontFamily="JetBrains Mono"
                                textAnchor="middle"
                              >
                                {wire.toTerminal}
                              </text>
                            </g>

                            {/* Etiqueta de percurso ao longo do trajeto */}
                            <g transform={`translate(${midX}, ${midY})`}>
                              <rect
                                x="-19"
                                y="-6.5"
                                width="38"
                                height="13"
                                fill="#090d16"
                                stroke={wire.color}
                                strokeWidth="1"
                                rx="2"
                                className="drop-shadow-sm"
                              />
                              <text
                                x="0"
                                y="2.5"
                                fill="#ffffff"
                                fontSize="6"
                                fontWeight="bold"
                                fontFamily="JetBrains Mono"
                                textAnchor="middle"
                              >
                                {wire.wireTag} <tspan fill="#94a3b8" fontSize="5">{wire.crossSectionMm2}²</tspan>
                              </text>
                            </g>
                          </>
                        )}
                      </g>
                    );
                  });
                })()}

                {/* Component Status Overlays (Live LEDs on DIN Rail) */}
                {rails.flatMap((rail, rIdx) => {
                  const railX = 24 + sideDuct + 10;
                  const railY = 80 + rIdx * config.railSpacingMm;

                  return rail.items.map((item) => {
                    const centerX = railX + item.positionMm + item.data.widthMm / 2;
                    const topY = railY + 5;

                    // Mean Well PSU Glowing DC OK LED
                    if (item.data.category === 'power_supply') {
                      const isOk = updatedState.isPsuHealthy && updatedState.measuredDcVoltage > 20;
                      return (
                        <g key={`led-${item.instanceId}`} transform={`translate(${centerX}, ${topY + 28})`}>
                          <circle cx="0" cy="0" r="5" fill={isOk ? '#10b981' : '#475569'} />
                          {isOk && <circle cx="0" cy="0" r="8" fill="#10b981" opacity="0.4" className="animate-ping" />}
                          <text x="8" y="3" fill="#6ee7b7" fontSize="7" fontWeight="bold" fontFamily="JetBrains Mono">
                            {isOk ? '24V DC OK' : 'OFF'}
                          </text>
                        </g>
                      );
                    }

                    // Siemens PLC Glowing RUN/STOP LED
                    if (item.data.category === 'plc_cpu') {
                      const isRun = updatedState.plcMode === 'RUN' && updatedState.measuredDcVoltage > 20;
                      return (
                        <g key={`led-${item.instanceId}`} transform={`translate(${centerX - 12}, ${topY + 36})`}>
                          <circle cx="0" cy="0" r="4.5" fill={isRun ? '#10b981' : '#eab308'} />
                          {isRun && <circle cx="0" cy="0" r="7" fill="#10b981" opacity="0.3" className="animate-ping" />}
                          <text x="8" y="3" fill={isRun ? '#6ee7b7' : '#fde047'} fontSize="7" fontWeight="bold" fontFamily="JetBrains Mono">
                            {isRun ? 'PLC: RUN' : 'PLC: STOP'}
                          </text>
                        </g>
                      );
                    }

                    // Relay Active Indicator
                    if (item.data.category === 'relays') {
                      const isEnergized = Boolean(updatedState.relayStates['K1'] || updatedState.relayStates[item.tag]);
                      return (
                        <g key={`led-${item.instanceId}`} transform={`translate(${centerX}, ${topY + 28})`}>
                          <circle cx="0" cy="0" r="3.5" fill={isEnergized ? '#22c55e' : '#334155'} />
                          {isEnergized && <circle cx="0" cy="0" r="6" fill="#22c55e" opacity="0.4" className="animate-ping" />}
                        </g>
                      );
                    }

                    return null;
                  });
                })}
              </g>
            )}

            {/* ========================================================
                INTERACTIVE TERMINAL CONNECTION POINTS (Pontos de Ligação / Bornes)
               ======================================================== */}
            {(isWiringMode || showWiring) && (
              <g className="terminals-interactive-layer pointer-events-auto">
                {allProjectTerminals.map((anchor) => {
                  const isDragSource = wireDragState?.fromAnchor.id === anchor.id;
                  const isHoveredTarget = wireDragState?.hoveredAnchor?.id === anchor.id;
                  const isValidTarget =
                    wireDragState &&
                    wireDragState.fromAnchor.componentId !== anchor.componentId &&
                    !isDragSource;

                  return (
                    <g
                      key={anchor.id}
                      transform={`translate(${anchor.x}, ${anchor.y})`}
                      className="cursor-crosshair group"
                      onMouseDown={(e) => handleStartWireDrag(e, anchor)}
                    >
                      <title>{`${anchor.componentTag} [${anchor.label}]: ${anchor.description}\nTipo: ${anchor.netType}\nClique e arraste para ligar condutor`}</title>

                      {/* Snap / Target pulsing ring when dragging another wire */}
                      {isValidTarget && !isHoveredTarget && (
                        <circle
                          cx="0"
                          cy="0"
                          r="7.5"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="1.2"
                          strokeDasharray="2 2"
                          opacity="0.8"
                          className="animate-spin"
                        />
                      )}

                      {/* Hovered Target Highlight (Magnetic Snap Lock) */}
                      {isHoveredTarget && (
                        <>
                          <circle
                            cx="0"
                            cy="0"
                            r="11"
                            fill="#10b981"
                            opacity="0.35"
                            className="animate-ping"
                          />
                          <circle
                            cx="0"
                            cy="0"
                            r="8.5"
                            fill="#064e3b"
                            stroke="#34d399"
                            strokeWidth="2"
                          />
                        </>
                      )}

                      {/* Source Pin Glowing Ring */}
                      {isDragSource && (
                        <circle
                          cx="0"
                          cy="0"
                          r="9"
                          fill="#f59e0b"
                          opacity="0.4"
                          className="animate-pulse"
                        />
                      )}

                      {/* Outer Screw / Metal Base Ring */}
                      <circle
                        cx="0"
                        cy="0"
                        r={isHoveredTarget ? 6.5 : isWiringMode ? 4.8 : 3.8}
                        fill="#0f172a"
                        stroke={isHoveredTarget ? '#34d399' : isDragSource ? '#f59e0b' : '#475569'}
                        strokeWidth="1.2"
                        className="group-hover:stroke-sky-400 group-hover:scale-125 transition-transform"
                      />

                      {/* Inner Colored Core (EN 60204-1 color standard) */}
                      <circle
                        cx="0"
                        cy="0"
                        r={isHoveredTarget ? 4 : isWiringMode ? 3.0 : 2.4}
                        fill={isHoveredTarget ? '#10b981' : anchor.color}
                        stroke="#ffffff"
                        strokeWidth="0.8"
                        className="group-hover:opacity-100 transition"
                      />

                      {/* Mini Terminal Label (visible in wiring mode or on hover) */}
                      {(isWiringMode || isHoveredTarget) && (
                        <g
                          transform={`translate(0, ${anchor.isTop ? -8 : 10})`}
                          className="pointer-events-none"
                        >
                          <rect
                            x="-11"
                            y="-4.5"
                            width="22"
                            height="9"
                            rx="2"
                            fill="#090d16"
                            stroke={isHoveredTarget ? '#34d399' : '#334155'}
                            strokeWidth="0.8"
                            className="drop-shadow-sm"
                          />
                          <text
                            x="0"
                            y="2.5"
                            fill={isHoveredTarget ? '#34d399' : '#e2e8f0'}
                            fontSize="5.5"
                            fontWeight="bold"
                            fontFamily="JetBrains Mono"
                            textAnchor="middle"
                          >
                            {anchor.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* ========================================================
                RUBBERBAND DYNAMIC WIRE DRAGGING PREVIEW
               ======================================================== */}
            {wireDragState && (
              <g className="wire-drag-rubberband pointer-events-none">
                {(() => {
                  const { startX, startY, currentX, currentY, fromAnchor, hoveredAnchor } = wireDragState;
                  const isFromTop = fromAnchor.isTop;
                  const isHoveredTop = hoveredAnchor ? hoveredAnchor.isTop : currentY < startY;

                  // Smooth S-curve routing
                  const dy = currentY - startY;
                  const c1y = isFromTop ? startY - Math.max(30, Math.abs(dy) * 0.45) : startY + Math.max(30, Math.abs(dy) * 0.45);
                  const c2y = isHoveredTop ? currentY - Math.max(30, Math.abs(dy) * 0.45) : currentY + Math.max(30, Math.abs(dy) * 0.45);
                  const rubberbandPath = `M ${startX} ${startY} C ${startX} ${c1y}, ${currentX} ${c2y}, ${currentX} ${currentY}`;

                  const deduced = hoveredAnchor ? deduceWireProperties(fromAnchor, hoveredAnchor) : null;
                  const activeColor = deduced ? deduced.color : fromAnchor.color;

                  return (
                    <>
                      {/* Outer glow */}
                      <path
                        d={rubberbandPath}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth="6"
                        strokeLinecap="round"
                        opacity="0.35"
                        className="animate-pulse"
                      />
                      {/* Animated dashed cable */}
                      <path
                        d={rubberbandPath}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth="3"
                        strokeDasharray="6 4"
                        strokeLinecap="round"
                        className="animate-wire-flow"
                      />
                      {/* Solid inner core */}
                      <path
                        d={rubberbandPath}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1"
                        strokeDasharray="2 6"
                        strokeLinecap="round"
                        opacity="0.8"
                      />

                      {/* Snap cursor indicator */}
                      <circle
                        cx={currentX}
                        cy={currentY}
                        r={hoveredAnchor ? 7 : 4}
                        fill={hoveredAnchor ? '#10b981' : activeColor}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className={hoveredAnchor ? 'animate-ping' : ''}
                      />
                      <circle
                        cx={currentX}
                        cy={currentY}
                        r={hoveredAnchor ? 5.5 : 3.5}
                        fill={hoveredAnchor ? '#10b981' : activeColor}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />

                      {/* Dynamic floating tooltip badge */}
                      <g transform={`translate(${currentX}, ${currentY - 24})`}>
                        <rect
                          x="-100"
                          y="-13"
                          width="200"
                          height="26"
                          rx="6"
                          fill={hoveredAnchor ? '#064e3b' : '#0f172a'}
                          stroke={hoveredAnchor ? '#10b981' : '#f59e0b'}
                          strokeWidth="1.5"
                          className="drop-shadow-2xl"
                        />
                        <text
                          x="0"
                          y="4"
                          fill={hoveredAnchor ? '#6ee7b7' : '#fde68a'}
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="Plus Jakarta Sans"
                          textAnchor="middle"
                        >
                          {hoveredAnchor
                            ? `⚡ Solte p/ ligar: ${hoveredAnchor.componentTag} [${hoveredAnchor.label}]`
                            : `De: ${fromAnchor.componentTag} [${fromAnchor.label}] ➔ Arraste até um borne`}
                        </text>
                      </g>
                    </>
                  );
                })()}
              </g>
            )}

            {/* ========================================================
                HMI DOOR & CNC DRILLING CUTOUT GRAPHICAL OVERLAY LAYER
                (Camada de Sobreposição da Porta com Cotas e Recorte)
               ======================================================== */}
            {showHmiDoorOverlay && (
              <g className="hmi-door-overlay" style={{ pointerEvents: 'auto' }}>
                {/* 1. Semi-transparent Door Frame & Gasket Boundary */}
                <rect
                  x="0"
                  y="0"
                  width={cabWidth}
                  height={cabHeight}
                  fill="#0284c7"
                  fillOpacity="0.04"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeDasharray="6 3"
                  rx="6"
                  pointerEvents="none"
                />

                {/* Left Door Hinges Indicators */}
                <g opacity="0.8" pointerEvents="none">
                  <rect x="-6" y="80" width="8" height="36" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                  <circle cx="-2" cy="98" r="2.2" fill="#0f172a" />
                  <rect x="-6" y={cabHeight - 116} width="8" height="36" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                  <circle cx="-2" cy={cabHeight - 98} r="2.2" fill="#0f172a" />
                  <text x="10" y="102" fill="#64748b" fontSize="7" fontFamily="JetBrains Mono">DOBRADIÇA</text>
                  <text x="10" y={cabHeight - 94} fill="#64748b" fontSize="7" fontFamily="JetBrains Mono">DOBRADIÇA</text>
                </g>

                {/* Safe Gasket Margin Line (45mm Clearance from Door Edges) */}
                <rect
                  x="45"
                  y="45"
                  width={cabWidth - 90}
                  height={cabHeight - 90}
                  fill="none"
                  stroke={hmiMechanicalClash.isOutsideGasket ? '#ef4444' : '#10b981'}
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  opacity={hmiMechanicalClash.isOutsideGasket ? 0.9 : 0.55}
                  rx="4"
                  pointerEvents="none"
                />
                <text
                  x="50"
                  y="41"
                  fill={hmiMechanicalClash.isOutsideGasket ? '#ef4444' : '#10b981'}
                  fontSize="7.5"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono"
                  pointerEvents="none"
                >
                  {hmiMechanicalClash.isOutsideGasket
                    ? '⚠️ LIMITE DE VEDAÇÃO ULTRAPASSADO (<45mm do bordo da porta)'
                    : 'Margem de Segurança da Borracha de Vedação da Porta (45mm)'}
                </text>

                {/* 2. Highlight Interior Components in Collision Behind HMI */}
                {hmiMechanicalClash.hasClash && (
                  <g className="collision-highlights" pointerEvents="none">
                    {/* Colliding DIN Rails warning banner */}
                    {hmiMechanicalClash.collidingRails.map((rail) => (
                      <g key={`clash-rail-${rail.index}`}>
                        <rect
                          x="24"
                          y={rail.yMm + 37.5}
                          width={cabWidth - 48}
                          height="35"
                          fill="#dc2626"
                          fillOpacity="0.18"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                        />
                        <text
                          x={cabWidth - 36}
                          y={rail.yMm + 58}
                          fill="#f87171"
                          fontSize="7.5"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono"
                          textAnchor="end"
                        >
                          ⚠️ CONFLITO MECÂNICO: {rail.name}
                        </text>
                      </g>
                    ))}

                    {/* Colliding components red bounding halos */}
                    {hmiMechanicalClash.collidingComponents.map((comp) => (
                      <g key={`clash-comp-${comp.instanceId}`}>
                        <rect
                          x={comp.xMm - 2}
                          y={comp.yMm - 2}
                          width={comp.widthMm + 4}
                          height={comp.heightMm + 4}
                          fill="#ef4444"
                          fillOpacity="0.25"
                          stroke="#ef4444"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                          rx="3"
                        />
                        <rect
                          x={comp.xMm}
                          y={comp.yMm - 14}
                          width={Math.max(90, comp.widthMm)}
                          height="12"
                          fill="#7f1d1d"
                          stroke="#ef4444"
                          strokeWidth="0.8"
                          rx="2"
                        />
                        <text
                          x={comp.xMm + 4}
                          y={comp.yMm - 5}
                          fill="#fecaca"
                          fontSize="7"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono"
                        >
                          ⚡ COLISÃO: {comp.tag}
                        </text>
                      </g>
                    ))}
                  </g>
                )}

                {/* 3. Dimension Lines (Cotas Técnicas Milimétricas) */}
                <g className="dimension-lines" pointerEvents="none" opacity="0.95">
                  {/* Left cota: from x=0 to x=cutoutLeft at y=hmiY */}
                  <line
                    x1="0"
                    y1={hmiY}
                    x2={cutoutLeft}
                    y2={hmiY}
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                  />
                  {/* Arrow ticks */}
                  <line x1="0" y1={hmiY - 5} x2="0" y2={hmiY + 5} stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1={cutoutLeft} y1={hmiY - 5} x2={cutoutLeft} y2={hmiY + 5} stroke="#38bdf8" strokeWidth="1.5" />
                  <rect
                    x={cutoutLeft / 2 - 40}
                    y={hmiY - 14}
                    width="80"
                    height="12"
                    rx="2"
                    fill="#0f172a"
                    stroke="#0284c7"
                    strokeWidth="0.8"
                  />
                  <text
                    x={cutoutLeft / 2}
                    y={hmiY - 5}
                    fill="#38bdf8"
                    fontSize="7"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                  >
                    X = {Math.round(hmiX)} ({Math.round(cutoutLeft)})
                  </text>

                  {/* Right cota: from x=cutoutRight to x=cabWidth at y=hmiY */}
                  <line
                    x1={cutoutRight}
                    y1={hmiY}
                    x2={cabWidth}
                    y2={hmiY}
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                  />
                  <line x1={cutoutRight} y1={hmiY - 5} x2={cutoutRight} y2={hmiY + 5} stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1={cabWidth} y1={hmiY - 5} x2={cabWidth} y2={hmiY + 5} stroke="#38bdf8" strokeWidth="1.5" />
                  <rect
                    x={(cutoutRight + cabWidth) / 2 - 30}
                    y={hmiY - 14}
                    width="60"
                    height="12"
                    rx="2"
                    fill="#0f172a"
                    stroke="#0284c7"
                    strokeWidth="0.8"
                  />
                  <text
                    x={(cutoutRight + cabWidth) / 2}
                    y={hmiY - 5}
                    fill="#38bdf8"
                    fontSize="7"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                  >
                    Dir = {Math.round(cabWidth - cutoutRight)}
                  </text>

                  {/* Top cota: from y=0 to y=cutoutTop at x=hmiX */}
                  <line
                    x1={hmiX}
                    y1="0"
                    x2={hmiX}
                    y2={cutoutTop}
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                  />
                  <line x1={hmiX - 5} y1="0" x2={hmiX + 5} y2="0" stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1={hmiX - 5} y1={cutoutTop} x2={hmiX + 5} y2={cutoutTop} stroke="#38bdf8" strokeWidth="1.5" />
                  <rect
                    x={hmiX + 6}
                    y={cutoutTop / 2 - 6}
                    width="75"
                    height="12"
                    rx="2"
                    fill="#0f172a"
                    stroke="#0284c7"
                    strokeWidth="0.8"
                  />
                  <text
                    x={hmiX + 43}
                    y={cutoutTop / 2 + 3}
                    fill="#38bdf8"
                    fontSize="7"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                  >
                    Y = {Math.round(hmiY)} ({Math.round(cutoutTop)})
                  </text>

                  {/* Bottom cota: from y=cutoutBottom to y=cabHeight at x=hmiX */}
                  <line
                    x1={hmiX}
                    y1={cutoutBottom}
                    x2={hmiX}
                    y2={cabHeight}
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                  />
                  <line x1={hmiX - 5} y1={cutoutBottom} x2={hmiX + 5} y2={cutoutBottom} stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1={hmiX - 5} y1={cabHeight} x2={hmiX + 5} y2={cabHeight} stroke="#38bdf8" strokeWidth="1.5" />
                  <rect
                    x={hmiX + 6}
                    y={(cutoutBottom + cabHeight) / 2 - 6}
                    width="75"
                    height="12"
                    rx="2"
                    fill="#0f172a"
                    stroke="#0284c7"
                    strokeWidth="0.8"
                  />
                  <text
                    x={hmiX + 43}
                    y={(cutoutBottom + cabHeight) / 2 + 3}
                    fill="#38bdf8"
                    fontSize="7"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                  >
                    Base = {Math.round(cabHeight - cutoutBottom)}
                  </text>
                </g>

                {/* 4. Interactive HMI Outer Bezel and Cutout Frame */}
                <g
                  transform={`translate(${hmiX}, ${hmiY})`}
                  className="cursor-move select-none"
                  onMouseDown={handleStartHmiDrag}
                >
                  {/* Outer Bezel (Chassi Frontal Visível da HMI) */}
                  <rect
                    x={-hmiBezelW / 2}
                    y={-hmiBezelH / 2}
                    width={hmiBezelW}
                    height={hmiBezelH}
                    rx="7"
                    fill={hmiMechanicalClash.hasClash ? 'rgba(239, 68, 68, 0.16)' : 'rgba(15, 23, 42, 0.90)'}
                    stroke={hmiMechanicalClash.hasClash ? '#ef4444' : '#38bdf8'}
                    strokeWidth="2.5"
                    filter="drop-shadow(0px 8px 18px rgba(0,0,0,0.65))"
                  />

                  {/* Screen Display Area (Simulação de LCD Industrial) */}
                  <rect
                    x={(-hmiBezelW * 0.82) / 2}
                    y={(-hmiBezelH * 0.72) / 2 - 2}
                    width={hmiBezelW * 0.82}
                    height={hmiBezelH * 0.72}
                    rx="3"
                    fill="#0369a1"
                    fillOpacity="0.25"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />

                  {/* Title Bar on Screen */}
                  <rect
                    x={(-hmiBezelW * 0.82) / 2}
                    y={(-hmiBezelH * 0.72) / 2 - 2}
                    width={hmiBezelW * 0.82}
                    height="14"
                    fill="#0f172a"
                    fillOpacity="0.85"
                  />
                  <text
                    x="0"
                    y={(-hmiBezelH * 0.72) / 2 + 8}
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="Plus Jakarta Sans"
                    textAnchor="middle"
                  >
                    {activeHmiModel.name}
                  </text>

                  {/* Brand & Specs Watermark on screen */}
                  <text
                    x="0"
                    y="3"
                    fill="#38bdf8"
                    fontSize="7"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                    opacity="0.9"
                  >
                    {activeHmiModel.brand.toUpperCase()} · {activeHmiModel.diagonalInches}
                  </text>

                  {/* Exact Cutout Hole Boundary (Recorte CNC da Chapa da Porta) */}
                  <rect
                    x={-hmiCutoutW / 2}
                    y={-hmiCutoutH / 2}
                    width={hmiCutoutW}
                    height={hmiCutoutH}
                    rx="4"
                    fill="none"
                    stroke={hmiMechanicalClash.hasClash ? '#ef4444' : '#f59e0b'}
                    strokeWidth="2"
                    strokeDasharray="5 3"
                  />

                  {/* 4 CNC Corner Cut Marks (Cruzes de corte milimétricas) */}
                  {/* Top-Left */}
                  <path
                    d={`M ${-hmiCutoutW / 2 - 7} ${-hmiCutoutH / 2} L ${-hmiCutoutW / 2 + 7} ${-hmiCutoutH / 2} M ${-hmiCutoutW / 2} ${-hmiCutoutH / 2 - 7} L ${-hmiCutoutW / 2} ${-hmiCutoutH / 2 + 7}`}
                    stroke={hmiMechanicalClash.hasClash ? '#ef4444' : '#f59e0b'}
                    strokeWidth="1.2"
                  />
                  {/* Top-Right */}
                  <path
                    d={`M ${hmiCutoutW / 2 - 7} ${-hmiCutoutH / 2} L ${hmiCutoutW / 2 + 7} ${-hmiCutoutH / 2} M ${hmiCutoutW / 2} ${-hmiCutoutH / 2 - 7} L ${hmiCutoutW / 2} ${-hmiCutoutH / 2 + 7}`}
                    stroke={hmiMechanicalClash.hasClash ? '#ef4444' : '#f59e0b'}
                    strokeWidth="1.2"
                  />
                  {/* Bottom-Left */}
                  <path
                    d={`M ${-hmiCutoutW / 2 - 7} ${hmiCutoutH / 2} L ${-hmiCutoutW / 2 + 7} ${hmiCutoutH / 2} M ${-hmiCutoutW / 2} ${-hmiCutoutH / 2 - 7} L ${-hmiCutoutW / 2} ${-hmiCutoutH / 2 + 7}`}
                    stroke={hmiMechanicalClash.hasClash ? '#ef4444' : '#f59e0b'}
                    strokeWidth="1.2"
                  />
                  {/* Bottom-Right */}
                  <path
                    d={`M ${hmiCutoutW / 2 - 7} ${hmiCutoutH / 2} L ${hmiCutoutW / 2 + 7} ${hmiCutoutH / 2} M ${hmiCutoutW / 2} ${-hmiCutoutH / 2 - 7} L ${hmiCutoutW / 2} ${-hmiCutoutH / 2 + 7}`}
                    stroke={hmiMechanicalClash.hasClash ? '#ef4444' : '#f59e0b'}
                    strokeWidth="1.2"
                  />

                  {/* Center Crosshair (Centro de Marcação) */}
                  <line x1="-16" y1="0" x2="16" y2="0" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 2" />
                  <line x1="0" y1="-16" x2="0" y2="16" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 2" />
                  <circle cx="0" cy="0" r="2.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="0.8" />

                  {/* Cutout Dimension Badge (Furação CNC) */}
                  <rect
                    x="-75"
                    y={hmiBezelH / 2 - 25}
                    width="150"
                    height="18"
                    rx="3"
                    fill="#0f172a"
                    stroke={hmiMechanicalClash.hasClash ? '#ef4444' : '#f59e0b'}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y={hmiBezelH / 2 - 13}
                    fill={hmiMechanicalClash.hasClash ? '#fca5a5' : '#fde68a'}
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                  >
                    ✂️ RECORTE: {hmiCutoutW} × {hmiCutoutH} mm
                  </text>

                  {/* Real-time Status Halo Badge */}
                  {hmiMechanicalClash.hasClash ? (
                    <g transform={`translate(0, ${hmiBezelH / 2 + 15})`}>
                      <rect x="-95" y="-9" width="190" height="18" rx="4" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.2" />
                      <text x="0" y="3" fill="#fee2e2" fontSize="7.5" fontWeight="bold" fontFamily="Plus Jakarta Sans" textAnchor="middle">
                        ⚠️ COLISÃO MECÂNICA (~{hmiDepthMm}mm prof.)
                      </text>
                    </g>
                  ) : (
                    <g transform={`translate(0, ${hmiBezelH / 2 + 15})`}>
                      <rect x="-75" y="-9" width="150" height="18" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
                      <text x="0" y="3" fill="#d1fae5" fontSize="7.5" fontWeight="bold" fontFamily="Plus Jakarta Sans" textAnchor="middle">
                        ✓ LIVRE DE COLISÃO INTERIOR
                      </text>
                    </g>
                  )}

                  {/* Drag Handle Indicator */}
                  <g transform={`translate(0, ${-hmiBezelH / 2 - 12})`}>
                    <rect x="-40" y="-7" width="80" height="14" rx="3" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
                    <text x="0" y="3" fill="#94a3b8" fontSize="6.5" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                      🖐️ ARRASTAR
                    </text>
                  </g>
                </g>
              </g>
            )}
            </svg>

            {/* Quick Component Technical Tooltip (Motion Animated Card: Referência, Consumo, Tipo) */}
            {hoveredComponentInfo && containerRef.current && !dragState && !wireDragState && (
              <ComponentTechnicalTooltip
                item={hoveredComponentInfo.item}
                railIndex={hoveredComponentInfo.railIndex}
                coords={{ x: hoveredComponentInfo.clientX, y: hoveredComponentInfo.clientY }}
                containerWidth={containerRef.current.clientWidth}
                containerHeight={containerRef.current.clientHeight}
              />
            )}

            {/* ========================================================
                FLOATING HMI PRECISION INSPECTOR & MECHANICAL COLLISION WIDGET
               ======================================================== */}
            {showHmiDoorOverlay && (
              <div className="absolute top-14 right-4 z-30 w-88 max-w-[calc(100vw-32px)] bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-sans text-xs animate-in slide-in-from-right-4 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <DoorClosed className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white text-[12px]">Furação & Porta HMI</span>
                    {hmiMechanicalClash.hasClash ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-950/80 text-red-300 border border-red-500/50">
                        Colisão
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                        Livre
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsHmiInspectorCollapsed((prev) => !prev)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                      title={isHmiInspectorCollapsed ? 'Expandir Ajustes' : 'Recolher Ajustes'}
                    >
                      {isHmiInspectorCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHmiDoorOverlay(false)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                      title="Ocultar Camada de Sobreposição"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {!isHmiInspectorCollapsed && (
                  <div className="p-3 space-y-3 max-h-[75vh] overflow-y-auto scrollbar-thin">
                    {/* Model Preset Selector */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Modelo de Ecrã HMI & Furação
                      </label>
                      <select
                        value={selectedHmiModelId}
                        onChange={(e) => {
                          const newId = e.target.value;
                          setSelectedHmiModelId(newId);
                          const spec = HMI_PRESETS.find((p) => p.id === newId);
                          if (spec) {
                            handleSyncHmiToDoorProject(hmiX, hmiY, spec);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-purple-500"
                      >
                        {HMI_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.cutoutWidthMm}×{p.cutoutHeightMm} mm)
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1">
                        <span>Chassi: {hmiBezelW}×{hmiBezelH} mm</span>
                        <span className="text-amber-400 font-bold">Furação CNC: {hmiCutoutW}×{hmiCutoutH} mm</span>
                      </div>
                    </div>

                    {/* Coordinates Adjustment & Nudging */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Coordenadas Exatas do Centro (mm)
                      </div>

                      {/* X Coordinate */}
                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-sky-400">Posição X (Horizontal)</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={Math.round(hmiX)}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (!isNaN(val)) {
                                  const clamped = Math.max(30, Math.min(cabWidth - 30, val));
                                  setHmiCustomCoords({ xMm: clamped, yMm: hmiY });
                                  handleSyncHmiToDoorProject(clamped, hmiY);
                                }
                              }}
                              className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-white"
                            />
                            <span className="text-slate-500 text-[10px]">mm</span>
                          </div>
                        </div>

                        {/* Nudge Buttons */}
                        <div className="grid grid-cols-6 gap-1 font-mono text-[10px]">
                          {[-25, -10, -1, 1, 10, 25].map((step) => (
                            <button
                              key={`nx-${step}`}
                              type="button"
                              onClick={() => handleAdjustHmiPosition(step, 0)}
                              className="py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded text-center transition"
                              title={`Deslocar ${step > 0 ? `+${step}` : step} mm`}
                            >
                              {step > 0 ? `+${step}` : step}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Bordo Esq: {Math.round(cutoutLeft)} mm</span>
                          <span>Bordo Dir: {Math.round(cabWidth - cutoutRight)} mm</span>
                        </div>
                      </div>

                      {/* Y Coordinate */}
                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-sky-400">Posição Y (Vertical)</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={Math.round(hmiY)}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (!isNaN(val)) {
                                  const clamped = Math.max(30, Math.min(cabHeight - 30, val));
                                  setHmiCustomCoords({ xMm: hmiX, yMm: clamped });
                                  handleSyncHmiToDoorProject(hmiX, clamped);
                                }
                              }}
                              className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-white"
                            />
                            <span className="text-slate-500 text-[10px]">mm</span>
                          </div>
                        </div>

                        {/* Nudge Buttons */}
                        <div className="grid grid-cols-6 gap-1 font-mono text-[10px]">
                          {[-25, -10, -1, 1, 10, 25].map((step) => (
                            <button
                              key={`ny-${step}`}
                              type="button"
                              onClick={() => handleAdjustHmiPosition(0, step)}
                              className="py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded text-center transition"
                              title={`Deslocar ${step > 0 ? `+${step}` : step} mm`}
                            >
                              {step > 0 ? `+${step}` : step}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Bordo Topo: {Math.round(cutoutTop)} mm</span>
                          <span>Cota Base: {Math.round(cabHeight - cutoutBottom)} mm</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Alignment Presets */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Alinhamentos Automáticos
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleSetHmiPreset('centerX')}
                          className="px-2 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 hover:text-white rounded-lg flex items-center justify-center gap-1 font-semibold transition"
                          title="Centrar horizontalmente na largura do armário"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-sky-400" />
                          <span>Centrar X ({Math.round(cabWidth / 2)}mm)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetHmiPreset('ergonomicTop')}
                          className="px-2 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 hover:text-white rounded-lg flex items-center justify-center gap-1 font-semibold transition"
                          title="Altura ergonómica recomendada para operador (30% do topo)"
                        >
                          <Ruler className="w-3 h-3 text-amber-400" />
                          <span>Altura Olhos (30%)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetHmiPreset('doorCenter')}
                          className="px-2 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 hover:text-white rounded-lg flex items-center justify-center gap-1 font-semibold transition"
                          title="Centro geométrico da porta"
                        >
                          <Move className="w-3 h-3 text-purple-400" />
                          <span>Centro da Porta</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetHmiPreset('alignRight')}
                          className="px-2 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 hover:text-white rounded-lg flex items-center justify-center gap-1 font-semibold transition"
                          title="Alinhar à direita (afastado das dobradiças)"
                        >
                          <ArrowRight className="w-3 h-3 text-emerald-400" />
                          <span>Lado Direita</span>
                        </button>
                      </div>
                    </div>

                    {/* Mechanical Collision & Safety Diagnostics */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Diagnóstico de Montagem Traseira (~{hmiDepthMm}mm)
                      </div>

                      {/* Clash Alert Box */}
                      {hmiMechanicalClash.hasClash ? (
                        <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-500/60 text-red-200 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-red-300 text-xs">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>Interferência Mecânica Detetada!</span>
                          </div>
                          <p className="text-[11px] text-red-200/90 leading-relaxed">
                            O corpo traseiro da HMI (~{hmiDepthMm}mm de profundidade) colide com equipamentos montados na placa de montagem interior:
                          </p>
                          <ul className="text-[10px] font-mono text-red-300 list-disc list-inside space-y-0.5">
                            {hmiMechanicalClash.collidingRails.map((r) => (
                              <li key={`info-r-${r.index}`}>{r.name} (Barra Metálica)</li>
                            ))}
                            {hmiMechanicalClash.collidingComponents.map((c) => (
                              <li key={`info-c-${c.instanceId}`}>
                                {c.tag}: {c.name}
                              </li>
                            ))}
                          </ul>
                          <p className="text-[10px] text-amber-300 font-semibold mt-1">
                            💡 Sugestão: Desloque a HMI na porta ou mova os componentes para calhas inferiores para a porta conseguir fechar.
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-200">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-xs">
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Sem Interferência Mecânica</span>
                          </div>
                          <p className="text-[10px] text-emerald-200/90 mt-1 leading-relaxed">
                            Espaço livre atrás da porta (~{hmiDepthMm}mm de profundidade garantida). O quadro fecha sem colisões com as calhas DIN ou componentes interiores.
                          </p>
                        </div>
                      )}

                      {/* Gasket Margin Status */}
                      <div className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                        hmiMechanicalClash.isOutsideGasket
                          ? 'bg-amber-950/70 border-amber-500/60 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Margem de Vedação (45mm):</span>
                        </div>
                        <span className={`font-bold font-mono ${hmiMechanicalClash.isOutsideGasket ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {hmiMechanicalClash.isOutsideGasket ? '⚠️ Invadida' : '✓ Segura'}
                        </span>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-1 flex items-center gap-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleSyncHmiToDoorProject(hmiX, hmiY)}
                        className="flex-1 py-1.5 px-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                        title="Guardar posição e furação da HMI no projeto da porta"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar na Porta</span>
                      </button>

                      {onOpenControlPanel && (
                        <button
                          type="button"
                          onClick={onOpenControlPanel}
                          className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-750 text-purple-300 hover:text-white rounded-lg font-semibold text-xs flex items-center gap-1 transition border border-slate-700"
                          title="Abrir editor completo da porta (adicionar botões, emergência, etc.)"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Editor da Porta</span>
                        </button>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 text-center italic">
                      💡 Pode arrastar o ecrã diretamente no canvas com o rato.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Properties & Quick Add Panel */}
      <div className={`flex flex-col bg-slate-900 border border-slate-800 text-slate-200 overflow-hidden ${
        isImmersiveMode
          ? isFloatingDrawerOpen
            ? 'absolute right-4 top-14 bottom-4 w-88 z-40 rounded-xl shadow-2xl border-slate-700/80 backdrop-blur-md bg-slate-900/95 animate-in slide-in-from-right-4 duration-200'
            : 'hidden'
          : 'w-full lg:w-88 rounded-lg shadow-xl'
      }`}>
        {/* Top Tab Bar */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950 p-1 gap-1 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSideTab('quick_add')}
            className={`flex-1 py-1.5 px-1.5 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
              activeSideTab === 'quick_add'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Adicionar componentes"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate">Adicionar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSideTab('item_details')}
            className={`flex-1 py-1.5 px-1 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
              activeSideTab === 'item_details'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Detalhes do componente selecionado"
          >
            <Settings2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Detalhes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSideTab('enclosure_size')}
            className={`flex-1 py-1.5 px-1 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
              activeSideTab === 'enclosure_size'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Dimensões e Calhas do Quadro"
          >
            <Box className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">Quadro</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSideTab('glands')}
            className={`flex-1 py-1.5 px-1 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
              activeSideTab === 'glands'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Bucins e furação de entrada/saída"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Bucins</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSideTab('project_notes')}
            className={`flex-1 py-1.5 px-1.5 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
              activeSideTab === 'project_notes'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Notas do Projeto & Caderno de Encargos para o Relatório Técnico (PDF/Impressão)"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Notas</span>
            {project.config.notes && project.config.notes.trim().length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>

          {isImmersiveMode && (
            <button
              type="button"
              onClick={() => setIsFloatingDrawerOpen(false)}
              className="p-1 px-2 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition text-xs font-bold shrink-0 ml-1"
              title="Fechar Paleta Flutuante"
            >
              ✕
            </button>
          )}
        </div>

        {/* ====================================================================
            TAB 1: QUICK ADD PALETTE (Direct 1-Click addition, no confusion)
            ==================================================================== */}
        {activeSideTab === 'quick_add' && (
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            {/* Target Rail Selector */}
            <div className="mb-2 pb-2 border-b border-slate-800 shrink-0">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                Calha Destino:
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {rails.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setQuickRailIdx(idx)}
                    className={`flex-1 py-1 px-1 rounded text-xs font-mono font-semibold transition text-center ${
                      quickRailIdx === idx
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    Calha {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1 mb-2.5 shrink-0">
              {[
                ...(customComponents.length > 0 ? [{ id: 'custom', label: `⭐ Meus (${customComponents.length})`, highlight: true }] : []),
                { id: 'generic', label: '📦 Genérico', highlight: true },
                { id: 'meanwell', label: '⚡ Mean Well' },
                { id: 'siemens', label: '🤖 Siemens' },
                { id: 'viking', label: '🔌 Viking 3' },
                { id: 'relays', label: '🔄 Relés' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setQuickCategory(c.id as any)}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-md transition ${
                    quickCategory === c.id
                      ? 'bg-blue-600 text-white'
                      : c.highlight
                      ? 'bg-slate-950 text-amber-300 border border-amber-500/40 hover:bg-slate-800'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Notification alert */}
            {recentNotification && (
              <div className="mb-2 text-xs text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-800 px-2.5 py-1 rounded shrink-0">
                <Check className="w-3.5 h-3.5" />
                <span className="truncate">{recentNotification}</span>
              </div>
            )}

            {/* Scrollable Quick Items */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {allComponents.filter((item) => {
                if (quickCategory === 'custom') {
                  return customComponents.some((c) => c.catalogId === item.catalogId);
                }
                if (quickCategory === 'generic') {
                  return item.brand === 'Genérico' || item.name.includes('Genérico');
                }
                if (quickCategory === 'meanwell') {
                  return item.brand === 'Mean Well';
                }
                if (quickCategory === 'siemens') {
                  return item.brand === 'Siemens';
                }
                if (quickCategory === 'viking') {
                  return item.category === 'terminals';
                }
                if (quickCategory === 'relays') {
                  return item.category === 'relays' || item.category === 'safety_relays';
                }
                return true;
              }).map((item) => {
                const isTerminal = item.category === 'terminals';

                const handleAdd = (qty: number = 1) => {
                  if (onAddComponent) {
                    onAddComponent(item, quickRailIdx, qty);
                  } else {
                    onOpenCatalog(quickRailIdx);
                  }
                  const text = qty > 1 ? `${qty}x ${item.name}` : item.name;
                  setRecentNotification(`Adicionado na Calha ${quickRailIdx + 1}`);
                  setTimeout(() => setRecentNotification(null), 1800);
                };

                return (
                  <div
                    key={item.catalogId}
                    className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-between gap-2 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span className="bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                          {item.widthMm}mm
                        </span>
                        {item.ratedCurrentA && <span>{item.ratedCurrentA}A</span>}
                        {item.ratedPowerW && <span>{item.ratedPowerW}W</span>}
                        <span className="text-emerald-400 font-semibold">{item.estimatedPriceEur.toFixed(2)}€</span>
                      </div>
                    </div>

                    {isTerminal ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAdd(1)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded transition"
                          title="Adicionar 1 borne"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdd(5)}
                          className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 text-[11px] font-bold rounded transition"
                          title="Adicionar 5 bornes"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdd(10)}
                          className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded transition"
                          title="Adicionar 10 bornes"
                        >
                          +10
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(1)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-md shadow-xs transition shrink-0 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Inserir</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions to Open Catalog / Custom */}
            <div className="pt-2.5 mt-2 border-t border-slate-800 space-y-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onOpenCatalog(quickRailIdx)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
              >
                <span>🔍 Abrir Catálogo Completo & Pesquisa</span>
              </button>

              {onOpenLibraryManager && (
                <button
                  type="button"
                  onClick={onOpenLibraryManager}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 text-xs font-semibold rounded-lg shadow-xs transition"
                  title="Criar novo componente ou importar/exportar da biblioteca Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Novo Componente / Excel (.xlsx)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 2: ITEM DETAILS & PROPERTIES
            ==================================================================== */}
        {activeSideTab === 'item_details' && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            {selectedItem ? (
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Elemento Selecionado
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(selectedItem.instanceId)}
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-slate-800 transition flex items-center gap-1 text-xs"
                    title="Remover componente do quadro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>

                {/* Tag and Part Number */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Designação (Tag):</label>
                    <input
                      type="text"
                      value={selectedItem.tag}
                      onChange={(e) => handleUpdateTag(selectedItem.instanceId, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Fabricante:</label>
                    <span className="text-xs font-bold text-blue-400 block py-1.5">
                      {selectedItem.data.brand}
                    </span>
                  </div>
                </div>

                {/* Model & Name */}
                <div>
                  <span className="text-xs text-slate-400 block">Modelo / Part Number:</span>
                  <span className="text-sm font-bold font-mono text-slate-100">
                    {selectedItem.data.partNumber}
                  </span>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {selectedItem.data.description}
                  </p>
                </div>

                {/* ========================================================
                    DIMENSÕES FÍSICAS REAIS (EDITÁVEIS) - NORMA DIN EN 60715
                   ======================================================== */}
                <div className="bg-slate-950 border border-blue-900/50 rounded-lg p-3 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-bold text-slate-200">Dimensões Reais do Componente</span>
                    </div>
                    <span className="text-[10px] text-blue-400 font-mono bg-blue-950/80 border border-blue-800/60 px-1.5 py-0.5 rounded font-bold">
                      {selectedItem.data.widthMm} × {selectedItem.data.heightMm || 90} mm
                    </span>
                  </div>

                  {/* Largura / Comprimento em Calha (widthMm) */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-300 font-medium flex items-center gap-1">
                        <span>↔ Comprimento / Largura (X):</span>
                      </span>
                      <span className="font-mono text-white font-bold text-xs">
                        {selectedItem.data.widthMm} mm <span className="text-slate-400 font-normal">({selectedItem.data.dinModules || Math.round((selectedItem.data.widthMm / 18) * 10) / 10} TE)</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, Math.max(4, selectedItem.data.widthMm - 5), selectedItem.data.heightMm || 90)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Diminuir 5mm"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, Math.max(4, selectedItem.data.widthMm - 1), selectedItem.data.heightMm || 90)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Diminuir 1mm"
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        min={4}
                        max={600}
                        step={0.5}
                        value={selectedItem.data.widthMm}
                        onChange={(e) => handleUpdateDimensions(selectedItem.instanceId, Number(e.target.value), selectedItem.data.heightMm || 90)}
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2 py-1 text-xs font-mono text-white text-center font-bold"
                        title="Digite a largura em milímetros"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, Math.min(600, selectedItem.data.widthMm + 1), selectedItem.data.heightMm || 90)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Aumentar 1mm"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, Math.min(600, selectedItem.data.widthMm + 5), selectedItem.data.heightMm || 90)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Aumentar 5mm"
                      >
                        +5
                      </button>
                    </div>
                    {/* Quick Module buttons */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 mr-0.5">Módulos DIN:</span>
                      {[
                        { label: '6mm', w: 6 },
                        { label: '18mm (1M)', w: 18 },
                        { label: '35mm (2M)', w: 35 },
                        { label: '54mm (3M)', w: 54 },
                        { label: '72mm (4M)', w: 72 },
                        { label: '108mm (6M)', w: 108 },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => handleUpdateDimensions(selectedItem.instanceId, btn.w, selectedItem.data.heightMm || 90)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition ${
                            selectedItem.data.widthMm === btn.w
                              ? 'bg-blue-600 text-white border-blue-500 font-bold'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Altura do Componente (heightMm) */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-300 font-medium flex items-center gap-1">
                        <span>↕ Altura Vertical (Y):</span>
                      </span>
                      <span className="font-mono text-white font-bold text-xs">
                        {selectedItem.data.heightMm || 90} mm
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, selectedItem.data.widthMm, Math.max(30, (selectedItem.data.heightMm || 90) - 10))}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Diminuir 10mm"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, selectedItem.data.widthMm, Math.max(30, (selectedItem.data.heightMm || 90) - 1))}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Diminuir 1mm"
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        min={30}
                        max={350}
                        step={1}
                        value={selectedItem.data.heightMm || 90}
                        onChange={(e) => handleUpdateDimensions(selectedItem.instanceId, selectedItem.data.widthMm, Number(e.target.value))}
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2 py-1 text-xs font-mono text-white text-center font-bold"
                        title="Digite a altura em milímetros"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, selectedItem.data.widthMm, Math.min(350, (selectedItem.data.heightMm || 90) + 1))}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Aumentar 1mm"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, selectedItem.data.widthMm, Math.min(350, (selectedItem.data.heightMm || 90) + 10))}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 font-mono"
                        title="Aumentar 10mm"
                      >
                        +10
                      </button>
                    </div>
                    {/* Quick Standard DIN heights */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 mr-0.5">Padrões:</span>
                      {[
                        { label: '50mm (Borne)', h: 50 },
                        { label: '85mm (MCB)', h: 85 },
                        { label: '90mm (LOGO!)', h: 90 },
                        { label: '100mm (S7-1200)', h: 100 },
                        { label: '125mm (Fonte MW)', h: 125 },
                        { label: '147mm (S7-1500)', h: 147 },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => handleUpdateDimensions(selectedItem.instanceId, selectedItem.data.widthMm, btn.h)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition ${
                            (selectedItem.data.heightMm || 90) === btn.h
                              ? 'bg-blue-600 text-white border-blue-500 font-bold'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Profundidade (depthMm) */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-400">Profundidade (Z):</span>
                      <span className="font-mono text-slate-300 text-xs">{selectedItem.data.depthMm || 75} mm</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={20}
                        max={300}
                        value={selectedItem.data.depthMm || 75}
                        onChange={(e) => handleUpdateDimensions(selectedItem.instanceId, selectedItem.data.widthMm, selectedItem.data.heightMm || 90, Number(e.target.value))}
                        className="w-24 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1 text-xs font-mono text-white text-center font-bold"
                      />
                      <span className="text-[11px] text-slate-400">
                        Quadro recomendado: ≥ {((selectedItem.data.depthMm || 75) + 35)}mm
                      </span>
                    </div>
                  </div>

                  {/* Presets Industriais Rápidos */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-medium block mb-1.5">
                      Presets de Dimensão Rápida (PLCs & Aparelhagem):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, 110, 100, 75)}
                        className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/50 text-[10px] text-teal-300 font-mono rounded text-left transition flex items-center justify-between"
                      >
                        <span>📟 S7-1200 CPU</span>
                        <span className="text-slate-500 text-[9px]">110×100</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, 35, 147, 129)}
                        className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-[10px] text-emerald-300 font-mono rounded text-left transition flex items-center justify-between"
                      >
                        <span>🚀 S7-1500 CPU</span>
                        <span className="text-slate-500 text-[9px]">35×147</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, 71.5, 90, 60)}
                        className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 text-[10px] text-sky-300 font-mono rounded text-left transition flex items-center justify-between"
                      >
                        <span>🕹️ LOGO! 8</span>
                        <span className="text-slate-500 text-[9px]">72×90</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, 40, 125, 102)}
                        className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-[10px] text-blue-300 font-mono rounded text-left transition flex items-center justify-between"
                      >
                        <span>⚡ Fonte MW</span>
                        <span className="text-slate-500 text-[9px]">40×125</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, 45, 100, 75)}
                        className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-[10px] text-cyan-300 font-mono rounded text-left transition flex items-center justify-between"
                      >
                        <span>🧩 Módulo SM S7</span>
                        <span className="text-slate-500 text-[9px]">45×100</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDimensions(selectedItem.instanceId, 6, 50, 42)}
                        className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-lime-500/50 text-[10px] text-lime-300 font-mono rounded text-left transition flex items-center justify-between"
                      >
                        <span>🧱 Borne Viking</span>
                        <span className="text-slate-500 text-[9px]">6×50</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Technical Specs Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                  {selectedItem.data.inputVoltage && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tensão Entrada:</span>
                      <span className="font-mono text-slate-200">{selectedItem.data.inputVoltage}</span>
                    </div>
                  )}
                  {selectedItem.data.outputVoltage && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tensão Saída:</span>
                      <span className="font-mono text-emerald-400 font-bold">{selectedItem.data.outputVoltage}</span>
                    </div>
                  )}
                  {selectedItem.data.ratedCurrentA && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Corrente Nominal:</span>
                      <span className="font-mono text-slate-200">{selectedItem.data.ratedCurrentA} A</span>
                    </div>
                  )}
                  {selectedItem.data.ratedPowerW && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Potência Nominal:</span>
                      <span className="font-mono text-blue-400 font-bold">{selectedItem.data.ratedPowerW} W</span>
                    </div>
                  )}
                  {selectedItem.data.dcConsumptionA && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Consumo em 24VDC:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {selectedItem.data.dcConsumptionA} A ({selectedItem.data.dcConsumptionW}W)
                      </span>
                    </div>
                  )}
                  {selectedItem.data.terminalsSummary && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-slate-400 block mb-1">Terminais / Bornes:</span>
                      <span className="font-mono text-[11px] text-slate-300 block bg-slate-900 p-1.5 rounded">
                        {selectedItem.data.terminalsSummary}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400">Preço Indicativo:</span>
                    <span className="font-mono text-slate-200">{selectedItem.data.estimatedPriceEur.toFixed(2)} €</span>
                  </div>
                </div>

                {/* ========================================================
                    ALINHAMENTO MAGNÉTICO & POSIÇÃO (SNAP 5mm UNIFORME)
                   ======================================================== */}
                {(() => {
                  const currentRail = rails[selectedItem.railIndex];
                  if (!currentRail) return null;
                  const sorted = [...currentRail.items].sort((a, b) => a.positionMm - b.positionMm);
                  const myIdx = sorted.findIndex((it) => it.instanceId === selectedItem.instanceId);
                  const prevItem = myIdx > 0 ? sorted[myIdx - 1] : null;
                  const distPrev = prevItem
                    ? Math.round((selectedItem.positionMm - (prevItem.positionMm + prevItem.data.widthMm)) * 10) / 10
                    : null;

                  return (
                    <div className="bg-slate-950 border border-sky-900/50 rounded-lg p-3 space-y-2.5 shadow-inner">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Magnet className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-xs font-bold text-slate-200">Alinhamento Magnético (Snap 5mm)</span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                          snapToGrid ? 'bg-sky-950 text-sky-300 border-sky-800' : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {snapToGrid ? '🧲 Snap Ativo' : 'Manual'}
                        </span>
                      </div>

                      {/* Posição na calha */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-400">Posição na Calha (X):</span>
                          <span className="font-mono text-white font-bold">{Math.round(selectedItem.positionMm)} mm</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleNudgeItem(selectedItem.instanceId, -5)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 font-mono transition"
                            title="Deslocar 5mm para a esquerda (com prevenção de colisão)"
                          >
                            -5mm
                          </button>
                          <input
                            type="number"
                            min={10}
                            max={currentRail.usableWidthMm - selectedItem.data.widthMm}
                            value={Math.round(selectedItem.positionMm)}
                            onChange={(e) => handleSetItemPosition(selectedItem.instanceId, Number(e.target.value))}
                            className="flex-1 min-w-0 bg-slate-900 border border-slate-700 focus:border-sky-500 rounded px-2 py-1 text-xs font-mono text-white text-center font-bold"
                            title="Posição X exata na calha em milímetros"
                          />
                          <button
                            type="button"
                            onClick={() => handleNudgeItem(selectedItem.instanceId, 5)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 font-mono transition"
                            title="Deslocar 5mm para a direita (com prevenção de colisão)"
                          >
                            +5mm
                          </button>
                        </div>
                      </div>

                      {/* Espaçamento relativo com componente anterior */}
                      {prevItem ? (
                        <div className="bg-slate-900 border border-slate-800 rounded p-2 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Distância p/ anterior ({prevItem.tag}):</span>
                            <span className={`font-mono font-bold ${
                              Math.abs((distPrev ?? 0) - 5) <= 0.3 ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {distPrev !== null ? `${distPrev} mm` : '--'}
                              {Math.abs((distPrev ?? 0) - 5) <= 0.3 && ' ✓'}
                            </span>
                          </div>
                          {distPrev !== null && Math.abs(distPrev - 5) > 0.3 && (
                            <button
                              type="button"
                              onClick={() => handleSnapGapTo5mm(selectedItem.railIndex, prevItem.instanceId, selectedItem.instanceId)}
                              className="w-full py-1 bg-sky-700 hover:bg-sky-600 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition shadow-xs"
                            >
                              <Magnet className="w-3 h-3 text-amber-300" />
                              <span>Ajustar magneticamente a 5mm de {prevItem.tag}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 font-mono italic">
                          Primeiro componente da calha (Início a 10mm)
                        </div>
                      )}

                      {/* Botão de alinhar toda a calha com 5mm */}
                      <button
                        type="button"
                        onClick={() => handleAlignRailWithUniformSpacing(selectedItem.railIndex, 5)}
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 border border-sky-500/40 hover:border-sky-400 text-sky-300 hover:text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Magnet className="w-3.5 h-3.5 text-sky-400" />
                        <span>Alinhar Calha {selectedItem.railIndex + 1} Completa (5mm Uniforme)</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Ventilação & Dissipação Térmica (EN 61439) */}
                {(() => {
                  const spec = THERMAL_SPECS[selectedItem.data.category];
                  const issue = thermalAssessment.issues.find((iss) => iss.componentId === selectedItem.instanceId);
                  const isHighHeat = selectedItem.data.category === 'power_supply';

                  return (
                    <div className="bg-slate-950 border border-amber-900/40 rounded-lg p-3 space-y-2 shadow-inner">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Wind className={`w-3.5 h-3.5 ${isHighHeat ? 'text-amber-400' : 'text-blue-400'}`} />
                          <span className="text-xs font-bold text-slate-200">Ventilação & Térmica</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          issue
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {issue ? '⚠ Folga Insuficiente' : '✓ Conforme EN 61439'}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Perfil de Dissipação:</span>
                          <span className="font-mono text-slate-200 font-semibold">
                            {spec?.dissipationProfile === 'high' ? '🔥 Alta (10-35W)' : spec?.dissipationProfile === 'medium' ? '⚡ Média' : 'Baixa'}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Afastamento Recomendado:</span>
                          <span className="font-mono text-amber-300 font-bold">
                            ≥ {spec?.recommendedLateralMm ?? 5} mm
                          </span>
                        </div>
                        {issue && (
                          <p className="text-[11px] text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20 mt-1">
                            {issue.message}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRailIndex(selectedItem.railIndex);
                          setIsAutoLayoutModalOpen(true);
                        }}
                        className="w-full py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs mt-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Otimizar Ventilação com Auto-Layout</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Position & Rail Controls */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Deslocar / Trocar Ordem na Calha:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const r = rails[selectedItem.railIndex];
                        const idx = r.items.findIndex((it) => it.instanceId === selectedItem.instanceId);
                        handleShiftItem(selectedItem.railIndex, idx, 'left');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded border border-slate-700 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Esquerda
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const r = rails[selectedItem.railIndex];
                        const idx = r.items.findIndex((it) => it.instanceId === selectedItem.instanceId);
                        handleShiftItem(selectedItem.railIndex, idx, 'right');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded border border-slate-700 transition"
                    >
                      Direita <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Transfer to another rail */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Mover para outra Calha:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {rails.map((r, idx) => (
                      <button
                        key={r.id}
                        type="button"
                        disabled={idx === selectedItem.railIndex}
                        onClick={() => handleMoveToRail(selectedItem, idx)}
                        className={`py-1.5 px-2 text-xs rounded border transition font-mono ${
                          idx === selectedItem.railIndex
                            ? 'bg-blue-950 text-blue-300 border-blue-800 opacity-60 cursor-default'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                      >
                        Calha {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <Sliders className="w-9 h-9 mb-2 stroke-1 text-blue-400" />
                <h4 className="text-xs font-bold text-slate-200">Nenhum Componente Selecionado</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Clique diretamente num componente desenhado no armário para inspecionar e editar propriedades.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSideTab('quick_add')}
                  className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition"
                >
                  Abrir Biblioteca Rápida
                </button>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            TAB 3: ENCLOSURE & DUCTS / RAILS SIZING (Personalizar Quadro e Calhas)
            ==================================================================== */}
        {activeSideTab === 'enclosure_size' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-4">
            {/* Header info */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center gap-2 mb-1">
                <Box className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-100">Dimensões do Quadro & Calhas</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ajuste em tempo real as medidas do armário, a secção das canaletas ranhuradas e a distribuição das calhas DIN 35mm.
              </p>
            </div>

            {/* Presets rápidos de armário */}
            <div>
              <span className="text-[11px] font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Modelos Industriais Rápidos:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: '400x600 · 2 Calhas', w: 400, h: 600, d: 200, r: 2, sp: 180, duct: 40 },
                  { label: '500x700 · 3 Calhas', w: 500, h: 700, d: 250, r: 3, sp: 160, duct: 40 },
                  { label: '600x800 · 3 Calhas', w: 600, h: 800, d: 250, r: 3, sp: 170, duct: 40 },
                  { label: '600x800 · 4 Calhas', w: 600, h: 800, d: 250, r: 4, sp: 150, duct: 40 },
                  { label: '800x1000 · 4 Calhas', w: 800, h: 1000, d: 300, r: 4, sp: 175, duct: 60 },
                  { label: '800x1200 · 5 Calhas', w: 800, h: 1200, d: 300, r: 5, sp: 170, duct: 60 },
                ].map((preset, idx) => {
                  const isActive =
                    config.widthMm === preset.w &&
                    config.heightMm === preset.h &&
                    rails.length === preset.r;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        handleUpdateCabinetDimensions({
                          widthMm: preset.w,
                          heightMm: preset.h,
                          depthMm: preset.d,
                          railCount: preset.r,
                          railSpacingMm: preset.sp,
                          sideDuctWidthMm: preset.duct,
                        })
                      }
                      className={`text-left p-1.5 rounded border transition text-[11px] ${
                        isActive
                          ? 'bg-blue-600/30 border-blue-500 text-sky-200 font-bold'
                          : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="font-mono">{preset.w}x{preset.h} mm</div>
                      <div className="text-[10px] text-slate-400">{preset.r} Calhas · Canaleta {preset.duct}mm</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dimensões do Quadro Exterior (Width, Height, Depth) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-3">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-blue-400" /> Dimensões do Armário (mm)
              </span>

              {/* Largura (Width) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Largura (W):</span>
                  <span className="font-mono font-bold text-sky-400">{config.widthMm} mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateCabinetDimensions({ widthMm: Math.max(300, config.widthMm - 50) })}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-bold border border-slate-700"
                  >
                    -50
                  </button>
                  <input
                    type="range"
                    min="300"
                    max="1400"
                    step="50"
                    value={config.widthMm}
                    onChange={(e) => handleUpdateCabinetDimensions({ widthMm: Number(e.target.value) })}
                    className="flex-1 accent-blue-500 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateCabinetDimensions({ widthMm: Math.min(1600, config.widthMm + 50) })}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-bold border border-slate-700"
                  >
                    +50
                  </button>
                </div>
              </div>

              {/* Altura (Height) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Altura (H):</span>
                  <span className="font-mono font-bold text-sky-400">{config.heightMm} mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateCabinetDimensions({ heightMm: Math.max(400, config.heightMm - 50) })}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-bold border border-slate-700"
                  >
                    -50
                  </button>
                  <input
                    type="range"
                    min="400"
                    max="2000"
                    step="50"
                    value={config.heightMm}
                    onChange={(e) => handleUpdateCabinetDimensions({ heightMm: Number(e.target.value) })}
                    className="flex-1 accent-blue-500 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateCabinetDimensions({ heightMm: Math.min(2200, config.heightMm + 50) })}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-bold border border-slate-700"
                  >
                    +50
                  </button>
                </div>
              </div>

              {/* Profundidade (Depth) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Profundidade (D):</span>
                  <span className="font-mono font-bold text-slate-200">{config.depthMm} mm</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[150, 200, 250, 300].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleUpdateCabinetDimensions({ depthMm: d })}
                      className={`py-1 text-xs font-mono rounded border transition ${
                        config.depthMm === d
                          ? 'bg-blue-600 text-white border-blue-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {d}mm
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Canaletas de Cablagem (Calhas Ranhuradas Técnicas) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-3">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-400" /> Canaletas de Cablagem (Calha Técnica)
              </span>

              {/* Canaleta Lateral */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Largura Canaleta Lateral:</span>
                  <span className="font-mono font-bold text-sky-400">{sideDuct} mm</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[25, 40, 60, 80].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleUpdateCabinetDimensions({ sideDuctWidthMm: w })}
                      className={`py-1 text-xs font-mono rounded border transition ${
                        sideDuct === w
                          ? 'bg-blue-600 text-white border-blue-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {w}mm
                    </button>
                  ))}
                </div>
              </div>

              {/* Canaleta Horizontal */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Altura Canaleta Horizontal:</span>
                  <span className="font-mono font-bold text-sky-400">{horizDuct} mm</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[25, 40, 60, 80].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleUpdateCabinetDimensions({ horizontalDuctHeightMm: h })}
                      className={`py-1 text-xs font-mono rounded border transition ${
                        horizDuct === h
                          ? 'bg-blue-600 text-white border-blue-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {h}mm
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calhas DIN 35mm (Trilhos e Espaçamento) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" /> Calhas DIN 35mm
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {rails.length} Calhas
                </span>
              </div>

              {/* Adicionar / Remover Calha */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={rails.length <= 1}
                  onClick={() => handleRemoveRail(rails.length - 1)}
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-slate-200 rounded border border-slate-700 transition"
                >
                  - Remover Calha
                </button>
                <button
                  type="button"
                  disabled={rails.length >= 8}
                  onClick={handleAddRail}
                  className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white rounded font-bold transition shadow-xs"
                >
                  + Adicionar Calha
                </button>
              </div>

              {/* Espaçamento Vertical entre Calhas */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Espaçamento Vertical:</span>
                  <span className="font-mono font-bold text-emerald-400">{config.railSpacingMm || 160} mm</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[140, 150, 160, 180].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => handleUpdateCabinetDimensions({ railSpacingMm: sp })}
                      className={`py-1 text-xs font-mono rounded border transition ${
                        (config.railSpacingMm || 160) === sp
                          ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {sp}mm
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista e Renomeação individual das Calhas */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 block">Identificação das Calhas:</span>
                {rails.map((rail, idx) => {
                  const usedMm = Math.round(rail.items.reduce((acc, it) => acc + it.data.widthMm + 5, 0));
                  const pct = Math.min(100, Math.round((usedMm / usableWidth) * 100));

                  return (
                    <div
                      key={rail.id}
                      className="bg-slate-900 border border-slate-800 rounded p-2 text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={rail.name}
                          onChange={(e) => {
                            const updated = rails.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r));
                            onUpdateProject({ ...project, rails: updated });
                          }}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                        {rails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRail(idx)}
                            className="p-1 text-slate-400 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>{rail.items.length} componentes</span>
                        <span className={`font-mono ${pct > 90 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                          {usedMm}mm / {usableWidth}mm ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Capacidade Técnica & Módulos DIN */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5 text-xs font-mono">
              <span className="text-[11px] font-bold font-sans text-slate-300 block mb-1">
                📊 Métricas de Capacidade Útil:
              </span>
              <div className="flex justify-between text-slate-300">
                <span>Largura Útil por Calha:</span>
                <span className="text-sky-400 font-bold">{usableWidth} mm</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Módulos DIN (18mm) / Calha:</span>
                <span className="text-slate-100">{Math.floor(usableWidth / 18)} TE</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Capacidade Total do Armário:</span>
                <span className="text-emerald-400 font-bold">
                  {rails.length * Math.floor(usableWidth / 18)} TE ({rails.length} calhas)
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Módulos Ocupados:</span>
                <span className="text-amber-400 font-bold">
                  {rails.reduce((acc, r) => acc + r.items.reduce((s, it) => s + (it.data.dinModules || 1), 0), 0)} TE
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 4: CABLE GLANDS (Marcação de Bucins de Entrada e Saída)
            ==================================================================== */}
        {activeSideTab === 'glands' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-4">
            {/* Header info */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-100">Bucins de Entrada & Saída</span>
                </div>
                <span className="text-[10px] font-mono bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded border border-amber-800 font-bold">
                  {glands.length} Total
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Prensa-cabos estanques (IP68) para entrada da rede/sinais e saída para motores e atuadores.
              </p>
              
              <button
                type="button"
                onClick={() => setIsGlandModalOpen(true)}
                className="mt-2.5 w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Abrir Mapa de Furação Completo & CSV</span>
              </button>
            </div>

            {/* Quick Actions (Add and Auto-Align) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAddGland('top')}
                className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> + Bucim Entrada
              </button>
              <button
                type="button"
                onClick={() => handleAddGland('bottom')}
                className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 rounded text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> + Bucim Saída
              </button>
            </div>

            {/* SECTION 1: Top Glands (Entrada no Topo) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ArrowDownCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Entrada de Cabos (Topo)</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAutoAlignGlands('top')}
                    className="text-[10px] text-sky-400 hover:underline font-mono"
                    title="Alinhar e distribuir bucins uniformemente"
                  >
                    Auto-alinhar
                  </button>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-1.5 rounded">
                    {glands.filter((g) => g.location === 'top').length}
                  </span>
                </div>
              </div>

              {/* List Top Glands */}
              <div className="space-y-2">
                {glands.filter((g) => g.location === 'top').map((gland) => {
                  const spec = GLAND_SPECS[gland.size] || GLAND_SPECS.M20;
                  const isSelected = selectedGlandId === gland.id;

                  return (
                    <div
                      key={gland.id}
                      onClick={() => setSelectedGlandId(gland.id)}
                      className={`p-2 rounded border transition text-xs flex flex-col gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500 text-amber-100 shadow-xs'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-amber-300">{gland.tag}</span>
                          <select
                            value={gland.size}
                            onChange={(e) => handleChangeGlandMetric(gland.id, e.target.value as GlandMetric)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-100 cursor-pointer focus:outline-none focus:border-amber-500"
                          >
                            {(['M12', 'M16', 'M20', 'M25', 'M32', 'M40', 'M50'] as GlandMetric[]).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <span className="text-[10px] font-mono text-slate-400">Ø{spec.holeDiameterMm}mm</span>
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGland(gland.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-400 transition"
                          title="Remover bucim"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Label description input */}
                      <input
                        type="text"
                        value={gland.label}
                        onChange={(e) => {
                          const updated = glands.map((g) => (g.id === gland.id ? { ...g, label: e.target.value } : g));
                          handleUpdateGlands(updated);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        placeholder="Identificação do circuito / cabo"
                      />

                      {/* X coordinate adjustment */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <div className="flex items-center gap-1 font-mono">
                          <span>Cota X:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = glands.map((g) => (g.id === gland.id ? { ...g, xOffsetMm: Math.max(30, g.xOffsetMm - 5) } : g));
                              handleUpdateGlands(updated);
                            }}
                            className="px-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold"
                          >
                            -5
                          </button>
                          <span className="text-sky-300 font-bold px-1">{gland.xOffsetMm} mm</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = glands.map((g) => (g.id === gland.id ? { ...g, xOffsetMm: Math.min(cabWidth - 30, g.xOffsetMm + 5) } : g));
                              handleUpdateGlands(updated);
                            }}
                            className="px-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold"
                          >
                            +5
                          </button>
                        </div>
                        <span className="font-mono text-slate-400">Cabo: {spec.cableRange}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: Bottom Glands (Saída no Fundo) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saída de Cabos (Base)</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAutoAlignGlands('bottom')}
                    className="text-[10px] text-sky-400 hover:underline font-mono"
                    title="Alinhar e distribuir bucins uniformemente"
                  >
                    Auto-alinhar
                  </button>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-1.5 rounded">
                    {glands.filter((g) => g.location === 'bottom').length}
                  </span>
                </div>
              </div>

              {/* List Bottom Glands */}
              <div className="space-y-2">
                {glands.filter((g) => g.location === 'bottom').map((gland) => {
                  const spec = GLAND_SPECS[gland.size] || GLAND_SPECS.M16;
                  const isSelected = selectedGlandId === gland.id;

                  return (
                    <div
                      key={gland.id}
                      onClick={() => setSelectedGlandId(gland.id)}
                      className={`p-2 rounded border transition text-xs flex flex-col gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-100 shadow-xs'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-emerald-300">{gland.tag}</span>
                          <select
                            value={gland.size}
                            onChange={(e) => handleChangeGlandMetric(gland.id, e.target.value as GlandMetric)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-100 cursor-pointer focus:outline-none focus:border-emerald-500"
                          >
                            {(['M12', 'M16', 'M20', 'M25', 'M32', 'M40', 'M50'] as GlandMetric[]).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <span className="text-[10px] font-mono text-slate-400">Ø{spec.holeDiameterMm}mm</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGland(gland.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-400 transition"
                          title="Remover bucim"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={gland.label}
                        onChange={(e) => {
                          const updated = glands.map((g) => (g.id === gland.id ? { ...g, label: e.target.value } : g));
                          handleUpdateGlands(updated);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        placeholder="Identificação do circuito / cabo"
                      />

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <div className="flex items-center gap-1 font-mono">
                          <span>Cota X:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = glands.map((g) => (g.id === gland.id ? { ...g, xOffsetMm: Math.max(30, g.xOffsetMm - 5) } : g));
                              handleUpdateGlands(updated);
                            }}
                            className="px-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold"
                          >
                            -5
                          </button>
                          <span className="text-sky-300 font-bold px-1">{gland.xOffsetMm} mm</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = glands.map((g) => (g.id === gland.id ? { ...g, xOffsetMm: Math.min(cabWidth - 30, g.xOffsetMm + 5) } : g));
                              handleUpdateGlands(updated);
                            }}
                            className="px-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold"
                          >
                            +5
                          </button>
                        </div>
                        <span className="font-mono text-slate-400">Cabo: {spec.cableRange}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Technical Specifications Summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5 text-xs font-mono">
              <span className="text-[11px] font-bold font-sans text-slate-300 block mb-1">
                📊 Resumo Técnico de Furação:
              </span>
              <div className="flex justify-between text-slate-300">
                <span>Furações no Topo (Entradas):</span>
                <span className="text-amber-400 font-bold">{glands.filter((g) => g.location === 'top').length} bucins</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Furações na Base (Saídas):</span>
                <span className="text-emerald-400 font-bold">{glands.filter((g) => g.location === 'bottom').length} bucins</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Norma & Estanquidade:</span>
                <span className="text-sky-400 font-bold">IEC 62444 · IP68</span>
              </div>
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span>Custo Acessórios Bucins:</span>
                <span className="text-slate-100 font-bold">
                  {glands.reduce((sum, g) => sum + (g.estimatedPriceEur || GLAND_SPECS[g.size].estimatedPriceEur), 0).toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 5: NOTAS DO PROJETO & CADERNO DE ENCARGOS (Relatório / PDF)
            ==================================================================== */}
        {activeSideTab === 'project_notes' && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-3">
            {/* Header with Title and PDF preview button */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 shrink-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Notas & Caderno de Encargos</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        PDF / Relatório
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Textos e instruções que serão integrados no relatório final impresso.
                    </p>
                  </div>
                </div>

                {onOpenPrintModal && (
                  <button
                    type="button"
                    onClick={onOpenPrintModal}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition shrink-0"
                    title="Pré-visualizar e Imprimir Relatório Técnico Completo"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Ver no Relatório</span>
                  </button>
                )}
              </div>

              {/* Sub-Tabs: Editor, Modelos Rápidos, Estruturado */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setNotesSubTab('editor')}
                  className={`flex-1 py-1 px-1.5 rounded-md font-semibold transition text-center text-[11px] ${
                    notesSubTab === 'editor'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Editor de Notas
                </button>
                <button
                  type="button"
                  onClick={() => setNotesSubTab('templates')}
                  className={`flex-1 py-1 px-1.5 rounded-md font-semibold transition text-center text-[11px] ${
                    notesSubTab === 'templates'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Modelos Rápidos
                </button>
                <button
                  type="button"
                  onClick={() => setNotesSubTab('structured')}
                  className={`flex-1 py-1 px-1.5 rounded-md font-semibold transition text-center text-[11px] ${
                    notesSubTab === 'structured'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Secções Técnicas
                </button>
              </div>
            </div>

            {/* Notification alert */}
            {recentNotification && (
              <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1.5 rounded shrink-0">
                <Check className="w-3.5 h-3.5" />
                <span>{recentNotification}</span>
              </div>
            )}

            {/* SUB-TAB 1: UNIFIED EDITOR */}
            {notesSubTab === 'editor' && (
              <div className="space-y-2 flex-1 flex flex-col min-h-0">
                {/* Toolbar for quick snippets */}
                <div className="flex flex-wrap items-center justify-between gap-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = project.config.notes || '';
                        const updated = cur ? `${cur}\n• ` : '• ';
                        onUpdateProject({ ...project, config: { ...project.config, notes: updated } });
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] border border-slate-700"
                      title="Inserir marcador de lista"
                    >
                      • Marcador
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = project.config.notes || '';
                        const updated = cur ? `${cur}\n• [X] ` : '• [X] ';
                        onUpdateProject({ ...project, config: { ...project.config, notes: updated } });
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] border border-slate-700"
                      title="Inserir verificação concluída"
                    >
                      ☑ [X]
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = project.config.notes || '';
                        const updated = cur ? `${cur}\n⚠️ ATENÇÃO: ` : '⚠️ ATENÇÃO: ';
                        onUpdateProject({ ...project, config: { ...project.config, notes: updated } });
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded text-[11px] border border-amber-900/50"
                      title="Inserir aviso de segurança"
                    >
                      ⚠️ Alerta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = project.config.notes || '';
                        const now = new Date().toISOString().split('T')[0];
                        const updated = cur ? `${cur}\n[Data: ${now}] ` : `[Data: ${now}] `;
                        onUpdateProject({ ...project, config: { ...project.config, notes: updated } });
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 rounded text-[11px] border border-sky-900/50"
                      title="Inserir carimbo de data"
                    >
                      📅 Data
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!project.config.notes) return;
                        navigator.clipboard.writeText(project.config.notes);
                        setCopiedNotes(true);
                        setRecentNotification('Notas copiadas para a área de transferência!');
                        setTimeout(() => {
                          setCopiedNotes(false);
                          setRecentNotification(null);
                        }, 2000);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition"
                      title="Copiar texto das notas"
                    >
                      {copiedNotes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {project.config.notes && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Tem a certeza que deseja limpar as notas do projeto?')) {
                            onUpdateProject({ ...project, config: { ...project.config, notes: '' } });
                            setRecentNotification('Notas limpas.');
                            setTimeout(() => setRecentNotification(null), 1500);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition"
                        title="Limpar todas as notas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Textarea */}
                <div className="relative flex-1 flex flex-col min-h-60">
                  <textarea
                    value={project.config.notes || ''}
                    onChange={(e) => {
                      onUpdateProject({
                        ...project,
                        config: {
                          ...project.config,
                          notes: e.target.value,
                        },
                      });
                    }}
                    placeholder={`Escreva aqui as observações técnicas, instruções de montagem, ensaios efetuados ou caderno de encargos do quadro...\n\nExemplo:\n• Quadro elétrico fabricado segundo as normas EN 61439-1 / 2.\n• Ensaio de isolamento efetuado a 500V DC com resultado conforme (R > 100 MΩ).\n• Binários de aperto de disjuntores: 2.5 N·m.`}
                    className="w-full flex-1 p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs leading-relaxed resize-none shadow-inner"
                    style={{ minHeight: '260px' }}
                  />

                  {/* Footer status bar */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 px-1 font-mono">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Auto-salvo no projeto
                    </span>
                    <span>
                      {(project.config.notes || '').length} caracteres · {(project.config.notes || '').split('\n').filter(Boolean).length} linhas
                    </span>
                  </div>
                </div>

                {/* Quick Helper Cards */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300 flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Dica Profissional para o Relatório Técnico:</span>
                  </div>
                  <p className="text-[11px] leading-normal text-slate-400">
                    Estas notas serão formatadas no relatório oficial A4 sob a secção <strong>"Caderno de Encargos & Notas Técnicas do Projeto"</strong> com suporte a listas com marcadores e avisos de segurança.
                  </p>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: ENGINEERING PRESET TEMPLATES */}
            {notesSubTab === 'templates' && (
              <div className="space-y-2.5 overflow-y-auto">
                <p className="text-xs text-slate-400">
                  Clique para anexar ou substituir modelos técnicos pré-redigidos segundo as melhores práticas de engenharia:
                </p>

                {[
                  {
                    title: '1. Conformidade Normativa EN 61439-1 & 2',
                    category: 'Normativo / CE',
                    color: 'blue',
                    text: `1. CONFORMIDADE NORMATIVA & MARCAÇÃO CE:
• O presente conjunto de aparelhagem de baixa tensão foi concebido, montado e verificado de acordo com os requisitos estritos das normas europeias EN 61439-1 (Regras gerais) e EN 61439-2 (Quadros de potência e comando).
• Tensão nominal de isolamento (Ui): 500V AC.
• Tensão nominal de impulso suportável (Uimp): 4 kV.
• Grau de proteção do invólucro: ${project.config.ipRating || 'IP65'} em conformidade com a IEC 60529.
• Tensão de alimentação de entrada: ${project.config.supplyVoltage || '230V AC'}.`,
                  },
                  {
                    title: '2. Instruções de Montagem & Binários de Aperto',
                    category: 'Mecânica & Fiação',
                    color: 'emerald',
                    text: `2. INSTRUÇÕES DE MONTAGEM E CABLAGEM:
• Todos os condutores flexíveis utilizados são do tipo H07V-K com ponteiras de cobre estanhado prensadas com alicate calibrado.
• Segregação física rigorosa nas calhas plásticas entre cabos de potência (AC) e cabos de sinal analógico/comando 24VDC para imunidade contra ruído eletromagnético (CEM).
• Binários de aperto (Torque) aplicados e verificados:
  - Disjuntores e interruptores diferenciais: 2.5 N·m
  - Bornes de passagem e réguas de bornes: 0.8 N·m
  - Barramentos de terra e neutro: 3.0 N·m
• Todas as pontas de cabo devidamente identificadas com anilhas marcadoras de acordo com os esquemas elétricos.`,
                  },
                  {
                    title: '3. Protocolo de Ensaios Finais de Rotina (Routine Verification)',
                    category: 'Comissionamento',
                    color: 'amber',
                    text: `3. PROTOCOLO DE ENSAIOS DE ROTINA (EN 61439-1 Secção 11):
• [X] Ensaio de continuidade do circuito de proteção e ligação à terra PE (R < 0.1 Ω).
• [X] Medição da resistência de isolamento com megóhmetro a 500V DC (R > 100 MΩ entre fases e terra).
• [X] Verificação visual das folgas de isolamento e distâncias de fuga no ar.
• [X] Ensaio funcional elétrico: alimentação da fonte 24VDC com carga simulada e verificação de estabilidade (24.0V ± 0.5V).
• [X] Teste do circuito de paragem de emergência e rearme de segurança verificado com sucesso.`,
                  },
                  {
                    title: '4. Advertências de Segurança & Procedimento LOTO',
                    category: 'Segurança & EPI',
                    color: 'red',
                    text: `4. SEGURANÇA E OPERAÇÃO DO QUADRO:
• ⚠️ ATENÇÃO: Desenergizar o interruptor geral do quadro e verificar a ausência efetiva de tensão antes de qualquer intervenção mecânica ou elétrica no interior.
• Aplicar procedimento de bloqueio e etiquetagem (LOTO - Lockout/Tagout) durante manutenções preventivas ou corretivas.
• Utilizar Equipamentos de Proteção Individual (EPIs): óculos de proteção e calçado isolante.
• Não desativar nem contornar os dispositivos de proteção contra sobrecargas ou defeitos de isolamento à terra.`,
                  },
                  {
                    title: '5. Histórico de Revisão do Projeto',
                    category: 'Registo Técnico',
                    color: 'purple',
                    text: `5. REGISTO DE REVISÃO E APROVAÇÃO TÉCNICA:
• Revisão: Rev. 1.0 — Projeto elétrico inicial e cálculo de balanço de potência em 24VDC.
• Data de Emissão: ${project.config.date || new Date().toISOString().split('T')[0]}
• Projetista Responsável: ${project.config.designerName || 'Engenharia Eletrotécnica'}
• Entidade / Cliente: ${project.config.clientName || 'Cliente Industrial'}
• Código do Projeto: ${project.config.projectCode || 'PROJ-001'}`,
                  },
                ].map((tpl) => (
                  <div
                    key={tpl.title}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-200">{tpl.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {tpl.category}
                      </span>
                    </div>

                    <pre className="text-[10px] font-mono text-slate-400 bg-slate-900 p-2 rounded max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {tpl.text}
                    </pre>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          const cur = project.config.notes || '';
                          const updated = cur ? `${cur}\n\n${tpl.text}` : tpl.text;
                          onUpdateProject({ ...project, config: { ...project.config, notes: updated } });
                          setNotesSubTab('editor');
                          setRecentNotification(`Modelo anexado às notas!`);
                          setTimeout(() => setRecentNotification(null), 2000);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition"
                      >
                        + Anexar às Notas
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !project.config.notes ||
                            window.confirm('Isto irá substituir o conteúdo atual das notas por este modelo. Deseja continuar?')
                          ) {
                            onUpdateProject({ ...project, config: { ...project.config, notes: tpl.text } });
                            setNotesSubTab('editor');
                            setRecentNotification(`Modelo aplicado!`);
                            setTimeout(() => setRecentNotification(null), 2000);
                          }
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-700 transition"
                      >
                        Substituir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SUB-TAB 3: STRUCTURED SECTIONS */}
            {notesSubTab === 'structured' && (
              <div className="space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Preencha os blocos temáticos e compile para as notas:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const pn = project.config.projectNotes || {};
                      const parts: string[] = [];
                      if (pn.generalNotes) parts.push(`NOTAS GERAIS:\n${pn.generalNotes}`);
                      if (pn.assemblyInstructions) parts.push(`INSTRUÇÕES DE MONTAGEM & CABLAGEM:\n${pn.assemblyInstructions}`);
                      if (pn.testingCommissioning) parts.push(`ENSAIOS & COMISSIONAMENTO:\n${pn.testingCommissioning}`);
                      if (pn.safetyWarnings) parts.push(`AVISOS DE SEGURANÇA:\n${pn.safetyWarnings}`);
                      if (pn.revisionHistory) parts.push(`HISTÓRICO DE REVISÃO:\n${pn.revisionHistory}`);

                      const compiled = parts.join('\n\n');
                      onUpdateProject({
                        ...project,
                        config: {
                          ...project.config,
                          notes: compiled,
                        },
                      });
                      setNotesSubTab('editor');
                      setRecentNotification('Secções compiladas para o editor principal!');
                      setTimeout(() => setRecentNotification(null), 2000);
                    }}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[11px] transition shadow-xs"
                  >
                    Compilar para Editor
                  </button>
                </div>

                {/* Structured Form Fields */}
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      <span>1. Instruções de Montagem & Cablagem</span>
                    </label>
                    <textarea
                      rows={3}
                      value={project.config.projectNotes?.assemblyInstructions || ''}
                      onChange={(e) => {
                        const curPn = project.config.projectNotes || {};
                        const newPn = { ...curPn, assemblyInstructions: e.target.value };
                        onUpdateProject({
                          ...project,
                          config: { ...project.config, projectNotes: newPn },
                        });
                      }}
                      placeholder="Ex: Secções de cabo 2.5mm² para força, 0.75mm² para comando, torque 2.5 N·m..."
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
                      <span>2. Ensaios & Comissionamento (EN 61439)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={project.config.projectNotes?.testingCommissioning || ''}
                      onChange={(e) => {
                        const curPn = project.config.projectNotes || {};
                        const newPn = { ...curPn, testingCommissioning: e.target.value };
                        onUpdateProject({
                          ...project,
                          config: { ...project.config, projectNotes: newPn },
                        });
                      }}
                      placeholder="Ex: Ensaio de continuidade PE R < 0.1Ω, isolamento 500V DC > 100MΩ..."
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>3. Avisos de Segurança & Intervenção</span>
                    </label>
                    <textarea
                      rows={2}
                      value={project.config.projectNotes?.safetyWarnings || ''}
                      onChange={(e) => {
                        const curPn = project.config.projectNotes || {};
                        const newPn = { ...curPn, safetyWarnings: e.target.value };
                        onUpdateProject({
                          ...project,
                          config: { ...project.config, projectNotes: newPn },
                        });
                      }}
                      placeholder="Ex: Desligar disjuntor geral antes de abrir a porta. Intervenção exclusiva por técnicos credenciados..."
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>4. Histórico de Revisões</span>
                    </label>
                    <textarea
                      rows={2}
                      value={project.config.projectNotes?.revisionHistory || ''}
                      onChange={(e) => {
                        const curPn = project.config.projectNotes || {};
                        const newPn = { ...curPn, revisionHistory: e.target.value };
                        onUpdateProject({
                          ...project,
                          config: { ...project.config, projectNotes: newPn },
                        });
                      }}
                      placeholder="Ex: Rev. 1.0 - Criação inicial; Rev. 1.1 - Adicionado módulo de saídas digitais PLC..."
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gland Technical Punching Schedule Modal */}
      <GlandScheduleModal
        isOpen={isGlandModalOpen}
        onClose={() => setIsGlandModalOpen(false)}
        glands={glands}
        cabWidth={cabWidth}
        cabHeight={cabHeight}
        onUpdateGlands={handleUpdateGlands}
      />

      {/* Auto-Layout & Thermal Optimization Modal (EN 61439) */}
      <AutoLayoutModal
        isOpen={isAutoLayoutModalOpen}
        onClose={() => setIsAutoLayoutModalOpen(false)}
        project={project}
        selectedRailIndex={selectedRailIndex ?? 0}
        onApplyLayout={(newRails) => {
          onUpdateProject({ ...project, rails: newRails });
          setRecentNotification('Auto-Layout com otimização de espaço e ventilação térmica aplicado com sucesso!');
          setTimeout(() => setRecentNotification(null), 3500);
        }}
      />

      {/* Modal / Inspector do Condutor Selecionado */}
      {selectedWire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 max-w-md w-full text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border border-white/60 shadow-xs"
                  style={{ backgroundColor: selectedWire.color }}
                />
                <h3 className="font-bold text-base text-white font-mono">
                  Condutor {selectedWire.wireTag}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWire(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Origem</span>
                  <strong className="text-sky-300 text-sm">{selectedWire.fromComponentTag}</strong>
                  <div className="text-slate-300">Borne: <span className="text-white font-bold">{selectedWire.fromTerminal}</span></div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Destino</span>
                  <strong className="text-emerald-300 text-sm">{selectedWire.toComponentTag}</strong>
                  <div className="text-slate-300">Borne: <span className="text-white font-bold">{selectedWire.toTerminal}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Secção Transversal</span>
                  <span className="text-white font-bold text-sm">{selectedWire.crossSectionMm2} mm²</span>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Tipo de Circuito</span>
                  <span className="text-amber-300 font-bold capitalize">{selectedWire.netType.replace('_', ' ')}</span>
                </div>
              </div>

              {selectedWire.notes && (
                <div className="bg-slate-950/40 p-2.5 rounded-lg text-slate-300 text-[11px] border border-slate-800/60 font-sans">
                  <span className="text-slate-400 text-[10px] block font-mono">Notas Técnicas:</span>
                  {selectedWire.notes}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 text-[11px]">
                <span className="text-slate-400">Estado de Ensaio:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${
                  selectedWire.isEnergized
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {selectedWire.isEnergized ? '⚡ Em Tensão / Ativo' : '⚪ Sem Tensão'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleDeleteWire(selectedWire)}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 rounded-xl font-sans text-xs font-bold transition shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Condutor</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedWire(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-sans text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Detailed Wiring Schedule Modal (De-Para & CSV Export) */}
      <WiringListModal
        isOpen={isWiringListModalOpen}
        onClose={() => setIsWiringListModalOpen(false)}
        project={project}
        onShowNotification={(msg) => {
          setRecentNotification(msg);
          setTimeout(() => setRecentNotification(null), 3500);
        }}
      />
    </div>
  );
};
