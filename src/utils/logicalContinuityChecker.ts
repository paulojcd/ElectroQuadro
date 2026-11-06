import { 
  ProjectState, 
  PlacedComponent, 
  WireConnection, 
  LogicalContinuityIssue, 
  LogicalContinuityReport 
} from '../types/electrical';
import { getComponentTerminals, ComponentTerminalAnchor } from './terminalLayoutUtils';
import { generateUnifilarRoutingData } from './unifilarCircuitRouter';

/**
 * Logical Electrical Continuity Engine
 * Evaluates netlist completeness, floating input/output pins, open circuits,
 * missing return paths (Neutral/0VDC), and earth grounding continuity.
 * Normative references: IEC 60204-1, EN 61439-1/2, IEC 60898, ISO 13849-1.
 */
export function checkLogicalContinuity(project: ProjectState): LogicalContinuityReport {
  const issues: LogicalContinuityIssue[] = [];
  const allItems: PlacedComponent[] = project.rails.flatMap((r) => r.items);
  const wires: WireConnection[] = project.wires || [];
  const unifilarData = generateUnifilarRoutingData(project);

  // Map of connected terminals by component instance ID: Set<terminalId>
  const connectedTerminalsByComponent = new Map<string, Set<string>>();
  const connectedTerminalsByTag = new Map<string, Set<string>>();

  // Populate connection sets from direct wiring
  for (const w of wires) {
    if (!connectedTerminalsByComponent.has(w.fromComponentId)) {
      connectedTerminalsByComponent.set(w.fromComponentId, new Set());
    }
    connectedTerminalsByComponent.get(w.fromComponentId)!.add(w.fromTerminal.toLowerCase());

    if (!connectedTerminalsByTag.has(w.fromComponentTag)) {
      connectedTerminalsByTag.set(w.fromComponentTag, new Set());
    }
    connectedTerminalsByTag.get(w.fromComponentTag)!.add(w.fromTerminal.toLowerCase());

    if (!connectedTerminalsByComponent.has(w.toComponentId)) {
      connectedTerminalsByComponent.set(w.toComponentId, new Set());
    }
    connectedTerminalsByComponent.get(w.toComponentId)!.add(w.toTerminal.toLowerCase());

    if (!connectedTerminalsByTag.has(w.toComponentTag)) {
      connectedTerminalsByTag.set(w.toComponentTag, new Set());
    }
    connectedTerminalsByTag.get(w.toComponentTag)!.add(w.toTerminal.toLowerCase());
  }

  // Also integrate auto-routed unifilar circuit connections
  for (const c of unifilarData.circuits) {
    const bTag = c.breakerTag;
    const bId = c.breaker.instanceId;
    if (!connectedTerminalsByComponent.has(bId)) {
      connectedTerminalsByComponent.set(bId, new Set());
    }
    if (!connectedTerminalsByTag.has(bTag)) {
      connectedTerminalsByTag.set(bTag, new Set());
    }

    // Input top pins (L, 1, 3, 5, N-in) are logically fed by the incomer bus
    connectedTerminalsByComponent.get(bId)!.add('1');
    connectedTerminalsByComponent.get(bId)!.add('l');
    connectedTerminalsByComponent.get(bId)!.add('n-in');
    connectedTerminalsByTag.get(bTag)!.add('1');
    connectedTerminalsByTag.get(bTag)!.add('l');
    connectedTerminalsByTag.get(bTag)!.add('n-in');

    // Output bottom pins are routed to terminals
    connectedTerminalsByComponent.get(bId)!.add('2');
    connectedTerminalsByComponent.get(bId)!.add('n-out');
    connectedTerminalsByTag.get(bTag)!.add('2');
    connectedTerminalsByTag.get(bTag)!.add('n-out');
  }

  const isTerminalConnected = (comp: PlacedComponent, terminalId: string): boolean => {
    const tid = terminalId.toLowerCase();
    const setById = connectedTerminalsByComponent.get(comp.instanceId);
    if (setById && (setById.has(tid) || Array.from(setById).some((t) => t.includes(tid) || tid.includes(t)))) {
      return true;
    }
    const setByTag = connectedTerminalsByTag.get(comp.tag);
    if (setByTag && (setByTag.has(tid) || Array.from(setByTag).some((t) => t.includes(tid) || tid.includes(t)))) {
      return true;
    }
    return false;
  };

  let totalPinsAudited = 0;
  let connectedPinsCount = 0;
  const componentStats: LogicalContinuityReport['componentStats'] = [];

  // Audit each component
  for (const comp of allItems) {
    const cat = comp.data.category;
    const itW = comp.data.widthMm;
    const nameLower = (comp.data.name + ' ' + (comp.data.partNumber || '')).toLowerCase();
    
    // Get all standard physical anchors
    const anchors = getComponentTerminals(comp, comp.railIndex, 60, 100);
    let compConnectedCount = 0;

    for (const a of anchors) {
      totalPinsAudited++;
      const isConn = isTerminalConnected(comp, a.terminalId);
      if (isConn) {
        connectedPinsCount++;
        compConnectedCount++;
      }
    }

    // Domain-specific rule checks based on component category
    
    // 1. Fontes de Alimentação (Mean Well / SITOP / 24V DC)
    if (cat === 'power_supply') {
      const hasL = isTerminalConnected(comp, 'L') || isTerminalConnected(comp, '1');
      const hasN = isTerminalConnected(comp, 'N') || isTerminalConnected(comp, 'N-in');
      const hasPE = isTerminalConnected(comp, 'PE') || isTerminalConnected(comp, 'GND');
      const hasPlusV = isTerminalConnected(comp, '+V') || isTerminalConnected(comp, '+24V') || isTerminalConnected(comp, '24V');
      const hasMinusV = isTerminalConnected(comp, '-V') || isTerminalConnected(comp, '0V') || isTerminalConnected(comp, 'M');

      // Rule: AC Input incomplete (Phase connected without Neutral or vice-versa)
      if (hasL && !hasN) {
        issues.push({
          id: `cont_${comp.instanceId}_missing_n`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: 'N',
          terminalLabel: 'Borne N (Neutro)',
          terminalType: 'power_in',
          severity: 'critical',
          title: 'Entrada AC com Neutro Aberto',
          description: `A fonte ${comp.tag} recebe Fase L mas o borne Neutro (N) está desprovido de ligação. O circuito primário não fecha e a fonte não alimentará o barramento.`,
          normativeRef: 'EN 61439-1 §8.5.2 & IEC 60364-5-52',
          suggestedRemedy: `Ligue o borne N de ${comp.tag} ao barramento geral de neutro ou disjuntor diferencial a montante.`,
        });
      } else if (!hasL && !hasN) {
        issues.push({
          id: `cont_${comp.instanceId}_no_ac`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: 'L',
          terminalLabel: 'Bornes L / N',
          terminalType: 'power_in',
          severity: 'warning',
          title: 'Fonte de Alimentação sem Alimentação Primária',
          description: `A fonte ${comp.tag} (${comp.data.name}) não possui cablagem de entrada AC (L/N).`,
          normativeRef: 'EN 60204-1 §4.3',
          suggestedRemedy: `Conecte a entrada da fonte a um disjuntor de proteção dedicado (ex: 6A ou 10A Curva C).`,
        });
      }

      // Rule: Missing PE Ground
      if (!hasPE) {
        issues.push({
          id: `cont_${comp.instanceId}_missing_pe`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: 'PE',
          terminalLabel: 'Borne PE (Terra)',
          terminalType: 'ground',
          severity: 'critical',
          title: 'Falta de Ligação à Terra de Proteção (PE)',
          description: `A carcaça metálica da fonte ${comp.tag} requer ligação obrigatória de proteção PE para escoamento de fugas e imunidade a transientes.`,
          normativeRef: 'IEC 60204-1 §8.2 (Equipotencialidade de Proteção)',
          suggestedRemedy: `Ligue o pino PE de ${comp.tag} com condutor Verde/Amarelo de 1.5mm² ao barramento de terra.`,
        });
      }

      // Rule: DC Output floating return (24V wired but 0V open)
      if (hasPlusV && !hasMinusV) {
        issues.push({
          id: `cont_${comp.instanceId}_floating_0v`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: '-V',
          terminalLabel: 'Borne -V (0V DC / Massa)',
          terminalType: 'power_out',
          severity: 'critical',
          title: 'Retorno de 0V DC em Circuito Aberto',
          description: `A saída +24V de ${comp.tag} possui condutor conectado, mas o polo negativo (-V / 0V) não está ligado. Todas as cargas DC ficarão inoperantes por falta de caminho de retorno.`,
          normativeRef: 'EN 60204-1 §9.1.1 (Circuitos de Comando PELV/SELV)',
          suggestedRemedy: `Ligue o borne -V ao borne distribuidor 0V (M) da régua de comando.`,
        });
      }
    }

    // 2. Disjuntores & Diferenciais AC (category: 'protection_ac', 'protection_dc')
    if (cat === 'protection_ac' || cat === 'protection_dc') {
      const is2P = itW >= 32 && itW < 50;
      const is3P = itW >= 50 && itW < 68;
      const is4P = itW >= 68;

      const hasIn1 = isTerminalConnected(comp, '1');
      const hasOut2 = isTerminalConnected(comp, '2');
      const hasInN = isTerminalConnected(comp, 'N-in');
      const hasOutN = isTerminalConnected(comp, 'N-out');

      // Unconnected breaker outputs
      if (!hasOut2) {
        issues.push({
          id: `cont_${comp.instanceId}_open_output`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: '2',
          terminalLabel: 'Borne 2 (Saída)',
          terminalType: 'output',
          severity: 'warning',
          title: 'Saída do Disjuntor em Vazio / Circuito Aberto',
          description: `O disjuntor de proteção ${comp.tag} (${comp.data.name}) não tem carga ou régua de bornes atribuída na saída do polo principal (Borne 2).`,
          normativeRef: 'IEC 60898-1 / RTIEBT §533',
          suggestedRemedy: `Interligue o borne 2 a um circuito terminal de tomadas, iluminação ou régua de bornes X1.`,
        });
      }

      // Neutral mismatch on 2P / 4P breakers
      if ((is2P || is4P) && hasOut2 && !hasOutN) {
        issues.push({
          id: `cont_${comp.instanceId}_missing_n_out`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: 'N-out',
          terminalLabel: 'Borne N (Saída)',
          terminalType: 'output',
          severity: 'critical',
          title: 'Polo de Neutro de Saída não Conectado',
          description: `O disjuntor bipolar/tetrapolar ${comp.tag} alimenta a fase no Borne 2 mas o seu polo de neutro protegido/seccionado (N) está aberto, gerando risco de flutuação de neutro.`,
          normativeRef: 'IEC 60364-4-43 & EN 61439-1',
          suggestedRemedy: `Conecte o borne de saída de neutro ao bloco terminal correspondente (ex: X1:N).`,
        });
      }
    }

    // 3. PLCs & CPUs Siemens (category: 'plc_cpu')
    if (cat === 'plc_cpu') {
      const hasLPlus = isTerminalConnected(comp, 'L+');
      const hasM = isTerminalConnected(comp, 'M');
      const hasPE = isTerminalConnected(comp, 'PE');
      const hasOneL = isTerminalConnected(comp, '1L');

      if (!hasLPlus || !hasM) {
        issues.push({
          id: `cont_${comp.instanceId}_plc_no_power`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: !hasLPlus ? 'L+' : 'M',
          terminalLabel: !hasLPlus ? 'Borne L+ (+24V)' : 'Borne M (0V)',
          terminalType: 'power_in',
          severity: 'critical',
          title: 'CPU Siemens sem Alimentação DC',
          description: `O autómato ${comp.tag} (${comp.data.name}) necessita de 24VDC nos bornes L+ e M para iniciar o sistema operativo.`,
          normativeRef: 'Siemens S7-1200 System Manual & EN 61131-2',
          suggestedRemedy: `Ligue L+ à saída da fonte 24VDC e M ao barramento de massa comum.`,
        });
      }

      if (!hasPE) {
        issues.push({
          id: `cont_${comp.instanceId}_plc_no_pe`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: 'PE',
          terminalLabel: 'Borne PE (Terra Funcional)',
          terminalType: 'ground',
          severity: 'warning',
          title: 'Terra Funcional do PLC em Falta',
          description: `O borne de aterramento funcional do PLC ${comp.tag} desvia ruído de modo comum das portas de comunicação PROFINET e entradas analógicas.`,
          normativeRef: 'EN 61000-6-2 (Imunidade EMC Industrial)',
          suggestedRemedy: `Ligue o pino de terra do PLC ao ponto equipotencial da calha DIN com cabo verde/amarelo.`,
        });
      }

      if (!hasOneL) {
        issues.push({
          id: `cont_${comp.instanceId}_plc_no_1l`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: '1L',
          terminalLabel: 'Borne 1L (Alimentação Saídas)',
          terminalType: 'power_in',
          severity: 'warning',
          title: 'Barramento de Saídas Digitais (1L) Desenergizado',
          description: `As saídas digitais a relé ou transístor do PLC ${comp.tag} exigem alimentação positiva no borne 1L para poderem atracar contactores ou relés.`,
          normativeRef: 'EN 61131-2',
          suggestedRemedy: `Alimente o borne 1L com +24VDC proveniente de disjuntor de comando DC.`,
        });
      }
    }

    // 4. Relés de Interface e Contactores (category: 'relays', 'motor_control')
    if (cat === 'relays' || cat === 'motor_control') {
      const hasA1 = isTerminalConnected(comp, 'A1');
      const hasA2 = isTerminalConnected(comp, 'A2');
      const has11 = isTerminalConnected(comp, '11') || isTerminalConnected(comp, '13') || isTerminalConnected(comp, '1');
      const has14 = isTerminalConnected(comp, '14');

      // Relay coil incomplete: A1 wired without A2 or vice-versa
      if (hasA1 && !hasA2) {
        issues.push({
          id: `cont_${comp.instanceId}_relay_coil_open`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: 'A2',
          terminalLabel: 'Borne A2 (Retorno Bobina)',
          terminalType: 'input',
          severity: 'critical',
          title: 'Bobina do Relé sem Retorno de Neutro / 0V (A2 Aberto)',
          description: `O sinal de excitação de comando chega ao borne A1 de ${comp.tag}, mas o borne A2 não possui condutor de retorno para o neutro ou 0V. O relé nunca irá atracar.`,
          normativeRef: 'EN 60204-1 §9.1.4 (Alimentação de Circuitos de Comando)',
          suggestedRemedy: `Ligue o borne A2 ao barramento 0VDC (se relé 24V) ou ao Neutro (se relé 230VAC).`,
        });
      } else if (!hasA1 && !hasA2 && cat === 'relays') {
        issues.push({
          id: `cont_${comp.instanceId}_relay_unused`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: 'A1',
          terminalLabel: 'Bornes A1 / A2',
          terminalType: 'input',
          severity: 'info',
          title: 'Relé de Interface de Reserva / Sem Excitação',
          description: `O relé ${comp.tag} encontra-se na calha DIN sem cablagem na bobina. Considere como reserva para expansão futura ou ligue a uma saída do autómato.`,
          normativeRef: 'IEC 60947-5-1',
          suggestedRemedy: `Interligue a bobina A1 a uma saída digital (ex: PLC DQ 0.0).`,
        });
      }

      // Contact common energized without load
      if (has11 && !has14) {
        issues.push({
          id: `cont_${comp.instanceId}_contact_open`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: '14',
          terminalLabel: 'Borne 14 (Contacto NA)',
          terminalType: 'output',
          severity: 'info',
          title: 'Contacto de Saída 14 Aberto',
          description: `O polo comum (11) do relé ${comp.tag} possui ligação mas o contacto normalmente aberto (14) não conduz a nenhum atuador ou borne.`,
          normativeRef: 'EN 60204-1',
          suggestedRemedy: `Ligue o borne 14 à bobina do contactor de potência ou borne de campo.`,
        });
      }
    }

    // 5. Relés de Segurança (category: 'safety_relays')
    if (cat === 'safety_relays') {
      const hasA1 = isTerminalConnected(comp, 'A1');
      const hasA2 = isTerminalConnected(comp, 'A2');
      const hasS12 = isTerminalConnected(comp, 'S12');
      const hasS22 = isTerminalConnected(comp, 'S22');

      if ((hasS12 && !hasS22) || (!hasS12 && hasS22)) {
        issues.push({
          id: `cont_${comp.instanceId}_safety_single_channel`,
          componentId: comp.instanceId,
          componentTag: comp.tag,
          componentName: comp.data.name,
          terminalId: !hasS22 ? 'S22' : 'S12',
          terminalLabel: !hasS22 ? 'Canal 2 (S21-S22)' : 'Canal 1 (S11-S12)',
          terminalType: 'signal',
          severity: 'critical',
          title: 'Perda de Redundância no Circuito de Segurança (Canal Único)',
          description: `O módulo de segurança ${comp.tag} detetou apenas um dos dois canais de paragem de emergência conectados. Violação de integridade Cat 4 / PLe.`,
          normativeRef: 'ISO 13849-1 (Segurança de Máquinas) & EN 60204-1 §9.2.2',
          suggestedRemedy: `Ligue ambos os contactos NF do botão de emergência aos terminais de canal duplo S11-S12 e S21-S22.`,
        });
      }
    }

    // Record component continuity stat
    const openCount = anchors.length - compConnectedCount;
    componentStats.push({
      tag: comp.tag,
      name: comp.data.name,
      totalTerminals: anchors.length,
      connectedTerminals: compConnectedCount,
      openTerminals: openCount,
      status: openCount === 0 ? 'complete' : compConnectedCount > 0 ? 'partial' : 'unconnected',
    });
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  const incompletePinsCount = totalPinsAudited - connectedPinsCount;
  const continuityScorePercent = totalPinsAudited > 0
    ? Math.max(0, Math.min(100, Math.round((connectedPinsCount / totalPinsAudited) * 100)))
    : 100;

  return {
    totalPinsAudited,
    connectedPinsCount,
    incompletePinsCount,
    continuityScorePercent,
    criticalCount,
    warningCount,
    infoCount,
    issues,
    componentStats,
  };
}

/**
 * Automatically creates suggested missing connections for an issue
 */
export function autoResolveContinuityIssue(
  project: ProjectState,
  issue: LogicalContinuityIssue
): ProjectState {
  const currentWires = [...(project.wires || [])];
  const allItems = project.rails.flatMap((r) => r.items);
  const comp = allItems.find((i) => i.instanceId === issue.componentId || i.tag === issue.componentTag);
  if (!comp) return project;

  // Case A: Missing PE Ground on Power Supply or PLC
  if (issue.terminalId === 'PE') {
    // Look for PE terminal block or create a grounding wire
    const peTerminal = allItems.find((i) => i.data.category === 'terminals' && i.data.name.toLowerCase().includes('pe'));
    const targetId = peTerminal ? peTerminal.instanceId : 'pe_ground_bus';
    const targetTag = peTerminal ? peTerminal.tag : 'PE_BAR';

    const newWire: WireConnection = {
      id: `w_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      wireTag: `PE-${comp.tag}`,
      fromComponentId: comp.instanceId,
      fromComponentTag: comp.tag,
      fromTerminal: 'PE',
      toComponentId: targetId,
      toComponentTag: targetTag,
      toTerminal: 'PE',
      netType: 'pe_ground',
      color: '#84cc16', // green/yellow
      crossSectionMm2: 2.5,
      isEnergized: false,
      notes: 'Ligação automática de terra de proteção (EN 60204-1)',
    };
    return { ...project, wires: [...currentWires, newWire] };
  }

  // Case B: Missing Neutral on Power Supply or Breaker
  if (issue.terminalId === 'N' || issue.terminalId === 'N-in') {
    const mainBreaker = allItems.find((i) => i.data.category === 'protection_ac' && i.data.name.toLowerCase().includes('diferencial'));
    const targetId = mainBreaker ? mainBreaker.instanceId : 'neutral_bus';
    const targetTag = mainBreaker ? mainBreaker.tag : 'N_BAR';

    const newWire: WireConnection = {
      id: `w_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      wireTag: `N-${comp.tag}`,
      fromComponentId: comp.instanceId,
      fromComponentTag: comp.tag,
      fromTerminal: issue.terminalId,
      toComponentId: targetId,
      toComponentTag: targetTag,
      toTerminal: 'N-out',
      netType: 'ac_neutral',
      color: '#0284c7', // blue
      crossSectionMm2: 1.5,
      isEnergized: true,
      notes: 'Ligação automática de neutro (EN 61439-1)',
    };
    return { ...project, wires: [...currentWires, newWire] };
  }

  // Case C: Missing 0V on DC Load or Relay Coil (A2)
  if (issue.terminalId === '-V' || issue.terminalId === 'A2' || issue.terminalId === 'M') {
    const psu = allItems.find((i) => i.data.category === 'power_supply');
    const targetId = psu ? psu.instanceId : 'dc_zero_bus';
    const targetTag = psu ? psu.tag : '0V_BAR';

    const newWire: WireConnection = {
      id: `w_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      wireTag: `0V-${comp.tag}`,
      fromComponentId: comp.instanceId,
      fromComponentTag: comp.tag,
      fromTerminal: issue.terminalId,
      toComponentId: targetId,
      toComponentTag: targetTag,
      toTerminal: '-V',
      netType: 'dc_negative',
      color: '#1e293b', // dark blue/black
      crossSectionMm2: 1.0,
      isEnergized: true,
      notes: 'Retorno de 0V DC / Massa (PELV)',
    };
    return { ...project, wires: [...currentWires, newWire] };
  }

  return project;
}
