import { CableGland, GlandMetric, GlandCircuitType } from '../types/electrical';

export interface GlandTechnicalSpec {
  size: GlandMetric;
  holeDiameterMm: number; // Diâmetro de furação da chapa
  outerDiameterMm: number; // Diâmetro exterior da flange/rosca
  hexAcrossFlatsMm: number; // Medida do sextavado (chave em mm)
  cableRange: string; // Faixa de aperto do cabo
  minCableMm: number;
  maxCableMm: number;
  recommendedTorqueNm: number; // Binário de aperto recomendado (Nm)
  estimatedPriceEur: number; // Preço indicativo com contra-porca
  standardApplication: string;
}

export const GLAND_SPECS: Record<GlandMetric, GlandTechnicalSpec> = {
  M12: {
    size: 'M12',
    holeDiameterMm: 12.5,
    outerDiameterMm: 19,
    hexAcrossFlatsMm: 15,
    cableRange: '3.0 - 6.5 mm',
    minCableMm: 3.0,
    maxCableMm: 6.5,
    recommendedTorqueNm: 2.5,
    estimatedPriceEur: 1.25,
    standardApplication: 'Sensores indutivos, termopares e sinais finos',
  },
  M16: {
    size: 'M16',
    holeDiameterMm: 16.5,
    outerDiameterMm: 24,
    hexAcrossFlatsMm: 20,
    cableRange: '4.5 - 10.0 mm',
    minCableMm: 4.5,
    maxCableMm: 10.0,
    recommendedTorqueNm: 3.5,
    estimatedPriceEur: 1.55,
    standardApplication: 'Botoneiras de comando, cabos 24VDC e paragem de emergência',
  },
  M20: {
    size: 'M20',
    holeDiameterMm: 20.5,
    outerDiameterMm: 29,
    hexAcrossFlatsMm: 24,
    cableRange: '6.0 - 12.0 mm',
    minCableMm: 6.0,
    maxCableMm: 12.0,
    recommendedTorqueNm: 5.0,
    estimatedPriceEur: 1.85,
    standardApplication: 'Alimentação monofásica 230V, tomadas e réguas de bornes',
  },
  M25: {
    size: 'M25',
    holeDiameterMm: 25.5,
    outerDiameterMm: 36,
    hexAcrossFlatsMm: 29,
    cableRange: '9.0 - 17.0 mm',
    minCableMm: 9.0,
    maxCableMm: 17.0,
    recommendedTorqueNm: 7.5,
    estimatedPriceEur: 2.65,
    standardApplication: 'Motores trifásicos e alimentação geral de potência média',
  },
  M32: {
    size: 'M32',
    holeDiameterMm: 32.5,
    outerDiameterMm: 44,
    hexAcrossFlatsMm: 36,
    cableRange: '15.0 - 21.0 mm',
    minCableMm: 15.0,
    maxCableMm: 21.0,
    recommendedTorqueNm: 10.0,
    estimatedPriceEur: 4.40,
    standardApplication: 'Entrada de rede trifásica geral até 40A',
  },
  M40: {
    size: 'M40',
    holeDiameterMm: 40.5,
    outerDiameterMm: 53,
    hexAcrossFlatsMm: 46,
    cableRange: '19.0 - 28.0 mm',
    minCableMm: 19.0,
    maxCableMm: 28.0,
    recommendedTorqueNm: 15.0,
    estimatedPriceEur: 7.20,
    standardApplication: 'Alimentação pesada industrial até 100A',
  },
  M50: {
    size: 'M50',
    holeDiameterMm: 50.5,
    outerDiameterMm: 65,
    hexAcrossFlatsMm: 55,
    cableRange: '27.0 - 35.0 mm',
    minCableMm: 27.0,
    maxCableMm: 35.0,
    recommendedTorqueNm: 20.0,
    estimatedPriceEur: 11.90,
    standardApplication: 'Cabos mestres de grande secção e distribuição',
  },
};

export const CIRCUIT_TYPE_INFO: Record<GlandCircuitType, { label: string; color: string; bg: string; border: string }> = {
  power_in: { label: 'Entrada Geral (Alimentação)', color: '#f59e0b', bg: '#451a03', border: '#b45309' },
  power_out: { label: 'Saída de Força / Cargas', color: '#38bdf8', bg: '#082f49', border: '#0284c7' },
  motor: { label: 'Motor Trifásico (U-V-W-PE)', color: '#ec4899', bg: '#500724', border: '#be185d' },
  control: { label: 'Comando & Automação', color: '#a855f7', bg: '#3b0764', border: '#7e22ce' },
  sensors: { label: 'Sensores de Campo (DI)', color: '#10b981', bg: '#022c22', border: '#047857' },
  network: { label: 'Rede PROFINET / Ethernet', color: '#06b6d4', bg: '#083344', border: '#0e7490' },
  ground: { label: 'Terra Exterior (PE)', color: '#84cc16', bg: '#1a2e05', border: '#4d7c0f' },
  reserve: { label: 'Reserva com Tampão Cego', color: '#94a3b8', bg: '#0f172a', border: '#334155' },
};

/**
 * Generates sensible default cable glands (Bucins) tailored to the enclosure width and power supply.
 */
export function getDefaultGlands(cabWidth: number, isThreePhase: boolean = false): CableGland[] {
  const margin = 70;
  const usableSpan = Math.max(160, cabWidth - margin * 2);

  // Top glands (Entrada no Topo do Armário)
  const topGlands: CableGland[] = [
    {
      id: 'gland-in-main',
      tag: 'BG-IN-01',
      location: 'top',
      size: isThreePhase ? 'M32' : 'M25',
      xOffsetMm: Math.round(margin + usableSpan * 0.2),
      label: isThreePhase ? 'Entrada Geral 400V 3F+N+PE' : 'Entrada Geral 230V 1F+N+PE',
      cableDiameterRangeMm: isThreePhase ? '15.0 - 21.0 mm' : '9.0 - 17.0 mm',
      holeDiameterMm: isThreePhase ? 32.5 : 25.5,
      circuitType: 'power_in',
      material: 'polyamide',
      estimatedPriceEur: isThreePhase ? 4.40 : 2.65,
    },
    {
      id: 'gland-in-net',
      tag: 'BG-IN-02',
      location: 'top',
      size: 'M16',
      xOffsetMm: Math.round(margin + usableSpan * 0.5),
      label: 'Cabo PROFINET / Ethernet Industrial',
      cableDiameterRangeMm: '4.5 - 10.0 mm',
      holeDiameterMm: 16.5,
      circuitType: 'network',
      material: 'polyamide',
      estimatedPriceEur: 1.55,
    },
    {
      id: 'gland-in-emerg',
      tag: 'BG-IN-03',
      location: 'top',
      size: 'M16',
      xOffsetMm: Math.round(margin + usableSpan * 0.8),
      label: 'Circuito Paragem de Emergência Externa',
      cableDiameterRangeMm: '4.5 - 10.0 mm',
      holeDiameterMm: 16.5,
      circuitType: 'control',
      material: 'polyamide',
      estimatedPriceEur: 1.55,
    },
  ];

  // Bottom glands (Saídas na Base do Armário)
  const bottomGlands: CableGland[] = [
    {
      id: 'gland-out-motor',
      tag: 'BG-OUT-01',
      location: 'bottom',
      size: 'M25',
      xOffsetMm: Math.round(margin + usableSpan * 0.12),
      label: 'Saída de Potência Motor M1 (U, V, W, PE)',
      cableDiameterRangeMm: '9.0 - 17.0 mm',
      holeDiameterMm: 25.5,
      circuitType: 'motor',
      material: 'polyamide',
      estimatedPriceEur: 2.65,
    },
    {
      id: 'gland-out-aux',
      tag: 'BG-OUT-02',
      location: 'bottom',
      size: 'M20',
      xOffsetMm: Math.round(margin + usableSpan * 0.32),
      label: 'Alimentação Auxiliar Cargas Externas 230VAC',
      cableDiameterRangeMm: '6.0 - 12.0 mm',
      holeDiameterMm: 20.5,
      circuitType: 'power_out',
      material: 'polyamide',
      estimatedPriceEur: 1.85,
    },
    {
      id: 'gland-out-di',
      tag: 'BG-OUT-03',
      location: 'bottom',
      size: 'M16',
      xOffsetMm: Math.round(margin + usableSpan * 0.52),
      label: 'Cabo de Sensores Digitais (DI 0.0 - DI 0.7)',
      cableDiameterRangeMm: '4.5 - 10.0 mm',
      holeDiameterMm: 16.5,
      circuitType: 'sensors',
      material: 'polyamide',
      estimatedPriceEur: 1.55,
    },
    {
      id: 'gland-out-dq',
      tag: 'BG-OUT-04',
      location: 'bottom',
      size: 'M16',
      xOffsetMm: Math.round(margin + usableSpan * 0.72),
      label: 'Comando Válvulas / Atuadores (DQ 0.0 - DQ 0.7)',
      cableDiameterRangeMm: '4.5 - 10.0 mm',
      holeDiameterMm: 16.5,
      circuitType: 'control',
      material: 'polyamide',
      estimatedPriceEur: 1.55,
    },
    {
      id: 'gland-out-reserve',
      tag: 'BG-OUT-05',
      location: 'bottom',
      size: 'M20',
      xOffsetMm: Math.round(margin + usableSpan * 0.9),
      label: 'Reserva com Bujão Cego IP66',
      cableDiameterRangeMm: '6.0 - 12.0 mm',
      holeDiameterMm: 20.5,
      circuitType: 'reserve',
      material: 'polyamide',
      estimatedPriceEur: 1.85,
    },
  ];

  return [...topGlands, ...bottomGlands];
}

/**
 * Distributes glands equidistant across the usable plate width
 */
export function autoDistributeGlands(
  glands: CableGland[],
  location: 'top' | 'bottom',
  cabWidth: number,
  sideMargin: number = 70
): CableGland[] {
  const matching = glands.filter((g) => g.location === location);
  if (matching.length === 0) return glands;

  const count = matching.length;
  const usable = cabWidth - 2 * sideMargin;
  const step = count > 1 ? usable / (count - 1) : 0;

  const updatedMatching = matching.map((g, idx) => ({
    ...g,
    xOffsetMm: count === 1 ? Math.round(cabWidth / 2) : Math.round(sideMargin + idx * step),
  }));

  const others = glands.filter((g) => g.location !== location);
  return [...others, ...updatedMatching];
}
