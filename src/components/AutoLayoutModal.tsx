import React, { useState, useMemo } from 'react';
import { ProjectState, DinRail } from '../types/electrical';
import {
  AutoLayoutMode,
  AutoLayoutOptions,
  checkThermalCompliance,
  executeAutoLayout,
  THERMAL_SPECS,
} from '../utils/autoLayoutUtils';
import {
  Wind,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Cpu,
  Layers,
  Sliders,
  Sparkles,
  X,
  Gauge,
  Info,
  Maximize2,
  Check,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AutoLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  selectedRailIndex: number;
  onApplyLayout: (newRails: DinRail[]) => void;
}

export const AutoLayoutModal: React.FC<AutoLayoutModalProps> = ({
  isOpen,
  onClose,
  project,
  selectedRailIndex,
  onApplyLayout,
}) => {
  const [scope, setScope] = useState<'all' | 'selected_rail'>('all');
  const [targetRailIdx, setTargetRailIdx] = useState<number>(
    selectedRailIndex >= 0 ? selectedRailIndex : 0
  );
  const [mode, setMode] = useState<AutoLayoutMode>('thermal_normative');
  const [psuClearanceMm, setPsuClearanceMm] = useState<number>(20);
  const [plcClearanceMm, setPlcClearanceMm] = useState<number>(10);
  const [generalSpacingMm, setGeneralSpacingMm] = useState<number>(5);
  const [terminalsSpacingMm, setTerminalsSpacingMm] = useState<number>(0);
  const [centerOnRail, setCenterOnRail] = useState<boolean>(false);

  // Initial thermal assessment
  const currentCompliance = useMemo(() => {
    return checkThermalCompliance(project.rails);
  }, [project.rails]);

  // Options object for calculation
  const layoutOptions: AutoLayoutOptions = useMemo(() => {
    return {
      mode,
      scope,
      targetRailIndex: targetRailIdx,
      psuClearanceMm,
      plcClearanceMm,
      generalSpacingMm,
      terminalsSpacingMm,
      centerOnRail,
    };
  }, [
    mode,
    scope,
    targetRailIdx,
    psuClearanceMm,
    plcClearanceMm,
    generalSpacingMm,
    terminalsSpacingMm,
    centerOnRail,
  ]);

  // Projected Layout result calculation
  const previewResult = useMemo(() => {
    return executeAutoLayout(project, layoutOptions);
  }, [project, layoutOptions]);

  if (!isOpen) return null;

  const totalComponents = project.rails.reduce((acc, r) => acc + r.items.length, 0);

  const handleApply = () => {
    onApplyLayout(previewResult.updatedRails);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Auto-Layout & Otimização Térmica das Calhas DIN
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                  EN 61439
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Reorganização inteligente de componentes com respeito rigoroso às distâncias mínimas de ventilação recomendadas pelos fabricantes (Mean Well, Siemens).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Two columns layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-900/60">
          {/* Left Column: Settings & Controls (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-5">
            {/* 1. Âmbito da Otimização */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <label className="block text-xs font-semibold text-slate-300 mb-2.5 uppercase tracking-wider">
                1. Âmbito da Reorganização
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`flex flex-col p-3 rounded-lg border text-left transition ${
                    scope === 'all'
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-xs'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      Todo o Armário
                    </span>
                    {scope === 'all' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Redistribui todos os {totalComponents} componentes pelas calhas segundo a função normativa (Proteções &gt; Automação &gt; Força &gt; Bornes).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('selected_rail')}
                  className={`flex flex-col p-3 rounded-lg border text-left transition ${
                    scope === 'selected_rail'
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-xs'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" />
                      Apenas Calha Selecionada
                    </span>
                    {scope === 'selected_rail' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Mantém os aparelhos na calha escolhida, reorganizando apenas as distâncias de ventilação interna.
                  </p>
                </button>
              </div>

              {scope === 'selected_rail' && (
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-3">
                  <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
                    Calha Alvo:
                  </span>
                  <select
                    value={targetRailIdx}
                    onChange={(e) => setTargetRailIdx(Number(e.target.value))}
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    {project.rails.map((r, i) => (
                      <option key={r.id} value={i}>
                        Calha {i + 1} ({r.name}) — {r.items.length} componentes
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 2. Estratégia de Disposição */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <label className="block text-xs font-semibold text-slate-300 mb-2.5 uppercase tracking-wider">
                2. Estratégia de Otimização
              </label>

              <div className="space-y-2">
                {/* Mode 1: Thermal & Normative */}
                <div
                  onClick={() => setMode('thermal_normative')}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    mode === 'thermal_normative'
                      ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500/40 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-amber-500/20 text-amber-300">
                        <Flame className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-white">
                        Otimização Térmica & Norma EN 61439 (Recomendado)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Topologia Padrão
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-7">
                    Garante circulação de convecção natural para as fontes Mean Well ({psuClearanceMm}mm lateral), isola termicamente a CPU Siemens de aparelhos de alto calor e posiciona as réguas de bornes junto aos bucins.
                  </p>
                </div>

                {/* Mode 2: Compact */}
                <div
                  onClick={() => setMode('compact_safe')}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    mode === 'compact_safe'
                      ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500/40 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-sky-500/20 text-sky-300">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-white">
                        Espaço Compacto Otimizado
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-7">
                    Preserva as calhas originais, mas compacta os componentes reduzindo folgas ao mínimo seguro ({Math.max(12, psuClearanceMm - 5)}mm na fonte, 0mm nos bornes contíguos).
                  </p>
                </div>

                {/* Mode 3: Balanced Distribution */}
                <div
                  onClick={() => setMode('balanced_distribution')}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    mode === 'balanced_distribution'
                      ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500/40 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-purple-500/20 text-purple-300">
                        <Gauge className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-white">
                        Distribuição de Carga Equilibrada
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-7">
                    Distribui os módulos uniformemente pelas {project.rails.length} calhas para evitar calhas sobrelotadas e manter reserva homogênea de expansão.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Parâmetros de Folgas Térmicas */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-blue-400" />
                  3. Parâmetros de Ventilação Recomendada
                </label>
                <span className="text-[10px] text-slate-400">IEC 60617 / Datasheet Mean Well</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* PSU Clearance */}
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] font-medium text-amber-300 flex items-center justify-between">
                    <span>Fonte Mean Well</span>
                    <span className="font-bold text-white">{psuClearanceMm}mm</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {[15, 20, 25].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPsuClearanceMm(v)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                          psuClearanceMm === v
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {v}mm
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1.5 leading-tight">
                    Folga lateral esq/dir para convecção natural
                  </p>
                </div>

                {/* PLC CPU Clearance */}
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] font-medium text-sky-300 flex items-center justify-between">
                    <span>PLC Siemens / CPU</span>
                    <span className="font-bold text-white">{plcClearanceMm}mm</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {[5, 10, 15].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPlcClearanceMm(v)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                          plcClearanceMm === v
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {v}mm
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1.5 leading-tight">
                    Expansões mantêm 0mm (barramento acoplado)
                  </p>
                </div>

                {/* General Spacing */}
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                    <span>Aparelhagem Geral</span>
                    <span className="font-bold text-white">{generalSpacingMm}mm</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {[3, 5, 8].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setGeneralSpacingMm(v)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition ${
                          generalSpacingMm === v
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {v}mm
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1.5 leading-tight">
                    Espaçamento entre disjuntores e relés
                  </p>
                </div>
              </div>

              {/* Extra check toggles */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={terminalsSpacingMm === 0}
                    onChange={(e) => setTerminalsSpacingMm(e.target.checked ? 0 : 2)}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Encostar réguas de bornes contiguamente (0mm)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={centerOnRail}
                    onChange={(e) => setCenterOnRail(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Centrar blocos simetricamente na calha</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Comparison & Status Summary (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            {/* Scorecard: Conformidade Térmica */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                Previsão de Desempenho & Espaço
              </span>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Thermal Compliance */}
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Conformidade Térmica</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={`text-xl font-bold font-mono ${
                        previewResult.stats.thermalCompliancePercent === 100
                          ? 'text-emerald-400'
                          : previewResult.stats.thermalCompliancePercent >= 80
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {previewResult.stats.thermalCompliancePercent}%
                    </span>
                    <span className="text-[10px] text-slate-500 line-through">
                      {currentCompliance.complianceRate}% antes
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${previewResult.stats.thermalCompliancePercent}%` }}
                    />
                  </div>
                </div>

                {/* Rail Occupancy */}
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Ocupação Média Calhas</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold font-mono text-sky-400">
                      {previewResult.stats.avgOccupancyPercent}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (reserva {Math.max(0, 100 - previewResult.stats.avgOccupancyPercent)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-300 ${
                        previewResult.stats.avgOccupancyPercent > 90
                          ? 'bg-red-500'
                          : previewResult.stats.avgOccupancyPercent > 75
                          ? 'bg-amber-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${previewResult.stats.avgOccupancyPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {previewResult.stats.thermalCompliancePercent >= 95 ? (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-emerald-300 leading-snug">
                    Todas as fontes de alimentação e aparelhos de alta dissipação contam com folga de ventilação adequada, cumprindo a norma de ensaio térmico EN 61439-1.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-300 leading-snug">
                    Existem aparelhos densos com folga reduzida devido ao espaço disponível na calha.
                  </p>
                </div>
              )}
            </div>

            {/* Distribution per Rail Mini-Bars */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
                Ocupação Projetada por Calha
              </span>

              <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
                {previewResult.updatedRails.map((rail, idx) => {
                  const railWidth = rail.usableWidthMm;
                  const usedMm = rail.items.reduce((acc, it) => acc + it.data.widthMm + 5, 0);
                  const pct = Math.min(100, Math.round((usedMm / railWidth) * 100));
                  const isOver = usedMm > railWidth;

                  // Categories on this rail
                  const hasPsu = rail.items.some((i) => i.data.category === 'power_supply');
                  const hasPlc = rail.items.some((i) => i.data.category === 'plc_cpu');
                  const hasTerm = rail.items.some((i) => i.data.category === 'terminals');

                  return (
                    <div key={rail.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-semibold text-slate-200">
                          Calha {idx + 1} ({rail.name})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-400 text-[10px]">
                            {Math.round(usedMm)}mm / {railWidth}mm
                          </span>
                          <span
                            className={`font-mono font-bold text-[10px] ${
                              isOver ? 'text-red-400' : pct > 80 ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1 text-[9px]">
                        <span className="text-slate-400">{rail.items.length} itens:</span>
                        {hasPsu && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                            Fonte 24V
                          </span>
                        )}
                        {hasPlc && (
                          <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium">
                            PLC Siemens
                          </span>
                        )}
                        {hasTerm && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                            Bornes
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Warnings if any */}
              {previewResult.stats.warnings.length > 0 && (
                <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-300">
                  <div className="font-semibold mb-0.5">Aviso de Dimensionamento:</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {previewResult.stats.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>
              A reorganização preserva tags e ligações elétricas (fiação) dos componentes.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 rounded-lg shadow-lg shadow-blue-500/20 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Aplicar Otimização no Quadro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
