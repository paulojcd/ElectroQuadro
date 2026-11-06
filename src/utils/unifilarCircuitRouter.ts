import { ProjectState, PlacedComponent } from '../types/electrical';
import { inferCircuitMetadata } from './labelPdfGenerator';

export interface TerminalPoint {
  id?: string;
  tag: string;         // e.g. "X1:1", "X1:2", "X1:PE"
  number: string;      // e.g. "1", "2", "PE"
  type: 'phase' | 'neutral' | 'pe' | 'dc_pos' | 'dc_neg' | 'signal';
  model: string;       // e.g. "Viking 3 2.5mm²"
  color: string;       // e.g. "#64748b" (grey), "#3b82f6" (blue), "#84cc16" (green/yellow)
}

export interface UnifilarCircuitConnection {
  circuitIndex: number;
  // Protection Breaker
  breaker: PlacedComponent;
  breakerTag: string;
  breakerName: string;
  breakerBrand: string;
  breakerPartNumber: string;
  breakerRatingA: number;
  breakerPoles: string;
  breakingCapacityKa: number;
  curve: string;
  railIndex: number;
  railName: string;

  // Interconnecting Internal Wiring (from breaker to terminal)
  wireTag: string;             // e.g. "W01", "W02"
  wireSectionMm2: number;      // e.g. 1.5, 2.5, 4.0, 6.0, 10.0
  wireType: string;            // e.g. "H07V-K"
  wireColor: string;           // e.g. "#0284c7"

  // Terminal Block(s) Connection
  terminalStripTag: string;    // e.g. "X1", "X2"
  phaseTerminal: TerminalPoint;
  neutralTerminal?: TerminalPoint;
  peTerminal: TerminalPoint;

  // Field Circuit & Destination Load
  circuitCategory: string;
  circuitMnemonic: string;     // e.g. "ILUM", "TOM", "PLACA", "EV", "AVAC", "MOTOR", "AQS"
  circuitIcon: string;         // e.g. "💡", "🔌", "🍳", "🚗", "❄️", "⚙️"
  circuitDescription: string;  // e.g. "Iluminação Geral Sala", "Tomadas Cozinha"
  outgoingCable: string;       // e.g. "H07V-U 3G2.5 mm²"
  estimatedPowerW: number;
}

export interface UnifilarSchematicData {
  incomer: {
    voltage: string;
    isThreePhase: boolean;
    mainBreaker?: PlacedComponent;
    diffBreaker?: PlacedComponent;
    spd?: PlacedComponent;
    cable: string;
    ratingA: number;
  };
  circuits: UnifilarCircuitConnection[];
  terminalStrips: { tag: string; count: number; railIndex: number }[];
  totalBreakersCount: number;
  totalTerminalsCount: number;
  totalInstalledPowerW: number;
  maxCurrentA: number;
}

/**
 * Calculates recommended wire cross-section based on rating and circuit type
 * adhering to EN 60204-1 Table 6 / RTIEBT Section 523
 */
export function getRecommendedWireSection(currentA: number, category?: string): number {
  if (currentA <= 10) {
    return 1.5;
  } else if (currentA <= 16) {
    return (category === 'lighting' || category === 'ilum') ? 1.5 : 2.5;
  } else if (currentA <= 20) {
    return 2.5;
  } else if (currentA <= 25) {
    return 4.0;
  } else if (currentA <= 32) {
    return 6.0;
  } else if (currentA <= 40) {
    return 10.0;
  } else if (currentA <= 50) {
    return 10.0;
  } else if (currentA <= 63) {
    return 16.0;
  }
  return 25.0;
}

/**
 * Determines outgoing cable specification based on poles and wire section
 */
export function getOutgoingCableSpec(poles: string, wireSectionMm2: number): string {
  const isMultiPhase = poles.includes('3P') || poles.includes('4P');
  if (isMultiPhase) {
    return `H07RN-F 5G${wireSectionMm2} mm²`;
  }
  return `H07V-U 3G${wireSectionMm2} mm²`;
}

/**
 * Automatically analyzes project DIN rails to extract circuit breakers and terminal blocks,
 * creating clean unifilar branch connections between each breaker and its designated terminal block.
 */
export function generateUnifilarRoutingData(project: ProjectState): UnifilarSchematicData {
  const allItems: PlacedComponent[] = project.rails.flatMap((r) => r.items);
  const isThreePhase = project.config.supplyVoltage.includes('400V');

  // 1. Identify Incomer & General Protections
  const mainBreaker = allItems.find(
    (i) => i.tag === 'Q0' || i.tag === 'QM0' || (i.data.category === 'protection_ac' && (i.data.ratedCurrentA || 0) >= 25 && !i.data.name.toLowerCase().includes('diferencial'))
  );

  const diffBreaker = allItems.find(
    (i) => i.data.category === 'protection_ac' && i.data.name.toLowerCase().includes('diferencial')
  );

  const spd = allItems.find(
    (i) => i.tag.includes('SPD') || i.data.name.toLowerCase().includes('descarregador') || i.data.name.toLowerCase().includes('sobretensão')
  );

  // 2. Identify Placed Terminal Blocks in Rails
  const placedTerminals = allItems.filter(
    (i) => i.data.category === 'terminals' || i.data.name.toLowerCase().includes('borne') || i.data.name.toLowerCase().includes('terminal')
  );

  // Find physical terminal strip name (e.g. "X1", "XT")
  const defaultStripTag = placedTerminals.length > 0 && placedTerminals[0].tag.startsWith('X')
    ? placedTerminals[0].tag.split('-')[0].split(':')[0]
    : 'X1';

  const terminalModel = placedTerminals.length > 0
    ? `${placedTerminals[0].data.brand || 'Legrand'} ${placedTerminals[0].data.partNumber || placedTerminals[0].data.name.split('(')[0].trim()}`
    : 'Legrand Viking 3 2.5mm²';

  // 3. Extract All Outgoing Circuit Breakers
  // We exclude the main breaker (Q0) and main differential (Q_DIFF) from being leaf branches
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

  // Sort outgoing breakers by rail index and position on rail
  outgoingBreakers.sort((a, b) => {
    const railA = project.rails.findIndex((r) => r.items.some((it) => it.instanceId === a.instanceId));
    const railB = project.rails.findIndex((r) => r.items.some((it) => it.instanceId === b.instanceId));
    if (railA !== railB) return railA - railB;
    return a.positionMm - b.positionMm;
  });

  // If there are no outgoing breakers (empty project), create representative demo circuits
  const effectiveBreakers = outgoingBreakers.length > 0 ? outgoingBreakers : allItems.slice(0, 4);

  let currentTerminalNumber = 1;
  let totalWatts = 0;

  const circuits: UnifilarCircuitConnection[] = effectiveBreakers.map((breaker, idx) => {
    const rIdx = project.rails.findIndex((r) => r.items.some((it) => it.instanceId === breaker.instanceId));
    const rail = project.rails[rIdx] || project.rails[0];
    const meta = inferCircuitMetadata(breaker, Math.max(0, rIdx));

    const ratingA = breaker.data.ratedCurrentA || (breaker.data.category === 'power_supply' ? 6 : 16);
    const poles = breaker.data.poles || (breaker.data.category === 'motor_control' ? '3P' : isThreePhase && idx === 0 ? '3P+N' : '1P+N');
    const wireSection = getRecommendedWireSection(ratingA, meta.code.toLowerCase());

    const estPower = breaker.data.ratedPowerW || Math.round(ratingA * (poles.includes('3P') ? 400 * 1.732 * 0.85 : 230 * 0.8));
    totalWatts += estPower;

    const termNumPhase = currentTerminalNumber++;
    const termNumNeutral = currentTerminalNumber++;

    const phaseTerm: TerminalPoint = {
      tag: `${defaultStripTag}:${termNumPhase}`,
      number: String(termNumPhase),
      type: 'phase',
      model: terminalModel,
      color: '#64748b', // Grey standard phase
    };

    const neutralTerm: TerminalPoint = {
      tag: `${defaultStripTag}:${termNumNeutral}`,
      number: String(termNumNeutral),
      type: 'neutral',
      model: terminalModel,
      color: '#0284c7', // Blue standard neutral
    };

    const peTerm: TerminalPoint = {
      tag: `${defaultStripTag}:PE`,
      number: 'PE',
      type: 'pe',
      model: `${terminalModel} Terra`,
      color: '#16a34a', // Green-yellow earth
    };

    // Wire identification label (Anilha)
    const wireTag = `W${String(idx + 1).padStart(2, '0')}`;
    const outgoingCable = getOutgoingCableSpec(poles, wireSection);

    // Clean description
    const desc = breaker.data.customNotes && breaker.data.customNotes.trim()
      ? breaker.data.customNotes
      : (breaker.data.description || meta.defaultDesc);

    return {
      circuitIndex: idx + 1,
      breaker,
      breakerTag: breaker.tag || `Q${idx + 1}`,
      breakerName: breaker.data.name,
      breakerBrand: breaker.data.brand || 'Siemens',
      breakerPartNumber: breaker.data.partNumber || '5SY4116-7',
      breakerRatingA: ratingA,
      breakerPoles: poles,
      breakingCapacityKa: breaker.data.breakingCapacityKa || 6,
      curve: breaker.data.curve || 'C',
      railIndex: rIdx >= 0 ? rIdx : 0,
      railName: rail?.name || `Calha ${rIdx + 1}`,
      wireTag,
      wireSectionMm2: wireSection,
      wireType: 'H07V-K',
      wireColor: '#0284c7',
      terminalStripTag: defaultStripTag,
      phaseTerminal: phaseTerm,
      neutralTerminal: neutralTerm,
      peTerminal: peTerm,
      circuitCategory: meta.code.toLowerCase(),
      circuitMnemonic: meta.code,
      circuitIcon: meta.symbol,
      circuitDescription: desc,
      outgoingCable,
      estimatedPowerW: estPower,
    };
  });

  const incomerRatingA = mainBreaker?.data.ratedCurrentA || (isThreePhase ? 32 : 40);

  return {
    incomer: {
      voltage: project.config.supplyVoltage || (isThreePhase ? '3x400VAC + N + PE' : '230VAC + N + PE'),
      isThreePhase,
      mainBreaker,
      diffBreaker,
      spd,
      cable: isThreePhase ? '5G10 mm² Cu' : '3G6 mm² Cu',
      ratingA: incomerRatingA,
    },
    circuits,
    terminalStrips: [{ tag: defaultStripTag, count: currentTerminalNumber, railIndex: project.rails.length - 1 }],
    totalBreakersCount: outgoingBreakers.length,
    totalTerminalsCount: currentTerminalNumber + 1,
    totalInstalledPowerW: totalWatts,
    maxCurrentA: incomerRatingA,
  };
}
