import { DinRail, PlacedComponent, ProjectState, ComponentCategory } from '../types/electrical';

export interface ThermalClearanceSpec {
  category: ComponentCategory;
  name: string;
  recommendedLateralMm: number;
  minLateralMm: number;
  topBottomBufferMm: number;
  dissipationProfile: 'high' | 'medium' | 'low' | 'minimal';
  description: string;
}

export const THERMAL_SPECS: Record<ComponentCategory, ThermalClearanceSpec> = {
  power_supply: {
    category: 'power_supply',
    name: 'Fonte de Alimentação DIN (Mean Well)',
    recommendedLateralMm: 20,
    minLateralMm: 15,
    topBottomBufferMm: 40,
    dissipationProfile: 'high',
    description: 'Dissipação térmica elevada (10-35W). Exige fluxo convectivo livre para evitar derating e sobreaquecimento dos condensadores.',
  },
  plc_cpu: {
    category: 'plc_cpu',
    name: 'Controlador / CPU (Siemens S7-1200 / LOGO!)',
    recommendedLateralMm: 10,
    minLateralMm: 10,
    topBottomBufferMm: 25,
    dissipationProfile: 'medium',
    description: 'Módulo de processamento eletrónico sensível. Requer isolamento de fontes de calor intensas (fontes e contactores).',
  },
  plc_expansion: {
    category: 'plc_expansion',
    name: 'Módulo de Expansão PLC (SM / DM / AM)',
    recommendedLateralMm: 10,
    minLateralMm: 0, // 0mm when connected to adjacent PLC module via side bus
    topBottomBufferMm: 20,
    dissipationProfile: 'low',
    description: 'Acoplamento direto sem folga (0mm) no barramento interno do PLC; requer 10mm no término da régua antes de outros aparelhos.',
  },
  motor_control: {
    category: 'motor_control',
    name: 'Contactor / Disjuntor-Motor',
    recommendedLateralMm: 8,
    minLateralMm: 5,
    topBottomBufferMm: 20,
    dissipationProfile: 'medium',
    description: 'Bobinas de potência e corte de arco. Requer folga lateral para ventilação contínua em ciclos intensos.',
  },
  safety_relays: {
    category: 'safety_relays',
    name: 'Relé de Segurança (Paragem de Emergência)',
    recommendedLateralMm: 5,
    minLateralMm: 5,
    topBottomBufferMm: 15,
    dissipationProfile: 'low',
    description: 'Componente de segurança categoria SIL3/PLe. Manter livre de radiação térmica de contactores.',
  },
  relays: {
    category: 'relays',
    name: 'Relés de Interface & Industriais',
    recommendedLateralMm: 5,
    minLateralMm: 2,
    topBottomBufferMm: 10,
    dissipationProfile: 'low',
    description: 'Dissipação de bobinas reduzida. Espaçamento padrão de 5mm recomendado para acesso aos bornes A1/A2.',
  },
  protection_ac: {
    category: 'protection_ac',
    name: 'Proteção AC (Disjuntores / Diferenciais)',
    recommendedLateralMm: 5,
    minLateralMm: 0,
    topBottomBufferMm: 15,
    dissipationProfile: 'low',
    description: 'Permite acoplamento por pente de barramento de cobre (0mm) ou 5mm entre grupos funcionais distintos.',
  },
  protection_dc: {
    category: 'protection_dc',
    name: 'Proteção DC / Fusíveis 24V',
    recommendedLateralMm: 5,
    minLateralMm: 0,
    topBottomBufferMm: 15,
    dissipationProfile: 'minimal',
    description: 'Proteção secundária de circuitos 24V. Espaçamento de 5mm entre circuitos independentes.',
  },
  terminals: {
    category: 'terminals',
    name: 'Bornes de Ligação (Viking 3 / Weidmüller)',
    recommendedLateralMm: 0,
    minLateralMm: 0,
    topBottomBufferMm: 10,
    dissipationProfile: 'minimal',
    description: 'Projetados para montagem contígua encostada (0mm) com placa terminal e batente de fixação.',
  },
  accessories: {
    category: 'accessories',
    name: 'Acessórios DIN (Tomadas, Descarregadores SPD)',
    recommendedLateralMm: 5,
    minLateralMm: 5,
    topBottomBufferMm: 15,
    dissipationProfile: 'low',
    description: 'Espaçamento padrão para ventilação e facilidade de manutenção.',
  },
  residential_modular: {
    category: 'residential_modular',
    name: 'Aparelhagem Residencial Modular (Campainha, Telerruptor, Minuteria, Contador)',
    recommendedLateralMm: 3,
    minLateralMm: 0,
    topBottomBufferMm: 15,
    dissipationProfile: 'low',
    description: 'Compatível com pentes de barramento 1P+N de fase e neutro contíguo (0mm) ou 3mm entre circuitos com temporização.',
  },
};

export interface ThermalIssue {
  componentId: string;
  componentTag: string;
  componentName: string;
  category: ComponentCategory;
  railIndex: number;
  actualGapLeftMm: number;
  actualGapRightMm: number;
  requiredGapMm: number;
  severity: 'error' | 'warning';
  message: string;
  recommendation: string;
}

export interface ThermalComplianceSummary {
  complianceRate: number; // 0 - 100%
  totalEvaluated: number;
  compliantCount: number;
  criticalIssuesCount: number;
  warningIssuesCount: number;
  issues: ThermalIssue[];
}

/**
 * Evaluates whether components in all rails meet recommended thermal & ventilation clearances.
 */
export function checkThermalCompliance(
  rails: DinRail[],
  customRules?: Partial<Record<ComponentCategory, number>>
): ThermalComplianceSummary {
  const issues: ThermalIssue[] = [];
  let totalEvaluated = 0;
  let compliantCount = 0;

  rails.forEach((rail, rIdx) => {
    if (rail.items.length === 0) return;
    const sorted = [...rail.items].sort((a, b) => a.positionMm - b.positionMm);

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const category = item.data.category;
      totalEvaluated++;

      // We focus thermal strictness on heat-sensitive or high-heat items
      const isHighHeat = category === 'power_supply';
      const isSensitive = category === 'plc_cpu' || category === 'plc_expansion' || category === 'safety_relays';
      const isMotorOrRelay = category === 'motor_control' || category === 'relays';

      if (!isHighHeat && !isSensitive && !isMotorOrRelay) {
        compliantCount++;
        continue;
      }

      const spec = THERMAL_SPECS[category];
      const requiredGap = customRules?.[category] ?? spec.minLateralMm;

      // Distance to left neighbor
      let gapLeft = 999;
      if (i > 0) {
        const leftNeighbor = sorted[i - 1];
        gapLeft = Math.max(0, item.positionMm - (leftNeighbor.positionMm + leftNeighbor.data.widthMm));
      } else {
        // Distance from rail start (10mm)
        gapLeft = item.positionMm;
      }

      // Distance to right neighbor
      let gapRight = 999;
      if (i < sorted.length - 1) {
        const rightNeighbor = sorted[i + 1];
        gapRight = Math.max(0, rightNeighbor.positionMm - (item.positionMm + item.data.widthMm));
      } else {
        // Distance to rail end
        gapRight = Math.max(0, rail.usableWidthMm - (item.positionMm + item.data.widthMm));
      }

      // Special exception: PLC CPU next to PLC expansion module is designed to touch (0mm via backplane bus)
      const isPlcBusRight =
        category === 'plc_cpu' &&
        i < sorted.length - 1 &&
        sorted[i + 1].data.category === 'plc_expansion';

      const isPlcBusLeft =
        category === 'plc_expansion' &&
        i > 0 &&
        (sorted[i - 1].data.category === 'plc_cpu' || sorted[i - 1].data.category === 'plc_expansion');

      const effectiveGapLeft = isPlcBusLeft ? 999 : gapLeft;
      const effectiveGapRight = isPlcBusRight ? 999 : gapRight;

      const minActualGap = Math.min(effectiveGapLeft, effectiveGapRight);

      if (minActualGap < requiredGap) {
        const severity: 'error' | 'warning' = isHighHeat && minActualGap < 10 ? 'error' : 'warning';
        issues.push({
          componentId: item.instanceId,
          componentTag: item.tag,
          componentName: item.data.name,
          category,
          railIndex: rIdx,
          actualGapLeftMm: Math.round(gapLeft * 10) / 10,
          actualGapRightMm: Math.round(gapRight * 10) / 10,
          requiredGapMm: requiredGap,
          severity,
          message: `${item.tag} (${item.data.name}): folga lateral insuficiente (${Math.round(minActualGap)}mm vs ${requiredGap}mm recomendado).`,
          recommendation: `Aumentar o afastamento lateral para pelo menos ${requiredGap}mm para garantir convecção térmica natural.`,
        });
      } else {
        compliantCount++;
      }
    }
  });

  const complianceRate = totalEvaluated > 0 ? Math.round((compliantCount / totalEvaluated) * 100) : 100;
  const criticalIssuesCount = issues.filter((i) => i.severity === 'error').length;
  const warningIssuesCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    complianceRate,
    totalEvaluated,
    compliantCount,
    criticalIssuesCount,
    warningIssuesCount,
    issues,
  };
}

export type AutoLayoutMode = 'thermal_normative' | 'compact_safe' | 'balanced_distribution';

export interface AutoLayoutOptions {
  mode: AutoLayoutMode;
  scope: 'all' | 'selected_rail';
  targetRailIndex?: number;
  psuClearanceMm?: number; // default 20mm
  plcClearanceMm?: number; // default 10mm
  generalSpacingMm?: number; // default 5mm
  terminalsSpacingMm?: number; // default 0mm
  centerOnRail?: boolean;
}

export interface AutoLayoutResult {
  updatedRails: DinRail[];
  stats: {
    totalComponents: number;
    movedCount: number;
    spaceSavedMm: number;
    avgOccupancyPercent: number;
    thermalCompliancePercent: number;
    beforeCompliancePercent: number;
    warnings: string[];
  };
}

/**
 * Determine clearance required between two adjacent components
 */
function getInterComponentGap(
  itemA: PlacedComponent,
  itemB: PlacedComponent,
  options: AutoLayoutOptions
): number {
  const catA = itemA.data.category;
  const catB = itemB.data.category;

  const psuGap = options.psuClearanceMm ?? 20;
  const plcGap = options.plcClearanceMm ?? 10;
  const generalGap = options.generalSpacingMm ?? 5;
  const terminalGap = options.terminalsSpacingMm ?? 0;

  // 1. Two terminals adjacent to each other: flush (0mm by default)
  if (catA === 'terminals' && catB === 'terminals') {
    return terminalGap;
  }

  // 2. PLC CPU with PLC expansion module: 0mm backplane connection
  if (
    (catA === 'plc_cpu' && catB === 'plc_expansion') ||
    (catA === 'plc_expansion' && catB === 'plc_expansion')
  ) {
    return 0; // Seamless rack coupling
  }

  // 3. Power Supply (Mean Well) generates intense heat: enforce lateral buffer
  if (catA === 'power_supply' || catB === 'power_supply') {
    return options.mode === 'compact_safe' ? Math.max(12, psuGap - 5) : psuGap;
  }

  // 4. PLC CPU next to non-expansion: enforce PLC clearance
  if (catA === 'plc_cpu' || catB === 'plc_cpu') {
    return plcGap;
  }

  // 5. Contactors / motor controls
  if (catA === 'motor_control' || catB === 'motor_control') {
    return options.mode === 'compact_safe' ? 5 : 8;
  }

  // 6. Same breaker groups (AC or DC)
  if (
    (catA === 'protection_ac' && catB === 'protection_ac') ||
    (catA === 'protection_dc' && catB === 'protection_dc')
  ) {
    // Standard comb busbar or uniform 5mm
    return options.mode === 'compact_safe' ? 3 : generalGap;
  }

  // Default inter-component clearance
  return generalGap;
}

/**
 * Packs a single rail with collision-free, thermal-aware spacing
 */
export function packRailWithThermalClearance(
  railItems: PlacedComponent[],
  railIndex: number,
  usableWidthMm: number,
  options: AutoLayoutOptions
): { items: PlacedComponent[]; totalWidthUsed: number } {
  if (railItems.length === 0) {
    return { items: [], totalWidthUsed: 0 };
  }

  // Preserve functional order or sort according to standard priority
  const items = [...railItems];

  let curX = 10; // Start at 10mm margin from rail left
  const placed: PlacedComponent[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let gapBefore = 0;

    if (i > 0) {
      const prev = placed[i - 1];
      gapBefore = getInterComponentGap(prev, item, options);
    } else {
      // First item on rail: if it's a power supply, give initial buffer if space allows
      if (item.data.category === 'power_supply') {
        curX = Math.max(curX, 15);
      }
    }

    curX += gapBefore;
    placed.push({
      ...item,
      railIndex,
      positionMm: curX,
    });
    curX += item.data.widthMm;
  }

  const totalWidthUsed = curX;

  // Optional: Center components on rail if total width leaves comfortable margin and requested
  if (options.centerOnRail && totalWidthUsed < usableWidthMm - 30) {
    const remainingSlack = usableWidthMm - totalWidthUsed;
    const centerOffset = Math.floor(remainingSlack / 2);
    if (centerOffset > 5) {
      placed.forEach((p) => {
        p.positionMm += centerOffset;
      });
    }
  }

  return { items: placed, totalWidthUsed };
}

/**
 * Executes high-performance Auto-Layout / Auto-Router across DIN rails.
 */
export function executeAutoLayout(
  project: ProjectState,
  options: AutoLayoutOptions
): AutoLayoutResult {
  const { rails } = project;
  const beforeCompliance = checkThermalCompliance(rails);
  const warnings: string[] = [];

  // SCOPE 1: Selected Rail Only
  if (options.scope === 'selected_rail' && options.targetRailIndex !== undefined) {
    const targetIdx = options.targetRailIndex;
    const targetRail = rails[targetIdx];
    if (!targetRail || targetRail.items.length === 0) {
      return {
        updatedRails: rails,
        stats: {
          totalComponents: 0,
          movedCount: 0,
          spaceSavedMm: 0,
          avgOccupancyPercent: 0,
          thermalCompliancePercent: beforeCompliance.complianceRate,
          beforeCompliancePercent: beforeCompliance.complianceRate,
          warnings: ['A calha selecionada não possui componentes.'],
        },
      };
    }

    const { items: packedItems, totalWidthUsed } = packRailWithThermalClearance(
      targetRail.items,
      targetIdx,
      targetRail.usableWidthMm,
      options
    );

    if (totalWidthUsed > targetRail.usableWidthMm) {
      warnings.push(
        `Calha ${targetIdx + 1}: largura total dos componentes com folga (${Math.round(totalWidthUsed)}mm) ultrapassa o limite da calha (${targetRail.usableWidthMm}mm).`
      );
    }

    const updatedRails = rails.map((r, i) => (i === targetIdx ? { ...r, items: packedItems } : r));
    const afterCompliance = checkThermalCompliance(updatedRails);

    return {
      updatedRails,
      stats: {
        totalComponents: targetRail.items.length,
        movedCount: targetRail.items.length,
        spaceSavedMm: Math.max(0, targetRail.usableWidthMm - totalWidthUsed),
        avgOccupancyPercent: Math.round((totalWidthUsed / targetRail.usableWidthMm) * 100),
        thermalCompliancePercent: afterCompliance.complianceRate,
        beforeCompliancePercent: beforeCompliance.complianceRate,
        warnings,
      },
    };
  }

  // SCOPE 2: Whole Cabinet (All Rails)
  const allComponents = rails.flatMap((r) => r.items);
  const totalComponents = allComponents.length;

  if (totalComponents === 0) {
    return {
      updatedRails: rails,
      stats: {
        totalComponents: 0,
        movedCount: 0,
        spaceSavedMm: 0,
        avgOccupancyPercent: 0,
        thermalCompliancePercent: 100,
        beforeCompliancePercent: 100,
        warnings: ['Nenhum componente encontrado no quadro.'],
      },
    };
  }

  let finalRails: DinRail[] = [];

  if (options.mode === 'thermal_normative') {
    // EN 61439 Normative Segregation Strategy
    // Top Rail(s): Main Incomer, AC Protections, Mean Well PSU (with airflow buffer), DC Protections
    // Middle Rail(s): Siemens PLC CPU + Expansions + Industrial Network + Safety Relays
    // Lower Rail(s): Motor Starters, Contactors, Industrial & Interface Relays
    // Bottom Rail(s): Terminal Blocks (Viking 3 / Weidmüller) directly adjacent to bottom cable glands

    const acProtections = allComponents.filter((i) => i.data.category === 'protection_ac');
    const psus = allComponents.filter((i) => i.data.category === 'power_supply');
    const dcProtections = allComponents.filter((i) => i.data.category === 'protection_dc');
    const plcCpu = allComponents.filter((i) => i.data.category === 'plc_cpu');
    const plcExp = allComponents.filter((i) => i.data.category === 'plc_expansion');
    const safetyRelays = allComponents.filter((i) => i.data.category === 'safety_relays');
    const motorControl = allComponents.filter((i) => i.data.category === 'motor_control');
    const standardRelays = allComponents.filter((i) => i.data.category === 'relays');
    const terminals = allComponents.filter((i) => i.data.category === 'terminals');
    const accessories = allComponents.filter((i) => i.data.category === 'accessories');

    // Build functional baskets based on available rail count
    const numRails = rails.length;
    const baskets: PlacedComponent[][] = Array.from({ length: numRails }, () => []);

    if (numRails === 1) {
      // Single rail: AC -> PSU (with clearance) -> DC -> PLC -> Relays -> Terminals
      baskets[0] = [
        ...acProtections,
        ...psus,
        ...dcProtections,
        ...plcCpu,
        ...plcExp,
        ...safetyRelays,
        ...motorControl,
        ...standardRelays,
        ...accessories,
        ...terminals,
      ];
    } else if (numRails === 2) {
      // 2 Rails:
      // Rail 0: Power & Automation (AC + PSU + DC + PLC)
      // Rail 1: Actuators, Relays, Accessories & Terminals
      baskets[0] = [...acProtections, ...psus, ...dcProtections, ...plcCpu, ...plcExp, ...safetyRelays];
      baskets[1] = [...motorControl, ...standardRelays, ...accessories, ...terminals];
    } else if (numRails === 3) {
      // 3 Rails:
      // Rail 0: AC Protection + Power Supply + DC Protection
      // Rail 1: PLC CPU + Expansions + Safety Relays + Interface Relays
      // Rail 2: Motor Starters + Contactors + Bornes (Terminals)
      baskets[0] = [...acProtections, ...psus, ...dcProtections, ...accessories];
      baskets[1] = [...plcCpu, ...plcExp, ...safetyRelays, ...standardRelays];
      baskets[2] = [...motorControl, ...terminals];
    } else {
      // 4 or more rails (Full EN 61439 Standard Separation):
      // Rail 0 (Top): Proteções AC + Fontes Mean Well + Proteções DC
      baskets[0] = [...acProtections, ...psus, ...dcProtections];
      // Rail 1 (Automação): PLC CPU + Expansões + Switch/Acessórios + Relés de Segurança
      baskets[1] = [...plcCpu, ...plcExp, ...safetyRelays, ...accessories];
      // Rail 2 (Atuadores): Contactores de motores + Relés industriais
      baskets[2] = [...motorControl, ...standardRelays];
      // Rail Last (Fundo): Bornes de ligação para ligação direta à flange de bucins
      baskets[numRails - 1] = [...terminals];

      // If more than 4 rails, distribute excess or split relays/terminals
      if (numRails > 4) {
        // e.g. 5 rails: split power and signal terminals, or separate motor starters
        const spareRailsCount = numRails - 4;
        for (let s = 0; s < spareRailsCount; s++) {
          const midIdx = 2 + s;
          if (baskets[2].length > 4) {
            const half = Math.ceil(baskets[2].length / 2);
            baskets[midIdx] = baskets[2].splice(half);
          }
        }
      }
    }

    // Overflow balancing: If any basket exceeds usable rail width, spill items to adjacent rail
    for (let r = 0; r < numRails; r++) {
      const railW = rails[r].usableWidthMm;
      let totalEstW = baskets[r].reduce((acc, it) => acc + it.data.widthMm + 8, 0);

      // If overloaded and not last rail, spill non-critical items down
      if (totalEstW > railW && r < numRails - 1) {
        while (totalEstW > railW && baskets[r].length > 1) {
          const popped = baskets[r].pop();
          if (popped) {
            baskets[r + 1].unshift(popped);
            totalEstW = baskets[r].reduce((acc, it) => acc + it.data.widthMm + 8, 0);
          }
        }
      }
    }

    finalRails = rails.map((rail, rIdx) => {
      const { items: packed } = packRailWithThermalClearance(
        baskets[rIdx] || [],
        rIdx,
        rail.usableWidthMm,
        options
      );
      return { ...rail, items: packed };
    });
  } else if (options.mode === 'compact_safe') {
    // Keep items in their existing rails or consolidate, but pack tightly with safe minimum margins
    finalRails = rails.map((rail, rIdx) => {
      const { items: packed } = packRailWithThermalClearance(
        rail.items,
        rIdx,
        rail.usableWidthMm,
        { ...options, generalSpacingMm: 3, psuClearanceMm: 15, plcClearanceMm: 10, terminalsSpacingMm: 0 }
      );
      return { ...rail, items: packed };
    });
  } else {
    // Balanced Distribution: Balances total module width evenly across all rails
    const sortedByWidth = [...allComponents].sort((a, b) => b.data.widthMm - a.data.widthMm);
    const railBins: PlacedComponent[][] = Array.from({ length: rails.length }, () => []);
    const railWeights: number[] = Array.from({ length: rails.length }, () => 0);

    sortedByWidth.forEach((comp) => {
      // Find rail with lowest current occupancy
      let minIdx = 0;
      let minWeight = railWeights[0];
      for (let i = 1; i < railWeights.length; i++) {
        if (railWeights[i] < minWeight) {
          minWeight = railWeights[i];
          minIdx = i;
        }
      }
      railBins[minIdx].push(comp);
      railWeights[minIdx] += comp.data.widthMm + 10;
    });

    finalRails = rails.map((rail, rIdx) => {
      // Sort items within each rail logically
      const itemsInBin = (railBins[rIdx] || []).sort((a, b) => {
        const catOrder: Record<ComponentCategory, number> = {
          protection_ac: 1,
          residential_modular: 2,
          power_supply: 3,
          protection_dc: 4,
          plc_cpu: 5,
          plc_expansion: 6,
          safety_relays: 7,
          motor_control: 8,
          relays: 9,
          accessories: 10,
          terminals: 11,
        };
        return (catOrder[a.data.category] || 99) - (catOrder[b.data.category] || 99);
      });

      const { items: packed } = packRailWithThermalClearance(
        itemsInBin,
        rIdx,
        rail.usableWidthMm,
        options
      );
      return { ...rail, items: packed };
    });
  }

  // Calculate final statistics
  const afterCompliance = checkThermalCompliance(finalRails);
  let totalUsedMm = 0;
  let totalRailMm = 0;

  finalRails.forEach((r, idx) => {
    const used = r.items.reduce((acc, it) => acc + it.data.widthMm + 5, 0);
    totalUsedMm += used;
    totalRailMm += r.usableWidthMm;
    if (used > r.usableWidthMm) {
      warnings.push(`Calha ${idx + 1}: Ocupação elevada (${Math.round((used / r.usableWidthMm) * 100)}%). Considere redistribuir ou aumentar o armário.`);
    }
  });

  const avgOccupancyPercent = totalRailMm > 0 ? Math.round((totalUsedMm / totalRailMm) * 100) : 0;
  const spaceSavedMm = Math.max(0, totalRailMm - totalUsedMm);

  return {
    updatedRails: finalRails,
    stats: {
      totalComponents,
      movedCount: totalComponents,
      spaceSavedMm,
      avgOccupancyPercent,
      thermalCompliancePercent: afterCompliance.complianceRate,
      beforeCompliancePercent: beforeCompliance.complianceRate,
      warnings,
    },
  };
}
