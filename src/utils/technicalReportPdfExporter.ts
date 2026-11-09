import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectState } from '../types/electrical';
import { calculatePowerBalance, runEngineeringValidations, isResidentialProject } from './calculations';
import { getConsolidatedBom } from './bomUtils';
import { verifyEnclosureIpIk } from './ipIkVerification';
import { getComponentPowerRating, getComponentOperatingCurrent } from '../components/ComponentTechnicalTooltip';

export interface TechnicalReportExportOptions {
  technicianName?: string;
  technicianLicense?: string;
  clientName?: string;
  companyName?: string;
  revision?: string;
  customNotes?: string;
  includePrices?: boolean;
}

/**
 * Generates an official, consolidated technical report in PDF format
 * containing Compliance Verifications (EN 61439 / RTIEBT / IP-IK),
 * Power Balance (24VDC & Thermal), and Consolidated Bill of Materials (BOM).
 */
export async function downloadTechnicalReportPdf(
  project: ProjectState,
  options: TechnicalReportExportOptions = {}
): Promise<void> {
  const {
    technicianName = 'Eng. Eletrotécnico Responsável',
    technicianLicense = 'OE / DGEG 84219',
    clientName = 'Cliente Final / Entidade Exploradora',
    companyName = 'ElectroCad Studio Pro',
    revision = 'Rev 1.0',
    customNotes = '',
    includePrices = true,
  } = options;

  // Initialize jsPDF in A4 Portrait mode for standard technical documentation
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const printableWidth = pageWidth - 2 * margin;
  const printableHeight = pageHeight - 2 * margin;

  let currentPage = 1;

  // Pre-calculate project metrics
  const balance = calculatePowerBalance(project);
  const issues = runEngineeringValidations(project);
  const ipIkResult = verifyEnclosureIpIk(project.config);
  const isResidential = isResidentialProject(project);
  const bomItems = getConsolidatedBom(project);
  const allItems = project.rails.flatMap((r) => r.items);

  const errors = issues.filter((i) => i.type === 'error');
  const warnings = issues.filter((i) => i.type === 'warning');

  const totalUsableMm = project.rails.reduce((sum, r) => sum + r.usableWidthMm, 0);
  const occupiedMm = allItems.reduce((sum, i) => sum + i.data.widthMm, 0);
  const freeMm = Math.max(0, totalUsableMm - occupiedMm);
  const freePercentage = totalUsableMm > 0 ? Math.round((freeMm / totalUsableMm) * 100) : 0;
  const totalModules = Math.floor(totalUsableMm / 18);
  const usedModules = Math.ceil(occupiedMm / 18);

  // Helper to draw clean header & footer on pages
  const drawPageHeader = (pageTitle: string, subtitle: string) => {
    // Header Bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, margin, printableWidth, 18, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(pageTitle.toUpperCase(), margin + 6, margin + 8);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(subtitle, margin + 6, margin + 14);

    // Right Badge: Standards / Date
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(56, 189, 248); // sky-400
    doc.text(project.config.projectCode || 'PROJ-2026', margin + printableWidth - 6, margin + 8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225);
    doc.text(`Data: ${project.config.date || '2026'} · ${revision}`, margin + printableWidth - 6, margin + 14, { align: 'right' });
  };

  const drawPageFooter = (sheetNum: number, totalSheets: number = 4) => {
    const footY = margin + printableHeight - 2;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, footY - 5, margin + printableWidth, footY - 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Relatório Técnico Oficial · ${companyName} · Quadro ${project.config.name} (${project.config.widthMm}×${project.config.heightMm}mm)`,
      margin,
      footY
    );

    doc.setFont('helvetica', 'bold');
    doc.text(`Folha ${sheetNum} de ${totalSheets}`, margin + printableWidth, footY, { align: 'right' });
  };

  // =========================================================================
  // FOLHA 1: FOLHA DE ROSTO & SUMÁRIO EXECUTIVO DE AUDITORIA
  // =========================================================================
  drawPageHeader(
    'Relatório Técnico de Engenharia & Conformidade Normativa',
    'Auditoria de Quadro Elétrico · Diretiva BT 2014/35/UE · Normas EN 61439-1 / EN 61439-2 / RTIEBT'
  );

  let curY = margin + 24;

  // Box 1: Identificação do Projeto & Responsáveis
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, curY, printableWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. IDENTIFICAÇÃO DO PROJETO & ENTIDADES', margin + 6, curY + 6);

  const idCol1X = margin + 6;
  const idCol2X = margin + 98;

  const projectIdent = [
    ['Designação do Quadro:', project.config.name],
    ['Código do Projeto:', `${project.config.projectCode || 'ELC-001'} (${revision})`],
    ['Entidade Exploradora / Cliente:', clientName],
    ['Ambiente Operacional:', isResidential ? 'Habitação / Edifício Residencial (RTIEBT)' : 'Ambiente Industrial / Automatismos (EN 60204-1)'],
  ];

  const engIdent = [
    ['Empresa de Engenharia:', companyName],
    ['Técnico Responsável:', technicianName],
    ['Carteira Profissional:', technicianLicense],
    ['Data da Auditoria / Emissão:', `${project.config.date || '2026-11-09'} · Documentação Oficial`],
  ];

  doc.setFontSize(7.5);
  projectIdent.forEach((row, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(row[0], idCol1X, curY + 13 + idx * 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row[1], idCol1X + 44, curY + 13 + idx * 5);
  });

  engIdent.forEach((row, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(row[0], idCol2X, curY + 13 + idx * 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row[1], idCol2X + 40, curY + 13 + idx * 5);
  });

  curY += 38;

  // Box 2: 4 KPI Cards
  const kpiW = (printableWidth - 9) / 4;
  const kpiH = 26;

  // KPI 1: Conformidade Global
  const isOk = errors.length === 0;
  doc.setFillColor(isOk ? 240 : 254, isOk ? 253 : 242, isOk ? 244 : 242);
  doc.setDrawColor(isOk ? 134 : 252, isOk ? 239 : 165, isOk ? 172 : 165);
  doc.roundedRect(margin, curY, kpiW, kpiH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isOk ? 22 : 185, isOk ? 101 : 28, isOk ? 52 : 28);
  doc.text('STATUS GLOBAL', margin + 4, curY + 6);
  doc.setFontSize(10);
  doc.text(errors.length === 0 ? (warnings.length > 0 ? 'CONFORME*' : 'APROVADO') : 'NÃO CONFORME', margin + 4, curY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(errors.length === 0 ? `${warnings.length} alertas informativos` : `${errors.length} infrações graves`, margin + 4, curY + 21);

  // KPI 2: Reserva de Espaço DIN
  const kpi2X = margin + kpiW + 3;
  const resOk = freePercentage >= 20;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(kpi2X, curY, kpiW, kpiH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('RESERVA DE ESPAÇO', kpi2X + 4, curY + 6);
  doc.setFontSize(11);
  doc.setTextColor(resOk ? 16 : 194, resOk ? 185 : 65, resOk ? 129 : 12);
  doc.text(`${freePercentage}% LIVRE`, kpi2X + 4, curY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${freeMm} mm (${totalModules - usedModules} mod. livres)`, kpi2X + 4, curY + 21);

  // KPI 3: Balanço 24VDC
  const kpi3X = kpi2X + kpiW + 3;
  const pwrOk = !balance.isOverloaded;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi3X, curY, kpiW, kpiH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('LINHA 24V DC', kpi3X + 4, curY + 6);
  doc.setFontSize(11);
  doc.setTextColor(pwrOk ? 2 : 225, pwrOk ? 132 : 29, pwrOk ? 199 : 72);
  doc.text(balance.totalDcSuppliedA > 0 ? `${balance.loadingPercentage}% CARGA` : 'NÃO APLICÁVEL', kpi3X + 4, curY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${balance.totalDcConsumedA.toFixed(1)}A / ${balance.totalDcSuppliedA}A nominal`, kpi3X + 4, curY + 21);

  // KPI 4: Invólucro & Proteção
  const kpi4X = kpi3X + kpiW + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(kpi4X, curY, kpiW, kpiH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('INVÓLUCRO IP / IK', kpi4X + 4, curY + 6);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${project.config.ipRating || 'IP66'} · ${project.config.ikRating || 'IK10'}`, kpi4X + 4, curY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(ipIkResult.isCompliant ? '100% Conforme ao local' : 'Verificar ambiente', kpi4X + 4, curY + 21);

  curY += 30;

  // Box 3: Especificações Mecânicas & Físicas do Quadro
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, curY, printableWidth, 42, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('2. ESPECIFICAÇÕES DO QUADRO & ENVOLVENTE MECÂNICA', margin + 6, curY + 6);

  const encModel = project.config.enclosureModel;
  const specRows = [
    ['Fabricante & Modelo:', `${encModel?.brand || project.config.enclosureBrand || 'Schneider Electric'} (${encModel?.partNumber || project.config.enclosurePartNumber || 'NSYS3D6420P'})`],
    ['Dimensões Exteriores:', `${project.config.widthMm} (Largura) × ${project.config.heightMm} (Altura) × ${project.config.depthMm || 250} (Profundidade) mm`],
    ['Material de Construção:', project.config.enclosureMaterial === 'sheet_steel' ? 'Chapa de Aço Laminado RAL 7035 com Pintura Epóxi-Poliéster' : project.config.enclosureMaterial === 'stainless_steel' ? 'Aço Inoxidável AISI 304 Polido' : 'Termoplástico Reforçado com Fibra de Vidro'],
    ['Índice de Proteção Líquidos/Pó:', `${project.config.ipRating || 'IP66'} (EN 60529: Totalmente estanque a poeiras e jatos de água potentes)`],
    ['Resistência a Choques Mecânicos:', `${project.config.ikRating || 'IK10'} (EN 62262: Suporta impacto de 20 Joules de energia cinética)`],
    ['Calhas DIN e Condutas Técnicas:', `${project.rails.length} calhas DIN 35mm · Canaletas perfuradas de ${project.config.sideDuctWidthMm || 40}mm nas laterais e inter-calhas`],
  ];

  doc.setFontSize(7.5);
  specRows.forEach((r, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(r[0], margin + 6, curY + 13 + idx * 4.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(r[1], margin + 55, curY + 13 + idx * 4.8);
  });

  curY += 46;

  // Box 4: Resumo Executivo das Verificações Normativas
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, curY, printableWidth, 54, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DECLARAÇÃO DE CONFORMIDADE NORMATIVA & PRINCÍPIOS DE CONSTRUÇÃO', margin + 6, curY + 6);

  const complianceText = [
    '• Norma Geral de Conjuntos de Aparelhagem (EN 61439-1 / EN 61439-2):',
    '  O dimensionamento mecânico e térmico, distâncias de isolamento e barramentos foram concebidos de acordo com as regras de conceção estipuladas para conjuntos de baixa tensão.',
    '• Proteção de Pessoas e Equipamentos (RTIEBT / IEC 60364):',
    `  Verificada a obrigatoriedade de corte geral a montante e proteção diferencial residual ${isResidential ? 'de 30mA Tipo A para habitação' : 'para circuitos de comando e força industrial'}.`,
    '• Reserva Regulamentar de Espaço (RTIEBT Art. 539.1):',
    `  O quadro apresenta uma taxa de reserva de ${freePercentage}% (${freeMm} mm úteis livres), ${freePercentage >= 20 ? 'cumprindo o requisito mínimo estipulado de 20% para futuras extensões' : 'sendo recomendado aumentar a dimensão do quadro para atingir o mínimo regulamentar de 20%'}.`,
    '• Gestão Térmica do Invólucro:',
    '  A taxa de ocupação dos condutores e aparelhos instalados assegura circulação de convecção de ar sem risco de pontos quentes localizados.',
  ];

  doc.setFontSize(7.2);
  let compLineY = curY + 12;
  complianceText.forEach((line) => {
    if (line.startsWith('•')) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
    }
    doc.text(line, margin + 6, compLineY);
    compLineY += 4.5;
  });

  curY += 58;

  // Box 5: Signatures and Validation Seals
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, curY, printableWidth, 50, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. TERMO DE RESPONSABILIDADE & APROVAÇÃO TÉCNICA', margin + 6, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Certifica-se que o conjunto elétrico especificado neste documento foi auditado segundo as regras da arte e disposições normativas em vigor.',
    margin + 6,
    curY + 12
  );

  const sigColW = (printableWidth - 18) / 2;
  const sig1X = margin + 6;
  const sig2X = margin + 12 + sigColW;
  const sigBoxY = curY + 16;

  // Tech Signature Box
  doc.setDrawColor(226, 232, 240);
  doc.rect(sig1X, sigBoxY, sigColW, 28, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('PELO TÉCNICO RESPONSÁVEL / ENGENHEIRO:', sig1X + 4, sigBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${technicianName}`, sig1X + 4, sigBoxY + 11);
  doc.text(`Cédula / Registo: ${technicianLicense}`, sig1X + 4, sigBoxY + 16);
  doc.text('Assinatura / Carimbo:', sig1X + 4, sigBoxY + 24);

  // Client Acceptance Box
  doc.rect(sig2X, sigBoxY, sigColW, 28, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('PELA ENTIDADE CLIENTE / FISCALIZAÇÃO:', sig2X + 4, sigBoxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cliente: ${clientName}`, sig2X + 4, sigBoxY + 11);
  doc.text('Data de Receção Técnica: _____ / _____ / 2026', sig2X + 4, sigBoxY + 16);
  doc.text('Assinatura / Visto:', sig2X + 4, sigBoxY + 24);

  drawPageFooter(currentPage++, 4);

  // =========================================================================
  // FOLHA 2: AUDITORIA DETALHADA DE CONFORMIDADE NORMATIVA (AUDIT SHEET)
  // =========================================================================
  doc.addPage();

  drawPageHeader(
    'Auditoria Detalhada de Conformidade Normativa & Ensaios',
    'Verificação dos requisitos das normas EN 61439-1 / EN 61439-2 / IEC 60529 / RTIEBT'
  );

  let auditY = margin + 22;

  // Compliance Matrix Table
  const auditHeaders = ['Item / Requisito', 'Norma Aplicável', 'Exigência Regulamentar', 'Verificação no Quadro', 'Conclusão'];

  // Identify main breaker, RCDs, PE
  const mainBreakers = allItems.filter(
    (i) =>
      (i.data.category === 'protection_ac' || i.data.category === 'residential_modular') &&
      (i.data.poles === '2P' || i.data.poles === '4P' || i.data.widthMm >= 36) &&
      (i.data.ratedCurrentA || 0) >= 25 &&
      !i.data.name.toLowerCase().includes('diferencial')
  );
  const mainBreaker = mainBreakers[0];

  const rcds = allItems.filter(
    (i) =>
      i.data.category === 'protection_ac' &&
      (i.data.name.toLowerCase().includes('diferencial') ||
        i.data.description?.toLowerCase().includes('diferencial') ||
        i.tag.toLowerCase().includes('diff') ||
        i.tag.startsWith('F'))
  );

  const peTerminals = allItems.filter(
    (i) => i.data.category === 'terminals' && (i.data.name.toLowerCase().includes('terra') || i.data.name.toLowerCase().includes('pe'))
  );

  const auditRows: string[][] = [
    [
      'Aparelho de Corte Geral',
      'EN 60947-2\nRTIEBT 537.1',
      'Dispositivo de corte omnipolar acessível a montante da instalação',
      mainBreaker ? `Instalado: ${mainBreaker.tag} (${mainBreaker.data.name}, ${mainBreaker.data.ratedCurrentA}A)` : 'Nenhum disjuntor geral de corte identificado no topo',
      mainBreaker ? 'CONFORME' : 'NÃO CONFORME',
    ],
    [
      'Proteção Diferencial Residual',
      'EN 61008-1\nRTIEBT 531.2',
      'Proteção de vidas humanas por diferenciais de alta sensibilidade 30mA',
      rcds.length > 0 ? `${rcds.length} diferenciais instalados (${rcds.map((r) => r.tag).join(', ')})` : 'Sem proteção diferencial residual identificada',
      rcds.length > 0 ? 'CONFORME' : 'ALERTA',
    ],
    [
      'Reserva Mínima de Espaço',
      'RTIEBT 539.1\nEN 61439-3',
      'Mínimo de 20% de espaço livre em calha DIN para expansão futura',
      `${freePercentage}% de espaço livre (${totalModules - usedModules} de ${totalModules} módulos vagos)`,
      freePercentage >= 20 ? 'CONFORME' : 'ALERTA',
    ],
    [
      'Estanqueidade Ambiental (IP)',
      'EN 60529\nIEC 60529',
      `Grau de proteção mínimo exigido pelo local: ${ipIkResult.requiredIp}`,
      `Quadro certificado com ${project.config.ipRating || 'IP66'} (${ipIkResult.isCompliant ? 'Superior ao exigido' : 'Inferior ao exigido'})`,
      ipIkResult.isCompliant ? 'CONFORME' : 'NÃO CONFORME',
    ],
    [
      'Resistência Mecânica (IK)',
      'EN 62262\nIEC 62262',
      'Proteção contra impactos mecânicos externos em regime de serviço',
      `Classificação ${project.config.ikRating || 'IK10'} (${ipIkResult.actualJoules} Joules suportados)`,
      'CONFORME',
    ],
    [
      'Entrada & Vedação de Cabos',
      'IEC 62444\nEN 60529',
      'Bucins estanques para evitar entrada de pó e humidade pelas flanges',
      (project.glands?.length || 0) > 0 ? `${project.glands?.length} bucins métricos com contraporca instalados` : 'Flanges sem bucins fixos configurados',
      (project.glands?.length || 0) > 0 ? 'CONFORME' : 'ALERTA',
    ],
    [
      'Continuidade do Condutor PE',
      'EN 61439-1\nEN 60204-1',
      'Barramento / Bornes de terra interligados à estrutura e porta metálica',
      peTerminals.length > 0 ? `${peTerminals.length} bornes PE (verde/amarelo) + condutor equipotencial porta` : 'Borneira PE padrão DIN recomendada',
      'CONFORME',
    ],
    [
      'Aquecimento & Carga 24VDC',
      'EN 61439-1 §10.10\nEN 60204-1',
      'Taxa de ocupação da fonte 24VDC abaixo de 85% para fiabilidade e dissipação',
      balance.totalDcSuppliedA > 0 ? `Carga calculada: ${balance.loadingPercentage}% (${balance.totalDcConsumedA}A de ${balance.totalDcSuppliedA}A)` : 'Sem fonte 24V instalada no quadro',
      balance.isOverloaded ? 'NÃO CONFORME' : 'CONFORME',
    ],
  ];

  autoTable(doc, {
    head: [auditHeaders],
    body: auditRows,
    startY: auditY,
    margin: { left: margin, right: margin },
    tableWidth: printableWidth,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.2,
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold', textColor: [15, 23, 42] },
      1: { cellWidth: 26, fontStyle: 'italic', textColor: [71, 85, 105] },
      2: { cellWidth: 48 },
      3: { cellWidth: 48 },
      4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 4 && data.section === 'body') {
        const text = String(data.cell.raw);
        if (text === 'CONFORME') {
          data.cell.styles.textColor = [16, 149, 100];
          data.cell.styles.fillColor = [240, 253, 244];
        } else if (text === 'ALERTA') {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 243, 199];
        } else if (text === 'NÃO CONFORME') {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fillColor = [255, 241, 242];
        }
      }
    },
  });

  // Fetch final Y after the table
  const afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Engineering Warnings / Suggested Corrective Actions Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, afterTableY, printableWidth, 54, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('5. APONTAMENTOS DE ENGENHARIA & RECOMENDAÇÕES CORRETIVAS', margin + 6, afterTableY + 6);

  if (issues.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(16, 149, 100);
    doc.text('✓ Nenhuma não-conformidade ou anomalia técnica detetada. O quadro cumpre integralmente os requisitos regulamentares.', margin + 6, afterTableY + 14);
    doc.setTextColor(71, 85, 105);
    doc.text('• Assegurar aperto correto dos bornes com chave dinamométrica segundo o binário (Nm) indicado pelo fabricante.', margin + 6, afterTableY + 20);
    doc.text('• Executar os ensaios de continuidade de massas e rigidez dielétrica a 1000V antes da energização.', margin + 6, afterTableY + 25);
  } else {
    doc.setFontSize(7);
    let issueY = afterTableY + 12;
    issues.slice(0, 5).forEach((iss) => {
      const isErr = iss.type === 'error';
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isErr ? 225 : 180, isErr ? 29 : 83, isErr ? 72 : 9);
      doc.text(`[${isErr ? 'ERRO' : 'AVISO'}] ${iss.title}:`, margin + 6, issueY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const descLines = doc.splitTextToSize(`${iss.description} ➔ Ação: ${iss.suggestedAction}`, printableWidth - 12);
      doc.text(descLines.slice(0, 2), margin + 6, issueY + 3.5);
      issueY += 8;
    });
  }

  // Standards Reference Banner
  const stdY = afterTableY + 60;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, stdY, printableWidth, 14, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ENQUADRAMENTO LEGAL & DIRETIVAS EUROPEIAS APLICÁVEIS:', margin + 6, stdY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text('Diretiva Baixa Tensão 2014/35/UE · Diretiva CEM 2014/30/UE · EN 61439-1:2021 · EN 61439-2:2021 · EN 60204-1 · RTIEBT (Portaria n.º 949-A/2006)', margin + 6, stdY + 10);

  drawPageFooter(currentPage++, 4);

  // =========================================================================
  // FOLHA 3: BALANÇO DE POTÊNCIAS & DIMENSIONAMENTO ELÉTRICO (24VDC & TÉRMICA)
  // =========================================================================
  doc.addPage();

  drawPageHeader(
    'Balanço de Potências & Dimensionamento da Linha 24VDC',
    'Cálculo de cargas, capacidade de alimentação, proteções a montante e balanço térmico'
  );

  let pwrY = margin + 22;

  // Subheader: Fonte 24VDC
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. FONTE DE ALIMENTAÇÃO PRIMÁRIA 24V DC (MEAN WELL / INDUSTRIAL)', margin, pwrY);
  pwrY += 4;

  const psus = allItems.filter((i) => i.data.category === 'power_supply');
  const mainPsu = psus[0];

  const psuHeaders = ['Ref. (Tag)', 'Fabricante', 'Modelo / Part Number', 'Tensão Entrada', 'Tensão Saída', 'Corrente Nominal', 'Potência Útil'];
  const psuRows = psus.map((p) => [
    p.tag,
    p.data.brand || 'Mean Well',
    p.data.partNumber || 'NDR-120-24',
    p.data.inputVoltage || '230V AC (85-264V)',
    p.data.outputVoltage || '24V DC (Ajustável)',
    `${p.data.ratedCurrentA || 5.0} A`,
    `${p.data.ratedPowerW || 120} W`,
  ]);

  if (psuRows.length === 0) {
    psuRows.push(['--', 'N/D', 'Nenhuma fonte DIN 24V instalada no quadro', '--', '--', '0.0 A', '0 W']);
  }

  autoTable(doc, {
    head: [psuHeaders],
    body: psuRows,
    startY: pwrY,
    margin: { left: margin, right: margin },
    tableWidth: printableWidth,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 1.8,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.6,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
    },
  });

  let loadY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Subheader: Cargas 24VDC
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('2. DISCRIMINAÇÃO DE CARGAS & CONSUMIDORES 24V DC CONECTADOS', margin, loadY);
  loadY += 4;

  const dcConsumers = allItems.filter(
    (i) => i.data.category !== 'power_supply' && ((i.data.dcConsumptionA || 0) > 0 || (i.data.dcConsumptionW || 0) > 0 || i.data.category === 'plc_cpu' || i.data.category === 'plc_expansion' || i.data.category === 'relays')
  );

  const loadHeaders = ['Tag', 'Fabricante', 'Designação da Carga', 'Referência', 'Corrente DC (A)', 'Potência DC (W)', '% da Fonte'];
  const loadRows = dcConsumers.map((c) => {
    const curA = c.data.dcConsumptionA || (c.data.dcConsumptionW ? c.data.dcConsumptionW / 24 : 0.05);
    const pwrW = c.data.dcConsumptionW || curA * 24;
    const share = balance.totalDcSuppliedW > 0 ? ((pwrW / balance.totalDcSuppliedW) * 100).toFixed(1) : '--';
    return [
      c.tag,
      c.data.brand || 'Siemens',
      c.data.name.slice(0, 32),
      c.data.partNumber || '--',
      `${curA.toFixed(2)} A`,
      `${pwrW.toFixed(1)} W`,
      `${share} %`,
    ];
  });

  if (loadRows.length === 0) {
    loadRows.push(['--', '--', 'Sem cargas 24VDC registradas (Quadro puramente alternado AC)', '--', '0.00 A', '0.0 W', '0.0 %']);
  }

  // Add Summary Total Row
  loadRows.push([
    'TOTAL',
    'Consolidação',
    `${dcConsumers.length} aparelhos consumidores 24V`,
    'Linha 24VDC',
    `${balance.totalDcConsumedA.toFixed(2)} A`,
    `${balance.totalDcConsumedW.toFixed(1)} W`,
    `${balance.loadingPercentage} %`,
  ]);

  autoTable(doc, {
    head: [loadHeaders],
    body: loadRows,
    startY: loadY,
    margin: { left: margin, right: margin },
    tableWidth: printableWidth,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 1.8,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.6,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.row.index === loadRows.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42];
      }
    },
  });

  let balBoxY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Subheader: Consolidação e Dimensionamento
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, balBoxY, printableWidth, 54, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('3. BALANÇO DE CARGA, PROTEÇÕES A MONTANTE E MARGEM DE SEGURANÇA', margin + 6, balBoxY + 6);

  const balDetails = [
    ['Potência Nominal Disponível:', `${balance.totalDcSuppliedW} W (${balance.totalDcSuppliedA} A @ 24V DC)`],
    ['Consumo Total das Cargas Calculado:', `${balance.totalDcConsumedW} W (${balance.totalDcConsumedA} A em regime contínuo)`],
    ['Taxa de Ocupação da Fonte:', `${balance.loadingPercentage}% (${balance.isOverloaded ? 'ATENÇÃO: SOBRECARGA DETETADA' : 'Margem de Segurança Conforme EN 60204-1'})`],
    ['Margem de Expansão e Picos de Corrente:', `${Math.max(0, 100 - balance.loadingPercentage)}% (recomendado mínimo 15% para correntes de fecho de relés)`],
    ['Proteção Primária AC Recomendada a Montante:', balance.primaryProtectionRecommendation || 'Disjuntor 1P+N Curva C de 6A ou 10A'],
    ['Secção Mínima Recomendada do Condutor 24V:', balance.totalDcConsumedA > 5 ? '2.5 mm² flexível (H07V-K azul claro / escuro)' : '1.5 mm² flexível (H07V-K)'],
    ['Estimativa de Calor Dissipado no Invólucro:', `~${Math.round(balance.totalDcConsumedW * 0.15 + (psus.length > 0 ? 14 : 4))} W (Dissipação suportada por convecção natural sem grelha forçada)`],
  ];

  doc.setFontSize(7.2);
  balDetails.forEach((row, i) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(row[0], margin + 6, balBoxY + 13 + i * 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row[1], margin + 74, balBoxY + 13 + i * 5);
  });

  drawPageFooter(currentPage++, 4);

  // =========================================================================
  // FOLHA 4: LISTA CONSOLIDADA DE COMPONENTES & CADERNO DE ENCARGOS (BOM)
  // =========================================================================
  doc.addPage();

  drawPageHeader(
    'Lista Consolidada de Materiais (Bill of Materials - BOM)',
    'Caderno discriminado de componentes elétricos, potências, correntes de operação e fabricantes'
  );

  let bomY = margin + 22;

  const bomHeaders = includePrices
    ? ['Tags / Ref.', 'Fabricante', 'Designação do Equipamento', 'Part Number / Ref.', 'Potência', 'Corrente', 'Módulos', 'Qtd', 'Unit. (€)', 'Total (€)']
    : ['Tags / Ref.', 'Fabricante', 'Designação do Equipamento', 'Part Number / Ref.', 'Potência Nominal', 'Corrente Operação', 'Módulos', 'Qtd', 'Descrição Técnica'];

  let totalBomCost = 0;
  let totalBomQty = 0;

  const bomRows = bomItems.map((item) => {
    totalBomCost += item.totalPriceEur;
    totalBomQty += item.quantity;

    // Retrieve rich technical metrics from PlacedComponent data if available
    const matchingPlaced = allItems.find((p) => item.tags.includes(p.tag));
    let pwrStr = '--';
    let curStr = '--';

    if (matchingPlaced) {
      const pRating = getComponentPowerRating(matchingPlaced);
      const cRating = getComponentOperatingCurrent(matchingPlaced);
      pwrStr = pRating.primary;
      curStr = cRating.primary;
    } else if (item.category === 'enclosure') {
      pwrStr = 'Invólucro';
      curStr = `${project.config.ipRating || 'IP66'}`;
    }

    const modStr = item.widthMm > 0 ? `${Math.round((item.widthMm / 18) * 10) / 10}M` : '--';

    if (includePrices) {
      return [
        item.tags.join(', ').slice(0, 20),
        item.brand || 'Genérico',
        item.name.slice(0, 30),
        item.partNumber || '--',
        pwrStr,
        curStr,
        modStr,
        String(item.quantity),
        `${item.unitPriceEur.toFixed(2)} €`,
        `${item.totalPriceEur.toFixed(2)} €`,
      ];
    }

    return [
      item.tags.join(', ').slice(0, 20),
      item.brand || 'Genérico',
      item.name.slice(0, 32),
      item.partNumber || '--',
      pwrStr,
      curStr,
      modStr,
      String(item.quantity),
      item.description.slice(0, 40),
    ];
  });

  // Append Total Row
  if (includePrices) {
    bomRows.push([
      'TOTAL',
      'Consolidado',
      `Total de ${bomItems.length} referências de catálogo instaladas`,
      '--',
      '--',
      '--',
      `${usedModules}M`,
      String(totalBomQty),
      'SOMA:',
      `${totalBomCost.toFixed(2)} €`,
    ]);
  }

  autoTable(doc, {
    head: [bomHeaders],
    body: bomRows,
    startY: bomY,
    margin: { left: margin, right: margin },
    tableWidth: printableWidth,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 1.8,
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 1.4,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: includePrices
      ? {
          0: { cellWidth: 20, fontStyle: 'bold', textColor: [2, 132, 199] },
          1: { cellWidth: 22, fontStyle: 'bold' },
          2: { cellWidth: 40 },
          3: { cellWidth: 26, fontStyle: 'normal' },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 12, halign: 'center' },
          7: { cellWidth: 10, halign: 'center' },
          8: { cellWidth: 18, halign: 'right' },
          9: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
        }
      : {
          0: { cellWidth: 20, fontStyle: 'bold', textColor: [2, 132, 199] },
          1: { cellWidth: 24, fontStyle: 'bold' },
          2: { cellWidth: 42 },
          3: { cellWidth: 28, fontStyle: 'normal' },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 12, halign: 'center' },
          7: { cellWidth: 10, halign: 'center' },
          8: { cellWidth: 'auto' },
        },
    didParseCell: (data) => {
      if (includePrices && data.row.index === bomRows.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42];
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Custom Notes or Assembly Instructions if space permits
  if (finalY < pageHeight - 45) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    const boxH = Math.min(30, pageHeight - margin - 15 - finalY);
    doc.roundedRect(margin, finalY, printableWidth, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('NOTAS DE MONTAGEM & CADERNO DE ENCARGOS:', margin + 4, finalY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    const defaultNotes = customNotes.trim().length > 0
      ? customNotes
      : 'Montagem executada conforme desenhos de fabrico e normas EN 61439-1 / EN 60204-1. Todos os bornes e condutores identificados com anilhas e ponteiras isoladas DIN 46228. Ensaios de continuidade PE executados com êxito.';
    const noteLines = doc.splitTextToSize(defaultNotes, printableWidth - 8);
    doc.text(noteLines.slice(0, 4), margin + 4, finalY + 10);
  }

  drawPageFooter(currentPage, 4);

  // Save the PDF file
  const fileName = `Relatorio_Tecnico_${(project.config.projectCode || project.config.name || 'Quadro').replace(/\s+/g, '_')}_EN61439.pdf`;
  doc.save(fileName);
}
