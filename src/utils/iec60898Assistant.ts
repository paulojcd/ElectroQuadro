import { ProjectState, PlacedComponent, ElectricalComponent } from '../types/electrical';

export type IecCurveType = 'B' | 'C' | 'D';

export type LoadNatureType =
  | 'smps_power_supply'      // Fontes de alimentação comutadas (Mean Well, etc.) - inrush capacitivo
  | 'plc_automation'         // Controladores lógicos (Siemens S7-1200, LOGO!)
  | 'resistive_heating'      // Aquecimento puramente resistivo, termoacumuladores, fornos
  | 'lighting_led_mixed'     // Iluminação geral / LED com drivers eletrónicos
  | 'general_sockets'        // Tomadas de uso geral (TUG)
  | 'inductive_motor_direct' // Motores com arranque direto (DOL)
  | 'transformer_isolation'  // Transformadores de comando / isolamento
  | 'hvac_heat_pump'         // Bombas de calor / AVAC inverter
  | 'ev_charger'             // Postos de carregamento de veículos elétricos (Wallbox)
  | 'dc_secondary';          // Barramento secundário 24V DC

export interface LoadAnalysisItem {
  id: string;
  sourceType: 'placed_component' | 'circuit_inferred' | 'custom_simulation';
  name: string;
  tag: string;
  brand?: string;
  partNumber?: string;
  loadNature: LoadNatureType;
  loadNatureLabel: string;
  nominalVoltage: string;
  voltageV: number;
  powerW: number;
  powerFactorCosPhi: number;
  calculatedIbA: number; // Corrente de projeto de regime permanente (A)
  estimatedInrushPeakA: number; // Corrente de crista transitória estimada (A)
  inrushRatio: number; // Inrush / Ib (ex: 8x, 15x, 1.2x)
  isThreePhase: boolean;

  // Disjuntor atual associado (se detetado no projeto)
  associatedBreaker?: {
    instanceId: string;
    tag: string;
    name: string;
    curve: string;
    ratedCurrentA: number;
    poles: string;
    breakingCapacityKa?: number;
  };

  // Recomendações IEC 60898-1
  recommendedCurve: IecCurveType;
  recommendedInA: number;
  recommendedPoles: string;
  recommendedBreakingCapacityKa: number;
  recommendedWireSectionMm2: number;
  recommendedCableSpec: string;

  // Estado de conformidade
  complianceStatus: 'compliant' | 'curve_mismatch' | 'overrated' | 'underrated' | 'missing_breaker';
  statusBadge: {
    label: string;
    color: string; // Tailwind color class
    severity: 'success' | 'warning' | 'error' | 'info';
  };

  // Fundamentação técnica e referências normativas
  technicalJustification: string;
  iecNormClause: string;
}

export interface Iec60898AuditReport {
  totalAnalyzedLoads: number;
  compliantCount: number;
  curveMismatchCount: number;
  overratedCount: number;
  underratedCount: number;
  missingBreakerCount: number;
  items: LoadAnalysisItem[];
  curveDistribution: {
    B: number;
    C: number;
    D: number;
  };
}

// Calibres nominais padronizados para disjuntores modulares IEC 60898-1
export const STANDARD_MCB_RATINGS = [1, 2, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63];

/**
 * Seleciona o calibre comercial padronizado imediatamente superior com margem de segurança.
 */
export function selectStandardMcbRating(targetIbA: number, safetyMultiplier: number = 1.25): number {
  const minRequiredA = targetIbA * safetyMultiplier;
  for (const rating of STANDARD_MCB_RATINGS) {
    if (rating >= minRequiredA) {
      return rating;
    }
  }
  return 63;
}

/**
 * Determina as características IEC 60898 para uma carga com base na sua natureza elétrica.
 */
export function analyzeLoadIec60898(
  loadNature: LoadNatureType,
  powerW: number,
  voltageV: number = 230,
  isThreePhase: boolean = false,
  cosPhi: number = 0.85
): {
  recommendedCurve: IecCurveType;
  recommendedInA: number;
  calculatedIbA: number;
  estimatedInrushPeakA: number;
  inrushRatio: number;
  technicalJustification: string;
  iecNormClause: string;
  recommendedWireSectionMm2: number;
} {
  // 1. Cálculo da corrente de serviço Ib
  let calculatedIbA = 0;
  if (voltageV === 24) {
    // 24V DC
    calculatedIbA = Math.max(0.1, powerW / 24);
  } else if (isThreePhase) {
    // Trifásico 400V
    calculatedIbA = Math.max(0.1, powerW / (Math.sqrt(3) * voltageV * cosPhi));
  } else {
    // Monofásico 230V
    calculatedIbA = Math.max(0.1, powerW / (voltageV * cosPhi));
  }
  calculatedIbA = Math.round(calculatedIbA * 100) / 100;

  let recommendedCurve: IecCurveType = 'C';
  let recommendedInA = 16;
  let inrushRatio = 5;
  let technicalJustification = '';
  let iecNormClause = 'IEC 60898-1 §9.10';

  switch (loadNature) {
    case 'smps_power_supply': {
      // Fontes comutadas (Mean Well, etc.) possuem forte inrush capacitivo
      // Cargas de condensadores primários: inrush 15x a 30x durante 1-2 ms
      recommendedCurve = 'C';
      inrushRatio = 18;
      
      // Sizing de disjuntor para fontes:
      // Pequenas (≤ 60W / NDR-75): 2A a 4A Curva C
      // Médias (75W - 120W / NDR-120): 6A Curva C
      // Grandes (240W / NDR-240): 10A Curva C
      // Extra grandes (480W): 16A Curva C
      if (powerW <= 65) {
        recommendedInA = 2;
      } else if (powerW <= 130) {
        recommendedInA = 6;
      } else if (powerW <= 260) {
        recommendedInA = 10;
      } else {
        recommendedInA = 16;
      }

      technicalJustification =
        'As fontes de alimentação industriais comutadas (SMPS) apresentam uma corrente de pico de magnetização/capacitiva transitória (Inrush Current) na energização de 20A a 45A durante ~2ms. A norma IEC 60898-1 estipula a Curva C (disparo magnético entre 5x e 10x In) para evitar disparos intempestivos na ligação ("nuisance tripping"), impossíveis de evitar com a Curva B.';
      iecNormClause = 'IEC 60898-1 Cl. 5.3.5 & Notas de Aplicação Mean Well / EN 60204-1 §7.2';
      break;
    }

    case 'plc_automation': {
      // Autómatos industriais (Siemens S7-1200 / LOGO! / módulos)
      recommendedCurve = 'C';
      inrushRatio = 4;
      recommendedInA = selectStandardMcbRating(calculatedIbA, 1.4);
      if (recommendedInA < 2) recommendedInA = 2;
      if (recommendedInA > 10 && calculatedIbA <= 4) recommendedInA = 6;

      technicalJustification =
        'Controladores lógicos programáveis (PLCs) e módulos de I/O requerem Curva C para acomodar pequenos transitórios de comutação das fontes internas e transientes nos canais de entrada e saída, sem desarmes acidentais.';
      iecNormClause = 'IEC 60898-1 §5.3.5 / IEC 61131-2';
      break;
    }

    case 'resistive_heating': {
      // Aquecimento puro, radiadores, termoacumuladores, fornos
      // Sem inrush indutivo: inrushRatio ~ 1.0 a 1.2
      recommendedCurve = 'B';
      inrushRatio = 1.1;
      recommendedInA = selectStandardMcbRating(calculatedIbA, 1.15);

      technicalJustification =
        'Cargas puramente resistivas (aquecimento, termoacumulador estático) não geram sobreintensidades transitórias de arranque. A Curva B (disparo magnético a 3x-5x In) garante proteção instantânea mais rápida contra defeitos fase-massa e choques indiretos, sobretudo em condutores de maior comprimento com baixa Icc.';
      iecNormClause = 'IEC 60898-1 §5.3.5 (Curva B: 3 a 5 In) / RTIEBT Seção 434';
      break;
    }

    case 'lighting_led_mixed': {
      // Iluminação LED / mista com balastros
      recommendedCurve = 'C';
      inrushRatio = 6;
      recommendedInA = selectStandardMcbRating(calculatedIbA, 1.3);
      if (recommendedInA < 10) recommendedInA = 10; // Prática comum RTIEBT

      technicalJustification =
        'Drivers LED e balastros eletrónicos possuem circuitos de comutação com condensadores de entrada, originando um pico de arranque (inrush) de até 20x a corrente nominal durante microsegundos. A Curva C evita o desarme simultâneo ao acender múltiplos circuitos de iluminação.';
      iecNormClause = 'IEC 60898-1 Cl. 5.3.5 / RTIEBT 533.2 (Iluminação 10A ou 16A)';
      break;
    }

    case 'general_sockets': {
      // Tomadas de Uso Geral (TUG)
      recommendedCurve = 'C';
      inrushRatio = 5;
      recommendedInA = 16;

      technicalJustification =
        'Circuitos de tomadas alimentam cargas diversas e imprevisíveis (aspiradores, ferramentas portáteis, aparelhos eletrónicos). A Curva C com calibre de 16A é a referência regulamentar para distribuição terminal de uso geral.';
      iecNormClause = 'RTIEBT 533.2 & IEC 60898-1 (16A Curva C)';
      break;
    }

    case 'inductive_motor_direct': {
      // Motores de indução com arranque direto (DOL)
      // Corrente de arranque de 6x a 8x durante vários segundos
      recommendedCurve = 'D';
      inrushRatio = 7.5;
      recommendedInA = selectStandardMcbRating(calculatedIbA, 1.3);

      technicalJustification =
        'Motores elétricos com arranque direto produzem correntes de arranque de 6 a 8 vezes a corrente nominal durante períodos de 0.5s a 2s. A Curva D (disparo magnético entre 10x e 20x In) permite o arranque sem disparo térmico-magnético indesejado. Para quadros industriais, recomenda-se combinar com disjuntor-motor regulável (IEC 60947-4-1).';
      iecNormClause = 'IEC 60898-1 §5.3.5 (Curva D: 10 a 20 In) / EN 60204-1 §7.2.8';
      break;
    }

    case 'transformer_isolation': {
      // Transformadores de comando
      recommendedCurve = 'D';
      inrushRatio = 15;
      recommendedInA = selectStandardMcbRating(calculatedIbA, 1.5);

      technicalJustification =
        'Transformadores de comando monofásicos e trifásicos exibem uma corrente de magnetização inicial extraordinariamente elevada (até 15x a 25x In durante a primeira semi-onda). A Curva D é a única que tolera essa corrente sem disparo.';
      iecNormClause = 'IEC 60898-1 §5.3.5 / IEC 61558-1';
      break;
    }

    case 'hvac_heat_pump': {
      // AVAC / Bombas de calor
      recommendedCurve = 'C';
      inrushRatio = 5;
      recommendedInA = selectStandardMcbRating(calculatedIbA, 1.25);
      if (recommendedInA < 16) recommendedInA = 16;

      technicalJustification =
        'Compressores modernos com tecnologia Inverter limitam o inrush, permitindo o uso seguro da Curva C de 16A, 20A ou 25A com proteção diferencial dedicada Tipo A ou F.';
      iecNormClause = 'IEC 60898-1 / RTIEBT 533.2';
      break;
    }

    case 'ev_charger': {
      // Postos de carregamento de veículos elétricos (Wallbox)
      recommendedCurve = 'C';
      inrushRatio = 3;
      recommendedInA = isThreePhase ? 16 : 32;

      technicalJustification =
        'A infraestrutura de carregamento de VE opera em regime de carga contínua (100% duty cycle) durante várias horas. Requer Curva C e disjuntor dimensionado com fator térmico 1.25x, acompanhado de proteção diferencial dedicada Tipo A-EV ou B (IEC 62955).';
      iecNormClause = 'IEC 60364-7-722 / IEC 60898-1 / RTIEBT Guia Técnico VE';
      break;
    }

    case 'dc_secondary': {
      // Circuitos 24V DC
      recommendedCurve = 'C';
      inrushRatio = 2;
      recommendedInA = selectStandardMcbRating(calculatedIbA, 1.2);

      technicalJustification =
        'Para circuitos secundários em 24VDC, utilizam-se disjuntores DC unipolares ou bipolares (ex: Siemens 5SY4 DC) com Curva C, garantindo proteção contra curto-circuito antes que a fonte entre em modo hiccup.';
      iecNormClause = 'EN 60204-1 §7.2 / IEC 60947-2 Anexo L';
      break;
    }
  }

  // Estimar pico de inrush em Amperes
  const estimatedInrushPeakA = Math.round(calculatedIbA * inrushRatio * 10) / 10;

  // Secção recomendada do condutor (EN 60204-1 / RTIEBT)
  let recommendedWireSectionMm2 = 1.5;
  if (recommendedInA <= 10) recommendedWireSectionMm2 = 1.5;
  else if (recommendedInA <= 16) recommendedWireSectionMm2 = 2.5;
  else if (recommendedInA <= 20) recommendedWireSectionMm2 = 2.5;
  else if (recommendedInA <= 25) recommendedWireSectionMm2 = 4.0;
  else if (recommendedInA <= 32) recommendedWireSectionMm2 = 6.0;
  else if (recommendedInA <= 40) recommendedWireSectionMm2 = 10.0;
  else recommendedWireSectionMm2 = 16.0;

  return {
    recommendedCurve,
    recommendedInA,
    calculatedIbA,
    estimatedInrushPeakA,
    inrushRatio,
    technicalJustification,
    iecNormClause,
    recommendedWireSectionMm2,
  };
}

/**
 * Identifica e analisa todas as cargas no projeto de acordo com a norma IEC 60898-1.
 */
export function runIec60898ProjectAudit(project: ProjectState): Iec60898AuditReport {
  const allItems: PlacedComponent[] = project.rails.flatMap((r) => r.items);
  const isThreePhase = project.config.supplyVoltage.includes('400V');

  // Separar disjuntores e componentes de consumo
  const allBreakers = allItems.filter(
    (it) =>
      it.data.category === 'protection_ac' ||
      it.data.category === 'protection_dc' ||
      it.data.category === 'motor_control'
  );

  const loads: LoadAnalysisItem[] = [];

  // 1. Procurar Fontes de Alimentação (Mean Well, etc.)
  const psus = allItems.filter((it) => it.data.category === 'power_supply');
  psus.forEach((psu) => {
    const powerW = psu.data.ratedPowerW || 120;
    const analysis = analyzeLoadIec60898('smps_power_supply', powerW, 230, false, 0.85);

    // Procurar disjuntor associado (ex: Q1, Q_PSU ou disjuntor na mesma calha ou com nome 'Fonte')
    const associated = allBreakers.find(
      (b) =>
        b.tag === 'Q1' ||
        b.tag === `Q_${psu.tag}` ||
        b.data.name.toLowerCase().includes('fonte') ||
        b.data.name.toLowerCase().includes('psu')
    );

    const item = createLoadItem(
      `load-${psu.instanceId}`,
      'placed_component',
      psu.data.name,
      psu.tag,
      psu.data.brand,
      psu.data.partNumber,
      'smps_power_supply',
      'Fonte de Alimentação Chaveada (SMPS)',
      '230V AC',
      230,
      powerW,
      0.85,
      analysis,
      false,
      associated,
      '1P+N'
    );
    loads.push(item);
  });

  // 2. Procurar Autómatos / PLCs (Siemens S7-1200 / LOGO!)
  const plcs = allItems.filter((it) => it.data.category === 'plc_cpu');
  plcs.forEach((plc) => {
    const powerW = plc.data.dcConsumptionW || 24;
    const isAcSupply = plc.data.inputVoltage?.includes('230V');
    const voltageV = isAcSupply ? 230 : 24;
    const analysis = analyzeLoadIec60898(
      isAcSupply ? 'plc_automation' : 'dc_secondary',
      powerW,
      voltageV,
      false,
      0.9
    );

    const associated = allBreakers.find(
      (b) =>
        b.tag === `Q_${plc.tag}` ||
        b.tag === 'F1' ||
        b.data.name.toLowerCase().includes('plc') ||
        b.data.name.toLowerCase().includes('automação') ||
        (b.data.category === 'protection_dc' && !isAcSupply)
    );

    const item = createLoadItem(
      `load-${plc.instanceId}`,
      'placed_component',
      plc.data.name,
      plc.tag,
      plc.data.brand,
      plc.data.partNumber,
      isAcSupply ? 'plc_automation' : 'dc_secondary',
      isAcSupply ? 'Controlador Lógico / PLC (230VAC)' : 'Controlador Lógico / PLC (24VDC)',
      isAcSupply ? '230V AC' : '24V DC',
      voltageV,
      powerW,
      0.9,
      analysis,
      false,
      associated,
      isAcSupply ? '1P+N' : '1P DC'
    );
    loads.push(item);
  });

  // 3. Procurar Motores / Contactores (motor_control)
  const motors = allItems.filter(
    (it) => it.data.category === 'motor_control' && !it.data.name.toLowerCase().includes('disjuntor-motor')
  );
  motors.forEach((mot) => {
    const powerW = mot.data.ratedPowerW || 4000;
    const is3P = mot.data.inputVoltage?.includes('400V') || mot.data.poles?.includes('3P') || isThreePhase;
    const analysis = analyzeLoadIec60898(
      'inductive_motor_direct',
      powerW,
      is3P ? 400 : 230,
      is3P,
      0.82
    );

    // Procurar disjuntor protetor ou disjuntor-motor associado
    const associated = allBreakers.find(
      (b) =>
        b.tag === `QM_${mot.tag}` ||
        b.tag.startsWith('QM') ||
        b.data.name.toLowerCase().includes('motor')
    );

    const item = createLoadItem(
      `load-${mot.instanceId}`,
      'placed_component',
      mot.data.name,
      mot.tag,
      mot.data.brand,
      mot.data.partNumber,
      'inductive_motor_direct',
      'Motor Elétrico Indutivo (Arranque Direto)',
      is3P ? '400V AC (3F)' : '230V AC (1F)',
      is3P ? 400 : 230,
      powerW,
      0.82,
      analysis,
      is3P,
      associated,
      is3P ? '3P' : '1P+N'
    );
    loads.push(item);
  });

  // 4. Analisar Disjuntores Residencial / Terminais Existentes Sem Carga Explícita (inferência inteligente)
  const outgoingBreakers = allBreakers.filter(
    (b) =>
      !b.data.name.toLowerCase().includes('diferencial') &&
      !b.tag.includes('DIFF') &&
      b.tag !== 'Q0' &&
      b.tag !== 'QM0' &&
      !loads.some((l) => l.associatedBreaker?.instanceId === b.instanceId)
  );

  outgoingBreakers.forEach((brk) => {
    const text = `${brk.data.name} ${brk.data.description} ${brk.tag}`.toLowerCase();
    let nature: LoadNatureType = 'general_sockets';
    let label = 'Circuito Terminal de Tomadas Gerais';
    let powerW = 3680;
    let cosPhi = 0.85;
    let is3P = brk.data.poles?.includes('3P') || false;

    if (text.includes('ilum') || text.includes('luz')) {
      nature = 'lighting_led_mixed';
      label = 'Circuito de Iluminação LED / Misto';
      powerW = 1500;
    } else if (text.includes('placa') || text.includes('induc') || text.includes('fog')) {
      nature = 'resistive_heating';
      label = 'Placa de Indução / Vitrocerâmica';
      powerW = 7200;
    } else if (text.includes('forno')) {
      nature = 'resistive_heating';
      label = 'Forno Elétrico de Encastre';
      powerW = 3000;
    } else if (text.includes('termo') || text.includes('cilindro') || text.includes('aqs') || text.includes('aq')) {
      nature = 'resistive_heating';
      label = 'Termoacumulador / Aquecimento Elétrico';
      powerW = 2000;
      cosPhi = 1.0;
    } else if (text.includes('ev') || text.includes('ve') || text.includes('wallbox') || text.includes('carregador')) {
      nature = 'ev_charger';
      label = 'Posto de Carregamento de Veículo Elétrico (Wallbox)';
      powerW = is3P ? 11000 : 7400;
    } else if (text.includes('avac') || text.includes('clima') || text.includes('bomba calor') || text.includes('ar cond')) {
      nature = 'hvac_heat_pump';
      label = 'Unidade de Climatização / AVAC Inverter';
      powerW = 3500;
    } else if (text.includes('motor') || text.includes('bomba') || text.includes('ventilador')) {
      nature = 'inductive_motor_direct';
      label = 'Motor Elétrico / Eletrobomba';
      powerW = 2200;
      cosPhi = 0.8;
    } else if (brk.data.category === 'protection_dc') {
      nature = 'dc_secondary';
      label = 'Barramento de Comando 24VDC';
      powerW = (brk.data.ratedCurrentA || 6) * 24;
    }

    const voltageV = nature === 'dc_secondary' ? 24 : is3P ? 400 : 230;
    const analysis = analyzeLoadIec60898(nature, powerW, voltageV, is3P, cosPhi);

    const item = createLoadItem(
      `circuit-${brk.instanceId}`,
      'circuit_inferred',
      label,
      `Circuito ${brk.tag}`,
      brk.data.brand,
      brk.data.partNumber,
      nature,
      label,
      nature === 'dc_secondary' ? '24V DC' : is3P ? '400V AC' : '230V AC',
      voltageV,
      powerW,
      cosPhi,
      analysis,
      is3P,
      brk,
      brk.data.poles || (is3P ? '3P' : '1P+N')
    );
    loads.push(item);
  });

  // Estatísticas de auditoria
  let compliantCount = 0;
  let curveMismatchCount = 0;
  let overratedCount = 0;
  let underratedCount = 0;
  let missingBreakerCount = 0;

  const curveDistribution = { B: 0, C: 0, D: 0 };

  loads.forEach((l) => {
    curveDistribution[l.recommendedCurve]++;
    if (l.complianceStatus === 'compliant') compliantCount++;
    else if (l.complianceStatus === 'curve_mismatch') curveMismatchCount++;
    else if (l.complianceStatus === 'overrated') overratedCount++;
    else if (l.complianceStatus === 'underrated') underratedCount++;
    else if (l.complianceStatus === 'missing_breaker') missingBreakerCount++;
  });

  return {
    totalAnalyzedLoads: loads.length,
    compliantCount,
    curveMismatchCount,
    overratedCount,
    underratedCount,
    missingBreakerCount,
    items: loads,
    curveDistribution,
  };
}

/**
 * Cria e avalia o status de conformidade do item de carga contra o disjuntor atual.
 */
function createLoadItem(
  id: string,
  sourceType: 'placed_component' | 'circuit_inferred' | 'custom_simulation',
  name: string,
  tag: string,
  brand: string | undefined,
  partNumber: string | undefined,
  loadNature: LoadNatureType,
  loadNatureLabel: string,
  nominalVoltage: string,
  voltageV: number,
  powerW: number,
  powerFactorCosPhi: number,
  analysis: ReturnType<typeof analyzeLoadIec60898>,
  isThreePhase: boolean,
  associatedBreaker: PlacedComponent | undefined,
  defaultPoles: string
): LoadAnalysisItem {
  let complianceStatus: LoadAnalysisItem['complianceStatus'] = 'compliant';
  let statusBadge: LoadAnalysisItem['statusBadge'] = {
    label: 'Conforme IEC 60898',
    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    severity: 'success',
  };

  const breakerDetails = associatedBreaker
    ? {
        instanceId: associatedBreaker.instanceId,
        tag: associatedBreaker.tag,
        name: associatedBreaker.data.name,
        curve: extractCurveFromBreaker(associatedBreaker),
        ratedCurrentA: associatedBreaker.data.ratedCurrentA || 16,
        poles: associatedBreaker.data.poles || defaultPoles,
        breakingCapacityKa: associatedBreaker.data.breakingCapacityKa || 6,
      }
    : undefined;

  if (!breakerDetails) {
    complianceStatus = 'missing_breaker';
    statusBadge = {
      label: 'Proteção Dedicada Ausente',
      color: 'bg-red-500/15 text-red-300 border-red-500/30',
      severity: 'error',
    };
  } else {
    const currentCurve = breakerDetails.curve.toUpperCase();
    const currentRating = breakerDetails.ratedCurrentA;

    // Verificar curva
    if (currentCurve && currentCurve !== analysis.recommendedCurve) {
      // Exceção aceitável: Curva C em aquecimento onde B seria ótimo não é crítico, mas o inverso (Curva B em motor/fonte) é falha grave!
      if (
        (analysis.recommendedCurve === 'C' && currentCurve === 'B') ||
        (analysis.recommendedCurve === 'D' && (currentCurve === 'B' || currentCurve === 'C'))
      ) {
        complianceStatus = 'curve_mismatch';
        statusBadge = {
          label: `Curva Inadequada (Instalado: ${currentCurve} / Recomendado: ${analysis.recommendedCurve})`,
          color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          severity: 'warning',
        };
      }
    }

    // Verificar calibre
    if (currentRating < analysis.calculatedIbA) {
      complianceStatus = 'underrated';
      statusBadge = {
        label: `Subdimensionado (${currentRating}A < Ib ${analysis.calculatedIbA}A)`,
        color: 'bg-red-500/15 text-red-300 border-red-500/30',
        severity: 'error',
      };
    } else if (currentRating > analysis.recommendedInA * 2 && currentRating >= 25 && analysis.calculatedIbA <= 5) {
      complianceStatus = 'overrated';
      statusBadge = {
        label: `Sobredimensionado (${currentRating}A vs ${analysis.recommendedInA}A)`,
        color: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        severity: 'info',
      };
    }
  }

  const cableSpec = isThreePhase
    ? `H07RN-F 5G${analysis.recommendedWireSectionMm2} mm²`
    : `H07V-U 3G${analysis.recommendedWireSectionMm2} mm²`;

  return {
    id,
    sourceType,
    name,
    tag,
    brand,
    partNumber,
    loadNature,
    loadNatureLabel,
    nominalVoltage,
    voltageV,
    powerW,
    powerFactorCosPhi,
    calculatedIbA: analysis.calculatedIbA,
    estimatedInrushPeakA: analysis.estimatedInrushPeakA,
    inrushRatio: analysis.inrushRatio,
    isThreePhase,
    associatedBreaker: breakerDetails,
    recommendedCurve: analysis.recommendedCurve,
    recommendedInA: analysis.recommendedInA,
    recommendedPoles: defaultPoles,
    recommendedBreakingCapacityKa: isThreePhase ? 10 : 6,
    recommendedWireSectionMm2: analysis.recommendedWireSectionMm2,
    recommendedCableSpec: cableSpec,
    complianceStatus,
    statusBadge,
    technicalJustification: analysis.technicalJustification,
    iecNormClause: analysis.iecNormClause,
  };
}

/**
 * Extrai a curva (B, C, D) dos dados do disjuntor.
 */
function extractCurveFromBreaker(breaker: PlacedComponent): string {
  if (breaker.data.curve) return breaker.data.curve.toUpperCase();
  const text = `${breaker.data.name} ${breaker.data.description} ${breaker.data.partNumber}`.toUpperCase();
  if (text.includes('CURVA B') || text.includes('-B') || text.includes(' 16B') || text.includes(' 10B') || text.includes(' 6B')) {
    return 'B';
  }
  if (text.includes('CURVA D') || text.includes('-D') || text.includes(' 16D') || text.includes(' 10D')) {
    return 'D';
  }
  return 'C'; // Default habitual europeu
}

/**
 * Atualiza um disjuntor existente no projeto com as recomendações de curva e corrente.
 */
export function applyIecRecommendationToProject(
  project: ProjectState,
  instanceId: string,
  newCurve: IecCurveType,
  newRatingA: number
): ProjectState {
  const updatedRails = project.rails.map((rail) => ({
    ...rail,
    items: rail.items.map((item) => {
      if (item.instanceId !== instanceId) return item;

      // Atualizar o disjuntor
      const updatedComponent: ElectricalComponent = {
        ...item.data,
        curve: newCurve,
        ratedCurrentA: newRatingA,
        name: updateNameWithNewCurveAndRating(item.data.name, newCurve, newRatingA),
        description: updateDescriptionWithNewCurve(item.data.description, newCurve, newRatingA),
      };

      return {
        ...item,
        data: updatedComponent,
      };
    }),
  }));

  return {
    ...project,
    rails: updatedRails,
  };
}

/**
 * Aplica todas as recomendações de uma só vez (Auto-Fix IEC 60898).
 */
export function applyAllIecRecommendationsToProject(
  project: ProjectState,
  auditReport: Iec60898AuditReport
): ProjectState {
  let updatedProject = project;

  for (const item of auditReport.items) {
    if (
      item.associatedBreaker &&
      (item.complianceStatus === 'curve_mismatch' || item.complianceStatus === 'overrated' || item.complianceStatus === 'underrated')
    ) {
      updatedProject = applyIecRecommendationToProject(
        updatedProject,
        item.associatedBreaker.instanceId,
        item.recommendedCurve,
        item.recommendedInA
      );
    }
  }

  return updatedProject;
}

function updateNameWithNewCurveAndRating(originalName: string, curve: string, ratingA: number): string {
  let name = originalName;
  // Substituir por exemplo "16A Curva C" ou "10A"
  name = name.replace(/\b\d+A\s+Curva\s+[BCD]\b/i, `${ratingA}A Curva ${curve}`);
  name = name.replace(/\bCurva\s+[BCD]\b/i, `Curva ${curve}`);
  if (!name.includes(`Curva ${curve}`)) {
    name += ` (Curva ${curve})`;
  }
  return name;
}

function updateDescriptionWithNewCurve(originalDesc: string, curve: string, ratingA: number): string {
  let desc = originalDesc;
  desc = desc.replace(/\bCurva\s+[BCD]\b/i, `Curva ${curve}`);
  desc = desc.replace(/\b\d+A\b/, `${ratingA}A`);
  return `${desc} [Otimizado IEC 60898-1: Curva ${curve} / ${ratingA}A]`;
}
