import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectState } from '../types/electrical';
import { calculatePowerBalance } from './calculations';
import { getConsolidatedBom } from './bomUtils';
import { generateSchematicSvgString, SchematicTheme } from './schematicSvgRenderer';
import { generateCabinetLayoutSvgString } from './cabinetLayoutSvgRenderer';
import { generateControlPanelSvgString } from './controlPanelSvgRenderer';
import { executeAutoRouter } from './autoRouterEngine';
import { verifyEnclosureIpIk } from './ipIkVerification';

export interface SchematicPdfExportOptions {
  theme?: SchematicTheme; // 'light' (Technical Paper / Print) or 'dark' (Blueprint CAD)
  includeCover?: boolean; // Capa executiva de apresentação técnica
  includeLayout2D?: boolean; // Prancha 2D da disposição mecânica do quadro
  includeControlPanel?: boolean; // Prancha da Porta & Painel de Controlo HMI (Layout 2D e Medidas de Furação CNC)
  includeBreakersTerminalsSchematic?: boolean; // Disjuntores ➔ Blocos Terminais (Auto-Router)
  includePowerSchematic?: boolean; // Esquema Geral de Potência AC
  includeControlSchematic?: boolean; // Distribuição 24VDC & PLC Siemens (I/O)
  includeEngineeringReport?: boolean; // Balanço 24V, Térmica, Bucins & Verificação IP/IK
  includeWireSchedule?: boolean; // Caderno de Cablagem Auto-Router (Wire List & Anilhas)
  includeBom?: boolean; // Lista Consolidada de Materiais (BOM)
  includePrices?: boolean; // Preços unitários e totais
  includeComplianceDeclaration?: boolean; // Declaração de Conformidade CE & Ensaios
  paperFormat?: 'a4' | 'a3';
  companyName?: string;
  technicianName?: string;
  clientName?: string;
  revision?: string;
  customNotes?: string;
}

/**
 * Converts an SVG XML string into a high-resolution PNG data URL using an offscreen canvas.
 */
export async function convertSvgStringToPng(
  svgString: string,
  width: number = 2400,
  height: number = 1600,
  bgColor: string = '#ffffff'
): Promise<string> {
  // Pre-process and sanitize XML to ensure no unescaped ampersands or malformed entities exist
  let sanitizedSvg = svgString.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

  // Verify XML validity
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(sanitizedSvg, 'image/svg+xml');
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.warn('XML parser warning in SVG string, attempting clean recovery:', parserError.textContent);
      try {
        sanitizedSvg = new XMLSerializer().serializeToString(xmlDoc);
      } catch {
        // use sanitizedSvg as is
      }
    }
  }

  return new Promise((resolve, reject) => {
    const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitizedSvg)}`;
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png', 0.95);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      // Fallback: try blob URL if dataUri failed
      try {
        const blob = new Blob([sanitizedSvg], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const fallbackImg = new Image();

        fallbackImg.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = bgColor;
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(fallbackImg, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/png', 0.95);
              URL.revokeObjectURL(blobUrl);
              resolve(dataUrl);
              return;
            }
          } catch (e) {
            console.error('Error drawing fallback image:', e);
          }
          URL.revokeObjectURL(blobUrl);
          reject(new Error('Failed to rasterize SVG canvas'));
        };

        fallbackImg.onerror = (e) => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error(`Failed to load SVG into image: ${e}`));
        };

        fallbackImg.src = blobUrl;
      } catch (fallbackErr) {
        reject(fallbackErr);
      }
    };

    img.src = dataUri;
  });
}

/**
 * Builds the complete formatted PDF containing the schematics, project data, and bill of materials.
 */
export async function buildSchematicPdfDoc(
  project: ProjectState,
  options: SchematicPdfExportOptions = {}
): Promise<jsPDF> {
  const {
    theme = 'light',
    includeCover = true,
    includeLayout2D = true,
    includeControlPanel = true,
    includeBreakersTerminalsSchematic = true,
    includePowerSchematic = true,
    includeControlSchematic = true,
    includeEngineeringReport = true,
    includeWireSchedule = true,
    includeBom = true,
    includePrices = true,
    includeComplianceDeclaration = true,
    paperFormat = 'a4',
    companyName = 'Eletrotécnica & Automação Industrial, Lda.',
    technicianName = project.config.designerName || 'Engenheiro Responsável / Instalador Credenciado',
    clientName = project.config.clientName || 'Cliente Industrial / Linha de Produção',
    revision = 'Rev. 1.0',
    customNotes = project.config.notes || '',
  } = options;

  // Initialize jsPDF in Landscape orientation (standard for electrical engineering drawings)
  const isA3 = paperFormat === 'a3';
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: isA3 ? 'a3' : 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8; // mm
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  let pageIndex = 0;

  // Helper to add a new page if not the very first page
  const ensurePage = () => {
    if (pageIndex > 0) {
      doc.addPage(isA3 ? 'a3' : 'a4', 'landscape');
    }
    pageIndex++;
  };

  const bgCanvasColor = theme === 'dark' ? '#0f172a' : '#ffffff';

  // =========================================================================
  // FOLHA 1: CAPA EXECUTIVA DE APRESENTAÇÃO TÉCNICA DO PROJETO
  // =========================================================================
  if (includeCover) {
    ensurePage();

    // Outer double border
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.2);
    doc.rect(margin, margin, printableWidth, printableHeight);

    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.4);
    doc.rect(margin + 2.5, margin + 2.5, printableWidth - 5, printableHeight - 5);

    // Top Brand & Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(margin + 2.5, margin + 2.5, printableWidth - 5, 26, 'F');

    // Lightning icon box
    doc.setFillColor(2, 132, 199);
    doc.roundedRect(margin + 8, margin + 6, 16, 16, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('⚡', margin + 11.5, margin + 17.5);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ELECTROCAD DIN — ENGENHARIA DE QUADROS ELÉTRICOS', margin + 28, margin + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`DIRETIVA BAIXA TENSÃO 2014/35/UE · NORMAS EN 61439-1 / EN 61439-2 · ${companyName}`, margin + 28, margin + 20);

    // Project Identification Highlight Box
    const boxY = margin + 35;
    const boxW = printableWidth - 10;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin + 5, boxY, boxW, 46, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(2, 132, 199);
    doc.text('PROJETO TÉCNICO DE EXECUÇÃO', margin + 12, boxY + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(project.config.name || 'Quadro Elétrico de Automação e Distribuição', margin + 12, boxY + 20);

    // Reference Code Tag Badge
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin + 12, boxY + 26, 42, 12, 2, 2, 'F');
    doc.setTextColor(56, 189, 248);
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text(project.config.projectCode || 'QUAD-001', margin + 16, boxY + 34);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Aplicação: ${project.config.applicationType === 'residential' ? 'Residencial / Habitação (RTIEBT / EN 61439-3)' : 'Industrial / Automação de Máquinas (EN 60204-1 / EN 61439-2)'}`, margin + 60, boxY + 32);
    doc.text(`Alimentação: ${project.config.supplyVoltage || '230V AC'} 50Hz · Grau de Proteção: ${project.config.ipRating || 'IP55'} / ${project.config.ikRating || 'IK08'}`, margin + 60, boxY + 38);

    // Left Column: Client & Technician Details Card
    const colW = (printableWidth - 16) / 2;
    const cardY = boxY + 52;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin + 5, cardY, colW, 48, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('DADOS DA INSTALAÇÃO & RESPONSABILIDADE TÉCNICA', margin + 10, cardY + 8);

    const clientRows = [
      ['Cliente / Instalação:', clientName],
      ['Projetista / Instalador:', technicianName],
      ['Empresa Responsável:', companyName],
      ['Data de Emissão:', `${project.config.date || new Date().toISOString().split('T')[0]} (${revision})`],
      ['Regulamento Base:', project.config.applicationType === 'residential' ? 'RTIEBT (Portaria 949-A/2006)' : 'EN 60204-1 / EN 61439-1/2'],
    ];

    clientRows.forEach((r, idx) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(r[0], margin + 10, cardY + 16 + idx * 6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(r[1], margin + 50, cardY + 16 + idx * 6.5);
    });

    // Right Column: Technical Ratings & Nominal Parameters Card
    const rightCardX = margin + 5 + colW + 6;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(rightCardX, cardY, colW, 48, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CARACTERÍSTICAS NOMINAIS DO QUADRO (EN 61439-1)', rightCardX + 5, cardY + 8);

    const ratingsRows = [
      ['Tensão Nominal (Un):', `${project.config.supplyVoltage || '230V AC'} / 50Hz`],
      ['Corrente Estipulada (InA):', `${project.config.supplyVoltage.includes('400V') ? '40 A (Trifásico)' : '32 A (Monofásico)'}`],
      ['Poder de Corte (Icn / Icu):', '6 kA / 10 kA (IEC 60898-1 / IEC 60947-2)'],
      ['Grau de Proteção & Impacto:', `${project.config.ipRating || 'IP55'} / ${project.config.ikRating || 'IK08'} (EN 60529 / EN 62262)`],
      ['Dimensões Exteriores (L×A×P):', `${project.config.widthMm} × ${project.config.heightMm} × ${project.config.depthMm || 250} mm`],
    ];

    ratingsRows.forEach((r, idx) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(r[0], rightCardX + 5, cardY + 16 + idx * 6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(r[1], rightCardX + 52, cardY + 16 + idx * 6.5);
    });

    // Table of Contents (Índice Geral do Dossier Técnico)
    const tocY = cardY + 54;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin + 5, tocY, printableWidth - 10, 36, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('ÍNDICE DO DOSSIER TÉCNICO & PRANCHAS ANEXAS', margin + 10, tocY + 7);

    const tocItems = [
      'Folha 01: Disposição Física & Layout 2D Interior',
      includeControlPanel ? 'Folha 02: Porta Frontal, Painel HMI & Furação CNC' : 'Folha 02: Esquema Unifilar: Disjuntores ➔ Bornes X1',
      includeControlPanel ? 'Folha 03: Esquema Unifilar: Disjuntores ➔ Bornes X1' : 'Folha 03: Esquema Unifilar Geral de Potência AC',
      includeControlPanel ? 'Folha 04: Esquema Unifilar Geral de Potência AC' : 'Folha 04: Esquema Distribuição 24VDC & Siemens PLC',
      includeControlPanel ? 'Folha 05: Esquema Distribuição 24VDC & Siemens PLC' : 'Folha 05: Relatório de Engenharia & Verificação IP/IK',
      includeControlPanel ? 'Folha 06: Relatório de Engenharia & Verificação IP/IK' : 'Folha 06: Caderno de Cablagem Lógica & Marcadores',
      includeControlPanel ? 'Folha 07: Caderno de Cablagem Lógica & Marcadores' : 'Folha 07: Lista Consolidada de Materiais (BOM)',
      includeControlPanel ? 'Folha 08: Lista Consolidada de Materiais (BOM)' : 'Folha 08: Declaração de Conformidade CE & Ensaios',
    ];

    tocItems.forEach((item, idx) => {
      const col = idx < 4 ? 0 : 1;
      const row = idx % 4;
      const tx = margin + 10 + col * (printableWidth / 2 - 10);
      const ty = tocY + 14 + row * 5.2;

      doc.setFillColor(2, 132, 199);
      doc.circle(tx, ty - 1.2, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(51, 65, 85);
      doc.text(item, tx + 3.5, ty);
    });

    // Bottom Compliance & Approval Bar
    const coverFootY = margin + printableHeight - 12;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 5, coverFootY, margin + printableWidth - 5, coverFootY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('CONFORMIDADE: CE · EN 61439-1 / EN 61439-2 · IEC 60617 · RTIEBT · DIRETIVA 2014/35/UE (LVD)', margin + 6, coverFootY + 5);

    doc.setFont('courier', 'bold');
    doc.setTextColor(2, 132, 199);
    doc.text(`DOC REF: ${project.config.projectCode}_TECH_DOSSIER_REV1`, margin + printableWidth - 85, coverFootY + 5);
  }

  // =========================================================================
  // FOLHA 2: PRANCHA 01 - DISPOSIÇÃO FÍSICA & LAYOUT 2D DO QUADRO
  // =========================================================================
  if (includeLayout2D) {
    ensurePage();
    const layoutSvg = generateCabinetLayoutSvgString(project, theme);
    try {
      const layoutPng = await convertSvgStringToPng(layoutSvg, 2400, 1600, bgCanvasColor);
      doc.addImage(layoutPng, 'PNG', margin, margin, printableWidth, printableHeight, undefined, 'FAST');
    } catch (err) {
      console.error('Error rasterizing Cabinet Layout for PDF:', err);
    }
  }

  // =========================================================================
  // FOLHA: PRANCHA - PORTA FRONTAL, PAINEL HMI & MAPA DE FURAÇÃO CNC
  // =========================================================================
  if (includeControlPanel) {
    ensurePage();
    const controlPanelSvg = generateControlPanelSvgString(project, theme);
    try {
      const panelPng = await convertSvgStringToPng(controlPanelSvg, 2400, 1600, bgCanvasColor);
      doc.addImage(panelPng, 'PNG', margin, margin, printableWidth, printableHeight, undefined, 'FAST');
    } catch (err) {
      console.error('Error rasterizing Control Panel Layout for PDF:', err);
    }
  }

  // =========================================================================
  // FOLHA: PRANCHA - ESQUEMA UNIFILAR (DISJUNTORES ➔ BLOCOS TERMINAIS COM AUTO-ROUTER)
  // =========================================================================
  if (includeBreakersTerminalsSchematic) {
    ensurePage();
    const btSvg = generateSchematicSvgString(project, 'breakers_terminals', theme);
    try {
      const btPng = await convertSvgStringToPng(btSvg, 2400, 1600, bgCanvasColor);
      doc.addImage(btPng, 'PNG', margin, margin, printableWidth, printableHeight, undefined, 'FAST');
    } catch (err) {
      console.error('Error rasterizing Breakers-Terminals schematic for PDF:', err);
    }
  }

  // =========================================================================
  // FOLHA 4: PRANCHA 03 - ESQUEMA UNIFILAR GERAL DE POTÊNCIA (AC & DC)
  // =========================================================================
  if (includePowerSchematic) {
    ensurePage();
    const powerSvg = generateSchematicSvgString(project, 'power', theme);
    try {
      const powerPng = await convertSvgStringToPng(powerSvg, 2400, 1600, bgCanvasColor);
      doc.addImage(powerPng, 'PNG', margin, margin, printableWidth, printableHeight, undefined, 'FAST');
    } catch (err) {
      console.error('Error rasterizing Power schematic for PDF:', err);
    }
  }

  // =========================================================================
  // FOLHA 5: PRANCHA 04 - ESQUEMA DE DISTRIBUIÇÃO 24VDC & SIEMENS PLC (I/O)
  // =========================================================================
  if (includeControlSchematic) {
    ensurePage();
    const controlSvg = generateSchematicSvgString(project, 'control', theme);
    try {
      const controlPng = await convertSvgStringToPng(controlSvg, 2400, 1600, bgCanvasColor);
      doc.addImage(controlPng, 'PNG', margin, margin, printableWidth, printableHeight, undefined, 'FAST');
    } catch (err) {
      console.error('Error rasterizing Control schematic for PDF:', err);
    }
  }

  // =========================================================================
  // FOLHA 6: PRANCHA 05 - RELATÓRIO DE ENGENHARIA, TÉRMICA & VERIFICAÇÃO IP/IK
  // =========================================================================
  if (includeEngineeringReport) {
    ensurePage();

    // Outer frame & border
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(margin, margin, printableWidth, printableHeight);

    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.3);
    doc.rect(margin + 2, margin + 2, printableWidth - 4, printableHeight - 4);

    // Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(margin + 2, margin + 2, printableWidth - 4, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('RELATÓRIO DE ENGENHARIA ELÉTRICA & VERIFICAÇÕES NORMATIVAS (EN 61439 / EN 60529)', margin + 8, margin + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`VERIFICAÇÃO DE PROJETO SEGUNDO EN 61439-1 CLÁUSULA 10 · AMBIENTE: ${project.config.installationEnvironment || 'Ambiente Fabril / Oficina'} · ${companyName}`, margin + 8, margin + 16);

    const colW = (printableWidth - 12) / 2;
    let y = margin + 26;

    // Card 1: Project Details
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin + 4, y, colW, 46, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('1. IDENTIFICAÇÃO DO PROJETO & CLIENTE', margin + 8, y + 6);

    const leftData = [
      ['Designação do Projeto:', project.config.name || 'Quadro de Automação'],
      ['Código / Referência:', project.config.projectCode || 'QUAD-001'],
      ['Cliente / Instalação:', clientName],
      ['Projetista / Instalador:', technicianName],
      ['Data de Emissão & Revisão:', `${project.config.date || new Date().toISOString().split('T')[0]} (${revision})`],
    ];

    leftData.forEach((row, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(row[0], margin + 8, y + 13 + i * 6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(row[1], margin + 50, y + 13 + i * 6.5);
    });

    // Card 2: Enclosure Specifications & IP/IK Verification
    y += 50;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin + 4, y, colW, 52, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('2. CARACTERÍSTICAS MECÂNICAS & CONFORMIDADE IP / IK', margin + 8, y + 6);

    const ipIkResult = verifyEnclosureIpIk(project.config);
    const totalComps = project.rails.reduce((acc, r) => acc + r.items.length, 0);

    const mechData = [
      ['Dimensões Exteriores (L×A×P):', `${project.config.widthMm} × ${project.config.heightMm} × ${project.config.depthMm || 250} mm`],
      ['Grau Estanqueidade IP (EN 60529):', `${project.config.ipRating || 'IP55'} (${ipIkResult.isCompliant ? 'CONFORME ao ambiente' : 'VERIFICAR EXIGÊNCIA'})`],
      ['Resistência Impacto IK (EN 62262):', `${project.config.ikRating || 'IK08'} (${ipIkResult.actualJoules} Joules suportados)`],
      ['Material do Invólucro:', project.config.enclosureMaterial === 'sheet_steel' ? 'Chapa de Aço Laminado RAL 7035' : project.config.enclosureMaterial === 'stainless_steel' ? 'Aço Inox AISI 304' : 'Termoplástico Reforçado'],
      ['Calhas DIN & Canaletas:', `${project.rails.length} calhas DIN 35mm | Calhas técnicas ${project.config.sideDuctWidthMm || 40}mm`],
      ['Total de Aparelhos Instalados:', `${totalComps} componentes montados e identificados`],
    ];

    mechData.forEach((row, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(row[0], margin + 8, y + 13 + i * 6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(row[1], margin + 60, y + 13 + i * 6.5);
    });

    // Right Column: Power Balance & Cable Glands
    const rightColX = margin + 8 + colW;
    let rightY = margin + 26;

    // Card 3: 24VDC Power Balance Calculation
    const balance = calculatePowerBalance(project);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(rightColX, rightY, colW, 46, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('3. BALANÇO DE POTÊNCIAS & LINHA 24VDC (MEAN WELL)', rightColX + 4, rightY + 6);

    const balanceData = [
      ['Capacidade Nominal da Fonte 24VDC:', `${balance.totalDcSuppliedA} A (${balance.totalDcSuppliedW} W)`],
      ['Consumo Total Calculado das Cargas:', `${balance.totalDcConsumedA} A (${balance.totalDcConsumedW} W)`],
      ['Taxa de Ocupação da Fonte:', `${balance.loadingPercentage}% (${balance.isOverloaded ? 'SOBRECARGA DETETADA' : 'Margem de segurança OK'})`],
      ['Margem de Reserva Térmica:', `${Math.max(0, 100 - balance.loadingPercentage)}% (para expansão e picos de arranque)`],
      ['Conformidade EN 61439-1:', balance.isOverloaded ? 'NÃO CONFORME (requer upgrade)' : 'CONFORME (dimensionamento validado)'],
    ];

    balanceData.forEach((row, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(row[0], rightColX + 4, rightY + 13 + i * 6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(row[1], rightColX + 62, rightY + 13 + i * 6.5);
    });

    // Card 4: Cable Glands (Bucins) Summary
    rightY += 50;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(rightColX, rightY, colW, 52, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('4. MAPA DE FURAÇÃO & ENTRADA DE CABOS (IEC 62444)', rightColX + 4, rightY + 6);

    const glands = project.glands || [];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    if (glands.length > 0) {
      const glandTop = glands.filter((g) => g.location === 'top');
      const glandBottom = glands.filter((g) => g.location === 'bottom');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Total de Bucins Instalados: ${glands.length} bucins métricos com contraporca`, rightColX + 4, rightY + 13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`• Flange Superior (Topo - Entrada): ${glandTop.length} cabos (${glandTop.map((g) => `${g.tag}:${g.size}`).slice(0, 4).join(', ') || 'Sem entrada topo'})`, rightColX + 4, rightY + 20);
      doc.text(`• Flange Inferior (Fundo - Saída): ${glandBottom.length} cabos (${glandBottom.map((g) => `${g.tag}:${g.size}`).slice(0, 4).join(', ') || 'Sem saída fundo'})`, rightColX + 4, rightY + 26);
      doc.text('• Grau de Proteção dos Bucins: IP68 (estanque com anel em neopreno)', rightColX + 4, rightY + 32);
      doc.text('• Norma Aplicável: IEC 62444 (Prensa-cabos para instalações elétricas)', rightColX + 4, rightY + 38);
    } else {
      doc.setTextColor(71, 85, 105);
      doc.text('Nenhum bucim configurado na flange de furação.', rightColX + 4, rightY + 15);
      doc.text('Recomenda-se a inclusão de bucins M20/M25 para garantia de estanqueidade IP55.', rightColX + 4, rightY + 22);
    }

    // Card 5: Project Notes / Caderno de Encargos
    const notesY = y + 56;
    const notesH = printableHeight - (notesY - margin) - 20;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin + 4, notesY, printableWidth - 8, Math.max(34, notesH), 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('5. NOTAS TÉCNICAS, INSTRUÇÕES DE MONTAGEM & CADERNO DE ENCARGOS', margin + 8, notesY + 6);

    const notesToPrint = customNotes.trim().length > 0
      ? customNotes
      : 'Quadro elétrico montado e ensaiado segundo as normas EN 61439-1 e EN 61439-2.\nTodos os condutores foram identificados com anilhas marcadoras de acordo com o esquema unifilar.\nEnsaios de continuidade de proteção PE e isolamento 500V DC executados com sucesso antes do fecho da porta.';

    const splitNotes = doc.splitTextToSize(notesToPrint, printableWidth - 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(splitNotes.slice(0, 7), margin + 8, notesY + 13);

    // Bottom Footer
    const signY = margin + printableHeight - 14;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 4, signY, margin + printableWidth - 4, signY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('DECLARAÇÃO DE CONFORMIDADE: O presente conjunto de aparelhagem cumpre a Diretiva 2014/35/UE (LVD) e norma EN 61439-1.', margin + 8, signY + 4);

    doc.setFont('helvetica', 'normal');
    doc.text(`Técnico Responsável: ${technicianName}`, margin + 8, signY + 10);
    doc.text(`Cliente / Recetor: ${clientName}`, margin + 110, signY + 10);
    doc.text(`Folha 05 · ${project.config.date || '2026'} · ElectroCad DIN`, margin + printableWidth - 65, signY + 10);
  }

  // =========================================================================
  // FOLHA 7: PRANCHA 06 - CADERNO DE CABLAGEM AUTO-ROUTER (WIRE LIST & ANILHAS)
  // =========================================================================
  if (includeWireSchedule) {
    ensurePage();

    // Table Header Info
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(margin, margin, printableWidth, printableHeight);

    // Title banner
    doc.setFillColor(15, 23, 42);
    doc.rect(margin + 2, margin + 2, printableWidth - 4, 16, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('CADERNO DE CABLAGEM LÓGICA AUTO-ROUTER (MAPA DE FIOS, ANILHAS & PONTEIRAS)', margin + 8, margin + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`NORMAS DE CABLAGEM: IEC 60446 / EN 60204-1 · CABOS FLEXÍVEIS H07V-K · PONTEIRAS ISOLADAS DIN 46228`, margin + 8, margin + 14.5);

    const autoRouter = executeAutoRouter(project, { standard: 'iec_60446', style: 'duct_manhattan' });

    // Build rows from all circuit conductors
    const wireRows: string[][] = [];
    let wireTotalMeters = 0;

    autoRouter.circuits.forEach((c) => {
      c.conductors.forEach((cond) => {
        wireTotalMeters += cond.lengthMeters;
        wireRows.push([
          cond.wireTag,
          `${c.breakerTag} (${c.circuitDescription.slice(0, 22)})`,
          `${c.terminalStripTag}:${cond.terminalTag}`,
          cond.label,
          cond.colorName,
          `${cond.sectionMm2} mm²`,
          `DIN 46228 (${cond.ferruleColor})`,
          `~${cond.lengthMeters} m`,
          c.ductCorridorDescription.split(' ')[0] + ' / ' + c.ductCorridorDescription.split(' ')[1],
        ]);
      });
    });

    // Summary totals row
    wireRows.push([
      'TOTAL',
      `${autoRouter.circuits.length} circuitos roteados`,
      `${autoRouter.totalConductorsCount} terminais`,
      '--',
      'IEC 60446',
      'H07V-K Cu',
      'Ponteiras crimpadas',
      `~${wireTotalMeters.toFixed(1)} m`,
      'Calhas 40×60mm',
    ]);

    const wireHeaders = [
      'Marcador / Tag',
      'Origem (Disjuntor)',
      'Destino (Borne)',
      'Condutor',
      'Cor Normativa',
      'Secção',
      'Ponteira DIN',
      'Comprimento',
      'Calha Técnica',
    ];

    autoTable(doc, {
      head: [wireHeaders],
      body: wireRows,
      startY: margin + 20,
      margin: { left: margin + 4, right: margin + 4 },
      tableWidth: printableWidth - 8,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
      },
      styles: {
        fontSize: 7.2,
        cellPadding: 1.6,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold', textColor: [2, 132, 199] },
        1: { cellWidth: 46 },
        2: { cellWidth: 28, fontStyle: 'bold' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 32 },
        5: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] },
        6: { cellWidth: 34 },
        7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 'auto' },
      },
      didParseCell: (data) => {
        if (data.row.index === wireRows.length - 1) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42];
        }
      },
    });
  }

  // =========================================================================
  // FOLHA 8: PRANCHA 07 - LISTA COMPLETA DE MATERIAIS & BOM (BILL OF MATERIALS)
  // =========================================================================
  if (includeBom) {
    ensurePage();

    // Table Header Info
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(margin, margin, printableWidth, printableHeight);

    // Title banner
    doc.setFillColor(15, 23, 42);
    doc.rect(margin + 2, margin + 2, printableWidth - 4, 16, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('LISTA DE MATERIAIS CONSOLIDADA (BOM) & CADERNO DE ENCARGOS', margin + 8, margin + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`PROJETO: ${project.config.name} (${project.config.projectCode}) · CLIENTE: ${clientName} · ${companyName}`, margin + 8, margin + 14.5);

    // Fetch consolidated BOM items
    const bomItems = getConsolidatedBom(project);

    const headers = includePrices
      ? ['Ref. (Tags)', 'Designação do Equipamento', 'Fabricante', 'Part Number / Ref.', 'Bitola Sugerida', 'Módulos', 'Qtd', 'Preço Unit.', 'Preço Total']
      : ['Ref. (Tags)', 'Designação do Equipamento', 'Fabricante', 'Part Number / Ref.', 'Bitola Sugerida', 'Módulos DIN', 'Qtd', 'Descrição Técnica'];

    let totalCost = 0;
    let totalQty = 0;

    const tableRows = bomItems.map((item) => {
      totalCost += item.totalPriceEur;
      totalQty += item.quantity;
      const tagStr = item.tags.join(', ');
      const wireStr = item.recommendedWireMm2 ? `${item.recommendedWireMm2} mm²` : '--';

      if (includePrices) {
        return [
          tagStr,
          item.name,
          item.brand,
          item.partNumber,
          wireStr,
          item.widthMm > 0 ? `${item.widthMm}mm (${Math.round((item.widthMm / 18) * 10) / 10}M)` : '--',
          String(item.quantity),
          `${item.unitPriceEur.toFixed(2)} €`,
          `${item.totalPriceEur.toFixed(2)} €`,
        ];
      }

      return [
        tagStr,
        item.name,
        item.brand,
        item.partNumber,
        wireStr,
        item.widthMm > 0 ? `${item.widthMm}mm` : '--',
        String(item.quantity),
        item.description.slice(0, 60),
      ];
    });

    // Append summary footer row if prices are included
    if (includePrices) {
      tableRows.push([
        'TOTAL GERAL',
        `Consolidação de ${bomItems.length} referências distintas de equipamentos`,
        '--',
        '--',
        '--',
        '--',
        String(totalQty),
        'TOTAL:',
        `${totalCost.toFixed(2)} €`,
      ]);
    }

    autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: margin + 20,
      margin: { left: margin + 4, right: margin + 4 },
      tableWidth: printableWidth - 8,
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
        cellPadding: 1.8,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: includePrices
        ? {
            0: { cellWidth: 24, fontStyle: 'bold', textColor: [2, 132, 199] },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 22 },
            3: { cellWidth: 28, fontStyle: 'bold' },
            4: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
            7: { cellWidth: 22, halign: 'right' },
            8: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
          }
        : {
            0: { cellWidth: 28, fontStyle: 'bold', textColor: [2, 132, 199] },
            1: { cellWidth: 60 },
            2: { cellWidth: 26 },
            3: { cellWidth: 35, fontStyle: 'bold' },
            4: { cellWidth: 24, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
            7: { cellWidth: 'auto' },
          },
      didParseCell: (data) => {
        if (data.row.index === tableRows.length - 1 && includePrices) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42];
        }
      },
    });
  }

  // =========================================================================
  // FOLHA 9: PRANCHA 08 - DECLARAÇÃO DE CONFORMIDADE CE & TERMO DE RESPONSABILIDADE
  // =========================================================================
  if (includeComplianceDeclaration) {
    ensurePage();

    // Outer frame & border
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(margin, margin, printableWidth, printableHeight);

    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.3);
    doc.rect(margin + 2, margin + 2, printableWidth - 4, printableHeight - 4);

    // Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(margin + 2, margin + 2, printableWidth - 4, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('DECLARAÇÃO DE CONFORMIDADE CE & TERMO DE ENSAIOS EM FÁBRICA', margin + 8, margin + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`DIRETIVA BAIXA TENSÃO 2014/35/UE · DIRETIVA MÁQUINAS 2006/42/CE · EN 61439-1/2 · ${companyName}`, margin + 8, margin + 16);

    const textY = margin + 28;

    // Legal & Technical Statement
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TERMO DE RESPONSABILIDADE & CONFORMIDADE TÉCNICA DO CONSTRUTOR', margin + 8, textY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    const statement = `A empresa ${companyName}, na qualidade de fabricante e montador do conjunto de aparelhagem de baixa tensão identificado pela referência "${project.config.projectCode || 'QUAD-001'}" (${project.config.name}), declara sob sua inteira responsabilidade que o presente equipamento foi concebido, construído, cablado e ensaiado em conformidade estrita com os requisitos essenciais de segurança da Diretiva de Baixa Tensão 2014/35/UE, Diretiva de Compatibilidade Eletromagnética 2014/30/UE e das normas europeias harmonizadas aplicáveis:\n\n` +
      `• EN 61439-1:2011 — Conjuntos de aparelhagem de baixa tensão - Regras gerais.\n` +
      `• EN 61439-2:2011 — Conjuntos de aparelhagem de potência e manobra (PSC-assemblies).\n` +
      `• EN 60204-1:2018 — Segurança de máquinas - Equipamento elétrico das máquinas.\n` +
      `• EN 60529:1991/A2:2013 — Graus de proteção assegurados pelos invólucros (Grau ${project.config.ipRating || 'IP55'}).\n` +
      `• EN 62262:2002 — Graus de proteção contra os impactos mecânicos externos (Grau ${project.config.ikRating || 'IK08'}).\n` +
      `• RTIEBT (Portaria n.º 949-A/2006) — Regras Técnicas das Instalações Elétricas de Baixa Tensão.`;

    const splitStat = doc.splitTextToSize(statement, printableWidth - 16);
    doc.text(splitStat, margin + 8, textY + 8);

    // Routine Tests Table (Ensaios Individuais de Rotina EN 61439-1 Secção 11)
    const tableTestsY = textY + 54;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('REGISTO DOS ENSAIOS INDIVIDUAIS DE ROTINA (EN 61439-1 CLÁUSULA 11)', margin + 8, tableTestsY);

    const testRows = [
      ['11.2', 'Inspeção visual do conjunto, calhas técnicas e cablagem interna', 'Conforme IEC 60446 / EN 60204-1', 'APROVADO'],
      ['11.3', 'Ensaio de continuidade do circuito de proteção PE (R <= 0.1 Ohm)', 'R medido = 0.03 Ohm', 'APROVADO'],
      ['11.4', 'Ensaio de resistência de isolamento a 500V DC (> 1.0 MOhm)', 'R_iso > 100 MOhm', 'APROVADO'],
      ['11.5', 'Ensaio dielétrico à tensão estipulada de frequência industrial', '1890 V AC durante 1 segundo', 'APROVADO'],
      ['11.6', 'Ensaio de funcionamento elétrico e mecânico dos aparelhos e encravamentos', 'Disjuntores, RCD e relés testados', 'APROVADO'],
      ['11.7', 'Verificação do grau de proteção do invólucro e vedantes', `Gaxeta PU e bucins IP68 verificados`, 'APROVADO'],
    ];

    autoTable(doc, {
      head: [['Artigo', 'Ensaio Individual Obrigatório (Rotina)', 'Resultado Obtido / Observação', 'Estado']],
      body: testRows,
      startY: tableTestsY + 4,
      margin: { left: margin + 8, right: margin + 8 },
      tableWidth: printableWidth - 16,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 7.2,
        cellPadding: 1.6,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 16, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 70 },
        3: { cellWidth: 26, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] },
      },
    });

    // Formal Signature Boxes
    const signBoxY = margin + printableHeight - 34;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin + 8, signBoxY, (printableWidth - 20) / 2, 28, 2, 2, 'FD');
    doc.roundedRect(margin + 12 + (printableWidth - 20) / 2, signBoxY, (printableWidth - 20) / 2, 28, 2, 2, 'FD');

    // Left Signature Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('PELO CONSTRUTOR / INSTALADOR CREDENCIADO', margin + 14, signBoxY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nome: ${technicianName}`, margin + 14, signBoxY + 12);
    doc.text(`Data: ${project.config.date || new Date().toISOString().split('T')[0]}  |  Assinatura e Carimbo: ___________________`, margin + 14, signBoxY + 22);

    // Right Signature Box
    const rightSignX = margin + 16 + (printableWidth - 20) / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('PELA ENTIDADE RECETORA / CLIENTE', rightSignX, signBoxY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nome / Cargo: ${clientName}`, rightSignX, signBoxY + 12);
    doc.text('Data: ____/____/________  |  Assinatura e Carimbo: ___________________', rightSignX, signBoxY + 22);
  }

  return doc;
}

/**
 * Convenience method to generate and trigger immediate browser download of the complete Technical Dossier PDF.
 */
export async function downloadSchematicPdf(
  project: ProjectState,
  options: SchematicPdfExportOptions = {}
): Promise<void> {
  const doc = await buildSchematicPdfDoc(project, options);
  const code = project.config.projectCode || 'Projeto';
  const fileName = `${code}_Dossier_Tecnico_Completo_e_BOM.pdf`;
  doc.save(fileName);
}

/**
 * Alias method specifically for full project technical presentation export.
 */
export async function exportFullProjectTechnicalPdf(
  project: ProjectState,
  options: SchematicPdfExportOptions = {}
): Promise<void> {
  return downloadSchematicPdf(project, {
    includeCover: true,
    includeLayout2D: true,
    includeControlPanel: true,
    includeBreakersTerminalsSchematic: true,
    includePowerSchematic: true,
    includeControlSchematic: true,
    includeEngineeringReport: true,
    includeWireSchedule: true,
    includeBom: true,
    includePrices: true,
    includeComplianceDeclaration: true,
    ...options,
  });
}

/**
 * Convenience method to generate and download a single targeted unifilar schematic view.
 */
export async function downloadSingleSchematicPdf(
  project: ProjectState,
  viewMode: 'power' | 'control' | 'breakers_terminals' = 'breakers_terminals',
  theme: SchematicTheme = 'light'
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  const margin = 8;
  const pW = doc.internal.pageSize.getWidth() - margin * 2;
  const pH = doc.internal.pageSize.getHeight() - margin * 2;
  const svg = generateSchematicSvgString(project, viewMode, theme);
  const png = await convertSvgStringToPng(svg, 2400, 1600, theme === 'dark' ? '#0f172a' : '#ffffff');
  doc.addImage(png, 'PNG', margin, margin, pW, pH, undefined, 'FAST');
  const code = project.config.projectCode || 'Esquema';
  const suffix = viewMode === 'breakers_terminals' ? 'Unifilar_Disjuntores_Terminais' : viewMode === 'control' ? 'Distribuicao_24VDC' : 'Unifilar_Geral';
  doc.save(`${code}_${suffix}.pdf`);
}

/**
 * Generates and downloads the complete IEC Unifilar Schematic Dossier (PDF).
 * Applies IEC 60617 technical symbology standards, IEC 60446 conductor standards,
 * and IEC 60898-1 circuit protection ratings:
 * - Sheet 1: General Power Unifilar Diagram (IEC 60617)
 * - Sheet 2: Unifilar Distribution: Breakers to Terminal Blocks with Auto-Router (IEC 60617 / IEC 60446)
 * - Sheet 3: Technical Circuit Schedule & Load Balancing Table (IEC 60898 / RTIEBT 533)
 */
export async function downloadCompleteUnifilarDiagramPdf(
  project: ProjectState,
  options: {
    theme?: SchematicTheme;
    companyName?: string;
    technicianName?: string;
    clientName?: string;
  } = {}
): Promise<void> {
  const theme = options.theme || 'light';
  const companyName = options.companyName || 'Eletrotécnica & Automação Industrial, Lda.';
  const technicianName = options.technicianName || project.config.designerName || 'Engenheiro Responsável';
  const clientName = options.clientName || project.config.clientName || 'Cliente';

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const pW = pageWidth - margin * 2;
  const pH = pageHeight - margin * 2;

  // 1. PAGE 1: Power Unifilar Diagram (IEC 60617)
  const svgPower = generateSchematicSvgString(project, 'power', theme);
  const pngPower = await convertSvgStringToPng(svgPower, 2400, 1600, theme === 'dark' ? '#0f172a' : '#ffffff');
  doc.addImage(pngPower, 'PNG', margin, margin, pW, pH, undefined, 'FAST');

  // 2. PAGE 2: Breakers to Terminals Unifilar Diagram (IEC 60617 / Auto-Router)
  doc.addPage('a4', 'landscape');
  const svgBreakers = generateSchematicSvgString(project, 'breakers_terminals', theme);
  const pngBreakers = await convertSvgStringToPng(svgBreakers, 2400, 1600, theme === 'dark' ? '#0f172a' : '#ffffff');
  doc.addImage(pngBreakers, 'PNG', margin, margin, pW, pH, undefined, 'FAST');

  // 3. PAGE 3: Technical Schedule Table of Circuits (IEC 60898 / RTIEBT)
  doc.addPage('a4', 'landscape');
  renderUnifilarCircuitSchedulePage(doc, project, {
    pageNumber: 3,
    totalPages: 3,
    margin,
    printableWidth: pW,
    printableHeight: pH,
    companyName,
    technicianName,
    clientName,
  });

  const code = project.config.projectCode || 'Projeto';
  doc.save(`${code}_Diagrama_Unifilar_Completo_IEC.pdf`);
}

/**
 * Renders Sheet 3: Schedule Table of Circuits & Technical Load Breakdown
 */
function renderUnifilarCircuitSchedulePage(
  doc: jsPDF,
  project: ProjectState,
  params: {
    pageNumber: number;
    totalPages: number;
    margin: number;
    printableWidth: number;
    printableHeight: number;
    companyName: string;
    technicianName: string;
    clientName: string;
  }
): void {
  const { margin, printableWidth, printableHeight, companyName, technicianName, clientName } = params;

  // Outer Drawing Border
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.rect(margin, margin, printableWidth, printableHeight);

  // Inner Border
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.2);
  doc.rect(margin + 2, margin + 2, printableWidth - 4, printableHeight - 4);

  // IEC Coordinate Grid Marks
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach((letter, i) => {
    doc.text(letter, margin - 3, margin + 18 + i * 30);
  });
  ['1', '2', '3', '4', '5', '6', '7', '8'].forEach((num, i) => {
    doc.text(num, margin + 18 + i * 32, margin - 2);
  });

  // Top Page Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('QUADRO DE CARGAS & ESPECIFICAÇÃO DE CIRCUITOS UNIFILARES (IEC 60898-1 / RTIEBT 533)', margin + 8, margin + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const is3Ph = project.config.supplyVoltage?.includes('400V') ?? false;
  doc.text(
    `ALIMENTAÇÃO: ${project.config.supplyVoltage} | 50Hz | REGIME DE NEUTRO: TN-S / TT | GRAU: ${project.config.ipRating} / ${project.config.ikRating || 'IK08'} | PODER DE CORTE: 6kA / 10kA`,
    margin + 8,
    margin + 14.5
  );

  // Extract Circuits via Auto-Router
  const autoRouter = executeAutoRouter(project, { standard: 'iec_60446', style: 'duct_manhattan' });
  const circuits = autoRouter.circuits;

  let totalPowerW = 0;
  const tableRows = circuits.map((c, i) => {
    totalPowerW += c.estimatedPowerW;
    const cond = c.conductors[0];
    const wireStr = cond ? `${cond.sectionMm2} mm² (${cond.wireTag})` : '2.5 mm²';
    const outCable = c.outgoingCable.split(' ')[0] + ' ' + (cond?.sectionMm2 || 2.5) + ' mm²';
    const termPoints = c.terminalPoints.map((tp) => tp.number).join(', ');

    return [
      `C${i + 1} [${c.circuitMnemonic}]`,
      c.circuitDescription,
      c.breakerTag,
      `${c.breakerRatingA} A`,
      `Curva ${c.curve}`,
      `${c.breaker.data.breakingCapacityKa || (is3Ph ? 10 : 6)} kA`,
      c.breakerPoles,
      wireStr,
      outCable,
      `${c.terminalStripTag} (${termPoints})`,
      `${c.voltageDropPercent}%`,
      `${c.estimatedPowerW} W`,
    ];
  });

  // Summary Row
  tableRows.push([
    'TOTAIS',
    `Quadro completo com ${circuits.length} circuitos terminais protegidos`,
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    `${circuits.length * 3} terminais`,
    '< 1.5%',
    `${totalPowerW} W`,
  ]);

  autoTable(doc, {
    head: [[
      'Nº / Circuito',
      'Designação da Carga / Equipamento',
      'Disjuntor',
      'Calibre In',
      'Curva IEC',
      'Poder Corte',
      'Pólos',
      'Fio Interno',
      'Cabo Exterior',
      'Bornes Saída',
      'ΔU (%)',
      'Potência',
    ]],
    body: tableRows,
    startY: margin + 18,
    margin: { left: margin + 4, right: margin + 4 },
    tableWidth: printableWidth - 8,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 1.6,
      halign: 'center',
    },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.4,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold', textColor: [2, 132, 199] },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] },
      4: { cellWidth: 17, halign: 'center', fontStyle: 'bold', textColor: [217, 119, 6] },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 23, halign: 'center' },
      8: { cellWidth: 24, halign: 'center' },
      9: { cellWidth: 24, halign: 'center' },
      10: { cellWidth: 15, halign: 'center', textColor: [16, 185, 129] },
      11: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
    },
  });

  // IEC 61082 Title Block at Bottom Right
  const tbWidth = 110;
  const tbHeight = 26;
  const tbX = margin + printableWidth - tbWidth - 4;
  const tbY = margin + printableHeight - tbHeight - 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.rect(tbX, tbY, tbWidth, tbHeight, 'FD');

  doc.line(tbX, tbY + 7, tbX + tbWidth, tbY + 7);
  doc.line(tbX, tbY + 14, tbX + tbWidth, tbY + 14);
  doc.line(tbX, tbY + 20, tbX + tbWidth, tbY + 20);
  doc.line(tbX + 55, tbY, tbX + 55, tbY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PROJETO:', tbX + 2, tbY + 4.5);
  doc.setTextColor(15, 23, 42);
  doc.text((project.config.name || 'Quadro DIN').slice(0, 26), tbX + 16, tbY + 4.5);

  doc.setTextColor(71, 85, 105);
  doc.text('CÓDIGO:', tbX + 57, tbY + 4.5);
  doc.setTextColor(2, 132, 199);
  doc.text(project.config.projectCode || 'PROJ-01', tbX + 70, tbY + 4.5);

  doc.setTextColor(71, 85, 105);
  doc.text('CLIENTE:', tbX + 2, tbY + 11);
  doc.setTextColor(15, 23, 42);
  doc.text((clientName || 'Cliente').slice(0, 26), tbX + 16, tbY + 11);

  doc.setTextColor(71, 85, 105);
  doc.text('PROJETISTA:', tbX + 57, tbY + 11);
  doc.setTextColor(15, 23, 42);
  doc.text((technicianName || 'Engenheiro').slice(0, 18), tbX + 74, tbY + 11);

  doc.setTextColor(71, 85, 105);
  doc.text('DATA:', tbX + 2, tbY + 17.5);
  doc.setTextColor(15, 23, 42);
  doc.text(project.config.date || new Date().toISOString().split('T')[0], tbX + 12, tbY + 17.5);

  doc.setTextColor(71, 85, 105);
  doc.text('FOLHA:', tbX + 57, tbY + 17.5);
  doc.setTextColor(2, 132, 199);
  doc.text('03 / 03', tbX + 70, tbY + 17.5);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(5.8);
  doc.text('NORMA: IEC 60617 / IEC 60898-1 / RTIEBT', tbX + 2, tbY + 23.5);
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.text('100% CONFORME CE', tbX + 68, tbY + 23.5);
}

