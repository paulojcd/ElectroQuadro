import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProjectState, SimulationState, PlacedComponent } from '../types/electrical';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { 
  Activity, Zap, Gauge, Sliders, Play, Pause, RotateCcw, 
  AlertTriangle, TrendingUp, Cpu, Layers, BatteryCharging, 
  CheckCircle2, ArrowUpRight, ShieldAlert 
} from 'lucide-react';

export interface CurrentSimulationChartProps {
  project: ProjectState;
  simState: SimulationState;
  isEnergized: boolean;
  isMotorRunning: boolean;
}

interface TimeDataPoint {
  time: string;
  totalCurrentA: number;
  dcCurrentA: number;
  acCurrentA: number;
  motorCurrentA: number;
  psuCapacityA: number;
  mcbRatingA: number;
}

interface RailConsumptionData {
  railName: string;
  railIndex: number;
  compCount: number;
  dcCurrentA: number;
  acCurrentA: number;
  totalPowerW: number;
  components: string[];
}

export const CurrentSimulationChart: React.FC<CurrentSimulationChartProps> = ({
  project,
  simState,
  isEnergized,
  isMotorRunning,
}) => {
  const [viewType, setViewType] = useState<'timeline' | 'rails' | 'breakdown'>('timeline');
  const [isPaused, setIsPaused] = useState(false);
  const [loadPercentage, setLoadPercentage] = useState<number>(85); // 0% to 150% field load
  const [history, setHistory] = useState<TimeDataPoint[]>([]);
  const [maxPeakCurrent, setMaxPeakCurrent] = useState<number>(0);
  const previousMotorState = useRef(isMotorRunning);

  // Rated values from project
  const psuRatedA = useMemo(() => {
    const psu = project.rails.flatMap((r) => r.items).find((it) => it.data.category === 'power_supply');
    return psu?.data.ratedCurrentA || 5.0; // Mean Well NDR-120 default 5A
  }, [project]);

  const mainBreakerRatingA = useMemo(() => {
    const mcb = project.rails.flatMap((r) => r.items).find(
      (it) => it.data.category === 'protection_ac' && (it.tag.startsWith('Q1') || it.data.name.includes('Geral'))
    );
    return mcb?.data.ratedCurrentA || 16.0; // Default 16A
  }, [project]);

  // Calculate live current consumption values
  const currentReadings = useMemo(() => {
    if (!isEnergized) {
      return {
        totalA: 0.0,
        dcA: 0.0,
        acA: 0.0,
        motorA: 0.0,
        powerW: 0.0,
      };
    }

    // 1. Quiescent DC loads (PLC CPU + I/O cards + sensors + status LEDs)
    const plcItems = project.rails.flatMap((r) => r.items).filter(
      (it) => it.data.category === 'plc_cpu' || it.data.category === 'plc_expansion'
    );
    const plcDcA = plcItems.reduce((acc, it) => acc + (it.data.dcConsumptionA || 0.25), 0) || 0.35;

    // 2. Relay & Contactor control coils
    const isK1On = Boolean(simState.relayStates['K1'] || isMotorRunning);
    const relayCoilA = isK1On ? 0.08 : 0.0;

    // 3. Field Load / Motor load (scaled by user load slider)
    const loadMultiplier = loadPercentage / 100;
    const baseMotorDcA = isMotorRunning ? 1.85 * loadMultiplier : 0.0;

    // Total DC Bus Current (24VDC)
    const totalDcA = Number((plcDcA + relayCoilA + baseMotorDcA).toFixed(2));

    // AC Grid Current (PSU input + auxiliary AC loads)
    // P_in = (V_dc * I_dc) / (efficiency * cos_phi) -> approx (24 * totalDcA) / (0.88 * 0.9 * 230)
    const psuAcCurrentA = Number(((24 * totalDcA) / (0.88 * 230)).toFixed(2));
    const auxiliaryAcCurrentA = isMotorRunning ? 1.2 * loadMultiplier : 0.15;
    const totalAcA = Number((psuAcCurrentA + auxiliaryAcCurrentA).toFixed(2));

    // Combined equivalent load
    const totalA = Number((totalAcA + totalDcA * 0.1).toFixed(2));
    const powerW = Number((230 * totalAcA + 24 * totalDcA).toFixed(1));

    return {
      totalA,
      dcA: totalDcA,
      acA: totalAcA,
      motorA: baseMotorDcA,
      powerW,
    };
  }, [isEnergized, isMotorRunning, simState.relayStates, loadPercentage, project]);

  // Update peak current tracker
  useEffect(() => {
    if (currentReadings.totalA > maxPeakCurrent) {
      setMaxPeakCurrent(currentReadings.totalA);
    }
  }, [currentReadings.totalA, maxPeakCurrent]);

  // Realtime sampling interval for the timeline chart
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // Inrush spike detection: if motor just turned on in this cycle, add realistic startup surge (5x momentary)
      let currentSampleTotal = currentReadings.totalA;
      let currentSampleDc = currentReadings.dcA;

      if (!previousMotorState.current && isMotorRunning) {
        // Motor inrush spike!
        currentSampleTotal = Number((currentSampleTotal * 2.8).toFixed(2));
        currentSampleDc = Number((currentSampleDc * 2.2).toFixed(2));
      }
      previousMotorState.current = isMotorRunning;

      // Add slight industrial telemetry jitter (±1.5%) for realism when energized
      if (isEnergized && currentSampleTotal > 0) {
        const jitter = (Math.random() - 0.5) * 0.04;
        currentSampleTotal = Math.max(0.05, Number((currentSampleTotal + jitter).toFixed(2)));
        currentSampleDc = Math.max(0.05, Number((currentSampleDc + jitter * 0.5).toFixed(2)));
      }

      setHistory((prev) => {
        const nextPoint: TimeDataPoint = {
          time: timeStr,
          totalCurrentA: currentSampleTotal,
          dcCurrentA: currentSampleDc,
          acCurrentA: currentReadings.acA,
          motorCurrentA: currentReadings.motorA,
          psuCapacityA: psuRatedA,
          mcbRatingA: mainBreakerRatingA,
        };

        // Keep last 24 seconds of data points
        const next = [...prev, nextPoint];
        if (next.length > 24) {
          return next.slice(next.length - 24);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, isEnergized, isMotorRunning, currentReadings, psuRatedA, mainBreakerRatingA]);

  // Rail-by-rail consumption distribution
  const railConsumptionData: RailConsumptionData[] = useMemo(() => {
    const isK1On = Boolean(simState.relayStates['K1'] || isMotorRunning);
    const loadMult = isEnergized ? loadPercentage / 100 : 0;

    return project.rails.map((rail, idx) => {
      let dcA = 0;
      let acA = 0;
      const compNames: string[] = [];

      rail.items.forEach((item) => {
        compNames.push(`${item.tag} (${item.data.name})`);
        const cat = item.data.category;

        if (isEnergized) {
          if (cat === 'power_supply') {
            acA += 0.45 * (isMotorRunning ? 1.5 : 0.8);
          } else if (cat === 'plc_cpu' || cat === 'plc_expansion') {
            dcA += item.data.dcConsumptionA || 0.25;
          } else if (cat === 'relays' || cat === 'motor_control') {
            if (isK1On) {
              dcA += 0.08;
              acA += 1.2 * loadMult; // Motor contactor load
            }
          } else if (cat === 'protection_ac') {
            // Breakers pass total AC current
            acA += 0.05;
          } else if (cat === 'terminals') {
            if (isK1On) {
              dcA += 0.15 * loadMult;
            }
          }
        }
      });

      const totalPowerW = Number((acA * 230 + dcA * 24).toFixed(1));

      return {
        railName: rail.name || `Calha ${idx + 1}`,
        railIndex: idx + 1,
        compCount: rail.items.length,
        dcCurrentA: Number(dcA.toFixed(2)),
        acCurrentA: Number(acA.toFixed(2)),
        totalPowerW,
        components: compNames,
      };
    });
  }, [project.rails, isEnergized, isMotorRunning, simState.relayStates, loadPercentage]);

  // Category breakdown for Pie Chart
  const categoryBreakdown = useMemo(() => {
    if (!isEnergized) {
      return [
        { name: 'Sem Carga (Desenergizado)', value: 1, color: '#475569' },
      ];
    }

    const loadMult = loadPercentage / 100;
    const isK1On = Boolean(simState.relayStates['K1'] || isMotorRunning);

    const data = [
      { 
        name: 'Automação & PLC Siemens (24V)', 
        value: Number((0.35).toFixed(2)), 
        color: '#0ea5e9' // sky-500
      },
      { 
        name: 'Relés de Comando & Bobinas', 
        value: Number((isK1On ? 0.08 : 0.02).toFixed(2)), 
        color: '#8b5cf6' // purple-500
      },
      { 
        name: 'Carga de Campo / Motor (Sirius)', 
        value: Number((isMotorRunning ? 1.85 * loadMult : 0).toFixed(2)), 
        color: '#10b981' // emerald-500
      },
      { 
        name: 'Fonte Mean Well & Perdas AC', 
        value: Number((currentReadings.acA).toFixed(2)), 
        color: '#f59e0b' // amber-500
      },
    ].filter((it) => it.value > 0);

    return data.length > 0 ? data : [{ name: 'Sem Carga', value: 0.1, color: '#64748b' }];
  }, [isEnergized, isMotorRunning, simState.relayStates, loadPercentage, currentReadings.acA]);

  const psuLoadingPercentage = psuRatedA > 0 ? Math.min(100, Math.round((currentReadings.dcA / psuRatedA) * 100)) : 0;
  const isPsuOverloaded = currentReadings.dcA > psuRatedA;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl text-slate-100">
      {/* Top Header & Visual Controls */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <span>ANALISADOR GRÁFICO DE CORRENTE & CARGA (RECHARTS)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                DIN 24V / 230V
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Visualização instantânea de corrente (A), picos de arranque e distribuição por seção de calha DIN.
            </p>
          </div>
        </div>

        {/* View Mode Selector Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewType('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                viewType === 'timeline'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ver gráfico temporal de corrente ao vivo (osciloscópio contínuo)"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Ao Longo do Tempo</span>
            </button>

            <button
              type="button"
              onClick={() => setViewType('rails')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                viewType === 'rails'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ver consumo de corrente distribuído por cada calha DIN do quadro"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Por Seção de Calha</span>
            </button>

            <button
              type="button"
              onClick={() => setViewType('breakdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                viewType === 'breakdown'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ver distribuição percentual de corrente por tipo de equipamento"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Composição Cargas</span>
            </button>
          </div>

          {/* Timeline Controls (Pause / Reset) */}
          {viewType === 'timeline' && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
                title={isPaused ? 'Retomar osciloscópio' : 'Pausar osciloscópio'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  setMaxPeakCurrent(0);
                }}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
                title="Limpar histórico de medições"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Telemetry Strip (Key Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/60 border-b border-slate-800 text-xs shrink-0">
        {/* KPI 1: Total Current */}
        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Corrente Total (RMS)</span>
            <span className="text-lg font-black font-mono text-white mt-0.5 block flex items-baseline gap-1">
              <span>{currentReadings.totalA.toFixed(2)}</span>
              <span className="text-xs text-sky-400 font-normal">A</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Gauge className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 2: 24VDC Bus Current */}
        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Barramento 24V DC</span>
            <span className="text-lg font-black font-mono text-emerald-400 mt-0.5 block flex items-baseline gap-1">
              <span>{currentReadings.dcA.toFixed(2)}</span>
              <span className="text-xs text-emerald-400/80 font-normal">A ({psuLoadingPercentage}%)</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <BatteryCharging className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 3: Inrush / Peak Current Recorded */}
        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Pico Registado (Inrush)</span>
            <span className="text-lg font-black font-mono text-amber-300 mt-0.5 block flex items-baseline gap-1">
              <span>{maxPeakCurrent.toFixed(2)}</span>
              <span className="text-xs text-amber-400/80 font-normal">A</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 4: Power Dissipation */}
        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Potência Ativa Total</span>
            <span className="text-lg font-black font-mono text-purple-300 mt-0.5 block flex items-baseline gap-1">
              <span>{currentReadings.powerW.toFixed(0)}</span>
              <span className="text-xs text-purple-400/80 font-normal">W</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Zap className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-[300px]">
        {/* ========================================================
            VIEW 1: TIMELINE / OSCILLOSCOPE (AO LONGO DO TEMPO)
           ======================================================== */}
        {viewType === 'timeline' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between text-xs mb-2 px-1 text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Osciloscópio de Amperes em Tempo Real (Amostragem a 1Hz)</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Linha tracejada vermelha = Limite da Fonte ({psuRatedA}A)
              </span>
            </div>

            <div className="flex-1 w-full min-h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorDc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#64748b" 
                    fontSize={10} 
                    fontFamily="JetBrains Mono"
                    tickMargin={6}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    fontFamily="JetBrains Mono"
                    unit=" A"
                    domain={[0, Math.max(psuRatedA + 1, Math.ceil(maxPeakCurrent + 1))]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                    formatter={(val: any, name: any) => {
                      const num = Number(val).toFixed(2);
                      if (name === 'totalCurrentA') return [`${num} A`, 'Corrente Total (RMS)'];
                      if (name === 'dcCurrentA') return [`${num} A`, 'Barramento 24VDC'];
                      if (name === 'acCurrentA') return [`${num} A`, 'Rede 230V AC'];
                      return [`${num} A`, name];
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={30} 
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} 
                  />
                  {/* Maximum rated safety thresholds */}
                  <ReferenceLine 
                    y={psuRatedA} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    label={{ 
                      value: `Limite Fonte Mean Well (${psuRatedA}A)`, 
                      fill: '#ef4444', 
                      fontSize: 10, 
                      position: 'insideTopRight' 
                    }} 
                  />
                  <Area
                    type="monotone"
                    dataKey="totalCurrentA"
                    name="Corrente Total (A)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="dcCurrentA"
                    name="Carga 24V DC (A)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDc)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 2: CONSUMPTION BY DIN RAIL SECTION (BAR CHART)
           ======================================================== */}
        {viewType === 'rails' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between text-xs mb-2 px-1 text-slate-400 font-mono">
              <span>Distribuição de Corrente Elétrica por Seção de Calha DIN</span>
              <span className="text-[11px] text-slate-500">
                Total de Calhas: {railConsumptionData.length}
              </span>
            </div>

            <div className="flex-1 w-full min-h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={railConsumptionData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="railName" 
                    stroke="#94a3b8" 
                    fontSize={11}
                    fontFamily="Plus Jakarta Sans"
                    tickMargin={8}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    fontFamily="JetBrains Mono"
                    unit=" A"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                    formatter={(val: any, name: any) => {
                      const num = Number(val).toFixed(2);
                      if (name === 'dcCurrentA') return [`${num} A`, 'Corrente 24V DC'];
                      if (name === 'acCurrentA') return [`${num} A`, 'Corrente 230V AC'];
                      if (name === 'totalPowerW') return [`${val} W`, 'Potência Dissipada'];
                      return [`${val}`, name];
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={30} 
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} 
                  />
                  <Bar 
                    dataKey="dcCurrentA" 
                    name="Carga 24V DC (A)" 
                    fill="#38bdf8" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="acCurrentA" 
                    name="Carga 230V AC (A)" 
                    fill="#f59e0b" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 3: LOAD CATEGORY BREAKDOWN (PIE / DONUT)
           ======================================================== */}
        {viewType === 'breakdown' && (
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono',
                    }}
                    formatter={(val: any) => [`${Number(val).toFixed(2)} A`, 'Consumo']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend Cards */}
            <div className="flex-1 space-y-2 text-xs font-mono w-full">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-sans">
                Discriminação por Grupo de Equipamentos:
              </span>
              {categoryBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 font-sans text-xs">{item.name}</span>
                  </div>
                  <strong className="text-white font-bold">{item.value.toFixed(2)} A</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Field Load Slider & Simulation Controls */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold shrink-0">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Simulador de Carga de Campo (Motor / Atuador):</span>
          </div>
          <input
            type="range"
            min="0"
            max="150"
            step="5"
            value={loadPercentage}
            onChange={(e) => setLoadPercentage(Number(e.target.value))}
            className="flex-1 accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
            loadPercentage > 100 
              ? 'bg-red-950 text-red-400 border border-red-700 animate-pulse' 
              : 'bg-slate-800 text-sky-300'
          }`}>
            {loadPercentage}% {loadPercentage > 100 ? 'SOBRECARGA' : 'CARGA'}
          </span>
        </div>

        {/* Warning if overload */}
        {isPsuOverloaded && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/80 border border-red-500/50 rounded-lg text-red-300 font-mono text-[11px] animate-bounce">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>AVISO: Carga 24V excede a capacidade de {psuRatedA}A da fonte!</span>
          </div>
        )}
      </div>
    </div>
  );
};
