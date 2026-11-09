import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlacedComponent, ComponentCategory } from '../types/electrical';
import { 
  Cpu, Zap, BatteryCharging, ShieldAlert, ToggleLeft, 
  Layers, Box, Activity, HelpCircle, Flame, DollarSign, Tag, Info
} from 'lucide-react';

interface ComponentTechnicalTooltipProps {
  item: PlacedComponent | null;
  railIndex: number;
  // Position coordinates in canvas container pixel space
  coords: { x: number; y: number } | null;
  containerWidth: number;
  containerHeight: number;
}

/**
 * Returns user-friendly category title, icon and color scheme
 */
export function getCategoryBadgeInfo(category: ComponentCategory): {
  label: string;
  color: string;
  bg: string;
  border: string;
  Icon: React.ElementType;
} {
  switch (category) {
    case 'power_supply':
      return {
        label: 'Fonte de Alimentação',
        color: 'text-sky-300',
        bg: 'bg-sky-950/80',
        border: 'border-sky-700/60',
        Icon: BatteryCharging,
      };
    case 'plc_cpu':
      return {
        label: 'Autómato / PLC CPU',
        color: 'text-teal-300',
        bg: 'bg-teal-950/80',
        border: 'border-teal-700/60',
        Icon: Cpu,
      };
    case 'plc_expansion':
      return {
        label: 'Módulo Expansão PLC',
        color: 'text-teal-300',
        bg: 'bg-teal-950/80',
        border: 'border-teal-700/60',
        Icon: Cpu,
      };
    case 'protection_ac':
      return {
        label: 'Proteção AC (Disjuntor/RCD)',
        color: 'text-amber-300',
        bg: 'bg-amber-950/80',
        border: 'border-amber-700/60',
        Icon: Zap,
      };
    case 'protection_dc':
      return {
        label: 'Proteção DC / Fusível',
        color: 'text-red-300',
        bg: 'bg-red-950/80',
        border: 'border-red-700/60',
        Icon: ShieldAlert,
      };
    case 'relays':
      return {
        label: 'Relé de Interface / Comando',
        color: 'text-indigo-300',
        bg: 'bg-indigo-950/80',
        border: 'border-indigo-700/60',
        Icon: ToggleLeft,
      };
    case 'motor_control':
      return {
        label: 'Arranque / Comando Motor',
        color: 'text-orange-300',
        bg: 'bg-orange-950/80',
        border: 'border-orange-700/60',
        Icon: Activity,
      };
    case 'safety_relays':
      return {
        label: 'Relé de Segurança',
        color: 'text-rose-300',
        bg: 'bg-rose-950/80',
        border: 'border-rose-700/60',
        Icon: ShieldAlert,
      };
    case 'terminals':
      return {
        label: 'Borne de Ligação (Viking)',
        color: 'text-emerald-300',
        bg: 'bg-emerald-950/80',
        border: 'border-emerald-700/60',
        Icon: Layers,
      };
    case 'residential_modular':
      return {
        label: 'Aparelhagem Modular',
        color: 'text-blue-300',
        bg: 'bg-blue-950/80',
        border: 'border-blue-700/60',
        Icon: Box,
      };
    case 'accessories':
      return {
        label: 'Acessório de Quadro',
        color: 'text-slate-300',
        bg: 'bg-slate-900',
        border: 'border-slate-700',
        Icon: Info,
      };
    default:
      return {
        label: 'Componente Elétrico',
        color: 'text-slate-300',
        bg: 'bg-slate-900',
        border: 'border-slate-700',
        Icon: HelpCircle,
      };
  }
}

/**
 * Formats power rating into a clean user-facing technical string
 */
export function getComponentPowerRating(item: PlacedComponent): {
  primary: string;
  context: string;
  isProvider: boolean;
} {
  const d = item.data;

  // 1. Power Supply (Mean Well) -> Provides power
  if (d.category === 'power_supply') {
    const w = d.ratedPowerW || (d.ratedCurrentA && d.outputVoltage?.includes('24') ? d.ratedCurrentA * 24 : 120);
    const a = d.ratedCurrentA || (w / 24);
    return {
      primary: `${w} W`,
      context: `Fornece ${a.toFixed(1)}A @ 24V DC`,
      isProvider: true,
    };
  }

  // 2. Motor Control & Contactors
  if (d.category === 'motor_control') {
    if (d.ratedPowerW) {
      const kw = d.ratedPowerW >= 1000 ? `${(d.ratedPowerW / 1000).toFixed(1)} kW` : `${d.ratedPowerW} W`;
      return {
        primary: kw,
        context: 'Capacidade AC-3 / 400V',
        isProvider: false,
      };
    }
    if (d.ratedCurrentA) {
      // Approximate 3-phase motor power for AC-3: P = sqrt(3) * 400 * I * 0.85
      const approxW = Math.round(Math.sqrt(3) * 400 * d.ratedCurrentA * 0.85);
      const kw = (approxW / 1000).toFixed(1);
      return {
        primary: `${kw} kW`,
        context: `Nominal AC-3 (${d.ratedCurrentA}A)`,
        isProvider: false,
      };
    }
  }

  // 3. PLC CPU (Siemens S7-1200 / LOGO!)
  if (d.category === 'plc_cpu') {
    const w = d.ratedPowerW || d.dcConsumptionW || 12;
    return {
      primary: `${w} W`,
      context: 'Consumo CPU + I/O (24V DC)',
      isProvider: false,
    };
  }

  // 4. PLC Expansion Module
  if (d.category === 'plc_expansion') {
    const w = d.ratedPowerW || d.dcConsumptionW || 4.5;
    return {
      primary: `${w} W`,
      context: 'Consumo Módulo (24V DC)',
      isProvider: false,
    };
  }

  // 5. Protection AC (Disjuntores / RCDs)
  if (d.category === 'protection_ac') {
    const inA = d.ratedCurrentA || 16;
    const dissW = inA >= 25 ? 3.8 : inA >= 16 ? 2.6 : 1.8;
    return {
      primary: `~${dissW} W`,
      context: 'Dissipação Térmica (IEC 60898)',
      isProvider: false,
    };
  }

  // 6. Relays & Safety Relays
  if (d.category === 'relays' || d.category === 'safety_relays') {
    return {
      primary: '0.8 W',
      context: 'Consumo Bobina (24V DC)',
      isProvider: false,
    };
  }

  // 7. Generic Fallbacks
  if (d.ratedPowerW) {
    const kw = d.ratedPowerW >= 1000 ? `${(d.ratedPowerW / 1000).toFixed(1)} kW` : `${d.ratedPowerW} W`;
    return {
      primary: kw,
      context: 'Potência Nominal',
      isProvider: false,
    };
  }

  if (d.dcConsumptionW) {
    return {
      primary: `${d.dcConsumptionW} W`,
      context: 'Consumo 24V DC',
      isProvider: false,
    };
  }

  return {
    primary: '-- W',
    context: 'Passivo / Não aplicável',
    isProvider: false,
  };
}

/**
 * Formats operating current rating into a clean user-facing technical string
 */
export function getComponentOperatingCurrent(item: PlacedComponent): {
  primary: string;
  context: string;
} {
  const d = item.data;

  if (d.category === 'power_supply') {
    const a = d.ratedCurrentA || 5.0;
    return {
      primary: `${a.toFixed(1)} A`,
      context: 'Capacidade Saída 24V DC',
    };
  }

  if (d.category === 'protection_ac' || d.category === 'protection_dc') {
    const inA = d.ratedCurrentA || 16;
    const curve = d.curve ? `Curva ${d.curve}` : '';
    const poles = d.poles ? `${d.poles}` : '';
    return {
      primary: `${inA} A`,
      context: [curve, poles, d.breakingCapacityKa ? `${d.breakingCapacityKa}kA` : ''].filter(Boolean).join(' · ') || 'Calibre Nominal',
    };
  }

  if (d.category === 'motor_control') {
    if (d.ratedCurrentA) {
      return {
        primary: `${d.ratedCurrentA} A`,
        context: 'Corrente Operação (AC-3)',
      };
    }
  }

  if (d.ratedCurrentA) {
    return {
      primary: `${d.ratedCurrentA} A`,
      context: 'Corrente Nominal (In)',
    };
  }

  if (d.dcConsumptionA) {
    return {
      primary: `${d.dcConsumptionA.toFixed(2)} A`,
      context: 'Corrente Consumida (24V DC)',
    };
  }

  return {
    primary: '-- A',
    context: 'Sem carga nominal direta',
  };
}

/**
 * Returns brand badge color styles
 */
export function getBrandBadgeStyle(brand: string): string {
  const b = brand.toLowerCase();
  if (b.includes('siemens')) return 'bg-teal-950/90 text-teal-300 border-teal-600/70';
  if (b.includes('schneider')) return 'bg-emerald-950/90 text-emerald-300 border-emerald-600/70';
  if (b.includes('mean well') || b.includes('meanwell')) return 'bg-sky-950/90 text-sky-300 border-sky-600/70';
  if (b.includes('legrand')) return 'bg-red-950/90 text-red-300 border-red-600/70';
  if (b.includes('abb')) return 'bg-rose-950/90 text-rose-300 border-rose-600/70';
  if (b.includes('eaton')) return 'bg-blue-950/90 text-blue-300 border-blue-600/70';
  if (b.includes('hager')) return 'bg-orange-950/90 text-orange-300 border-orange-600/70';
  if (b.includes('weidmuller') || b.includes('weidmüller') || b.includes('phoenix')) return 'bg-amber-950/90 text-amber-300 border-amber-600/70';
  if (b.includes('finder')) return 'bg-indigo-950/90 text-indigo-300 border-indigo-600/70';
  return 'bg-slate-850 text-slate-300 border-slate-700';
}

export const ComponentTechnicalTooltip: React.FC<ComponentTechnicalTooltipProps> = ({
  item,
  railIndex,
  coords,
  containerWidth,
  containerHeight,
}) => {
  if (!item || !coords) return null;

  const badge = getCategoryBadgeInfo(item.data.category);
  const power = getComponentPowerRating(item);
  const current = getComponentOperatingCurrent(item);
  const brandStyle = getBrandBadgeStyle(item.data.brand || '');
  const Icon = badge.Icon;

  // Tooltip dimensions for collision detection & positioning
  const tooltipWidth = 330;
  const tooltipHeight = 210;
  const offset = 14;

  // Calculate safe X and Y so tooltip stays within the container viewport
  let left = coords.x - tooltipWidth / 2;
  let top = coords.y - tooltipHeight - offset;
  let isPlacedBelow = false;

  // If too close to the top of the canvas, position below the cursor
  if (top < 12) {
    top = coords.y + offset + 12;
    isPlacedBelow = true;
  }

  // Clamp horizontally so it doesn't overflow left or right
  if (left < 16) {
    left = 16;
  } else if (left + tooltipWidth > containerWidth - 16) {
    left = containerWidth - tooltipWidth - 16;
  }

  // Also clamp vertically if placed below and exceeds container
  if (isPlacedBelow && top + tooltipHeight > containerHeight - 16) {
    top = Math.max(12, containerHeight - tooltipHeight - 16);
  }

  const voltageText = item.data.inputVoltage && item.data.outputVoltage
    ? `${item.data.inputVoltage} ➔ ${item.data.outputVoltage}`
    : item.data.inputVoltage || item.data.outputVoltage || '230V AC';

  return (
    <AnimatePresence>
      <motion.div
        key={item.instanceId}
        initial={{ opacity: 0, scale: 0.94, y: isPlacedBelow ? -6 : 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: isPlacedBelow ? -4 : 4 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: `${tooltipWidth}px`,
          zIndex: 60,
          pointerEvents: 'none',
        }}
        className="rounded-xl shadow-2xl backdrop-blur-md bg-slate-950/95 border border-slate-700/80 text-slate-100 overflow-hidden font-sans ring-1 ring-white/10"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 gap-2">
          {/* Category Badge */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg} ${badge.border} ${badge.color}`}>
            <Icon className="w-3 h-3" />
            <span className="truncate max-w-[140px]">{badge.label}</span>
          </div>

          {/* Component Tag & Fabricante Badge */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/80 font-bold">
              {item.tag}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${brandStyle} truncate max-w-[110px]`}>
              {item.data.brand || 'Genérico'}
            </span>
          </div>
        </div>

        {/* Component Title & Model */}
        <div className="px-3 pt-2 pb-1.5">
          <h4 className="text-xs font-bold text-white leading-snug truncate" title={item.data.name}>
            {item.data.name}
          </h4>
          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
            Ref: <span className="text-amber-300 font-bold">{item.data.partNumber || 'N/D'}</span>
            {item.data.series ? ` · Série ${item.data.series}` : ''}
          </p>
        </div>

        {/* 4 Key Technical Parameters Grid */}
        <div className="grid grid-cols-2 gap-2 px-3 pb-2 text-[11px]">
          {/* Metric 1: Fabricante (Explicitly highlighted as requested) */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-slate-400">
              <Tag className="w-2.5 h-2.5 text-blue-400" />
              <span>Fabricante</span>
            </div>
            <div className="font-bold text-white text-[11px] truncate mt-0.5" title={item.data.brand}>
              {item.data.brand || 'Genérico'}
            </div>
            <div className="text-[9px] text-slate-400 truncate">
              {item.data.partNumber || 'Referência comercial'}
            </div>
          </div>

          {/* Metric 2: Potência Nominal (Explicitly highlighted as requested) */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-slate-400">
              <Flame className={`w-2.5 h-2.5 ${power.isProvider ? 'text-emerald-400' : 'text-orange-400'}`} />
              <span>Potência Nominal</span>
            </div>
            <div className={`font-mono font-bold text-[11px] truncate mt-0.5 ${power.isProvider ? 'text-emerald-300' : 'text-orange-300'}`}>
              {power.primary}
            </div>
            <div className="text-[9px] text-slate-400 truncate">
              {power.context}
            </div>
          </div>

          {/* Metric 3: Corrente de Operação (Explicitly highlighted as requested) */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-slate-400">
              <Activity className="w-2.5 h-2.5 text-sky-400" />
              <span>Corrente de Operação</span>
            </div>
            <div className="font-mono font-bold text-sky-300 text-[11px] truncate mt-0.5">
              {current.primary}
            </div>
            <div className="text-[9px] text-slate-400 truncate">
              {current.context}
            </div>
          </div>

          {/* Metric 4: Tensão de Serviço & Terminais */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-slate-400">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              <span>Tensão / Terminais</span>
            </div>
            <div className="font-medium text-slate-200 text-[11px] truncate mt-0.5">
              {voltageText}
            </div>
            <div className="text-[9px] text-slate-400 truncate" title={item.data.terminalsSummary || 'Terminais padrão'}>
              {item.data.terminalsSummary || `${item.data.widthMm}mm (${item.data.dinModules}M)`}
            </div>
          </div>
        </div>

        {/* Location & Interaction Hint Footer */}
        <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Calha {railIndex + 1} · X: {Math.round(item.positionMm)}mm</span>
            <span className="text-slate-500">|</span>
            <span>{item.data.widthMm}×{item.data.heightMm || 90}mm</span>
          </div>
          <span className="text-slate-400 font-medium">Clique p/ selecionar</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
