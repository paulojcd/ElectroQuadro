import jsPDF from 'jspdf';
import { ProjectState, PlacedComponent } from '../types/electrical';

export type LabelPresetId =
  | 'strip_din_a4'             // Tiras Modulares de Calha DIN (Folha A4, altura 15mm, passo 18mm/módulo)
  | 'strip_din_12mm_a4'        // Tiras Modulares de Calha DIN (Folha A4, altura 12mm, passo 18mm/módulo)
  | 'strip_din_18mm_a4'        // Tiras Modulares de Calha DIN (Folha A4, altura 18mm, passo 18mm/módulo)
  | 'strip_thermal_continuous' // Rolo Térmico Contínuo (1 tira contínua por calha)
  | 'brother_tape_18mm'        // Fita Brother P-Touch / TZe 18mm
  | 'brother_tape_24mm'        // Fita Brother P-Touch / TZe 24mm
  | 'thermal_roll_50x25'       // Etiquetas Individuais de Rolo 50 x 25 mm (Zebra / TSC)
  | 'thermal_roll_60x30'       // Etiquetas Individuais de Rolo 60 x 30 mm (Zebra / Dymo)
  | 'thermal_roll_38x19'       // Etiquetas Individuais de Rolo 38 x 19 mm (Disjuntor Compacto)
  | 'dymo_99010'               // Dymo 99010 (89 x 28 mm)
  | 'avery_a4_40'              // Folha A4 - 40 Etiquetas Autoadesivas (48.5 x 25.4 mm)
  | 'avery_a4_24';             // Folha A4 - 24 Etiquetas Autoadesivas (70 x 37 mm)

export interface LabelPresetConfig {
  id: LabelPresetId;
  name: string;
  category: 'din_strip' | 'thermal_roll' | 'thermal_tape' | 'a4_sheet';
  description: string;
  targetDevice: string;
  widthMm: number; // For single labels or default segment width
  heightMm: number;
  isContinuousStrip?: boolean;
  stepPerModuleMm?: number; // 18mm per DIN module
}

export const LABEL_PRESETS: Record<LabelPresetId, LabelPresetConfig> = {
  strip_din_a4: {
    id: 'strip_din_a4',
    name: 'Tira de Calha DIN 15mm (Porta-Etiquetas Quadro - A4)',
    category: 'din_strip',
    description: 'Tiras horizontais completas alinhadas com os módulos DIN (passo 18mm) prontas para recortar e introduzir na régua plástica porta-etiquetas sob os disjuntores.',
    targetDevice: 'Folha A4 (Impressora Comum Laser / Jato de Tinta) com guias de corte',
    widthMm: 18,
    heightMm: 15,
    isContinuousStrip: true,
    stepPerModuleMm: 18,
  },
  strip_din_12mm_a4: {
    id: 'strip_din_12mm_a4',
    name: 'Tira de Calha DIN 12mm (Porta-Etiquetas Estreito - A4)',
    category: 'din_strip',
    description: 'Formato estreito de 12mm de altura para réguas porta-etiquetas compactas (ex: Hager, Gewiss, Legrand Nedbox).',
    targetDevice: 'Folha A4 com guias de corte verticais e horizontais',
    widthMm: 18,
    heightMm: 12,
    isContinuousStrip: true,
    stepPerModuleMm: 18,
  },
  strip_din_18mm_a4: {
    id: 'strip_din_18mm_a4',
    name: 'Tira de Calha DIN 18mm (Porta-Etiquetas Largo - A4)',
    category: 'din_strip',
    description: 'Formato amplo de 18mm de altura para quadros industriais (Schneider Prisma, Legrand XL3, Hager Quadro).',
    targetDevice: 'Folha A4 com guias de corte',
    widthMm: 18,
    heightMm: 18,
    isContinuousStrip: true,
    stepPerModuleMm: 18,
  },
  strip_thermal_continuous: {
    id: 'strip_thermal_continuous',
    name: 'Tira Contínua em Rolo Térmico (Largura do Armário)',
    category: 'thermal_tape',
    description: 'Gera uma página contínua por cada calha DIN, com o comprimento exato dos módulos para impressoras térmicas de rolo contínuo.',
    targetDevice: 'Impressoras térmicas com suporte a corte de fita contínua (Brother QL / Zebra)',
    widthMm: 18,
    heightMm: 15,
    isContinuousStrip: true,
    stepPerModuleMm: 18,
  },
  brother_tape_18mm: {
    id: 'brother_tape_18mm',
    name: 'Fita Brother P-Touch / TZe 18mm',
    category: 'thermal_tape',
    description: 'Tira contínua com altura de 18mm, perfeitamente compatível com fitas laminadas Brother TZe-241 / TZe-641.',
    targetDevice: 'Brother P-Touch (PT-P900W, PT-E550W, PT-D600) ou similar',
    widthMm: 18,
    heightMm: 18,
    isContinuousStrip: true,
    stepPerModuleMm: 18,
  },
  brother_tape_24mm: {
    id: 'brother_tape_24mm',
    name: 'Fita Brother P-Touch / TZe 24mm',
    category: 'thermal_tape',
    description: 'Fita industrial larga de 24mm de altura para maior legibilidade em armários fabris.',
    targetDevice: 'Brother P-Touch com fita TZe 24mm',
    widthMm: 18,
    heightMm: 24,
    isContinuousStrip: true,
    stepPerModuleMm: 18,
  },
  thermal_roll_50x25: {
    id: 'thermal_roll_50x25',
    name: 'Etiquetas de Rolo Térmico 50 x 25 mm',
    category: 'thermal_roll',
    description: 'Tamanho padrão mais popular para impressoras térmicas de secretária e industriais (Zebra, TSC, Godex).',
    targetDevice: 'Zebra ZD420/ZD220, TSC TE200, Dymo, Brother TD',
    widthMm: 50,
    heightMm: 25,
  },
  thermal_roll_60x30: {
    id: 'thermal_roll_60x30',
    name: 'Etiquetas de Rolo Térmico 60 x 30 mm',
    category: 'thermal_roll',
    description: 'Etiquetas retangulares médias com excelente espaço para descrições longas e especificações elétricas.',
    targetDevice: 'Zebra, TSC, Honeywell, Citizen',
    widthMm: 60,
    heightMm: 30,
  },
  thermal_roll_38x19: {
    id: 'thermal_roll_38x19',
    name: 'Etiquetas de Rolo Térmico 38 x 19 mm (Disjuntor)',
    category: 'thermal_roll',
    description: 'Etiqueta autoadesiva compacta para colar diretamente na face frontal ou sob a manivela de disjuntores de 2 módulos (36mm).',
    targetDevice: 'Zebra, Brother QL, Dymo',
    widthMm: 38,
    heightMm: 19,
  },
  dymo_99010: {
    id: 'dymo_99010',
    name: 'Dymo 99010 (89 x 28 mm)',
    category: 'thermal_roll',
    description: 'Rolo autoadesivo standard Dymo LabelWriter 99010 / S0722400.',
    targetDevice: 'Dymo LabelWriter 450, 550, 4XL',
    widthMm: 89,
    heightMm: 28,
  },
  avery_a4_40: {
    id: 'avery_a4_40',
    name: 'Folha A4 Autoadesiva - 40 Etiquetas (48.5 x 25.4 mm)',
    category: 'a4_sheet',
    description: 'Grelha A4 de 4 colunas x 10 linhas (Padrão Avery L7159 / Herma 4457). Imprime em qualquer impressora laser de escritório.',
    targetDevice: 'Impressora Laser / Inkjet A4 comum',
    widthMm: 48.5,
    heightMm: 25.4,
  },
  avery_a4_24: {
    id: 'avery_a4_24',
    name: 'Folha A4 Autoadesiva - 24 Etiquetas (70 x 37 mm)',
    category: 'a4_sheet',
    description: 'Grelha A4 de 3 colunas x 8 linhas (Padrão Avery L7160 / Herma 4428). Formato grande com elevada legibilidade.',
    targetDevice: 'Impressora Laser / Inkjet A4 comum',
    widthMm: 70,
    heightMm: 37,
  },
};

export interface PrintableComponentItem {
  id: string;
  tag: string;
  originalTag: string;
  description: string;
  originalDescription: string;
  brand: string;
  partNumber: string;
  category: string;
  ratedCurrentA?: number;
  poles?: string;
  dinModules: number;
  widthMm: number;
  railIndex: number;
  railName: string;
  circuitSymbol: string; // e.g. "💡 ILUM", "🔌 TOM", "🍳 PLACA", "⚡ FORNO", "🚗 EV"
  circuitCode: string;
  selected: boolean;
}

export interface LabelPdfExportOptions {
  presetId: LabelPresetId;
  showTag: boolean;
  showDescription: boolean;
  showRating: boolean; // e.g. "16A", "32A", "24VDC"
  showCircuitSymbol: boolean; // e.g. 💡, 🔌, 🚗
  showPartNumber: boolean;
  showBorders: boolean;
  showCutLines: boolean;
  showRailHeader: boolean;
  fontSizePreference: 'compact' | 'normal' | 'large';
  colorMode: 'black_white' | 'thermal_high_contrast'; // 100% black on white for crisp thermal head transfer
  items: PrintableComponentItem[];
}

/**
 * Infers an intelligent circuit symbol, mnemonic, and clean description based on component tag and name
 */
export function inferCircuitMetadata(item: PlacedComponent, rIdx: number): { symbol: string; code: string; defaultDesc: string } {
  const text = `${item.tag} ${item.data.name} ${item.data.description || ''} ${item.data.customNotes || ''}`.toLowerCase();

  if (text.includes('placa') || text.includes('fogão') || text.includes('vitro')) {
    return { symbol: '🍳', code: 'PLACA', defaultDesc: 'Placa de Indução / Fogão' };
  }
  if (text.includes('forno')) {
    return { symbol: '⚡', code: 'FORNO', defaultDesc: 'Forno Elétrico' };
  }
  if (text.includes('lavar roupa') || text.includes('mlr')) {
    return { symbol: '🧺', code: 'M.L.R.', defaultDesc: 'Máquina de Lavar Roupa' };
  }
  if (text.includes('lavar lou') || text.includes('mll') || text.includes('loiça')) {
    return { symbol: '🍽️', code: 'M.L.L.', defaultDesc: 'Máquina de Lavar Louça' };
  }
  if (text.includes('wallbox') || text.includes('veículo') || text.includes('carregador') || text.includes('ev')) {
    return { symbol: '🚗', code: 'WALLBOX', defaultDesc: 'Carregador Veículo Elétrico (EV)' };
  }
  if (text.includes('termoacum') || text.includes('cilindro') || text.includes('aqs') || text.includes('caldeira')) {
    return { symbol: '♨️', code: 'AQS', defaultDesc: 'Termoacumulador / AQS' };
  }
  if (text.includes('ar cond') || text.includes('clima') || text.includes('avac') || text.includes('ac ')) {
    return { symbol: '❄️', code: 'AVAC', defaultDesc: 'Climatização / Ar Condicionado' };
  }
  if (text.includes('ilum') || text.includes('luz')) {
    return { symbol: '💡', code: 'ILUM', defaultDesc: 'Iluminação Geral' };
  }
  if (text.includes('tomada') || text.includes('tom.')) {
    if (text.includes('cozinha')) {
      return { symbol: '🔌', code: 'TOM.COZ', defaultDesc: 'Tomadas da Cozinha' };
    }
    return { symbol: '🔌', code: 'TOM', defaultDesc: 'Tomadas de Uso Geral' };
  }
  if (text.includes('campainha') || text.includes('sinal')) {
    return { symbol: '🔔', code: 'CAMP', defaultDesc: 'Campainha / Sinalização' };
  }
  if (text.includes('diferencial') || text.includes('rcd') || text.includes('rccb')) {
    return { symbol: '🛡️', code: 'DIF 30mA', defaultDesc: 'Interruptor Diferencial 30mA' };
  }
  if (text.includes('spd') || text.includes('dps') || text.includes('sobretens')) {
    return { symbol: '⚡', code: 'DPS', defaultDesc: 'Descarregador de Sobretensões' };
  }
  if (text.includes('geral') || text.includes('corte') || (rIdx === 0 && item.positionMm < 40 && item.data.category === 'protection_ac')) {
    return { symbol: '⚡', code: 'GERAL', defaultDesc: 'Corte Geral da Instalação' };
  }
  if (text.includes('telerruptor') || text.includes('minuteria') || text.includes('horário') || text.includes('relé hor')) {
    return { symbol: '⏱️', code: 'TEMPO', defaultDesc: 'Temporizador / Minuteria' };
  }
  if (item.data.category === 'power_supply' || text.includes('mean well') || text.includes('fonte')) {
    return { symbol: '🔌', code: '24VDC', defaultDesc: 'Fonte de Alimentação 24VDC' };
  }
  if (item.data.category === 'plc_cpu' || text.includes('s7-1200') || text.includes('logo!') || text.includes('autómato')) {
    return { symbol: '💻', code: 'PLC', defaultDesc: 'Autómato Programável / CPU' };
  }
  if (item.data.category === 'motor_control' || text.includes('motor') || text.includes('contactor')) {
    return { symbol: '⚙️', code: 'MOTOR', defaultDesc: 'Comando de Motor' };
  }
  if (item.data.category === 'safety_relays' || text.includes('emerg') || text.includes('e-stop')) {
    return { symbol: '🛑', code: 'E-STOP', defaultDesc: 'Paragem de Emergência' };
  }
  if (item.data.category === 'terminals' || text.includes('borne')) {
    if (text.includes('terra') || item.tag.includes('PE')) {
      return { symbol: '⏚', code: 'PE', defaultDesc: 'Barramento de Terra PE' };
    }
    return { symbol: '⫯', code: 'BORNES', defaultDesc: 'Régua de Bornes de Ligação' };
  }

  return {
    symbol: '🏷️',
    code: 'CIRC',
    defaultDesc: item.data.description || item.data.name,
  };
}

/**
 * Extracts and prepares all placed components as printable label items
 */
export function getPrintableItemsFromProject(
  project: ProjectState,
  overrides?: Record<string, { tag?: string; description?: string; selected?: boolean }>
): PrintableComponentItem[] {
  const result: PrintableComponentItem[] = [];

  project.rails.forEach((rail, rIdx) => {
    // Sort items by X position on rail
    const sorted = [...(rail.items || [])].sort((a, b) => a.positionMm - b.positionMm);

    sorted.forEach((item) => {
      const meta = inferCircuitMetadata(item, rIdx);
      const override = overrides ? overrides[item.instanceId] : undefined;

      const tag = override?.tag !== undefined ? override.tag : item.tag;
      const desc = override?.description !== undefined 
        ? override.description 
        : (item.data.customNotes && item.data.customNotes.trim() ? item.data.customNotes : meta.defaultDesc);
      const selected = override?.selected !== undefined ? override.selected : true;

      const modules = Math.max(1, Math.round(item.data.widthMm / 18));

      result.push({
        id: item.instanceId,
        tag,
        originalTag: item.tag,
        description: desc,
        originalDescription: meta.defaultDesc,
        brand: item.data.brand || '',
        partNumber: item.data.partNumber || '',
        category: item.data.category,
        ratedCurrentA: item.data.ratedCurrentA,
        poles: item.data.poles,
        dinModules: modules,
        widthMm: item.data.widthMm,
        railIndex: rIdx,
        railName: rail.name || `Calha ${rIdx + 1}`,
        circuitSymbol: meta.symbol,
        circuitCode: meta.code,
        selected,
      });
    });
  });

  return result;
}

/**
 * Core PDF Generator for Component Identification Labels
 */
export function generateComponentLabelsPdf(
  project: ProjectState,
  options: LabelPdfExportOptions
): jsPDF {
  const preset = LABEL_PRESETS[options.presetId] || LABEL_PRESETS.strip_din_a4;
  const activeItems = options.items.filter((i) => i.selected);

  if (preset.category === 'din_strip') {
    return generateDinStripsA4Pdf(project, options, preset);
  } else if (preset.id === 'strip_thermal_continuous' || preset.category === 'thermal_tape') {
    return generateContinuousThermalTapePdf(project, options, preset);
  } else if (preset.category === 'thermal_roll') {
    return generateIndividualThermalRollPdf(project, options, preset);
  } else {
    return generateA4AverySheetPdf(project, options, preset);
  }
}

/**
 * 1. Generates A4 sheet with DIN Modular Strips aligned with 18mm modules
 * Perfect for sliding into switchboard front transparent strip holders below breakers!
 */
function generateDinStripsA4Pdf(
  project: ProjectState,
  options: LabelPdfExportOptions,
  preset: LabelPresetConfig
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 210;
  const pageH = 297;
  const marginX = 12;
  let currentY = 18;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Tiras de Identificação Modular de Calha DIN (Porta-Etiquetas)', marginX, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    `Projeto: ${project.config.name} (${project.config.projectCode}) · Passo modular: 18.0 mm · Altura: ${preset.heightMm} mm · Recorte pelas linhas tracejadas`,
    marginX,
    currentY
  );
  currentY += 8;

  // Group active items by rail
  project.rails.forEach((rail, rIdx) => {
    const railItems = options.items.filter((i) => i.railIndex === rIdx && i.selected);
    if (railItems.length === 0) return;

    // Check if new page needed
    if (currentY + preset.heightMm + 24 > pageH - 15) {
      doc.addPage('a4', 'portrait');
      currentY = 18;
    }

    // Rail Header
    if (options.showRailHeader) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`▶ ${rail.name || `Calha ${rIdx + 1}`} (Comprimento Útil: ${rail.usableWidthMm} mm)`, marginX, currentY);
      currentY += 4;
    }

    const stripStartX = marginX;
    const stripY = currentY;
    const stripH = preset.heightMm;
    let currentX = stripStartX;

    // Draw background strip boundary
    const totalStripWidth = railItems.reduce((acc, it) => acc + it.dinModules * preset.stepPerModuleMm!, 0);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.rect(stripStartX, stripY, totalStripWidth, stripH, 'FD');

    // Draw individual module cells
    railItems.forEach((it) => {
      const cellW = it.dinModules * preset.stepPerModuleMm!;

      // Cell border
      if (options.showBorders) {
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.25);
        doc.rect(currentX, stripY, cellW, stripH);
      }

      // Draw top header tag area
      const headerH = stripH * 0.42;
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(currentX, stripY, cellW, headerH, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(currentX, stripY + headerH, currentX + cellW, stripY + headerH);

      // Render Tag & Symbol
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      const tagFontSize = options.fontSizePreference === 'large' ? 8.5 : options.fontSizePreference === 'compact' ? 6.5 : 7.5;
      doc.setFontSize(tagFontSize);

      let tagStr = it.tag;
      if (options.showRating && it.ratedCurrentA) {
        tagStr += ` · ${it.ratedCurrentA}A`;
      }

      doc.text(tagStr, currentX + cellW / 2, stripY + headerH * 0.7, {
        align: 'center',
        maxWidth: cellW - 2,
      });

      // Render Description in lower portion
      doc.setFont('helvetica', 'normal');
      const descFontSize = options.fontSizePreference === 'large' ? 7 : options.fontSizePreference === 'compact' ? 5 : 6;
      doc.setFontSize(descFontSize);
      doc.setTextColor(51, 65, 85); // slate-700

      let descStr = it.description;
      if (options.showCircuitSymbol && it.circuitCode) {
        descStr = `[${it.circuitCode}] ${descStr}`;
      }

      // Split text to fit
      const textLines = doc.splitTextToSize(descStr, cellW - 2);
      const lineH = descFontSize * 0.38;
      const descStartY = stripY + headerH + 2.5;

      // Draw maximum 2 lines of description
      const linesToDraw = textLines.slice(0, 2);
      linesToDraw.forEach((line: string, lIdx: number) => {
        doc.text(line, currentX + cellW / 2, descStartY + lIdx * lineH, {
          align: 'center',
          maxWidth: cellW - 2,
        });
      });

      // Advance X
      currentX += cellW;
    });

    // Draw cut marks (dashed cutting guides)
    if (options.showCutLines) {
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.15);
      doc.setLineDashPattern([1.5, 1.5], 0);

      // Top and bottom extended guide ticks
      let tickX = stripStartX;
      railItems.forEach((it) => {
        doc.line(tickX, stripY - 2, tickX, stripY + stripH + 2);
        tickX += it.dinModules * preset.stepPerModuleMm!;
      });
      doc.line(tickX, stripY - 2, tickX, stripY + stripH + 2);

      // Restore solid line
      doc.setLineDashPattern([], 0);
    }

    currentY += stripH + 12;
  });

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'ElectroCad DIN · Módulo de Etiquetas Técnicas para Calhas e Aparelhagem Modular · Conforme EN 61439-3',
    pageW / 2,
    pageH - 8,
    { align: 'center' }
  );

  return doc;
}

/**
 * 2. Generates continuous strip for roll thermal printers (Brother P-Touch / Zebra Continuous)
 * Width = total components length; Height = tape width (18mm, 24mm, etc.)
 */
function generateContinuousThermalTapePdf(
  project: ProjectState,
  options: LabelPdfExportOptions,
  preset: LabelPresetConfig
): jsPDF {
  // We generate 1 page per rail with exact tape dimensions
  const railsWithItems = project.rails
    .map((r, rIdx) => ({
      rail: r,
      rIdx,
      items: options.items.filter((i) => i.railIndex === rIdx && i.selected),
    }))
    .filter((entry) => entry.items.length > 0);

  const firstEntry = railsWithItems[0] || {
    rail: project.rails[0],
    rIdx: 0,
    items: options.items.filter((i) => i.selected),
  };

  const tapeHeight = preset.heightMm;
  const firstWidth = Math.max(60, firstEntry.items.reduce((acc, it) => acc + it.dinModules * (preset.stepPerModuleMm || 18), 0) + 10);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [firstWidth, tapeHeight],
  });

  railsWithItems.forEach((entry, idx) => {
    const stripWidth = Math.max(60, entry.items.reduce((acc, it) => acc + it.dinModules * (preset.stepPerModuleMm || 18), 0) + 10);

    if (idx > 0) {
      doc.addPage([stripWidth, tapeHeight], 'landscape');
    }

    let curX = 5;
    const cellH = tapeHeight;

    entry.items.forEach((it) => {
      const cellW = it.dinModules * (preset.stepPerModuleMm || 18);

      // Border / Separator
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(curX, 0, cellW, cellH);

      // Top Tag
      doc.setFont('helvetica', 'bold');
      const tagSize = options.fontSizePreference === 'large' ? 9 : 7.5;
      doc.setFontSize(tagSize);
      doc.setTextColor(0, 0, 0);

      let tagStr = it.tag;
      if (options.showRating && it.ratedCurrentA) {
        tagStr += ` · ${it.ratedCurrentA}A`;
      }
      doc.text(tagStr, curX + cellW / 2, cellH * 0.38, {
        align: 'center',
        maxWidth: cellW - 2,
      });

      // Divider line
      doc.setLineWidth(0.15);
      doc.line(curX, cellH * 0.48, curX + cellW, cellH * 0.48);

      // Bottom Description
      doc.setFont('helvetica', 'bold');
      const descSize = options.fontSizePreference === 'large' ? 7 : 5.5;
      doc.setFontSize(descSize);

      let descStr = it.description;
      if (options.showCircuitSymbol && it.circuitCode) {
        descStr = `[${it.circuitCode}] ${descStr}`;
      }

      const lines = doc.splitTextToSize(descStr, cellW - 2);
      const linesToDraw = lines.slice(0, 2);
      linesToDraw.forEach((l: string, lIdx: number) => {
        doc.text(l, curX + cellW / 2, cellH * 0.65 + lIdx * (descSize * 0.4), {
          align: 'center',
          maxWidth: cellW - 2,
        });
      });

      curX += cellW;
    });
  });

  return doc;
}

/**
 * 3. Generates individual labels for standard thermal roll printers (Zebra, Dymo, TSC)
 * One label per page matching exact label roll dimensions (e.g. 50x25mm, 60x30mm)
 */
function generateIndividualThermalRollPdf(
  project: ProjectState,
  options: LabelPdfExportOptions,
  preset: LabelPresetConfig
): jsPDF {
  const lblW = preset.widthMm;
  const lblH = preset.heightMm;

  const doc = new jsPDF({
    orientation: lblW > lblH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [lblW, lblH],
  });

  const activeItems = options.items.filter((i) => i.selected);

  activeItems.forEach((it, idx) => {
    if (idx > 0) {
      doc.addPage([lblW, lblH], lblW > lblH ? 'landscape' : 'portrait');
    }

    // Outer Border
    if (options.showBorders) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.rect(1, 1, lblW - 2, lblH - 2);
    }

    // Tag (Large & Bold)
    doc.setFont('helvetica', 'bold');
    const tagSize = lblH >= 25 ? 12 : 9;
    doc.setFontSize(tagSize);
    doc.setTextColor(0, 0, 0);

    const tagY = lblH * 0.28;
    doc.text(it.tag, lblW / 2, tagY, { align: 'center' });

    // Rating & Mnemonic Subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(lblH >= 25 ? 8 : 6.5);

    let subStr = '';
    if (options.showCircuitSymbol && it.circuitCode) {
      subStr += `[${it.circuitCode}] `;
    }
    if (options.showRating && it.ratedCurrentA) {
      subStr += `${it.ratedCurrentA}A ${it.poles || ''}`;
    }
    if (subStr.trim()) {
      doc.text(subStr.trim(), lblW / 2, tagY + (lblH >= 25 ? 4.5 : 3.5), { align: 'center' });
    }

    // Horizontal separator
    const lineY = lblH * 0.48;
    doc.setLineWidth(0.2);
    doc.line(3, lineY, lblW - 3, lineY);

    // Description (Multi-line)
    doc.setFont('helvetica', 'normal');
    const descSize = lblH >= 25 ? 8 : 6;
    doc.setFontSize(descSize);

    const descLines = doc.splitTextToSize(it.description, lblW - 4);
    const descStartY = lineY + (lblH >= 25 ? 3.5 : 2.5);

    descLines.slice(0, 3).forEach((line: string, lIdx: number) => {
      doc.text(line, lblW / 2, descStartY + lIdx * (descSize * 0.42), {
        align: 'center',
        maxWidth: lblW - 4,
      });
    });

    // Part Number / Project Code at bottom
    if (options.showPartNumber && (it.partNumber || project.config.projectCode)) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(5);
      doc.setTextColor(70, 70, 70);
      const bottomText = it.partNumber ? `${it.brand} ${it.partNumber}` : project.config.projectCode;
      doc.text(bottomText, lblW / 2, lblH - 2, { align: 'center' });
    }
  });

  return doc;
}

/**
 * 4. Generates A4 sheet with pre-cut label grid (Avery / Herma)
 */
function generateA4AverySheetPdf(
  project: ProjectState,
  options: LabelPdfExportOptions,
  preset: LabelPresetConfig
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 210;
  const pageH = 297;

  // Grid specs
  let cols = 4;
  let rows = 10;
  let lblW = 48.5;
  let lblH = 25.4;
  let marginX = 8;
  let marginY = 13.5;
  let gapX = 0;
  let gapY = 0;

  if (preset.id === 'avery_a4_24') {
    cols = 3;
    rows = 8;
    lblW = 70;
    lblH = 37;
    marginX = 0;
    marginY = 0.5;
  }

  const activeItems = options.items.filter((i) => i.selected);
  const labelsPerPage = cols * rows;

  let currentItemIdx = 0;
  let pageNum = 0;

  while (currentItemIdx < activeItems.length) {
    if (pageNum > 0) {
      doc.addPage('a4', 'portrait');
    }
    pageNum++;

    // Fill page grid
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (currentItemIdx >= activeItems.length) break;

        const it = activeItems[currentItemIdx];
        const cellX = marginX + c * (lblW + gapX);
        const cellY = marginY + r * (lblH + gapY);

        // Border
        if (options.showBorders) {
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.2);
          doc.rect(cellX, cellY, lblW, lblH);
        }

        // Tag
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(it.tag, cellX + lblW / 2, cellY + 5.5, { align: 'center' });

        // Subtitle (Rating & Code)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);

        let sub = '';
        if (options.showCircuitSymbol && it.circuitCode) sub += `[${it.circuitCode}] `;
        if (options.showRating && it.ratedCurrentA) sub += `${it.ratedCurrentA}A`;
        if (sub.trim()) {
          doc.text(sub.trim(), cellX + lblW / 2, cellY + 9, { align: 'center' });
        }

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.15);
        doc.line(cellX + 2, cellY + 10.5, cellX + lblW - 2, cellY + 10.5);

        // Description
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(51, 65, 85);

        const lines = doc.splitTextToSize(it.description, lblW - 4);
        lines.slice(0, 3).forEach((line: string, lIdx: number) => {
          doc.text(line, cellX + lblW / 2, cellY + 13.5 + lIdx * 2.8, {
            align: 'center',
            maxWidth: lblW - 4,
          });
        });

        currentItemIdx++;
      }
    }
  }

  return doc;
}
