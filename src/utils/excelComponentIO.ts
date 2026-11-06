import * as XLSX from 'xlsx';
import { CatalogItem, ComponentCategory } from '../types/electrical';
import { getCustomComponents } from './customComponentStorage';
import { COMPONENT_CATALOG } from '../data/componentLibrary';

export interface CategoryInfo {
  code: ComponentCategory;
  name: string;
  defaultPrefix: string;
  defaultHeightMm: number;
  defaultColor: string;
  example: string;
}

export const CATEGORY_DEFINITIONS: Record<ComponentCategory, CategoryInfo> = {
  power_supply: {
    code: 'power_supply',
    name: 'Fontes de Alimentação DIN (24V)',
    defaultPrefix: 'G',
    defaultHeightMm: 125,
    defaultColor: '#0284c7',
    example: 'Mean Well NDR-120-24, 24VDC 5A',
  },
  plc_cpu: {
    code: 'plc_cpu',
    name: 'PLCs & CPUs de Automação',
    defaultPrefix: 'A',
    defaultHeightMm: 100,
    defaultColor: '#0f766e',
    example: 'Siemens S7-1200 CPU 1214C DC/DC/DC',
  },
  plc_expansion: {
    code: 'plc_expansion',
    name: 'Módulos de Expansão I/O PLC',
    defaultPrefix: 'A',
    defaultHeightMm: 100,
    defaultColor: '#0d9488',
    example: 'Siemens SM 1221 16 DI 24VDC',
  },
  protection_ac: {
    code: 'protection_ac',
    name: 'Disjuntores & Proteções AC',
    defaultPrefix: 'Q',
    defaultHeightMm: 85,
    defaultColor: '#334155',
    example: 'Disjuntor 1P+N 16A Curva C',
  },
  protection_dc: {
    code: 'protection_dc',
    name: 'Disjuntores DC & Fusíveis 24V',
    defaultPrefix: 'F',
    defaultHeightMm: 85,
    defaultColor: '#475569',
    example: 'Disjuntor DC 2P 10A 24V',
  },
  relays: {
    code: 'relays',
    name: 'Relés de Comando & Interface',
    defaultPrefix: 'K',
    defaultHeightMm: 90,
    defaultColor: '#0369a1',
    example: 'Relé de Interface Slim 24VDC 1 Inv (6.2mm)',
  },
  motor_control: {
    code: 'motor_control',
    name: 'Contactores & Disjuntores-Motor',
    defaultPrefix: 'KM',
    defaultHeightMm: 90,
    defaultColor: '#1e293b',
    example: 'Contactor Tripolar 9A Bobina 24VDC',
  },
  safety_relays: {
    code: 'safety_relays',
    name: 'Relés de Segurança (P. Emergência)',
    defaultPrefix: 'KS',
    defaultHeightMm: 100,
    defaultColor: '#dc2626',
    example: 'Relé de Segurança Paragem de Emergência Cat 4',
  },
  terminals: {
    code: 'terminals',
    name: 'Bornes de Ligação (Viking 3)',
    defaultPrefix: 'X',
    defaultHeightMm: 50,
    defaultColor: '#475569',
    example: 'Borne de Passagem Viking 3 Cinzento 2.5mm²',
  },
  accessories: {
    code: 'accessories',
    name: 'Acessórios & Tomadas DIN',
    defaultPrefix: 'XS',
    defaultHeightMm: 75,
    defaultColor: '#4b5563',
    example: 'Tomada Schuko DIN 230V 16A',
  },
  residential_modular: {
    code: 'residential_modular',
    name: 'Aparelhagem Residencial Modular',
    defaultPrefix: 'Q',
    defaultHeightMm: 85,
    defaultColor: '#059669',
    example: 'Campainha DIN 230V, Telerruptor 16A, Minuteria Escada, Pente 1P+N',
  },
};

/**
 * Format a CatalogItem into a clean Excel row object
 */
export function componentToExcelRow(item: CatalogItem, isCustom = false) {
  const catInfo = CATEGORY_DEFINITIONS[item.category] || {
    name: item.category,
    defaultPrefix: item.tagPrefix || 'Q',
  };

  return {
    'ID_Catalogo': item.catalogId,
    'Nome_Componente': item.name,
    'Fabricante': item.brand || 'Genérico',
    'Serie_Familia': item.series || '',
    'Referencia_PartNumber': item.partNumber || item.name,
    'Prefixo_Tag': item.tagPrefix || catInfo.defaultPrefix || 'Q',
    'Codigo_Categoria': item.category,
    'Nome_Categoria': catInfo.name,
    'Descricao': item.description || '',
    'Largura_mm': Number(item.widthMm) || 18,
    'Altura_mm': Number(item.heightMm) || 90,
    'Profundidade_mm': Number(item.depthMm) || 70,
    'Modulos_DIN_18mm': item.dinModules || Math.round(((Number(item.widthMm) || 18) / 18) * 10) / 10,
    'Tensao_Entrada': item.inputVoltage || '',
    'Tensao_Saida': item.outputVoltage || '',
    'Corrente_Nominal_A': item.ratedCurrentA ?? '',
    'Potencia_Nominal_W': item.ratedPowerW ?? '',
    'Consumo_DC_24V_A': item.dcConsumptionA ?? '',
    'Consumo_DC_24V_W': item.dcConsumptionW ?? '',
    'Terminais_Bornes': item.terminalsSummary || '',
    'Preco_Estimado_EUR': item.estimatedPriceEur ?? 0,
    'Cor_HEX': item.color || '#334155',
    'Tipo': isCustom ? 'Personalizado' : 'Fábrica',
  };
}

/**
 * Export components list to Excel (.xlsx)
 */
export function exportComponentsToExcel(
  itemsToExport?: CatalogItem[],
  filename = 'ElectroCad_Biblioteca_Componentes.xlsx'
) {
  const customItems = getCustomComponents();
  const customIdSet = new Set(customItems.map((c) => c.catalogId));

  // If no items passed, export all (custom + factory)
  const items = itemsToExport && itemsToExport.length > 0 
    ? itemsToExport 
    : [...customItems, ...COMPONENT_CATALOG.filter((f) => !customIdSet.has(f.catalogId))];

  // Map rows
  const rows = items.map((item) => {
    const isCustom = customIdSet.has(item.catalogId);
    return componentToExcelRow(item, isCustom);
  });

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Componentes
  const wsComponents = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = [
    { wch: 22 }, // ID_Catalogo
    { wch: 32 }, // Nome_Componente
    { wch: 18 }, // Fabricante
    { wch: 24 }, // Serie_Familia
    { wch: 22 }, // Referencia_PartNumber
    { wch: 12 }, // Prefixo_Tag
    { wch: 18 }, // Codigo_Categoria
    { wch: 28 }, // Nome_Categoria
    { wch: 45 }, // Descricao
    { wch: 12 }, // Largura_mm
    { wch: 12 }, // Altura_mm
    { wch: 15 }, // Profundidade_mm
    { wch: 16 }, // Modulos_DIN_18mm
    { wch: 16 }, // Tensao_Entrada
    { wch: 14 }, // Tensao_Saida
    { wch: 18 }, // Corrente_Nominal_A
    { wch: 18 }, // Potencia_Nominal_W
    { wch: 18 }, // Consumo_DC_24V_A
    { wch: 18 }, // Consumo_DC_24V_W
    { wch: 35 }, // Terminais_Bornes
    { wch: 18 }, // Preco_Estimado_EUR
    { wch: 12 }, // Cor_HEX
    { wch: 15 }, // Tipo
  ];
  wsComponents['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsComponents, 'Componentes');

  // Sheet 2: Guia e Códigos de Categorias
  const guideRows = Object.values(CATEGORY_DEFINITIONS).map((def) => ({
    'Codigo_Categoria (Use este valor)': def.code,
    'Nome_Legivel': def.name,
    'Prefixo_Tag_Sugerido': def.defaultPrefix,
    'Altura_Padrao_mm': def.defaultHeightMm,
    'Cor_Sugerida': def.defaultColor,
    'Exemplo_Pratico': def.example,
  }));

  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [
    { wch: 32 },
    { wch: 32 },
    { wch: 22 },
    { wch: 18 },
    { wch: 15 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Guia_e_Categorias');

  // Trigger download
  XLSX.writeFile(wb, filename);
}

/**
 * Export a blank template with 2 sample rows for the user to edit and fill in
 */
export function exportBlankExcelTemplate(filename = 'Modelo_Componentes_ElectroCad.xlsx') {
  const sampleItems: CatalogItem[] = [
    {
      catalogId: 'exemplo-disjuntor-16a',
      name: 'Disjuntor Bipolar C16A 6kA',
      brand: 'Schneider Electric',
      series: 'Acti9 iC60N',
      tagPrefix: 'Q',
      partNumber: 'A9F74216',
      category: 'protection_ac',
      description: 'Disjuntor modular 2P 16A curva C para proteção de circuitos AC.',
      widthMm: 36,
      heightMm: 85,
      depthMm: 78.5,
      dinModules: 2.0,
      inputVoltage: '230/400V AC',
      ratedCurrentA: 16,
      terminalsSummary: '1, 3 (Entrada) / 2, 4 (Saída)',
      estimatedPriceEur: 18.50,
      color: '#334155',
    },
    {
      catalogId: 'exemplo-fonte-24v-10a',
      name: 'Fonte de Alimentação 24VDC 10A Slim',
      brand: 'Phoenix Contact',
      series: 'TRIO POWER',
      tagPrefix: 'G',
      partNumber: 'TRIO-PS-2G/1AC/24DC/10',
      category: 'power_supply',
      description: 'Fonte chaveada para calha DIN 240W, saída 24VDC 10A com sinal DC OK.',
      widthMm: 42,
      heightMm: 130,
      depthMm: 115,
      dinModules: 2.3,
      inputVoltage: '100-240V AC',
      outputVoltage: '24V DC',
      ratedCurrentA: 10,
      ratedPowerW: 240,
      terminalsSummary: 'AC: L, N, PE | DC: +, +, -, -, DC OK',
      estimatedPriceEur: 85.00,
      color: '#0284c7',
    },
    {
      catalogId: 'exemplo-borne-relogio-pe',
      name: 'Borne de Terra PE 4mm² Verde/Amarelo',
      brand: 'Weidmüller',
      series: 'WDU 4 PE',
      tagPrefix: 'X',
      partNumber: '1020100000',
      category: 'terminals',
      description: 'Borne de passagem de condutor de proteção para calha DIN TS35.',
      widthMm: 6.1,
      heightMm: 60,
      depthMm: 47,
      dinModules: 0.34,
      terminalsSummary: '1 (Cima) / 2 (Baixo) ligado à Calha PE',
      estimatedPriceEur: 2.80,
      color: '#15803d',
    },
  ];

  exportComponentsToExcel(sampleItems, filename);
}

/**
 * Normalizes text to match column headers flexibly (removes accents, spaces, special chars)
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Validates and sanitizes a category string to a valid ComponentCategory
 */
function sanitizeCategory(rawCat: any): ComponentCategory {
  if (!rawCat) return 'protection_ac';
  const str = String(rawCat).toLowerCase().trim();

  // Direct match
  if (str in CATEGORY_DEFINITIONS) {
    return str as ComponentCategory;
  }

  // Friendly name matches
  if (str.includes('fonte') || str.includes('power') || str.includes('psu') || str.includes('alimentac')) {
    return 'power_supply';
  }
  if (str.includes('cpu') || (str.includes('plc') && !str.includes('expans')) || str.includes('automato')) {
    return 'plc_cpu';
  }
  if (str.includes('expans') || str.includes('modulo') || str.includes('io') || str.includes('sm')) {
    return 'plc_expansion';
  }
  if (str.includes('dc') || str.includes('fusivel') || str.includes('fuse')) {
    return 'protection_dc';
  }
  if (str.includes('disjuntor') || str.includes('diferencial') || str.includes('protecao') || str.includes('mcb') || str.includes('rccb')) {
    return 'protection_ac';
  }
  if (str.includes('seguranca') || str.includes('emergencia') || str.includes('safety')) {
    return 'safety_relays';
  }
  if (str.includes('rele') || str.includes('relay') || str.includes('temporizador') || str.includes('timer')) {
    return 'relays';
  }
  if (str.includes('motor') || str.includes('contactor') || str.includes('disjuntor-motor')) {
    return 'motor_control';
  }
  if (str.includes('borne') || str.includes('terminal') || str.includes('regua') || str.includes('viking')) {
    return 'terminals';
  }
  if (str.includes('tomada') || str.includes('acessorio') || str.includes('switch') || str.includes('calha')) {
    return 'accessories';
  }

  return 'protection_ac';
}

export interface ParseResult {
  items: CatalogItem[];
  errors: string[];
  warnings: string[];
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file into validated CatalogItems
 */
export async function parseExcelComponentFile(file: File): Promise<ParseResult> {
  const result: ParseResult = {
    items: [],
    errors: [],
    warnings: [],
  };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      result.errors.push('O ficheiro Excel não contém nenhuma folha de cálculo.');
      return result;
    }

    // Try finding sheet named 'Componentes', otherwise use first sheet
    let sheetName = workbook.SheetNames[0];
    const compSheet = workbook.SheetNames.find(
      (s) => s.toLowerCase().includes('component') || s.toLowerCase().includes('biblioteca')
    );
    if (compSheet) {
      sheetName = compSheet;
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      result.errors.push(`A folha "${sheetName}" está vazia ou não tem linhas com dados.`);
      return result;
    }

    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // +1 for 0-index, +1 for header row

      // Build key-normalized map for flexible column mapping
      const normMap: Record<string, any> = {};
      Object.keys(row).forEach((k) => {
        normMap[normalizeKey(k)] = row[k];
      });

      // Extract Name (Required)
      const name = normMap['nomecomponente'] || normMap['nome'] || normMap['name'] || normMap['designacao'] || '';
      if (!name || String(name).trim().length === 0) {
        result.warnings.push(`Linha ${rowNum}: Ignorada porque não tem "Nome do Componente".`);
        return;
      }

      // Extract Width in mm (Required > 0)
      const rawWidth = normMap['larguramm'] || normMap['largura'] || normMap['widthmm'] || normMap['width'] || normMap['espessuramm'];
      let widthMm = Number(rawWidth);
      if (isNaN(widthMm) || widthMm <= 0) {
        widthMm = 18;
        result.warnings.push(`Linha ${rowNum} (${name}): Largura inválida ou em branco. Foi atribuído o valor padrão de 18mm.`);
      }

      // Height
      const rawHeight = normMap['alturamm'] || normMap['altura'] || normMap['heightmm'] || normMap['height'];
      let heightMm = Number(rawHeight);
      if (isNaN(heightMm) || heightMm <= 0) {
        heightMm = 90;
      }

      // Depth
      const rawDepth = normMap['profundidademm'] || normMap['profundidade'] || normMap['depthmm'] || normMap['depth'];
      let depthMm = Number(rawDepth);
      if (isNaN(depthMm) || depthMm <= 0) {
        depthMm = 70;
      }

      // Category
      const rawCategory = normMap['codigocategoria'] || normMap['categoria'] || normMap['category'] || normMap['nomecategoria'];
      const category = sanitizeCategory(rawCategory);
      const catDef = CATEGORY_DEFINITIONS[category];

      // Brand
      const brand = String(normMap['fabricante'] || normMap['marca'] || normMap['brand'] || 'Genérico').trim();

      // Series
      const series = String(normMap['seriefamilia'] || normMap['serie'] || normMap['familia'] || '').trim();

      // Part Number
      const partNumber = String(normMap['referenciapartnumber'] || normMap['referencia'] || normMap['partnumber'] || normMap['codigo'] || name).trim();

      // Tag Prefix
      let tagPrefix = String(normMap['prefixotag'] || normMap['prefixo'] || normMap['tagprefix'] || '').trim().toUpperCase();
      if (!tagPrefix) {
        tagPrefix = catDef.defaultPrefix || 'Q';
      }

      // ID
      let catalogId = String(normMap['idcatalogo'] || normMap['id'] || normMap['catalogid'] || '').trim();
      if (!catalogId) {
        // Create clean slug
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        catalogId = `imp-${slug}-${Date.now().toString(36).substring(4)}-${index}`;
      }

      // Modules
      const rawModules = normMap['modulosdin18mm'] || normMap['modulos'] || normMap['modulosdin'] || normMap['dinmodules'];
      let dinModules = Number(rawModules);
      if (isNaN(dinModules) || dinModules <= 0) {
        dinModules = Math.round((widthMm / 18) * 10) / 10;
      }

      // Electrical ratings
      const inputVoltage = String(normMap['tensaoentrada'] || normMap['tensaodeentrada'] || normMap['inputvoltage'] || '').trim() || undefined;
      const outputVoltage = String(normMap['tensaosaida'] || normMap['tensaodesaida'] || normMap['outputvoltage'] || '').trim() || undefined;

      const rawCurrent = normMap['correntenominala'] || normMap['corrente'] || normMap['ratedcurrenta'] || normMap['amperes'];
      const ratedCurrentA = rawCurrent !== '' && !isNaN(Number(rawCurrent)) ? Number(rawCurrent) : undefined;

      const rawPower = normMap['potencianominalw'] || normMap['potencia'] || normMap['ratedpowerw'] || normMap['watts'];
      const ratedPowerW = rawPower !== '' && !isNaN(Number(rawPower)) ? Number(rawPower) : undefined;

      const rawDcConsA = normMap['consumodc24va'] || normMap['consumodca'] || normMap['dcconsumptiona'];
      const dcConsumptionA = rawDcConsA !== '' && !isNaN(Number(rawDcConsA)) ? Number(rawDcConsA) : undefined;

      const rawDcConsW = normMap['consumodc24vw'] || normMap['consumodcw'] || normMap['dcconsumptionw'];
      const dcConsumptionW = rawDcConsW !== '' && !isNaN(Number(rawDcConsW)) ? Number(rawDcConsW) : undefined;

      // Description & Terminals
      const description = String(normMap['descricao'] || normMap['description'] || `${name} - ${brand}`).trim();
      const terminalsSummary = String(normMap['terminaisbornes'] || normMap['terminais'] || normMap['bornes'] || normMap['terminalssummary'] || '').trim() || undefined;

      // Price
      const rawPrice = normMap['precoestimadoeur'] || normMap['preco'] || normMap['price'] || normMap['precoeur'];
      const estimatedPriceEur = !isNaN(Number(rawPrice)) ? Math.max(0, Number(rawPrice)) : 10.0;

      // Color
      let color = String(normMap['corhex'] || normMap['cor'] || normMap['color'] || '').trim();
      if (!color.startsWith('#') || color.length < 4) {
        color = catDef.defaultColor || '#334155';
      }

      const item: CatalogItem = {
        catalogId,
        name,
        brand,
        series: series || undefined,
        partNumber,
        tagPrefix,
        category,
        description,
        widthMm,
        heightMm,
        depthMm,
        dinModules,
        inputVoltage,
        outputVoltage,
        ratedCurrentA,
        ratedPowerW,
        dcConsumptionA,
        dcConsumptionW,
        terminalsSummary,
        estimatedPriceEur,
        color,
      };

      result.items.push(item);
    });

    if (result.items.length === 0) {
      result.errors.push('Nenhum componente válido foi encontrado para importação no ficheiro.');
    }
  } catch (err: any) {
    console.error('Error parsing Excel component file:', err);
    result.errors.push(`Erro ao ler o ficheiro Excel: ${err?.message || 'Formato não suportado'}`);
  }

  return result;
}
