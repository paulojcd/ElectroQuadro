import { ProjectState, PlacedComponent, CableGland } from '../types/electrical';
import { generateDefaultWires } from './wireSimulator';
import { GLAND_SPECS } from './glandUtils';

/**
 * Escapes strings for XML attributes and text nodes
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates a complete draw.io / diagrams.net (.drawio) XML document.
 * Includes two rich tabs/pages:
 * Page 1: "Disposição do Quadro (Layout 2D)" - Physical cabinet layout with rails, ducts, breakers, glands
 * Page 2: "Esquema Elétrico Unifilar" - Electrical schematic diagram with wires, breakers, PSU, PLC, terminals
 */
export function generateDrawioXml(project: ProjectState): string {
  const config = project.config;
  const rails = project.rails;
  const glands = project.glands || [];

  const width = config.widthMm || 600;
  const height = config.heightMm || 800;
  const depth = config.depthMm || 250;
  const sideDuct = config.sideDuctWidthMm || 40;
  const horizDuct = config.horizontalDuctHeightMm || 40;
  const spacing = config.railSpacingMm || 160;

  const now = new Date().toISOString();

  // =========================================================================
  // PAGE 1: 2D CABINET LAYOUT
  // =========================================================================
  const page1Cells: string[] = [
    '<mxCell id="0"/>',
    '<mxCell id="1" parent="0"/>',
  ];

  let cellId = 2;
  const nextId = () => `c_${cellId++}`;

  // 1. Enclosure Outer Metallic Frame
  const encId = nextId();
  page1Cells.push(`
    <mxCell id="${encId}" value="${escapeXml(config.projectCode)}: ${escapeXml(config.name)} (${width}x${height}x${depth}mm)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#475569;strokeWidth=4;fontColor=#94a3b8;fontFamily=Helvetica;fontSize=12;fontStyle=1;verticalAlign=top;align=center;spacingTop=6;" vertex="1" parent="1">
      <mxGeometry x="40" y="40" width="${width}" height="${height}" as="geometry"/>
    </mxCell>
  `);

  // 2. Interior Zinc Mounting Plate
  const plateId = nextId();
  page1Cells.push(`
    <mxCell id="${plateId}" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0f172a;strokeColor=#334155;strokeWidth=2;" vertex="1" parent="1">
      <mxGeometry x="56" y="56" width="${width - 32}" height="${height - 32}" as="geometry"/>
    </mxCell>
  `);

  // 3. Lateral Wire Ducts (Calhas de Cablagem Verticais)
  const leftDuctId = nextId();
  page1Cells.push(`
    <mxCell id="${leftDuctId}" value="Calha ${sideDuct}mm" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#3b82f6;strokeWidth=1.5;strokeDasharray=4 4;fontColor=#64748b;fontFamily=Helvetica;fontSize=10;rotation=-90;" vertex="1" parent="1">
      <mxGeometry x="${40 + 24}" y="${40 + 24}" width="${sideDuct}" height="${height - 48}" as="geometry"/>
    </mxCell>
  `);

  const rightDuctId = nextId();
  page1Cells.push(`
    <mxCell id="${rightDuctId}" value="Calha ${sideDuct}mm" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#3b82f6;strokeWidth=1.5;strokeDasharray=4 4;fontColor=#64748b;fontFamily=Helvetica;fontSize=10;rotation=90;" vertex="1" parent="1">
      <mxGeometry x="${40 + width - 24 - sideDuct}" y="${40 + 24}" width="${sideDuct}" height="${height - 48}" as="geometry"/>
    </mxCell>
  `);

  // 4. Horizontal Ducts (Topo, Fundo e Intercalares)
  const horizDuctX = 40 + 24 + sideDuct;
  const horizDuctW = width - 48 - 2 * sideDuct;

  // Top horizontal duct
  page1Cells.push(`
    <mxCell id="${nextId()}" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#3b82f6;strokeWidth=1.5;strokeDasharray=4 4;" vertex="1" parent="1">
      <mxGeometry x="${horizDuctX}" y="${40 + 24}" width="${horizDuctW}" height="${horizDuct}" as="geometry"/>
    </mxCell>
  `);

  // Bottom horizontal duct
  page1Cells.push(`
    <mxCell id="${nextId()}" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#3b82f6;strokeWidth=1.5;strokeDasharray=4 4;" vertex="1" parent="1">
      <mxGeometry x="${horizDuctX}" y="${40 + height - 24 - horizDuct}" width="${horizDuctW}" height="${horizDuct}" as="geometry"/>
    </mxCell>
  `);

  // Intercalary horizontal ducts
  for (let r = 0; r < rails.length - 1; r++) {
    const interY = 40 + 80 + r * spacing + 105 + 10;
    page1Cells.push(`
      <mxCell id="${nextId()}" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#3b82f6;strokeWidth=1;strokeDasharray=4 4;" vertex="1" parent="1">
        <mxGeometry x="${horizDuctX}" y="${interY}" width="${horizDuctW}" height="${horizDuct}" as="geometry"/>
      </mxCell>
    `);
  }

  // 5. DIN Rails 35mm & Electrical Components
  const railX = 40 + 24 + sideDuct + 10;
  const usableWidth = Math.max(80, width - 2 * sideDuct - 40);

  rails.forEach((rail, rIdx) => {
    const railY = 40 + 80 + rIdx * spacing;

    // DIN Rail 35mm profile
    const railCellId = nextId();
    page1Cells.push(`
      <mxCell id="${railCellId}" value="&lt;b&gt;${escapeXml(rail.name || `Calha ${rIdx + 1}`)}&lt;/b&gt; (DIN 35x7.5mm)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#cbd5e1;strokeColor=#64748b;strokeWidth=1.5;fontColor=#0f172a;fontFamily=Helvetica;fontSize=10;verticalAlign=middle;align=left;spacingLeft=10;" vertex="1" parent="1">
        <mxGeometry x="${railX}" y="${railY + 32.5}" width="${usableWidth}" height="35" as="geometry"/>
      </mxCell>
    `);

    // Components on rail
    rail.items.forEach((item: PlacedComponent) => {
      const compX = railX + item.positionMm;
      const compW = item.data.widthMm;
      const compH = item.data.heightMm || 90;
      const compY = railY + (55 - compH / 2);

      // Color by category
      let fillColor = '#1e293b';
      let strokeColor = '#3b82f6';
      let fontColor = '#ffffff';

      switch (item.data.category) {
        case 'protection_ac':
        case 'protection_dc':
          fillColor = '#450a0a';
          strokeColor = '#ef4444';
          break;
        case 'motor_control':
          fillColor = '#172554';
          strokeColor = '#3b82f6';
          break;
        case 'power_supply':
          fillColor = '#451a03';
          strokeColor = '#f59e0b';
          break;
        case 'plc_cpu':
        case 'plc_expansion':
          fillColor = '#3b0764';
          strokeColor = '#a855f7';
          break;
        case 'terminals':
          fillColor = '#064e3b';
          strokeColor = '#10b981';
          break;
        case 'relays':
        case 'safety_relays':
          fillColor = '#1e1b4b';
          strokeColor = '#6366f1';
          break;
      }

      const ratingText = item.data.ratedPowerW 
        ? `${item.data.ratedPowerW}W` 
        : item.data.ratedCurrentA 
        ? `${item.data.ratedCurrentA}A` 
        : '';

      const compLabel = compW >= 24
        ? `&lt;b&gt;${escapeXml(item.tag)}&lt;/b&gt;&lt;br/&gt;&lt;font style=&quot;font-size: 9px;&quot;&gt;${escapeXml(item.data.name.split(' ')[0])}&lt;br/&gt;&lt;b&gt;${ratingText}&lt;/b&gt;&lt;/font&gt;`
        : `&lt;b&gt;${escapeXml(item.tag)}&lt;/b&gt;`;

      page1Cells.push(`
        <mxCell id="${nextId()}" value="${compLabel}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${fillColor};strokeColor=${strokeColor};strokeWidth=2;fontColor=${fontColor};fontFamily=Helvetica;fontSize=11;verticalAlign=middle;align=center;" vertex="1" parent="1">
          <mxGeometry x="${compX}" y="${compY}" width="${compW}" height="${compH}" as="geometry"/>
        </mxCell>
      `);
    });
  });

  // 6. Cable Glands (Bucins de Entrada e Saída)
  glands.forEach((gland: CableGland) => {
    const spec = GLAND_SPECS[gland.size] || GLAND_SPECS.M20;
    const gx = 40 + gland.xOffsetMm - 12;
    const gy = gland.location === 'top' ? 40 + 6 : 40 + height - 24;
    const color = gland.location === 'top' ? '#f59e0b' : '#10b981';

    page1Cells.push(`
      <mxCell id="${nextId()}" value="${escapeXml(gland.tag)}&#xa;${escapeXml(gland.size)}" style="ellipse;whiteSpace=wrap;html=1;fillColor=#020617;strokeColor=${color};strokeWidth=2;fontColor=#ffffff;fontFamily=Helvetica;fontSize=9;fontStyle=1;" vertex="1" parent="1">
        <mxGeometry x="${gx}" y="${gy}" width="24" height="24" as="geometry"/>
      </mxCell>
    `);
  });

  // 7. Title Block / Carimbo na base
  const tbX = 40 + width + 40;
  const tbY = 40;
  page1Cells.push(`
    <mxCell id="${nextId()}" value="&lt;b&gt;PROJETO: ${escapeXml(config.name)}&lt;/b&gt;&lt;br/&gt;CÓDIGO: ${escapeXml(config.projectCode)}&lt;br/&gt;TENSÃO: ${escapeXml(config.supplyVoltage)} ${config.frequencyHz}Hz&lt;br/&gt;DIMENSÕES: ${width} x ${height} x ${depth} mm&lt;br/&gt;CALHAS DIN: ${rails.length} Calhas · ${rails.reduce((a, b) => a + b.items.length, 0)} Itens&lt;br/&gt;BUCINS: ${glands.length} Marcados (IEC 62444)&lt;br/&gt;NORMA: EN 61439-1 / IEC 60204-1&lt;br/&gt;DATA: ${now.slice(0, 10)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#475569;strokeWidth=1.5;fontColor=#f1f5f9;fontFamily=Helvetica;fontSize=11;verticalAlign=top;align=left;spacing=12;" vertex="1" parent="1">
      <mxGeometry x="${tbX}" y="${tbY}" width="280" height="170" as="geometry"/>
    </mxCell>
  `);

  // =========================================================================
  // PAGE 2: ELECTRICAL SCHEMATIC & WIRING DIAGRAM (Esquema Unifilar)
  // =========================================================================
  const page2Cells: string[] = [
    '<mxCell id="0"/>',
    '<mxCell id="1" parent="0"/>',
  ];

  let p2Id = 200;
  const nextP2Id = () => `sc_${p2Id++}`;

  // Schematic Title
  page2Cells.push(`
    <mxCell id="${nextP2Id()}" value="&lt;b&gt;ESQUEMA ELÉTRICO E LIGAÇÕES - ${escapeXml(config.projectCode)}&lt;/b&gt;&lt;br/&gt;&lt;font style=&quot;font-size: 11px;&quot;&gt;${escapeXml(config.name)} · Tensão: ${escapeXml(config.supplyVoltage)}&lt;/font&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#0f172a;strokeColor=#3b82f6;strokeWidth=2;fontColor=#ffffff;fontFamily=Helvetica;fontSize=13;verticalAlign=middle;align=center;" vertex="1" parent="1">
      <mxGeometry x="60" y="40" width="800" height="50" as="geometry"/>
    </mxCell>
  `);

  // Schematic Power Distribution Rails / Main AC Bus
  const busY = 130;
  page2Cells.push(`
    <mxCell id="${nextP2Id()}" value="BARRAMENTO GERAL DE ALIMENTAÇÃO: ${escapeXml(config.supplyVoltage)}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#dc2626;strokeColor=#b91c1c;strokeWidth=2;fontColor=#ffffff;fontFamily=Helvetica;fontSize=11;fontStyle=1;" vertex="1" parent="1">
      <mxGeometry x="60" y="${busY}" width="800" height="24" as="geometry"/>
    </mxCell>
  `);

  // Generate and draw wires and circuit blocks
  const defaultWires = generateDefaultWires(project);

  // Group items by category to place cleanly in a functional schematic
  const allItems = rails.flatMap((r) => r.items);
  const compIdMap = new Map<string, string>();

  // Place functional blocks along a schematic layout
  let currentX = 60;
  const schemY = 200;

  allItems.forEach((it, idx) => {
    const scId = nextP2Id();
    compIdMap.set(it.tag, scId);
    compIdMap.set(it.instanceId, scId);

    const isProtec = it.data.category === 'protection_ac' || it.data.category === 'protection_dc' || it.data.category === 'motor_control';
    const isPsu = it.data.category === 'power_supply';
    const isPlc = it.data.category === 'plc_cpu' || it.data.category === 'plc_expansion';
    const isTerm = it.data.category === 'terminals';

    const boxW = isPlc ? 150 : isPsu ? 110 : isTerm ? 50 : 80;
    const boxH = isPlc ? 120 : isPsu ? 100 : isTerm ? 70 : 80;

    let fill = '#1e293b';
    let stroke = '#3b82f6';
    if (isProtec) { fill = '#450a0a'; stroke = '#ef4444'; }
    if (isPsu) { fill = '#451a03'; stroke = '#f59e0b'; }
    if (isPlc) { fill = '#3b0764'; stroke = '#a855f7'; }
    if (isTerm) { fill = '#064e3b'; stroke = '#10b981'; }

    const label = `&lt;b&gt;${escapeXml(it.tag)}&lt;/b&gt;&lt;br/&gt;&lt;font style=&quot;font-size: 10px;&quot;&gt;${escapeXml(it.data.name.split(' ')[0])}&lt;br/&gt;${it.data.ratedCurrentA ? `${it.data.ratedCurrentA}A` : ''}${it.data.ratedPowerW ? `${it.data.ratedPowerW}W` : ''}&lt;/font&gt;`;

    page2Cells.push(`
      <mxCell id="${scId}" value="${label}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=2;fontColor=#ffffff;fontFamily=Helvetica;fontSize=11;verticalAlign=middle;align=center;" vertex="1" parent="1">
        <mxGeometry x="${currentX}" y="${schemY + (isTerm ? 60 : 0)}" width="${boxW}" height="${boxH}" as="geometry"/>
      </mxCell>
    `);

    currentX += boxW + 30;
  });

  // Draw connecting wires between schematic components
  defaultWires.forEach((wire) => {
    const fromId = compIdMap.get(wire.fromComponentTag) || compIdMap.get(wire.fromComponentId);
    const toId = compIdMap.get(wire.toComponentTag) || compIdMap.get(wire.toComponentId);

    let wireColor = '#94a3b8';
    if (wire.netType === 'ac_phase') wireColor = '#ef4444';
    if (wire.netType === 'ac_neutral') wireColor = '#3b82f6';
    if (wire.netType === 'dc_positive') wireColor = '#f59e0b';
    if (wire.netType === 'dc_negative') wireColor = '#0284c7';
    if (wire.netType === 'pe_ground') wireColor = '#10b981';
    if (wire.netType === 'control_signal') wireColor = '#a855f7';

    if (fromId && toId) {
      page2Cells.push(`
        <mxCell id="${nextP2Id()}" value="${escapeXml(String(wire.crossSectionMm2 || '1.5'))}mm²" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${wireColor};strokeWidth=2;endArrow=block;endFill=1;fontColor=${wireColor};fontSize=9;fontFamily=Helvetica;" edge="1" parent="1" source="${fromId}" target="${toId}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      `);
    }
  });

  // Final draw.io XML structure
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${now}" agent="ElectroCad DIN" version="24.0.0" type="device">
  <diagram id="diag_layout" name="Disposição do Quadro (Layout 2D)">
    <mxGraphModel dx="1200" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1200" math="0" shadow="0">
      <root>
        ${page1Cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
  <diagram id="diag_schematic" name="Esquema Elétrico e Ligações">
    <mxGraphModel dx="1200" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1200" math="0" shadow="0">
      <root>
        ${page2Cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

/**
 * Triggers direct browser download of the .drawio file.
 */
export function downloadDrawioFile(project: ProjectState, customFilename?: string): void {
  const xmlContent = generateDrawioXml(project);
  const blob = new Blob([xmlContent], { type: 'application/vnd.jgraph.mxfile;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanCode = (project.config.projectCode || 'PROJ')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = (project.config.name || 'quadro')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultFilename = `ELECTROCAD_${cleanCode}_${cleanName}_${dateStr}.drawio`;

  const link = document.createElement('a');
  link.href = url;
  link.download = customFilename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
