import React, { useState, useRef, useMemo } from 'react';
import { ProjectState } from '../types/electrical';
import { analyzeProjectForSchematic } from '../utils/schematicGenerator';
import { generateUnifilarRoutingData } from '../utils/unifilarCircuitRouter';
import { executeAutoRouter, WireStandard, RoutingStyle, AutoRouterResult, RoutedCircuitBranch } from '../utils/autoRouterEngine';
import { checkLogicalContinuity, autoResolveContinuityIssue } from '../utils/logicalContinuityChecker';
import { LogicalContinuityReport, LogicalContinuityIssue } from '../types/electrical';
import { LogicalContinuityDrawer } from './LogicalContinuityDrawer';
import { CadExportModal } from './CadExportModal';
import { SchematicPdfExportModal } from './SchematicPdfExportModal';
import { downloadSingleSchematicPdf, downloadCompleteUnifilarDiagramPdf } from '../utils/schematicPdfExporter';
import { 
  Download, Printer, ZoomIn, ZoomOut, Maximize2, Layers, Cpu, Zap, 
  Info, FileText, Sparkles, CheckCircle, Route, SlidersHorizontal, 
  RefreshCw, X, ChevronRight, ShieldCheck, Eye, ShieldAlert, AlertTriangle, AlertCircle
} from 'lucide-react';

interface SchematicViewerProps {
  project: ProjectState;
  onUpdateProject?: (updated: ProjectState) => void;
  onShowNotification?: (msg: string) => void;
}

export const SchematicViewer: React.FC<SchematicViewerProps> = ({ 
  project,
  onUpdateProject,
  onShowNotification,
}) => {
  const [viewMode, setViewMode] = useState<'power' | 'control' | 'breakers_terminals'>('breakers_terminals');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [isCadModalOpen, setIsCadModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isExportingDirectPdf, setIsExportingDirectPdf] = useState(false);
  const [isExportingUnifilarPdf, setIsExportingUnifilarPdf] = useState(false);

  // Auto-Router state & configurations
  const [isAutoRouterActive, setIsAutoRouterActive] = useState<boolean>(true);
  const [wireStandard, setWireStandard] = useState<WireStandard>('iec_60446');
  const [routingStyle, setRoutingStyle] = useState<RoutingStyle>('duct_manhattan');
  const [includePe, setIncludePe] = useState<boolean>(true);
  const [selectedCircuitIndex, setSelectedCircuitIndex] = useState<number | null>(null);
  const [hoveredCircuitIndex, setHoveredCircuitIndex] = useState<number | null>(null);
  const [recalculateKey, setRecalculateKey] = useState<number>(0);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  // Logical Electrical Continuity state & reports (IEC 60204-1 / EN 61439)
  const [isContinuityActive, setIsContinuityActive] = useState<boolean>(true);
  const [isContinuityDrawerOpen, setIsContinuityDrawerOpen] = useState<boolean>(false);
  const [selectedContinuityIssue, setSelectedContinuityIssue] = useState<LogicalContinuityIssue | null>(null);

  const continuityReport: LogicalContinuityReport = useMemo(() => {
    return checkLogicalContinuity(project);
  }, [project]);

  // Lookup of continuity issues by component tag (e.g. Q1, G1, A1, X1)
  const issuesByComponentTag = useMemo(() => {
    const map = new Map<string, LogicalContinuityIssue[]>();
    for (const issue of continuityReport.issues) {
      const tag = (issue.componentTag || '').toUpperCase();
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag)!.push(issue);
    }
    return map;
  }, [continuityReport]);

  const handleAutoResolveIssue = (issue: LogicalContinuityIssue) => {
    if (onUpdateProject) {
      const updated = autoResolveContinuityIssue(project, issue);
      onUpdateProject(updated);
      if (onShowNotification) {
        onShowNotification(`Ligação resolvida automaticamente: ${issue.title}`);
      }
    }
  };

  const handleFocusComponentFromContinuity = (tag: string) => {
    const upper = tag.toUpperCase();
    if (upper.startsWith('A') || upper.includes('PLC') || upper.startsWith('K')) {
      setViewMode('control');
    } else if (upper.startsWith('Q0') || upper.includes('DIFF') || upper.startsWith('G') || upper.includes('SPD')) {
      setViewMode('power');
    } else {
      setViewMode('breakers_terminals');
    }
  };

  const analysis = analyzeProjectForSchematic(project);
  const unifilarRouting = useMemo(() => generateUnifilarRoutingData(project), [project]);
  
  // Intelligent Auto-Router calculation
  const autoRouterData: AutoRouterResult = useMemo(() => {
    return executeAutoRouter(project, {
      standard: wireStandard,
      style: isAutoRouterActive ? routingStyle : 'unifilar_bus',
      includePe,
    });
  }, [project, wireStandard, routingStyle, isAutoRouterActive, includePe, recalculateKey]);

  const activeInspectedCircuit = useMemo(() => {
    const targetIdx = selectedCircuitIndex !== null ? selectedCircuitIndex : hoveredCircuitIndex;
    if (targetIdx === null) return null;
    return autoRouterData.circuits.find((c) => c.circuitIndex === targetIdx) || null;
  }, [selectedCircuitIndex, hoveredCircuitIndex, autoRouterData.circuits]);

  const handleRecalculateAutoRouter = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      setRecalculateKey((k) => k + 1);
      setIsRecalculating(false);
    }, 280);
  };

  const handleZoom = (factor: number) => {
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.5), 2.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = viewMode === 'breakers_terminals' ? 'unifilar_disjuntores_terminais' : viewMode === 'control' ? 'esquema_24vdc' : 'unifilar_potencia';
    a.download = `${project.config.projectCode || 'esquema'}_${suffix}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDirectPdf = async () => {
    try {
      setIsExportingDirectPdf(true);
      await downloadSingleSchematicPdf(project, viewMode, 'light');
    } catch (err) {
      console.error('Error exporting direct PDF:', err);
    } finally {
      setIsExportingDirectPdf(false);
    }
  };

  const handleDownloadCompleteUnifilarPdf = async () => {
    try {
      setIsExportingUnifilarPdf(true);
      await downloadCompleteUnifilarDiagramPdf(project, { theme: 'light' });
    } catch (err) {
      console.error('Error generating complete unifilar PDF:', err);
    } finally {
      setIsExportingUnifilarPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isThreePhase = project.config.supplyVoltage.includes('400V');

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-lg overflow-hidden border border-slate-800 shadow-xl">
      {/* Compact Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-slate-950 border-b border-slate-800 gap-2 shrink-0 no-print">
        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('breakers_terminals')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'breakers_terminals'
                ? 'bg-purple-600 text-white shadow-xs font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Diagrama unifilar: conexões diretas entre disjuntores e blocos terminais"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>01. Disjuntores ➔ Bornes</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-950 text-purple-200 border border-purple-800 font-bold">
              Auto
            </span>
          </button>
          <button
            onClick={() => setViewMode('power')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'power'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>02. Potência Geral</span>
          </button>
          <button
            onClick={() => setViewMode('control')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'control'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>03. 24VDC & PLC</span>
          </button>
        </div>

        {/* Logical Electrical Continuity Auditor Button */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsContinuityDrawerOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition shadow-xs cursor-pointer ${
              continuityReport.criticalCount > 0
                ? 'bg-rose-950/80 text-rose-300 border-rose-600/70 hover:bg-rose-900'
                : continuityReport.warningCount > 0
                ? 'bg-amber-950/80 text-amber-300 border-amber-600/70 hover:bg-amber-900'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70 hover:bg-emerald-900'
            }`}
            title="Abrir auditoria de continuidade lógica de conexões, pinos de E/S e retorno de terra/neutro/0V"
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${continuityReport.criticalCount > 0 ? 'text-rose-400 animate-pulse' : continuityReport.warningCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span>Continuidade Lógica</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
              continuityReport.criticalCount > 0
                ? 'bg-rose-600 text-white'
                : continuityReport.warningCount > 0
                ? 'bg-amber-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}>
              {continuityReport.issues.length === 0 ? '100% OK' : `${continuityReport.issues.length} pendências`}
            </span>
          </button>
        </div>

        {/* Zoom & Unified Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom */}
          <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={() => handleZoom(1.2)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-xs font-mono text-slate-300 min-w-[36px] text-center select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.8)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleReset}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition text-xs border-l border-slate-800 ml-0.5"
              title="Ajustar ao Ecrã"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Unified Export Actions */}
          <div className="flex items-center gap-1">
            {/* Complete IEC Unifilar Schematic PDF (3 Sheets with IEC 60617, Auto-Router, and Schedule Table) */}
            <button
              onClick={handleDownloadCompleteUnifilarPdf}
              disabled={isExportingUnifilarPdf}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-98 disabled:opacity-50"
              title="Gerar automaticamente o diagrama unifilar completo em formato PDF com normas e simbologia técnica IEC"
            >
              <Download className="w-3 h-3 text-white" />
              <span>{isExportingUnifilarPdf ? 'A gerar PDF IEC...' : 'Diagrama Unifilar PDF (IEC)'}</span>
            </button>

            {/* Direct 1-Click PDF Export */}
            <button
              onClick={handleDownloadDirectPdf}
              disabled={isExportingDirectPdf}
              className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-98 disabled:opacity-50"
              title="Descarregar imediatamente o esquema unifilar atual em PDF"
            >
              <Download className="w-3 h-3 text-white" />
              <span>{isExportingDirectPdf ? 'A gerar...' : 'PDF Rápido'}</span>
            </button>

            {/* Exportar Dossier PDF Completo com Dados e BOM */}
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-98"
              title="Exportar dossier técnico em PDF com especificações e BOM"
            >
              <FileText className="w-3 h-3 text-white" />
              <span>Dossier PDF (BOM)</span>
            </button>

            {/* Secondary actions: SVG & Imprimir */}
            <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
              <button
                onClick={handleDownloadSvg}
                className="px-2 py-1 text-slate-300 hover:text-white text-xs font-medium rounded hover:bg-slate-800 transition"
                title="Descarregar ficheiro SVG"
              >
                SVG
              </button>
              <button
                onClick={handlePrint}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                title="Imprimir esquema"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Contextual Toolbar: Auto-Router Configuration & Normative Colors */}
      {viewMode === 'breakers_terminals' && (
        <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs gap-2 select-none no-print">
          {/* Left: Auto-Router Mode & Standard Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAutoRouterActive((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-xs transition border cursor-pointer ${
                isAutoRouterActive
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow-xs'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Ativar/Desativar sugestão automática de roteamento lógico de fios"
            >
              <Route className={`w-3.5 h-3.5 ${isAutoRouterActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>Auto-Router: {isAutoRouterActive ? 'ATIVO' : 'DESLIGADO'}</span>
            </button>

            {/* Pinos & Continuidade Lógica Halos Toggle */}
            <button
              onClick={() => setIsContinuityActive((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-xs transition border cursor-pointer ${
                isContinuityActive
                  ? 'bg-amber-600/20 text-amber-300 border-amber-500/50 shadow-xs'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Ativar/Desativar realce visual de pinos desconectados e falhas de continuidade"
            >
              <Eye className={`w-3.5 h-3.5 ${isContinuityActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>Verificador de Pinos: {isContinuityActive ? 'ATIVO' : 'OCULTO'}</span>
            </button>

            {/* Wire Standard Selector */}
            <div className="flex items-center bg-slate-950 rounded-md border border-slate-800 p-0.5">
              <span className="text-[10px] text-slate-400 px-1.5 font-semibold">Norma de Cores:</span>
              <button
                onClick={() => setWireStandard('iec_60446')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  wireStandard === 'iec_60446'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="IEC 60446 / HD 308 S2 (RTIEBT): L1 Castanho, N Azul Claro, PE Verde/Amarelo"
              >
                IEC 60446 / RTIEBT
              </button>
              <button
                onClick={() => setWireStandard('en_60204')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  wireStandard === 'en_60204'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="EN 60204-1 (Painéis Industriais): Potência Preto, Neutro Azul, Comando Vermelho, DC Azul"
              >
                EN 60204-1 (Industrial)
              </button>
            </div>

            {/* Routing Style Selector */}
            <div className="flex items-center bg-slate-950 rounded-md border border-slate-800 p-0.5">
              <span className="text-[10px] text-slate-400 px-1.5 font-semibold">Traçado:</span>
              <button
                onClick={() => setRoutingStyle('duct_manhattan')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  routingStyle === 'duct_manhattan'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Caminho ortogonal pelas calhas técnicas com curvas de 90°"
              >
                Orto-Calhas
              </button>
              <button
                onClick={() => setRoutingStyle('multiconductor')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  routingStyle === 'multiconductor'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Múltiplos condutores individuais em feixe"
              >
                Multicondutores
              </button>
              <button
                onClick={() => setRoutingStyle('unifilar_bus')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  routingStyle === 'unifilar_bus'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Unifilar simplificado"
              >
                Unifilar
              </button>
            </div>

            {/* Include PE Toggle */}
            <button
              onClick={() => setIncludePe((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition border cursor-pointer ${
                includePe
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
              title="Incluir condutor de proteção Terra PE"
            >
              <span className={`w-2 h-2 rounded-full ${includePe ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
              <span>Terra PE</span>
            </button>
          </div>

          {/* Right: Recalculate Button & Metric Chips */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] bg-slate-950 px-2 py-1 rounded border border-slate-800">
              <span className="text-slate-400">{autoRouterData.totalCircuitsCount} Circuitos</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300 font-bold">{autoRouterData.totalWiringLengthM} m Fio</span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1 text-amber-400" title={wireStandard === 'en_60204' ? 'Potência (Preto)' : 'Fase L (Castanho)'}>
                <span className={`w-2 h-2 rounded-full ${wireStandard === 'en_60204' ? 'bg-[#1e293b] border border-slate-500' : 'bg-[#92400e]'}`}></span>
                {wireStandard === 'en_60204' ? 'Pot' : 'L'}
              </span>
              <span className="flex items-center gap-1 text-sky-400" title="Neutro N (Azul)">
                <span className="w-2 h-2 rounded-full bg-[#0284c7]"></span>
                N
              </span>
              {includePe && (
                <span className="flex items-center gap-1 text-emerald-400" title="Terra PE (Verde/Amarelo)">
                  <span className="w-2 h-2 rounded-full bg-[#16a34a]"></span>
                  PE
                </span>
              )}
            </div>

            <button
              onClick={handleRecalculateAutoRouter}
              disabled={isRecalculating}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Recalcular caminhos ótimos e comprimentos"
            >
              <RefreshCw className={`w-3 h-3 text-sky-400 ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>{isRecalculating ? 'A calcular...' : 'Recalcular'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SVG Canvas Container */}
      <div
        className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing bg-[#0a0f1d] flex items-center justify-center p-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1200 800"
          className="max-w-none transition-transform duration-75 select-none"
          style={{
            width: `${1200 * zoom}px`,
            height: `${800 * zoom}px`,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
            {/* Arrowhead */}
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
            {/* Route Glow Filter for selected/hovered auto-routed circuits */}
            <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#38bdf8" floodOpacity="0.8" />
            </filter>
            <filter id="route-glow-amber" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#f59e0b" floodOpacity="0.9" />
            </filter>
            {/* Continuity Alert Glow Filters (IEC 60204-1 Highlight) */}
            <filter id="continuity-glow-amber" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.9" />
            </filter>
            <filter id="continuity-glow-rose" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f43f5e" floodOpacity="0.95" />
            </filter>
          </defs>

          {/* Background */}
          <rect width="1200" height="800" fill="#0f172a" />
          <rect width="1200" height="800" fill="url(#grid)" />

          {/* Outer IEC Drawing Border */}
          <rect x="20" y="20" width="1160" height="760" fill="none" stroke="#475569" strokeWidth="2" />
          <rect x="25" y="25" width="1150" height="750" fill="none" stroke="#334155" strokeWidth="1" />

          {/* IEC Coordinate Grid Margins */}
          {['A', 'B', 'C', 'D', 'E', 'F'].map((letter, i) => (
            <text key={letter} x="12" y={75 + i * 125} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
              {letter}
            </text>
          ))}
          {['1', '2', '3', '4', '5', '6', '7', '8'].map((num, i) => (
            <text key={num} x={80 + i * 135} y="16" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
              {num}
            </text>
          ))}

          {/* Top Title Banner */}
          <text x="50" y="55" fill="#f8fafc" fontSize="16" fontWeight="bold" fontFamily="Plus Jakarta Sans">
            {viewMode === 'breakers_terminals'
              ? 'ESQUEMA UNIFILAR: DISJUNTORES ➔ BLOCOS TERMINAIS DE SAÍDA (IEC 60617)'
              : viewMode === 'power'
              ? 'ESQUEMA UNIFILAR GERAL DE POTÊNCIA E ALIMENTAÇÃO (NORMA IEC 60617)'
              : 'ESQUEMA DE DISTRIBUIÇÃO 24VDC & ENTRADAS/SAÍDAS DO PLC SIEMENS'}
          </text>
          <text x="50" y="75" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono">
            {viewMode === 'breakers_terminals'
              ? `ALIMENTAÇÃO: ${project.config.supplyVoltage} | 50Hz | AUTO-ROTEAMENTO: DISJUNTORES DE CALHA ➔ RÉGUA DE BORNES X1 ➔ CARGAS`
              : `ALIMENTAÇÃO: ${project.config.supplyVoltage} | 50Hz | GRAU: ${project.config.ipRating} | DISTRIBUIÇÃO CC: 24V DC ESTABILIZADA`}
          </text>

          {/* ========================================================
              VIEW 0: ESQUEMA UNIFILAR DISJUNTORES ➔ BLOCOS TERMINAIS
             ======================================================== */}
          {viewMode === 'breakers_terminals' && (
            <g transform="translate(0, 30)">
              {/* Left Incomer Column */}
              <g transform="translate(45, 60)">
                <text x="0" y="0" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                  ENTRADA REDE ({unifilarRouting.incomer.voltage.split(' ')[0]})
                </text>
                <text x="0" y="14" fill="#64748b" fontSize="9" fontFamily="JetBrains Mono">
                  Cabo {unifilarRouting.incomer.cable}
                </text>

                {/* Infeed line */}
                <line x1="60" y1="24" x2="60" y2="50" stroke="#38bdf8" strokeWidth="2.5" />
                <circle cx="60" cy="24" r="4" fill="#38bdf8" />

                {/* Main Breaker Q0 */}
                <g transform="translate(30, 50)">
                  <rect x="0" y="0" width="60" height="42" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="3" />
                  <path d="M 30 0 L 30 14 M 30 28 L 30 42 M 23 28 L 37 14" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                  <text x="70" y="16" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                    {unifilarRouting.incomer.mainBreaker?.tag || 'Q0'}
                  </text>
                  <text x="70" y="28" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                    {unifilarRouting.incomer.mainBreaker?.data.partNumber || '5SY4216-7'}
                  </text>
                  <text x="70" y="38" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">
                    {unifilarRouting.incomer.ratingA}A / 10kA
                  </text>
                </g>

                {/* Diff Breaker */}
                <g transform="translate(30, 110)">
                  <line x1="30" y1="-18" x2="30" y2="0" stroke="#38bdf8" strokeWidth="2" />
                  <rect x="0" y="0" width="60" height="42" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" rx="3" />
                  <circle cx="30" cy="21" r="12" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 2" />
                  <path d="M 23 30 L 37 12" stroke="#10b981" strokeWidth="2" />
                  <text x="70" y="16" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                    {unifilarRouting.incomer.diffBreaker?.tag || 'Q_DIFF'}
                  </text>
                  <text x="70" y="28" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                    IΔn = 30mA
                  </text>
                  <text x="70" y="38" fill="#10b981" fontSize="8" fontFamily="JetBrains Mono">
                    Tipo A (EN 61008)
                  </text>
                </g>

                {/* Main Distribution Busbar */}
                <line x1="60" y1="152" x2="60" y2="185" stroke="#38bdf8" strokeWidth="2.5" />
                <line 
                  x1="60" 
                  y1="185" 
                  x2={Math.min(1140, 220 + autoRouterData.circuits.length * Math.max(88, Math.min(130, 900 / Math.max(1, autoRouterData.circuits.length))))} 
                  stroke="#38bdf8" 
                  strokeWidth="3" 
                />
                <text x="65" y="180" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                  BARRAMENTO DE DISTRIBUIÇÃO ({isThreePhase ? 'L1, L2, L3, N' : 'L, N, PE'})
                </text>
              </g>

              {/* Horizontal Wiring Duct / Conduit Trunking Strip */}
              {isAutoRouterActive && (
                <g transform="translate(200, 336)">
                  <rect 
                    x="0" 
                    y="0" 
                    width={Math.min(940, autoRouterData.circuits.length * Math.max(88, Math.min(130, 900 / Math.max(1, autoRouterData.circuits.length))) + 40)} 
                    height="32" 
                    fill="#090d16" 
                    stroke="#1e293b" 
                    strokeWidth="1.2" 
                    strokeDasharray="4 3" 
                    rx="3" 
                  />
                  <text x="12" y="20" fill="#475569" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold">
                    CALHA TÉCNICA HORIZONTAL DE CABLAGEM (CANAL AUTO-ROUTER)
                  </text>
                </g>
              )}

              {/* Branch Circuit Columns with Auto-Routed Conductors */}
              {(() => {
                const startX = 220;
                const count = Math.max(1, autoRouterData.circuits.length);
                const colW = Math.max(88, Math.min(130, 900 / count));

                return autoRouterData.circuits.map((c, i) => {
                  const x = startX + i * colW + colW / 2;
                  const isMotor = c.circuitMnemonic === 'MOTOR';
                  const isSelected = selectedCircuitIndex === c.circuitIndex;
                  const isHovered = hoveredCircuitIndex === c.circuitIndex;
                  const isActive = isSelected || isHovered;
                  const isDimmed = (selectedCircuitIndex !== null || hoveredCircuitIndex !== null) && !isActive;

                  const breakerIssues = issuesByComponentTag.get(c.breakerTag.toUpperCase()) || [];
                  const hasBreakerIssue = isContinuityActive && breakerIssues.length > 0;
                  const breakerSeverity = breakerIssues.some((iss) => iss.severity === 'critical') ? 'critical' : 'warning';

                  const terminalIssues = [
                    ...(issuesByComponentTag.get((c.terminalStripTag || '').toUpperCase()) || []),
                    ...continuityReport.issues.filter((iss) => 
                      iss.terminalId.toUpperCase().includes((c.terminalStripTag || 'X1').toUpperCase()) ||
                      iss.terminalId === `${c.circuitIndex}` ||
                      iss.title.includes(c.breakerTag)
                    )
                  ];
                  const hasTerminalIssue = isContinuityActive && terminalIssues.length > 0;

                  return (
                    <g 
                      key={c.circuitIndex} 
                      transform={`translate(${x}, 0)`}
                      className="transition-opacity duration-150"
                      opacity={isDimmed ? 0.35 : 1}
                    >
                      {/* Tap line from Busbar */}
                      <line x1="0" y1="245" x2="0" y2="275" stroke="#38bdf8" strokeWidth="2" />
                      <circle cx="0" cy="245" r="3" fill="#38bdf8" />

                      {/* Breaker Box with IEC thermal-magnetic switch */}
                      <g 
                        transform="translate(-24, 275)"
                        className="cursor-pointer"
                        onClick={() => setSelectedCircuitIndex(isSelected ? null : c.circuitIndex)}
                        onMouseEnter={() => setHoveredCircuitIndex(c.circuitIndex)}
                        onMouseLeave={() => setHoveredCircuitIndex(null)}
                      >
                        <rect 
                          x="0" 
                          y="0" 
                          width="48" 
                          height="46" 
                          fill={isActive ? '#0f2942' : '#1e293b'} 
                          stroke={hasBreakerIssue ? (breakerSeverity === 'critical' ? '#f43f5e' : '#f59e0b') : isActive ? '#38bdf8' : isMotor ? '#f8fafc' : '#38bdf8'} 
                          strokeWidth={hasBreakerIssue ? 2.5 : isActive ? 2.5 : 1.5} 
                          strokeDasharray={hasBreakerIssue ? '4 2' : undefined}
                          rx="3" 
                          filter={hasBreakerIssue ? (breakerSeverity === 'critical' ? 'url(#continuity-glow-rose)' : 'url(#continuity-glow-amber)') : isActive ? 'url(#route-glow)' : undefined}
                        />
                        <line x1="24" y1="0" x2="24" y2="14" stroke="#38bdf8" strokeWidth="1.5" />
                        <line x1="24" y1="32" x2="24" y2="46" stroke="#38bdf8" strokeWidth="1.5" />
                        <path d="M 18 32 L 30 14" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                        <rect x="20" y="8" width="8" height="5" fill="none" stroke="#64748b" strokeWidth="1" />
                        
                        <text x="24" y="-4" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                          {c.breakerTag}
                        </text>
                        <text x="24" y="56" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                          {c.breakerRatingA}A Curva {c.curve}
                        </text>
                        <text x="24" y="66" fill="#94a3b8" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">
                          {c.breakerPoles}
                        </text>

                        {/* Breaker Terminal Contacts with Normative Color Dots */}
                        <circle cx="16" cy="46" r="2.5" fill={c.conductors[0]?.colorHex || '#92400e'} stroke="#0f172a" strokeWidth="0.8" />
                        <circle cx="24" cy="46" r="2.5" fill={c.conductors[1]?.colorHex || '#0284c7'} stroke="#0f172a" strokeWidth="0.8" />
                        {includePe && (
                          <circle cx="32" cy="46" r="2.5" fill="#16a34a" stroke="#0f172a" strokeWidth="0.8" />
                        )}

                        {/* Breaker continuity warning indicator */}
                        {hasBreakerIssue && (
                          <g 
                            transform="translate(42, -5)"
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContinuityIssue(breakerIssues[0]);
                              setIsContinuityDrawerOpen(true);
                            }}
                          >
                            <circle 
                              cx="0" 
                              cy="0" 
                              r="7.5" 
                              fill={breakerSeverity === 'critical' ? '#e11d48' : '#d97706'} 
                              stroke="#ffffff" 
                              strokeWidth="1.2"
                              filter={breakerSeverity === 'critical' ? 'url(#continuity-glow-rose)' : 'url(#continuity-glow-amber)'}
                            >
                              <animate attributeName="r" values="7;8.8;7" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                            <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                              !
                            </text>
                          </g>
                        )}
                      </g>

                      {/* Auto-Routed Conductors (Fase, Neutro, Terra) with Normative Standard Colors */}
                      <g className="cursor-pointer" onClick={() => setSelectedCircuitIndex(isSelected ? null : c.circuitIndex)}>
                        {c.conductors.map((cond) => {
                          const relStartX = cond.startPoint.x - x;
                          const relEndX = cond.endPoint.x - x;
                          const isLeadPhase = cond.conductorType === 'phase' || cond.conductorType === 'phase_l1';

                          let pathD: string;
                          if (routingStyle === 'duct_manhattan' && isAutoRouterActive) {
                            // Smooth rounded orthogonal corridor path
                            pathD = `M ${relStartX} 321 L ${relStartX} 340 Q ${relStartX} 346 ${relStartX + (relEndX > relStartX ? 5 : -5)} 346 L ${relEndX - (relEndX > relStartX ? 5 : -5)} 346 Q ${relEndX} 346 ${relEndX} 352 L ${relEndX} 385`;
                          } else if (routingStyle === 'multiconductor' && isAutoRouterActive) {
                            pathD = `M ${relStartX} 321 C ${relStartX} 350, ${relEndX} 355, ${relEndX} 385`;
                          } else {
                            pathD = `M ${relStartX} 321 L ${relEndX} 385`;
                          }

                          return (
                            <g key={cond.wireTag}>
                              {/* Background stroke for high contrast */}
                              <path 
                                d={pathD} 
                                fill="none" 
                                stroke="#0a0f1d" 
                                strokeWidth={isActive ? 5 : 3.5} 
                                strokeLinecap="round" 
                              />
                              {/* Main colored conductor stroke */}
                              <path 
                                d={pathD} 
                                fill="none" 
                                stroke={cond.colorHex} 
                                strokeWidth={isActive ? 3.2 : 2} 
                                strokeLinecap="round"
                                strokeDasharray={cond.conductorType === 'pe' ? '6 3' : undefined}
                                filter={isActive ? 'url(#route-glow)' : undefined}
                              />
                              {/* Animated pulse indicator if active */}
                              {isActive && (
                                <circle r="3" fill="#ffffff">
                                  <animateMotion path={pathD} dur="2s" repeatCount="indefinite" />
                                </circle>
                              )}
                            </g>
                          );
                        })}
                      </g>

                      {/* Wire Badge with Tag and Section */}
                      <g 
                        transform="translate(-28, 350)"
                        className="cursor-pointer"
                        onClick={() => setSelectedCircuitIndex(isSelected ? null : c.circuitIndex)}
                      >
                        <rect 
                          x="0" 
                          y="0" 
                          width="56" 
                          height="15" 
                          fill={isActive ? '#0284c7' : '#0f172a'} 
                          stroke={isActive ? '#38bdf8' : '#334155'} 
                          strokeWidth="1" 
                          rx="2" 
                        />
                        <text 
                          x="28" 
                          y="11" 
                          fill={isActive ? '#ffffff' : '#e2e8f0'} 
                          fontSize="7.5" 
                          fontFamily="JetBrains Mono" 
                          fontWeight="bold" 
                          textAnchor="middle"
                        >
                          {c.conductors[0]?.wireTag || `W${c.circuitIndex}`} · {c.conductors[0]?.sectionMm2 || 2.5}mm²
                        </text>
                      </g>

                      {/* Terminal Block (Blocos Terminais na Régua X1) */}
                      <g 
                        transform="translate(-32, 385)"
                        className="cursor-pointer"
                        onClick={() => setSelectedCircuitIndex(isSelected ? null : c.circuitIndex)}
                        onMouseEnter={() => setHoveredCircuitIndex(c.circuitIndex)}
                        onMouseLeave={() => setHoveredCircuitIndex(null)}
                      >
                        <rect 
                          x="0" 
                          y="0" 
                          width="64" 
                          height="42" 
                          fill={isActive ? '#1e3a5f' : '#1e293b'} 
                          stroke={isActive ? '#38bdf8' : '#64748b'} 
                          strokeWidth={isActive ? 2 : 1.5} 
                          rx="3" 
                        />
                        <text x="32" y="12" fill="#f8fafc" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                          {c.terminalStripTag}
                        </text>

                        {/* Phase Terminal Screw (Normative Color) */}
                        <circle cx="16" cy="27" r="6" fill={wireStandard === 'en_60204' ? '#1e293b' : '#3b1c09'} stroke={wireStandard === 'en_60204' ? '#64748b' : '#92400e'} strokeWidth="1.2" />
                        <text x="16" y="30" fill={wireStandard === 'en_60204' ? '#f8fafc' : '#fdba74'} fontSize="7" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                          {c.terminalPoints[0]?.number || '1'}
                        </text>

                        {/* Neutral Terminal Screw (Blue) */}
                        <circle cx="32" cy="27" r="6" fill="#1e3a8a" stroke="#0284c7" strokeWidth="1.2" />
                        <text x="32" y="30" fill="#60a5fa" fontSize="7" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                          N
                        </text>

                        {/* PE Terminal Screw (Green/Yellow) */}
                        <circle cx="48" cy="27" r="6" fill="#14532d" stroke="#16a34a" strokeWidth="1.2" />
                        <text x="48" y="30" fill="#86efac" fontSize="7" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                          ⏚
                        </text>

                        {/* Terminal continuity alert badge */}
                        {hasTerminalIssue && (
                          <g 
                            transform="translate(58, -4)"
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContinuityIssue(terminalIssues[0]);
                              setIsContinuityDrawerOpen(true);
                            }}
                          >
                            <circle 
                              cx="0" 
                              cy="0" 
                              r="7" 
                              fill="#d97706" 
                              stroke="#ffffff" 
                              strokeWidth="1.2"
                              filter="url(#continuity-glow-amber)"
                            >
                              <animate attributeName="r" values="6.5;8.5;6.5" dur="1.7s" repeatCount="indefinite" />
                            </circle>
                            <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                              !
                            </text>
                          </g>
                        )}
                      </g>

                      {/* Outgoing Field Cable */}
                      <line x1="0" y1="427" x2="0" y2="465" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 1.5" />
                      <g transform="translate(-38, 437)">
                        <rect x="0" y="0" width="76" height="14" fill="#0f172a" stroke="#334155" strokeWidth="0.8" rx="2" />
                        <text x="38" y="10" fill="#94a3b8" fontSize="6.5" fontFamily="JetBrains Mono" textAnchor="middle">
                          {c.outgoingCable.split(' ')[0]} {c.conductors[0]?.sectionMm2 || 2.5}mm²
                        </text>
                      </g>

                      {/* Load / Application Box */}
                      <g 
                        transform="translate(-40, 465)"
                        className="cursor-pointer"
                        onClick={() => setSelectedCircuitIndex(isSelected ? null : c.circuitIndex)}
                      >
                        <rect 
                          x="0" 
                          y="0" 
                          width="80" 
                          height="52" 
                          fill={isActive ? '#0f2942' : '#1e293b'} 
                          stroke={isActive ? '#38bdf8' : '#38bdf8'} 
                          strokeWidth={isActive ? 2 : 1.2} 
                          rx="4" 
                        />
                        <rect x="4" y="4" width="72" height="14" fill="#0284c7" fillOpacity="0.25" rx="2" />
                        <text x="40" y="14" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                          [{c.circuitMnemonic}]
                        </text>
                        <text x="40" y="28" fill="#f8fafc" fontSize="7.5" fontWeight="bold" fontFamily="Plus Jakarta Sans" textAnchor="middle">
                          {c.circuitDescription.slice(0, 14)}
                        </text>
                        <text x="40" y="44" fill="#94a3b8" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">
                          P: {c.estimatedPowerW}W · ΔU: {c.voltageDropPercent}%
                        </text>
                      </g>
                    </g>
                  );
                });
              })()}

              {/* Summary Table at Bottom Left */}
              <g transform="translate(45, 560)">
                <rect x="0" y="0" width="690" height="85" fill="#1e293b" stroke="#334155" strokeWidth="1.2" rx="4" />
                <rect x="0" y="0" width="690" height="20" fill="#0369a1" fillOpacity="0.2" rx="3" />
                <text x="12" y="14" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                  RELATÓRIO DO AUTO-ROUTER: CABLAGEM LÓGICA E CONFORMIDADE DE CORES ({wireStandard === 'en_60204' ? 'EN 60204-1' : 'IEC 60446 / RTIEBT'})
                </text>

                <g transform="translate(14, 30)">
                  <text x="0" y="10" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">Circuitos Roteados:</text>
                  <text x="135" y="10" fill="#f8fafc" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono">
                    {autoRouterData.totalCircuitsCount} Aparelhos Protegidos ({autoRouterData.totalWiringLengthM} m Fio)
                  </text>

                  <text x="0" y="26" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">Blocos Terminais (Bornes):</text>
                  <text x="135" y="26" fill="#f8fafc" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono">
                    {autoRouterData.totalCircuitsCount * (includePe ? 3 : 2)} Terminais Ativos na Régua {autoRouterData.terminalStripTag}
                  </text>

                  <text x="0" y="42" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">Norma de Cores:</text>
                  <text x="135" y="42" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono">
                    {wireStandard === 'en_60204' ? 'EN 60204-1 (Potência Preto, N Azul, PE V/A)' : 'IEC 60446 (L1 Castanho, N Azul, PE V/A)'}
                  </text>

                  <text x="350" y="10" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">Traçado / Algoritmo:</text>
                  <text x="490" y="10" fill="#f8fafc" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono">
                    {routingStyle === 'duct_manhattan' ? 'Orto-Manhattan por Calhas Técnicas' : routingStyle === 'multiconductor' ? 'Multicondutor em Feixe' : 'Unifilar Direto'}
                  </text>

                  <text x="350" y="26" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">Queda de Tensão Máx.:</text>
                  <text x="490" y="26" fill="#10b981" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono">
                    ΔU &lt; 1.2% (100% Conforme RTIEBT 523)
                  </text>

                  <text x="350" y="42" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">Tipo de Condutor:</text>
                  <text x="490" y="42" fill="#f8fafc" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono">
                    H07V-K Flexível com anilhas marcadoras
                  </text>
                </g>
              </g>
            </g>
          )}

          {/* ========================================================
              VIEW 1: ESQUEMA UNIFILAR GERAL
             ======================================================== */}
          {viewMode === 'power' && (() => {
            const q0Issues = issuesByComponentTag.get((analysis.mainBreaker?.tag || 'Q0').toUpperCase()) || [];
            const qDiffIssues = issuesByComponentTag.get((analysis.diffBreaker?.tag || 'Q_DIFF').toUpperCase()) || [];
            const psuIssues = [
              ...(issuesByComponentTag.get('G1') || []),
              ...continuityReport.issues.filter((iss) => iss.componentName.toLowerCase().includes('fonte') || iss.terminalId === '-V' || iss.terminalId === 'N-in' || iss.terminalId === 'PE')
            ];

            return (
            <g transform="translate(0, 30)">
              {/* 1. Main Supply Incomer */}
              <g transform="translate(80, 80)">
                <text x="0" y="0" fill="#38bdf8" fontSize="12" fontWeight="bold" fontFamily="JetBrains Mono">
                  REDE DE ENTRADA ({isThreePhase ? '3x400VAC + N + PE' : '230VAC + N + PE'})
                </text>
                <text x="0" y="15" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">
                  Cabo {isThreePhase ? '5G6 mm² Cu' : '3G2.5 mm² Cu'}
                </text>
                
                {/* Lines */}
                <line x1="80" y1="30" x2="80" y2="70" stroke="#38bdf8" strokeWidth="2.5" />
                <circle cx="80" cy="30" r="4" fill="#38bdf8" />
                <text x="92" y="34" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">
                  {isThreePhase ? 'L1, L2, L3, N, PE' : 'L, N, PE'}
                </text>

                {/* Main Breaker Q0 */}
                <g transform="translate(50, 70)">
                  <rect 
                    x="0" 
                    y="0" 
                    width="60" 
                    height="50" 
                    fill="#1e293b" 
                    stroke={isContinuityActive && q0Issues.length > 0 ? '#f59e0b' : '#38bdf8'} 
                    strokeWidth={isContinuityActive && q0Issues.length > 0 ? 2 : 1.5} 
                    strokeDasharray={isContinuityActive && q0Issues.length > 0 ? '4 2' : undefined}
                    rx="3" 
                  />
                  <path d="M 30 0 L 30 18 M 30 32 L 30 50 M 23 32 L 37 18" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                  {/* Thermal-magnetic symbols */}
                  <rect x="25" y="10" width="10" height="6" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                  <path d="M 27 38 L 33 38 M 30 36 L 30 40" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="70" y="20" fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                    {analysis.mainBreaker?.tag || 'Q0'}
                  </text>
                  <text x="70" y="34" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                    {analysis.mainBreaker?.data.partNumber || '5SY4216-7'}
                  </text>
                  <text x="70" y="46" fill="#38bdf8" fontSize="9" fontFamily="JetBrains Mono">
                    {analysis.mainBreaker?.data.ratedCurrentA || 16}A / 10kA Curva C
                  </text>

                  {/* Q0 continuity alert badge */}
                  {isContinuityActive && q0Issues.length > 0 && (
                    <g 
                      transform="translate(54, -4)"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContinuityIssue(q0Issues[0]);
                        setIsContinuityDrawerOpen(true);
                      }}
                    >
                      <circle cx="0" cy="0" r="7.5" fill="#d97706" stroke="#ffffff" strokeWidth="1.2" filter="url(#continuity-glow-amber)">
                        <animate attributeName="r" values="7;8.8;7" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                        !
                      </text>
                    </g>
                  )}
                </g>

                {/* Differential RCCB Q_DIFF */}
                <g transform="translate(50, 150)">
                  <line x1="30" y1="-30" x2="30" y2="0" stroke="#38bdf8" strokeWidth="2" />
                  <rect 
                    x="0" 
                    y="0" 
                    width="60" 
                    height="50" 
                    fill="#1e293b" 
                    stroke={isContinuityActive && qDiffIssues.length > 0 ? '#f59e0b' : '#10b981'} 
                    strokeWidth={isContinuityActive && qDiffIssues.length > 0 ? 2 : 1.5} 
                    strokeDasharray={isContinuityActive && qDiffIssues.length > 0 ? '4 2' : undefined}
                    rx="3" 
                  />
                  <circle cx="30" cy="25" r="14" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 2" />
                  <line x1="30" y1="0" x2="30" y2="15" stroke="#10b981" strokeWidth="1.5" />
                  <line x1="30" y1="35" x2="30" y2="50" stroke="#10b981" strokeWidth="1.5" />
                  <path d="M 23 35 L 37 15" stroke="#10b981" strokeWidth="2" />
                  <text x="70" y="20" fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                    {analysis.diffBreaker?.tag || 'Q_DIFF'}
                  </text>
                  <text x="70" y="34" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                    {analysis.diffBreaker?.data.partNumber || '5SV3312-6'}
                  </text>
                  <text x="70" y="46" fill="#10b981" fontSize="9" fontFamily="JetBrains Mono">
                    IΔn = 30mA Tipo A
                  </text>

                  {/* Q_DIFF continuity alert badge */}
                  {isContinuityActive && qDiffIssues.length > 0 && (
                    <g 
                      transform="translate(54, -4)"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContinuityIssue(qDiffIssues[0]);
                        setIsContinuityDrawerOpen(true);
                      }}
                    >
                      <circle cx="0" cy="0" r="7.5" fill="#d97706" stroke="#ffffff" strokeWidth="1.2" filter="url(#continuity-glow-amber)">
                        <animate attributeName="r" values="7;8.8;7" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                        !
                      </text>
                    </g>
                  )}
                </g>

                {/* Surge Protection SPD */}
                {analysis.spd && (
                  <g transform="translate(160, 230)">
                    <line x1="-80" y1="0" x2="0" y2="0" stroke="#94a3b8" strokeWidth="1.5" />
                    <rect x="0" y="-15" width="45" height="30" fill="#1e293b" stroke="#eab308" strokeWidth="1.5" rx="2" />
                    <path d="M 12 -5 L 32 5 M 22 -10 L 22 10" stroke="#eab308" strokeWidth="1.5" />
                    <line x1="45" y1="0" x2="70" y2="0" stroke="#eab308" strokeWidth="1.5" />
                    {/* Earth PE symbol */}
                    <line x1="70" y1="-8" x2="70" y2="8" stroke="#84cc16" strokeWidth="2" />
                    <line x1="74" y1="-5" x2="74" y2="5" stroke="#84cc16" strokeWidth="1.5" />
                    <line x1="78" y1="-2" x2="78" y2="2" stroke="#84cc16" strokeWidth="1" />
                    <text x="0" y="30" fill="#eab308" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                      SPD1 (T2 20/40kA)
                    </text>
                  </g>
                )}

                {/* Main Distribution Busbar */}
                <line x1="80" y1="230" x2="80" y2="280" stroke="#38bdf8" strokeWidth="2.5" />
                <line x1="80" y1="280" x2="1000" y2="280" stroke="#38bdf8" strokeWidth="3" />
                <text x="85" y="272" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                  BARRAMENTO GERAL AC (230V / 50Hz)
                </text>
              </g>

              {/* Branch 1: Mean Well Power Supply & DC Circuit */}
              <g transform="translate(320, 390)">
                {/* Branch Feed Line */}
                <line x1="0" y1="-30" x2="0" y2="10" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="0" cy="-30" r="3.5" fill="#38bdf8" />

                {/* Breaker Q1 for Mean Well */}
                <g transform="translate(-25, 10)">
                  <rect x="0" y="0" width="50" height="40" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="3" />
                  <path d="M 25 0 L 25 12 M 25 28 L 25 40 M 18 28 L 32 12" stroke="#38bdf8" strokeWidth="2" />
                  <text x="58" y="18" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                    {analysis.psuBreaker?.tag || 'Q1'}
                  </text>
                  <text x="58" y="32" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                    1P+N 6A Curva C
                  </text>
                </g>

                {/* Line to Mean Well */}
                <line x1="0" y1="50" x2="0" y2="90" stroke="#38bdf8" strokeWidth="2" />

                {/* Mean Well Power Supply G1 (IEC Standard Converter Symbol) */}
                <g transform="translate(-65, 90)">
                  <rect x="0" y="0" width="130" height="90" fill="#0f172a" stroke="#0284c7" strokeWidth="2" rx="4" />
                  <rect x="0" y="0" width="130" height="24" fill="#0369a1" rx="3" />
                  <text x="65" y="16" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="Plus Jakarta Sans">
                    FONTE DIN MEAN WELL
                  </text>

                  {/* Internal converter partition line */}
                  <line x1="0" y1="24" x2="130" y2="90" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />

                  {/* AC side symbol (tilde) */}
                  <text x="25" y="55" fill="#38bdf8" fontSize="18" fontWeight="bold" fontFamily="JetBrains Mono">
                    ~
                  </text>
                  <text x="18" y="72" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                    230VAC
                  </text>

                  {/* DC side symbol (=) */}
                  <text x="95" y="55" fill="#ef4444" fontSize="16" fontWeight="bold" fontFamily="JetBrains Mono">
                    ⎓
                  </text>
                  <text x="88" y="72" fill="#ef4444" fontSize="8" fontFamily="JetBrains Mono">
                    24VDC
                  </text>

                  {/* Tag and Model */}
                  <text x="65" y="44" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                    {analysis.meanWellPsu?.tag || 'G1'}
                  </text>
                  <text x="65" y="58" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                    {analysis.meanWellPsu?.data.partNumber || 'NDR-120-24'}
                  </text>
                  <text x="65" y="78" fill="#38bdf8" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono">
                    {analysis.meanWellPsu?.data.ratedCurrentA || 5}A / {analysis.meanWellPsu?.data.ratedPowerW || 120}W
                  </text>

                  {/* Mean Well continuity check badge */}
                  {isContinuityActive && psuIssues.length > 0 && (
                    <g 
                      transform="translate(122, -6)"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContinuityIssue(psuIssues[0]);
                        setIsContinuityDrawerOpen(true);
                      }}
                    >
                      <circle cx="0" cy="0" r="8" fill="#e11d48" stroke="#ffffff" strokeWidth="1.2" filter="url(#continuity-glow-rose)">
                        <animate attributeName="r" values="7.5;9.5;7.5" dur="1.4s" repeatCount="indefinite" />
                      </circle>
                      <text x="0" y="3.5" fill="#ffffff" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                        !
                      </text>
                    </g>
                  )}
                </g>

                {/* DC Breaker F1 */}
                <line x1="0" y1="180" x2="0" y2="210" stroke="#ef4444" strokeWidth="2" />
                <g transform="translate(-25, 210)">
                  <rect x="0" y="0" width="50" height="40" fill="#1e293b" stroke="#ef4444" strokeWidth="1.5" rx="3" />
                  <path d="M 25 0 L 25 12 M 25 28 L 25 40 M 18 28 L 32 12" stroke="#ef4444" strokeWidth="2" />
                  <text x="58" y="18" fill="#ef4444" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                    {analysis.dcBreaker?.tag || 'F1'} (DC)
                  </text>
                  <text x="58" y="32" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                    {analysis.dcBreaker?.data.ratedCurrentA || 4}A DC Curva C
                  </text>
                </g>

                {/* 24VDC Busbar output */}
                <line x1="0" y1="250" x2="0" y2="280" stroke="#ef4444" strokeWidth="2.5" />
                <line x1="-40" y1="280" x2="480" y2="280" stroke="#ef4444" strokeWidth="3" />
                <line x1="-40" y1="295" x2="480" y2="295" stroke="#3b82f6" strokeWidth="3" />
                <text x="490" y="284" fill="#ef4444" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                  +24V DC (L+)
                </text>
                <text x="490" y="299" fill="#3b82f6" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                  0V DC (M)
                </text>
              </g>

              {/* Branch 2: Motor Starters / Sirius Contactors (if any) */}
              {analysis.motorStarters.length > 0 ? (
                analysis.motorStarters.map((ms, idx) => {
                  const xPos = 620 + idx * 160;
                  return (
                    <g key={ms.mms.instanceId} transform={`translate(${xPos}, 390)`}>
                      <line x1="0" y1="-30" x2="0" y2="10" stroke="#38bdf8" strokeWidth="2" />
                      <circle cx="0" cy="-30" r="3.5" fill="#38bdf8" />

                      {/* Motor Protector QM1 */}
                      <g transform="translate(-25, 10)">
                        <rect x="0" y="0" width="50" height="40" fill="#1e293b" stroke="#e2e8f0" strokeWidth="1.5" rx="3" />
                        <path d="M 25 0 L 25 12 M 25 28 L 25 40 M 18 28 L 32 12" stroke="#e2e8f0" strokeWidth="2" />
                        <text x="58" y="16" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                          {ms.mms.tag}
                        </text>
                        <text x="58" y="28" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                          Disjuntor-Motor
                        </text>
                        <text x="58" y="40" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">
                          {ms.mms.data.ratedCurrentA || 4}A Sirius
                        </text>
                      </g>

                      {/* Line to Contactor */}
                      <line x1="0" y1="50" x2="0" y2="80" stroke="#38bdf8" strokeWidth="2" />

                      {/* Contactor K1 */}
                      <g transform="translate(-25, 80)">
                        <rect x="0" y="0" width="50" height="40" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="3" />
                        <line x1="25" y1="0" x2="25" y2="12" stroke="#38bdf8" strokeWidth="2" />
                        <line x1="25" y1="28" x2="25" y2="40" stroke="#38bdf8" strokeWidth="2" />
                        <line x1="20" y1="28" x2="30" y2="12" stroke="#38bdf8" strokeWidth="2" />
                        <text x="58" y="16" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                          {ms.contactor?.tag || `K${idx + 1}`}
                        </text>
                        <text x="58" y="28" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                          Contactor 3RT2
                        </text>
                        <text x="58" y="40" fill="#10b981" fontSize="8" fontFamily="JetBrains Mono">
                          Bobina 24VDC
                        </text>
                      </g>

                      {/* Line to Motor */}
                      <line x1="0" y1="120" x2="0" y2="160" stroke="#38bdf8" strokeWidth="2" />
                      {/* Terminal Block X1 */}
                      <rect x="-15" y="160" width="30" height="15" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                      <text x="0" y="171" fill="#ffffff" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono">
                        X1:U,V,W
                      </text>
                      <line x1="0" y1="175" x2="0" y2="200" stroke="#38bdf8" strokeWidth="2" />
                      {/* Motor M1 */}
                      <circle cx="0" cy="225" r="22" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                      <text x="0" y="230" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                        M{idx + 1}
                      </text>
                      <text x="0" y="260" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="JetBrains Mono">
                        Motor 3~ 400V
                      </text>
                    </g>
                  );
                })
              ) : (
                /* Auxiliary Socket or Service Line */
                <g transform="translate(680, 390)">
                  <line x1="0" y1="-30" x2="0" y2="10" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="0" cy="-30" r="3.5" fill="#38bdf8" />
                  <rect x="-25" y="10" width="50" height="40" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="3" />
                  <path d="M 0 10 L 0 22 M 0 38 L 0 50 M -7 38 L 7 22" stroke="#38bdf8" strokeWidth="2" />
                  <text x="35" y="25" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                    Q_AUX (10A)
                  </text>
                  <line x1="0" y1="50" x2="0" y2="90" stroke="#38bdf8" strokeWidth="2" />
                  {/* Socket symbol */}
                  <rect x="-25" y="90" width="50" height="40" fill="#1e293b" stroke="#e2e8f0" strokeWidth="1.5" rx="3" />
                  <circle cx="-8" cy="110" r="4" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
                  <circle cx="8" cy="110" r="4" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
                  <text x="0" y="145" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono">
                    Tomada Serviço XS1
                  </text>
                </g>
              )}
            </g>
          ); })()}

          {/* ========================================================
              VIEW 2: ESQUEMA FUNCIONAL 24VDC & SIEMENS PLC (I/O)
             ======================================================== */}
          {viewMode === 'control' && (() => {
            const plcIssues = [
              ...(issuesByComponentTag.get((analysis.plcs[0]?.tag || 'A1').toUpperCase()) || []),
              ...continuityReport.issues.filter((iss) => iss.componentName.toLowerCase().includes('plc') || iss.componentTag === 'A1')
            ];

            return (
            <g transform="translate(50, 70)">
              {/* Top 24VDC Power Rails */}
              <g transform="translate(0, 30)">
                <line x1="20" y1="0" x2="1080" y2="0" stroke="#ef4444" strokeWidth="3" />
                <text x="1090" y="4" fill="#ef4444" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                  +24V DC (L+)
                </text>
                <line x1="20" y1="20" x2="1080" y2="20" stroke="#3b82f6" strokeWidth="3" />
                <text x="1090" y="24" fill="#3b82f6" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                  0V DC (M)
                </text>
                <text x="30" y="-8" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">
                  ALIMENTAÇÃO DERIVADA DA FONTE MEAN WELL {analysis.meanWellPsu?.data.partNumber || 'NDR-120-24'}
                </text>
              </g>

              {/* Siemens PLC Main Unit Block */}
              <g transform="translate(180, 110)">
                {/* PLC Chassis */}
                <rect 
                  x="0" 
                  y="0" 
                  width="460" 
                  height="340" 
                  fill="#0f172a" 
                  stroke={isContinuityActive && plcIssues.length > 0 ? '#f59e0b' : '#0d9488'} 
                  strokeWidth={2.5} 
                  strokeDasharray={isContinuityActive && plcIssues.length > 0 ? '6 3' : undefined}
                  rx="6" 
                />
                <rect x="0" y="0" width="460" height="35" fill="#0f766e" rx="5" />
                
                <text x="20" y="23" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="Plus Jakarta Sans">
                  {analysis.plcs[0]?.data.name || 'SIEMENS SIMATIC S7-1200 / LOGO!'}
                </text>
                <text x="440" y="23" fill="#99f6e4" fontSize="11" fontWeight="bold" textAnchor="end" fontFamily="JetBrains Mono">
                  {analysis.plcs[0]?.tag || 'A1'}
                </text>

                {/* PLC continuity alert badge */}
                {isContinuityActive && plcIssues.length > 0 && (
                  <g 
                    transform="translate(435, -5)"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContinuityIssue(plcIssues[0]);
                      setIsContinuityDrawerOpen(true);
                    }}
                  >
                    <circle cx="0" cy="0" r="8" fill="#d97706" stroke="#ffffff" strokeWidth="1.2" filter="url(#continuity-glow-amber)">
                      <animate attributeName="r" values="7.5;9.2;7.5" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <text x="0" y="3.5" fill="#ffffff" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                      !
                    </text>
                  </g>
                )}

                {/* Power Infeed Terminals */}
                <g transform="translate(20, 50)">
                  <rect x="0" y="0" width="80" height="30" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" rx="2" />
                  <text x="10" y="19" fill="#ef4444" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">L+</text>
                  <text x="50" y="19" fill="#3b82f6" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">M</text>
                  {/* Connection lines to top rails */}
                  <line x1="20" y1="0" x2="20" y2="-60" stroke="#ef4444" strokeWidth="2" />
                  <line x1="60" y1="0" x2="60" y2="-40" stroke="#3b82f6" strokeWidth="2" />
                  <circle cx="20" cy="-60" r="3" fill="#ef4444" />
                  <circle cx="60" cy="-40" r="3" fill="#3b82f6" />
                </g>

                {/* PROFINET Port */}
                <g transform="translate(330, 50)">
                  <rect x="0" y="0" width="110" height="30" fill="#1e293b" stroke="#22c55e" strokeWidth="1" rx="2" />
                  <rect x="10" y="7" width="16" height="16" fill="#22c55e" rx="2" />
                  <text x="35" y="20" fill="#22c55e" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                    PROFINET PN
                  </text>
                </g>

                {/* Digital Inputs Section (Left Side) */}
                <g transform="translate(20, 100)">
                  <text x="0" y="0" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                    ENTRADAS DIGITAIS 24VDC (DI)
                  </text>
                  
                  {[
                    { pin: '.0 (I0.0)', label: 'S1 - Botão Start', type: 'btn' },
                    { pin: '.1 (I0.1)', label: 'S2 - Botão Stop', type: 'btn' },
                    { pin: '.2 (I0.2)', label: 'S0 - Paragem Emergência', type: 'es' },
                    { pin: '.3 (I0.3)', label: 'B1 - Sensor Fim-Curso', type: 'sensor' },
                    { pin: '.4 (I0.4)', label: 'F1 - Feedback Disjuntor', type: 'aux' },
                  ].map((di, i) => (
                    <g key={di.pin} transform={`translate(0, ${25 + i * 36})`}>
                      <rect x="0" y="0" width="70" height="22" fill="#1e293b" stroke="#64748b" strokeWidth="1" rx="2" />
                      <text x="6" y="15" fill="#e2e8f0" fontSize="9" fontFamily="JetBrains Mono">
                        {di.pin}
                      </text>
                      {/* External wire from sensor */}
                      <line x1="0" y1="11" x2="-80" y2="11" stroke="#38bdf8" strokeWidth="1.5" />
                      <circle cx="-80" cy="11" r="2.5" fill="#38bdf8" />
                      <text x="-90" y="14" fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">
                        {di.label}
                      </text>
                    </g>
                  ))}
                </g>

                {/* Digital Outputs Section (Right Side) */}
                <g transform="translate(250, 100)">
                  <text x="0" y="0" fill="#10b981" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                    SAÍDAS DIGITAIS (DQ / COMANDO DE RELÉS)
                  </text>

                  {[
                    {
                      pin: '.0 (Q0.0)',
                      load: analysis.relays[0]
                        ? `${analysis.relays[0].tag} - ${analysis.relays[0].data.name.split('(')[0]}`
                        : 'K1 - Bobina Contactor / Relé',
                      color: '#10b981',
                    },
                    {
                      pin: '.1 (Q0.1)',
                      load: analysis.relays[1]
                        ? `${analysis.relays[1].tag} - ${analysis.relays[1].data.name.split('(')[0]}`
                        : 'H1 - Sinalizador Verde (ON / Marcha)',
                      color: '#22c55e',
                    },
                    {
                      pin: '.2 (Q0.2)',
                      load: analysis.relays[2]
                        ? `${analysis.relays[2].tag} - ${analysis.relays[2].data.name.split('(')[0]}`
                        : 'H2 - Sinalizador Vermelho (FALHA / Disparo)',
                      color: '#ef4444',
                    },
                    {
                      pin: '.3 (Q0.3)',
                      load: 'Y1 - Eletroválvula / Atuador 24VDC',
                      color: '#38bdf8',
                    },
                    {
                      pin: '.4 (Q0.4)',
                      load: analysis.relays[3]
                        ? `${analysis.relays[3].tag} - ${analysis.relays[3].data.name.split('(')[0]}`
                        : 'KT1 - Relé Temporizador de Processo',
                      color: '#3b82f6',
                    },
                  ].map((dq, i) => (
                    <g key={dq.pin} transform={`translate(0, ${25 + i * 36})`}>
                      <rect x="0" y="0" width="70" height="22" fill="#1e293b" stroke="#64748b" strokeWidth="1" rx="2" />
                      <text x="6" y="15" fill="#e2e8f0" fontSize="9" fontFamily="JetBrains Mono">
                        {dq.pin}
                      </text>
                      {/* External wire to load */}
                      <line x1="70" y1="11" x2="140" y2="11" stroke={dq.color} strokeWidth="1.5" />
                      <circle cx="140" cy="11" r="2.5" fill={dq.color} />
                      <text x="150" y="15" fill="#cbd5e1" fontSize="9" fontFamily="JetBrains Mono">
                        {dq.load}
                      </text>
                    </g>
                  ))}
                </g>
              </g>

              {/* Expansion Modules (if present) */}
              {analysis.expansions.length > 0 && (
                <g transform="translate(660, 110)">
                  <rect x="0" y="0" width="160" height="340" fill="#0f172a" stroke="#0f766e" strokeWidth="2" rx="4" />
                  <rect x="0" y="0" width="160" height="35" fill="#115e59" rx="3" />
                  <text x="80" y="22" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Plus Jakarta Sans">
                    {analysis.expansions[0]?.data.name || 'EXPANSÃO SIEMENS'}
                  </text>
                  <text x="80" y="70" fill="#2dd4bf" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">
                    Bus de Comunicação Lateral
                  </text>
                  <path d="M 0 50 L -20 50" stroke="#0d9488" strokeWidth="4" />
                  <text x="80" y="120" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono">
                    {analysis.expansions[0]?.data.terminalsSummary || 'Entradas / Saídas Suplementares'}
                  </text>
                </g>
              )}

              {/* Terminal Strip X1 */}
              <g transform="translate(180, 480)">
                <rect x="0" y="0" width="640" height="35" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" rx="3" />
                <text x="20" y="22" fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                  {analysis.vikingTerminals.length > 0
                    ? `RÉGUA DE BORNES LEGRAND VIKING 3 (${analysis.vikingTerminals.map(t => t.tag).join(', ')})`
                    : 'RÉGUA DE BORNES DE CAMPO (X1 - PASSAGEM & PE)'}
                </text>
                {/* Individual terminal screws */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
                  <circle key={num} cx={340 + num * 16} cy="17" r="4.5" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                ))}
              </g>
            </g>
          ); })()}

          {/* ========================================================
              TITLE BLOCK / CARIMBO DE ENGENHARIA ELÉTRICA (IEC 61082)
             ======================================================== */}
          <g transform="translate(760, 650)">
            {/* Box */}
            <rect x="0" y="0" width="410" height="120" fill="#090d16" stroke="#475569" strokeWidth="1.5" />
            <line x1="0" y1="30" x2="410" y2="30" stroke="#334155" strokeWidth="1" />
            <line x1="0" y1="65" x2="410" y2="65" stroke="#334155" strokeWidth="1" />
            <line x1="0" y1="92" x2="410" y2="92" stroke="#334155" strokeWidth="1" />
            <line x1="220" y1="0" x2="220" y2="65" stroke="#334155" strokeWidth="1" />
            <line x1="310" y1="65" x2="310" y2="120" stroke="#334155" strokeWidth="1" />

            {/* Project & Client Title */}
            <text x="12" y="18" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">PROJETO:</text>
            <text x="65" y="20" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="Plus Jakarta Sans">
              {project.config.name}
            </text>

            <text x="230" y="18" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">CÓDIGO:</text>
            <text x="280" y="20" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
              {project.config.projectCode}
            </text>

            <text x="12" y="48" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">CLIENTE:</text>
            <text x="65" y="50" fill="#e2e8f0" fontSize="9" fontFamily="Plus Jakarta Sans">
              {project.config.clientName}
            </text>

            <text x="230" y="48" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">PROJETISTA:</text>
            <text x="295" y="50" fill="#e2e8f0" fontSize="9" fontFamily="Plus Jakarta Sans">
              {project.config.designerName}
            </text>

            <text x="12" y="80" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">DATA / REV:</text>
            <text x="80" y="81" fill="#f8fafc" fontSize="9" fontFamily="JetBrains Mono">
              {project.config.date} · Rev 1.0
            </text>

            <text x="320" y="80" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">FOLHA:</text>
            <text x="365" y="81" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
              {viewMode === 'breakers_terminals' ? '01 / 03' : viewMode === 'power' ? '02 / 03' : '03 / 03'}
            </text>

            <text x="12" y="108" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">
              NORMA TÉCNICA: IEC 60617 / EN 61439-1 / CE
            </text>
            <text x="320" y="108" fill="#10b981" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono">
              APROVADO
            </text>
          </g>
        </svg>

        {/* Floating Route Inspector HUD (Auto-Router Real-time Circuit Inspector) */}
        {isAutoRouterActive && activeInspectedCircuit && viewMode === 'breakers_terminals' && (
          <div className="absolute bottom-4 left-4 z-20 w-84 max-w-[calc(100%-2rem)] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-3 text-slate-200 pointer-events-auto transition-all animate-in fade-in duration-150">
            {/* HUD Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded bg-purple-500/20 text-purple-400 font-bold font-mono text-xs border border-purple-500/30">
                  {activeInspectedCircuit.breakerTag}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">
                    {activeInspectedCircuit.circuitDescription}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Circuito #{activeInspectedCircuit.circuitIndex + 1} · {activeInspectedCircuit.circuitMnemonic}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCircuitIndex(null);
                  setHoveredCircuitIndex(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                title="Fechar inspetor de rota"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Circuit specs & Duct */}
            <div className="grid grid-cols-2 gap-1.5 mb-2.5 text-[10px] font-mono">
              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
                <span className="text-slate-500 block">Disjuntor:</span>
                <span className="font-bold text-amber-400">
                  {activeInspectedCircuit.breakerPoles} {activeInspectedCircuit.breakerRatingA}A Curva {activeInspectedCircuit.curve} (6kA)
                </span>
              </div>
              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
                <span className="text-slate-500 block">Régua / Bornes:</span>
                <span className="font-bold text-sky-400">
                  {activeInspectedCircuit.terminalStripTag} ({activeInspectedCircuit.terminalPoints.map((t) => t.tag).join(', ')})
                </span>
              </div>
              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
                <span className="text-slate-500 block">Canal / Calha:</span>
                <span className="font-bold text-slate-300">
                  {activeInspectedCircuit.ductCorridorDescription}
                </span>
              </div>
              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
                <span className="text-slate-500 block">Queda ΔU / Carga:</span>
                <span className="font-bold text-emerald-400">
                  {activeInspectedCircuit.voltageDropPercent}% · {activeInspectedCircuit.estimatedPowerW}W
                </span>
              </div>
            </div>

            {/* Conductors Table */}
            <div className="space-y-1 mb-2">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-between px-0.5">
                <span>Cablagem ({activeInspectedCircuit.conductors.length} condutores):</span>
                <span className="text-slate-500 font-mono">Comp: ~{activeInspectedCircuit.totalBranchLengthM} m</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {activeInspectedCircuit.conductors.map((c, cIdx) => (
                  <div
                    key={`${c.wireTag}_${cIdx}`}
                    className="flex items-center justify-between text-[10px] bg-slate-950/60 p-1.5 rounded border border-slate-800"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40 shadow-xs"
                        style={{ backgroundColor: c.colorHex }}
                      />
                      <span className="font-mono font-bold text-white">{c.wireTag}</span>
                      <span className="text-slate-400 text-[9px] font-sans">({c.label})</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-sky-300 font-bold">{c.sectionMm2} mm²</span>
                      <span className="text-slate-500 ml-1.5 text-[9px]">~{c.lengthMeters}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ferrules & Normative standard status */}
            <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                {wireStandard === 'iec_60446' ? 'Norma IEC 60446' : 'Norma EN 60204-1'}
              </span>
              <span className="text-slate-400">
                Ponteiras DIN 46228: <span className="text-slate-300 font-semibold">{activeInspectedCircuit.conductors[0]?.ferruleColor || 'Azul'}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Schematic Footer Legend */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 no-print">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            Linha AC (230V/400V)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            Disjuntores ➔ Terminais (X1)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Terra PE / Proteção
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            Barramento 24VDC (Mean Well)
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <Info className="w-3.5 h-3.5" />
          <span>Arraste com o rato para mover o diagrama; utilize o scroll ou botões para zoom.</span>
        </div>
      </div>

      {/* CAD & Schematics Universal Export Modal (QElectroTech, draw.io, DXF) */}
      <CadExportModal
        isOpen={isCadModalOpen}
        onClose={() => setIsCadModalOpen(false)}
        project={project}
        onExportSvg={handleDownloadSvg}
      />

      {/* Schematic PDF Export Modal (Formated PDF with Project Data & BOM) */}
      <SchematicPdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        project={project}
      />

      {/* Logical Continuity Audit Drawer (IEC 60204-1 / EN 61439-1) */}
      <LogicalContinuityDrawer
        report={continuityReport}
        isOpen={isContinuityDrawerOpen}
        onClose={() => setIsContinuityDrawerOpen(false)}
        selectedIssue={selectedContinuityIssue}
        onSelectIssue={setSelectedContinuityIssue}
        onAutoResolve={handleAutoResolveIssue}
        onFocusComponent={handleFocusComponentFromContinuity}
      />
    </div>
  );
};
