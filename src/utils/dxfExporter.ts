import { ProjectState, PlacedComponent, CableGland } from '../types/electrical';
import { GLAND_SPECS } from './glandUtils';

export interface DxfExportOptions {
  includeDimensions?: boolean;
  includeTitleBlock?: boolean;
  includeGlandsPunching?: boolean;
  includeDuctSlots?: boolean;
  includeComponentLabels?: boolean;
  includeTerminals?: boolean;
}

/**
 * Helper class to construct DXF Release 12 / Release 2000 compliant ASCII output.
 * Fully compatible with AutoCAD, SolidWorks, FreeCAD, LibreCAD, QCAD, DraftSight, etc.
 */
class DxfWriter {
  private buffer: string[] = [];

  constructor() {
    this.buffer = [];
  }

  append(code: number, value: string | number) {
    this.buffer.push(`${code}\n${value}`);
  }

  line(
    layer: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color?: number,
    linetype?: string
  ) {
    this.append(0, 'LINE');
    this.append(8, layer);
    if (color !== undefined) this.append(62, color);
    if (linetype) this.append(6, linetype);
    this.append(10, x1.toFixed(3));
    this.append(20, y1.toFixed(3));
    this.append(30, '0.0');
    this.append(11, x2.toFixed(3));
    this.append(21, y2.toFixed(3));
    this.append(31, '0.0');
  }

  circle(
    layer: string,
    cx: number,
    cy: number,
    radius: number,
    color?: number,
    linetype?: string
  ) {
    this.append(0, 'CIRCLE');
    this.append(8, layer);
    if (color !== undefined) this.append(62, color);
    if (linetype) this.append(6, linetype);
    this.append(10, cx.toFixed(3));
    this.append(20, cy.toFixed(3));
    this.append(30, '0.0');
    this.append(40, radius.toFixed(3));
  }

  rectangle(
    layer: string,
    x: number,
    y: number,
    w: number,
    h: number,
    color?: number,
    linetype?: string
  ) {
    this.line(layer, x, y, x + w, y, color, linetype);
    this.line(layer, x + w, y, x + w, y + h, color, linetype);
    this.line(layer, x + w, y + h, x, y + h, color, linetype);
    this.line(layer, x, y + h, x, y, color, linetype);
  }

  text(
    layer: string,
    x: number,
    y: number,
    height: number,
    textString: string,
    color?: number,
    rotation: number = 0,
    alignCenter: boolean = false
  ) {
    // Sanitize string for DXF
    const cleanStr = String(textString).replace(/[\r\n]/g, ' ').trim();
    if (!cleanStr) return;

    this.append(0, 'TEXT');
    this.append(8, layer);
    if (color !== undefined) this.append(62, color);
    this.append(10, x.toFixed(3));
    this.append(20, y.toFixed(3));
    this.append(30, '0.0');
    this.append(40, height.toFixed(3));
    this.append(1, cleanStr);
    if (rotation !== 0) {
      this.append(50, rotation.toFixed(1));
    }
    if (alignCenter) {
      this.append(72, 1); // Center horizontal
      this.append(11, x.toFixed(3));
      this.append(21, y.toFixed(3));
      this.append(31, '0.0');
    }
  }

  dimensionH(
    layer: string,
    x1: number,
    x2: number,
    dimY: number,
    textVal: string,
    extY1: number,
    extY2: number
  ) {
    // Horizontal dimension line with arrows and extension lines
    this.line(layer, x1, extY1, x1, dimY, 1);
    this.line(layer, x2, extY2, x2, dimY, 1);
    this.line(layer, x1, dimY, x2, dimY, 1);

    // Dimension tick marks / arrows (angled tick marks 45 degrees)
    const tick = 3.5;
    this.line(layer, x1 - tick, dimY - tick, x1 + tick, dimY + tick, 1);
    this.line(layer, x2 - tick, dimY - tick, x2 + tick, dimY + tick, 1);

    // Text in middle above line
    const midX = (x1 + x2) / 2;
    this.text(layer, midX, dimY + 3.0, 4.0, textVal, 2, 0, true);
  }

  dimensionV(
    layer: string,
    y1: number,
    y2: number,
    dimX: number,
    textVal: string,
    extX1: number,
    extX2: number
  ) {
    // Vertical dimension line
    this.line(layer, extX1, y1, dimX, y1, 1);
    this.line(layer, extX2, y2, dimX, y2, 1);
    this.line(layer, dimX, y1, dimX, y2, 1);

    const tick = 3.5;
    this.line(layer, dimX - tick, y1 - tick, dimX + tick, y1 + tick, 1);
    this.line(layer, dimX - tick, y2 - tick, dimX + tick, y2 + tick, 1);

    const midY = (y1 + y2) / 2;
    this.text(layer, dimX - 3.5, midY, 4.0, textVal, 2, 90, true);
  }

  toString(): string {
    return this.buffer.join('\n') + '\n';
  }
}

/**
 * Generate full AutoCAD DXF file content from the project state.
 */
export function generateCabinetDxf(
  project: ProjectState,
  options: DxfExportOptions = {}
): string {
  const {
    includeDimensions = true,
    includeTitleBlock = true,
    includeGlandsPunching = true,
    includeDuctSlots = true,
    includeComponentLabels = true,
    includeTerminals = true,
  } = options;

  const config = project.config;
  const rails = project.rails;
  const glands = project.glands || [];

  const width = config.widthMm || 600;
  const height = config.heightMm || 800;
  const depth = config.depthMm || 250;
  const sideDuct = config.sideDuctWidthMm || 40;
  const horizDuct = config.horizontalDuctHeightMm || 40;
  const spacing = config.railSpacingMm || 160;

  const writer = new DxfWriter();

  // 1. SECTION HEADER
  writer.append(0, 'SECTION');
  writer.append(2, 'HEADER');
  writer.append(9, '$ACADVER');
  writer.append(1, 'AC1009'); // AutoCAD R12 standard (broadest CAD compatibility)
  writer.append(9, '$INSUNITS');
  writer.append(70, 4); // Millimeters (1=Inches, 4=Millimeters, 6=Meters)
  writer.append(9, '$LUNITS');
  writer.append(70, 2); // Decimal
  writer.append(9, '$EXTMIN');
  writer.append(10, (-80).toFixed(3));
  writer.append(20, (-80).toFixed(3));
  writer.append(30, '0.0');
  writer.append(9, '$EXTMAX');
  writer.append(10, (width + 120).toFixed(3));
  writer.append(20, (height + 80).toFixed(3));
  writer.append(30, '0.0');
  writer.append(0, 'ENDSEC');

  // 2. SECTION TABLES (Define standard engineering layers)
  writer.append(0, 'SECTION');
  writer.append(2, 'TABLES');

  // LTYPE Table
  writer.append(0, 'TABLE');
  writer.append(2, 'LTYPE');
  writer.append(70, 3);

  writer.append(0, 'LTYPE');
  writer.append(2, 'CONTINUOUS');
  writer.append(70, 0);
  writer.append(3, 'Solid line');
  writer.append(72, 65);
  writer.append(73, 0);
  writer.append(40, 0.0);

  writer.append(0, 'LTYPE');
  writer.append(2, 'DASHED');
  writer.append(70, 0);
  writer.append(3, 'Dashed line __ __ __');
  writer.append(72, 65);
  writer.append(73, 2);
  writer.append(40, 6.0);
  writer.append(49, 4.0);
  writer.append(49, -2.0);

  writer.append(0, 'LTYPE');
  writer.append(2, 'CENTER');
  writer.append(70, 0);
  writer.append(3, 'Centerline ___ _ ___');
  writer.append(72, 65);
  writer.append(73, 4);
  writer.append(40, 10.0);
  writer.append(49, 6.0);
  writer.append(49, -1.5);
  writer.append(49, 1.0);
  writer.append(49, -1.5);

  writer.append(0, 'ENDTAB');

  // LAYER Table
  writer.append(0, 'TABLE');
  writer.append(2, 'LAYER');
  writer.append(70, 11);

  const layers = [
    { name: '0', color: 7 }, // White
    { name: 'QUADRO_EXTERIOR', color: 7 }, // Frame (White)
    { name: 'PLACA_MONTAGEM', color: 8 }, // Mounting plate (Gray)
    { name: 'CALEIRAS_RANHURADAS', color: 3 }, // Wire Ducts (Green)
    { name: 'CALHAS_DIN35', color: 4 }, // DIN Rails (Cyan)
    { name: 'COMPONENTES_CORPO', color: 7 }, // Component Outline (White)
    { name: 'COMPONENTES_TEXTO', color: 2 }, // Tags & References (Yellow)
    { name: 'COMPONENTES_BORNES', color: 6 }, // Terminals (Magenta)
    { name: 'BUCINS_FLANGE', color: 8 }, // Gland Plates (Gray)
    { name: 'BUCINS_FURACAO', color: 1 }, // Gland Drill Holes (Red)
    { name: 'BUCINS_TEXTO', color: 2 }, // Gland Text (Yellow)
    { name: 'COTAS_TECNICAS', color: 1 }, // Dimensions (Red)
    { name: 'CARIMBO_LEGENDA', color: 7 }, // Title Block (White)
  ];

  layers.forEach((l) => {
    writer.append(0, 'LAYER');
    writer.append(2, l.name);
    writer.append(70, 0);
    writer.append(62, l.color);
    writer.append(6, 'CONTINUOUS');
  });

  writer.append(0, 'ENDTAB');
  writer.append(0, 'ENDSEC');

  // 3. SECTION ENTITIES
  writer.append(0, 'SECTION');
  writer.append(2, 'ENTITIES');

  // Coordinate conversion: CAD origin (0, 0) is bottom-left corner of the cabinet
  // In screen/SVG: Y goes downwards from 0 to height.
  // In CAD: cadY = height - svgY, cadX = svgX.
  const toCadY = (svgY: number) => height - svgY;

  // -------------------------------------------------------------
  // LAYER: QUADRO_EXTERIOR (Outer Enclosure Metallic Shell)
  // -------------------------------------------------------------
  writer.rectangle('QUADRO_EXTERIOR', 0, 0, width, height, 7);
  // Outer frame double thickness (sheet metal bevel 4mm)
  writer.rectangle('QUADRO_EXTERIOR', 4, 4, width - 8, height - 8, 8);

  // Corner wall-mount fixing brackets holes (4 corners)
  const bracketInset = 10;
  const bracketHoleR = 5;
  writer.circle('QUADRO_EXTERIOR', bracketInset, bracketInset, bracketHoleR, 7);
  writer.circle('QUADRO_EXTERIOR', width - bracketInset, bracketInset, bracketHoleR, 7);
  writer.circle('QUADRO_EXTERIOR', bracketInset, height - bracketInset, bracketHoleR, 7);
  writer.circle('QUADRO_EXTERIOR', width - bracketInset, height - bracketInset, bracketHoleR, 7);

  // -------------------------------------------------------------
  // LAYER: PLACA_MONTAGEM (Zinc-Plated Steel Sheet 2.0mm)
  // -------------------------------------------------------------
  const plateInset = 16;
  writer.rectangle(
    'PLACA_MONTAGEM',
    plateInset,
    plateInset,
    width - 2 * plateInset,
    height - 2 * plateInset,
    8
  );

  // Mounting screws for interior chassis
  writer.circle('PLACA_MONTAGEM', plateInset + 8, plateInset + 8, 3, 8);
  writer.circle('PLACA_MONTAGEM', width - plateInset - 8, plateInset + 8, 3, 8);
  writer.circle('PLACA_MONTAGEM', plateInset + 8, height - plateInset - 8, 3, 8);
  writer.circle('PLACA_MONTAGEM', width - plateInset - 8, height - plateInset - 8, 3, 8);

  // -------------------------------------------------------------
  // LAYER: CALEIRAS_RANHURADAS (Slotted Cable Ducts)
  // -------------------------------------------------------------
  const ductXLeft = 24;
  const ductXRight = width - 24 - sideDuct;
  const ductTopY = toCadY(24);
  const ductBottomY = toCadY(height - 24);
  const ductHeight = ductTopY - ductBottomY;

  // Lateral Left Cable Duct
  writer.rectangle('CALEIRAS_RANHURADAS', ductXLeft, ductBottomY, sideDuct, ductHeight, 3);
  // Lateral Right Cable Duct
  writer.rectangle('CALEIRAS_RANHURADAS', ductXRight, ductBottomY, sideDuct, ductHeight, 3);

  // Finger slots hatch lines along vertical ducts (every 20mm)
  if (includeDuctSlots) {
    for (let y = ductBottomY + 15; y < ductTopY - 15; y += 20) {
      // Left duct slots
      writer.line('CALEIRAS_RANHURADAS', ductXLeft, y, ductXLeft + sideDuct * 0.7, y, 8);
      // Right duct slots
      writer.line('CALEIRAS_RANHURADAS', ductXRight + sideDuct * 0.3, y, ductXRight + sideDuct, y, 8);
    }
  }

  // Top Horizontal Duct
  const horizDuctX = ductXLeft + sideDuct;
  const horizDuctW = ductXRight - horizDuctX;
  const topHorizCadY = toCadY(24 + horizDuct);
  writer.rectangle('CALEIRAS_RANHURADAS', horizDuctX, topHorizCadY, horizDuctW, horizDuct, 3);

  // Bottom Horizontal Duct
  const bottomHorizCadY = toCadY(height - 24);
  writer.rectangle('CALEIRAS_RANHURADAS', horizDuctX, bottomHorizCadY, horizDuctW, horizDuct, 3);

  // Inter-rail intermediate horizontal ducts
  for (let r = 0; r < rails.length - 1; r++) {
    const interY = 80 + r * spacing + 105 + 10;
    const interCadY = toCadY(interY + horizDuct);
    writer.rectangle('CALEIRAS_RANHURADAS', horizDuctX, interCadY, horizDuctW, horizDuct, 3);

    if (includeDuctSlots) {
      for (let x = horizDuctX + 20; x < horizDuctX + horizDuctW - 20; x += 30) {
        writer.line('CALEIRAS_RANHURADAS', x, interCadY, x, interCadY + horizDuct * 0.7, 8);
      }
    }
  }

  // -------------------------------------------------------------
  // LAYER: CALHAS_DIN35 (Standard DIN Rails 35 x 7.5 mm)
  // -------------------------------------------------------------
  const railX = 24 + sideDuct + 10;
  const usableWidth = Math.max(80, width - 2 * sideDuct - 40);

  rails.forEach((rail, rIdx) => {
    const railSvgY = 80 + rIdx * spacing;
    // In DIN 35 profile: standard 35mm height
    // Component sits with centerline at railSvgY + 50
    const dinTopCadY = toCadY(railSvgY + 32.5);
    const dinBottomCadY = toCadY(railSvgY + 67.5);
    const dinHeight = dinTopCadY - dinBottomCadY; // 35mm

    // Draw DIN 35 steel profile
    writer.rectangle('CALHAS_DIN35', railX, dinBottomCadY, usableWidth, dinHeight, 4);

    // DIN center line
    const dinCenterY = (dinTopCadY + dinBottomCadY) / 2;
    writer.line('CALHAS_DIN35', railX - 5, dinCenterY, railX + usableWidth + 5, dinCenterY, 4, 'CENTER');

    // DIN 35 rail mounting oval perforations (slots 6.2 x 18 mm spaced 25mm)
    for (let sx = railX + 15; sx < railX + usableWidth - 15; sx += 35) {
      writer.rectangle('CALHAS_DIN35', sx - 8, dinCenterY - 2.5, 16, 5, 8);
    }

    // Rail identification tag at left side
    writer.text(
      'CALHAS_DIN35',
      railX - 3.0,
      dinCenterY - 1.5,
      3.5,
      rail.name || `CALHA ${rIdx + 1}`,
      4,
      0,
      false
    );
  });

  // -------------------------------------------------------------
  // LAYER: COMPONENTES_CORPO, COMPONENTES_TEXTO, COMPONENTES_BORNES
  // -------------------------------------------------------------
  rails.forEach((rail, rIdx) => {
    const railSvgY = 80 + rIdx * spacing;

    rail.items.forEach((item: PlacedComponent) => {
      const compX = railX + item.positionMm;
      const compW = item.data.widthMm;
      // Real component physical height in mm, centered over DIN 35 rail (centerline = railSvgY + 55)
      const realH = item.data.heightMm || 90;
      const railCenterY = railSvgY + 55;
      const compSvgTop = railCenterY - realH / 2;
      const compSvgBottom = railCenterY + realH / 2;
      const compTopCadY = toCadY(compSvgTop);
      const compBottomCadY = toCadY(compSvgBottom);
      const compH = compTopCadY - compBottomCadY;

      // 1. Component Body Outline
      writer.rectangle('COMPONENTES_CORPO', compX, compBottomCadY, compW, compH, 7);

      // Inner chamfer / front face contour
      if (compW > 12) {
        writer.rectangle('COMPONENTES_CORPO', compX + 1.5, compBottomCadY + 12, compW - 3, compH - 24, 8);
      }

      // DIN Rail clip indicator notch in middle
      const midY = (compTopCadY + compBottomCadY) / 2;
      writer.line('COMPONENTES_CORPO', compX, midY - 6, compX + 2, midY - 6, 8);
      writer.line('COMPONENTES_CORPO', compX, midY + 6, compX + 2, midY + 6, 8);
      writer.line('COMPONENTES_CORPO', compX + compW - 2, midY - 6, compX + compW, midY - 6, 8);
      writer.line('COMPONENTES_CORPO', compX + compW - 2, midY + 6, compX + compW, midY + 6, 8);

      // 2. Component Text (Tag, Model, Specifications)
      if (includeComponentLabels) {
        const textCenterX = compX + compW / 2;

        if (compW >= 24) {
          // Full component label
          writer.text('COMPONENTES_TEXTO', textCenterX, midY + 8, 4.5, item.tag, 2, 0, true);
          writer.text(
            'COMPONENTES_TEXTO',
            textCenterX,
            midY - 1,
            2.8,
            item.data.partNumber || item.data.name,
            7,
            0,
            true
          );
          if (item.data.ratedCurrentA || item.data.ratedPowerW) {
            const spec = item.data.ratedPowerW 
              ? `${item.data.ratedPowerW}W (${item.data.ratedCurrentA}A)` 
              : `${item.data.ratedCurrentA}A`;
            writer.text('COMPONENTES_TEXTO', textCenterX, midY - 9, 2.5, spec, 3, 0, true);
          }
        } else if (compW >= 12) {
          // Narrow component (e.g. MCB 1P, slim relay)
          writer.text('COMPONENTES_TEXTO', textCenterX, midY + 4, 3.5, item.tag, 2, 0, true);
          writer.text('COMPONENTES_TEXTO', textCenterX, midY - 6, 2.2, `${item.data.widthMm}mm`, 8, 0, true);
        } else {
          // Vertical terminal (Viking 3 or narrow terminal)
          writer.text('COMPONENTES_TEXTO', textCenterX, midY, 3.0, item.tag, 2, 90, true);
        }
      }

      // 3. Terminal Connection Screws / Points (Bornes)
      if (includeTerminals) {
        const termR = Math.min(2.0, compW / 4.5);
        // Top terminal
        writer.circle('COMPONENTES_BORNES', compX + compW / 2, compTopCadY - 5, termR, 6);
        // Bottom terminal
        writer.circle('COMPONENTES_BORNES', compX + compW / 2, compBottomCadY + 5, termR, 6);

        // Terminal labels (e.g. 1/L1, 2/T1)
        if (compW >= 18) {
          writer.text('COMPONENTES_BORNES', compX + compW / 2, compTopCadY - 11, 2.2, 'IN', 6, 0, true);
          writer.text('COMPONENTES_BORNES', compX + compW / 2, compBottomCadY + 8, 2.2, 'OUT', 6, 0, true);
        }
      }
    });
  });

  // -------------------------------------------------------------
  // LAYER: BUCINS_FLANGE, BUCINS_FURACAO, BUCINS_TEXTO (Cable Glands)
  // -------------------------------------------------------------
  if (includeGlandsPunching && glands.length > 0) {
    const flangeInset = 22;
    const flangeW = width - 44;
    const flangeH = 15;

    // Top Gland Flange Plate (Placa Superior - Entrada)
    const topFlangeCadY = toCadY(18);
    writer.rectangle('BUCINS_FLANGE', flangeInset, topFlangeCadY, flangeW, flangeH, 8);
    // Flange fastening screws
    writer.circle('BUCINS_FLANGE', 28, topFlangeCadY + flangeH / 2, 2.5, 8);
    writer.circle('BUCINS_FLANGE', width - 28, topFlangeCadY + flangeH / 2, 2.5, 8);
    writer.text(
      'BUCINS_FLANGE',
      width / 2,
      topFlangeCadY + flangeH / 2 - 1.2,
      3.2,
      'FLANGE SUPERIOR - ENTRADA DE CABOS',
      8,
      0,
      true
    );

    // Bottom Gland Flange Plate (Placa Inferior - Saída)
    const bottomFlangeCadY = toCadY(height - 3);
    writer.rectangle('BUCINS_FLANGE', flangeInset, bottomFlangeCadY, flangeW, flangeH, 8);
    writer.circle('BUCINS_FLANGE', 28, bottomFlangeCadY + flangeH / 2, 2.5, 8);
    writer.circle('BUCINS_FLANGE', width - 28, bottomFlangeCadY + flangeH / 2, 2.5, 8);
    writer.text(
      'BUCINS_FLANGE',
      width / 2,
      bottomFlangeCadY + flangeH / 2 - 1.2,
      3.2,
      'FLANGE INFERIOR - SAIDA DE CABOS PARA CAMPO',
      8,
      0,
      true
    );

    // Cable Glands Holes & Dimensions
    glands.forEach((gland: CableGland) => {
      const spec = GLAND_SPECS[gland.size] || GLAND_SPECS.M20;
      const drillR = spec.holeDiameterMm / 2;
      const hexR = (spec.outerDiameterMm || spec.holeDiameterMm * 1.3) / 2;

      const cadX = gland.xOffsetMm;
      const cadY = gland.location === 'top' 
        ? toCadY(10.5) 
        : toCadY(height - 10.5);

      // 1. Gland Punch Hole Circle (Diâmetro exato de furação da chapa)
      writer.circle('BUCINS_FURACAO', cadX, cadY, drillR, 1);

      // 2. Gland Outer Body Hex / Collar Outline
      writer.circle('BUCINS_FLANGE', cadX, cadY, hexR, 8);

      // 3. Center crosshair lines for punching precision
      const crossArm = drillR + 3.0;
      writer.line('BUCINS_FURACAO', cadX - crossArm, cadY, cadX + crossArm, cadY, 1, 'CENTER');
      writer.line('BUCINS_FURACAO', cadX, cadY - crossArm, cadX, cadY + crossArm, 1, 'CENTER');

      // 4. Gland Tag, Metric, Drill Hole Text
      const textOffset = gland.location === 'top' ? 14 : -18;
      writer.text(
        'BUCINS_TEXTO',
        cadX,
        cadY + textOffset,
        3.2,
        `${gland.tag} (${gland.size} %%c${spec.holeDiameterMm}mm)`,
        2,
        0,
        true
      );
      writer.text(
        'BUCINS_TEXTO',
        cadX,
        cadY + textOffset - 4.0,
        2.4,
        gland.label || gland.cableDiameterRangeMm,
        7,
        0,
        true
      );

      // Coordinate marker X=
      writer.text(
        'BUCINS_TEXTO',
        cadX,
        cadY + (gland.location === 'top' ? -12 : 12),
        2.2,
        `X=${gland.xOffsetMm}`,
        3,
        0,
        true
      );
    });
  }

  // -------------------------------------------------------------
  // LAYER: COTAS_TECNICAS (Dimensions)
  // -------------------------------------------------------------
  if (includeDimensions) {
    // Total Width Dimension (Bottom of cabinet)
    writer.dimensionH(
      'COTAS_TECNICAS',
      0,
      width,
      -30,
      `${width} mm`,
      -5,
      -5
    );

    // Total Height Dimension (Left of cabinet)
    writer.dimensionV(
      'COTAS_TECNICAS',
      0,
      height,
      -35,
      `${height} mm`,
      -5,
      -5
    );

    // Depth Annotation
    writer.text(
      'COTAS_TECNICAS',
      width / 2,
      -45,
      3.5,
      `PROFUNDIDADE DO QUADRO: ${depth} mm · GRAU DE PROTECAO: ${config.ipRating}`,
      1,
      0,
      true
    );

    // Rail Spacing Dimensions on Right Side
    rails.forEach((rail, idx) => {
      const railSvgY = 80 + idx * spacing;
      const dinCenterCadY = toCadY(railSvgY + 50);

      // Height from bottom
      writer.dimensionV(
        'COTAS_TECNICAS',
        0,
        dinCenterCadY,
        width + 30 + idx * 8,
        `Y=${dinCenterCadY.toFixed(0)}mm`,
        width + 5,
        width + 5
      );
    });
  }

  // -------------------------------------------------------------
  // LAYER: CARIMBO_LEGENDA (Technical CAD Title Block)
  // -------------------------------------------------------------
  if (includeTitleBlock) {
    const tbW = 220;
    const tbH = 65;
    const tbX = width - tbW;
    const tbY = -75;

    // Outer title box
    writer.rectangle('CARIMBO_LEGENDA', tbX, tbY, tbW, tbH, 7);

    // Partition lines
    writer.line('CARIMBO_LEGENDA', tbX, tbY + 45, tbX + tbW, tbY + 45, 7);
    writer.line('CARIMBO_LEGENDA', tbX, tbY + 30, tbX + tbW, tbY + 30, 7);
    writer.line('CARIMBO_LEGENDA', tbX, tbY + 15, tbX + tbW, tbY + 15, 7);
    writer.line('CARIMBO_LEGENDA', tbX + 110, tbY, tbX + 110, tbY + 45, 7);

    // Title Block Fields
    writer.text('CARIMBO_LEGENDA', tbX + 5, tbY + 53, 5.0, config.name || 'QUADRO ELETRICO DIN', 2);
    writer.text('CARIMBO_LEGENDA', tbX + 5, tbY + 47, 3.0, `CODIGO: ${config.projectCode || 'PROJ-001'}`, 7);

    writer.text('CARIMBO_LEGENDA', tbX + 5, tbY + 36, 3.2, 'TENSAO ALIMENTACAO:', 7);
    writer.text('CARIMBO_LEGENDA', tbX + 50, tbY + 36, 3.2, `${config.supplyVoltage} ${config.frequencyHz}Hz`, 4);

    writer.text('CARIMBO_LEGENDA', tbX + 115, tbY + 36, 3.2, 'DIMENSOES (LxAxP):', 7);
    writer.text('CARIMBO_LEGENDA', tbX + 165, tbY + 36, 3.2, `${width}x${height}x${depth} mm`, 7);

    writer.text('CARIMBO_LEGENDA', tbX + 5, tbY + 21, 3.2, 'CALHAS DIN 35:', 7);
    writer.text('CARIMBO_LEGENDA', tbX + 50, tbY + 21, 3.2, `${rails.length} Calhas (${rails.reduce((a, b) => a + b.items.length, 0)} itens)`, 7);

    writer.text('CARIMBO_LEGENDA', tbX + 115, tbY + 21, 3.2, 'BUCINS DE CABLAGEM:', 7);
    writer.text('CARIMBO_LEGENDA', tbX + 175, tbY + 21, 3.2, `${glands.length} Marcados`, 1);

    writer.text('CARIMBO_LEGENDA', tbX + 5, tbY + 6, 3.0, 'NORMA TECNICA: EN 61439-1 / IEC 62444', 8);
    writer.text('CARIMBO_LEGENDA', tbX + 115, tbY + 6, 3.0, `ESCALA: 1:1 mm · ${new Date().toLocaleDateString('pt-PT')}`, 8);
  }

  // End of Entities Section
  writer.append(0, 'ENDSEC');
  // End of File
  writer.append(0, 'EOF');

  return writer.toString();
}

/**
 * Trigger direct download of the DXF file in the user's browser.
 */
export function downloadCabinetDxf(
  project: ProjectState,
  customFilename?: string,
  options?: DxfExportOptions
): void {
  const dxfContent = generateCabinetDxf(project, options);
  const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanCode = (project.config.projectCode || 'PROJ')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = (project.config.name || 'quadro')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultFilename = `ELECTROCAD_${cleanCode}_${cleanName}_${dateStr}.dxf`;

  const link = document.createElement('a');
  link.href = url;
  link.download = customFilename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
