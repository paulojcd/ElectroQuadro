import { ProjectState, PlacedComponent, WireConnection, WireNetType } from '../types/electrical';
import { generateDefaultWires, WIRE_COLORS } from './wireSimulator';
import { getAllProjectTerminals, ComponentTerminalAnchor } from './terminalLayoutUtils';
import { routeManhattanWire } from './manhattanRouter';

export interface WiringListItem {
  id: string;
  wireTag: string;
  fromComponentTag: string;
  fromComponentName: string;
  fromTerminal: string;
  fromLocation: string;
  toComponentTag: string;
  toComponentName: string;
  toTerminal: string;
  toLocation: string;
  netType: WireNetType;
  netTypeLabel: string;
  voltage: string;
  currentNominalA: number;
  wireColorName: string;
  wireColorHex: string;
  crossSectionMm2: number;
  cableSpec: 'H07V-K' | 'H05V-K';
  lengthMm: number;
  lengthM: number;
  isEnergized: boolean;
  notes: string;
}

export interface CableStockMeterage {
  key: string;
  cableSpec: 'H07V-K' | 'H05V-K';
  crossSectionMm2: number;
  colorName: string;
  colorHex: string;
  netTypeLabel: string;
  wireCount: number;
  totalLengthM: number;
  recommendedSpoolM: number; // Rounded up with 15% fabrication safety margin
}

/**
 * Portuguese & European standard wire color naming (EN 60204-1 / IEC 60446)
 */
export function getStandardWireColorName(netType: WireNetType): { name: string; hex: string } {
  switch (netType) {
    case 'ac_phase':
      return { name: 'Castanho (Fase L)', hex: WIRE_COLORS.ac_phase };
    case 'ac_neutral':
      return { name: 'Azul Claro (Neutro N)', hex: WIRE_COLORS.ac_neutral };
    case 'pe_ground':
      return { name: 'Verde/Amarelo (Terra PE)', hex: WIRE_COLORS.pe_ground };
    case 'dc_positive':
      return { name: 'Vermelho (+24V DC)', hex: WIRE_COLORS.dc_positive };
    case 'dc_negative':
      return { name: 'Azul Escuro (0V / Massa)', hex: WIRE_COLORS.dc_negative };
    case 'control_signal':
      return { name: 'Laranja (Comando/Sinal)', hex: WIRE_COLORS.control_signal };
    case 'analog_signal':
      return { name: 'Roxo (Sinal Analógico)', hex: WIRE_COLORS.analog_signal };
    default:
      return { name: 'Preto (Auxiliar)', hex: '#334155' };
  }
}

export function getNetTypeDescription(netType: WireNetType): string {
  switch (netType) {
    case 'ac_phase':
      return 'Potência AC (Fase)';
    case 'ac_neutral':
      return 'Neutro AC';
    case 'pe_ground':
      return 'Proteção Terra (PE)';
    case 'dc_positive':
      return 'Alimentação DC +24V';
    case 'dc_negative':
      return 'Alimentação DC 0V / Retorno';
    case 'control_signal':
      return 'Controlo Digital (I/O)';
    case 'analog_signal':
      return 'Sinal Analógico 4-20mA/0-10V';
    default:
      return 'Condutor Auxiliar';
  }
}

/**
 * Generates the full detailed Wiring Schedule ("Lista de Cablagem De-Para")
 * for all connections in the electrical cabinet.
 */
export function getProjectWiringList(project: ProjectState): WiringListItem[] {
  const baseWires = generateDefaultWires(project);
  const activeWires = project.wires !== undefined ? project.wires : baseWires;

  // Build component and rail spatial map
  const compMap: Record<string, { item: PlacedComponent; railIdx: number; railName: string; railY: number; centerX: number; topY: number; bottomY: number }> = {};
  const sideDuct = project.config.sideDuctWidthMm || 40;
  const horizDuct = project.config.horizontalDuctHeightMm || 40;
  const railSpacing = project.config.railSpacingMm || 150;

  project.rails.forEach((rail, rIdx) => {
    const railX = 24 + sideDuct + 10;
    const railY = 80 + rIdx * railSpacing;

    rail.items.forEach((it) => {
      const itH = it.data.heightMm || 90;
      const itY = railY + (55 - itH / 2);
      const centerX = railX + it.positionMm + it.data.widthMm / 2;
      const topY = itY;
      const bottomY = itY + itH;

      const info = {
        item: it,
        railIdx: rIdx,
        railName: rail.name || `Calha ${rIdx + 1}`,
        railY,
        centerX,
        topY,
        bottomY,
      };

      compMap[it.tag] = info;
      compMap[it.instanceId] = info;
    });
  });

  const allAnchors: ComponentTerminalAnchor[] = getAllProjectTerminals(project);

  return activeWires.map((wire, wIdx) => {
    const fromComp = compMap[wire.fromComponentTag] || compMap[wire.fromComponentId];
    const toComp = compMap[wire.toComponentTag] || compMap[wire.toComponentId];

    // Fallback coordinates if external or incomer grid feed
    const cabWidth = project.config.widthMm;
    const cabHeight = project.config.heightMm;

    const fromAnchor = allAnchors.find(
      (a) =>
        (a.componentId === wire.fromComponentId || a.componentTag === wire.fromComponentTag) &&
        (a.terminalId.toLowerCase() === wire.fromTerminal.toLowerCase() ||
          a.label.toLowerCase() === wire.fromTerminal.toLowerCase() ||
          a.label.includes(wire.fromTerminal))
    );

    const toAnchor = allAnchors.find(
      (a) =>
        (a.componentId === wire.toComponentId || a.componentTag === wire.toComponentTag) &&
        (a.terminalId.toLowerCase() === wire.toTerminal.toLowerCase() ||
          a.label.toLowerCase() === wire.toTerminal.toLowerCase() ||
          a.label.includes(wire.toTerminal))
    );

    const fromIsTop = fromAnchor
      ? fromAnchor.isTop
      : !(
          wire.fromTerminal.includes('2') ||
          wire.fromTerminal.includes('out') ||
          wire.fromTerminal.includes('-V') ||
          wire.fromTerminal.includes('M') ||
          wire.fromTerminal.includes('DQ') ||
          wire.fromTerminal.includes('14')
        );

    const toIsTop = toAnchor
      ? toAnchor.isTop
      : !(
          wire.toTerminal.includes('2') ||
          wire.toTerminal.includes('out') ||
          wire.toTerminal.includes('-V') ||
          wire.toTerminal.includes('M') ||
          wire.toTerminal.includes('DQ') ||
          wire.toTerminal.includes('14')
        );

    const x1 = fromAnchor ? fromAnchor.x : fromComp ? fromComp.centerX : 30 + (wIdx * 15) % 80;
    const y1 = fromAnchor ? fromAnchor.y : fromComp ? (fromIsTop ? fromComp.topY : fromComp.bottomY) : 24;

    const x2 = toAnchor ? toAnchor.x : toComp ? toComp.centerX : cabWidth - 50;
    const y2 = toAnchor ? toAnchor.y : toComp ? (toIsTop ? toComp.topY : toComp.bottomY) : cabHeight - 24;

    const fromRailIdx = fromComp ? fromComp.railIdx : 0;
    const fromRailY = fromComp ? fromComp.railY : 80;
    const toRailIdx = toComp ? toComp.railIdx : 0;
    const toRailY = toComp ? toComp.railY : 80;

    // Run Manhattan routing to get true routed physical wire length in mm
    const route = routeManhattanWire({
      x1,
      y1,
      fromIsTop,
      fromRailIdx,
      fromRailY,
      x2,
      y2,
      toIsTop,
      toRailIdx,
      toRailY,
      cabWidth,
      cabHeight,
      sideDuctWidth: sideDuct,
      horizontalDuctHeight: horizDuct,
      wireIndex: wIdx,
      cornerRadius: 5,
      terminalSlackMm: 100, // 50mm ferrule/stripping slack at each end
    });

    // Deducing realistic current flow (A) and voltage:
    let currentNominalA = 1.0;
    let voltage = '24V DC';

    if (wire.netType === 'ac_phase' || wire.netType === 'ac_neutral') {
      voltage = project.config.supplyVoltage || '230V AC';
      // Find breaker nominal current rating if attached
      const breaker = [fromComp?.item, toComp?.item].find((it) => it && it.data.ratedCurrentA);
      currentNominalA = breaker?.data.ratedCurrentA || (wire.crossSectionMm2 >= 4 ? 20.0 : wire.crossSectionMm2 >= 2.5 ? 16.0 : 10.0);
    } else if (wire.netType === 'pe_ground') {
      voltage = '0V (PE)';
      currentNominalA = 0.0;
    } else if (wire.netType === 'dc_positive' || wire.netType === 'dc_negative') {
      voltage = '24V DC';
      const psu = [fromComp?.item, toComp?.item].find((it) => it && it.data.category === 'power_supply');
      currentNominalA = psu ? 5.0 : 2.5;
    } else {
      voltage = '24V DC (Sinal)';
      currentNominalA = 0.5; // Typical PLC digital input/output signal current
    }

    // Determine cable standard spec: H07V-K for >= 1.5mm², H05V-K for <= 1.0mm² (EN 50525-2-31)
    const cableSpec: 'H07V-K' | 'H05V-K' = wire.crossSectionMm2 >= 1.5 ? 'H07V-K' : 'H05V-K';

    const colorInfo = getStandardWireColorName(wire.netType);

    const fromLoc = fromComp ? `${fromComp.railName}` : 'Quadro / Entrada';
    const toLoc = toComp ? `${toComp.railName}` : 'Quadro / Saída';

    return {
      id: wire.id,
      wireTag: wire.wireTag,
      fromComponentTag: wire.fromComponentTag,
      fromComponentName: fromComp?.item.data.name || 'Alimentação de Entrada',
      fromTerminal: wire.fromTerminal,
      fromLocation: fromLoc,
      toComponentTag: wire.toComponentTag,
      toComponentName: toComp?.item.data.name || 'Terminal de Campo',
      toTerminal: wire.toTerminal,
      toLocation: toLoc,
      netType: wire.netType,
      netTypeLabel: getNetTypeDescription(wire.netType),
      voltage,
      currentNominalA,
      wireColorName: colorInfo.name,
      wireColorHex: wire.color || colorInfo.hex,
      crossSectionMm2: wire.crossSectionMm2,
      cableSpec,
      lengthMm: route.totalLengthMm,
      lengthM: Math.round((route.totalLengthMm / 1000) * 100) / 100,
      isEnergized: Boolean(wire.isEnergized),
      notes: wire.notes || `Ligação ${wire.fromComponentTag} ➔ ${wire.toComponentTag}`,
    };
  });
}

/**
 * Calculates stock meterage requirements grouped by Cable Spec + Cross-section + Color.
 */
export function calculateCableMeterageSummary(items: WiringListItem[]): CableStockMeterage[] {
  const map: Record<string, CableStockMeterage> = {};

  items.forEach((item) => {
    const key = `${item.cableSpec}_${item.crossSectionMm2}mm2_${item.wireColorName}`;
    if (!map[key]) {
      map[key] = {
        key,
        cableSpec: item.cableSpec,
        crossSectionMm2: item.crossSectionMm2,
        colorName: item.wireColorName,
        colorHex: item.wireColorHex,
        netTypeLabel: item.netTypeLabel,
        wireCount: 0,
        totalLengthM: 0,
        recommendedSpoolM: 0,
      };
    }

    map[key].wireCount += 1;
    map[key].totalLengthM += item.lengthM;
  });

  // Calculate recommended spool with 15% safety factor for cutting & routing waste
  return Object.values(map)
    .map((entry) => ({
      ...entry,
      totalLengthM: Math.round(entry.totalLengthM * 10) / 10,
      recommendedSpoolM: Math.max(5, Math.ceil(entry.totalLengthM * 1.15)),
    }))
    .sort((a, b) => b.totalLengthM - a.totalLengthM);
}

/**
 * Exports detailed wiring list to CSV format.
 * - Portuguese / European standard: Semicolon delimited (;) with comma decimals and UTF-8 BOM.
 * - Universal standard: Comma delimited (,) with dot decimals.
 */
export function exportWiringListToCsv(
  items: WiringListItem[],
  projectName: string = 'Quadro_Eletrico',
  options: {
    format: 'european_excel' | 'universal_csv';
  } = { format: 'european_excel' }
): void {
  const isEuro = options.format === 'european_excel';
  const sep = isEuro ? ';' : ',';

  const formatNumber = (num: number): string => {
    if (isEuro) {
      return num.toString().replace('.', ',');
    }
    return num.toString();
  };

  const escapeField = (val: string | number): string => {
    const s = String(val ?? '').replace(/"/g, '""');
    if (s.includes(sep) || s.includes('"') || s.includes('\n')) {
      return `"${s}"`;
    }
    return s;
  };

  const headers = [
    'Nº Fio (Tag)',
    'Origem Componente',
    'Origem Nome',
    'Origem Terminal',
    'Origem Local',
    'Destino Componente',
    'Destino Nome',
    'Destino Terminal',
    'Destino Local',
    'Tipo de Circuito',
    'Tensão Nominal',
    'Corrente Est. (A)',
    'Cor do Condutor (EN 60204-1)',
    'Secção (mm²)',
    'Norma do Cabo',
    'Comprimento (mm)',
    'Comprimento (m)',
    'Estado Simulação',
    'Notas Técnicas',
  ];

  const rows = items.map((w) => [
    escapeField(w.wireTag),
    escapeField(w.fromComponentTag),
    escapeField(w.fromComponentName),
    escapeField(w.fromTerminal),
    escapeField(w.fromLocation),
    escapeField(w.toComponentTag),
    escapeField(w.toComponentName),
    escapeField(w.toTerminal),
    escapeField(w.toLocation),
    escapeField(w.netTypeLabel),
    escapeField(w.voltage),
    escapeField(formatNumber(w.currentNominalA)),
    escapeField(w.wireColorName),
    escapeField(formatNumber(w.crossSectionMm2)),
    escapeField(w.cableSpec),
    escapeField(w.lengthMm),
    escapeField(formatNumber(w.lengthM)),
    escapeField(w.isEnergized ? 'Em Tensão' : 'Sem Tensão'),
    escapeField(w.notes),
  ]);

  // Compute summary rows for bottom of CSV
  const summary = calculateCableMeterageSummary(items);
  const totalLengthMeters = Math.round(items.reduce((acc, curr) => acc + curr.lengthM, 0) * 10) / 10;

  const emptyLine = new Array(headers.length).fill('').join(sep);

  const summaryHeader = [
    'RESUMO DE METRAGEM TOTAL DE CONDUTORES (STOCK & COMPRA)',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ].map(escapeField).join(sep);

  const summaryRows = summary.map((s) => [
    escapeField(s.key),
    escapeField(`${s.cableSpec} ${formatNumber(s.crossSectionMm2)} mm²`),
    escapeField(s.colorName),
    escapeField(`${s.wireCount} condutores`),
    escapeField(`Total: ${formatNumber(s.totalLengthM)} m`),
    escapeField(`Bobina Recom. (+15% corte): ${s.recommendedSpoolM} m`),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ].join(sep));

  const totalLine = [
    'TOTAL GERAL CABLAGEM',
    '',
    '',
    '',
    escapeField(`${formatNumber(totalLengthMeters)} metros`),
    escapeField(`${items.length} ligações`),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ].map(escapeField).join(sep);

  const csvContent = [
    headers.map(escapeField).join(sep),
    ...rows.map((r) => r.join(sep)),
    emptyLine,
    summaryHeader,
    ...summaryRows,
    totalLine,
  ].join('\r\n');

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 accents seamlessly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeName}_Lista_Cablagem_De_Para_${options.format === 'european_excel' ? 'PT' : 'CSV'}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies From-To wiring schedule directly to clipboard in Tab-Separated format (TSV).
 * Pastes cleanly into any spreadsheet (Microsoft Excel, Google Sheets, LibreOffice).
 */
export async function copyWiringListToClipboard(items: WiringListItem[]): Promise<boolean> {
  const headers = [
    'Nº Fio',
    'Origem Tag',
    'Origem Nome',
    'Origem Term',
    'Destino Tag',
    'Destino Nome',
    'Destino Term',
    'Tipo Circuito',
    'Tensão',
    'Corrente (A)',
    'Cor EN 60204',
    'Secção (mm²)',
    'Norma',
    'Comp. (mm)',
    'Comp. (m)',
    'Estado',
    'Notas',
  ];

  const rows = items.map((w) => [
    w.wireTag,
    w.fromComponentTag,
    w.fromComponentName,
    w.fromTerminal,
    w.toComponentTag,
    w.toComponentName,
    w.toTerminal,
    w.netTypeLabel,
    w.voltage,
    w.currentNominalA.toFixed(1),
    w.wireColorName,
    w.crossSectionMm2.toFixed(1),
    w.cableSpec,
    w.lengthMm,
    w.lengthM.toFixed(2),
    w.isEnergized ? 'Em Tensão' : 'Sem Tensão',
    w.notes,
  ]);

  const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');

  try {
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
