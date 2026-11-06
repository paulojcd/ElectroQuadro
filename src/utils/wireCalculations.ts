import { ProjectState, PlacedComponent, ElectricalComponent } from '../types/electrical';

export interface WireCalculationParams {
  ambientTemperatureC: number;      // e.g. 35, 40, 45, 50
  groupingFactor: number;           // e.g. 0.8 (4-6 circuits in slotted duct)
  insulationType: 'pvc_70' | 'halogen_free_90'; // H07V-K (70°C) vs H07Z1-K (90°C)
  averageWireLengthM: number;       // e.g. 1.2m average internal cabinet route
  maxVoltageDropPercent: number;    // e.g. 3.0%
}

export const DEFAULT_WIRE_PARAMS: WireCalculationParams = {
  ambientTemperatureC: 40,
  groupingFactor: 0.8,
  insulationType: 'pvc_70',
  averageWireLengthM: 1.2,
  maxVoltageDropPercent: 3.0,
};

export interface FerruleSpec {
  sizeMm2: number;
  colorDin: string;     // DIN 46228-4
  colorFrench: string;  // NFC 63-023
  label: string;
}

export const FERRULE_STANDARDS: Record<number, FerruleSpec> = {
  0.5: { sizeMm2: 0.5, colorDin: 'Branco (#FFFFFF)', colorFrench: 'Branco', label: '0.5 mm² - Branco' },
  0.75: { sizeMm2: 0.75, colorDin: 'Cinzento (#9CA3AF)', colorFrench: 'Azul Claro', label: '0.75 mm² - Cinzento' },
  1.0: { sizeMm2: 1.0, colorDin: 'Vermelho (#EF4444)', colorFrench: 'Vermelho', label: '1.0 mm² - Vermelho' },
  1.5: { sizeMm2: 1.5, colorDin: 'Preto (#1E293B)', colorFrench: 'Preto', label: '1.5 mm² - Preto' },
  2.5: { sizeMm2: 2.5, colorDin: 'Azul (#3B82F6)', colorFrench: 'Cinzento', label: '2.5 mm² - Azul' },
  4.0: { sizeMm2: 4.0, colorDin: 'Cinzento (#6B7280)', colorFrench: 'Laranja', label: '4.0 mm² - Cinzento' },
  6.0: { sizeMm2: 6.0, colorDin: 'Amarelo (#EAB308)', colorFrench: 'Verde', label: '6.0 mm² - Amarelo' },
  10.0: { sizeMm2: 10.0, colorDin: 'Vermelho (#DC2626)', colorFrench: 'Castanho', label: '10.0 mm² - Vermelho' },
  16.0: { sizeMm2: 16.0, colorDin: 'Azul (#2563EB)', colorFrench: 'Branco', label: '16.0 mm² - Azul' },
  25.0: { sizeMm2: 25.0, colorDin: 'Amarelo (#CA8A04)', colorFrench: 'Preto', label: '25.0 mm² - Amarelo' },
  35.0: { sizeMm2: 35.0, colorDin: 'Vermelho (#B91C1C)', colorFrench: 'Vermelho', label: '35.0 mm² - Vermelho' },
};

/**
 * Baseline current carrying capacities (A) in trunking/conduit at 40°C (EN 60204-1 Table 6 / IEC 60364-5-52 Method B2)
 */
const BASELINE_CAPACITY_PVC_40C: Record<number, number> = {
  0.5: 7.6,
  0.75: 9.6,
  1.0: 11.9,
  1.5: 15.2,
  2.5: 21.0,
  4.0: 28.0,
  6.0: 36.0,
  10.0: 50.0,
  16.0: 66.0,
  25.0: 84.0,
  35.0: 104.0,
};

const BASELINE_CAPACITY_HALOGEN_FREE_40C: Record<number, number> = {
  0.5: 9.5,
  0.75: 12.0,
  1.0: 15.0,
  1.5: 19.5,
  2.5: 27.0,
  4.0: 36.0,
  6.0: 47.0,
  10.0: 65.0,
  16.0: 86.0,
  25.0: 110.0,
  35.0: 137.0,
};

const AVAILABLE_GAUGES = [0.5, 0.75, 1.0, 1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0];

/**
 * Temperature correction factor k1 (EN 60204-1 Table D.1)
 */
export function getTemperatureCorrectionFactor(tempC: number, insulation: 'pvc_70' | 'halogen_free_90'): number {
  if (insulation === 'pvc_70') {
    if (tempC <= 30) return 1.15;
    if (tempC <= 35) return 1.08;
    if (tempC <= 40) return 1.00;
    if (tempC <= 45) return 0.91;
    if (tempC <= 50) return 0.82;
    return 0.71;
  } else {
    if (tempC <= 30) return 1.10;
    if (tempC <= 35) return 1.05;
    if (tempC <= 40) return 1.00;
    if (tempC <= 45) return 0.95;
    if (tempC <= 50) return 0.89;
    return 0.84;
  }
}

export type CircuitRole = 
  | 'ac_main'       // Alimentação Geral AC (L1, L2, L3, N)
  | 'ac_branch'     // Circuito Derivado AC (Disjuntores 6A, 10A, 16A, etc.)
  | 'dc_bus'        // Barramento Principal 24VDC (+24V, 0V)
  | 'dc_control'    // Linhas Auxiliares 24VDC e Bobinas de Relés
  | 'signal_io'     // Entradas e Saídas Digitais / Analógicas (PLC)
  | 'pe_ground';    // Barramento de Proteção Terra (PE)

export interface CircuitWireRecommendation {
  componentId: string;
  componentTag: string;
  componentName: string;
  category: string;
  circuitRole: CircuitRole;
  circuitDescription: string;
  nominalVoltage: string;
  ratedCurrentA: number;
  minRegulatoryGaugeMm2: number;
  recommendedGaugeMm2: number;
  wireType: string;
  currentCapacityIzA: number;
  safetyMarginPercent: number;
  estimatedLengthM: number;
  voltageDropV: number;
  voltageDropPercent: number;
  isVoltageDropCompliant: boolean;
  wireColorHex: string;
  wireColorLabel: string;
  ferrule: FerruleSpec;
  standardReference: string;
}

export interface ProjectWiringSummary {
  params: WireCalculationParams;
  totalLengthM: number;
  totalFerrules: number;
  breakdownByGauge: Array<{
    gaugeMm2: number;
    lengthM: number;
    circuitCount: number;
    colorHex: string;
    ferruleColor: string;
    wireType: string;
  }>;
  breakdownByColor: Array<{
    colorLabel: string;
    colorHex: string;
    lengthM: number;
  }>;
  trunkingOccupancy: {
    sideDuctOccupancyPercent: number;
    horizontalDuctOccupancyPercent: number;
    status: 'optimal' | 'acceptable' | 'warning';
    recommendation: string;
  };
  circuits: CircuitWireRecommendation[];
}

/**
 * Calculates recommended cross section for an individual component / circuit
 */
export function calculateComponentWireRecommendation(
  item: ElectricalComponent,
  params: WireCalculationParams = DEFAULT_WIRE_PARAMS,
  isThreePhase: boolean = false
): CircuitWireRecommendation {
  const k1 = getTemperatureCorrectionFactor(params.ambientTemperatureC, params.insulationType);
  const k2 = params.groupingFactor;
  const wireType = params.insulationType === 'pvc_70' ? 'H07V-K (PVC 70°C)' : 'H07Z1-K (Livre Halogéneos 90°C)';
  const baseTable = params.insulationType === 'pvc_70' ? BASELINE_CAPACITY_PVC_40C : BASELINE_CAPACITY_HALOGEN_FREE_40C;

  let role: CircuitRole = 'ac_branch';
  let circuitDesc = item.customNotes || item.description || item.name;
  let nominalVoltage = '230V AC';
  let ratedCurrent = item.ratedCurrentA || 10;
  let minRegGauge = 1.5;
  let preferredWireColor = '#92400e'; // Brown default
  let wireColorLabel = 'Castanho (Fase L)';

  // Determine circuit role, functional voltages, and standard rules
  const lowerName = item.name.toLowerCase();
  const lowerCat = item.category;

  if (lowerCat === 'protection_ac') {
    if (item.tag.startsWith('Q1') || item.tag.startsWith('Q0') || lowerName.includes('geral') || lowerName.includes('corte')) {
      role = 'ac_main';
      nominalVoltage = isThreePhase ? '400V AC (Trifásico)' : '230V AC (Monofásico)';
      minRegGauge = isThreePhase ? 6.0 : (item.ratedCurrentA && item.ratedCurrentA >= 40 ? 10.0 : 6.0);
      ratedCurrent = item.ratedCurrentA || (isThreePhase ? 32 : 40);
      circuitDesc = `Alimentação Geral / Corte Geral (${ratedCurrent}A)`;
      preferredWireColor = '#92400e';
      wireColorLabel = isThreePhase ? 'Castanho/Preto/Cinzento + Azul' : 'Castanho + Azul Claro';
    } else if (lowerName.includes('diferencial') || item.tag.startsWith('F')) {
      role = 'ac_main';
      nominalVoltage = isThreePhase ? '400V AC' : '230V AC';
      minRegGauge = 4.0;
      ratedCurrent = item.ratedCurrentA || 40;
      circuitDesc = `Interruptor Diferencial (${ratedCurrent}A / 30mA)`;
      preferredWireColor = '#92400e';
      wireColorLabel = 'Fase e Neutro';
    } else if (lowerName.includes('placa') || lowerName.includes('fogão') || lowerName.includes('indução') || item.tag.includes('PLACA')) {
      role = 'ac_branch';
      nominalVoltage = '230V AC';
      ratedCurrent = item.ratedCurrentA || 32;
      minRegGauge = 6.0; // RTIEBT mandatory 6mm² for cooktop
      circuitDesc = `Placa de Indução / Fogão (${item.tag} - 32A / RTIEBT)`;
      preferredWireColor = '#92400e';
      wireColorLabel = 'Castanho (Fase) + Azul (Neutro)';
    } else if (lowerName.includes('ilum') || item.tag.includes('ILUM')) {
      role = 'ac_branch';
      nominalVoltage = '230V AC';
      ratedCurrent = item.ratedCurrentA || 10;
      minRegGauge = 1.5; // RTIEBT 1.5mm² for lighting
      circuitDesc = `Circuito de Iluminação (${item.tag} - 10A / RTIEBT)`;
      preferredWireColor = '#92400e';
      wireColorLabel = 'Castanho (Fase L)';
    } else if (lowerName.includes('tom') || item.tag.includes('TOM')) {
      role = 'ac_branch';
      nominalVoltage = '230V AC';
      ratedCurrent = item.ratedCurrentA || 16;
      minRegGauge = 2.5; // RTIEBT 2.5mm² for sockets
      circuitDesc = `Circuito de Tomadas Gerais (${item.tag} - 16A / RTIEBT)`;
      preferredWireColor = '#92400e';
      wireColorLabel = 'Castanho (Fase L)';
    } else if (
      lowerName.includes('lavar') || 
      lowerName.includes('mlr') || 
      lowerName.includes('mll') || 
      lowerName.includes('secador') ||
      lowerName.includes('forno') ||
      lowerName.includes('termoacumulador') ||
      lowerName.includes('cilindro') ||
      lowerName.includes('avac') ||
      lowerName.includes('ar condicionado')
    ) {
      role = 'ac_branch';
      nominalVoltage = '230V AC';
      ratedCurrent = item.ratedCurrentA || 16;
      minRegGauge = 2.5;
      circuitDesc = `Eletrodoméstico Dedicado (${item.tag} - ${ratedCurrent}A / RTIEBT)`;
      preferredWireColor = '#92400e';
      wireColorLabel = 'Castanho (Fase L)';
    } else if (lowerName.includes('wallbox') || lowerName.includes('veículo') || lowerName.includes('carro') || item.tag.includes('EV')) {
      role = 'ac_branch';
      nominalVoltage = isThreePhase ? '400V AC' : '230V AC';
      ratedCurrent = item.ratedCurrentA || 32;
      minRegGauge = 6.0;
      circuitDesc = `Carregador Veículo Elétrico Wallbox (${ratedCurrent}A)`;
      preferredWireColor = '#059669';
      wireColorLabel = isThreePhase ? 'Trifásico (4x6mm²)' : 'Monofásico (3x6mm²)';
    } else {
      role = 'ac_branch';
      nominalVoltage = '230V AC';
      ratedCurrent = item.ratedCurrentA || 10;
      minRegGauge = ratedCurrent <= 10 ? 1.5 : (ratedCurrent <= 16 ? 2.5 : 4.0);
      circuitDesc = `Circuito Parcial de Proteção (${item.tag} - ${ratedCurrent}A)`;
      preferredWireColor = '#92400e';
      wireColorLabel = 'Castanho (Fase)';
    }
  } else if (lowerCat === 'residential_modular') {
    role = 'ac_branch';
    nominalVoltage = '230V AC';
    ratedCurrent = item.ratedCurrentA || 16;
    minRegGauge = 1.5;
    circuitDesc = `Aparelhagem Modular Residencial (${item.tag} - ${item.name})`;
    preferredWireColor = '#64748b';
    wireColorLabel = 'Cinza / Laranja / Azul';
  } else if (lowerCat === 'power_supply') {
    role = 'dc_bus';
    nominalVoltage = '24V DC';
    ratedCurrent = item.ratedCurrentA || 5.0; // DC current
    minRegGauge = ratedCurrent <= 5 ? 1.5 : 2.5;
    circuitDesc = `Barramento Primário e Saída 24VDC (${item.tag} - ${ratedCurrent}A)`;
    preferredWireColor = '#dc2626';
    wireColorLabel = 'Vermelho (+24V) & Azul Escuro (0V)';
  } else if (lowerCat === 'plc_cpu' || lowerCat === 'plc_expansion') {
    role = 'signal_io';
    nominalVoltage = '24V DC';
    ratedCurrent = item.dcConsumptionA || 1.5;
    minRegGauge = 0.75;
    circuitDesc = `Comando e I/O de Automação (${item.tag} - ${item.name})`;
    preferredWireColor = '#ea580c';
    wireColorLabel = 'Laranja (Comando / DI-DQ)';
  } else if (lowerCat === 'relays' || lowerCat === 'safety_relays' || lowerCat === 'motor_control') {
    role = 'dc_control';
    nominalVoltage = '24V DC / 230V AC';
    ratedCurrent = item.ratedCurrentA || 2.0;
    minRegGauge = 0.75;
    circuitDesc = `Comando de Bobina e Contactos (${item.tag})`;
    preferredWireColor = '#ea580c';
    wireColorLabel = 'Laranja (Comando) / Azul (0V)';
  } else if (lowerCat === 'terminals') {
    if (lowerName.includes('terra') || lowerName.includes('pe')) {
      role = 'pe_ground';
      nominalVoltage = 'PE (Terra)';
      ratedCurrent = 25;
      minRegGauge = 2.5;
      circuitDesc = `Borne de Terra de Proteção (${item.tag})`;
      preferredWireColor = '#16a34a';
      wireColorLabel = 'Verde / Amarelo (PE)';
    } else {
      role = 'signal_io';
      nominalVoltage = '230V / 24V';
      ratedCurrent = item.ratedCurrentA || 10;
      minRegGauge = 1.5;
      circuitDesc = `Régua de Bornes de Passagem (${item.tag})`;
      preferredWireColor = '#64748b';
      wireColorLabel = 'Cinzento / Azul / Laranja';
    }
  }

  // Cable Sizing Algorithm:
  // Find the smallest standard gauge S such that Iz = I_tab * k1 * k2 >= ratedCurrent
  // and S >= minRegGauge (EN 60204-1 mechanical minimum)
  let chosenGauge = minRegGauge;
  let finalIz = (baseTable[chosenGauge] || 15) * k1 * k2;

  for (const gauge of AVAILABLE_GAUGES) {
    if (gauge < minRegGauge) continue;
    const tabCap = baseTable[gauge] || 10;
    const iz = tabCap * k1 * k2;
    if (iz >= ratedCurrent) {
      chosenGauge = gauge;
      finalIz = Math.round(iz * 10) / 10;
      break;
    }
  }

  // Safety Margin calculation: ((Iz - In) / In) * 100
  const safetyMargin = ratedCurrent > 0 
    ? Math.round(((finalIz - ratedCurrent) / ratedCurrent) * 100) 
    : 100;

  // Voltage drop estimation:
  // dU = (2 * L * I) / (gamma * S) for DC or single-phase AC
  // gamma = 56 m / (ohm * mm2) for copper
  const gamma = 56;
  const lengthM = params.averageWireLengthM;
  const voltageDropV = Math.round(((2 * lengthM * ratedCurrent) / (gamma * chosenGauge)) * 1000) / 1000;
  
  const baseVoltageNum = nominalVoltage.includes('24V') ? 24 : (nominalVoltage.includes('400V') ? 400 : 230);
  const voltageDropPercent = Math.round((voltageDropV / baseVoltageNum) * 100 * 100) / 100;
  const isVoltageDropCompliant = voltageDropPercent <= params.maxVoltageDropPercent;

  // Standard reference string
  let standardRef = 'EN 60204-1 Tab. 5 & 6';
  if (role === 'pe_ground') standardRef = 'EN 60204-1 Cl. 5.2 (PE)';
  else if (role === 'signal_io') standardRef = 'EN 60204-1 Cl. 13.1.1 (Min 0.75 mm²)';
  else if (role === 'ac_main') standardRef = 'IEC 60364-5-52 / EN 61439-1';

  const ferrule = FERRULE_STANDARDS[chosenGauge] || FERRULE_STANDARDS[1.5];

  return {
    componentId: item.id,
    componentTag: item.tag,
    componentName: item.name,
    category: item.category,
    circuitRole: role,
    circuitDescription: circuitDesc,
    nominalVoltage,
    ratedCurrentA: ratedCurrent,
    minRegulatoryGaugeMm2: minRegGauge,
    recommendedGaugeMm2: chosenGauge,
    wireType,
    currentCapacityIzA: finalIz,
    safetyMarginPercent: safetyMargin,
    estimatedLengthM: lengthM,
    voltageDropV,
    voltageDropPercent,
    isVoltageDropCompliant,
    wireColorHex: preferredWireColor,
    wireColorLabel,
    ferrule,
    standardReference: standardRef,
  };
}

/**
 * Calculates complete project wiring metrics, trunking filling ratio, and BOM summary
 */
export function calculateProjectWiring(
  project: ProjectState,
  params: WireCalculationParams = DEFAULT_WIRE_PARAMS
): ProjectWiringSummary {
  const allPlaced: PlacedComponent[] = project.rails.flatMap((r) => r.items);
  const isThreePhase = project.config.supplyVoltage?.includes('400V') ?? false;

  const circuits: CircuitWireRecommendation[] = allPlaced.map((placed) =>
    calculateComponentWireRecommendation(placed.data, params, isThreePhase)
  );

  // Group metrics by gauge
  const gaugeMap = new Map<number, { lengthM: number; count: number; colorHex: string; wireType: string }>();
  AVAILABLE_GAUGES.forEach((g) => {
    gaugeMap.set(g, { lengthM: 0, count: 0, colorHex: '#92400e', wireType: params.insulationType === 'pvc_70' ? 'H07V-K' : 'H07Z1-K' });
  });

  // Calculate realistic wire lengths based on enclosure dimensions
  const encWidthM = (project.config.widthMm || 600) / 1000;
  const encHeightM = (project.config.heightMm || 800) / 1000;
  const baseCabinetWireM = (encWidthM * 0.7 + encHeightM * 0.5);

  let totalLength = 0;
  let totalFerrules = 0;

  circuits.forEach((c) => {
    // Each component typically requires 2 to 4 wire runs (in + out / phase + neutral / +24V + 0V)
    let wireRunsPerDevice = 2;
    if (c.circuitRole === 'ac_main') wireRunsPerDevice = isThreePhase ? 4 : 2;
    if (c.circuitRole === 'dc_bus') wireRunsPerDevice = 4;
    if (c.circuitRole === 'signal_io') wireRunsPerDevice = 4;

    const deviceWireLength = Math.round(wireRunsPerDevice * (baseCabinetWireM + params.averageWireLengthM * 0.5) * 10) / 10;
    
    totalLength += deviceWireLength;
    totalFerrules += wireRunsPerDevice * 2; // 2 ferrules per wire (one on each end)

    const ex = gaugeMap.get(c.recommendedGaugeMm2);
    if (ex) {
      ex.lengthM += deviceWireLength;
      ex.count += 1;
      ex.colorHex = c.wireColorHex;
    }
  });

  const breakdownByGauge = Array.from(gaugeMap.entries())
    .filter(([_, val]) => val.lengthM > 0)
    .map(([gauge, val]) => ({
      gaugeMm2: gauge,
      lengthM: Math.round(val.lengthM * 10) / 10,
      circuitCount: val.count,
      colorHex: val.colorHex,
      ferruleColor: FERRULE_STANDARDS[gauge]?.colorDin || 'Cinza',
      wireType: val.wireType,
    }))
    .sort((a, b) => a.gaugeMm2 - b.gaugeMm2);

  // Group by color breakdown
  const colorMap = new Map<string, { label: string; hex: string; lengthM: number }>();
  circuits.forEach((c) => {
    const key = c.wireColorLabel;
    if (!colorMap.has(key)) {
      colorMap.set(key, { label: key, hex: c.wireColorHex, lengthM: c.estimatedLengthM * 2.5 });
    } else {
      colorMap.get(key)!.lengthM += c.estimatedLengthM * 2.5;
    }
  });

  const breakdownByColor = Array.from(colorMap.values()).map((v) => ({
    colorLabel: v.label,
    colorHex: v.hex,
    lengthM: Math.round(v.lengthM * 10) / 10,
  }));

  // Trunking occupancy calculation (Taxa de ocupação das canaletas ranhuradas)
  // Recommended standard: maximum 40% - 50% useful cross section according to EN 50085 / EN 60204-1
  const sideDuctWidthMm = project.config.sideDuctWidthMm || 40;
  const sideDuctDepthMm = 60; // standard 60mm deep duct
  const sideDuctAreaMm2 = sideDuctWidthMm * sideDuctDepthMm;

  // Approximate cable outer diameters for H07V-K:
  // 0.75mm²: ~2.4mm (area ~5.5mm² with packing)
  // 1.5mm²: ~3.0mm (area ~9mm²)
  // 2.5mm²: ~3.7mm (area ~13.5mm²)
  // 4.0mm²: ~4.4mm (area ~19mm²)
  // 6.0mm²: ~5.0mm (area ~25mm²)
  // 10.0mm²: ~6.8mm (area ~46mm²)
  let totalCablesAreaMm2 = 0;
  breakdownByGauge.forEach((b) => {
    const cableAreaApprox = b.gaugeMm2 <= 0.75 ? 6 : (b.gaugeMm2 <= 1.5 ? 9 : (b.gaugeMm2 <= 2.5 ? 14 : (b.gaugeMm2 <= 4.0 ? 19 : 28)));
    totalCablesAreaMm2 += b.circuitCount * 3 * cableAreaApprox;
  });

  const sideOccupancyPercent = Math.min(100, Math.round((totalCablesAreaMm2 / (sideDuctAreaMm2 * 2)) * 100));
  const horizOccupancyPercent = Math.min(100, Math.round((totalCablesAreaMm2 / (sideDuctAreaMm2 * (project.rails.length + 1))) * 100));

  let occupancyStatus: 'optimal' | 'acceptable' | 'warning' = 'optimal';
  let occupancyRecommendation = 'Taxa de ocupação ideal (<40%). Excelente ventilação e facilidade de manutenção futura.';

  if (sideOccupancyPercent > 50 || horizOccupancyPercent > 50) {
    occupancyStatus = 'warning';
    occupancyRecommendation = 'Atenção: A ocupação da calha excede 50%. Recomenda-se aumentar a largura das canaletas para 60mm ou 80mm para garantir arrefecimento adequado.';
  } else if (sideOccupancyPercent > 35 || horizOccupancyPercent > 35) {
    occupancyStatus = 'acceptable';
    occupancyRecommendation = 'Taxa de ocupação conforme (35-50%). Boa capacidade de dissipação térmica.';
  }

  return {
    params,
    totalLengthM: Math.round(totalLength * 10) / 10,
    totalFerrules,
    breakdownByGauge,
    breakdownByColor,
    trunkingOccupancy: {
      sideDuctOccupancyPercent: Math.max(12, sideOccupancyPercent),
      horizontalDuctOccupancyPercent: Math.max(10, horizOccupancyPercent),
      status: occupancyStatus,
      recommendation: occupancyRecommendation,
    },
    circuits,
  };
}
