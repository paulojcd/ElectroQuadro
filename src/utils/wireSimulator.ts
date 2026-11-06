import { ProjectState, PlacedComponent, WireConnection, SimulationState } from '../types/electrical';

/**
 * Standard Portuguese / European industrial wire colors according to EN 60204-1:
 * - AC Phase (L1, L2, L3): Brown (#92400e) / Black (#0f172a) / Grey (#64748b)
 * - AC Neutral (N): Light Blue (#0284c7)
 * - Protective Earth (PE): Green/Yellow striped (#16a34a)
 * - DC +24V: Red (#dc2626)
 * - DC 0V / M: Dark Blue (#1e3a8a) or Black (#1e293b)
 * - Control / Signals: Orange (#ea580c) or Violet (#7c3aed)
 */

export const WIRE_COLORS = {
  ac_phase: '#92400e',      // Brown
  ac_neutral: '#0284c7',    // Bright Blue
  pe_ground: '#16a34a',     // Green
  dc_positive: '#dc2626',   // Bright Red (+24V)
  dc_negative: '#1e3a8a',   // Dark Blue (0V / M)
  control_signal: '#ea580c',// Orange (DI / DQ / Relé)
  analog_signal: '#8b5cf6', // Violet
};

export function createInitialSimulationState(): SimulationState {
  return {
    isPowered: true,
    isMainBreakerOn: true,
    isRcdTripped: false,
    isEmergencyStopActive: false,
    isPsuHealthy: true,
    measuredAcVoltage: 231.4,
    measuredDcVoltage: 24.08,
    measuredTotalCurrentA: 1.45,
    plcMode: 'RUN',
    digitalInputs: {
      'DI0': false, // Botão Marcha
      'DI1': false, // Botão Paragem (NF normal fechado)
      'DI2': true,  // Sensor de Nível / Segurança
      'DI3': false, // Seletor Manual / Auto
    },
    digitalOutputs: {
      'DQ0': false, // Comando Relé K1
      'DQ1': false, // Sinalizador Luminoso Verde
      'DQ2': false, // Alarme Buzzer
    },
    relayStates: {
      'K1': false,
      'K2': false,
    },
    trippedBreakerTags: [],
    activeFault: 'none',
  };
}

/**
 * Automatically synthesizes standard, realistic industrial panel wiring
 * connecting breakers, power supply, PLC, relays, and Viking terminals.
 */
export function generateDefaultWires(project: ProjectState): WireConnection[] {
  const allItems: PlacedComponent[] = project.rails.flatMap((r) => r.items);
  if (allItems.length === 0) return [];

  const wires: WireConnection[] = [];
  let wireIndex = 1;

  const nextTag = (prefix: string = 'W') => `${prefix}${String(wireIndex++).padStart(2, '0')}`;

  // Find components by functional category or tag
  const mainMcb = allItems.find(
    (it) => it.data.category === 'protection_ac' && (it.tag.startsWith('Q1') || it.data.name.toLowerCase().includes('geral'))
  ) || allItems.find((it) => it.data.category === 'protection_ac');

  const rcd = allItems.find(
    (it) => it.data.category === 'protection_ac' && (it.tag.startsWith('F') || it.data.name.toLowerCase().includes('diferencial'))
  );

  const subMcbs = allItems.filter(
    (it) => it.data.category === 'protection_ac' && it.instanceId !== mainMcb?.instanceId && it.instanceId !== rcd?.instanceId
  );

  const psu = allItems.find((it) => it.data.category === 'power_supply');
  const plc = allItems.find((it) => it.data.category === 'plc_cpu');
  const plcExpansions = allItems.filter((it) => it.data.category === 'plc_expansion');
  const relays = allItems.filter((it) => it.data.category === 'relays' || it.data.category === 'motor_control' || it.data.category === 'safety_relays');
  const terminals = allItems.filter((it) => it.data.category === 'terminals');
  const peTerminals = terminals.filter((it) => it.data.name.toLowerCase().includes('terra') || it.data.name.toLowerCase().includes('pe'));

  // 1. AC Main Incomer -> Main Breaker Q1
  if (mainMcb) {
    wires.push({
      id: `wire-ac-l-${mainMcb.instanceId}`,
      wireTag: nextTag('L'),
      fromComponentId: 'grid-feed',
      fromComponentTag: 'REDE',
      fromTerminal: 'L1',
      toComponentId: mainMcb.instanceId,
      toComponentTag: mainMcb.tag,
      toTerminal: '1',
      netType: 'ac_phase',
      color: WIRE_COLORS.ac_phase,
      crossSectionMm2: 6.0,
      notes: 'Entrada Alimentação Geral Fase',
    });

    wires.push({
      id: `wire-ac-n-${mainMcb.instanceId}`,
      wireTag: nextTag('N'),
      fromComponentId: 'grid-feed',
      fromComponentTag: 'REDE',
      fromTerminal: 'N',
      toComponentId: mainMcb.instanceId,
      toComponentTag: mainMcb.tag,
      toTerminal: 'N-in',
      netType: 'ac_neutral',
      color: WIRE_COLORS.ac_neutral,
      crossSectionMm2: 6.0,
      notes: 'Entrada Alimentação Geral Neutro',
    });
  }

  // 2. Main Breaker -> RCD (Diferencial)
  if (mainMcb && rcd) {
    wires.push({
      id: `wire-${mainMcb.instanceId}-${rcd.instanceId}-l`,
      wireTag: nextTag('L'),
      fromComponentId: mainMcb.instanceId,
      fromComponentTag: mainMcb.tag,
      fromTerminal: '2',
      toComponentId: rcd.instanceId,
      toComponentTag: rcd.tag,
      toTerminal: '1',
      netType: 'ac_phase',
      color: WIRE_COLORS.ac_phase,
      crossSectionMm2: 4.0,
      notes: 'Saída Q1 para Diferencial F1',
    });

    wires.push({
      id: `wire-${mainMcb.instanceId}-${rcd.instanceId}-n`,
      wireTag: nextTag('N'),
      fromComponentId: mainMcb.instanceId,
      fromComponentTag: mainMcb.tag,
      fromTerminal: 'N-out',
      toComponentId: rcd.instanceId,
      toComponentTag: rcd.tag,
      toTerminal: 'N-in',
      netType: 'ac_neutral',
      color: WIRE_COLORS.ac_neutral,
      crossSectionMm2: 4.0,
      notes: 'Neutro Q1 para Diferencial F1',
    });
  }

  // Source for auxiliary branch breakers
  const acSource = rcd || mainMcb;

  // 3. Connect Sub-Breakers
  subMcbs.forEach((mcb, idx) => {
    if (acSource) {
      wires.push({
        id: `wire-submcb-${mcb.instanceId}-l`,
        wireTag: nextTag('L'),
        fromComponentId: acSource.instanceId,
        fromComponentTag: acSource.tag,
        fromTerminal: '2',
        toComponentId: mcb.instanceId,
        toComponentTag: mcb.tag,
        toTerminal: '1',
        netType: 'ac_phase',
        color: WIRE_COLORS.ac_phase,
        crossSectionMm2: 2.5,
        notes: `Barramento de fase para circuito ${mcb.tag}`,
      });
    }
  });

  // 4. Power Supply G1 (Mean Well / Generic 24VDC)
  if (psu) {
    const psuMcb = subMcbs[0] || acSource;
    if (psuMcb) {
      wires.push({
        id: `wire-psu-feed-l`,
        wireTag: nextTag('L'),
        fromComponentId: psuMcb.instanceId,
        fromComponentTag: psuMcb.tag,
        fromTerminal: '2',
        toComponentId: psu.instanceId,
        toComponentTag: psu.tag,
        toTerminal: 'L',
        netType: 'ac_phase',
        color: WIRE_COLORS.ac_phase,
        crossSectionMm2: 1.5,
        notes: 'Alimentação Fase 230VAC Fonte 24V',
      });
    }

    if (acSource) {
      wires.push({
        id: `wire-psu-feed-n`,
        wireTag: nextTag('N'),
        fromComponentId: acSource.instanceId,
        fromComponentTag: acSource.tag,
        fromTerminal: 'N-out',
        toComponentId: psu.instanceId,
        toComponentTag: psu.tag,
        toTerminal: 'N',
        netType: 'ac_neutral',
        color: WIRE_COLORS.ac_neutral,
        crossSectionMm2: 1.5,
        notes: 'Alimentação Neutro 230VAC Fonte 24V',
      });
    }

    // PE Ground to PSU
    wires.push({
      id: `wire-psu-pe`,
      wireTag: nextTag('PE'),
      fromComponentId: peTerminals[0]?.instanceId || 'earth-bar',
      fromComponentTag: peTerminals[0]?.tag || 'BARRA-PE',
      fromTerminal: 'PE',
      toComponentId: psu.instanceId,
      toComponentTag: psu.tag,
      toTerminal: 'PE',
      netType: 'pe_ground',
      color: WIRE_COLORS.pe_ground,
      crossSectionMm2: 2.5,
      notes: 'Ligação à Terra de Proteção (PE)',
    });
  }

  // 5. 24VDC Distribution to PLC CPU Siemens
  if (psu && plc) {
    wires.push({
      id: `wire-dc-plus-plc`,
      wireTag: '24V.01',
      fromComponentId: psu.instanceId,
      fromComponentTag: psu.tag,
      fromTerminal: '+V',
      toComponentId: plc.instanceId,
      toComponentTag: plc.tag,
      toTerminal: 'L+',
      netType: 'dc_positive',
      color: WIRE_COLORS.dc_positive,
      crossSectionMm2: 1.5,
      notes: 'Alimentação +24V DC CPU PLC Siemens',
    });

    wires.push({
      id: `wire-dc-minus-plc`,
      wireTag: '0V.01',
      fromComponentId: psu.instanceId,
      fromComponentTag: psu.tag,
      fromTerminal: '-V',
      toComponentId: plc.instanceId,
      toComponentTag: plc.tag,
      toTerminal: 'M',
      netType: 'dc_negative',
      color: WIRE_COLORS.dc_negative,
      crossSectionMm2: 1.5,
      notes: 'Massa 0V DC CPU PLC Siemens',
    });

    // PE to PLC
    wires.push({
      id: `wire-plc-pe`,
      wireTag: nextTag('PE'),
      fromComponentId: psu.instanceId,
      fromComponentTag: psu.tag,
      fromTerminal: 'PE',
      toComponentId: plc.instanceId,
      toComponentTag: plc.tag,
      toTerminal: 'PE',
      netType: 'pe_ground',
      color: WIRE_COLORS.pe_ground,
      crossSectionMm2: 1.5,
      notes: 'Terra Funcional PLC Siemens',
    });
  }

  // 6. Connect PLC Expansion Modules if present
  if (plc && plcExpansions.length > 0) {
    plcExpansions.forEach((exp, idx) => {
      wires.push({
        id: `wire-exp-dc-${exp.instanceId}`,
        wireTag: `24V.${String(idx + 2).padStart(2, '0')}`,
        fromComponentId: plc.instanceId,
        fromComponentTag: plc.tag,
        fromTerminal: 'L+',
        toComponentId: exp.instanceId,
        toComponentTag: exp.tag,
        toTerminal: 'L+',
        netType: 'dc_positive',
        color: WIRE_COLORS.dc_positive,
        crossSectionMm2: 1.0,
        notes: `Alimentação 24V Módulo de Expansão ${exp.tag}`,
      });
      wires.push({
        id: `wire-exp-gnd-${exp.instanceId}`,
        wireTag: `0V.${String(idx + 2).padStart(2, '0')}`,
        fromComponentId: plc.instanceId,
        fromComponentTag: plc.tag,
        fromTerminal: 'M',
        toComponentId: exp.instanceId,
        toComponentTag: exp.tag,
        toTerminal: 'M',
        netType: 'dc_negative',
        color: WIRE_COLORS.dc_negative,
        crossSectionMm2: 1.0,
        notes: `Massa 0V Módulo de Expansão ${exp.tag}`,
      });
    });
  }

  // 7. Connect PLC Digital Outputs to Relays (Interface Finder / Weidmuller)
  if (plc && relays.length > 0) {
    relays.forEach((relay, rIdx) => {
      // PLC DQ to Relay Coil A1
      wires.push({
        id: `wire-plc-relay-${relay.instanceId}`,
        wireTag: `DQ0.${rIdx}`,
        fromComponentId: plc.instanceId,
        fromComponentTag: plc.tag,
        fromTerminal: `DQ 0.${rIdx}`,
        toComponentId: relay.instanceId,
        toComponentTag: relay.tag,
        toTerminal: 'A1',
        netType: 'control_signal',
        color: WIRE_COLORS.control_signal,
        crossSectionMm2: 0.75,
        notes: `Comando Saída PLC DQ 0.${rIdx} para Bobina Relé ${relay.tag}`,
      });

      // Relay Coil A2 to 0V
      if (psu) {
        wires.push({
          id: `wire-relay-gnd-${relay.instanceId}`,
          wireTag: `0V.K${rIdx + 1}`,
          fromComponentId: psu.instanceId,
          fromComponentTag: psu.tag,
          fromTerminal: '-V',
          toComponentId: relay.instanceId,
          toComponentTag: relay.tag,
          toTerminal: 'A2',
          netType: 'dc_negative',
          color: WIRE_COLORS.dc_negative,
          crossSectionMm2: 0.75,
          notes: `Retorno Bobina A2 Relé ${relay.tag} ao 0V`,
        });
      }

      // Relay Contact (11-14) to Viking Field Terminal Block
      if (terminals.length > 0) {
        const targetTerminal = terminals[Math.min(rIdx + 3, terminals.length - 1)];
        wires.push({
          id: `wire-relay-contact-${relay.instanceId}`,
          wireTag: `OUT.${relay.tag}`,
          fromComponentId: relay.instanceId,
          fromComponentTag: relay.tag,
          fromTerminal: '14 (NO)',
          toComponentId: targetTerminal.instanceId,
          toComponentTag: targetTerminal.tag,
          toTerminal: '1',
          netType: 'control_signal',
          color: '#f59e0b',
          crossSectionMm2: 1.5,
          notes: `Contacto NA Relé ${relay.tag} para Borne de Campo ${targetTerminal.tag}`,
        });
      }
    });
  }

  // 8. Connect Viking Field Terminals (Inputs) to PLC Digital Inputs
  if (plc && terminals.length > 0) {
    const inputTerminals = terminals.filter((t) => !peTerminals.includes(t)).slice(0, 3);
    inputTerminals.forEach((term, idx) => {
      wires.push({
        id: `wire-term-input-${term.instanceId}`,
        wireTag: `DI0.${idx}`,
        fromComponentId: term.instanceId,
        fromComponentTag: term.tag,
        fromTerminal: '2',
        toComponentId: plc.instanceId,
        toComponentTag: plc.tag,
        toTerminal: `DI 0.${idx}`,
        netType: 'control_signal',
        color: WIRE_COLORS.control_signal,
        crossSectionMm2: 0.75,
        notes: `Entrada Campo Borne ${term.tag} para Entrada Digital PLC DI 0.${idx}`,
      });
    });
  }

  // Incorporar ligações criadas manualmente pelo utilizador
  if (project.wires && project.wires.length > 0) {
    project.wires.forEach((customWire) => {
      const existingIdx = wires.findIndex((w) => w.id === customWire.id);
      if (existingIdx >= 0) {
        wires[existingIdx] = customWire;
      } else {
        wires.push(customWire);
      }
    });
  }

  return wires;
}

/**
 * Calculates live simulation states across the electrical circuit:
 * energization of wires, trip conditions, PLC logic loop, and relay states.
 */
export function simulateCircuit(
  project: ProjectState,
  wires: WireConnection[],
  state: SimulationState
): { updatedWires: WireConnection[]; updatedState: SimulationState } {
  const isAcAvailable = state.isPowered && state.isMainBreakerOn && !state.isRcdTripped && !state.isEmergencyStopActive;
  const isDcAvailable = isAcAvailable && state.isPsuHealthy && state.activeFault !== 'dc_short' && state.activeFault !== 'short_circuit';

  // PLC Logic loop:
  // If Start button (DI0) is pressed, or if already latched and Stop button (DI1) is not pressed
  const di0 = Boolean(state.digitalInputs['DI0']); // Start button
  const di1 = Boolean(state.digitalInputs['DI1']); // Stop button
  const isPlcRunning = isDcAvailable && state.plcMode === 'RUN';

  let dq0 = false;
  if (isPlcRunning) {
    // If Start pressed, latch output unless stop is pressed
    if (di0 && !di1) {
      dq0 = true;
    } else if (!di1 && state.digitalOutputs['DQ0']) {
      dq0 = true;
    }
  }

  const updatedDigitalOutputs = {
    ...state.digitalOutputs,
    'DQ0': dq0,
    'DQ1': isPlcRunning, // Green running beacon
    'DQ2': state.activeFault !== 'none' || state.isRcdTripped, // Fault buzzer
  };

  // Relays activate when their driving output is true
  const updatedRelays: Record<string, boolean> = {};
  wires.forEach((w) => {
    if (w.fromTerminal.includes('DQ 0.0') || w.wireTag.includes('DQ0.0')) {
      updatedRelays[w.toComponentTag] = isPlcRunning && dq0;
    }
  });
  if (Object.keys(updatedRelays).length === 0) {
    updatedRelays['K1'] = isPlcRunning && dq0;
  }

  // Calculate live wire energization
  const updatedWires = wires.map((wire) => {
    let isEnergized = false;

    if (wire.netType === 'ac_phase' || wire.netType === 'ac_neutral') {
      isEnergized = isAcAvailable;
    } else if (wire.netType === 'pe_ground') {
      isEnergized = true; // Earth is always bonded
    } else if (wire.netType === 'dc_positive' || wire.netType === 'dc_negative') {
      isEnergized = isDcAvailable;
    } else if (wire.netType === 'control_signal') {
      if (wire.fromTerminal.includes('DQ') || wire.wireTag.includes('DQ')) {
        isEnergized = isPlcRunning && dq0;
      } else if (wire.toTerminal.includes('DI') || wire.wireTag.includes('DI')) {
        isEnergized = isDcAvailable && Boolean(state.digitalInputs['DI0'] || state.digitalInputs['DI2']);
      } else if (wire.fromTerminal.includes('14') || wire.notes?.includes('Contacto')) {
        isEnergized = Boolean(updatedRelays['K1']);
      } else {
        isEnergized = isDcAvailable;
      }
    }

    return {
      ...wire,
      isEnergized,
    };
  });

  const updatedState: SimulationState = {
    ...state,
    measuredAcVoltage: isAcAvailable ? 230.5 : 0.0,
    measuredDcVoltage: isDcAvailable ? 24.08 : 0.0,
    measuredTotalCurrentA: isDcAvailable ? (dq0 ? 2.35 : 1.15) : 0.0,
    digitalOutputs: updatedDigitalOutputs,
    relayStates: updatedRelays,
  };

  return { updatedWires, updatedState };
}
