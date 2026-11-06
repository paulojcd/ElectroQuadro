import { ProjectState, PlacedComponent, WireConnection, WireNetType } from '../types/electrical';
import { WIRE_COLORS } from './wireSimulator';

export interface ComponentTerminalAnchor {
  id: string;
  terminalId: string; // e.g. "1", "2", "L", "N", "PE", "+V", "-V", "A1", "A2", "DI.0", "DQ.0", etc.
  label: string; // Short badge label
  componentId: string;
  componentTag: string;
  componentName: string;
  railIndex: number;
  x: number; // absolute SVG coordinates in mm
  y: number; // absolute SVG coordinates in mm
  isTop: boolean;
  netType: WireNetType;
  color: string;
  defaultCrossSectionMm2: number;
  description: string;
}

/**
 * Extracts all interactive electrical connection terminals (anchors)
 * for a placed component based on its physical and electrical category.
 */
export function getComponentTerminals(
  item: PlacedComponent,
  railIndex: number,
  railX: number,
  railY: number
): ComponentTerminalAnchor[] {
  const itW = item.data.widthMm;
  const itH = item.data.heightMm || 90;
  const compAbsX = railX + item.positionMm;
  const compAbsY = railY + (55 - itH / 2);
  const anchors: ComponentTerminalAnchor[] = [];

  const category = item.data.category;
  const nameLower = (item.data.name + ' ' + (item.data.partNumber || '')).toLowerCase();

  // Helper to push an anchor
  const addAnchor = (
    terminalId: string,
    label: string,
    relX: number,
    isTop: boolean,
    netType: WireNetType,
    crossSection: number,
    desc: string
  ) => {
    anchors.push({
      id: `${item.instanceId}_${terminalId}_${isTop ? 'T' : 'B'}`,
      terminalId,
      label,
      componentId: item.instanceId,
      componentTag: item.tag,
      componentName: item.data.name,
      railIndex,
      x: Math.round((compAbsX + relX) * 10) / 10,
      y: Math.round((isTop ? compAbsY + 7 : compAbsY + itH - 7) * 10) / 10,
      isTop,
      netType,
      color: WIRE_COLORS[netType] || '#ea580c',
      defaultCrossSectionMm2: crossSection,
      description: desc,
    });
  };

  // 1. Protection AC / MCBs / RCDs / Residential modular
  if (category === 'protection_ac' || category === 'protection_dc' || category === 'residential_modular') {
    const is3P = itW >= 50 && itW < 68;
    const is4P = itW >= 68;
    const is2P = itW >= 32 && itW < 50;

    if (is4P) {
      // 4-Pole: L1, L2, L3, N
      addAnchor('1', '1 (L1)', itW * 0.14, true, 'ac_phase', 4.0, 'Entrada Fase L1');
      addAnchor('3', '3 (L2)', itW * 0.38, true, 'ac_phase', 4.0, 'Entrada Fase L2');
      addAnchor('5', '5 (L3)', itW * 0.62, true, 'ac_phase', 4.0, 'Entrada Fase L3');
      addAnchor('N-in', 'N', itW * 0.86, true, 'ac_neutral', 4.0, 'Entrada Neutro N');

      addAnchor('2', '2 (L1)', itW * 0.14, false, 'ac_phase', 4.0, 'Saída Fase L1');
      addAnchor('4', '4 (L2)', itW * 0.38, false, 'ac_phase', 4.0, 'Saída Fase L2');
      addAnchor('6', '6 (L3)', itW * 0.62, false, 'ac_phase', 4.0, 'Saída Fase L3');
      addAnchor('N-out', 'N', itW * 0.86, false, 'ac_neutral', 4.0, 'Saída Neutro N');
    } else if (is3P) {
      // 3-Pole: L1, L2, L3
      addAnchor('1', '1 (L1)', itW * 0.2, true, 'ac_phase', 4.0, 'Entrada Fase L1');
      addAnchor('3', '3 (L2)', itW * 0.5, true, 'ac_phase', 4.0, 'Entrada Fase L2');
      addAnchor('5', '5 (L3)', itW * 0.8, true, 'ac_phase', 4.0, 'Entrada Fase L3');

      addAnchor('2', '2 (L1)', itW * 0.2, false, 'ac_phase', 4.0, 'Saída Fase L1');
      addAnchor('4', '4 (L2)', itW * 0.5, false, 'ac_phase', 4.0, 'Saída Fase L2');
      addAnchor('6', '6 (L3)', itW * 0.8, false, 'ac_phase', 4.0, 'Saída Fase L3');
    } else if (is2P) {
      // 2-Pole: Phase + Neutral
      addAnchor('1', '1 (L)', itW * 0.3, true, 'ac_phase', 2.5, 'Entrada Fase L');
      addAnchor('N-in', 'N', itW * 0.7, true, 'ac_neutral', 2.5, 'Entrada Neutro N');

      addAnchor('2', '2 (L)', itW * 0.3, false, 'ac_phase', 2.5, 'Saída Fase L');
      addAnchor('N-out', 'N', itW * 0.7, false, 'ac_neutral', 2.5, 'Saída Neutro N');
    } else {
      // 1-Pole: Phase in/out
      addAnchor('1', '1', itW * 0.5, true, 'ac_phase', 2.5, 'Entrada Borne 1');
      addAnchor('2', '2', itW * 0.5, false, 'ac_phase', 2.5, 'Saída Borne 2');
    }
    return anchors;
  }

  // 2. Power Supply (e.g. Mean Well HDR, NDR, SITOP)
  if (category === 'power_supply') {
    // Top: AC Incomer (L, N, PE)
    addAnchor('L', 'L', itW * 0.22, true, 'ac_phase', 1.5, 'Entrada AC Fase');
    addAnchor('N', 'N', itW * 0.50, true, 'ac_neutral', 1.5, 'Entrada AC Neutro');
    addAnchor('PE', 'PE', itW * 0.78, true, 'pe_ground', 1.5, 'Terra de Proteção PE');

    // Bottom: DC Output (+V, -V)
    addAnchor('+V', '+24V', itW * 0.32, false, 'dc_positive', 1.5, 'Saída +24V DC');
    addAnchor('-V', '0V (M)', itW * 0.68, false, 'dc_negative', 1.5, 'Saída 0V DC / Massa');
    return anchors;
  }

  // 3. PLC CPU (e.g. Siemens S7-1200 / LOGO!)
  if (category === 'plc_cpu') {
    // Top: Power & Digital Inputs
    addAnchor('L+', 'L+', 14, true, 'dc_positive', 1.0, 'Alimentação PLC +24V DC');
    addAnchor('M', 'M', 28, true, 'dc_negative', 1.0, 'Massa PLC 0V DC');
    addAnchor('PE', 'PE', 42, true, 'pe_ground', 1.0, 'Terra Funcional PLC');
    addAnchor('DI.0', 'DI.0', 58, true, 'control_signal', 0.75, 'Entrada Digital DI 0.0 (Marcha)');
    addAnchor('DI.1', 'DI.1', 72, true, 'control_signal', 0.75, 'Entrada Digital DI 0.1 (Paragem)');
    if (itW >= 95) {
      addAnchor('DI.2', 'DI.2', 86, true, 'control_signal', 0.75, 'Entrada Digital DI 0.2 (Sensor)');
    }

    // Bottom: Digital Outputs
    addAnchor('1L', '1L', 16, false, 'dc_positive', 1.0, 'Alimentação Saídas 1L (+24V)');
    addAnchor('DQ.0', 'DQ.0', 34, false, 'control_signal', 0.75, 'Saída Digital DQ 0.0 (Relé K1)');
    addAnchor('DQ.1', 'DQ.1', 52, false, 'control_signal', 0.75, 'Saída Digital DQ 0.1 (Sinalizador)');
    addAnchor('DQ.2', 'DQ.2', 70, false, 'control_signal', 0.75, 'Saída Digital DQ 0.2 (Alarme)');
    if (itW >= 95) {
      addAnchor('M-out', 'M', 86, false, 'dc_negative', 1.0, 'Massa Saídas 0V');
    }
    return anchors;
  }

  // 4. PLC Expansion
  if (category === 'plc_expansion') {
    addAnchor('L+', 'L+', 12, true, 'dc_positive', 1.0, 'Alimentação +24V DC');
    addAnchor('M', 'M', 26, true, 'dc_negative', 1.0, 'Massa 0V DC');
    addAnchor('IO.1', 'IO.1', itW * 0.7, true, 'control_signal', 0.75, 'Canal Expansão I/O');
    addAnchor('IO.2', 'IO.2', itW * 0.5, false, 'control_signal', 0.75, 'Saída Expansão I/O');
    return anchors;
  }

  // 5. Relays, Contactors & Safety Relays
  if (category === 'relays' || category === 'motor_control' || category === 'safety_relays') {
    // Top: Coil A1 & NO Contact In
    addAnchor('A1', 'A1', itW * 0.28, true, 'control_signal', 0.75, 'Bobina Relé A1 (+ / Linha)');
    addAnchor('13', '13 (NA)', itW * 0.72, true, 'control_signal', 1.5, 'Contacto Normal Aberto Entrada');

    // Bottom: Coil A2 & NO Contact Out
    addAnchor('A2', 'A2', itW * 0.28, false, 'dc_negative', 0.75, 'Bobina Relé A2 (- / Neutro)');
    addAnchor('14', '14 (NA)', itW * 0.72, false, 'control_signal', 1.5, 'Contacto Normal Aberto Saída');
    return anchors;
  }

  // 6. Terminal Blocks (Viking 3 Legrand, Weidmuller, etc.)
  if (category === 'terminals') {
    let netType: WireNetType = 'control_signal';
    let defaultColor = WIRE_COLORS.control_signal;
    let section = 2.5;

    if (nameLower.includes('terra') || nameLower.includes('pe')) {
      netType = 'pe_ground';
      defaultColor = WIRE_COLORS.pe_ground;
      section = 4.0;
    } else if (nameLower.includes('neutro')) {
      netType = 'ac_neutral';
      defaultColor = WIRE_COLORS.ac_neutral;
      section = 2.5;
    } else if (nameLower.includes('fase') || nameLower.includes('linha')) {
      netType = 'ac_phase';
      defaultColor = WIRE_COLORS.ac_phase;
      section = 2.5;
    } else if (nameLower.includes('24v') || nameLower.includes('+v')) {
      netType = 'dc_positive';
      defaultColor = WIRE_COLORS.dc_positive;
      section = 1.5;
    } else if (nameLower.includes('0v') || nameLower.includes('massa')) {
      netType = 'dc_negative';
      defaultColor = WIRE_COLORS.dc_negative;
      section = 1.5;
    }

    addAnchor('1', 'In', itW / 2, true, netType, section, `Borne Entrada Superior (${item.tag})`);
    addAnchor('2', 'Out', itW / 2, false, netType, section, `Borne Saída Inferior (${item.tag})`);
    return anchors;
  }

  // Default fallback for any other component
  addAnchor('1', '1', itW * 0.35, true, 'control_signal', 1.5, 'Terminal Entrada 1');
  addAnchor('2', '2', itW * 0.35, false, 'control_signal', 1.5, 'Terminal Saída 2');
  if (itW >= 30) {
    addAnchor('3', '3', itW * 0.7, true, 'control_signal', 1.5, 'Terminal 3');
    addAnchor('4', '4', itW * 0.7, false, 'control_signal', 1.5, 'Terminal 4');
  }

  return anchors;
}

/**
 * Returns all connection terminal anchors for all placed components in the project.
 */
export function getAllProjectTerminals(project: ProjectState): ComponentTerminalAnchor[] {
  const sideDuct = project.config.sideDuctWidthMm || 40;
  const railSpacing = project.config.railSpacingMm || 150;
  const anchors: ComponentTerminalAnchor[] = [];

  project.rails.forEach((rail, rIdx) => {
    const railX = 24 + sideDuct + 10;
    const railY = 80 + rIdx * railSpacing;

    rail.items.forEach((it) => {
      const itAnchors = getComponentTerminals(it, rIdx, railX, railY);
      anchors.push(...itAnchors);
    });
  });

  return anchors;
}

/**
 * Automatically deduces wire net type, color, and cross section based on
 * the connection source and target terminal characteristics (EN 60204-1).
 */
export function deduceWireProperties(
  fromAnchor: ComponentTerminalAnchor,
  toAnchor: ComponentTerminalAnchor
): {
  netType: WireNetType;
  color: string;
  crossSectionMm2: number;
} {
  // 1. Earth / PE always rules
  if (fromAnchor.netType === 'pe_ground' || toAnchor.netType === 'pe_ground') {
    return {
      netType: 'pe_ground',
      color: WIRE_COLORS.pe_ground,
      crossSectionMm2: Math.max(fromAnchor.defaultCrossSectionMm2, toAnchor.defaultCrossSectionMm2, 2.5),
    };
  }

  // 2. Neutral connection
  if (fromAnchor.netType === 'ac_neutral' || toAnchor.netType === 'ac_neutral') {
    return {
      netType: 'ac_neutral',
      color: WIRE_COLORS.ac_neutral,
      crossSectionMm2: Math.max(fromAnchor.defaultCrossSectionMm2, toAnchor.defaultCrossSectionMm2, 1.5),
    };
  }

  // 3. AC Phase connection
  if (fromAnchor.netType === 'ac_phase' || toAnchor.netType === 'ac_phase') {
    return {
      netType: 'ac_phase',
      color: WIRE_COLORS.ac_phase,
      crossSectionMm2: Math.max(fromAnchor.defaultCrossSectionMm2, toAnchor.defaultCrossSectionMm2, 2.5),
    };
  }

  // 4. DC Positive (+24V)
  if (fromAnchor.netType === 'dc_positive' || toAnchor.netType === 'dc_positive') {
    return {
      netType: 'dc_positive',
      color: WIRE_COLORS.dc_positive,
      crossSectionMm2: 1.0,
    };
  }

  // 5. DC Negative (0V / M)
  if (fromAnchor.netType === 'dc_negative' || toAnchor.netType === 'dc_negative') {
    return {
      netType: 'dc_negative',
      color: WIRE_COLORS.dc_negative,
      crossSectionMm2: 1.0,
    };
  }

  // 6. Default to Control Signal (Orange, EN 60204-1)
  return {
    netType: 'control_signal',
    color: WIRE_COLORS.control_signal,
    crossSectionMm2: Math.min(fromAnchor.defaultCrossSectionMm2, toAnchor.defaultCrossSectionMm2, 1.0),
  };
}

/**
 * Generates next sequential wire tag (e.g. W01, W02, ... or custom prefix).
 */
export function generateNextWireTag(existingWires: WireConnection[], prefix: string = 'W'): string {
  let highestNum = 0;
  existingWires.forEach((w) => {
    const match = w.wireTag.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highestNum) highestNum = num;
    }
  });
  return `${prefix}${String(highestNum + 1).padStart(2, '0')}`;
}
