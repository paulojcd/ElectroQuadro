import { EnclosureConfig, InstallationEnvironment, IkRating, EnclosureMaterial } from '../types/electrical';

export interface EnvironmentSpec {
  id: InstallationEnvironment;
  label: string;
  category: 'residential' | 'commercial' | 'industrial' | 'outdoor';
  description: string;
  typicalLocations: string;
  minIpRating: string;
  minIpSolid: number;
  minIpLiquid: number;
  minIkRating: IkRating;
  minJoules: number;
  requiresDoor: boolean;
  recommendedMaterial: EnclosureMaterial;
  normativeReference: string;
  rtiebtInfluences: {
    adWater: string;
    aeSolids: string;
    agImpact: string;
  };
}

export const IK_ENERGY_JOULES: Record<IkRating, { joules: number; testDescription: string; equivalentImpact: string }> = {
  IK02: {
    joules: 0.2,
    testDescription: 'Impacto de 0.2 J (massa de 200g em queda de 10 cm)',
    equivalentImpact: 'Proteção muito fraca. Apenas pequenos toques acidentais.',
  },
  IK05: {
    joules: 0.7,
    testDescription: 'Impacto de 0.7 J (massa de 200g em queda de 35 cm)',
    equivalentImpact: 'Impactos ligeiros comuns em interiores residenciais protegidos.',
  },
  IK07: {
    joules: 2.0,
    testDescription: 'Impacto de 2.0 J (massa de 500g em queda de 40 cm)',
    equivalentImpact: 'Padrão habitacional e terciário de boa qualidade (plásticos técnicos reforçados).',
  },
  IK08: {
    joules: 5.0,
    testDescription: 'Impacto de 5.0 J (massa de 1.7 kg em queda de 30 cm)',
    equivalentImpact: 'Padrão industrial robusto (chapa de aço / poliéster reforçado com fibra de vidro).',
  },
  IK09: {
    joules: 10.0,
    testDescription: 'Impacto de 10.0 J (massa de 5.0 kg em queda de 20 cm)',
    equivalentImpact: 'Ambientes mecânicos agressivos e áreas públicas com risco de pancadas.',
  },
  IK10: {
    joules: 20.0,
    testDescription: 'Impacto de 20.0 J (massa de 5.0 kg em queda de 40 cm)',
    equivalentImpact: 'Máxima resistência antivandálica e para indústria pesada.',
  },
};

export const IP_SOLID_DESCRIPTIONS: Record<number, { title: string; detail: string }> = {
  0: { title: 'Sem proteção', detail: 'Nenhuma proteção contra corpos sólidos.' },
  2: { title: '> 12.5 mm', detail: 'Proteção contra dedos e objetos de dimensões semelhantes.' },
  3: { title: '> 2.5 mm', detail: 'Proteção contra ferramentas, cabos grossos, etc.' },
  4: { title: '> 1.0 mm', detail: 'Proteção contra fios finos, parafusos e insetos grandes.' },
  5: { title: 'Pó Protegido', detail: 'Entrada limitada de poeiras (depósito sem afetar funcionamento).' },
  6: { title: 'Estanque ao Pó', detail: 'Totalmente impermeável e estanque à entrada de pó fino.' },
};

export const IP_LIQUID_DESCRIPTIONS: Record<number, { title: string; detail: string }> = {
  0: { title: 'Sem proteção', detail: 'Nenhuma proteção contra líquidos.' },
  1: { title: 'Gotas verticais', detail: 'Gotas de água a cair verticalmente.' },
  2: { title: 'Gotas até 15°', detail: 'Gotas de água com invólucro inclinado até 15°.' },
  3: { title: 'Chuva até 60°', detail: 'Chuva batida ou água nebulizada até 60° com a vertical.' },
  4: { title: 'Salpicos 360°', detail: 'Projeções de água de qualquer direção (à prova de salpicos).' },
  5: { title: 'Jatos de água', detail: 'Jatos de mangueira (6.3 mm a 12.5 l/min) de qualquer direção.' },
  6: { title: 'Jatos potentes', detail: 'Jatos potentes de água de alta pressão ou vagas de mar.' },
  7: { title: 'Imersão temp.', detail: 'Imersão temporária até 1 metro de profundidade.' },
  8: { title: 'Imersão contínua', detail: 'Submersão contínua sob pressão especificada pelo fabricante.' },
};

export const ENVIRONMENT_SPECS: Record<InstallationEnvironment, EnvironmentSpec> = {
  residential_indoor_dry: {
    id: 'residential_indoor_dry',
    label: 'Habitação Interior Seco (Salas, Quartos, Corredores)',
    category: 'residential',
    description: 'Ambiente residencial climatizado e seco, sem presença apreciável de poeiras ou projeções de água. Acesso por pessoas comuns (BA1).',
    typicalLocations: 'Hall de entrada, corredor de distribuição, sala de estar, quartos.',
    minIpRating: 'IP40',
    minIpSolid: 4,
    minIpLiquid: 0,
    minIkRating: 'IK07',
    minJoules: 2.0,
    requiresDoor: true,
    recommendedMaterial: 'thermoplastic',
    normativeReference: 'RTIEBT 801.2.1.2 & EN 61439-3 (DBO)',
    rtiebtInfluences: {
      adWater: 'AD1 (Desprezível)',
      aeSolids: 'AE1 (Desprezível)',
      agImpact: 'AG1 (Impactos Fracos)',
    },
  },
  residential_indoor_damp: {
    id: 'residential_indoor_damp',
    label: 'Habitação Zonas Húmidas (Garagens, Caves, Lavandarias, Arrecadações)',
    category: 'residential',
    description: 'Espaços sujeitos a humidade, salpicos acidentais de lavagem, poeiras e impactos mecânicos causados por veículos ou ferramentas.',
    typicalLocations: 'Garagem privada, cave, lavandaria, casa de máquinas, arrumos.',
    minIpRating: 'IP44',
    minIpSolid: 4,
    minIpLiquid: 4,
    minIkRating: 'IK07',
    minJoules: 2.0,
    requiresDoor: true,
    recommendedMaterial: 'thermoplastic',
    normativeReference: 'RTIEBT 801.4.2 & Quadro 51A (AD4/AE2/AG2)',
    rtiebtInfluences: {
      adWater: 'AD4 (Projeções de Água / Salpicos)',
      aeSolids: 'AE2 (Pequenos Objetos > 2.5mm)',
      agImpact: 'AG2 (Impactos Médios)',
    },
  },
  residential_outdoor_sheltered: {
    id: 'residential_outdoor_sheltered',
    label: 'Residencial Exterior Abrigado (Alpendres, Varandas Cobertas)',
    category: 'residential',
    description: 'Instalação no exterior de habitações, porém protegida da chuva vertical direta por pala, cobertura ou alpendre.',
    typicalLocations: 'Entrada de moradia sob alpendre, varanda coberta, telheiro de estacionamento.',
    minIpRating: 'IP55',
    minIpSolid: 5,
    minIpLiquid: 5,
    minIkRating: 'IK08',
    minJoules: 5.0,
    requiresDoor: true,
    recommendedMaterial: 'polyester',
    normativeReference: 'RTIEBT Quadro 51A (AD3/AE3) & EN 60529',
    rtiebtInfluences: {
      adWater: 'AD3 (Chuva Batida / Humidade)',
      aeSolids: 'AE3 (Poeiras Fracas)',
      agImpact: 'AG2 (Impactos Médios)',
    },
  },
  residential_outdoor_exposed: {
    id: 'residential_outdoor_exposed',
    label: 'Residencial Exterior Desabrigado (Muros, Jardins, Postos EV)',
    category: 'outdoor',
    description: 'Instalação ao ar livre diretamente sujeita a chuva torrencial, radiação UV, poeiras e risco de choques por veículos ou cortes de relva.',
    typicalLocations: 'Muro exterior, portão da moradia, jardim, poste de carregamento Wallbox desabrigado.',
    minIpRating: 'IP65',
    minIpSolid: 6,
    minIpLiquid: 5,
    minIkRating: 'IK08',
    minJoules: 5.0,
    requiresDoor: true,
    recommendedMaterial: 'polyester',
    normativeReference: 'RTIEBT 722 & EN 61439-3 / EN 60529',
    rtiebtInfluences: {
      adWater: 'AD4/AD5 (Chuva e Jatos de Lavagem)',
      aeSolids: 'AE4 (Poeiras Exteriores)',
      agImpact: 'AG2 (Impactos Médios)',
    },
  },
  commercial_office: {
    id: 'commercial_office',
    label: 'Comercial / Escritórios / Salas Técnicas Limpas',
    category: 'commercial',
    description: 'Edifícios terciários, lojas e escritórios com ar condicionado e limpezas regulares. Risco ambiental muito reduzido.',
    typicalLocations: 'Salas de bastidores elétricos, lojas de retalho, escritórios corporativos, consultórios.',
    minIpRating: 'IP40',
    minIpSolid: 4,
    minIpLiquid: 0,
    minIkRating: 'IK07',
    minJoules: 2.0,
    requiresDoor: true,
    recommendedMaterial: 'sheet_steel',
    normativeReference: 'EN 61439-1/-2 & RTIEBT 801',
    rtiebtInfluences: {
      adWater: 'AD1 (Desprezível)',
      aeSolids: 'AE1 (Desprezível)',
      agImpact: 'AG1 (Impactos Fracos)',
    },
  },
  commercial_kitchen_wash: {
    id: 'commercial_kitchen_wash',
    label: 'Cozinhas Comerciais / Zonas de Lavagem & Higienização',
    category: 'commercial',
    description: 'Ambientes de restauração e hotelaria sujeitos a vapores densos, gorduras, salpicos e lavagens frequentes com água.',
    typicalLocations: 'Cozinhas de restaurantes, hotéis, copas de lavagem de louça, lavandarias industriais.',
    minIpRating: 'IP55',
    minIpSolid: 5,
    minIpLiquid: 5,
    minIkRating: 'IK08',
    minJoules: 5.0,
    requiresDoor: true,
    recommendedMaterial: 'stainless_steel',
    normativeReference: 'EN 60529 & RTIEBT Quadro 51A (AD4/AF2)',
    rtiebtInfluences: {
      adWater: 'AD4 (Salpicos / Vapores Densos)',
      aeSolids: 'AE2 (Resíduos / Gorduras)',
      agImpact: 'AG2 (Impactos Médios)',
    },
  },
  industrial_clean_control: {
    id: 'industrial_clean_control',
    label: 'Indústria Ligeira / Sala de Controlo & Autómatos Climatizada',
    category: 'industrial',
    description: 'Ambientes fabris limpos, centros de comando com chão técnico, salas elétricas dedicadas com controlo de temperatura.',
    typicalLocations: 'Sala de comando SCADA, sala de quadros elétricos de distribuição, sala de servidores.',
    minIpRating: 'IP54',
    minIpSolid: 5,
    minIpLiquid: 4,
    minIkRating: 'IK08',
    minJoules: 5.0,
    requiresDoor: true,
    recommendedMaterial: 'sheet_steel',
    normativeReference: 'EN 60204-1 (Equipamento Elétrico de Máquinas) & EN 61439-2',
    rtiebtInfluences: {
      adWater: 'AD2 (Gotas de Condensação)',
      aeSolids: 'AE2 (Poeiras Industriais)',
      agImpact: 'AG2 (Impactos Industriais)',
    },
  },
  industrial_dusty_workshop: {
    id: 'industrial_dusty_workshop',
    label: 'Oficina Industrial com Poeiras (Carpintarias, Serralharias, Têxtil)',
    category: 'industrial',
    description: 'Presença elevada de partículas sólidas em suspensão, poeira de madeira condutora ou inflamável, limalhas metálicas e fibras.',
    typicalLocations: 'Oficina mecânica, serralharia de alumínio/aço, serração/carpintaria, indústria cerâmica.',
    minIpRating: 'IP65',
    minIpSolid: 6,
    minIpLiquid: 5,
    minIkRating: 'IK08',
    minJoules: 5.0,
    requiresDoor: true,
    recommendedMaterial: 'sheet_steel',
    normativeReference: 'EN 60204-1 Secção 11.2 & EN 60529',
    rtiebtInfluences: {
      adWater: 'AD2 (Humidade Atmosférica)',
      aeSolids: 'AE4 (Poeiras Densas em Suspensão)',
      agImpact: 'AG2 (Impactos Médios)',
    },
  },
  industrial_heavy_washdown: {
    id: 'industrial_heavy_washdown',
    label: 'Indústria Alimentar / Agro-Pecuária / Lavagem a Alta Pressão',
    category: 'industrial',
    description: 'Áreas sujeitas a lavagem diária com mangueiras de pressão, agentes químicos de desinfeção (HACCP) e ambientes corrosivos.',
    typicalLocations: 'Matadouros, fábricas de laticínios, adegas, indústria conserveira, pecuária intensiva.',
    minIpRating: 'IP66',
    minIpSolid: 6,
    minIpLiquid: 6,
    minIkRating: 'IK09',
    minJoules: 10.0,
    requiresDoor: true,
    recommendedMaterial: 'stainless_steel',
    normativeReference: 'EN 60204-1 & ISO 14159 / EN 60529',
    rtiebtInfluences: {
      adWater: 'AD5/AD6 (Jatos Potentes e Pressão)',
      aeSolids: 'AE3 (Resíduos Orgânicos)',
      agImpact: 'AG3 (Impactos Severos)',
    },
  },
  outdoor_severe_industrial: {
    id: 'outdoor_severe_industrial',
    label: 'Exterior Industrial Severo / Ambientes Marítimos & Portuários',
    category: 'outdoor',
    description: 'Exposição severa à intempérie, salinidade corrosiva marítima (névoa salina), vento com poeiras abrasivas e vandalismo.',
    typicalLocations: 'Zonas portuárias, pontões, plataformas petrolíferas, ETARs, minas a céu aberto.',
    minIpRating: 'IP66',
    minIpSolid: 6,
    minIpLiquid: 6,
    minIkRating: 'IK10',
    minJoules: 20.0,
    requiresDoor: true,
    recommendedMaterial: 'stainless_steel',
    normativeReference: 'EN 61439-1 & EN 62262 (IK10 20J) & EN 60529',
    rtiebtInfluences: {
      adWater: 'AD6 (Vagas de Água e Intempéries)',
      aeSolids: 'AE4 (Poeiras e Areias Abrasivas)',
      agImpact: 'AG3 (Impactos Severos 20J)',
    },
  },
};

export interface IpIkFinding {
  type: 'error' | 'warning' | 'ok';
  title: string;
  message: string;
  normativeStandard: string;
  suggestedAction?: string;
}

export interface IpIkVerificationResult {
  isCompliant: boolean;
  status: 'compliant' | 'warning' | 'non_compliant';
  environment: EnvironmentSpec;
  actualIp: string;
  effectiveIp: string;
  requiredIp: string;
  actualIk: IkRating;
  requiredIk: IkRating;
  actualJoules: number;
  requiredJoules: number;
  solidPass: boolean;
  liquidPass: boolean;
  ikPass: boolean;
  doorPass: boolean;
  materialCompatible: boolean;
  findings: IpIkFinding[];
  recommendedCorrection?: {
    ipRating: any;
    ikRating: IkRating;
    enclosureMaterial: EnclosureMaterial;
    hasDoor: boolean;
    description: string;
  };
}

/**
 * Extracts numeric digits from an IP code like 'IP65' or 'IP40'
 */
export function parseIpRating(ip: string): { solid: number; liquid: number } {
  const match = ip.match(/IP(\d)(\d)/i);
  if (!match) {
    return { solid: 2, liquid: 0 };
  }
  return {
    solid: parseInt(match[1], 10),
    liquid: parseInt(match[2], 10),
  };
}

/**
 * Normalizes an IK rating string to a valid IkRating
 */
export function normalizeIkRating(ik?: string): IkRating {
  if (!ik) return 'IK07';
  const clean = ik.toUpperCase();
  if (['IK02', 'IK05', 'IK07', 'IK08', 'IK09', 'IK10'].includes(clean)) {
    return clean as IkRating;
  }
  return 'IK07';
}

/**
 * Core Engineering Function: Verifies degree of protection (IP) and mechanical impact resistance (IK)
 * according to EN 60529, EN 62262, RTIEBT Quadro 51A and EN 61439-1/-3.
 */
export function verifyEnclosureIpIk(config: EnclosureConfig): IpIkVerificationResult {
  // Infer environment if not explicitly set
  let envId: InstallationEnvironment = config.installationEnvironment || 'residential_indoor_dry';
  if (!config.installationEnvironment) {
    if (config.applicationType === 'residential') {
      envId = 'residential_indoor_dry';
    } else if (config.applicationType === 'automation') {
      envId = 'industrial_clean_control';
    } else if (config.applicationType === 'commercial') {
      envId = 'commercial_office';
    }
  }

  const env = ENVIRONMENT_SPECS[envId] || ENVIRONMENT_SPECS.residential_indoor_dry;
  const actualIpStr = config.ipRating || (config.applicationType === 'residential' ? 'IP40' : 'IP65');
  const actualIk = normalizeIkRating(config.ikRating || (config.applicationType === 'residential' ? 'IK07' : 'IK08'));
  const hasDoor = config.hasDoor !== false; // Default true if undefined
  const material = config.enclosureMaterial || (config.applicationType === 'residential' ? 'thermoplastic' : 'sheet_steel');

  const parsedActual = parseIpRating(actualIpStr);
  
  // Door effect: For indoor residential panels, RTIEBT 801 requires IP40 with closed door.
  // If no door is installed, the effective protection against solid foreign objects drops to IP30 or IP20.
  let effectiveSolid = parsedActual.solid;
  let effectiveLiquid = parsedActual.liquid;
  let doorEffectApplied = false;

  if (!hasDoor && parsedActual.solid >= 4 && env.requiresDoor) {
    effectiveSolid = Math.min(3, parsedActual.solid);
    doorEffectApplied = true;
  }

  const effectiveIpStr = `IP${effectiveSolid}${effectiveLiquid}`;

  // Evaluate Pass/Fail
  const solidPass = effectiveSolid >= env.minIpSolid;
  const liquidPass = effectiveLiquid >= env.minIpLiquid;
  const actualJoules = IK_ENERGY_JOULES[actualIk]?.joules || 2.0;
  const requiredJoules = env.minJoules;
  const ikPass = actualJoules >= requiredJoules;
  const doorPass = !env.requiresDoor || hasDoor;

  // Material evaluation: e.g. thermoplastic in heavy industrial washdown or severe outdoor can degrade under UV/chemicals
  let materialCompatible = true;
  if (env.category === 'industrial' && envId === 'industrial_heavy_washdown' && material !== 'stainless_steel') {
    materialCompatible = false;
  } else if (env.category === 'outdoor' && material === 'thermoplastic' && envId !== 'residential_outdoor_sheltered') {
    materialCompatible = false;
  }

  const findings: IpIkFinding[] = [];

  // Check 1: Solid protection
  if (!solidPass) {
    findings.push({
      type: 'error',
      title: `Grau IP contra Sólidos Insuficiente (Dígito ${effectiveSolid} < ${env.minIpSolid})`,
      message: `O ambiente "${env.label}" exige proteção contra corpos sólidos e poeiras de no mínimo IP${env.minIpSolid}X, mas o quadro oferece apenas IP${effectiveSolid}X. Risco de acumulação de poeira e curto-circuito.`,
      normativeStandard: `${env.normativeReference} / EN 60529`,
      suggestedAction: `Substitua o invólucro por um modelo com classificação mínima IP${env.minIpRating}.`,
    });
  } else {
    findings.push({
      type: 'ok',
      title: `Proteção contra Corpos Sólidos e Poeiras Conforme (IP${effectiveSolid}X)`,
      message: `O armário cumpre o requisito mínimo normativo de IP${env.minIpSolid}X (${IP_SOLID_DESCRIPTIONS[effectiveSolid]?.detail || ''}).`,
      normativeStandard: 'EN 60529',
    });
  }

  // Check 2: Liquid / Water protection
  if (!liquidPass) {
    findings.push({
      type: 'error',
      title: `Grau IP contra Líquidos Insuficiente (Dígito ${effectiveLiquid} < ${env.minIpLiquid})`,
      message: `O ambiente "${env.label}" está classificado com a influência de água ${env.rtiebtInfluences.adWater}, exigindo estanqueidade mínima IPX${env.minIpLiquid}, mas o invólucro atual é apenas IPX${effectiveLiquid}. Risco crítico de condensação, infiltração e choque elétrico.`,
      normativeStandard: `RTIEBT Quadro 51A (${env.rtiebtInfluences.adWater}) & EN 60529`,
      suggestedAction: `Configurar invólucro com vedante perimetral (junta em poliuretano) classe IP${env.minIpRating} ou superior.`,
    });
  } else {
    findings.push({
      type: 'ok',
      title: `Proteção contra Líquidos e Humidade Conforme (IPX${effectiveLiquid})`,
      message: `Atende plenamente à influência externa ${env.rtiebtInfluences.adWater} (${IP_LIQUID_DESCRIPTIONS[effectiveLiquid]?.detail || ''}).`,
      normativeStandard: 'EN 60529',
    });
  }

  // Check 3: Mechanical Impact (IK)
  if (!ikPass) {
    findings.push({
      type: 'error',
      title: `Resistência Mecânica a Impactos Insuficiente (${actualIk} = ${actualJoules}J < ${env.minIkRating} = ${requiredJoules}J)`,
      message: `A severidade mecânica do local (${env.rtiebtInfluences.agImpact}) exige invólucro com resistência mínima ${env.minIkRating} (${requiredJoules} Joules de impacto), enquanto o armário configurado é ${actualIk} (${actualJoules} Joules).`,
      normativeStandard: 'EN 62262 (Graus de Proteção IK) & EN 61439-1',
      suggestedAction: `Optar por armário com índice ${env.minIkRating} (chapa de aço soldada ou poliéster reforçado com fibra).`,
    });
  } else {
    findings.push({
      type: 'ok',
      title: `Resistência Mecânica a Impactos Conforme (${actualIk} · ${actualJoules} Joules)`,
      message: `Capacidade de absorção de impacto adequada para ${env.rtiebtInfluences.agImpact}. Suporta ${IK_ENERGY_JOULES[actualIk]?.testDescription}.`,
      normativeStandard: 'EN 62262',
    });
  }

  // Check 4: Door presence & effect
  if (doorEffectApplied) {
    findings.push({
      type: 'warning',
      title: 'Ausência de Porta Frontal reduz Grau IP Efetivo',
      message: 'O invólucro está marcado sem porta frontal. Segundo as normas RTIEBT 801 e EN 61439-3, invólucros residenciais sem porta são desclassificados de IP40 para IP30, permitindo a entrada de fios finos e poeiras.',
      normativeStandard: 'RTIEBT 801.2.1.2 & EN 61439-3',
      suggestedAction: 'Instale a porta frontal com fecho de engate para repor a estanqueidade IP40.',
    });
  }

  // Check 5: Material suitability
  if (!materialCompatible) {
    findings.push({
      type: 'warning',
      title: `Material do Invólucro Desaconselhado para o Ambiente (${material})`,
      message: `Para o ambiente "${env.label}", o material recomendado pelas normas de durabilidade e higiene é "${env.recommendedMaterial}" (resistência química / UV / corrosão).`,
      normativeStandard: 'EN 61439-1 Secção 10.2 & ISO 14159',
      suggestedAction: `Recomenda-se utilizar material ${env.recommendedMaterial.toUpperCase()}.`,
    });
  }

  // Overall status
  let status: 'compliant' | 'warning' | 'non_compliant' = 'compliant';
  if (!solidPass || !liquidPass || !ikPass) {
    status = 'non_compliant';
  } else if (!doorPass || !materialCompatible || doorEffectApplied) {
    status = 'warning';
  }

  const isCompliant = status === 'compliant';

  // Recommended fix if needed
  let recommendedCorrection;
  if (!isCompliant) {
    recommendedCorrection = {
      ipRating: env.minIpRating as any,
      ikRating: env.minIkRating,
      enclosureMaterial: env.recommendedMaterial,
      hasDoor: true,
      description: `Atualizar armário para ${env.minIpRating} com ${env.minIkRating} em ${env.recommendedMaterial} e porta frontal.`,
    };
  }

  return {
    isCompliant,
    status,
    environment: env,
    actualIp: actualIpStr,
    effectiveIp: effectiveIpStr,
    requiredIp: env.minIpRating,
    actualIk,
    requiredIk: env.minIkRating,
    actualJoules,
    requiredJoules,
    solidPass,
    liquidPass,
    ikPass,
    doorPass,
    materialCompatible,
    findings,
    recommendedCorrection,
  };
}
