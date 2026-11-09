import { EnclosureModel, EnclosureMaterial, IkRating } from '../types/electrical';

export const CUSTOM_ENCLOSURES_KEY = 'electrocad_custom_enclosure_models';

/**
 * Catálogo Standard de Armários e Invólucros Elétricos Industriais & Residenciais
 * Abrange os principais fabricantes do mercado europeu (Schneider Electric, Rittal, Hager, Legrand, Gewiss, nVent/Eldon).
 */
export const STANDARD_ENCLOSURE_CATALOG: EnclosureModel[] = [
  // ==========================================
  // SCHNEIDER ELECTRIC (Spacial & Thalassa)
  // ==========================================
  {
    id: 'enc-schneider-crn-400-300-200',
    name: 'Schneider Spacial CRN 400x300x200',
    brand: 'Schneider Electric',
    partNumber: 'NSYS3D4320P',
    series: 'Spacial CRN / S3D',
    widthMm: 400,
    heightMm: 300,
    depthMm: 200,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'sheet_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 2,
    maxDinModules: 36,
    estimatedPriceEur: 89.50,
    description: 'Armário monobloco em chapa de aço RAL 7035 com placa de montagem lisa zincada incluída. Fecho palhetão duplo 3mm.',
  },
  {
    id: 'enc-schneider-s3d-400-600-200',
    name: 'Schneider Spacial S3D 400x600x200',
    brand: 'Schneider Electric',
    partNumber: 'NSYS3D6420P',
    series: 'Spacial S3D',
    widthMm: 400,
    heightMm: 600,
    depthMm: 200,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'sheet_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 2,
    maxDinModules: 48,
    estimatedPriceEur: 118.00,
    description: 'Invólucro industrial estanque com calha de gotejamento frontal e porta reversível 120°. Placa de montagem zincada.',
  },
  {
    id: 'enc-schneider-s3d-500-700-250',
    name: 'Schneider Spacial S3D 500x700x250',
    brand: 'Schneider Electric',
    partNumber: 'NSYS3D7525P',
    series: 'Spacial S3D',
    widthMm: 500,
    heightMm: 700,
    depthMm: 250,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'sheet_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 3,
    maxDinModules: 72,
    estimatedPriceEur: 154.00,
    description: 'Armário de comando industrial médio. Chapa de aço tratada com primário epóxi e pintura poliéster texturada RAL 7035.',
  },
  {
    id: 'enc-schneider-s3d-600-800-250',
    name: 'Schneider Spacial S3D 600x800x250 (Padrão Automação)',
    brand: 'Schneider Electric',
    partNumber: 'NSYS3D8625P',
    series: 'Spacial S3D',
    widthMm: 600,
    heightMm: 800,
    depthMm: 250,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'sheet_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 3,
    maxDinModules: 96,
    estimatedPriceEur: 198.50,
    description: 'O formato padrão industrial de excelência para painéis de comando e autómatos S7-1200 / relés. Alta rigidez mecânica IK10.',
  },
  {
    id: 'enc-schneider-s3d-800-1000-300',
    name: 'Schneider Spacial S3D 800x1000x300',
    brand: 'Schneider Electric',
    partNumber: 'NSYS3D10830P',
    series: 'Spacial S3D',
    widthMm: 800,
    heightMm: 1000,
    depthMm: 300,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'sheet_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 4,
    maxDinModules: 144,
    estimatedPriceEur: 295.00,
    description: 'Armário amplo para centros de controlo de motores (MCC) e quadros de bombagem com variadores de velocidade.',
  },
  {
    id: 'enc-schneider-s3d-800-1200-300',
    name: 'Schneider Spacial S3D 800x1200x300',
    brand: 'Schneider Electric',
    partNumber: 'NSYS3D12830P',
    series: 'Spacial S3D',
    widthMm: 800,
    heightMm: 1200,
    depthMm: 300,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'sheet_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 5,
    maxDinModules: 180,
    estimatedPriceEur: 375.00,
    description: 'Armário de comando de grande capacidade com fechadura de 3 pontos de engate e varões verticais.',
  },
  {
    id: 'enc-schneider-thalassa-600-800-300',
    name: 'Schneider Thalassa PLA 600x800x300 (Poliéster)',
    brand: 'Schneider Electric',
    partNumber: 'NSYPLA863G',
    series: 'Thalassa PLA',
    widthMm: 600,
    heightMm: 800,
    depthMm: 300,
    ipRating: 'IP65',
    ikRating: 'IK10',
    material: 'polyester',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 3,
    maxDinModules: 96,
    estimatedPriceEur: 335.00,
    description: 'Poliéster reforçado com fibra de vidro prensado a quente. Imune à corrosão salina, raios UV e agentes químicos agressivos.',
  },
  {
    id: 'enc-schneider-s3x-inox-600-800-250',
    name: 'Schneider Spacial S3X Inox 304L 600x800x250',
    brand: 'Schneider Electric',
    partNumber: 'NSYS3X8625',
    series: 'Spacial S3X',
    widthMm: 600,
    heightMm: 800,
    depthMm: 250,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'stainless_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 3,
    maxDinModules: 96,
    estimatedPriceEur: 620.00,
    description: 'Aço inoxidável AISI 304L escovado Scotch-Brite para indústrias alimentar, farmacêutica, tratamento de águas e zonas costeiras.',
  },

  // ==========================================
  // RITTAL (Sistemas AX Compact & KX)
  // ==========================================
  {
    id: 'enc-rittal-ax-600-800-250',
    name: 'Rittal AX 1058.000 600x800x250',
    brand: 'Rittal',
    partNumber: 'AX 1058.000',
    series: 'AX Compact',
    widthMm: 600,
    heightMm: 800,
    depthMm: 250,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'sheet_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 3,
    maxDinModules: 96,
    estimatedPriceEur: 215.00,
    description: 'A nova geração de caixas compactas Rittal AX. Elevada estabilidade, montagem rápida sem ferramentas e calhas de vedação PU contínuas.',
  },
  {
    id: 'enc-rittal-ax-800-1000-300',
    name: 'Rittal AX 1180.000 800x1000x300',
    brand: 'Rittal',
    partNumber: 'AX 1180.000',
    series: 'AX Compact',
    widthMm: 800,
    heightMm: 1000,
    depthMm: 300,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'sheet_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 4,
    maxDinModules: 144,
    estimatedPriceEur: 320.00,
    description: 'Invólucro compacto em chapa de aço com sistema de fecho por varão duplo e placa flange de entrada de cabos integrada na base.',
  },

  // ==========================================
  // HAGER (Residencial Modular & Quadro Plus)
  // ==========================================
  {
    id: 'enc-hager-volta-48m',
    name: 'Hager Volta 4 Filas (48 Módulos DIN)',
    brand: 'Hager',
    partNumber: 'VA48CN',
    series: 'Volta',
    widthMm: 450,
    heightMm: 650,
    depthMm: 150,
    ipRating: 'IP30',
    ikRating: 'IK07',
    material: 'thermoplastic',
    doorType: 'solid',
    mountingPlateIncluded: false,
    recommendedRails: 4,
    maxDinModules: 48,
    estimatedPriceEur: 78.50,
    description: 'Quadro de distribuição saliente para habitações T2/T3 segundo RTIEBT. Porta metálica branca com puxador rebaixado e bornes QuickConnect.',
  },
  {
    id: 'enc-hager-vector-36m-ip65',
    name: 'Hager Vector 3 Filas IP65 (36 Módulos DIN)',
    brand: 'Hager',
    partNumber: 'VE312L',
    series: 'Vector',
    widthMm: 400,
    heightMm: 550,
    depthMm: 160,
    ipRating: 'IP65',
    ikRating: 'IK08',
    material: 'thermoplastic',
    doorType: 'transparent',
    mountingPlateIncluded: false,
    recommendedRails: 3,
    maxDinModules: 36,
    estimatedPriceEur: 96.00,
    description: 'Quadro estanque em policarbonato com porta transparente fumada. Ideal para postos de carregamento de veículos elétricos (VE), garagens e exterior.',
  },
  {
    id: 'enc-hager-quadro-plus-600-800',
    name: 'Hager Quadro Plus 600x800x250',
    brand: 'Hager',
    partNumber: 'FP43TN',
    series: 'Quadro Plus',
    widthMm: 600,
    heightMm: 800,
    depthMm: 250,
    ipRating: 'IP55',
    ikRating: 'IK09',
    material: 'sheet_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 4,
    maxDinModules: 96,
    estimatedPriceEur: 245.00,
    description: 'Armário técnico modular para distribuição de energia terciária e quadros gerais de baixa tensão até 250A.',
  },

  // ==========================================
  // LEGRAND (Atlantic & Marina & Plexo³)
  // ==========================================
  {
    id: 'enc-legrand-atlantic-600-800-250',
    name: 'Legrand Atlantic 600x800x250 Metálico',
    brand: 'Legrand',
    partNumber: '035528',
    series: 'Atlantic',
    widthMm: 600,
    heightMm: 800,
    depthMm: 250,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'sheet_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 3,
    maxDinModules: 96,
    estimatedPriceEur: 195.00,
    description: 'Armário industrial em chapa de aço RAL 7035 com junta contínua de poliuretano e placa de montagem zincada incluída.',
  },
  {
    id: 'enc-legrand-plexo-54m',
    name: 'Legrand Plexo³ 3 Filas IP65 (54 Módulos)',
    brand: 'Legrand',
    partNumber: '001923',
    series: 'Plexo³',
    widthMm: 450,
    heightMm: 600,
    depthMm: 160,
    ipRating: 'IP65',
    ikRating: 'IK09',
    material: 'thermoplastic',
    doorType: 'transparent',
    mountingPlateIncluded: false,
    recommendedRails: 3,
    maxDinModules: 54,
    estimatedPriceEur: 92.00,
    description: 'Armário estanque monobloco com chassis DIN extraível e reversível para montagem rápida em zonas industriais húmidas ou lavagem.',
  },
  {
    id: 'enc-legrand-marina-600-800-300',
    name: 'Legrand Marina Poliéster 600x800x300',
    brand: 'Legrand',
    partNumber: '036256',
    series: 'Marina',
    widthMm: 600,
    heightMm: 800,
    depthMm: 300,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'polyester',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 3,
    maxDinModules: 96,
    estimatedPriceEur: 310.00,
    description: 'Invólucro em poliéster reforçado com fibra de vidro autoextinguível 960°C segundo IEC 60695-2-11. Resistência química máxima.',
  },

  // ==========================================
  // GEWISS & nVent HOFFMAN / ELDON
  // ==========================================
  {
    id: 'enc-gewiss-40cdk-72m',
    name: 'Gewiss 40CDK Estanque IP65 4 Filas (72 Módulos)',
    brand: 'Gewiss',
    partNumber: 'GW40108',
    series: '40CDK',
    widthMm: 450,
    heightMm: 800,
    depthMm: 160,
    ipRating: 'IP65',
    ikRating: 'IK09',
    material: 'thermoplastic',
    doorType: 'transparent',
    mountingPlateIncluded: false,
    recommendedRails: 4,
    maxDinModules: 72,
    estimatedPriceEur: 115.00,
    description: 'Quadro estanque termoplástico livre de halogéneos com porta fumada com fecho ergonómico e barramentos de neutro/terra incluídos.',
  },
  {
    id: 'enc-nvent-mas-600-800-260',
    name: 'nVent HOFFMAN / Eldon MAS 600x800x260',
    brand: 'Eldon / nVent',
    partNumber: 'MAS0806026R5',
    series: 'MAS Compact',
    widthMm: 600,
    heightMm: 800,
    depthMm: 260,
    ipRating: 'IP66',
    ikRating: 'IK10',
    material: 'sheet_steel',
    doorType: 'solid',
    mountingPlateIncluded: true,
    recommendedRails: 3,
    maxDinModules: 96,
    estimatedPriceEur: 188.00,
    description: 'Armário de montagem saliente com sistema de gotejamento perimetral e pintura a pó texturada eletrostática RAL 7035.',
  },
];

/**
 * Calcula um preço estimado realista para um quadro baseado nas suas dimensões e material
 */
export function getDefaultEnclosurePrice(
  widthMm: number,
  heightMm: number,
  depthMm: number,
  material: EnclosureMaterial = 'sheet_steel'
): number {
  // Volume aproximado em decímetros cúbicos (litros)
  const volumeLiters = (widthMm * heightMm * depthMm) / 1_000_000;
  
  // Base de custo por volume
  let basePrice = 50 + volumeLiters * 1.15;

  // Ajuste por tipo de material
  if (material === 'stainless_steel') {
    basePrice *= 2.9;
  } else if (material === 'polyester') {
    basePrice *= 1.6;
  } else if (material === 'thermoplastic') {
    basePrice *= 0.85;
  } else if (material === 'aluminium') {
    basePrice *= 2.2;
  }

  return Math.round(basePrice * 10) / 10;
}

/**
 * Procura o modelo standard mais aproximado das dimensões configuradas
 */
export function findMatchingEnclosure(
  widthMm: number,
  heightMm: number,
  depthMm: number,
  brand?: string
): EnclosureModel {
  const all = getAllEnclosures();
  
  // Se existir correspondência exata
  const exact = all.find(
    (e) =>
      e.widthMm === widthMm &&
      e.heightMm === heightMm &&
      Math.abs(e.depthMm - depthMm) <= 50 &&
      (!brand || e.brand.toLowerCase().includes(brand.toLowerCase()))
  );
  if (exact) return exact;

  // Encontrar o mais próximo por distância dimensional euclidiana
  let closest = all[0];
  let minDiff = Infinity;

  all.forEach((e) => {
    const diff =
      Math.abs(e.widthMm - widthMm) * 1.2 +
      Math.abs(e.heightMm - heightMm) * 1.2 +
      Math.abs(e.depthMm - depthMm);

    if (diff < minDiff) {
      minDiff = diff;
      closest = e;
    }
  });

  return closest;
}

/**
 * Obtém todos os modelos de quadros guardados pelo utilizador no LocalStorage
 */
export function getCustomEnclosures(): EnclosureModel[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ENCLOSURES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Falha ao ler modelos de armários personalizados:', e);
    return [];
  }
}

/**
 * Guarda ou atualiza um modelo de armário na biblioteca do utilizador
 */
export function saveCustomEnclosure(model: EnclosureModel): void {
  try {
    const existing = getCustomEnclosures();
    const idx = existing.findIndex((e) => e.id === model.id);
    const updatedModel: EnclosureModel = {
      ...model,
      isCustom: true,
    };

    let updatedList: EnclosureModel[];
    if (idx >= 0) {
      updatedList = existing.map((e) => (e.id === model.id ? updatedModel : e));
    } else {
      updatedList = [updatedModel, ...existing];
    }

    localStorage.setItem(CUSTOM_ENCLOSURES_KEY, JSON.stringify(updatedList));
  } catch (e) {
    console.error('Falha ao guardar modelo de armário personalizado:', e);
  }
}

/**
 * Elimina um modelo de armário personalizado da biblioteca
 */
export function deleteCustomEnclosure(id: string): void {
  try {
    const existing = getCustomEnclosures();
    const filtered = existing.filter((e) => e.id !== id);
    localStorage.setItem(CUSTOM_ENCLOSURES_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Falha ao eliminar modelo de armário:', e);
  }
}

/**
 * Retorna todos os modelos de quadros (standard + personalizados do utilizador)
 */
export function getAllEnclosures(): EnclosureModel[] {
  const custom = getCustomEnclosures();
  return [...custom, ...STANDARD_ENCLOSURE_CATALOG];
}
