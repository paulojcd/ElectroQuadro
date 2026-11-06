import { ProjectState, PlacedComponent, CableGland } from '../types/electrical';
import { GLAND_SPECS } from './glandUtils';
import { escapeXml, SchematicTheme } from './schematicSvgRenderer';

/**
 * Generates a clean, technical 1200x800 SVG representation of the 2D cabinet layout
 * suitable for high-resolution vector rendering and PDF presentation export.
 */
export function generateCabinetLayoutSvgString(
  project: ProjectState,
  theme: SchematicTheme = 'light'
): string {
  const isDark = theme === 'dark';
  const config = project.config;
  const rails = project.rails;
  const glands = project.glands || [];

  // Palette definitions
  const bg = isDark ? '#0f172a' : '#ffffff';
  const gridStroke = isDark ? '#1e293b' : '#f1f5f9';
  const borderOuter = isDark ? '#475569' : '#0f172a';
  const borderInner = isDark ? '#334155' : '#475569';
  const textMuted = isDark ? '#64748b' : '#64748b';
  const textBody = isDark ? '#94a3b8' : '#334155';
  const textHeading = isDark ? '#f8fafc' : '#0f172a';
  const titleBlockBg = isDark ? '#090d16' : '#ffffff';
  const titleBlockBorder = isDark ? '#475569' : '#0f172a';
  const titleBlockDivider = isDark ? '#334155' : '#cbd5e1';
  const accentBlue = isDark ? '#38bdf8' : '#0284c7';

  // Cabinet dimensions
  const cabWidthMm = Math.max(300, config.widthMm || 600);
  const cabHeightMm = Math.max(400, config.heightMm || 800);
  const cabDepthMm = config.depthMm || 250;
  const sideDuctW = config.sideDuctWidthMm || 40;
  const horizDuctH = config.horizontalDuctHeightMm || 40;

  // Drawing viewport bounds inside 1200x800 sheet
  // Left area for cabinet: x = 70 to 710 (width 640), y = 110 to 730 (height 620)
  const drawAreaX = 80;
  const drawAreaY = 120;
  const maxDrawW = 600;
  const maxDrawH = 580;

  // Calculate scaling factor to fit cabinet proportionally
  const scale = Math.min(maxDrawW / cabWidthMm, maxDrawH / cabHeightMm);
  const svgCabW = cabWidthMm * scale;
  const svgCabH = cabHeightMm * scale;

  // Center cabinet within draw area
  const cabX = drawAreaX + (maxDrawW - svgCabW) / 2;
  const cabY = drawAreaY + (maxDrawH - svgCabH) / 2;

  // Usable rail width in SVG units
  const svgSideDuctW = sideDuctW * scale;
  const svgHorizDuctH = horizDuctH * scale;

  // Enclosure colors
  const encOuterStroke = isDark ? '#64748b' : '#334155';
  const encFill = isDark ? '#111827' : '#f8fafc';
  const encBezel = isDark ? '#1f2937' : '#e2e8f0';
  const ductFill = isDark ? '#1e293b' : '#e2e8f0';
  const ductStroke = isDark ? '#334155' : '#cbd5e1';
  const railFill = isDark ? '#475569' : '#94a3b8';

  // Render Cable Glands (Bucins)
  const topGlands = glands.filter((g) => g.location === 'top');
  const bottomGlands = glands.filter((g) => g.location === 'bottom');

  const renderGlandRow = (rowGlands: CableGland[], isTop: boolean) => {
    if (rowGlands.length === 0) return '';
    const glandY = isTop ? cabY - 10 : cabY + svgCabH + 2;
    const spacing = svgCabW / (rowGlands.length + 1);

    return rowGlands
      .map((g, idx) => {
        const gx = cabX + (idx + 1) * spacing;
        const spec = GLAND_SPECS[g.size] || { outerDiameterMm: 25, holeDiameterMm: 20 };
        const r = Math.max(4, (spec.holeDiameterMm * scale) / 2);
        return `
          <g transform="translate(${gx}, ${glandY})">
            <rect x="${-r * 1.2}" y="${isTop ? -r : 0}" width="${r * 2.4}" height="${r * 1.2}" fill="${isDark ? '#334155' : '#cbd5e1'}" stroke="${isDark ? '#64748b' : '#94a3b8'}" stroke-width="0.8" rx="1.5" />
            <circle cx="0" cy="${isTop ? -r / 2 : r / 2}" r="${r * 0.7}" fill="${isDark ? '#0f172a' : '#ffffff'}" stroke="${accentBlue}" stroke-width="1" />
            <text x="0" y="${isTop ? -r - 4 : r * 1.8 + 8}" fill="${accentBlue}" font-size="7" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
              ${escapeXml(g.tag)} (${escapeXml(g.size)})
            </text>
          </g>
        `;
      })
      .join('');
  };

  // Render DIN Rails & Slotted Ducts
  const railsSvg = rails
    .map((rail, rIdx) => {
      const railYMm = rail.yPositionMm || (100 + rIdx * (config.railSpacingMm || 150));
      const railYSvg = cabY + railYMm * scale;
      const railXSvg = cabX + svgSideDuctW + 8;
      const railWSvg = svgCabW - (svgSideDuctW * 2) - 16;
      const railHeightSvg = 35 * scale; // DIN 35mm standard

      // Render components on this rail
      const itemsSvg = rail.items
        .map((item) => {
          const itemX = railXSvg + (item.positionMm * scale);
          const itemW = Math.max(6, item.data.widthMm * scale);
          const itemH = Math.max(20, (item.data.heightMm || 90) * scale);
          const itemY = railYSvg - (itemH - railHeightSvg) / 2;

          // Component theme styling by category
          let compBg = isDark ? '#1e293b' : '#ffffff';
          let compStroke = isDark ? '#475569' : '#94a3b8';
          let headerBg = isDark ? '#0284c7' : '#e0f2fe';
          let headerText = isDark ? '#ffffff' : '#0369a1';
          let isTerminal = false;

          if (item.data.category === 'power_supply') {
            compBg = isDark ? '#0c4a6e' : '#f0f9ff';
            compStroke = '#0284c7';
            headerBg = '#0284c7';
            headerText = '#ffffff';
          } else if (item.data.category === 'plc_cpu' || item.data.category === 'plc_expansion') {
            compBg = isDark ? '#1e293b' : '#f1f5f9';
            compStroke = '#0d9488';
            headerBg = '#0f766e';
            headerText = '#ffffff';
          } else if (item.data.category === 'terminals') {
            isTerminal = true;
            if (item.data.name.includes('Terra') || item.data.name.includes('PE')) {
              compBg = '#84cc16';
              compStroke = '#65a30d';
            } else if (item.data.name.includes('Neutro') || item.data.name.includes('N')) {
              compBg = '#0284c7';
              compStroke = '#0369a1';
            } else {
              compBg = isDark ? '#475569' : '#94a3b8';
              compStroke = isDark ? '#64748b' : '#64748b';
            }
          } else if (item.data.name.includes('Diferencial') || item.data.name.includes('IDR')) {
            compBg = isDark ? '#1c1917' : '#fafaf9';
            compStroke = '#10b981';
            headerBg = '#059669';
            headerText = '#ffffff';
          } else if (item.data.name.includes('Disjuntor') || item.data.tag.startsWith('Q') || item.data.tag.startsWith('F')) {
            compBg = isDark ? '#1e293b' : '#ffffff';
            compStroke = isDark ? '#64748b' : '#94a3b8';
            headerBg = isDark ? '#334155' : '#f1f5f9';
            headerText = isDark ? '#38bdf8' : '#0284c7';
          }

          if (isTerminal) {
            return `
              <g transform="translate(${itemX}, ${itemY})">
                <rect x="0" y="0" width="${itemW}" height="${itemH}" fill="${compBg}" stroke="${compStroke}" stroke-width="0.8" rx="1.5" />
                <circle cx="${itemW / 2}" cy="4" r="${Math.min(2.5, itemW / 3)}" fill="#cbd5e1" stroke="#475569" stroke-width="0.5" />
                <circle cx="${itemW / 2}" cy="${itemH - 4}" r="${Math.min(2.5, itemW / 3)}" fill="#cbd5e1" stroke="#475569" stroke-width="0.5" />
                ${itemW >= 10 ? `
                  <text x="${itemW / 2}" y="${itemH / 2 + 3}" fill="#ffffff" font-size="6.5" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
                    ${escapeXml(item.tag)}
                  </text>
                ` : ''}
              </g>
            `;
          }

          return `
            <g transform="translate(${itemX}, ${itemY})">
              <!-- Component Body -->
              <rect x="0" y="0" width="${itemW}" height="${itemH}" fill="${compBg}" stroke="${compStroke}" stroke-width="1.2" rx="2.5" />
              <!-- Top Header Stripe -->
              <rect x="0" y="0" width="${itemW}" height="${Math.min(16, itemH * 0.22)}" fill="${headerBg}" rx="2" />
              
              <!-- Tag Identification -->
              <text x="${itemW / 2}" y="${Math.min(11, itemH * 0.16)}" fill="${headerText}" font-size="${Math.min(8.5, Math.max(6, itemW * 0.2))}" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
                ${escapeXml(item.tag)}
              </text>

              <!-- Switch / Toggle Handle for Breakers -->
              ${item.data.category === 'protection_ac' || item.data.category === 'protection_dc' || item.data.category === 'residential_modular' || item.data.tag.startsWith('Q') || item.data.tag.startsWith('F') ? `
                <g transform="translate(${itemW / 2 - 3.5}, ${itemH * 0.45})">
                  <rect x="0" y="0" width="7" height="12" fill="#ef4444" stroke="#991b1b" stroke-width="0.8" rx="1.5" />
                  <line x1="1" y1="6" x2="6" y2="6" stroke="#ffffff" stroke-width="1" />
                </g>
              ` : ''}

              <!-- Rating / Specs -->
              <text x="${itemW / 2}" y="${itemH - 5}" fill="${textHeading}" font-size="${Math.min(7.5, Math.max(5.5, itemW * 0.18))}" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
                ${escapeXml(item.data.ratedCurrentA ? `${item.data.ratedCurrentA}A` : item.data.partNumber?.slice(0, 8) || '')}
              </text>
            </g>
          `;
        })
        .join('');

      return `
        <g id="rail_${rIdx}">
          <!-- Horizontal Duct between rails -->
          ${rIdx > 0 ? `
            <rect x="${cabX + svgSideDuctW}" y="${railYSvg - svgHorizDuctH - 8}" width="${svgCabW - svgSideDuctW * 2}" height="${svgHorizDuctH}" fill="${ductFill}" stroke="${ductStroke}" stroke-width="0.8" rx="2" />
            <!-- Slotted duct slots -->
            ${Array.from({ length: Math.floor((svgCabW - svgSideDuctW * 2) / 12) })
              .map((_, sIdx) => `
                <line x1="${cabX + svgSideDuctW + 6 + sIdx * 12}" y1="${railYSvg - svgHorizDuctH - 6}" x2="${cabX + svgSideDuctW + 6 + sIdx * 12}" y2="${railYSvg - 10}" stroke="${isDark ? '#0f172a' : '#cbd5e1'}" stroke-width="1.2" />
              `)
              .join('')}
          ` : ''}

          <!-- DIN 35mm Rail Metallic Profile -->
          <rect x="${railXSvg}" y="${railYSvg}" width="${railWSvg}" height="${railHeightSvg}" fill="${railFill}" stroke="${isDark ? '#334155' : '#64748b'}" stroke-width="1" rx="1.5" />
          <line x1="${railXSvg}" y1="${railYSvg + railHeightSvg * 0.25}" x2="${railXSvg + railWSvg}" y2="${railYSvg + railHeightSvg * 0.25}" stroke="${isDark ? '#64748b' : '#cbd5e1'}" stroke-width="0.8" />
          <line x1="${railXSvg}" y1="${railYSvg + railHeightSvg * 0.75}" x2="${railXSvg + railWSvg}" y2="${railYSvg + railHeightSvg * 0.75}" stroke="${isDark ? '#334155' : '#64748b'}" stroke-width="0.8" />

          <!-- Rail Label -->
          <text x="${railXSvg + 6}" y="${railYSvg - 4}" fill="${accentBlue}" font-size="7.5" font-weight="bold" font-family="JetBrains Mono, monospace">
            ${escapeXml(rail.name || `Calha DIN ${rIdx + 1}`)} (${rail.items.length} componentes)
          </text>

          <!-- Components on Rail -->
          ${itemsSvg}
        </g>
      `;
    })
    .join('');

  // Right Side Engineering Specs Card (between cabinet and title block)
  const specCardX = 730;
  const specCardY = 120;
  const specCardW = 440;
  const specCardH = 500;

  const totalCompsCount = rails.reduce((sum, r) => sum + r.items.length, 0);
  const totalBreakers = rails.reduce((sum, r) => sum + r.items.filter((it) => it.data.category === 'protection_ac' || it.data.category === 'protection_dc' || it.data.category === 'residential_modular' || it.data.tag.startsWith('Q')).length, 0);
  const totalTerminals = rails.reduce((sum, r) => sum + r.items.filter((it) => it.data.category === 'terminals').length, 0);
  const totalUsableWidth = rails.reduce((sum, r) => sum + (r.usableWidthMm || cabWidthMm - sideDuctW * 2), 0);
  const totalOccupiedWidth = rails.reduce((sum, r) => sum + r.items.reduce((iSum, it) => iSum + it.data.widthMm, 0), 0);
  const occupancyPercent = totalUsableWidth > 0 ? Math.round((totalOccupiedWidth / totalUsableWidth) * 100) : 0;
  const reservePercent = Math.max(0, 100 - occupancyPercent);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
      <defs>
        <pattern id="grid_layout_${theme}" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${gridStroke}" stroke-width="0.5" stroke-opacity="0.4" />
        </pattern>
      </defs>

      <!-- Sheet Background -->
      <rect width="1200" height="800" fill="${bg}" />
      <rect width="1200" height="800" fill="url(#grid_layout_${theme})" />

      <!-- Outer IEC Frame & Border -->
      <rect x="20" y="20" width="1160" height="760" fill="none" stroke="${borderOuter}" stroke-width="2" />
      <rect x="25" y="25" width="1150" height="750" fill="none" stroke="${borderInner}" stroke-width="1" />

      <!-- IEC Grid Coordinates -->
      ${['A', 'B', 'C', 'D', 'E', 'F']
        .map((l, i) => `<text x="12" y="${75 + i * 125}" fill="${textMuted}" font-size="10" font-family="JetBrains Mono, monospace" text-anchor="middle">${l}</text>`)
        .join('')}
      ${['1', '2', '3', '4', '5', '6', '7', '8']
        .map((n, i) => `<text x="${80 + i * 135}" y="16" fill="${textMuted}" font-size="10" font-family="JetBrains Mono, monospace" text-anchor="middle">${n}</text>`)
        .join('')}

      <!-- Top Title Banner -->
      <text x="50" y="55" fill="${textHeading}" font-size="16" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif">
        DISPOSIÇÃO FÍSICA &amp; LAYOUT MECÂNICO 2D DO QUADRO (EN 61439-1 / EN 61439-2)
      </text>
      <text x="50" y="75" fill="${textBody}" font-size="11" font-family="JetBrains Mono, monospace">
        ENVOLVENTE: ${cabWidthMm}×${cabHeightMm}×${cabDepthMm}mm | GRAU: ${escapeXml(config.ipRating || 'IP55')} | IMPACTO: ${escapeXml(config.ikRating || 'IK08')} | CALHAS DIN: ${rails.length} NÍVEIS
      </text>

      <!-- ========================================================
           CABINET 2D FRONT VIEW WITH DIMENSIONS & DUCTS
           ======================================================== -->
      <!-- Cabinet Exterior Shadow -->
      <rect x="${cabX + 4}" y="${cabY + 4}" width="${svgCabW}" height="${svgCabH}" fill="#000000" fill-opacity="0.25" rx="6" />

      <!-- Enclosure Outer Steel / Thermoplastic Box -->
      <rect x="${cabX}" y="${cabY}" width="${svgCabW}" height="${svgCabH}" fill="${encBezel}" stroke="${encOuterStroke}" stroke-width="2.5" rx="5" />
      <!-- Enclosure Inner Usable Mounting Area -->
      <rect x="${cabX + 6}" y="${cabY + 6}" width="${svgCabW - 12}" height="${svgCabH - 12}" fill="${encFill}" stroke="${encOuterStroke}" stroke-width="1.2" rx="3" />

      <!-- Left Vertical Lateral Duct -->
      <rect x="${cabX + 6}" y="${cabY + 6}" width="${svgSideDuctW}" height="${svgCabH - 12}" fill="${ductFill}" stroke="${ductStroke}" stroke-width="0.8" />
      ${Array.from({ length: Math.floor((svgCabH - 12) / 14) })
        .map((_, dIdx) => `
          <line x1="${cabX + 8}" y1="${cabY + 12 + dIdx * 14}" x2="${cabX + 6 + svgSideDuctW - 2}" y2="${cabY + 12 + dIdx * 14}" stroke="${isDark ? '#0f172a' : '#cbd5e1'}" stroke-width="1.5" />
        `)
        .join('')}

      <!-- Right Vertical Lateral Duct -->
      <rect x="${cabX + svgCabW - 6 - svgSideDuctW}" y="${cabY + 6}" width="${svgSideDuctW}" height="${svgCabH - 12}" fill="${ductFill}" stroke="${ductStroke}" stroke-width="0.8" />
      ${Array.from({ length: Math.floor((svgCabH - 12) / 14) })
        .map((_, dIdx) => `
          <line x1="${cabX + svgCabW - 6 - svgSideDuctW + 2}" y1="${cabY + 12 + dIdx * 14}" x2="${cabX + svgCabW - 8}" y2="${cabY + 12 + dIdx * 14}" stroke="${isDark ? '#0f172a' : '#cbd5e1'}" stroke-width="1.5" />
        `)
        .join('')}

      <!-- Rails & Components -->
      ${railsSvg}

      <!-- Cable Glands Top & Bottom -->
      ${renderGlandRow(topGlands, true)}
      ${renderGlandRow(bottomGlands, false)}

      <!-- Outer Dimension Arrows (Cotagem Industrial) -->
      <!-- Width Dimension Line (Above) -->
      <g transform="translate(0, -18)">
        <line x1="${cabX}" y1="${cabY}" x2="${cabX + svgCabW}" y2="${cabY}" stroke="${accentBlue}" stroke-width="1.2" />
        <line x1="${cabX}" y1="${cabY - 5}" x2="${cabX}" y2="${cabY + 5}" stroke="${accentBlue}" stroke-width="1.2" />
        <line x1="${cabX + svgCabW}" y1="${cabY - 5}" x2="${cabX + svgCabW}" y2="${cabY + 5}" stroke="${accentBlue}" stroke-width="1.2" />
        <rect x="${cabX + svgCabW / 2 - 32}" y="${cabY - 8}" width="64" height="15" fill="${bg}" rx="2" />
        <text x="${cabX + svgCabW / 2}" y="${cabY + 3}" fill="${accentBlue}" font-size="9" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
          L = ${cabWidthMm} mm
        </text>
      </g>

      <!-- Height Dimension Line (Left) -->
      <g transform="translate(-20, 0)">
        <line x1="${cabX}" y1="${cabY}" x2="${cabX}" y2="${cabY + svgCabH}" stroke="${accentBlue}" stroke-width="1.2" />
        <line x1="${cabX - 5}" y1="${cabY}" x2="${cabX + 5}" y2="${cabY}" stroke="${accentBlue}" stroke-width="1.2" />
        <line x1="${cabX - 5}" y1="${cabY + svgCabH}" x2="${cabX + 5}" y2="${cabY + svgCabH}" stroke="${accentBlue}" stroke-width="1.2" />
        <rect x="${cabX - 8}" y="${cabY + svgCabH / 2 - 12}" width="16" height="24" fill="${bg}" rx="2" />
        <text x="${cabX}" y="${cabY + svgCabH / 2 + 4}" fill="${accentBlue}" font-size="9" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle" transform="rotate(-90 ${cabX} ${cabY + svgCabH / 2 + 4})">
          A = ${cabHeightMm} mm
        </text>
      </g>

      <!-- ========================================================
           RIGHT SPECIFICATION CARDS & SUMMARY
           ======================================================== -->
      <g transform="translate(${specCardX}, ${specCardY})">
        <!-- Card 1: Mechanical & Dimensional Characteristics -->
        <rect x="0" y="0" width="${specCardW}" height="140" fill="${isDark ? '#1e293b' : '#f8fafc'}" stroke="${isDark ? '#334155' : '#cbd5e1'}" stroke-width="1.2" rx="4" />
        <rect x="0" y="0" width="${specCardW}" height="24" fill="${isDark ? '#0369a1' : '#e0f2fe'}" rx="3" />
        <text x="12" y="16" fill="${isDark ? '#ffffff' : '#0369a1'}" font-size="10" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif">
          1. ESPECIFICAÇÕES MECÂNICAS DO ENVOLVENTE (EN 62208)
        </text>

        <g transform="translate(14, 38)" font-family="JetBrains Mono, monospace" font-size="8.5">
          <text x="0" y="0" fill="${textMuted}">Dimensões Exteriores:</text>
          <text x="175" y="0" fill="${textHeading}" font-weight="bold">${cabWidthMm} × ${cabHeightMm} × ${cabDepthMm} mm (L×A×P)</text>

          <text x="0" y="18" fill="${textMuted}">Material Construtivo:</text>
          <text x="175" y="18" fill="${textHeading}" font-weight="bold">${config.enclosureMaterial === 'sheet_steel' ? 'Chapa de Aço Laminado (Pintura RAL 7035)' : config.enclosureMaterial === 'stainless_steel' ? 'Aço Inoxidável AISI 304/316' : 'Termoplástico Reforçado Auto-extinguível'}</text>

          <text x="0" y="36" fill="${textMuted}">Grau de Estanqueidade:</text>
          <text x="175" y="36" fill="${accentBlue}" font-weight="bold">${escapeXml(config.ipRating || 'IP55')} (Norma EN 60529)</text>

          <text x="0" y="54" fill="${textMuted}">Resistência ao Impacto:</text>
          <text x="175" y="54" fill="${accentBlue}" font-weight="bold">${escapeXml(config.ikRating || 'IK08')} (Norma EN 62262)</text>

          <text x="0" y="72" fill="${textMuted}">Porta e Fecho:</text>
          <text x="175" y="72" fill="${textHeading}" font-weight="bold">${config.hasDoor !== false ? 'Porta com Vedante de Poliuretano & Fecho DIN' : 'Sem porta frontal (Chassis aberto)'}</text>

          <text x="0" y="90" fill="${textMuted}">Entrada de Cabos (Bucins):</text>
          <text x="175" y="90" fill="${textHeading}" font-weight="bold">${glands.length} bucins instalados (${topGlands.length} topo, ${bottomGlands.length} fundo)</text>
        </g>

        <!-- Card 2: DIN Rails & Component Capacity -->
        <g transform="translate(0, 155)">
          <rect x="0" y="0" width="${specCardW}" height="145" fill="${isDark ? '#1e293b' : '#f8fafc'}" stroke="${isDark ? '#334155' : '#cbd5e1'}" stroke-width="1.2" rx="4" />
          <rect x="0" y="0" width="${specCardW}" height="24" fill="${isDark ? '#0369a1' : '#e0f2fe'}" rx="3" />
          <text x="12" y="16" fill="${isDark ? '#ffffff' : '#0369a1'}" font-size="10" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif">
            2. OCUPAÇÃO DE CALHAS DIN &amp; RESERVA MODULAR (RTIEBT 539)
          </text>

          <g transform="translate(14, 38)" font-family="JetBrains Mono, monospace" font-size="8.5">
            <text x="0" y="0" fill="${textMuted}">Calhas DIN Instaladas:</text>
            <text x="175" y="0" fill="${textHeading}" font-weight="bold">${rails.length} calhas simétricas 35×7.5 mm</text>

            <text x="0" y="18" fill="${textMuted}">Total de Aparelhos Montados:</text>
            <text x="175" y="18" fill="${textHeading}" font-weight="bold">${totalCompsCount} aparelhos (${totalBreakers} disjuntores, ${totalTerminals} bornes)</text>

            <text x="0" y="36" fill="${textMuted}">Largura Ocupada / Útil:</text>
            <text x="175" y="36" fill="${textHeading}" font-weight="bold">${totalOccupiedWidth} mm / ${totalUsableWidth} mm (${occupancyPercent}%)</text>

            <text x="0" y="54" fill="${textMuted}">Reserva Modular para Futuro:</text>
            <text x="175" y="54" fill="${reservePercent >= 20 ? '#10b981' : '#ef4444'}" font-weight="bold">${reservePercent}% ${reservePercent >= 20 ? '(CONFORME RTIEBT ≥ 20%)' : '(RECOMENDA-SE ≥ 20%)'}</text>

            <text x="0" y="72" fill="${textMuted}">Canaletas Ranhuradas:</text>
            <text x="175" y="72" fill="${textHeading}" font-weight="bold">Laterais ${sideDuctW}mm / Horizontais ${horizDuctH}mm</text>

            <text x="0" y="90" fill="${textMuted}">Balanço Térmico Calculado:</text>
            <text x="175" y="90" fill="#10b981" font-weight="bold">Temperatura interior estimada &lt; 35°C (Conforme)</text>
          </g>
        </g>
      </g>

      <!-- ========================================================
           CARIMBO TÉCNICO / TITLE BLOCK (IEC 61082)
           ======================================================== -->
      <g transform="translate(730, 640)">
        <rect x="0" y="0" width="440" height="130" fill="${titleBlockBg}" stroke="${titleBlockBorder}" stroke-width="1.5" />
        <line x1="0" y1="32" x2="440" y2="32" stroke="${titleBlockDivider}" stroke-width="1" />
        <line x1="0" y1="70" x2="440" y2="70" stroke="${titleBlockDivider}" stroke-width="1" />
        <line x1="0" y1="100" x2="440" y2="100" stroke="${titleBlockDivider}" stroke-width="1" />
        <line x1="240" y1="0" x2="240" y2="70" stroke="${titleBlockDivider}" stroke-width="1" />
        <line x1="330" y1="70" x2="330" y2="130" stroke="${titleBlockDivider}" stroke-width="1" />

        <text x="12" y="19" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">PROJETO:</text>
        <text x="65" y="21" fill="${textHeading}" font-size="10" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif">
          ${escapeXml(config.name)}
        </text>

        <text x="250" y="19" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">CÓDIGO:</text>
        <text x="300" y="21" fill="${accentBlue}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
          ${escapeXml(config.projectCode)}
        </text>

        <text x="12" y="52" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">CLIENTE:</text>
        <text x="65" y="54" fill="${textBody}" font-size="9" font-family="Plus Jakarta Sans, sans-serif">
          ${escapeXml(config.clientName || 'Cliente Industrial')}
        </text>

        <text x="250" y="52" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">PROJETISTA:</text>
        <text x="315" y="54" fill="${textBody}" font-size="9" font-family="Plus Jakarta Sans, sans-serif">
          ${escapeXml(config.designerName || 'Engenheiro Responsável')}
        </text>

        <text x="12" y="88" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">DATA / REV:</text>
        <text x="80" y="89" fill="${textHeading}" font-size="9" font-family="JetBrains Mono, monospace">
          ${escapeXml(config.date)} · Rev 1.0
        </text>

        <text x="340" y="88" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">FOLHA:</text>
        <text x="385" y="89" fill="${accentBlue}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
          LAYOUT 2D
        </text>

        <text x="12" y="118" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">
          NORMA TÉCNICA: EN 61439-1 / EN 62208 / CE
        </text>
        <text x="340" y="118" fill="#10b981" font-size="9" font-weight="bold" font-family="JetBrains Mono, monospace">
          APROVADO
        </text>
      </g>
    </svg>
  `;
}
