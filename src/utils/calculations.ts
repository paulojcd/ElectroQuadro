import { ProjectState, PowerBalanceCalculation, ValidationIssue, PlacedComponent } from '../types/electrical';
import { checkThermalCompliance } from './autoLayoutUtils';
import { verifyEnclosureIpIk } from './ipIkVerification';

export function calculatePowerBalance(project: ProjectState): PowerBalanceCalculation {
  const allItems: PlacedComponent[] = project.rails.flatMap((r) => r.items);
  
  // Power supplies (Mean Well)
  const psus = allItems.filter((item) => item.data.category === 'power_supply');
  const totalDcSuppliedA = psus.reduce((sum, p) => sum + (p.data.ratedCurrentA || 0), 0);
  const totalDcSuppliedW = psus.reduce((sum, p) => sum + (p.data.ratedPowerW || 0), 0);

  // 24V DC Consumers (Siemens CPUs, expansions, 24V coils, safety modules)
  let totalDcConsumedA = 0;
  let totalDcConsumedW = 0;

  for (const item of allItems) {
    if (item.data.category !== 'power_supply') {
      const itemCurrent = item.data.dcConsumptionA || 0;
      const itemPower = item.data.dcConsumptionW || (itemCurrent * 24);
      totalDcConsumedA += itemCurrent;
      totalDcConsumedW += itemPower;

      // Add small allowance for sensors connected to digital inputs (approx 15mA per input)
      if (item.data.digitalInputs) {
        const inputAllowanceA = (item.data.digitalInputs * 0.015);
        totalDcConsumedA += inputAllowanceA;
        totalDcConsumedW += inputAllowanceA * 24;
      }
    }
  }

  // Round values
  totalDcConsumedA = Math.round(totalDcConsumedA * 100) / 100;
  totalDcConsumedW = Math.round(totalDcConsumedW * 10) / 10;

  const loadingPercentage = totalDcSuppliedA > 0 
    ? Math.round((totalDcConsumedA / totalDcSuppliedA) * 100) 
    : (totalDcConsumedA > 0 ? 999 : 0);

  const isOverloaded = loadingPercentage > 100;

  let recommendedPsuUpgrade: string | undefined;
  if (totalDcConsumedA > 0 && totalDcConsumedA > totalDcSuppliedA * 0.85) {
    if (totalDcConsumedA <= 3.0) recommendedPsuUpgrade = 'Mean Well NDR-75-24 (3.2A / 75W)';
    else if (totalDcConsumedA <= 4.8) recommendedPsuUpgrade = 'Mean Well NDR-120-24 (5.0A / 120W)';
    else if (totalDcConsumedA <= 9.5) recommendedPsuUpgrade = 'Mean Well NDR-240-24 (10.0A / 240W)';
    else recommendedPsuUpgrade = 'Mean Well NDR-480-24 (20.0A / 480W)';
  }

  let primaryProtectionRecommendation: string | undefined;
  if (psus.length > 0) {
    const mainPsu = psus[0];
    if (mainPsu.data.ratedPowerW && mainPsu.data.ratedPowerW <= 60) {
      primaryProtectionRecommendation = 'Disjuntor 1P+N Curva C de 2A ou 4A (ex: Siemens 5SY6002-7)';
    } else if (mainPsu.data.ratedPowerW && mainPsu.data.ratedPowerW <= 120) {
      primaryProtectionRecommendation = 'Disjuntor 1P+N Curva C de 6A (ex: Siemens 5SY6006-7)';
    } else {
      primaryProtectionRecommendation = 'Disjuntor 1P+N Curva C de 10A ou 16A com curva de arranque lenta';
    }
  }

  return {
    totalDcSuppliedA,
    totalDcSuppliedW,
    totalDcConsumedA,
    totalDcConsumedW,
    loadingPercentage,
    isOverloaded,
    recommendedPsuUpgrade,
    primaryProtectionRecommendation,
  };
}
export function isResidentialProject(project: ProjectState): boolean {
  if (project.config.applicationType === 'residential') return true;
  if (project.config.applicationType === 'automation') return false;

  const text = `${project.config.name} ${project.config.notes || ''}`.toLowerCase();
  if (
    text.includes('residencial') ||
    text.includes('habita') ||
    text.includes('apartamento') ||
    text.includes('moradia') ||
    text.includes('vivenda') ||
    text.includes('t0') ||
    text.includes('t1') ||
    text.includes('t2') ||
    text.includes('t3') ||
    text.includes('t4') ||
    text.includes('t5') ||
    text.includes('rtiebt')
  ) {
    return true;
  }

  // Check components: if no industrial PLC and no 24V PSU present, treat as residential/general distribution
  const allItems = project.rails.flatMap((r) => r.items);
  const hasIndustrial = allItems.some(
    (i) => i.data.category === 'plc_cpu' || i.data.category === 'plc_expansion' || i.data.category === 'power_supply'
  );
  return !hasIndustrial;
}

export function runEngineeringValidations(project: ProjectState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allItems: PlacedComponent[] = project.rails.flatMap((r) => r.items);
  const isResidential = isResidentialProject(project);

  if (isResidential) {
    // ==========================================
    // REGRAS ESPECÍFICAS PARA QUADROS RESIDENCIAIS (RTIEBT / EN 61439-3)
    // ==========================================

    // 1. Corte Geral do Quadro (RTIEBT Secção 537.1.4)
    const mainBreakers = allItems.filter(
      (i) =>
        i.data.category === 'protection_ac' &&
        (i.tag.startsWith('Q0') ||
          i.tag.startsWith('Q1') ||
          i.data.name.toLowerCase().includes('geral') ||
          i.data.name.toLowerCase().includes('corte') ||
          (i.data.ratedCurrentA && i.data.ratedCurrentA >= 25 && i.data.widthMm >= 36))
    );

    if (mainBreakers.length === 0) {
      issues.push({
        id: 'val-res-no-main',
        type: 'error',
        category: 'protection',
        title: 'Ausência de Disjuntor / Interruptor de Corte Geral (RTIEBT 537.1)',
        description: 'Os quadros de distribuição residencial devem dispor de um aparelho de corte geral (bipolar ou tetrapolar) no topo do quadro.',
        suggestedAction: 'Insira um disjuntor 2P (ex: 32A ou 40A Curva C) como corte geral de entrada.',
      });
    }

    // 2. Proteção Diferencial de Alta Sensibilidade 30mA (RTIEBT Secção 412.5 & 531.2)
    const rcds = allItems.filter(
      (i) =>
        i.data.category === 'protection_ac' &&
        (i.data.name.toLowerCase().includes('diferencial') ||
          i.data.name.toLowerCase().includes('rccb') ||
          i.tag.toLowerCase().includes('diff') ||
          i.tag.startsWith('F'))
    );

    const has30maRcd = rcds.some((r) => r.data.name.toLowerCase().includes('30ma') || r.data.description.toLowerCase().includes('30ma'));

    if (rcds.length === 0) {
      issues.push({
        id: 'val-res-no-rcd',
        type: 'error',
        category: 'normative',
        title: 'Ausência de Interruptor Diferencial 30mA (Obrigatório RTIEBT)',
        description: 'É obrigatória a proteção de todas as tomadas e circuitos residenciais por interruptores diferenciais de alta sensibilidade (IΔn ≤ 30mA) para proteção de vidas contra contactos indiretos.',
        suggestedAction: 'Adicione pelo menos um Interruptor Diferencial 2P 40A 30mA Tipo A (Hager / Schneider / Legrand).',
      });
    } else if (!has30maRcd) {
      issues.push({
        id: 'val-res-rcd-sensitivity',
        type: 'warning',
        category: 'normative',
        title: 'Sensibilidade Diferencial 30mA Não Confirmada',
        description: 'Certifique-se de que o diferencial instalado é de 30mA (Tipo A para habitação) e não 300mA de distribuição industrial.',
        suggestedAction: 'Utilize diferencial de 30mA Tipo A.',
      });
    }

    // 3. Descarregador de Sobretensões (DPS / SPD Classe II - RTIEBT 443 & 534)
    const spds = allItems.filter(
      (i) =>
        i.data.name.toLowerCase().includes('spd') ||
        i.data.name.toLowerCase().includes('dps') ||
        i.data.name.toLowerCase().includes('sobretens') ||
        i.tag.toLowerCase().includes('spd')
    );

    if (spds.length === 0) {
      issues.push({
        id: 'val-res-no-spd',
        type: 'warning',
        category: 'protection',
        title: 'Descarregador de Sobretensões (DPS) Recomendado (RTIEBT 534)',
        description: 'A instalação de um DPS Classe II (1P+N ou 3P+N) protege os equipamentos eletrónicos e eletrodomésticos da habitação contra descargas atmosféricas e sobretensões de rede.',
        suggestedAction: 'Adicione um Descarregador de Sobretensões SPD Classe II (Hager SPN215D ou Schneider).',
      });
    }

    // 4. Reserva de Espaço Regulamentar (Mínimo 20% - RTIEBT Secção 539.1)
    const totalUsableWidth = project.rails.reduce((acc, r) => acc + r.usableWidthMm, 0);
    const totalUsedWidth = allItems.reduce((acc, i) => acc + i.data.widthMm, 0);
    const reservePercentage = totalUsableWidth > 0 ? Math.round(((totalUsableWidth - totalUsedWidth) / totalUsableWidth) * 100) : 0;

    if (reservePercentage < 20 && totalUsableWidth > 0) {
      issues.push({
        id: 'val-res-reserve-space',
        type: 'warning',
        category: 'space',
        title: `Reserva de Espaço no Quadro Inferior a 20% (${reservePercentage}% disponível)`,
        description: 'A norma RTIEBT (Secção 539.1) exige uma reserva mínima de 20% de espaço livre em calha DIN nos quadros residenciais para permitir expansões e circuitos futuros.',
        suggestedAction: 'Aumente o número de calhas ou a largura do quadro para garantir pelo menos 20% de módulos vagos.',
      });
    }
  } else {
    // ==========================================
    // REGRAS ESPECÍFICAS PARA AUTOMAÇÃO INDUSTRIAL (EN 60204-1 / EN 61439-1)
    // ==========================================

    // 1. Check Power Supply Presence
    const psus = allItems.filter((i) => i.data.category === 'power_supply');
    if (psus.length === 0) {
      issues.push({
        id: 'val-no-psu',
        type: 'error',
        category: 'power',
        title: 'Ausência de Fonte de Alimentação 24VDC',
        description: 'O quadro industrial não possui nenhuma fonte de alimentação para alimentar os circuitos de comando e PLC.',
        suggestedAction: 'Adicione uma fonte Mean Well (ex: NDR-120-24 ou NDR-75-24) na Calha 1.',
      });
    } else {
      // Check primary protection for PSU
      const primaryPsuBreakers = allItems.filter(
        (i) =>
          i.data.category === 'protection_ac' &&
          (i.data.name.toLowerCase().includes('fonte') || (i.data.ratedCurrentA && i.data.ratedCurrentA <= 10))
      );
      if (primaryPsuBreakers.length === 0) {
        issues.push({
          id: 'val-no-psu-protection',
          type: 'warning',
          category: 'protection',
          title: 'Proteção Primária Dedicada para a Fonte Mean Well Não Detetada',
          description: 'Recomenda-se proteger o primário da fonte Mean Well com um disjuntor 1P+N Curva C (2A a 6A) para isolamento seletivo.',
          suggestedAction: 'Insira um disjuntor 1P+N 6A Curva C Siemens 5SY6 a montante da fonte.',
        });
      }

      // Check DC secondary protection
      const dcProtections = allItems.filter((i) => i.data.category === 'protection_dc');
      if (dcProtections.length === 0) {
        issues.push({
          id: 'val-no-dc-protection',
          type: 'info',
          category: 'protection',
          title: 'Proteção Secundária 24VDC Recomendada',
          description: 'Embora as fontes Mean Well disponham de limitação eletrónica interna, um disjuntor DC dedicado garante proteção seletiva das cargas.',
          suggestedAction: 'Adicione um disjuntor unipolar DC (ex: Siemens 5SY4104-7 de 4A ou 10A).',
        });
      }
    }

    // 2. Check Siemens PLC Presence
    const plcs = allItems.filter((i) => i.data.category === 'plc_cpu');
    if (plcs.length === 0) {
      issues.push({
        id: 'val-no-plc',
        type: 'info',
        category: 'normative',
        title: 'Nenhum Controlador Siemens Adicionado',
        description: 'O quadro de automação ainda não dispõe de um controlador Siemens (SIMATIC S7-1200, S7-1500 ou LOGO! 8).',
        suggestedAction: 'Adicione uma CPU Siemens S7-1200 ou LOGO! 8 a partir do catálogo.',
      });
    }
  }

  // 3. Power Balance check
  const power = calculatePowerBalance(project);
  if (power.isOverloaded) {
    issues.push({
      id: 'val-overload',
      type: 'error',
      category: 'power',
      title: 'Sobrecarga Elétrica na Linha 24VDC!',
      description: `O consumo calculado (${power.totalDcConsumedA}A / ${power.totalDcConsumedW}W) excede a capacidade nominal da fonte (${power.totalDcSuppliedA}A / ${power.totalDcSuppliedW}W).`,
      suggestedAction: power.recommendedPsuUpgrade 
        ? `Substitua a fonte atual por uma ${power.recommendedPsuUpgrade}.`
        : 'Adicione uma fonte Mean Well suplementar.',
    });
  } else if (power.loadingPercentage > 80 && power.totalDcSuppliedA > 0) {
    issues.push({
      id: 'val-high-load',
      type: 'warning',
      category: 'power',
      title: 'Taxa de Ocupação da Fonte 24VDC Superior a 80%',
      description: `A fonte Mean Well está dimensionada a ${power.loadingPercentage}% de carga contínua. Para garantir longevidade térmica e picos de partida de relés/sensores, recomenda-se margem $\\ge 20\\%$.`,
      suggestedAction: power.recommendedPsuUpgrade 
        ? `Considere instalar uma ${power.recommendedPsuUpgrade}.` 
        : 'Aumente a capacidade da fonte.',
    });
  }

  // 4. Rail Space / Width check
  project.rails.forEach((rail, idx) => {
    const usedMm = rail.items.reduce((sum, item) => sum + item.data.widthMm, 0);
    if (usedMm > rail.usableWidthMm) {
      issues.push({
        id: `val-rail-overflow-${idx}`,
        type: 'error',
        category: 'space',
        title: `Calha ${idx + 1} com Excesso de Componentes`,
        description: `Os componentes ocupam ${usedMm}mm para um espaço útil de apenas ${rail.usableWidthMm}mm (excesso de ${usedMm - rail.usableWidthMm}mm).`,
        suggestedAction: 'Transfira alguns componentes para outra calha ou aumente a largura do quadro.',
      });
    } else if (usedMm > rail.usableWidthMm * 0.9) {
      issues.push({
        id: `val-rail-dense-${idx}`,
        type: 'info',
        category: 'space',
        title: `Calha ${idx + 1} Praticamente Cheia (${Math.round((usedMm / rail.usableWidthMm) * 100)}%)`,
        description: 'Existe pouco espaço de reserva para dissipação térmica da fonte Mean Well e futuras expansões de módulos.',
      });
    }
  });

  // 5. General Protection & Earth check
  const mainBreaker = allItems.find((i) => i.tag.startsWith('QM0') || i.tag.startsWith('Q0'));
  if (!mainBreaker) {
    issues.push({
      id: 'val-no-main-mcb',
      type: 'warning',
      category: 'protection',
      title: 'Corte Geral Não Identificado',
      description: 'Recomenda-se incluir um disjuntor de corte geral (Q0 / QM0) à entrada do armário elétrico.',
      suggestedAction: 'Adicione um Disjuntor Bipolar 2P ou Tetrapolar 4P Siemens 5SY4.',
    });
  }

  const rccb = allItems.find((i) => i.data.category === 'protection_ac' && i.data.name.toLowerCase().includes('diferencial'));
  if (!rccb) {
    issues.push({
      id: 'val-no-rccb',
      type: 'warning',
      category: 'protection',
      title: 'Proteção Diferencial Residual (RCCB) Não Encontrada',
      description: 'Segundo a norma de segurança elétrica de quadros (EN 61439), deve existir proteção contra contactos indiretos.',
      suggestedAction: 'Insira um interruptor diferencial de 30mA Siemens 5SV3.',
    });
  }

  const peBlocks = allItems.filter((i) => i.data.category === 'terminals' && i.data.name.toLowerCase().includes('terra'));
  if (peBlocks.length === 0) {
    issues.push({
      id: 'val-no-pe',
      type: 'warning',
      category: 'protection',
      title: 'Barramento / Bornes de Terra PE Ausentes',
      description: 'A carcaça do quadro e a fonte Mean Well necessitam de ligação equipotencial ao condutor de proteção PE.',
      suggestedAction: 'Adicione um bloco de bornes de terra Weidmüller WPE 2.5.',
    });
  }

  // 6. Thermal Clearance & Ventilation (EN 61439 & Manufacturer Specs)
  const thermalCheck = checkThermalCompliance(project.rails);
  thermalCheck.issues.forEach((thermalIssue) => {
    issues.push({
      id: `val-thermal-${thermalIssue.componentId}`,
      type: thermalIssue.severity,
      category: 'normative',
      title: `Ventilação Térmica: ${thermalIssue.componentTag}`,
      description: thermalIssue.message,
      suggestedAction: `${thermalIssue.recommendation} Use a ferramenta 'Auto-Layout' para otimizar automaticamente.`,
    });
  });

  // 7. Grau de Proteção IP (EN 60529) & Resistência Mecânica IK (EN 62262) no Ambiente de Instalação
  const ipIkReport = verifyEnclosureIpIk(project.config);
  if (!ipIkReport.isCompliant || ipIkReport.status === 'warning') {
    ipIkReport.findings.forEach((f, idx) => {
      if (f.type === 'error' || f.type === 'warning') {
        issues.push({
          id: `val-ipik-${idx}`,
          type: f.type,
          category: 'enclosure',
          title: f.title,
          description: `${f.message} [Norma: ${f.normativeStandard}]`,
          suggestedAction: f.suggestedAction || 'Ajuste o grau IP/IK do armário nas configurações do projeto.',
        });
      }
    });
  }

  return issues;
}
