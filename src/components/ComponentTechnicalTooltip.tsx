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
 * Calculates estimated power consumption or thermal dissipation
 */
export function getComponentPowerConsumption(item: PlacedComponent): {
  display: string;
  isProvider?: boolean;
} {
  const d = item.data;

  // 1. Power Supply (Mean Well) -> Provides DC power
  if (d.category === 'power_supply') {
    const w = d.ratedPowerW || (d.ratedCurrentA && d.outputVoltage?.includes('24') ? d.ratedCurrentA * 24 : 120);
    const a = d.ratedCurrentA || (w / 24);
    return {
      display: `Fornece ${w} W (${a.toFixed(1)} A @ 24V DC)`,
      isProvider: true,
    };
  }

  // 2. PLC CPU (Siemens S7-1200 / LOGO!)
  if (d.category === 'plc_cpu') {
    const w = d.dcConsumptionW || 12;
    const a = d.dcConsumptionA || 0.5;
    return {
      display: `${w} W (${a.toFixed(2)} A @ 24V DC)`,
      isProvider: false,
    };
  }

  // 3. PLC Expansion Module
  if (d.category === 'plc_expansion') {
    const w = d.dcConsumptionW || 4.5;
    const a = d.dcConsumptionA || 0.18;
    return {
      display: `${w} W (${a.toFixed(2)} A @ 24V DC)`,
      isProvider: false,
    };
  }

  // 4. Protection AC (Disjuntor / Diferencial) -> Internal dissipation
  if (d.category === 'protection_ac') {
    const inA = d.ratedCurrentA || 16;
    // Estimated thermal dissipation per pole in AC breakers (IEC 60898 ~ 1.5W - 3.5W)
    const dissW = inA >= 25 ? 3.8 : inA >= 16 ? 2.6 : 1.8;
    return {
      display: `Dissipação: ~${dissW} W (Calibre: ${inA} A)`,
      isProvider: false,
    };
  }

  // 5. Relays (Coil power)
  if (d.category === 'relays' || d.category === 'safety_relays') {
    return {
      display: '0.8 W (Bobina 24V DC)',
      isProvider: false,
    };
  }

  // 6. Terminals / Passagem
  if (d.category === 'terminals') {
    return {
      display: '< 0.1 W (Resistência de contacto)',
      isProvider: false,
    };
  }

  // Fallback if specific wattage given
  if (d.dcConsumptionW) {
    return {
      display: `${d.dcConsumptionW} W (${(d.dcConsumptionA || 0.1).toFixed(2)} A)`,
      isProvider: false,
    };
  }

  if (d.ratedPowerW) {
    return {
      display: `${d.ratedPowerW} W`,
      isProvider: false,
    };
  }

  return {
    display: '1.2 W (Estimado)',
    isProvider: false,
  };
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
  const power = getComponentPowerConsumption(item);
  const Icon = badge.Icon;

  // Tooltip dimensions for collision detection & positioning
  const tooltipWidth = 320;
  const tooltipHeight = 175;
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

  return (
    <AnimatePresence>
      <motion.div
        key={item.instanceId}
        initial={{ opacity: 0, scale: 0.94, y: isPlacedBelow ? -6 : 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: isPlacedBelow ? -4 : 4 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
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

          {/* Component Tag & Brand */}
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-700/80 font-bold">
              {item.tag}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{item.data.brand}</span>
          </div>
        </div>

        {/* Component Title & Model */}
        <div className="px-3 pt-2 pb-1.5">
          <h4 className="text-xs font-bold text-white leading-snug truncate" title={item.data.name}>
            {item.data.name}
          </h4>
        </div>

        {/* 3-Column Key Technical Parameters Grid */}
        <div className="grid grid-cols-2 gap-2 px-3 pb-2 text-[11px]">
          {/* Metric 1: Referência (Part Number) */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-slate-400">
              <Tag className="w-2.5 h-2.5 text-amber-400" />
              <span>Referência</span>
            </div>
            <div className="font-mono font-bold text-amber-300 text-[11px] truncate mt-0.5" title={item.data.partNumber}>
              {item.data.partNumber || 'N/D'}
            </div>
          </div>

          {/* Metric 2: Consumo / Potência */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-slate-400">
              <Flame className={`w-2.5 h-2.5 ${power.isProvider ? 'text-emerald-400' : 'text-orange-400'}`} />
              <span>{power.isProvider ? 'Potência Útil' : 'Consumo'}</span>
            </div>
            <div className="font-mono font-bold text-emerald-300 text-[11px] truncate mt-0.5">
              {power.display}
            </div>
          </div>

          {/* Metric 3: Tipo / Tensão / Calibre */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-slate-400">
              <Zap className="w-2.5 h-2.5 text-sky-400" />
              <span>Especificação</span>
            </div>
            <div className="font-medium text-slate-200 text-[11px] truncate mt-0.5">
              {item.data.ratedCurrentA
                ? `${item.data.poles || ''} ${item.data.curve || ''}${item.data.ratedCurrentA}A`
                : item.data.outputVoltage || item.data.inputVoltage || 'Padrão DIN'}
            </div>
          </div>

          {/* Metric 4: Dimensões Físicas */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-slate-400">
              <Box className="w-2.5 h-2.5 text-indigo-400" />
              <span>Dimensões</span>
            </div>
            <div className="font-mono text-slate-200 text-[11px] truncate mt-0.5">
              {item.data.widthMm}×{item.data.heightMm || 90}mm <span className="text-slate-400 text-[10px]">({item.data.dinModules}M)</span>
            </div>
          </div>
        </div>

        {/* Location & Interaction Hint Footer */}
        <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Calha {railIndex + 1} (X: {Math.round(item.positionMm)}mm)</span>
          </div>
          <span className="text-slate-400 font-medium">Clique p/ editar</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
