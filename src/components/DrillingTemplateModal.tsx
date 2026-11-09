import React, { useState, useRef, useMemo } from 'react';
import { ProjectState, ControlPanelConfig, ControlPanelDevice, CableGland } from '../types/electrical';
import { getDefaultControlPanelConfig } from '../data/controlPanelCatalog';
import { GLAND_SPECS } from '../utils/glandUtils';
import {
  X, Printer, Download, Ruler, Crosshair, Check, Eye,
  Sliders, Box, Layers, Scissors, Info, Sparkles, RefreshCw, FileText
} from 'lucide-react';

interface DrillingTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  initialPlate?: 'door' | 'glands' | 'chassis';
}

export const DrillingTemplateModal: React.FC<DrillingTemplateModalProps> = ({
  isOpen,
  onClose,
  project,
  initialPlate = 'door',
}) => {
  const [selectedPlate, setSelectedPlate] = useState<'door' | 'glands' | 'chassis'>(initialPlate);
  const [showAllMargins, setShowAllMargins] = useState<boolean>(true);
  const [showCenterCrosshairs, setShowCenterCrosshairs] = useState<boolean>(true);
  const [showGasketMargin, setShowGasketMargin] = useState<boolean>(true);
  const [showDrillTable, setShowDrillTable] = useState<boolean>(true);
  const [glandLocationTab, setGlandLocationTab] = useState<'top' | 'bottom'>('top');
  const [recentNotification, setRecentNotification] = useState<string | null>(null);

  const config = project.config;
  const controlPanel: ControlPanelConfig = project.controlPanel || getDefaultControlPanelConfig(
    config.widthMm || 600,
    config.heightMm || 800
  );

  const doorWidthMm = controlPanel.widthMm || config.widthMm || 600;
  const doorHeightMm = controlPanel.heightMm || config.heightMm || 800;
  const devices = controlPanel.devices || [];

  const glands = project.glands || [];
  const topGlands = useMemo(() => glands.filter((g) => g.location === 'top'), [glands]);
  const bottomGlands = useMemo(() => glands.filter((g) => g.location === 'bottom'), [glands]);

  // Plate dimensions depending on the selected view
  const plateWidthMm = useMemo(() => {
    if (selectedPlate === 'door') return doorWidthMm;
    if (selectedPlate === 'glands') return config.widthMm || 600;
    return (config.widthMm || 600) - 40; // Chassis
  }, [selectedPlate, doorWidthMm, config.widthMm]);

  const plateHeightMm = useMemo(() => {
    if (selectedPlate === 'door') return doorHeightMm;
    if (selectedPlate === 'glands') return Math.max(160, (config.depthMm || 250) * 0.6); // Flange depth
    return (config.heightMm || 800) - 60; // Chassis height
  }, [selectedPlate, doorHeightMm, config.heightMm, config.depthMm]);

  // Handle browser print
  const handlePrint = () => {
    window.print();
  };

  // Handle Export SVG File
  const handleDownloadSvg = () => {
    const svgElement = document.getElementById('drilling-template-svg');
    if (!svgElement) return;

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    // Add xml declaration
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Gabarito_Furacao_${selectedPlate.toUpperCase()}_${config.projectCode || 'QUADRO'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setRecentNotification('Vetor SVG 1:1 descarregado com sucesso!');
    setTimeout(() => setRecentNotification(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[96vh]">
        
        {/* ====================================================================
            1. TOP HEADER & ACTION BUTTONS
            ==================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-md font-bold">
              <Ruler className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Template & Gabarito de Furação (Desenho com Cotas para as Margens)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-semibold">
                  TOLERÂNCIA ±0.5mm
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Desenho técnico pronto para impressão A4/A3 com as distâncias milimétricas exatas de cada componente para as margens da chapa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {recentNotification && (
              <span className="text-xs text-emerald-400 font-mono px-2 py-1 rounded bg-emerald-950/80 border border-emerald-800 animate-in fade-in">
                ✓ {recentNotification}
              </span>
            )}

            <button
              type="button"
              onClick={handleDownloadSvg}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer"
              title="Descarregar ficheiro vetorial SVG em escala milimétrica para plotter ou corte laser CNC"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Descarregar SVG (1:1)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold rounded-lg shadow-md transition active:scale-95 cursor-pointer"
              title="Abrir diálogo de impressão do navegador para imprimir em papel A4 ou A3"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Imprimir Gabarito (A4 / A3)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ====================================================================
            2. SECONDARY CONTROLS BAR: Plate Selector & Toggle Options
            ==================================================================== */}
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          {/* Plate Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setSelectedPlate('door')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                selectedPlate === 'door'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🚪 Porta Frontal & HMI</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30">
                {devices.length} furos
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlate('glands')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                selectedPlate === 'glands'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🔌 Flange de Bucins</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30">
                {glands.length} bucins
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlate('chassis')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                selectedPlate === 'chassis'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🏗️ Placa de Montagem Interior</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30">
                {project.rails.length} calhas
              </span>
            </button>
          </div>

          {/* Sub-toggle for Glands: Top vs Bottom */}
          {selectedPlate === 'glands' && (
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setGlandLocationTab('top')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  glandLocationTab === 'top' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Topo (Entradas: {topGlands.length})
              </button>
              <button
                type="button"
                onClick={() => setGlandLocationTab('bottom')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  glandLocationTab === 'bottom' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Base (Saídas: {bottomGlands.length})
              </button>
            </div>
          )}

          {/* Toggles for Dimension Display */}
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white text-slate-300">
              <input
                type="checkbox"
                checked={showAllMargins}
                onChange={(e) => setShowAllMargins(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20"
              />
              <span>Cotas para as 4 Margens</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white text-slate-300">
              <input
                type="checkbox"
                checked={showCenterCrosshairs}
                onChange={(e) => setShowCenterCrosshairs(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20"
              />
              <span>Miras de Centro (+)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white text-slate-300">
              <input
                type="checkbox"
                checked={showGasketMargin}
                onChange={(e) => setShowGasketMargin(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20"
              />
              <span>Vedação 45mm</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white text-slate-300">
              <input
                type="checkbox"
                checked={showDrillTable}
                onChange={(e) => setShowDrillTable(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20"
              />
              <span>Tabela de Serralharia</span>
            </label>
          </div>
        </div>

        {/* ====================================================================
            3. MAIN PRINTABLE DRAWING CANVAS (A4/A3 Clean Technical Layout)
            ==================================================================== */}
        <div className="flex-1 p-4 sm:p-6 bg-slate-950 overflow-y-auto">
          {/* Printable White Paper Sheet */}
          <div
            id="printable-template"
            className="bg-white text-slate-950 p-6 sm:p-10 rounded-xl shadow-2xl max-w-4xl mx-auto space-y-6 font-sans print:p-0 print:shadow-none print:m-0"
            style={{ minHeight: '297mm' }}
          >
            {/* Header / Carimbo Técnico de Serralharia */}
            <div className="border-2 border-slate-900 p-3.5 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded font-mono">
                    ELECTROCAD GABARITO CNC
                  </span>
                  <span className="text-[11px] font-bold text-amber-700">
                    PLANO DE FURAÇÃO & SERRALHARIA
                  </span>
                </div>
                <h1 className="text-lg font-black text-slate-900">
                  {selectedPlate === 'door'
                    ? `Gabarito de Furação da Porta Frontal (${doorWidthMm} × ${doorHeightMm} mm)`
                    : selectedPlate === 'glands'
                    ? `Gabarito de Furação da Flange de Cabos (${glandLocationTab === 'top' ? 'Entrada no Topo' : 'Saída na Base'})`
                    : `Gabarito de Furação da Placa de Montagem Interior (${plateWidthMm} × ${plateHeightMm} mm)`}
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Projeto: <strong className="font-mono text-slate-900">{config.projectCode || 'QUADRO-01'}</strong> — {config.name}
                  {' · '}Armário: <strong className="font-mono">{config.widthMm}×{config.heightMm}×{config.depthMm}mm</strong>
                </p>
              </div>

              <div className="text-right text-xs border-l-2 border-slate-300 pl-4 shrink-0">
                <div className="font-bold text-slate-900">{config.designerName || 'Instalador / Técnico Responsável'}</div>
                <div className="text-slate-600 font-mono text-[11px]">
                  Data: {config.date || new Date().toISOString().split('T')[0]} | Tolerância: ±0.5mm
                </div>
                <div className="text-[10px] text-emerald-700 font-bold font-mono mt-1">
                  ✓ MEDIDAS EM MILÍMETROS (mm)
                </div>
              </div>
            </div>

            {/* Validation Ruler Note */}
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex items-center justify-between text-xs text-amber-900 font-mono">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Aferição de Impressão:</strong> Coloque a régua sobre a barra ao lado para garantir que mede exatamente 100 mm.
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <div className="w-[100px] h-3 bg-slate-900 relative flex items-center justify-between px-1 text-[8px] text-white">
                  <span>|</span>
                  <span className="text-[8px] font-bold">100 mm</span>
                  <span>|</span>
                </div>
              </div>
            </div>

            {/* ====================================================================
                TECHNICAL CAD SVG DRAWING WITH DIMENSION LINES (COTAS)
               ==================================================================== */}
            <div className="border-2 border-slate-900 p-2 sm:p-4 rounded-lg bg-white flex items-center justify-center">
              {selectedPlate === 'door' && (
                <DoorDrillingSvg
                  doorWidthMm={doorWidthMm}
                  doorHeightMm={doorHeightMm}
                  devices={devices}
                  showAllMargins={showAllMargins}
                  showCenterCrosshairs={showCenterCrosshairs}
                  showGasketMargin={showGasketMargin}
                />
              )}

              {selectedPlate === 'glands' && (
                <GlandDrillingSvg
                  plateWidthMm={plateWidthMm}
                  plateDepthMm={plateHeightMm}
                  glands={glandLocationTab === 'top' ? topGlands : bottomGlands}
                  locationName={glandLocationTab === 'top' ? 'ENTRADA DE CABOS (TOPO)' : 'SAÍDA DE CABOS (BASE)'}
                  showAllMargins={showAllMargins}
                  showCenterCrosshairs={showCenterCrosshairs}
                />
              )}

              {selectedPlate === 'chassis' && (
                <ChassisDrillingSvg
                  plateWidthMm={plateWidthMm}
                  plateHeightMm={plateHeightMm}
                  rails={project.rails}
                  showAllMargins={showAllMargins}
                />
              )}
            </div>

            {/* ====================================================================
                WORKSHOP DRILLING SCHEDULE TABLE (TABELA DE SERRALHARIA / CNC)
               ==================================================================== */}
            {showDrillTable && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tabela de Coordenadas de Furação e Medidas para as Margens (CNC / Serralharia)</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-600">
                    Origem de Medição: Canto Superior Esquerdo (Margem Esq. / Topo) e Margens Opostas
                  </span>
                </div>

                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold font-mono text-[11px]">
                      <tr>
                        <th className="p-2 border-r border-slate-300 text-center w-12">Nº</th>
                        <th className="p-2 border-r border-slate-300">Identificação / Tag</th>
                        <th className="p-2 border-r border-slate-300">Tipo de Furo / Broca</th>
                        <th className="p-2 border-r border-slate-300 bg-amber-50/80 text-center font-bold text-amber-900">
                          X (Margem Esq.)
                        </th>
                        <th className="p-2 border-r border-slate-300 bg-amber-50/80 text-center font-bold text-amber-900">
                          Y (Margem Topo)
                        </th>
                        <th className="p-2 border-r border-slate-300 text-center text-slate-600">
                          X (Margem Dir.)
                        </th>
                        <th className="p-2 border-r border-slate-300 text-center text-slate-600">
                          Y (Margem Base)
                        </th>
                        <th className="p-2">Ferramenta Recomendada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {selectedPlate === 'door' &&
                        devices.map((dev, idx) => {
                          const xCenter = Math.round(dev.xMm);
                          const yCenter = Math.round(dev.yMm);
                          const xRight = Math.round(doorWidthMm - dev.xMm);
                          const yBottom = Math.round(doorHeightMm - dev.yMm);

                          return (
                            <tr key={dev.id} className="hover:bg-slate-50">
                              <td className="p-2 font-mono font-bold text-center border-r border-slate-200 bg-slate-50">
                                #{idx + 1}
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <span className="font-bold text-slate-900">{dev.tag}</span>
                                <span className="text-slate-500 ml-1.5">({dev.name})</span>
                              </td>
                              <td className="p-2 font-mono font-bold text-emerald-800 border-r border-slate-200">
                                {dev.cutoutType === 'round'
                                  ? `Furo Ø${dev.holeDiameterMm || 22.5} mm`
                                  : `Recorte ${dev.widthMm}×${dev.heightMm} mm`}
                              </td>
                              <td className="p-2 font-mono text-center font-black text-amber-950 border-r border-slate-200 bg-amber-50/50">
                                {xCenter} mm
                              </td>
                              <td className="p-2 font-mono text-center font-black text-amber-950 border-r border-slate-200 bg-amber-50/50">
                                {yCenter} mm
                              </td>
                              <td className="p-2 font-mono text-center text-slate-600 border-r border-slate-200">
                                {xRight} mm
                              </td>
                              <td className="p-2 font-mono text-center text-slate-600 border-r border-slate-200">
                                {yBottom} mm
                              </td>
                              <td className="p-2 font-mono text-slate-700">
                                {dev.cutoutType === 'round'
                                  ? 'Broca craniana Ø22.5mm / Furador hidráulico'
                                  : 'Fresa CNC / Serra tico-tico com furos de alívio nos cantos'}
                              </td>
                            </tr>
                          );
                        })}

                      {selectedPlate === 'glands' &&
                        (glandLocationTab === 'top' ? topGlands : bottomGlands).map((gland, idx) => {
                          const spec = GLAND_SPECS[gland.metric];
                          const xCenter = Math.round(gland.xMm);
                          const xRight = Math.round(plateWidthMm - gland.xMm);
                          const yCenter = Math.round(gland.yMm || plateHeightMm / 2);
                          const yBottom = Math.round(plateHeightMm - yCenter);

                          return (
                            <tr key={gland.id} className="hover:bg-slate-50">
                              <td className="p-2 font-mono font-bold text-center border-r border-slate-200 bg-slate-50">
                                #{idx + 1}
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <span className="font-bold text-slate-900">{gland.metric}</span>
                                <span className="text-slate-500 ml-1.5">({gland.label || 'Passagem de cabos'})</span>
                              </td>
                              <td className="p-2 font-mono font-bold text-emerald-800 border-r border-slate-200">
                                Furo Ø{spec.holeDiameterMm} mm
                              </td>
                              <td className="p-2 font-mono text-center font-black text-amber-950 border-r border-slate-200 bg-amber-50/50">
                                {xCenter} mm
                              </td>
                              <td className="p-2 font-mono text-center font-black text-amber-950 border-r border-slate-200 bg-amber-50/50">
                                {yCenter} mm
                              </td>
                              <td className="p-2 font-mono text-center text-slate-600 border-r border-slate-200">
                                {xRight} mm
                              </td>
                              <td className="p-2 font-mono text-center text-slate-600 border-r border-slate-200">
                                {yBottom} mm
                              </td>
                              <td className="p-2 font-mono text-slate-700">
                                Furador cilíndrico {gland.metric} (Ø{spec.holeDiameterMm}mm)
                              </td>
                            </tr>
                          );
                        })}

                      {selectedPlate === 'chassis' &&
                        project.rails.map((rail, idx) => {
                          const yPos = Math.round(80 + idx * 140);
                          const yBottom = Math.round(plateHeightMm - yPos);
                          const usedWidth = Math.round(
                            rail.items.reduce((sum, it) => sum + (it.data.widthMm || 18), 0)
                          );
                          const leftMargin = 30;
                          const rightMargin = Math.round(plateWidthMm - (leftMargin + usedWidth));

                          return (
                            <tr key={rail.id || idx} className="hover:bg-slate-50">
                              <td className="p-2 font-mono font-bold text-center border-r border-slate-200 bg-slate-50">
                                #{idx + 1}
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <span className="font-bold text-slate-900">{rail.name || `Calha ${idx + 1}`}</span>
                                <span className="text-slate-500 ml-1.5">({rail.items.length} aparelhos)</span>
                              </td>
                              <td className="p-2 font-mono font-bold text-emerald-800 border-r border-slate-200">
                                Furo M5/M6 (Calha DIN 35/7.5)
                              </td>
                              <td className="p-2 font-mono text-center font-black text-amber-950 border-r border-slate-200 bg-amber-50/50">
                                {leftMargin} mm (início aparelhos)
                              </td>
                              <td className="p-2 font-mono text-center font-black text-amber-950 border-r border-slate-200 bg-amber-50/50">
                                {yPos} mm (centro calha)
                              </td>
                              <td className="p-2 font-mono text-center text-slate-600 border-r border-slate-200">
                                {rightMargin} mm (margem dir.)
                              </td>
                              <td className="p-2 font-mono text-center text-slate-600 border-r border-slate-200">
                                {yBottom} mm
                              </td>
                              <td className="p-2 font-mono text-slate-700">
                                Broca Ø4.2mm com macho M5 / Parafuso auto-roscante
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Practical Notes for the Workshop */}
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-slate-900 block">
                    Notas de Execução para a Oficina (EN 61439-1 / EN 60204-1):
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 font-mono">
                    <li>Marcar o centro de cada furo com punção de bico nas miras (+) antes de furar.</li>
                    <li>Utilizar furador hidráulico ou broca escalonada para evitar deformação na chapa de aço/poliéster.</li>
                    <li>Após a furação, aplicar escareador/rebarbador nos bordos cortantes para proteção dos condutores.</li>
                    <li>Proteger os furos não utilizados com tampões estanques certificados IP65/IP66.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// SUBCOMPONENT: Door Drilling SVG with Margin Dimension Callouts (Cotas)
// ====================================================================
interface DoorDrillingSvgProps {
  doorWidthMm: number;
  doorHeightMm: number;
  devices: ControlPanelDevice[];
  showAllMargins: boolean;
  showCenterCrosshairs: boolean;
  showGasketMargin: boolean;
}

const DoorDrillingSvg: React.FC<DoorDrillingSvgProps> = ({
  doorWidthMm,
  doorHeightMm,
  devices,
  showAllMargins,
  showCenterCrosshairs,
  showGasketMargin,
}) => {
  // SVG Canvas configuration
  const svgWidth = 840;
  const svgHeight = 700;

  // Drawing boundaries for the door
  const drawAreaX = 100;
  const drawAreaY = 70;
  const drawAreaW = 640;
  const drawAreaH = 560;

  // Scale factor
  const scale = Math.min(drawAreaW / doorWidthMm, drawAreaH / doorHeightMm);
  const doorSvgW = doorWidthMm * scale;
  const doorSvgH = doorHeightMm * scale;

  // Centering the door inside the draw area
  const doorX = drawAreaX + (drawAreaW - doorSvgW) / 2;
  const doorY = drawAreaY + (drawAreaH - doorSvgH) / 2;

  const gasketOffsetMm = 45;
  const gasketOffsetSvg = gasketOffsetMm * scale;

  return (
    <svg
      id="drilling-template-svg"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-auto max-h-[580px] select-none font-mono"
    >
      {/* Background */}
      <rect width={svgWidth} height={svgHeight} fill="#ffffff" />

      {/* Grid Guide Lines */}
      <defs>
        <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
        </pattern>
        {/* Dimension Arrow Marker */}
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0f172a" />
        </marker>
        <marker id="arrowAmber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#d97706" />
        </marker>
      </defs>
      <rect width={svgWidth} height={svgHeight} fill="url(#cadGrid)" />

      {/* Title Callout */}
      <text x={svgWidth / 2} y="30" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0f172a">
        PORTA FRONTAL — COTAS DAS FURAÇÕES PARA AS MARGENS DA CHAPA
      </text>
      <text x={svgWidth / 2} y="46" textAnchor="middle" fontSize="10.5" fill="#64748b">
        Dimensões Totais da Porta: {doorWidthMm} mm (Largura) × {doorHeightMm} mm (Altura)
      </text>

      {/* Main Door Outline */}
      <rect
        x={doorX}
        y={doorY}
        width={doorSvgW}
        height={doorSvgH}
        fill="#f8fafc"
        stroke="#0f172a"
        strokeWidth="2.5"
        rx="2"
      />

      {/* Safe Gasket Clear Zone (45mm margin) */}
      {showGasketMargin && (
        <rect
          x={doorX + gasketOffsetSvg}
          y={doorY + gasketOffsetSvg}
          width={Math.max(10, doorSvgW - 2 * gasketOffsetSvg)}
          height={Math.max(10, doorSvgH - 2 * gasketOffsetSvg)}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      )}

      {/* Outer Door Dimensions: Top Width */}
      <g>
        <line x1={doorX} y1={doorY - 14} x2={doorX + doorSvgW} y2={doorY - 14} stroke="#0f172a" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        <line x1={doorX} y1={doorY - 20} x2={doorX} y2={doorY} stroke="#94a3b8" strokeWidth="0.8" />
        <line x1={doorX + doorSvgW} y1={doorY - 20} x2={doorX + doorSvgW} y2={doorY} stroke="#94a3b8" strokeWidth="0.8" />
        <text x={doorX + doorSvgW / 2} y={doorY - 18} textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="#0f172a">
          {doorWidthMm} mm
        </text>
      </g>

      {/* Outer Door Dimensions: Left Height */}
      <g>
        <line x1={doorX - 16} y1={doorY} x2={doorX - 16} y2={doorY + doorSvgH} stroke="#0f172a" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        <line x1={doorX - 22} y1={doorY} x2={doorX} y2={doorY} stroke="#94a3b8" strokeWidth="0.8" />
        <line x1={doorX - 22} y1={doorY + doorSvgH} x2={doorX} y2={doorY + doorSvgH} stroke="#94a3b8" strokeWidth="0.8" />
        <text
          x={doorX - 22}
          y={doorY + doorSvgH / 2}
          textAnchor="middle"
          fontSize="10.5"
          fontWeight="bold"
          fill="#0f172a"
          transform={`rotate(-90 ${doorX - 22} ${doorY + doorSvgH / 2})`}
        >
          {doorHeightMm} mm
        </text>
      </g>

      {/* Render Each Cutout / Hole with Dimension Lines to Margins */}
      {devices.map((dev, idx) => {
        const xCenterSvg = doorX + dev.xMm * scale;
        const yCenterSvg = doorY + dev.yMm * scale;
        const xLeftMm = Math.round(dev.xMm);
        const yTopMm = Math.round(dev.yMm);
        const xRightMm = Math.round(doorWidthMm - dev.xMm);
        const yBottomMm = Math.round(doorHeightMm - dev.yMm);

        const isRound = dev.cutoutType === 'round';
        const holeDiaMm = isRound ? (dev.holeDiameterMm || 22.5) : null;
        const holeDiaSvg = holeDiaMm ? holeDiaMm * scale : 16;
        const radiusSvg = holeDiaSvg / 2;

        const rectWSvg = dev.widthMm * scale;
        const rectHSvg = dev.heightMm * scale;

        return (
          <g key={dev.id}>
            {/* Cutout Shape */}
            {isRound ? (
              <>
                <circle
                  cx={xCenterSvg}
                  cy={yCenterSvg}
                  r={radiusSvg}
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="1.8"
                />
                {/* Crosshairs (+) */}
                {showCenterCrosshairs && (
                  <>
                    <line
                      x1={xCenterSvg - radiusSvg - 7}
                      y1={yCenterSvg}
                      x2={xCenterSvg + radiusSvg + 7}
                      y2={yCenterSvg}
                      stroke="#dc2626"
                      strokeWidth="1"
                    />
                    <line
                      x1={xCenterSvg}
                      y1={yCenterSvg - radiusSvg - 7}
                      x2={xCenterSvg}
                      y2={yCenterSvg + radiusSvg + 7}
                      stroke="#dc2626"
                      strokeWidth="1"
                    />
                  </>
                )}
                {/* Index badge */}
                <circle cx={xCenterSvg} cy={yCenterSvg} r="6" fill="#0f172a" />
                <text x={xCenterSvg} y={yCenterSvg + 3.5} textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">
                  {idx + 1}
                </text>
              </>
            ) : (
              <>
                {/* Rectangular Cutout for HMI */}
                <rect
                  x={xCenterSvg - rectWSvg / 2}
                  y={yCenterSvg - rectHSvg / 2}
                  width={rectWSvg}
                  height={rectHSvg}
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="2"
                  rx="2"
                />
                {showCenterCrosshairs && (
                  <>
                    <line
                      x1={xCenterSvg - rectWSvg / 2 - 8}
                      y1={yCenterSvg}
                      x2={xCenterSvg + rectWSvg / 2 + 8}
                      y2={yCenterSvg}
                      stroke="#dc2626"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                    />
                    <line
                      x1={xCenterSvg}
                      y1={yCenterSvg - rectHSvg / 2 - 8}
                      x2={xCenterSvg}
                      y2={yCenterSvg + rectHSvg / 2 + 8}
                      stroke="#dc2626"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                    />
                  </>
                )}
                {/* Index badge */}
                <circle cx={xCenterSvg} cy={yCenterSvg} r="7" fill="#0f172a" />
                <text x={xCenterSvg} y={yCenterSvg + 3.5} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                  {idx + 1}
                </text>
              </>
            )}

            {/* Dimension Lines (Cotas para as Margens da Chapa) */}
            {showAllMargins && (
              <g>
                {/* Dimension Line: Distance to Left Margin */}
                <line
                  x1={doorX}
                  y1={yCenterSvg}
                  x2={xCenterSvg}
                  y2={yCenterSvg}
                  stroke="#d97706"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  markerStart="url(#arrowAmber)"
                  markerEnd="url(#arrowAmber)"
                />
                <rect
                  x={doorX + (xCenterSvg - doorX) / 2 - 24}
                  y={yCenterSvg - 14}
                  width="48"
                  height="12"
                  fill="#ffffff"
                  stroke="#d97706"
                  strokeWidth="0.8"
                  rx="2"
                />
                <text
                  x={doorX + (xCenterSvg - doorX) / 2}
                  y={yCenterSvg - 5}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="bold"
                  fill="#b45309"
                >
                  X={xLeftMm}
                </text>

                {/* Dimension Line: Distance to Top Margin */}
                <line
                  x1={xCenterSvg}
                  y1={doorY}
                  x2={xCenterSvg}
                  y2={yCenterSvg}
                  stroke="#2563eb"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  markerStart="url(#arrow)"
                  markerEnd="url(#arrow)"
                />
                <rect
                  x={xCenterSvg - 24}
                  y={doorY + (yCenterSvg - doorY) / 2 - 6}
                  width="48"
                  height="12"
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="0.8"
                  rx="2"
                />
                <text
                  x={xCenterSvg}
                  y={doorY + (yCenterSvg - doorY) / 2 + 3}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="bold"
                  fill="#1d4ed8"
                >
                  Y={yTopMm}
                </text>
              </g>
            )}

            {/* Label Under Cutout */}
            <text
              x={xCenterSvg}
              y={yCenterSvg + (isRound ? radiusSvg + 12 : rectHSvg / 2 + 12)}
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill="#0f172a"
            >
              {isRound ? `Ø${holeDiaMm}mm` : `${dev.widthMm}×${dev.heightMm}mm`}
            </text>
            <text
              x={xCenterSvg}
              y={yCenterSvg + (isRound ? radiusSvg + 21 : rectHSvg / 2 + 21)}
              textAnchor="middle"
              fontSize="7"
              fill="#64748b"
            >
              #{idx + 1} {dev.tag}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ====================================================================
// SUBCOMPONENT: Cable Gland Flange Plate Drilling SVG
// ====================================================================
interface GlandDrillingSvgProps {
  plateWidthMm: number;
  plateDepthMm: number;
  glands: CableGland[];
  locationName: string;
  showAllMargins: boolean;
  showCenterCrosshairs: boolean;
}

const GlandDrillingSvg: React.FC<GlandDrillingSvgProps> = ({
  plateWidthMm,
  plateDepthMm,
  glands,
  locationName,
  showAllMargins,
  showCenterCrosshairs,
}) => {
  const svgWidth = 840;
  const svgHeight = 440;

  const drawAreaX = 90;
  const drawAreaY = 70;
  const drawAreaW = 660;
  const drawAreaH = 300;

  const scale = Math.min(drawAreaW / plateWidthMm, drawAreaH / plateDepthMm);
  const plateSvgW = plateWidthMm * scale;
  const plateSvgH = plateDepthMm * scale;

  const plateX = drawAreaX + (drawAreaW - plateSvgW) / 2;
  const plateY = drawAreaY + (drawAreaH - plateSvgH) / 2;

  return (
    <svg
      id="drilling-template-svg"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-auto max-h-[460px] select-none font-mono"
    >
      <rect width={svgWidth} height={svgHeight} fill="#ffffff" />
      <text x={svgWidth / 2} y="32" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0f172a">
        FLANGE ESTANQUE DE BUCINS — {locationName}
      </text>
      <text x={svgWidth / 2} y="48" textAnchor="middle" fontSize="10.5" fill="#64748b">
        Dimensões da Flange: {plateWidthMm} mm × {Math.round(plateDepthMm)} mm · {glands.length} furações métricas
      </text>

      {/* Plate outline */}
      <rect
        x={plateX}
        y={plateY}
        width={plateSvgW}
        height={plateSvgH}
        fill="#f8fafc"
        stroke="#0f172a"
        strokeWidth="2.5"
        rx="4"
      />

      {/* Plate Outer Dimensions */}
      <g>
        <line x1={plateX} y1={plateY - 14} x2={plateX + plateSvgW} y2={plateY - 14} stroke="#0f172a" strokeWidth="1.2" />
        <text x={plateX + plateSvgW / 2} y={plateY - 18} textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="#0f172a">
          {plateWidthMm} mm
        </text>
        <text x={plateX - 16} y={plateY + plateSvgH / 2} textAnchor="middle" fontSize="10" fill="#64748b">
          {Math.round(plateDepthMm)} mm
        </text>
      </g>

      {/* Render Gland Holes */}
      {glands.map((gland, idx) => {
        const spec = GLAND_SPECS[gland.metric];
        const holeDiaMm = spec.holeDiameterMm;
        const xCenterSvg = plateX + gland.xMm * scale;
        const yCenterSvg = plateY + (gland.yMm ? gland.yMm * scale : plateSvgH / 2);
        const radiusSvg = (holeDiaMm * scale) / 2;
        const xLeftMm = Math.round(gland.xMm);
        const yTopMm = Math.round(gland.yMm || plateDepthMm / 2);

        return (
          <g key={gland.id}>
            <circle
              cx={xCenterSvg}
              cy={yCenterSvg}
              r={Math.max(6, radiusSvg)}
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="2"
            />
            {showCenterCrosshairs && (
              <>
                <line
                  x1={xCenterSvg - radiusSvg - 5}
                  y1={yCenterSvg}
                  x2={xCenterSvg + radiusSvg + 5}
                  y2={yCenterSvg}
                  stroke="#dc2626"
                  strokeWidth="1"
                />
                <line
                  x1={xCenterSvg}
                  y1={yCenterSvg - radiusSvg - 5}
                  x2={xCenterSvg}
                  y2={yCenterSvg + radiusSvg + 5}
                  stroke="#dc2626"
                  strokeWidth="1"
                />
              </>
            )}

            {/* Dimension Line to Left Edge */}
            {showAllMargins && (
              <g>
                <line
                  x1={plateX}
                  y1={yCenterSvg}
                  x2={xCenterSvg}
                  y2={yCenterSvg}
                  stroke="#d97706"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <rect
                  x={plateX + (xCenterSvg - plateX) / 2 - 20}
                  y={yCenterSvg - 13}
                  width="40"
                  height="11"
                  fill="#ffffff"
                  stroke="#d97706"
                  strokeWidth="0.8"
                  rx="2"
                />
                <text
                  x={plateX + (xCenterSvg - plateX) / 2}
                  y={yCenterSvg - 5}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="bold"
                  fill="#b45309"
                >
                  X={xLeftMm}
                </text>
              </g>
            )}

            {/* Gland Spec Tag */}
            <circle cx={xCenterSvg} cy={yCenterSvg} r="6" fill="#0f172a" />
            <text x={xCenterSvg} y={yCenterSvg + 3.5} textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
              {idx + 1}
            </text>

            <text x={xCenterSvg} y={yCenterSvg + radiusSvg + 12} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0f172a">
              {gland.metric} (Ø{holeDiaMm}mm)
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ====================================================================
// SUBCOMPONENT: Chassis & DIN Rail Mounting Plate SVG
// ====================================================================
interface ChassisDrillingSvgProps {
  plateWidthMm: number;
  plateHeightMm: number;
  rails: ProjectState['rails'];
  showAllMargins: boolean;
}

const ChassisDrillingSvg: React.FC<ChassisDrillingSvgProps> = ({
  plateWidthMm,
  plateHeightMm,
  rails,
  showAllMargins,
}) => {
  const svgWidth = 840;
  const svgHeight = 650;

  const drawAreaX = 100;
  const drawAreaY = 70;
  const drawAreaW = 640;
  const drawAreaH = 530;

  const scale = Math.min(drawAreaW / plateWidthMm, drawAreaH / plateHeightMm);
  const plateSvgW = plateWidthMm * scale;
  const plateSvgH = plateHeightMm * scale;

  const plateX = drawAreaX + (drawAreaW - plateSvgW) / 2;
  const plateY = drawAreaY + (drawAreaH - plateSvgH) / 2;

  return (
    <svg
      id="drilling-template-svg"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-auto max-h-[560px] select-none font-mono"
    >
      <rect width={svgWidth} height={svgHeight} fill="#ffffff" />
      <text x={svgWidth / 2} y="32" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0f172a">
        PLACA DE MONTAGEM INTERIOR — FURAÇÃO DAS CALHAS DIN E CANALETAS
      </text>
      <text x={svgWidth / 2} y="48" textAnchor="middle" fontSize="10.5" fill="#64748b">
        Dimensões Úteis: {plateWidthMm} mm × {plateHeightMm} mm · {rails.length} calhas DIN 35mm
      </text>

      {/* Plate outline */}
      <rect
        x={plateX}
        y={plateY}
        width={plateSvgW}
        height={plateSvgH}
        fill="#f8fafc"
        stroke="#0f172a"
        strokeWidth="2.5"
        rx="3"
      />

      {/* Render Rails and Margins */}
      {rails.map((rail, idx) => {
        const yMm = 80 + idx * 140;
        const ySvg = plateY + yMm * scale;
        const railHeightSvg = 18 * scale;
        const usedWidthMm = rail.items.reduce((sum, it) => sum + (it.data.widthMm || 18), 0);
        const usedWidthSvg = usedWidthMm * scale;
        const leftMarginMm = 30;
        const leftMarginSvg = leftMarginMm * scale;

        return (
          <g key={rail.id || idx}>
            {/* Rail Steel Bar Outline */}
            <rect
              x={plateX + 15}
              y={ySvg - railHeightSvg / 2}
              width={plateSvgW - 30}
              height={railHeightSvg}
              fill="#e2e8f0"
              stroke="#64748b"
              strokeWidth="1.2"
              rx="1"
            />

            {/* Component footprint block on rail */}
            {usedWidthMm > 0 && (
              <rect
                x={plateX + leftMarginSvg}
                y={ySvg - 25 * scale}
                width={usedWidthSvg}
                height={50 * scale}
                fill="#dbeafe"
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                rx="2"
              />
            )}

            {/* Y Dimension to Top Margin */}
            {showAllMargins && (
              <g>
                <line x1={plateX - 8} y1={plateY} x2={plateX - 8} y2={ySvg} stroke="#2563eb" strokeWidth="1" strokeDasharray="2 2" />
                <text x={plateX - 14} y={plateY + (ySvg - plateY) / 2} textAnchor="end" fontSize="8" fontWeight="bold" fill="#1d4ed8">
                  Y={yMm} mm
                </text>
              </g>
            )}

            {/* Text details */}
            <text x={plateX + 25} y={ySvg + 3.5} fontSize="9" fontWeight="bold" fill="#0f172a">
              #{idx + 1} {rail.name || `Calha ${idx + 1}`} (Cota Y={yMm} mm)
            </text>
            <text x={plateX + plateSvgW - 35} y={ySvg + 3.5} textAnchor="end" fontSize="8" fill="#475569">
              {usedWidthMm > 0 ? `${usedWidthMm}mm ocupados (${rail.items.length} aparelhos)` : 'Calha livre'}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
