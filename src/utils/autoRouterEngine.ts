import { ProjectState, PlacedComponent } from '../types/electrical';
import { inferCircuitMetadata } from './labelPdfGenerator';
import { getRecommendedWireSection, getOutgoingCableSpec, TerminalPoint } from './unifilarCircuitRouter';
import { FERRULE_STANDARDS } from './wireCalculations';

export type WireStandard = 'iec_60446' | 'en_60204';
export type RoutingStyle = 'duct_manhattan' | 'multiconductor' | 'unifilar_bus';

export interface ConductorSpec {
  conductorType: 'phase' | 'phase_l1' | 'phase_l2' | 'phase_l3' | 'neutral' | 'pe' | 'dc_pos' | 'dc_neg' | 'control_ac';
  label: string;
  wireTag: string;
  colorHex: string;
  colorName: string;
  sectionMm2: number;
  ferruleColor: string;
  svgPathD: string;
  lengthMeters: number;
  terminalTag: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

export interface RoutedCircuitBranch {
  circuitIndex: number;
  circuitMnemonic: string;
  circuitIcon: string;
  circuitDescription: string;
  breaker: PlacedComponent;
  breakerTag: string;
  breakerRatingA: number;
  breakerPoles: string;
  curve: string;
  railIndex: number;
  railName: string;
  terminalStripTag: string;
  terminalPoints: TerminalPoint[];
  conductors: ConductorSpec[];
  totalBranchLengthM: number;
  estimatedPowerW: number;
  voltageDropPercent: number;
  isCompliant: boolean;
  outgoingCable: string;
  ductCorridorDescription: string;
}

export interface AutoRouterResult {
  standard: WireStandard;
  style: RoutingStyle;
  circuits: RoutedCircuitBranch[];
  totalCircuitsCount: number;
  totalConductorsCount: number;
  totalWiringLengthM: number;
  colorBreakdown: Array<{
    colorName: string;
    colorHex: string;
    conductorCount: number;
    totalMeters: number;
  }>;
  terminalStripTag: string;
  incomerInfo: {
    voltage: string;
    isThreePhase: boolean;
    ratingA: number;
  };
}

export interface AutoRouterOptions {
  standard?: WireStandard;     // 'iec_60446' (default) or 'en_60204'
  style?: RoutingStyle;        // 'duct_manhattan' (default) | 'multiconductor' | 'unifilar_bus'
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  includePe?: boolean;
}

/**
 * Standard Normative Wire Colors according to IEC 60446 (RTIEBT) and EN 60204-1
 */
export function getConductorColor(
  type: ConductorSpec['conductorType'],
  standard: WireStandard = 'iec_60446'
): { hex: string; name: string } {
  if (standard === 'en_60204') {
    // EN 60204-1 (Industrial Machine Panels)
    switch (type) {
      case 'phase':
      case 'phase_l1':
      case 'phase_l2':
      case 'phase_l3':
        return { hex: '#1e293b', name: 'Preto (Potência AC)' };
      case 'neutral':
        return { hex: '#0284c7', name: 'Azul Claro (Neutro N)' };
      case 'pe':
        return { hex: '#16a34a', name: 'Verde/Amarelo (Terra PE)' };
      case 'dc_pos':
        return { hex: '#2563eb', name: 'Azul Escuro (+24VDC Comando)' };
      case 'dc_neg':
        return { hex: '#64748b', name: 'Cinzento / Azul (0VDC)' };
      case 'control_ac':
        return { hex: '#dc2626', name: 'Vermelho (Comando 230VAC)' };
      default:
        return { hex: '#1e293b', name: 'Preto' };
    }
  }

  // IEC 60446 / HD 308 S2 / RTIEBT (General Electrical Installation)
  switch (type) {
    case 'phase':
    case 'phase_l1':
      return { hex: '#92400e', name: 'Castanho (Fase L1)' };
    case 'phase_l2':
      return { hex: '#1e293b', name: 'Preto (Fase L2)' };
    case 'phase_l3':
      return { hex: '#64748b', name: 'Cinzento (Fase L3)' };
    case 'neutral':
      return { hex: '#0284c7', name: 'Azul Claro (Neutro N)' };
    case 'pe':
      return { hex: '#16a34a', name: 'Verde/Amarelo (Terra PE)' };
    case 'dc_pos':
      return { hex: '#dc2626', name: 'Vermelho (+24VDC)' };
    case 'dc_neg':
      return { hex: '#2563eb', name: 'Azul Escuro (0VDC)' };
    case 'control_ac':
      return { hex: '#ea580c', name: 'Laranja / Vermelho (Comando AC)' };
    default:
      return { hex: '#92400e', name: 'Castanho' };
  }
}

/**
 * Generates an SVG path with clean 90-degree rounded corners (CAD wire fillets)
 */
export function generateOrthogonalPath(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  intermediateY: number,
  intermediateX?: number,
  radius: number = 6
): string {
  const midX = intermediateX !== undefined ? intermediateX : p2.x;
  
  // If points are on the same vertical line, simple straight line
  if (Math.abs(p1.x - p2.x) < 2) {
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  }

  // 3-segment orthogonal routing:
  // p1 -> (p1.x, intermediateY) -> (midX, intermediateY) -> p2
  const r = Math.min(radius, Math.abs(intermediateY - p1.y) / 2, Math.abs(midX - p1.x) / 2);
  const dirX = midX > p1.x ? 1 : -1;
  const dirY1 = intermediateY > p1.y ? 1 : -1;
  const dirY2 = p2.y > intermediateY ? 1 : -1;

  return [
    `M ${p1.x} ${p1.y}`,
    `L ${p1.x} ${intermediateY - dirY1 * r}`,
    `Q ${p1.x} ${intermediateY} ${p1.x + dirX * r} ${intermediateY}`,
    `L ${midX - dirX * r} ${intermediateY}`,
    `Q ${midX} ${intermediateY} ${midX} ${intermediateY + dirY2 * r}`,
    `L ${midX} ${p2.y}`,
    intermediateX !== undefined && Math.abs(intermediateX - p2.x) > 1 ? `L ${p2.x} ${p2.y}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Main Auto-Router Execution Function:
 * Analyzes cabinet placed items, extracts breakers & terminals,
 * and designs realistic, collision-free, standardized wire paths.
 */
export function executeAutoRouter(
  project: ProjectState,
  options: AutoRouterOptions = {}
): AutoRouterResult {
  const standard: WireStandard = options.standard || 'iec_60446';
  const style: RoutingStyle = options.style || 'duct_manhattan';
  const includePe = options.includePe !== false;

  const allItems: PlacedComponent[] = project.rails.flatMap((r) => r.items);
  const isThreePhase = project.config.supplyVoltage.includes('400V');

  // 1. Identify incoming protection
  const mainBreaker = allItems.find(
    (i) => i.tag === 'Q0' || i.tag === 'QM0' || (i.data.category === 'protection_ac' && (i.data.ratedCurrentA || 0) >= 25 && !i.data.name.toLowerCase().includes('diferencial'))
  );
  const diffBreaker = allItems.find(
    (i) => i.data.category === 'protection_ac' && i.data.name.toLowerCase().includes('diferencial')
  );

  // 2. Identify terminals
  const placedTerminals = allItems.filter(
    (i) => i.data.category === 'terminals' || i.data.name.toLowerCase().includes('borne') || i.data.name.toLowerCase().includes('terminal')
  );
  const defaultStripTag = placedTerminals.length > 0 && placedTerminals[0].tag.startsWith('X')
    ? placedTerminals[0].tag.split('-')[0].split(':')[0]
    : 'X1';
  const terminalModel = placedTerminals.length > 0
    ? `${placedTerminals[0].data.brand || 'Legrand'} ${placedTerminals[0].data.partNumber || placedTerminals[0].data.name.split('(')[0].trim()}`
    : 'Legrand Viking 3 2.5mm²';

  // 3. Extract outgoing branch breakers
  const outgoingBreakers = allItems.filter((item) => {
    if (mainBreaker && item.instanceId === mainBreaker.instanceId) return false;
    if (diffBreaker && item.instanceId === diffBreaker.instanceId) return false;

    return (
      item.data.category === 'protection_ac' ||
      item.data.category === 'protection_dc' ||
      item.data.category === 'motor_control' ||
      (item.data.category === 'power_supply' && !allItems.some((b) => b.tag === 'Q1' && b.data.category === 'protection_ac'))
    );
  });

  // Sort outgoing breakers by rail index and X position on rail
  outgoingBreakers.sort((a, b) => {
    const railA = project.rails.findIndex((r) => r.items.some((it) => it.instanceId === a.instanceId));
    const railB = project.rails.findIndex((r) => r.items.some((it) => it.instanceId === b.instanceId));
    if (railA !== railB) return railA - railB;
    return a.positionMm - b.positionMm;
  });

  const effectiveBreakers = outgoingBreakers.length > 0 ? outgoingBreakers : allItems.slice(0, 4);

  let currentTerminalNum = 1;
  let totalLengthSum = 0;
  const colorMapAccumulator: Record<string, { colorHex: string; count: number; meters: number }> = {};

  // Schematic coordinate constants for unifilar layout
  const startX = 220;
  const availWidth = 1140 - startX - 20;
  const count = Math.max(1, effectiveBreakers.length);
  const colW = Math.max(88, Math.min(130, availWidth / count));

  // Breaker bottom Y is ~321 (transform 275 + 46)
  const breakerBottomY = 321;
  // Terminal top Y is ~385
  const terminalTopY = 385;

  const circuits: RoutedCircuitBranch[] = effectiveBreakers.map((breaker, idx) => {
    const rIdx = project.rails.findIndex((r) => r.items.some((it) => it.instanceId === breaker.instanceId));
    const rail = project.rails[rIdx] || project.rails[0];
    const meta = inferCircuitMetadata(breaker, Math.max(0, rIdx));

    const ratingA = breaker.data.ratedCurrentA || (breaker.data.category === 'power_supply' ? 6 : 16);
    const is3PhCircuit = isThreePhase && (breaker.data.poles?.includes('3P') || breaker.data.category === 'motor_control' || idx === 0);
    const poles = breaker.data.poles || (is3PhCircuit ? '3P+N' : '1P+N');
    const wireSection = getRecommendedWireSection(ratingA, meta.code.toLowerCase());
    const estPower = breaker.data.ratedPowerW || Math.round(ratingA * (is3PhCircuit ? 400 * 1.732 * 0.85 : 230 * 0.8));

    // Calculate voltage drop (assuming avg length ~1.4m internal cabinet wire)
    const lengthM = Math.round((1.1 + (Math.abs(rIdx - (project.rails.length - 1)) * 0.35) + (idx * 0.05)) * 100) / 100;
    const rho = 0.0175; // copper resistivity ohm*mm2/m
    const resistance = (rho * lengthM) / wireSection;
    const voltageDropV = (is3PhCircuit ? 1.732 : 2) * resistance * ratingA;
    const nominalV = is3PhCircuit ? 400 : 230;
    const voltageDropPercent = Math.round((voltageDropV / nominalV) * 1000) / 10;

    // Terminal definitions
    const termNumPhase = currentTerminalNum++;
    const termNumNeutral = currentTerminalNum++;

    const phaseTerm: TerminalPoint = {
      tag: `${defaultStripTag}:${termNumPhase}`,
      number: String(termNumPhase),
      type: 'phase',
      model: terminalModel,
      color: '#64748b',
    };

    const neutralTerm: TerminalPoint = {
      tag: `${defaultStripTag}:${termNumNeutral}`,
      number: String(termNumNeutral),
      type: 'neutral',
      model: terminalModel,
      color: '#0284c7',
    };

    const peTerm: TerminalPoint = {
      tag: `${defaultStripTag}:PE`,
      number: 'PE',
      type: 'pe',
      model: `${terminalModel} Terra`,
      color: '#16a34a',
    };

    // Calculate conductor paths and positions
    const colCenterX = startX + idx * colW + colW / 2;
    const conductors: ConductorSpec[] = [];

    // Channel Routing Offset Calculation:
    // When in 'duct_manhattan' style, each circuit gets an offset shelf in the horizontal routing channel
    const channelBaseY = 346;
    const channelLaneOffset = ((idx % 4) - 1.5) * 4; // -6, -2, +2, +6
    const routedChannelY = channelBaseY + channelLaneOffset;

    const ferrule = FERRULE_STANDARDS[wireSection] || { colorDin: 'Azul' };

    // 1. Phase Conductor (L or L1)
    const phaseColor = getConductorColor(is3PhCircuit ? 'phase_l1' : 'phase', standard);
    const phaseStartX = colCenterX - (is3PhCircuit ? 10 : 8);
    const phaseEndX = colCenterX - 16; // Terminal screw 1

    let phaseSvgPath: string;
    if (style === 'duct_manhattan') {
      phaseSvgPath = generateOrthogonalPath(
        { x: phaseStartX, y: breakerBottomY },
        { x: phaseEndX, y: terminalTopY },
        routedChannelY - 2,
        undefined,
        5
      );
    } else if (style === 'multiconductor') {
      // Direct bezier curve
      phaseSvgPath = `M ${phaseStartX} ${breakerBottomY} C ${phaseStartX} ${breakerBottomY + 25}, ${phaseEndX} ${terminalTopY - 25}, ${phaseEndX} ${terminalTopY}`;
    } else {
      // Unifilar single drop
      phaseSvgPath = `M ${colCenterX} ${breakerBottomY} L ${colCenterX} ${terminalTopY}`;
    }

    conductors.push({
      conductorType: is3PhCircuit ? 'phase_l1' : 'phase',
      label: is3PhCircuit ? 'Fase L1' : 'Fase L',
      wireTag: `W${String(idx + 1).padStart(2, '0')}.1`,
      colorHex: phaseColor.hex,
      colorName: phaseColor.name,
      sectionMm2: wireSection,
      ferruleColor: ferrule.colorDin,
      svgPathD: phaseSvgPath,
      lengthMeters: lengthM,
      terminalTag: `${defaultStripTag}:${termNumPhase}`,
      startPoint: { x: phaseStartX, y: breakerBottomY },
      endPoint: { x: phaseEndX, y: terminalTopY },
    });

    // 2. Extra Phases for 3-Phase (L2, L3) if applicable
    if (is3PhCircuit) {
      const l2Color = getConductorColor('phase_l2', standard);
      const l2StartX = colCenterX - 3;
      const l2EndX = colCenterX - 6;
      const l2Path = style === 'duct_manhattan'
        ? generateOrthogonalPath({ x: l2StartX, y: breakerBottomY }, { x: l2EndX, y: terminalTopY }, routedChannelY, undefined, 4)
        : `M ${l2StartX} ${breakerBottomY} L ${l2EndX} ${terminalTopY}`;

      conductors.push({
        conductorType: 'phase_l2',
        label: 'Fase L2',
        wireTag: `W${String(idx + 1).padStart(2, '0')}.2`,
        colorHex: l2Color.hex,
        colorName: l2Color.name,
        sectionMm2: wireSection,
        ferruleColor: ferrule.colorDin,
        svgPathD: l2Path,
        lengthMeters: lengthM,
        terminalTag: `${defaultStripTag}:${termNumPhase}-L2`,
        startPoint: { x: l2StartX, y: breakerBottomY },
        endPoint: { x: l2EndX, y: terminalTopY },
      });

      const l3Color = getConductorColor('phase_l3', standard);
      const l3StartX = colCenterX + 4;
      const l3EndX = colCenterX + 4;
      const l3Path = style === 'duct_manhattan'
        ? generateOrthogonalPath({ x: l3StartX, y: breakerBottomY }, { x: l3EndX, y: terminalTopY }, routedChannelY + 2, undefined, 4)
        : `M ${l3StartX} ${breakerBottomY} L ${l3EndX} ${terminalTopY}`;

      conductors.push({
        conductorType: 'phase_l3',
        label: 'Fase L3',
        wireTag: `W${String(idx + 1).padStart(2, '0')}.3`,
        colorHex: l3Color.hex,
        colorName: l3Color.name,
        sectionMm2: wireSection,
        ferruleColor: ferrule.colorDin,
        svgPathD: l3Path,
        lengthMeters: lengthM,
        terminalTag: `${defaultStripTag}:${termNumPhase}-L3`,
        startPoint: { x: l3StartX, y: breakerBottomY },
        endPoint: { x: l3EndX, y: terminalTopY },
      });
    }

    // 3. Neutral Conductor (N)
    const neutralColor = getConductorColor('neutral', standard);
    const neutralStartX = colCenterX + (is3PhCircuit ? 10 : 8);
    const neutralEndX = colCenterX + (is3PhCircuit ? 14 : 0); // Terminal screw 2

    let neutralSvgPath: string;
    if (style === 'duct_manhattan') {
      neutralSvgPath = generateOrthogonalPath(
        { x: neutralStartX, y: breakerBottomY },
        { x: neutralEndX, y: terminalTopY },
        routedChannelY + 3,
        undefined,
        5
      );
    } else if (style === 'multiconductor') {
      neutralSvgPath = `M ${neutralStartX} ${breakerBottomY} C ${neutralStartX} ${breakerBottomY + 25}, ${neutralEndX} ${terminalTopY - 25}, ${neutralEndX} ${terminalTopY}`;
    } else {
      neutralSvgPath = `M ${colCenterX + 4} ${breakerBottomY} L ${colCenterX + 4} ${terminalTopY}`;
    }

    conductors.push({
      conductorType: 'neutral',
      label: 'Neutro N',
      wireTag: `W${String(idx + 1).padStart(2, '0')}.N`,
      colorHex: neutralColor.hex,
      colorName: neutralColor.name,
      sectionMm2: wireSection,
      ferruleColor: ferrule.colorDin,
      svgPathD: neutralSvgPath,
      lengthMeters: lengthM,
      terminalTag: `${defaultStripTag}:${termNumNeutral}`,
      startPoint: { x: neutralStartX, y: breakerBottomY },
      endPoint: { x: neutralEndX, y: terminalTopY },
    });

    // 4. Protective Earth Conductor (PE)
    if (includePe) {
      const peColor = getConductorColor('pe', standard);
      const peStartX = colCenterX + (is3PhCircuit ? 16 : 14);
      const peEndX = colCenterX + (is3PhCircuit ? 24 : 16); // Terminal screw PE

      let peSvgPath: string;
      if (style === 'duct_manhattan') {
        peSvgPath = generateOrthogonalPath(
          { x: peStartX, y: breakerBottomY },
          { x: peEndX, y: terminalTopY },
          routedChannelY + 6,
          undefined,
          6
        );
      } else {
        peSvgPath = `M ${peStartX} ${breakerBottomY} L ${peEndX} ${terminalTopY}`;
      }

      conductors.push({
        conductorType: 'pe',
        label: 'Terra PE',
        wireTag: `W${String(idx + 1).padStart(2, '0')}.PE`,
        colorHex: peColor.hex,
        colorName: peColor.name,
        sectionMm2: wireSection,
        ferruleColor: '#16a34a',
        svgPathD: peSvgPath,
        lengthMeters: lengthM,
        terminalTag: `${defaultStripTag}:PE`,
        startPoint: { x: peStartX, y: breakerBottomY },
        endPoint: { x: peEndX, y: terminalTopY },
      });
    }

    // Accumulate wire lengths into totals and breakdown
    const branchTotalM = Math.round(conductors.reduce((acc, c) => acc + c.lengthMeters, 0) * 100) / 100;
    totalLengthSum += branchTotalM;

    conductors.forEach((c) => {
      if (!colorMapAccumulator[c.colorName]) {
        colorMapAccumulator[c.colorName] = {
          colorHex: c.colorHex,
          count: 0,
          meters: 0,
        };
      }
      colorMapAccumulator[c.colorName].count++;
      colorMapAccumulator[c.colorName].meters = Math.round((colorMapAccumulator[c.colorName].meters + c.lengthMeters) * 100) / 100;
    });

    const desc = breaker.data.customNotes && breaker.data.customNotes.trim()
      ? breaker.data.customNotes
      : (breaker.data.description || meta.defaultDesc);

    const ductDescription = `Calha DIN ${rIdx + 1} ➔ Canal Lateral ${rIdx % 2 === 0 ? 'Direito' : 'Esquerdo'} ➔ Calha de Bornes ${defaultStripTag}`;

    return {
      circuitIndex: idx + 1,
      circuitMnemonic: meta.code,
      circuitIcon: meta.symbol,
      circuitDescription: desc,
      breaker,
      breakerTag: breaker.tag || `Q${idx + 1}`,
      breakerRatingA: ratingA,
      breakerPoles: poles,
      curve: breaker.data.curve || 'C',
      railIndex: rIdx >= 0 ? rIdx : 0,
      railName: rail?.name || `Calha ${rIdx + 1}`,
      terminalStripTag: defaultStripTag,
      terminalPoints: [phaseTerm, neutralTerm, peTerm],
      conductors,
      totalBranchLengthM: branchTotalM,
      estimatedPowerW: estPower,
      voltageDropPercent,
      isCompliant: voltageDropPercent <= 3.0,
      outgoingCable: getOutgoingCableSpec(poles, wireSection),
      ductCorridorDescription: ductDescription,
    };
  });

  const colorBreakdown = Object.entries(colorMapAccumulator).map(([colorName, data]) => ({
    colorName,
    colorHex: data.colorHex,
    conductorCount: data.count,
    totalMeters: Math.round(data.meters * 100) / 100,
  }));

  const incomerRatingA = mainBreaker?.data.ratedCurrentA || (isThreePhase ? 32 : 40);

  return {
    standard,
    style,
    circuits,
    totalCircuitsCount: circuits.length,
    totalConductorsCount: circuits.reduce((sum, c) => sum + c.conductors.length, 0),
    totalWiringLengthM: Math.round(totalLengthSum * 100) / 100,
    colorBreakdown,
    terminalStripTag: defaultStripTag,
    incomerInfo: {
      voltage: project.config.supplyVoltage || (isThreePhase ? '3x400VAC + N + PE' : '230VAC + N + PE'),
      isThreePhase,
      ratingA: incomerRatingA,
    },
  };
}
