import React, { useState, useEffect, useMemo } from 'react';
import { ProjectState, PlacedComponent, WireConnection, SimulationState, WireNetType } from '../types/electrical';
import { 
  generateDefaultWires, 
  simulateCircuit, 
  createInitialSimulationState, 
  WIRE_COLORS 
} from '../utils/wireSimulator';
import { 
  Zap, Power, Play, Square, AlertTriangle, ShieldCheck, 
  RotateCcw, Plus, Trash2, Download, Search, CheckCircle2, 
  HelpCircle, Gauge, Activity, ArrowRight, ToggleLeft, ToggleRight,
  Radio, Cpu, TrendingUp, List, BarChart3
} from 'lucide-react';
import { CurrentSimulationChart } from './CurrentSimulationChart';

interface SimulationViewerProps {
  project: ProjectState;
}

export const SimulationViewer: React.FC<SimulationViewerProps> = ({ project }) => {
  // Wires and Simulation State
  const [customWires, setCustomWires] = useState<WireConnection[]>([]);
  const [deletedWireIds, setDeletedWireIds] = useState<string[]>([]);
  const [simState, setSimState] = useState<SimulationState>(createInitialSimulationState);
  const [rightPanelTab, setRightPanelTab] = useState<'charts' | 'wires'>('charts');
  const [wireFilter, setWireFilter] = useState<'all' | 'ac' | 'dc' | 'control'>('all');
  const [wireSearch, setWireSearch] = useState('');
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [selectedProbeTerminal, setSelectedProbeTerminal] = useState<string | null>('G1:+V');
  const [isAddWireModalOpen, setIsAddWireModalOpen] = useState(false);

  // Derived base wires (pure useMemo, eliminates any infinite useEffect loop)
  const baseWires = useMemo(() => {
    const defaults = generateDefaultWires(project);
    const activeDefaults = defaults.filter((w) => !deletedWireIds.includes(w.id));
    const activeCustom = customWires.filter((w) => !deletedWireIds.includes(w.id));
    return [...activeDefaults, ...activeCustom];
  }, [project, customWires, deletedWireIds]);

  // New manual wire state
  const [newWire, setNewWire] = useState<{
    tag: string;
    fromTag: string;
    fromTerm: string;
    toTag: string;
    toTerm: string;
    netType: WireNetType;
    crossSection: number;
    color: string;
  }>({
    tag: `W1`,
    fromTag: '',
    fromTerm: '',
    toTag: '',
    toTerm: '',
    netType: 'dc_positive',
    crossSection: 1.5,
    color: WIRE_COLORS.dc_positive,
  });

  // Components flat list
  const allComponents = useMemo(() => project.rails.flatMap((r) => r.items), [project.rails]);

  // Run simulation calculation whenever inputs, breakers or base wires change (strictly unidirectional)
  const { updatedWires, updatedState } = useMemo(() => {
    return simulateCircuit(project, baseWires, simState);
  }, [project, baseWires, simState]);

  // Interactive toggle actions
  const togglePower = () => {
    setSimState((prev) => ({
      ...prev,
      isPowered: !prev.isPowered,
      activeFault: prev.isPowered ? 'none' : prev.activeFault,
    }));
  };

  const toggleMainBreaker = () => {
    setSimState((prev) => ({
      ...prev,
      isMainBreakerOn: !prev.isMainBreakerOn,
    }));
  };

  const toggleRcdTrip = () => {
    setSimState((prev) => ({
      ...prev,
      isRcdTripped: !prev.isRcdTripped,
    }));
  };

  const toggleEmergencyStop = () => {
    setSimState((prev) => ({
      ...prev,
      isEmergencyStopActive: !prev.isEmergencyStopActive,
    }));
  };

  const toggleDigitalInput = (inputKey: string) => {
    setSimState((prev) => ({
      ...prev,
      digitalInputs: {
        ...prev.digitalInputs,
        [inputKey]: !prev.digitalInputs[inputKey],
      },
    }));
  };

  const togglePlcMode = () => {
    setSimState((prev) => ({
      ...prev,
      plcMode: prev.plcMode === 'RUN' ? 'STOP' : 'RUN',
    }));
  };

  const resetSimulation = () => {
    setSimState(createInitialSimulationState());
    setCustomWires([]);
    setDeletedWireIds([]);
  };

  const handleExportWireScheduleCsv = () => {
    const headers = ['Etiqueta (Tag)', 'De (Origem)', 'Borne Origem', 'Para (Destino)', 'Borne Destino', 'Tipo Circuito', 'Secção mm²', 'Cor', 'Energizado'];
    const rows = updatedWires.map((w) => [
      w.wireTag,
      w.fromComponentTag,
      w.fromTerminal,
      w.toComponentTag,
      w.toTerminal,
      w.netType,
      w.crossSectionMm2,
      w.color,
      w.isEnergized ? 'SIM (ATIVO)' : 'NAO',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${project.config.projectCode || 'quadro'}_lista_fiação_de_para.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateWire = () => {
    if (!newWire.fromTag || !newWire.toTag) return;
    const fromComp = allComponents.find((c) => c.tag === newWire.fromTag);
    const toComp = allComponents.find((c) => c.tag === newWire.toTag);

    const wireEntry: WireConnection = {
      id: `custom-wire-${Date.now()}`,
      wireTag: newWire.tag || `W${baseWires.length + 1}`,
      fromComponentId: fromComp?.instanceId || 'external',
      fromComponentTag: newWire.fromTag,
      fromTerminal: newWire.fromTerm || '1',
      toComponentId: toComp?.instanceId || 'external',
      toComponentTag: newWire.toTag,
      toTerminal: newWire.toTerm || '1',
      netType: newWire.netType,
      color: newWire.color,
      crossSectionMm2: newWire.crossSection,
      isEnergized: false,
      notes: 'Ligação manual do utilizador',
    };

    setCustomWires((prev) => [...prev, wireEntry]);
    setIsAddWireModalOpen(false);
  };

  const handleDeleteWire = (wireId: string) => {
    setDeletedWireIds((prev) => [...prev, wireId]);
    setCustomWires((prev) => prev.filter((w) => w.id !== wireId));
    if (selectedWireId === wireId) setSelectedWireId(null);
  };

  // Filtered wires from live simulation
  const filteredWires = updatedWires.filter((w) => {
    if (wireFilter === 'ac' && !['ac_phase', 'ac_neutral', 'pe_ground'].includes(w.netType)) return false;
    if (wireFilter === 'dc' && !['dc_positive', 'dc_negative'].includes(w.netType)) return false;
    if (wireFilter === 'control' && !['control_signal', 'analog_signal'].includes(w.netType)) return false;

    if (wireSearch) {
      const q = wireSearch.toLowerCase();
      return (
        w.wireTag.toLowerCase().includes(q) ||
        w.fromComponentTag.toLowerCase().includes(q) ||
        w.toComponentTag.toLowerCase().includes(q) ||
        w.fromTerminal.toLowerCase().includes(q) ||
        w.toTerminal.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate live virtual probe readings
  const probeReading = useMemo(() => {
    if (!selectedProbeTerminal) return { voltage: '0.0 V', type: 'Sem contacto', status: 'Desconectado' };
    const [tag, term] = selectedProbeTerminal.split(':');
    const comp = allComponents.find((c) => c.tag === tag);

    if (!updatedState.isPowered || !updatedState.isMainBreakerOn || updatedState.isRcdTripped) {
      return { voltage: '0.00 V AC/DC', type: 'Sem Tensão', status: 'Circuito Desenergizado (Corte Geral ou Diferencial)' };
    }

    if (term === 'L' || term === 'L1' || term === '1' || term === '2') {
      return { voltage: `${updatedState.measuredAcVoltage} V AC`, type: 'Fase AC (50Hz)', status: 'Tensão Nominal Normal' };
    }
    if (term === 'N' || term === 'N-in' || term === 'N-out') {
      return { voltage: '0.12 V AC', type: 'Neutro AC', status: 'Referência de Neutro' };
    }
    if (term === 'PE') {
      return { voltage: '0.00 V', type: 'Terra Proteção PE', status: 'Equipotencial de Proteção Ligado' };
    }
    if (term === '+V' || term === 'L+') {
      return { 
        voltage: updatedState.isPsuHealthy ? `${updatedState.measuredDcVoltage} V DC` : '0.0 V DC', 
        type: 'Alimentação +24V DC', 
        status: updatedState.isPsuHealthy ? 'Fonte Mean Well DC OK' : 'Fonte em Falha' 
      };
    }
    if (term === '-V' || term === 'M') {
      return { voltage: '0.00 V DC', type: 'Massa 0V DC', status: 'Referência Comum 24V' };
    }
    if (term?.startsWith('DQ')) {
      const isHigh = Boolean(updatedState.digitalOutputs['DQ0']);
      return { voltage: isHigh ? '24.0 V DC' : '0.0 V DC', type: 'Saída Digital Transístor/Relé', status: isHigh ? 'ATIVO (HIGH)' : 'INATIVO (LOW)' };
    }
    if (term?.startsWith('DI')) {
      const isHigh = Boolean(updatedState.digitalInputs['DI0']);
      return { voltage: isHigh ? '24.0 V DC' : '0.0 V DC', type: 'Entrada Digital 24VDC', status: isHigh ? 'SINAL PRESENTE (HIGH)' : 'EM REPOUSO (LOW)' };
    }

    return { voltage: `${updatedState.measuredDcVoltage} V DC`, type: 'Circuito Auxiliar', status: 'Condução Ativa' };
  }, [selectedProbeTerminal, updatedState, allComponents]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden rounded-lg border border-slate-800 shadow-2xl">
      {/* Top Test Bench Action Strip */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg text-white shadow-md">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>BANCADA DE TESTES & SIMULAÇÃO DE LIGAÇÕES ELÉTRICAS</span>
              <span className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded-full font-bold ${
                updatedState.isPowered && updatedState.isMainBreakerOn && !updatedState.isRcdTripped
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {updatedState.isPowered && updatedState.isMainBreakerOn && !updatedState.isRcdTripped ? '● QUADRO ENERGIZADO' : '○ QUADRO DESLIGADO'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Simule a passagem de corrente, ative comandos PLC, excite relés e inspecione a fiação de-para.
            </p>
          </div>
        </div>

        {/* Global Control Switches */}
        <div className="flex items-center gap-2">
          {/* Main Power Switch */}
          <button
            type="button"
            onClick={togglePower}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all shadow-md ${
              simState.isPowered
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Liga ou desliga a alimentação elétrica de entrada da rede pública"
          >
            <Power className="w-4 h-4" />
            <span>{simState.isPowered ? 'Rede AC 230V: ON' : 'Rede AC: OFF'}</span>
          </button>

          {/* Reset simulation */}
          <button
            type="button"
            onClick={resetSimulation}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
            title="Repor valores iniciais de fábrica da simulação"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>Repor</span>
          </button>

          {/* Export Cable Schedule */}
          <button
            type="button"
            onClick={handleExportWireScheduleCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
            title="Descarregar folha de cálculo CSV da lista de cablagem"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Exportar Cablagem CSV</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Control Cockpit + Center/Right Wires & Diagram */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Column: Interactive Component Controls & Digital Multimeter (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Digital Multimeter & Live Probe Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  MULTÍMETRO DIGITAL VIRTUAL (RMS)
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                AUTO-RANGE
              </span>
            </div>

            {/* Big LED Multimeter Screen */}
            <div className="mt-3 p-3.5 bg-black/80 rounded-lg border border-emerald-950 font-mono flex items-center justify-between shadow-inner">
              <div>
                <div className="text-[10px] text-emerald-600 uppercase">Ponta de Prova em:</div>
                <div className="text-sm font-bold text-emerald-300 flex items-center gap-1">
                  <span>{selectedProbeTerminal || 'Nenhum'}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{probeReading.type}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black tracking-widest text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                  {probeReading.voltage}
                </div>
                <div className="text-[10px] text-emerald-500/80">{probeReading.status}</div>
              </div>
            </div>

            {/* Quick Terminal Probe Selectors */}
            <div className="mt-3">
              <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                Selecionar Borne para Medição de Tensão:
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[
                  { label: 'Q1:2 (Fase)', term: 'Q1:2' },
                  { label: 'Q1:N (Neutro)', term: 'Q1:N-out' },
                  { label: 'G1:+V (+24V)', term: 'G1:+V' },
                  { label: 'G1:-V (0V)', term: 'G1:-V' },
                  { label: 'A1:L+ (PLC)', term: 'A1:L+' },
                  { label: 'A1:DQ0 (Saída)', term: 'A1:DQ 0.0' },
                  { label: 'K1:A1 (Relé)', term: 'K1:A1' },
                  { label: 'X1:PE (Terra)', term: 'X1:PE' },
                ].map((p) => (
                  <button
                    key={p.term}
                    type="button"
                    onClick={() => setSelectedProbeTerminal(p.term)}
                    className={`px-2 py-1.5 text-[11px] font-mono rounded border transition text-center truncate ${
                      selectedProbeTerminal === p.term
                        ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Switchgear & Protection Unit */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase font-mono mb-3 flex items-center justify-between">
              <span>PROTEÇÃO & APARAGEM AC (230V/400V)</span>
              <span className="text-[10px] text-slate-500 font-normal">Clique nas alavancas para testar</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Disjuntor Geral Q1 */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Disjuntor Geral Q1</span>
                    <span className="text-[10px] text-slate-400">Curva C 1P+N 16A</span>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${simState.isMainBreakerOn ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-red-500'}`} />
                </div>
                <button
                  type="button"
                  onClick={toggleMainBreaker}
                  className={`mt-3 w-full py-1.5 px-3 rounded text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 ${
                    simState.isMainBreakerOn
                      ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                      : 'bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-700'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{simState.isMainBreakerOn ? 'ARMADO (ON)' : 'DESARMADO (OFF)'}</span>
                </button>
              </div>

              {/* Diferencial Residual F1 (RCD 30mA) */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Diferencial F1</span>
                    <span className="text-[10px] text-slate-400">30mA Classe A</span>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${!simState.isRcdTripped ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 animate-ping'}`} />
                </div>
                <button
                  type="button"
                  onClick={toggleRcdTrip}
                  className={`mt-3 w-full py-1.5 px-3 rounded text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 ${
                    simState.isRcdTripped
                      ? 'bg-amber-900/60 text-amber-300 border border-amber-600 hover:bg-amber-800'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{simState.isRcdTripped ? 'DISPARADO (TESTE T)' : 'DISPARAR TESTE (T)'}</span>
                </button>
              </div>
            </div>

            {/* Paragem de Emergência */}
            <div className="mt-3 p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                  ⛔
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Cogumelo de Emergência (E-STOP)</span>
                  <span className="text-[10px] text-slate-400">Corte de Categoria 0 (Paragem Imediata)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleEmergencyStop}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                  simState.isEmergencyStopActive
                    ? 'bg-red-600 text-white border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {simState.isEmergencyStopActive ? 'PREMIDO (BLOQUEADO)' : 'NORMAL'}
              </button>
            </div>
          </div>

          {/* Interactive Automation Controller: PLC & Relays */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  COMANDO & AUTOMAÇÃO (SIEMENS S7 / RELÉS FINDER)
                </span>
              </div>
              <button
                type="button"
                onClick={togglePlcMode}
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold transition ${
                  updatedState.plcMode === 'RUN'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                    : 'bg-amber-950 text-amber-400 border border-amber-700'
                }`}
              >
                PLC: {updatedState.plcMode}
              </button>
            </div>

            {/* Field Pushbuttons Simulator (Marcha / Paragem) */}
            <div className="mt-3">
              <span className="text-[11px] font-semibold text-slate-300 block mb-2">
                Simulador de Botoneira de Campo (Entradas Bornes Viking):
              </span>
              <div className="grid grid-cols-2 gap-2">
                {/* Botão de Marcha (DI 0.0) */}
                <button
                  type="button"
                  onMouseDown={() => toggleDigitalInput('DI0')}
                  onMouseUp={() => toggleDigitalInput('DI0')}
                  className={`p-3 rounded-lg border transition-all text-left flex items-center justify-between shadow-md active:scale-95 ${
                    simState.digitalInputs['DI0']
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_#10b981]'
                      : 'bg-slate-950/80 hover:bg-slate-800 text-slate-200 border-slate-800'
                  }`}
                  title="Pressione e mantenha para simular botão de arranque NA"
                >
                  <div>
                    <span className="text-xs font-bold block">🟢 Botão Marcha</span>
                    <span className="text-[10px] text-slate-400 font-mono">Entrada DI 0.0 (NA)</span>
                  </div>
                  <span className="text-xs font-mono font-bold">
                    {simState.digitalInputs['DI0'] ? 'ATIVO' : 'PREMIR'}
                  </span>
                </button>

                {/* Botão de Paragem (DI 0.1) */}
                <button
                  type="button"
                  onClick={() => toggleDigitalInput('DI1')}
                  className={`p-3 rounded-lg border transition-all text-left flex items-center justify-between shadow-md ${
                    simState.digitalInputs['DI1']
                      ? 'bg-red-600 text-white border-red-400 shadow-[0_0_12px_#ef4444]'
                      : 'bg-slate-950/80 hover:bg-slate-800 text-slate-200 border-slate-800'
                  }`}
                  title="Clique para alternar botão de paragem NF"
                >
                  <div>
                    <span className="text-xs font-bold block">🔴 Botão Paragem</span>
                    <span className="text-[10px] text-slate-400 font-mono">Entrada DI 0.1 (NF)</span>
                  </div>
                  <span className="text-xs font-mono font-bold">
                    {simState.digitalInputs['DI1'] ? 'ABERTO' : 'FECHADO'}
                  </span>
                </button>
              </div>
            </div>

            {/* Actuators / Output Status (PLC DQ -> Finder Relay K1 -> Load) */}
            <div className="mt-3 p-3 bg-slate-950/90 rounded-lg border border-slate-800 font-mono text-xs">
              <div className="text-[11px] font-bold text-slate-400 mb-2 uppercase flex items-center justify-between">
                <span>ESTADO DOS ATUADORES & BOBINAS:</span>
                <span className="text-[10px] text-sky-400">Tempo de Ciclo: 1.2ms</span>
              </div>
              
              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-300">Saída PLC DQ 0.0 (Comando K1):</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  updatedState.digitalOutputs['DQ0']
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {updatedState.digitalOutputs['DQ0'] ? '● HIGH (24V)' : '○ LOW (0V)'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-300">Relé Interface K1 (Finder / 24V):</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                  updatedState.relayStates['K1']
                    ? 'bg-emerald-600 text-white font-extrabold shadow-[0_0_8px_#10b981]'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  <span>{updatedState.relayStates['K1'] ? 'BOBINA EXCITADA (11-14 FECHADO)' : 'DESENERGIZADO'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300">Borne de Campo Viking (X1:10 Força):</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  updatedState.relayStates['K1']
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {updatedState.relayStates['K1'] ? '⚡ CARGA / MOTOR LIGADO' : 'SEM ALIMENTAÇÃO'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Complete Interactive Wire List & Cable Schedule (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {/* Main Mode Switcher Bar (Recharts Telemetry vs Cable Schedule Table) */}
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg font-bold">
              <button
                type="button"
                onClick={() => setRightPanelTab('charts')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition ${
                  rightPanelTab === 'charts'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-sky-300" />
                <span>Gráficos de Corrente (Recharts)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AO VIVO
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRightPanelTab('wires')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition ${
                  rightPanelTab === 'wires'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5 text-blue-300" />
                <span>Tabela de Fiação ({updatedWires.length})</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                updatedState.isPowered && updatedState.isMainBreakerOn && !updatedState.isRcdTripped
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-red-400'
              }`} />
              <span>
                {updatedState.isPowered && updatedState.isMainBreakerOn && !updatedState.isRcdTripped
                  ? 'Telemetria em Amperes Ativa'
                  : 'Sem Corrente (0A)'}
              </span>
            </div>
          </div>

          {rightPanelTab === 'charts' ? (
            <div className="flex-1 overflow-hidden p-0 flex flex-col">
              <CurrentSimulationChart
                project={project}
                simState={updatedState}
                isEnergized={Boolean(updatedState.isPowered && updatedState.isMainBreakerOn && !updatedState.isRcdTripped)}
                isMotorRunning={Boolean(updatedState.relayStates['K1'])}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header of Wire Table */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
                    <span>TABELA DE FIAÇÃO & LIGAÇÕES DE-PARA (CABLE SCHEDULE)</span>
                    <span className="px-2 py-0.5 bg-blue-950 text-blue-400 rounded-full text-[10px] border border-blue-800">
                      {updatedWires.length} Fios Totais
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Lista física de condutores com secções (mm²), cores de identificação segundo normas EN e estado de tensão ao vivo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddWireModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ligar Novo Fio</span>
                  </button>
                </div>
              </div>

          {/* Filtering and Search Toolbar */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setWireFilter('all')}
                className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                  wireFilter === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({updatedWires.length})
              </button>
              <button
                type="button"
                onClick={() => setWireFilter('ac')}
                className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                  wireFilter === 'ac' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Rede AC 230V / PE
              </button>
              <button
                type="button"
                onClick={() => setWireFilter('dc')}
                className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                  wireFilter === 'dc' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Barramento 24VDC
              </button>
              <button
                type="button"
                onClick={() => setWireFilter('control')}
                className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                  wireFilter === 'control' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Comando / I/O
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar por tag, borne, etc..."
                value={wireSearch}
                onChange={(e) => setWireSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 w-52"
              />
            </div>
          </div>

          {/* Wire Table Content */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/80 sticky top-0 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800 z-10">
                <tr>
                  <th className="py-2.5 px-3">Anilha (Tag)</th>
                  <th className="py-2.5 px-3">Origem (De)</th>
                  <th className="py-2.5 px-3">Destino (Para)</th>
                  <th className="py-2.5 px-3">Circuito</th>
                  <th className="py-2.5 px-3">Secção</th>
                  <th className="py-2.5 px-3 text-center">Estado Vivo</th>
                  <th className="py-2.5 px-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {filteredWires.map((wire) => {
                  const isEnergized = Boolean(wire.isEnergized);
                  const isSelected = selectedWireId === wire.id;

                  return (
                    <tr
                      key={wire.id}
                      onClick={() => setSelectedWireId(wire.id)}
                      className={`hover:bg-slate-800/60 transition cursor-pointer ${
                        isSelected ? 'bg-blue-950/40 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      {/* Wire Tag */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="w-3 h-3 rounded-full shrink-0 border border-black/50" 
                            style={{ backgroundColor: wire.color }} 
                            title={`Cor do condutor: ${wire.color}`}
                          />
                          <span className="font-bold text-white">{wire.wireTag}</span>
                        </div>
                      </td>

                      {/* From Component & Terminal */}
                      <td className="py-2 px-3 text-slate-300">
                        <span className="font-bold text-sky-400">{wire.fromComponentTag}</span>
                        <span className="text-slate-500 mx-1">:</span>
                        <span className="text-slate-300 font-semibold">{wire.fromTerminal}</span>
                      </td>

                      {/* To Component & Terminal */}
                      <td className="py-2 px-3 text-slate-300">
                        <span className="font-bold text-indigo-400">{wire.toComponentTag}</span>
                        <span className="text-slate-500 mx-1">:</span>
                        <span className="text-slate-300 font-semibold">{wire.toTerminal}</span>
                      </td>

                      {/* Net Type */}
                      <td className="py-2 px-3 text-slate-400 text-[11px]">
                        {wire.netType === 'ac_phase' && 'Fase AC (230V)'}
                        {wire.netType === 'ac_neutral' && 'Neutro AC'}
                        {wire.netType === 'pe_ground' && 'Terra PE'}
                        {wire.netType === 'dc_positive' && '+24V DC'}
                        {wire.netType === 'dc_negative' && '0V DC (M)'}
                        {wire.netType === 'control_signal' && 'Comando'}
                        {wire.netType === 'analog_signal' && 'Sinal'}
                      </td>

                      {/* Cross Section */}
                      <td className="py-2 px-3 text-slate-300">
                        <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 border border-slate-700">
                          {wire.crossSectionMm2} mm²
                        </span>
                      </td>

                      {/* Energized Status */}
                      <td className="py-2 px-3 text-center">
                        {isEnergized ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700 shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>ATIVO</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-slate-500 bg-slate-800/80">
                            0V (OFF)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWire(wire.id);
                          }}
                          className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition"
                          title="Remover fio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer of Table */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-4">
              <span>Fios Ativos: <strong className="text-emerald-400">{updatedWires.filter((w) => w.isEnergized).length}</strong></span>
              <span>Fios Sem Tensão: <strong className="text-slate-400">{updatedWires.filter((w) => !w.isEnergized).length}</strong></span>
            </div>
            <div className="text-[11px] text-slate-500">
              Norma de Fiação: EN 60204-1 (Segurança de Máquinas - Equipamento Elétrico)
            </div>
          </div>
        </div>
      )}
    </div>
  </div>

      {/* Modal to Add Custom Wire */}
      {isAddWireModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <span>Adicionar Nova Ligação de Fio Manual</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAddWireModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Identificador do Fio (Tag / Anilha):</label>
                <input
                  type="text"
                  value={newWire.tag}
                  onChange={(e) => setNewWire({ ...newWire, tag: e.target.value })}
                  placeholder="ex: W25, 24V-AUX, K1-14"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Componente Origem (De):</label>
                  <select
                    value={newWire.fromTag}
                    onChange={(e) => setNewWire({ ...newWire, fromTag: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  >
                    <option value="">-- Escolher --</option>
                    {allComponents.map((c) => (
                      <option key={c.tag} value={c.tag}>
                        {c.tag} ({c.data.name.substring(0, 20)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Borne de Origem:</label>
                  <input
                    type="text"
                    value={newWire.fromTerm}
                    onChange={(e) => setNewWire({ ...newWire, fromTerm: e.target.value })}
                    placeholder="ex: L1, +V, 14, 1"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Componente Destino (Para):</label>
                  <select
                    value={newWire.toTag}
                    onChange={(e) => setNewWire({ ...newWire, toTag: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  >
                    <option value="">-- Escolher --</option>
                    {allComponents.map((c) => (
                      <option key={c.tag} value={c.tag}>
                        {c.tag} ({c.data.name.substring(0, 20)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Borne de Destino:</label>
                  <input
                    type="text"
                    value={newWire.toTerm}
                    onChange={(e) => setNewWire({ ...newWire, toTerm: e.target.value })}
                    placeholder="ex: L, A1, 2, PE"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Tipo de Circuito:</label>
                  <select
                    value={newWire.netType}
                    onChange={(e) => {
                      const net = e.target.value as WireNetType;
                      setNewWire({ ...newWire, netType: net, color: WIRE_COLORS[net] || '#3b82f6' });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="ac_phase">Fase AC 230V (Castanho)</option>
                    <option value="ac_neutral">Neutro AC (Azul)</option>
                    <option value="pe_ground">Terra PE (Verde/Amarelo)</option>
                    <option value="dc_positive">+24V DC (Vermelho)</option>
                    <option value="dc_negative">0V DC / M (Azul escuro)</option>
                    <option value="control_signal">Comando / Relé (Laranja)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Secção (mm²):</label>
                  <select
                    value={newWire.crossSection}
                    onChange={(e) => setNewWire({ ...newWire, crossSection: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  >
                    <option value={0.75}>0.75 mm² (Sinais)</option>
                    <option value={1.0}>1.0 mm² (Controlo)</option>
                    <option value={1.5}>1.5 mm² (Força Auxiliar)</option>
                    <option value={2.5}>2.5 mm² (Potência)</option>
                    <option value={4.0}>4.0 mm² (Alimentação)</option>
                    <option value={6.0}>6.0 mm² (Geral)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddWireModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateWire}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition"
              >
                Guardar e Conectar Fio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
