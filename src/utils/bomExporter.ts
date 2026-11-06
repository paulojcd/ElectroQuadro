import { ProjectState } from '../types/electrical';
import { getConsolidatedBom, ConsolidatedBomItem } from './bomUtils';

export type BomExportFormat = 'excel_european_csv' | 'universal_csv' | 'excel_xml' | 'tsv_clipboard';

export interface BomExportOptions {
  includePrices?: boolean;
  includeWireSpecs?: boolean;
  includeDimensions?: boolean;
  filterCategory?: string;
  filterBrand?: string;
}

/**
 * Generates and downloads a CSV file optimized for Microsoft Excel in Europe (Portugal/EU)
 * Delimiter: semicolon (;)
 * Decimal separator: comma (,)
 * Encoding: UTF-8 with BOM (\uFEFF) so Excel natively recognizes special characters (ç, ã, é, €, etc.)
 */
export function exportBomToExcelEuropeanCsv(
  project: ProjectState,
  options: BomExportOptions = {}
): void {
  const items = getFilteredBomItems(project, options);
  const includePrices = options.includePrices ?? true;

  const headers = [
    'Item/Posição',
    'Tags/Designações',
    'Fabricante',
    'Referência (Part Number)',
    'Designação do Componente',
    'Categoria',
    'Módulos DIN (18mm)',
    'Largura (mm)',
    'Condutor Recomendado',
    'Qtd',
  ];

  if (includePrices) {
    headers.push('Preço Unitário (€)', 'Preço Total Linha (€)');
  }

  const rows = items.map((it, idx) => {
    const row = [
      String(idx + 1),
      escapeCsvValue(it.tags.join(', ')),
      escapeCsvValue(it.brand),
      escapeCsvValue(it.partNumber),
      escapeCsvValue(it.name),
      escapeCsvValue(getCategoryLabel(it.category)),
      formatNumberEu(it.widthMm > 0 ? it.widthMm / 18 : 0, 1),
      formatNumberEu(it.widthMm, 0),
      escapeCsvValue(it.recommendedWireLabel || (it.recommendedWireMm2 ? `${it.recommendedWireMm2} mm²` : 'N/A')),
      String(it.quantity),
    ];

    if (includePrices) {
      row.push(formatNumberEu(it.unitPriceEur, 2), formatNumberEu(it.totalPriceEur, 2));
    }

    return row.join(';');
  });

  // Summary row
  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalCost = items.reduce((sum, it) => sum + it.totalPriceEur, 0);
  const totalWidth = items.reduce((sum, it) => sum + it.widthMm * it.quantity, 0);

  const summaryRow = [
    'TOTAL',
    `"${items.length} referências distintas"`,
    '""',
    '""',
    `"Quadro: ${project.config.name} (${project.config.projectCode})"`,
    '""',
    formatNumberEu(totalWidth / 18, 1),
    formatNumberEu(totalWidth, 0),
    '""',
    String(totalQty),
  ];

  if (includePrices) {
    summaryRow.push('""', formatNumberEu(totalCost, 2));
  }

  // Prepend project header comments
  const metaHeader = [
    `# PROJETO: ${project.config.name} | CÓDIGO: ${project.config.projectCode}`,
    `# CLIENTE: ${project.config.clientName || 'Cliente'} | PROJETISTA: ${project.config.designerName || 'Projetista'}`,
    `# DATA: ${project.config.date || new Date().toLocaleDateString('pt-PT')} | ALIMENTAÇÃO: ${project.config.supplyVoltage}`,
    `# GRAU DE PROTEÇÃO: ${project.config.ipRating} ${project.config.ikRating || 'IK08'} | FORMATO: CSV Excel Europeu (Delimitador ; e decimais com vírgula)`,
    '',
  ].join('\n');

  const csvContent = '\uFEFF' + metaHeader + headers.join(';') + '\n' + rows.join('\n') + '\n' + summaryRow.join(';');
  downloadBlob(
    new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }),
    `${project.config.projectCode || 'BOM'}_Lista_Materiais_Excel.csv`
  );
}

/**
 * Generates and downloads a universal standard CSV file
 * Delimiter: comma (,)
 * Decimal separator: dot (.)
 * Suitable for Google Sheets, ERPs, SAP, web importers
 */
export function exportBomToUniversalCsv(
  project: ProjectState,
  options: BomExportOptions = {}
): void {
  const items = getFilteredBomItems(project, options);
  const includePrices = options.includePrices ?? true;

  const headers = [
    'Position',
    'Tags',
    'Manufacturer',
    'Part Number',
    'Description',
    'Category',
    'Din Modules',
    'Width (mm)',
    'Recommended Wire',
    'Quantity',
  ];

  if (includePrices) {
    headers.push('Unit Price (EUR)', 'Total Price (EUR)');
  }

  const rows = items.map((it, idx) => {
    const row = [
      String(idx + 1),
      `"${it.tags.join(', ')}"`,
      `"${it.brand}"`,
      `"${it.partNumber}"`,
      `"${it.name.replace(/"/g, '""')}"`,
      `"${it.category}"`,
      (it.widthMm > 0 ? it.widthMm / 18 : 0).toFixed(1),
      it.widthMm.toFixed(0),
      `"${it.recommendedWireLabel || (it.recommendedWireMm2 ? `${it.recommendedWireMm2} mm2` : '')}"`,
      String(it.quantity),
    ];

    if (includePrices) {
      row.push(it.unitPriceEur.toFixed(2), it.totalPriceEur.toFixed(2));
    }

    return row.join(',');
  });

  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalCost = items.reduce((sum, it) => sum + it.totalPriceEur, 0);
  const totalWidth = items.reduce((sum, it) => sum + it.widthMm * it.quantity, 0);

  const summaryRow = [
    'TOTAL',
    `"${items.length} items"`,
    '""',
    '""',
    `"Project: ${project.config.projectCode}"`,
    '""',
    (totalWidth / 18).toFixed(1),
    totalWidth.toFixed(0),
    '""',
    String(totalQty),
  ];

  if (includePrices) {
    summaryRow.push('""', totalCost.toFixed(2));
  }

  const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n') + '\n' + summaryRow.join(',');
  downloadBlob(
    new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }),
    `${project.config.projectCode || 'BOM'}_Lista_Materiais_Universal.csv`
  );
}

/**
 * Generates and downloads a rich Microsoft Excel XML Spreadsheet (.xls)
 * Opens directly in Microsoft Excel with formatted styles, bold headers, currency types and formulas!
 */
export function exportBomToExcelXml(
  project: ProjectState,
  options: BomExportOptions = {}
): void {
  const items = getFilteredBomItems(project, options);
  const includePrices = options.includePrices ?? true;

  const totalCost = items.reduce((sum, it) => sum + it.totalPriceEur, 0);
  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Lista de Componentes e Materiais (BOM)</Title>
  <Subject>${escapeXml(project.config.name)}</Subject>
  <Author>${escapeXml(project.config.designerName || 'ElectroCad DIN')}</Author>
  <Company>${escapeXml(project.config.clientName || 'Indústria')}</Company>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#1e3a8a"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#475569"/>
  </Style>
  <Style ss:ID="MetaVal">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0f172a"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1e40af" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0f172a"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3b82f6"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3b82f6"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3b82f6"/>
   </Borders>
  </Style>
  <Style ss:ID="RowEven">
   <Interior ss:Color="#f8fafc" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
  </Style>
  <Style ss:ID="RowOdd">
   <Interior ss:Color="#ffffff" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
  </Style>
  <Style ss:ID="CurrencyStyle">
   <NumberFormat ss:Format="#,##0.00 &quot;€&quot;"/>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="NumberStyle">
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="TotalStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0f172a"/>
   <Interior ss:Color="#e2e8f0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0f172a"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0f172a"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalCurrencyStyle">
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#1e3a8a"/>
   <Interior ss:Color="#e2e8f0" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.00 &quot;€&quot;"/>
   <Alignment ss:Horizontal="Right"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0f172a"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0f172a"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Lista de Materiais (BOM)">
  <Table ss:DefaultColumnWidth="75" ss:DefaultRowHeight="20">
   <Column ss:Width="40"/>
   <Column ss:Width="110"/>
   <Column ss:Width="100"/>
   <Column ss:Width="130"/>
   <Column ss:Width="230"/>
   <Column ss:Width="120"/>
   <Column ss:Width="65"/>
   <Column ss:Width="70"/>
   <Column ss:Width="110"/>
   <Column ss:Width="50"/>
   ${includePrices ? '<Column ss:Width="95"/><Column ss:Width="105"/>' : ''}
   
   <!-- Title Block -->
   <Row ss:Height="28">
    <Cell ss:MergeAcross="${includePrices ? 11 : 9}" ss:StyleID="TitleStyle">
     <Data ss:Type="String">MAPA DE QUANTIDADES E ORÇAMENTO DE MATERIAIS (BOM)</Data>
    </Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Projeto:</Data></Cell>
    <Cell ss:MergeAcross="3" ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(project.config.name)} (${escapeXml(project.config.projectCode)})</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Cliente:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(project.config.clientName || 'N/A')}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Data:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(project.config.date)}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Alimentação:</Data></Cell>
    <Cell ss:MergeAcross="3" ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(project.config.supplyVoltage)} | 50Hz</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Invólucro:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(project.config.widthMm)}x${escapeXml(project.config.heightMm)}x${escapeXml(project.config.depthMm)} mm (${escapeXml(project.config.ipRating)} / ${escapeXml(project.config.ikRating || 'IK08')})</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Projetista:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(project.config.designerName || 'Projetista')}</Data></Cell>
   </Row>
   <Row ss:Height="10"/>

   <!-- Table Headers -->
   <Row ss:Height="26">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Nº</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Tags / Ref. Quadro</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Fabricante</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Part Number</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Designação Técnica</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Categoria</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Módulos (18mm)</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Largura (mm)</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Cablagem Sugerida</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Qtd</Data></Cell>
    ${
      includePrices
        ? `
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Preço Unit. (€)</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Subtotal (€)</Data></Cell>
    `
        : ''
    }
   </Row>

   <!-- Data Rows -->
   ${items
     .map((it, idx) => {
       const rowStyle = idx % 2 === 0 ? 'RowEven' : 'RowOdd';
       const dinMod = it.widthMm > 0 ? (it.widthMm / 18).toFixed(1) : '0';
       return `
   <Row ss:Height="22">
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(it.tags.join(', '))}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(it.brand)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(it.partNumber)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(it.name)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(getCategoryLabel(it.category))}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${dinMod}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${it.widthMm}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${escapeXml(it.recommendedWireLabel || (it.recommendedWireMm2 ? `${it.recommendedWireMm2} mm²` : '-'))}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${it.quantity}</Data></Cell>
    ${
      includePrices
        ? `
    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${it.unitPriceEur.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${it.totalPriceEur.toFixed(2)}</Data></Cell>
    `
        : ''
    }
   </Row>`;
     })
     .join('')}

   <!-- Total Row -->
   <Row ss:Height="24">
    <Cell ss:StyleID="TotalStyle"><Data ss:Type="String">TOTAL</Data></Cell>
    <Cell ss:MergeAcross="7" ss:StyleID="TotalStyle"><Data ss:Type="String">Total de Componentes e Equipamentos do Quadro</Data></Cell>
    <Cell ss:StyleID="TotalStyle"><Data ss:Type="Number">${totalQty}</Data></Cell>
    ${
      includePrices
        ? `
    <Cell ss:StyleID="TotalStyle"><Data ss:Type="String">ORÇAMENTO:</Data></Cell>
    <Cell ss:StyleID="TotalCurrencyStyle"><Data ss:Type="Number">${totalCost.toFixed(2)}</Data></Cell>
    `
        : ''
    }
   </Row>
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Layout x:Orientation="Landscape"/>
    <Header x:Margin="0.3"/>
    <Footer x:Margin="0.3"/>
    <PageMargins x:Bottom="0.5" x:Left="0.5" x:Right="0.5" x:Top="0.5"/>
   </PageSetup>
   <FitToPage/>
   <Print>
    <FitWidth>1</FitWidth>
    <FitHeight>0</FitHeight>
    <ValidPrinterInfo/>
   </Print>
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitPane>
    <SplitRow>5</SplitRow>
    <TopRowBottomPane>5</TopRowBottomPane>
    <ActivePane>2</ActivePane>
   </SplitPane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  downloadBlob(
    new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' }),
    `${project.config.projectCode || 'BOM'}_Lista_Materiais_Orcamento.xls`
  );
}

/**
 * Copies BOM table as Tab-Separated Values (TSV) to clipboard, ready to paste directly into Google Sheets or Excel
 */
export async function copyBomToClipboard(
  project: ProjectState,
  options: BomExportOptions = {}
): Promise<boolean> {
  const items = getFilteredBomItems(project, options);
  const includePrices = options.includePrices ?? true;

  const header = [
    'Item',
    'Tags',
    'Fabricante',
    'Part Number',
    'Designação',
    'Categoria',
    'Módulos (18mm)',
    'Largura (mm)',
    'Cablagem Sugerida',
    'Qtd',
  ];
  if (includePrices) {
    header.push('Preço Unit (€)', 'Total (€)');
  }

  const rows = items.map((it, idx) => {
    const r = [
      String(idx + 1),
      it.tags.join(', '),
      it.brand,
      it.partNumber,
      it.name,
      getCategoryLabel(it.category),
      it.widthMm > 0 ? (it.widthMm / 18).toFixed(1) : '0',
      String(it.widthMm),
      it.recommendedWireLabel || (it.recommendedWireMm2 ? `${it.recommendedWireMm2} mm²` : '-'),
      String(it.quantity),
    ];
    if (includePrices) {
      r.push(it.unitPriceEur.toFixed(2), it.totalPriceEur.toFixed(2));
    }
    return r.join('\t');
  });

  const text = [header.join('\t'), ...rows].join('\n');
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

// Helpers
function getFilteredBomItems(project: ProjectState, options: BomExportOptions): ConsolidatedBomItem[] {
  const all = getConsolidatedBom(project);
  return all.filter((it) => {
    if (options.filterCategory && options.filterCategory !== 'all' && it.category !== options.filterCategory) {
      return false;
    }
    if (options.filterBrand && options.filterBrand !== 'all' && it.brand !== options.filterBrand) {
      return false;
    }
    return true;
  });
}

function escapeCsvValue(val: string): string {
  if (val.includes(';') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return `"${val}"`;
}

function formatNumberEu(num: number, decimals: number = 2): string {
  return num.toFixed(decimals).replace('.', ',');
}

function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'power_supply':
      return 'Fonte de Alimentação';
    case 'plc_cpu':
      return 'Autómato / PLC CPU';
    case 'plc_expansion':
      return 'Expansão de I/O';
    case 'protection_ac':
      return 'Proteção AC (Disjuntor/Diff)';
    case 'protection_dc':
      return 'Proteção DC / Fusíveis';
    case 'motor_control':
      return 'Comando de Motor / Contactor';
    case 'relays':
      return 'Relé de Interface';
    case 'safety_relays':
      return 'Relé de Segurança';
    case 'terminals':
      return 'Blocos Terminais (Bornes)';
    case 'residential_modular':
      return 'Modular Residencial';
    case 'accessories':
      return 'Acessórios / Bucins / SPD';
    default:
      return category;
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
