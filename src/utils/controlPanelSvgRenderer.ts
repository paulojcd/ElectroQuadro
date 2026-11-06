import { ProjectState, ControlPanelConfig, ControlPanelDevice } from '../types/electrical';
import { getDefaultControlPanelConfig } from '../data/controlPanelCatalog';
import { escapeXml, SchematicTheme } from './schematicSvgRenderer';

/**
 * Generates a clean, technical 1200x800 SVG representation of the Front Door / HMI Control Panel
 * including complete 2D layout, dimension callouts (cotas), and CNC drilling schedule table.
 * Normative references: IEC 60947-5-1 (pushbuttons 22.5mm), IEC 60204-1, EN 61439-1/2.
 */
export function generateControlPanelSvgString(
  project: ProjectState,
  theme: SchematicTheme = 'light'
): string {
  const isDark = theme === 'dark';
  const config = project.config;
  const controlPanel: ControlPanelConfig = project.controlPanel || getDefaultControlPanelConfig(
    config.widthMm || 600,
    config.heightMm || 800
  );

  const doorWidthMm = Math.max(300, controlPanel.widthMm || config.widthMm || 600);
  const doorHeightMm = Math.max(400, controlPanel.heightMm || config.heightMm || 800);
  const devices = controlPanel.devices || [];

  // Color Palette
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

  // Door Material Finish
  const isStainless = controlPanel.finishColor === 'stainless';
  const isRal7032 = controlPanel.finishColor === 'ral_7032';
  const doorFill = isStainless
    ? (isDark ? '#334155' : '#e2e8f0')
    : isRal7032
    ? (isDark ? '#292524' : '#e7e5e4')
    : (isDark ? '#1e293b' : '#f1f5f9'); // RAL 7035 default
  const doorStroke = isDark ? '#64748b' : '#475569';

  // Left viewport for Door CAD layout: x = 60 to 660 (width 600), y = 90 to 670 (height 580)
  const drawAreaX = 60;
  const drawAreaY = 95;
  const maxDrawW = 540;
  const maxDrawH = 570;

  // Scale factor to fit the door proportionally within draw area
  const scale = Math.min(maxDrawW / doorWidthMm, maxDrawH / doorHeightMm);
  const svgDoorW = doorWidthMm * scale;
  const svgDoorH = doorHeightMm * scale;

  // Center door in draw area
  const doorX = drawAreaX + (maxDrawW - svgDoorW) / 2;
  const doorY = drawAreaY + (maxDrawH - svgDoorH) / 2;

  // Safe drilling margin (45mm gasket clearance)
  const safeMarginMm = 45;
  const safeMarginSvg = safeMarginMm * scale;

  // Render individual devices on the door
  const devicesSvg = devices.map((dev) => {
    // Coordinate conversion: dev.xMm and dev.yMm are center or top-left from door top-left
    const devX = doorX + (dev.xMm * scale);
    const devY = doorY + (dev.yMm * scale);
    const devW = Math.max(8, dev.widthMm * scale);
    const devH = Math.max(8, dev.heightMm * scale);
    const holeDiaMm = dev.cutoutType === 'round' ? (dev.holeDiameterMm || 22.5) : null;
    const holeDiaSvg = holeDiaMm ? Math.max(6, holeDiaMm * scale) : 0;
    const holeRadiusSvg = holeDiaSvg / 2;

    // Y coordinate from bottom edge (CNC conventional origin: lower-left corner)
    const yFromBottomMm = Math.round(doorHeightMm - dev.yMm);
    const xFromLeftMm = Math.round(dev.xMm);

    let devBodySvg = '';

    if (dev.type === 'hmi') {
      // HMI Screen with Bezel, Display and Logo
      const bezelW = devW;
      const bezelH = devH;
      const screenW = bezelW * 0.82;
      const screenH = bezelH * 0.72;
      devBodySvg = `
        <g transform="translate(${-bezelW / 2}, ${-bezelH / 2})">
          <!-- Outer Bezel -->
          <rect x="0" y="0" width="${bezelW}" height="${bezelH}" rx="4" fill="${isDark ? '#020617' : '#1e293b'}" stroke="${isDark ? '#38bdf8' : '#0284c7'}" stroke-width="1.8" />
          <!-- Screen Area -->
          <rect x="${(bezelW - screenW) / 2}" y="${(bezelH - screenH) / 2 - 2}" width="${screenW}" height="${screenH}" rx="2" fill="${isDark ? '#0f172a' : '#0284c7'}" stroke="${isDark ? '#1e293b' : '#0369a1'}" stroke-width="1" />
          <!-- Header Bar on Screen -->
          <rect x="${(bezelW - screenW) / 2}" y="${(bezelH - screenH) / 2 - 2}" width="${screenW}" height="${Math.min(12, screenH * 0.22)}" fill="${isDark ? '#1e293b' : '#0369a1'}" />
          <text x="${bezelW / 2}" y="${(bezelH - screenH) / 2 + 5}" fill="#ffffff" font-size="${Math.max(6, bezelW * 0.045)}" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif" text-anchor="middle">
            ${escapeXml(dev.brand || 'SIEMENS HMI')}
          </text>
          <!-- Cutout perimeter dashed line (CNC hole) -->
          <rect x="-3" y="-3" width="${bezelW + 6}" height="${bezelH + 6}" rx="5" fill="none" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="3 2" />
          <!-- Device Tag Badge -->
          <rect x="${bezelW / 2 - 22}" y="${bezelH - 10}" width="44" height="12" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="0.8" />
          <text x="${bezelW / 2}" y="${bezelH - 2}" fill="#38bdf8" font-size="7.5" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
            ${escapeXml(dev.tag)}
          </text>
        </g>
      `;
    } else if (dev.type === 'emergency_stop') {
      // Mushroom Emergency Stop with Ø60mm Yellow Collar and Red Head
      const collarR = Math.max(14, 30 * scale);
      const headR = Math.max(10, 20 * scale);
      devBodySvg = `
        <g>
          <!-- Yellow Warning Ring Ø60mm -->
          <circle cx="0" cy="0" r="${collarR}" fill="#eab308" stroke="#ca8a04" stroke-width="1.5" />
          <!-- Cutout Circle Ø22.5mm dashed -->
          <circle cx="0" cy="0" r="${holeRadiusSvg}" fill="none" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="2 1.5" />
          <!-- Red Mushroom Head Ø40mm -->
          <circle cx="0" cy="0" r="${headR}" fill="#dc2626" stroke="#991b1b" stroke-width="1.8" />
          <circle cx="0" cy="0" r="${headR * 0.65}" fill="#b91c1c" stroke="#7f1d1d" stroke-width="1" />
          <!-- Emergency Legend Arc/Text -->
          <text x="0" y="${collarR + 8}" fill="#dc2626" font-size="7" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
            ${escapeXml(dev.label || 'EMERGÊNCIA')}
          </text>
          <text x="0" y="${collarR + 15}" fill="${accentBlue}" font-size="6.5" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
            [${escapeXml(dev.tag)}] Ø22.5
          </text>
        </g>
      `;
    } else if (dev.type === 'meter') {
      // 96x96mm Power Meter / Multimeter
      const meterW = devW;
      const meterH = devH;
      devBodySvg = `
        <g transform="translate(${-meterW / 2}, ${-meterH / 2})">
          <rect x="0" y="0" width="${meterW}" height="${meterH}" rx="2" fill="#0f172a" stroke="#64748b" stroke-width="1.5" />
          <!-- Cutout line -->
          <rect x="-2" y="-2" width="${meterW + 4}" height="${meterH + 4}" rx="3" fill="none" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="3 2" />
          <!-- LCD Display -->
          <rect x="4" y="4" width="${meterW - 8}" height="${meterH * 0.55}" rx="1" fill="#064e3b" stroke="#047857" stroke-width="1" />
          <text x="${meterW / 2}" y="${meterH * 0.32}" fill="#34d399" font-size="7" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
            230.4 V · 50.0 Hz
          </text>
          <text x="${meterW / 2}" y="${meterH - 5}" fill="#e2e8f0" font-size="6.5" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
            ${escapeXml(dev.tag)} (${escapeXml(dev.partNumber || 'PM5350')})
          </text>
        </g>
      `;
    } else if (dev.type === 'selector') {
      // 22.5mm Rotary Selector Switch
      const bezelR = Math.max(9, 15 * scale);
      devBodySvg = `
        <g>
          <!-- Cutout Circle Ø22.5mm -->
          <circle cx="0" cy="0" r="${holeRadiusSvg}" fill="none" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="2 1.5" />
          <!-- Outer Bezel -->
          <circle cx="0" cy="0" r="${bezelR}" fill="#1e293b" stroke="#64748b" stroke-width="1.2" />
          <!-- Selector Knob Line -->
          <rect x="-3" y="${-bezelR * 0.75}" width="6" height="${bezelR * 1.5}" rx="1.5" fill="#f8fafc" stroke="#0f172a" stroke-width="0.5" />
          <!-- Legend Plate below -->
          <rect x="-18" y="${bezelR + 2}" width="36" height="11" rx="1.5" fill="#0f172a" stroke="#475569" stroke-width="0.6" />
          <text x="0" y="${bezelR + 10}" fill="#ffffff" font-size="6" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
            ${escapeXml(dev.label || dev.tag)}
          </text>
        </g>
      `;
    } else if (dev.type === 'pilot_light') {
      // 22.5mm Pilot LED Indicator
      const lensR = Math.max(8, 14 * scale);
      const color = dev.color || '#16a34a';
      devBodySvg = `
        <g>
          <!-- Cutout Circle Ø22.5mm -->
          <circle cx="0" cy="0" r="${holeRadiusSvg}" fill="none" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="2 1.5" />
          <!-- Chrome Outer Ring -->
          <circle cx="0" cy="0" r="${lensR}" fill="#334155" stroke="#94a3b8" stroke-width="1.2" />
          <!-- Colored Lens -->
          <circle cx="0" cy="0" r="${lensR * 0.78}" fill="${color}" stroke="#ffffff" stroke-width="0.6" />
          <circle cx="${-lensR * 0.25}" cy="${-lensR * 0.25}" r="${lensR * 0.25}" fill="#ffffff" fill-opacity="0.4" />
          <!-- Legend text -->
          <text x="0" y="${lensR + 9}" fill="${textHeading}" font-size="6" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
            ${escapeXml(dev.label || dev.tag)}
          </text>
        </g>
      `;
    } else {
      // Standard Pushbutton 22.5mm (Impulso verde, vermelho, etc.)
      const btnR = Math.max(8, 14 * scale);
      const color = dev.color || '#16a34a';
      devBodySvg = `
        <g>
          <!-- Cutout Circle Ø22.5mm -->
          <circle cx="0" cy="0" r="${holeRadiusSvg}" fill="none" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="2 1.5" />
          <!-- Chrome / Plastic Bezel -->
          <circle cx="0" cy="0" r="${btnR}" fill="#1e293b" stroke="#94a3b8" stroke-width="1.2" />
          <!-- Actuator Button -->
          <circle cx="0" cy="0" r="${btnR * 0.75}" fill="${color}" stroke="#0f172a" stroke-width="0.6" />
          <!-- Engraving Plaque / Legend -->
          <rect x="-18" y="${btnR + 2}" width="36" height="11" rx="1.5" fill="#0f172a" stroke="#475569" stroke-width="0.6" />
          <text x="0" y="${btnR + 10}" fill="#ffffff" font-size="6" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
            ${escapeXml(dev.label || dev.tag)}
          </text>
        </g>
      `;
    }

    // Dimension crosshairs and center coordinates callout
    return `
      <g transform="translate(${devX}, ${devY})">
        <!-- Center crosshairs for drilling tool targeting -->
        <line x1="-8" y1="0" x2="8" y2="0" stroke="#ef4444" stroke-width="0.6" stroke-dasharray="1.5 1" />
        <line x1="0" y1="-8" x2="0" y2="8" stroke="#ef4444" stroke-width="0.6" stroke-dasharray="1.5 1" />
        <!-- Render device representation -->
        ${devBodySvg}
        <!-- Dimension Tooltip Callout (X, Y) -->
        <g transform="translate(0, -${Math.max(16, devH / 2 + 10)})">
          <rect x="-32" y="-10" width="64" height="12" rx="2" fill="${isDark ? '#0f172a' : '#ffffff'}" stroke="${accentBlue}" stroke-width="0.6" />
          <text x="0" y="-1.5" fill="${accentBlue}" font-size="6.5" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
            X:${xFromLeftMm} Y:${yFromBottomMm}
          </text>
        </g>
      </g>
    `;
  }).join('');

  // Right Table Area: Drilling Schedule Table (Mapa de Furação CNC)
  const tableX = 640;
  const tableY = 95;
  const tableW = 520;
  const tableH = 570;

  // Build rows for drilling schedule
  const tableRows = devices.slice(0, 11).map((dev, idx) => {
    const yFromBottomMm = Math.round(doorHeightMm - dev.yMm);
    const xFromLeftMm = Math.round(dev.xMm);
    const rowY = tableY + 68 + idx * 24;
    const isEven = idx % 2 === 0;
    const rowBg = isEven
      ? (isDark ? '#1e293b' : '#f8fafc')
      : (isDark ? '#0f172a' : '#ffffff');

    const cutoutText = dev.cutoutType === 'round'
      ? `Furo Ø${dev.holeDiameterMm || 22.5} mm`
      : `Recorte ${dev.widthMm}×${dev.heightMm} mm`;

    return `
      <rect x="${tableX}" y="${rowY}" width="${tableW}" height="24" fill="${rowBg}" stroke="${isDark ? '#334155' : '#e2e8f0'}" stroke-width="0.5" />
      <!-- Tag -->
      <text x="${tableX + 10}" y="${rowY + 15}" fill="${accentBlue}" font-size="8.5" font-weight="bold" font-family="JetBrains Mono, monospace">
        ${escapeXml(dev.tag)}
      </text>
      <!-- Description & Brand -->
      <text x="${tableX + 65}" y="${rowY + 11}" fill="${textHeading}" font-size="7.5" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif">
        ${escapeXml(dev.name.slice(0, 26))}
      </text>
      <text x="${tableX + 65}" y="${rowY + 20}" fill="${textMuted}" font-size="6.5" font-family="JetBrains Mono, monospace">
        ${escapeXml(dev.partNumber || dev.brand || 'IEC 60947-5-1')}
      </text>
      <!-- Cutout / Hole -->
      <text x="${tableX + 265}" y="${rowY + 15}" fill="${dev.cutoutType === 'round' ? '#10b981' : '#f59e0b'}" font-size="7.5" font-weight="bold" font-family="JetBrains Mono, monospace">
        ${escapeXml(cutoutText)}
      </text>
      <!-- Coord X -->
      <text x="${tableX + 380}" y="${rowY + 15}" fill="${textHeading}" font-size="8" font-family="JetBrains Mono, monospace" text-anchor="middle">
        ${xFromLeftMm} mm
      </text>
      <!-- Coord Y -->
      <text x="${tableX + 450}" y="${rowY + 15}" fill="${textHeading}" font-size="8" font-family="JetBrains Mono, monospace" text-anchor="middle">
        ${yFromBottomMm} mm
      </text>
    `;
  }).join('');

  // Count holes by type
  const roundHoles = devices.filter((d) => d.cutoutType === 'round');
  const rectCutouts = devices.filter((d) => d.cutoutType === 'rectangular');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
      <defs>
        <!-- Background Grid Pattern -->
        <pattern id="panel-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${gridStroke}" stroke-width="0.6" />
        </pattern>
        <!-- Crosshair Marker -->
        <marker id="crosshair" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
          <circle cx="5" cy="5" r="3" fill="#ef4444" />
        </marker>
        <!-- Arrowhead Marker -->
        <marker id="dim-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${accentBlue}" />
        </marker>
      </defs>

      <!-- Background -->
      <rect width="1200" height="800" fill="${bg}" />
      <rect width="1200" height="800" fill="url(#panel-grid)" />

      <!-- Outer IEC Sheet Border -->
      <rect x="20" y="20" width="1160" height="760" fill="none" stroke="${borderOuter}" stroke-width="1.8" />
      <rect x="25" y="25" width="1150" height="750" fill="none" stroke="${borderInner}" stroke-width="0.8" />

      <!-- Coordinate Grid Reference (A-F, 1-8) -->
      ${['A', 'B', 'C', 'D', 'E', 'F'].map((l, i) => `
        <text key="${l}" x="12" y="${75 + i * 125}" fill="${textMuted}" font-size="9" font-family="JetBrains Mono, monospace" text-anchor="middle">${l}</text>
        <text key="${l}-r" x="1188" y="${75 + i * 125}" fill="${textMuted}" font-size="9" font-family="JetBrains Mono, monospace" text-anchor="middle">${l}</text>
      `).join('')}
      ${[1, 2, 3, 4, 5, 6, 7, 8].map((n, i) => `
        <text key="${n}" x="${80 + i * 140}" y="14" fill="${textMuted}" font-size="9" font-family="JetBrains Mono, monospace" text-anchor="middle">${n}</text>
        <text key="${n}-b" x="${80 + i * 140}" y="792" fill="${textMuted}" font-size="9" font-family="JetBrains Mono, monospace" text-anchor="middle">${n}</text>
      `).join('')}

      <!-- Prancha Header Banner -->
      <g transform="translate(45, 38)">
        <rect x="0" y="0" width="1110" height="38" rx="3" fill="${isDark ? '#090d16' : '#0f172a'}" />
        <text x="16" y="24" fill="#ffffff" font-size="13" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif">
          PRANCHA 02: PORTA FRONTAL, PAINEL HMI & MAPA DE FURAÇÃO CNC (IEC 60947-5-1 / EN 61439-1)
        </text>
        <text x="1090" y="24" fill="${accentBlue}" font-size="10.5" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="end">
          PORTA: ${doorWidthMm}×${doorHeightMm} mm · ${escapeXml(controlPanel.finishColor.toUpperCase())} · DOBRADIÇAS À ${controlPanel.hingeSide === 'left' ? 'ESQUERDA' : 'DIREITA'}
        </text>
      </g>

      <!-- ========================================================
           LEFT: 2D FRONT DOOR DRAWING WITH DEVICES AND DIMENSIONS
           ======================================================== -->
      <g id="door-cad-drawing">
        <!-- Door Shadow / Background -->
        <rect x="${doorX + 3}" y="${doorY + 3}" width="${svgDoorW}" height="${svgDoorH}" rx="4" fill="#000000" fill-opacity="0.15" />
        
        <!-- Door Metallic Sheet -->
        <rect x="${doorX}" y="${doorY}" width="${svgDoorW}" height="${svgDoorH}" rx="4" fill="${doorFill}" stroke="${doorStroke}" stroke-width="2" />
        
        <!-- Door Gasket Seal / Grelha de Segurança (45mm margin) -->
        <rect 
          x="${doorX + safeMarginSvg}" 
          y="${doorY + safeMarginSvg}" 
          width="${Math.max(10, svgDoorW - safeMarginSvg * 2)}" 
          height="${Math.max(10, svgDoorH - safeMarginSvg * 2)}" 
          rx="2" 
          fill="none" 
          stroke="${isDark ? '#0284c7' : '#0369a1'}" 
          stroke-width="0.8" 
          stroke-dasharray="4 3" 
        />
        <text x="${doorX + safeMarginSvg + 6}" y="${doorY + safeMarginSvg + 12}" fill="${isDark ? '#38bdf8' : '#0284c7'}" font-size="6.5" font-family="JetBrains Mono, monospace">
          LIMITE ÚTIL DE FURAÇÃO (FOLGA 45mm DA VEDAÇÃO IP55/65)
        </text>

        <!-- Hinges (Dobradiças) -->
        ${(() => {
          const hingeX = controlPanel.hingeSide === 'left' ? doorX - 6 : doorX + svgDoorW + 1;
          const hTopY = doorY + svgDoorH * 0.18;
          const hBottomY = doorY + svgDoorH * 0.82;
          return `
            <rect x="${hingeX}" y="${hTopY}" width="5" height="26" rx="2" fill="${isDark ? '#64748b' : '#334155'}" stroke="#0f172a" stroke-width="0.8" />
            <rect x="${hingeX}" y="${hBottomY}" width="5" height="26" rx="2" fill="${isDark ? '#64748b' : '#334155'}" stroke="#0f172a" stroke-width="0.8" />
          `;
        })()}

        <!-- Door Lock / Handle (Fecho de Fenda / Chave Duplo Palhetão) -->
        ${(() => {
          const lockX = controlPanel.hingeSide === 'left' ? doorX + svgDoorW - 16 : doorX + 16;
          const lockY = doorY + svgDoorH / 2;
          return `
            <circle cx="${lockX}" cy="${lockY}" r="7" fill="${isDark ? '#0f172a' : '#cbd5e1'}" stroke="${isDark ? '#64748b' : '#475569'}" stroke-width="1.2" />
            <rect x="${lockX - 1.5}" y="${lockY - 4}" width="3" height="8" rx="1" fill="#0f172a" />
          `;
        })()}

        <!-- Origin Point Marker (0, 0) at Lower Left -->
        <g transform="translate(${doorX}, ${doorY + svgDoorH})">
          <circle cx="0" cy="0" r="4.5" fill="#ef4444" stroke="#ffffff" stroke-width="1" />
          <!-- X axis arrow -->
          <line x1="0" y1="0" x2="35" y2="0" stroke="#ef4444" stroke-width="1.5" marker-end="url(#dim-arrow)" />
          <text x="40" y="3" fill="#ef4444" font-size="7.5" font-weight="bold" font-family="JetBrains Mono, monospace">+X</text>
          <!-- Y axis arrow -->
          <line x1="0" y1="0" x2="0" y2="-35" stroke="#ef4444" stroke-width="1.5" marker-end="url(#dim-arrow)" />
          <text x="-4" y="-40" fill="#ef4444" font-size="7.5" font-weight="bold" font-family="JetBrains Mono, monospace">+Y</text>
          <text x="6" y="-8" fill="#ef4444" font-size="6.5" font-weight="bold" font-family="JetBrains Mono, monospace">ORIGEM (0, 0)</text>
        </g>

        <!-- Outer Door Dimension Cotas -->
        <!-- Width Dimension (Top) -->
        <g transform="translate(0, ${doorY - 14})">
          <line x1="${doorX}" y1="0" x2="${doorX + svgDoorW}" y2="0" stroke="${accentBlue}" stroke-width="1" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)" />
          <line x1="${doorX}" y1="-4" x2="${doorX}" y2="12" stroke="${accentBlue}" stroke-width="0.8" />
          <line x1="${doorX + svgDoorW}" y1="-4" x2="${doorX + svgDoorW}" y2="12" stroke="${accentBlue}" stroke-width="0.8" />
          <rect x="${doorX + svgDoorW / 2 - 35}" y="-8" width="70" height="15" fill="${bg}" />
          <text x="${doorX + svgDoorW / 2}" y="3" fill="${accentBlue}" font-size="9" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
            LARGURA: ${doorWidthMm} mm
          </text>
        </g>

        <!-- Height Dimension (Left) -->
        <g transform="translate(${doorX - 16}, 0)">
          <line x1="0" y1="${doorY}" x2="0" y2="${doorY + svgDoorH}" stroke="${accentBlue}" stroke-width="1" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)" />
          <line x1="-4" y1="${doorY}" x2="12" y2="${doorY}" stroke="${accentBlue}" stroke-width="0.8" />
          <line x1="-4" y1="${doorY + svgDoorH}" x2="12" y2="${doorY + svgDoorH}" stroke="${accentBlue}" stroke-width="0.8" />
          <rect x="-14" y="${doorY + svgDoorH / 2 - 30}" width="60" height="15" fill="${bg}" transform="rotate(-90 16 ${doorY + svgDoorH / 2})" />
          <text x="0" y="${doorY + svgDoorH / 2}" fill="${accentBlue}" font-size="9" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle" transform="rotate(-90 0 ${doorY + svgDoorH / 2})">
            ALTURA: ${doorHeightMm} mm
          </text>
        </g>

        <!-- All Devices rendered on door -->
        ${devicesSvg}
      </g>

      <!-- ========================================================
           RIGHT: CNC DRILLING SCHEDULE TABLE & MANUFACTURING NOTES
           ======================================================== -->
      <g id="cnc-drilling-table">
        <!-- Table Outer Frame -->
        <rect x="${tableX}" y="${tableY}" width="${tableW}" height="${tableH}" rx="4" fill="${isDark ? '#090d16' : '#ffffff'}" stroke="${isDark ? '#334155' : '#cbd5e1'}" stroke-width="1.2" />
        
        <!-- Table Header Banner -->
        <rect x="${tableX}" y="${tableY}" width="${tableW}" height="32" rx="3" fill="${isDark ? '#1e293b' : '#0f172a'}" />
        <text x="${tableX + 14}" y="${tableY + 20}" fill="#ffffff" font-size="10.5" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif">
          MAPA DE FURAÇÃO CNC & COORDENADAS (ABSCISSA X, ORDENADA Y)
        </text>

        <!-- Table Column Titles -->
        <rect x="${tableX}" y="${tableY + 32}" width="${tableW}" height="26" fill="${isDark ? '#0f172a' : '#f1f5f9'}" stroke="${isDark ? '#334155' : '#cbd5e1'}" stroke-width="0.8" />
        <text x="${tableX + 10}" y="${tableY + 49}" fill="${textHeading}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">TAG</text>
        <text x="${tableX + 65}" y="${tableY + 49}" fill="${textHeading}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">EQUIPAMENTO / REF.</text>
        <text x="${tableX + 265}" y="${tableY + 49}" fill="${textHeading}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">RECORTE / BROCA</text>
        <text x="${tableX + 380}" y="${tableY + 49}" fill="${textHeading}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">X (ESQ.)</text>
        <text x="${tableX + 450}" y="${tableY + 49}" fill="${textHeading}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">Y (BASE)</text>

        <!-- Table Data Rows -->
        ${tableRows}

        <!-- Summary KPIs Card at Bottom of Table -->
        <g transform="translate(${tableX + 10}, ${tableY + 360})">
          <rect x="0" y="0" width="${tableW - 20}" height="75" rx="3" fill="${isDark ? '#1e293b' : '#f8fafc'}" stroke="${isDark ? '#334155' : '#e2e8f0'}" stroke-width="0.8" />
          <text x="12" y="18" fill="${textHeading}" font-size="8.5" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif">
            RESUMO DE FABRICO & ESPECIFICAÇÃO DE FURAÇÃO:
          </text>

          <text x="12" y="34" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">Furações Cilíndricas (Botões/Leds):</text>
          <text x="210" y="34" fill="#10b981" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">
            ${roundHoles.length} furos Ø22.5 mm (Padrão IEC 60947-5-1)
          </text>

          <text x="12" y="48" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">Recortes Retangulares (HMI/Instrumentos):</text>
          <text x="210" y="48" fill="#38bdf8" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">
            ${rectCutouts.length} recortes de painel com corte a laser / puncionadora
          </text>

          <text x="12" y="62" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">Binário de Aperto & IP:</text>
          <text x="210" y="62" fill="${textHeading}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">
            2.0 N·m (Anilha vedante estanque IP65 / NEMA 4X)
          </text>
        </g>

        <!-- Technical Manufacturing Instructions -->
        <g transform="translate(${tableX + 10}, ${tableY + 445})">
          <rect x="0" y="0" width="${tableW - 20}" height="115" rx="3" fill="${isDark ? '#0f172a' : '#ffffff'}" stroke="${isDark ? '#334155' : '#cbd5e1'}" stroke-width="0.8" />
          <text x="12" y="16" fill="${accentBlue}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">
            RECOMENDAÇÕES DE MAQUINAÇÃO & MONTAGEM MECÂNICA:
          </text>
          <text x="12" y="32" fill="${textBody}" font-size="7.5" font-family="Plus Jakarta Sans, sans-serif">
            1. As coordenadas (X, Y) referem-se ao centro geométrico dos furos redondos e ao centro do recorte.
          </text>
          <text x="12" y="46" fill="${textBody}" font-size="7.5" font-family="Plus Jakarta Sans, sans-serif">
            2. Respeitar folga mínima de 40mm entre centros de botoneiras para acomodar blocos de contactos (1NA/1NF).
          </text>
          <text x="12" y="60" fill="${textBody}" font-size="7.5" font-family="Plus Jakarta Sans, sans-serif">
            3. Aplicar chanfro ligeiro de 0.5mm após furação e proteção anticorrosiva nos bordos maquinados.
          </text>
          <text x="12" y="74" fill="${textBody}" font-size="7.5" font-family="Plus Jakarta Sans, sans-serif">
            4. Verificar a ausência de interferências com calhas DIN e canaletas quando a porta se encontra fechada.
          </text>
          <text x="12" y="88" fill="${textBody}" font-size="7.5" font-family="Plus Jakarta Sans, sans-serif">
            5. Ligar cabo de terra flexível (mínimo 6 mm² Cu V/A) entre a porta metálica e o barramento PE do quadro.
          </text>
          <text x="12" y="103" fill="#10b981" font-size="7.5" font-weight="bold" font-family="JetBrains Mono, monospace">
            NORMATIVA: EN 60204-1 §8.2.3 (Ligação equipotencial de portas articuladas)
          </text>
        </g>
      </g>
    </svg>
  `;
}
