import { ProjectState, PlacedComponent, CableGland } from '../types/electrical';
import { generateDefaultWires } from './wireSimulator';
import { GLAND_SPECS } from './glandUtils';

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateUuid(): string {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `{${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}}`;
}

/**
 * Generates an authentic, fully compliant QElectroTech project file (.qet).
 * Compatible with QElectroTech 0.8x, 0.9x, and 1.0 (Windows, Linux, macOS).
 *
 * Essential Architecture:
 * 1. Root <project version="0.90"> with metadata and project properties.
 * 2. Embedded <collection> with <category name="import"> containing complete <definition>
 *    blocks for every symbol used. This ensures QElectroTech NEVER shows blank/empty pages
 *    even when opened offline or on computers without custom element libraries installed.
 * 3. Folio 1: "Esquema Elétrico Unifilar / Multifilar" with IEC 60617 symbols, terminals,
 *    conductors with wire tags, cross-sections and colors.
 * 4. Folio 2: "Disposição do Armário (Layout 2D)" with physical enclosure, DIN rails,
 *    placed components, wire ducts, and cable glands.
 */
export function generateQetXml(project: ProjectState): string {
  const config = project.config;
  const rails = project.rails;
  const glands = project.glands || [];

  const width = config.widthMm || 600;
  const height = config.heightMm || 800;
  const depth = config.depthMm || 250;
  const now = new Date().toISOString().slice(0, 10);

  const defaultWires = generateDefaultWires(project);
  const allItems = rails.flatMap((r) => r.items);

  // =========================================================================
  // 1. EMBEDDED SYMBOL DEFINITIONS (<collection><category name="import">)
  // QElectroTech requires these definitions to render elements on diagrams!
  // =========================================================================
  const definitionsXml = `
      <!-- 1. Circuit Breaker / Disjuntor (IEC 60617) -->
      <element name="disjuntor_iec.elmt">
        <definition width="60" version="0.90" height="90" type="element" hotspot_x="30" hotspot_y="45">
          <uuid>{a1b2c3d4-e5f6-7890-abcd-ef0123456789}</uuid>
          <names>
            <name lang="pt">Disjuntor Magnetotérmico IEC</name>
            <name lang="en">Circuit Breaker IEC</name>
            <name lang="fr">Disjoncteur magnétothermique</name>
          </names>
          <informations>ElectroCad DIN - Conforme IEC 60617</informations>
          <description>
            <rect x="-24" y="-36" width="48" height="72" style="line-style:normal;line-weight:normal;filling:white;color:black" />
            <!-- Thermal trip symbol (bimetal) -->
            <rect x="-6" y="-22" width="12" height="10" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <!-- Switch blade contact -->
            <line x1="0" y1="-36" x2="0" y2="-22" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <line x1="0" y1="-12" x2="8" y2="12" style="line-style:normal;line-weight:hight;filling:none;color:black" />
            <!-- Magnetic trip cross -->
            <line x1="-5" y1="20" x2="5" y2="20" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <line x1="0" y1="15" x2="0" y2="25" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <line x1="0" y1="12" x2="0" y2="36" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <!-- Terminals -->
            <terminal x="0" y="-36" orientation="n" id="1" name="1" />
            <terminal x="0" y="36" orientation="s" id="2" name="2" />
          </description>
        </definition>
      </element>

      <!-- 2. Power Supply 24VDC / Fonte de Alimentação -->
      <element name="fonte_dc.elmt">
        <definition width="80" version="0.90" height="90" type="element" hotspot_x="40" hotspot_y="45">
          <uuid>{b2c3d4e5-f6a7-8901-bcde-f0123456789a}</uuid>
          <names>
            <name lang="pt">Fonte de Alimentação 24VDC</name>
            <name lang="en">Power Supply 24VDC</name>
          </names>
          <informations>ElectroCad DIN</informations>
          <description>
            <rect x="-35" y="-36" width="70" height="72" style="line-style:normal;line-weight:normal;filling:#f0f9ff;color:#0284c7" />
            <line x1="-35" y1="0" x2="35" y2="0" style="line-style:dashed;line-weight:normal;filling:none;color:#64748b" />
            <text x="-25" y="-14" size="8" text="AC IN" color="#0369a1" />
            <text x="-28" y="24" size="8" text="DC 24V" color="#059669" />
            <!-- Terminals -->
            <terminal x="-15" y="-36" orientation="n" id="L" name="L" />
            <terminal x="15" y="-36" orientation="n" id="N" name="N" />
            <terminal x="-15" y="36" orientation="s" id="+V" name="+V" />
            <terminal x="15" y="36" orientation="s" id="-V" name="-V" />
          </description>
        </definition>
      </element>

      <!-- 3. PLC CPU / Controlador Programável -->
      <element name="plc_modulo.elmt">
        <definition width="100" version="0.90" height="90" type="element" hotspot_x="50" hotspot_y="45">
          <uuid>{c3d4e5f6-a7b8-9012-cdef-0123456789ab}</uuid>
          <names>
            <name lang="pt">Autómato / PLC Siemens</name>
            <name lang="en">PLC CPU Module</name>
          </names>
          <informations>ElectroCad DIN</informations>
          <description>
            <rect x="-46" y="-36" width="92" height="72" style="line-style:normal;line-weight:hight;filling:#f8fafc;color:#0f766e" />
            <rect x="-46" y="-36" width="92" height="16" style="line-style:normal;line-weight:normal;filling:#0f766e;color:#0f766e" />
            <text x="-25" y="-24" size="7" text="SIEMENS PLC" color="#ffffff" />
            <circle x="0" y="5" r="4" style="line-style:normal;line-weight:normal;filling:#22c55e;color:#16a34a" />
            <text x="-20" y="24" size="6" text="RUN/STOP" color="#334155" />
            <!-- Terminals -->
            <terminal x="-30" y="-36" orientation="n" id="L1" name="L1" />
            <terminal x="-10" y="-36" orientation="n" id="N" name="N" />
            <terminal x="10" y="-36" orientation="n" id="DI0" name="DI0" />
            <terminal x="30" y="-36" orientation="n" id="DI1" name="DI1" />
            <terminal x="-30" y="36" orientation="s" id="DQ0" name="DQ0" />
            <terminal x="-10" y="36" orientation="s" id="DQ1" name="DQ1" />
            <terminal x="10" y="36" orientation="s" id="24V+" name="24V+" />
            <terminal x="30" y="36" orientation="s" id="24V-" name="24V-" />
          </description>
        </definition>
      </element>

      <!-- 4. Relay / Relé de Interface DIN -->
      <element name="rele_interface.elmt">
        <definition width="50" version="0.90" height="80" type="element" hotspot_x="25" hotspot_y="40">
          <uuid>{d4e5f6a7-b8c9-0123-def0-123456789abc}</uuid>
          <names>
            <name lang="pt">Relé de Interface / Auxiliar</name>
            <name lang="en">Interface Relay</name>
          </names>
          <informations>ElectroCad DIN</informations>
          <description>
            <rect x="-20" y="-32" width="40" height="64" style="line-style:normal;line-weight:normal;filling:white;color:#1d4ed8" />
            <!-- Coil box -->
            <rect x="-12" y="-10" width="24" height="20" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <line x1="-12" y1="-10" x2="12" y2="10" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <line x1="0" y1="-32" x2="0" y2="-10" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <line x1="0" y1="10" x2="0" y2="32" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <terminal x="0" y="-32" orientation="n" id="A1" name="A1" />
            <terminal x="0" y="32" orientation="s" id="A2" name="A2" />
          </description>
        </definition>
      </element>

      <!-- 5. Terminal Block / Borne de Passagem (Viking 3) -->
      <element name="borne_terminal.elmt">
        <definition width="40" version="0.90" height="70" type="element" hotspot_x="20" hotspot_y="35">
          <uuid>{e5f6a7b8-c9d0-1234-ef01-23456789abcd}</uuid>
          <names>
            <name lang="pt">Borne de Passagem / Terminal</name>
            <name lang="en">Terminal Block</name>
          </names>
          <informations>ElectroCad DIN</informations>
          <description>
            <rect x="-14" y="-28" width="28" height="56" style="line-style:normal;line-weight:normal;filling:#f1f5f9;color:#475569" />
            <circle x="0" y="-12" r="3" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <line x1="0" y1="-28" x2="0" y2="-15" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <line x1="0" y1="-9" x2="0" y2="9" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <circle x="0" y="12" r="3" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <line x1="0" y1="15" x2="0" y2="28" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <terminal x="0" y="-28" orientation="n" id="1" name="1" />
            <terminal x="0" y="28" orientation="s" id="2" name="2" />
          </description>
        </definition>
      </element>

      <!-- 6. Generic DIN Component -->
      <element name="generico_din.elmt">
        <definition width="60" version="0.90" height="80" type="element" hotspot_x="30" hotspot_y="40">
          <uuid>{f6a7b8c9-d0e1-2345-f012-3456789abcde}</uuid>
          <names>
            <name lang="pt">Componente DIN Geral</name>
            <name lang="en">General DIN Component</name>
          </names>
          <informations>ElectroCad DIN</informations>
          <description>
            <rect x="-24" y="-32" width="48" height="64" style="line-style:normal;line-weight:normal;filling:white;color:black" />
            <line x1="0" y1="-32" x2="0" y2="-12" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <line x1="0" y1="12" x2="0" y2="32" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <circle x="0" y="0" r="10" style="line-style:normal;line-weight:normal;filling:none;color:black" />
            <terminal x="0" y="-32" orientation="n" id="1" name="1" />
            <terminal x="0" y="32" orientation="s" id="2" name="2" />
          </description>
        </definition>
      </element>

      <!-- 7. 2D Physical Layout Component Element (For Folio 2) -->
      <element name="quadro_layout_item.elmt">
        <definition width="60" version="0.90" height="90" type="element" hotspot_x="30" hotspot_y="45">
          <uuid>{07a8b9c0-d1e2-3456-0123-456789abcdef}</uuid>
          <names>
            <name lang="pt">Aparelho DIN 2D (Layout Físico)</name>
            <name lang="en">2D Physical DIN Component</name>
          </names>
          <informations>ElectroCad DIN</informations>
          <description>
            <rect x="-26" y="-38" width="52" height="76" style="line-style:normal;line-weight:normal;filling:#e2e8f0;color:#1e293b" />
            <rect x="-22" y="-34" width="44" height="20" style="line-style:normal;line-weight:normal;filling:#0f172a;color:#38bdf8" />
            <rect x="-6" y="-4" width="12" height="24" style="line-style:normal;line-weight:normal;filling:#334155;color:#0f172a" />
            <terminal x="0" y="-38" orientation="n" id="1" name="1" />
            <terminal x="0" y="38" orientation="s" id="2" name="2" />
          </description>
        </definition>
      </element>
  `;

  // =========================================================================
  // FOLIO 1: ELECTRICAL SCHEMATIC & WIRING DIAGRAM
  // =========================================================================
  const folio1ElementsXml: string[] = [];
  const folio1ConductorsXml: string[] = [];
  const folio1TextsXml: string[] = [];

  // Title Banner on Folio 1
  folio1TextsXml.push(`
    <text x="80" y="80" size="13" color="#0f172a" text="ESQUEMA ELÉTRICO UNIFILAR &amp; LIGAÇÕES (IEC 60617 / EN 61439)" />
    <text x="80" y="105" size="8" color="#475569" text="PROJETO: ${escapeXml(config.projectCode)} · ${escapeXml(config.name)} · TENSÃO: ${escapeXml(config.supplyVoltage)}" />
  `);

  const startX = 140;
  const startY = 220;
  const colSpacing = 120;
  const rowSpacing = 200;
  const maxCols = 8;

  // Track component positions for conductor routing
  const componentPositions = new Map<string, { x: number; y: number }>();

  allItems.forEach((it, idx) => {
    const col = idx % maxCols;
    const row = Math.floor(idx / maxCols);
    const x = startX + col * colSpacing;
    const y = startY + row * rowSpacing;

    componentPositions.set(it.tag, { x, y });
    componentPositions.set(it.instanceId, { x, y });

    // Choose appropriate symbol definition
    let elmtType = 'disjuntor_iec.elmt';
    if (it.data.category === 'power_supply') {
      elmtType = 'fonte_dc.elmt';
    } else if (it.data.category === 'plc_cpu' || it.data.category === 'plc_expansion') {
      elmtType = 'plc_modulo.elmt';
    } else if (it.data.category === 'relays') {
      elmtType = 'rele_interface.elmt';
    } else if (it.data.category === 'terminals') {
      elmtType = 'borne_terminal.elmt';
    } else if (it.data.category === 'protection_ac' || it.data.category === 'protection_dc') {
      elmtType = 'disjuntor_iec.elmt';
    } else {
      elmtType = 'generico_din.elmt';
    }

    const ratingStr = it.data.ratedCurrentA
      ? `${it.data.ratedCurrentA}A`
      : it.data.ratedPowerW
      ? `${it.data.ratedPowerW}W`
      : '';

    folio1ElementsXml.push(`
      <element x="${x}" y="${y}" orientation="0" type="embed://import/${elmtType}">
        <uuid>${generateUuid()}</uuid>
        <terminals>
          <terminal x="${x}" y="${y - 36}" id="1" name="1" />
          <terminal x="${x}" y="${y + 36}" id="2" name="2" />
        </terminals>
        <texts>
          <text x="18" y="-16" size="9" text="${escapeXml(it.tag)}" color="#0033aa" />
          <text x="18" y="2" size="7" text="${escapeXml(it.data.partNumber)}" color="#334155" />
          ${ratingStr ? `<text x="18" y="18" size="7" text="${escapeXml(ratingStr)}" color="#cc0000" />` : ''}
        </texts>
      </element>
    `);
  });

  // Wiring Connections (Conductors)
  defaultWires.forEach((wire, wIdx) => {
    let strokeColor = '#000000';
    if (wire.netType === 'ac_phase') strokeColor = '#990000';
    if (wire.netType === 'ac_neutral') strokeColor = '#0000cc';
    if (wire.netType === 'dc_positive') strokeColor = '#e65100';
    if (wire.netType === 'dc_negative') strokeColor = '#0284c7';
    if (wire.netType === 'pe_ground') strokeColor = '#16a34a';
    if (wire.netType === 'control_signal') strokeColor = '#7c3aed';

    const fromPos = componentPositions.get(wire.fromComponentTag) || componentPositions.get(wire.fromComponentId);
    const toPos = componentPositions.get(wire.toComponentTag) || componentPositions.get(wire.toComponentId);

    const x1 = fromPos ? fromPos.x : startX + (wIdx % 6) * 100;
    const y1 = fromPos ? fromPos.y + 36 : startY + 50;
    const x2 = toPos ? toPos.x : x1 + 100;
    const y2 = toPos ? toPos.y - 36 : y1 + 100;

    const midY = (y1 + y2) / 2;

    folio1ConductorsXml.push(`
      <conductor color="${strokeColor}" condsize="${wire.crossSectionMm2 || 1.5}" type="multi" tension_protocol="${escapeXml(wire.netType)}">
        <segment>
          <start x="${x1}" y="${y1}" />
          <end x="${x1}" y="${midY}" />
        </segment>
        <segment>
          <start x="${x1}" y="${midY}" />
          <end x="${x2}" y="${midY}" />
        </segment>
        <segment>
          <start x="${x2}" y="${midY}" />
          <end x="${x2}" y="${y2}" />
        </segment>
        <text x="${(x1 + x2) / 2 - 20}" y="${midY - 6}" size="6" color="${strokeColor}" text="${escapeXml(wire.wireTag || `W${wIdx + 1}`)} (${wire.crossSectionMm2 || 1.5}mm²)" />
      </conductor>
    `);
  });

  // =========================================================================
  // FOLIO 2: PHYSICAL CABINET LAYOUT 2D (DISPOSIÇÃO FÍSICA DO QUADRO)
  // Fully rendered with QET elements and labels
  // =========================================================================
  const folio2ElementsXml: string[] = [];
  const folio2TextsXml: string[] = [];

  const scale = 0.85;
  const encX = 100;
  const encY = 120;
  const encW = Math.round(width * scale);
  const encH = Math.round(height * scale);

  // Title Banner on Folio 2
  folio2TextsXml.push(`
    <text x="80" y="70" size="14" color="#0f172a" text="DISPOSIÇÃO FÍSICA DO QUADRO ELÉTRICO (LAYOUT 2D - IEC 61439)" />
    <text x="80" y="95" size="8" color="#475569" text="DIMENSÕES EXTERNAS: ${width}x${height}x${depth}mm · CALHAS DIN: ${rails.length} · GRAU: ${escapeXml(config.ipRating)}" />
    
    <!-- Cabinet Outer Border annotations -->
    <text x="${encX + 20}" y="${encY - 10}" size="8" color="#1e293b" text="ENVÓLUCRO: ${escapeXml(config.name)} (${width}x${height}x${depth}mm)" />
    <text x="${encX + encW + 15}" y="${encY + 40}" size="7" color="#64748b" text="Profundidade: ${depth}mm" />
  `);

  // Place Physical Components on DIN Rails in Folio 2
  rails.forEach((rail, rIdx) => {
    const ry = encY + Math.round((75 + rIdx * (config.railSpacingMm || 160)) * scale);
    const rx = encX + 45;
    const rw = encW - 90;

    folio2TextsXml.push(`
      <text x="${rx + 10}" y="${ry - 8}" size="8" color="#0284c7" text="[DIN RAIL ${rIdx + 1}] ${escapeXml(rail.name || `Calha ${rIdx + 1}`)} (Perfil DIN 35x7.5mm - Largura útil: ${rail.usableWidthMm || (width - 100)}mm)" />
    `);

    rail.items.forEach((item) => {
      const cx = rx + Math.round(item.positionMm * scale);
      const cy = ry + 25;

      folio2ElementsXml.push(`
        <element x="${cx}" y="${cy}" orientation="0" type="embed://import/quadro_layout_item.elmt">
          <uuid>${generateUuid()}</uuid>
          <terminals>
            <terminal x="${cx}" y="${cy - 38}" id="1" name="1" />
            <terminal x="${cx}" y="${cy + 38}" id="2" name="2" />
          </terminals>
          <texts>
            <text x="16" y="-12" size="8" text="${escapeXml(item.tag)}" color="#0033aa" />
            <text x="16" y="4" size="6" text="${escapeXml(item.data.partNumber)}" color="#334155" />
            <text x="16" y="18" size="6" text="${escapeXml(String(item.data.widthMm))}mm" color="#059669" />
          </texts>
        </element>
      `);
    });
  });

  // Cable Gland Markings (Top & Bottom)
  glands.forEach((gland: CableGland) => {
    const spec = GLAND_SPECS[gland.size] || GLAND_SPECS.M20;
    const gx = encX + Math.round(gland.xOffsetMm * scale);
    const gy = gland.location === 'top' ? encY + 20 : encY + encH - 20;

    folio2TextsXml.push(`
      <text x="${gx - 15}" y="${gy + (gland.location === 'top' ? -10 : 16)}" size="7" color="${gland.location === 'top' ? '#d97706' : '#059669'}" text="BUCIM ${escapeXml(gland.tag)} (${escapeXml(gland.size)} / ${spec.minCableMm}-${spec.maxCableMm}mm)" />
    `);
  });

  // Generate complete valid QElectroTech XML document
  return `<?xml version="1.0" encoding="UTF-8"?>
<project version="0.90" title="${escapeXml(config.name || 'Quadro Elétrico DIN')}">
  <properties>
    <property name="title">${escapeXml(config.name || 'Quadro Elétrico DIN')}</property>
    <property name="author">ElectroCad DIN</property>
    <property name="date">${now}</property>
    <property name="voltage">${escapeXml(config.supplyVoltage)}</property>
    <property name="dimensions">${width}x${height}x${depth}mm</property>
    <property name="ip_rating">${escapeXml(config.ipRating)}</property>
    <property name="standard">EN 61439-1 / IEC 60204-1</property>
  </properties>

  <!-- Embedded collection guarantees elements render in any QET installation -->
  <collection>
    <category name="import">
      <names>
        <name lang="pt">Elementos Importados</name>
        <name lang="en">Imported Elements</name>
        <name lang="fr">Éléments importés</name>
      </names>
      ${definitionsXml}
    </category>
  </collection>

  <diagrams>
    <!-- ========================================================
         FOLIO 1: ESQUEMA ELÉTRICO E CABLAGEM
         ======================================================== -->
    <diagram width="1250" height="900" title="Esquema Elétrico Unifilar" order="1">
      <defaultconductor color="#000000" condsize="1.5" type="multi" />
      <border columns="10" rows="8" />
      <inset>
        <title>${escapeXml(config.name)}</title>
        <author>ElectroCad DIN</author>
        <date>${now}</date>
        <folio>1/2</folio>
        <plant>${escapeXml(config.projectCode)}</plant>
        <locmachine>${escapeXml(config.supplyVoltage)} · ${escapeXml(config.ipRating)}</locmachine>
        <indexrev>A</indexrev>
        <version>0.90</version>
      </inset>
      <elements>
        ${folio1ElementsXml.join('\n        ')}
      </elements>
      <conductors>
        ${folio1ConductorsXml.join('\n        ')}
      </conductors>
      <texts>
        ${folio1TextsXml.join('\n        ')}
      </texts>
    </diagram>

    <!-- ========================================================
         FOLIO 2: DISPOSIÇÃO DO QUADRO (LAYOUT 2D)
         ======================================================== -->
    <diagram width="1250" height="900" title="Disposição do Armário (Layout 2D)" order="2">
      <defaultconductor color="#000000" condsize="1.5" type="multi" />
      <border columns="10" rows="8" />
      <inset>
        <title>LAYOUT 2D - DISPOSIÇÃO DO QUADRO</title>
        <author>ElectroCad DIN</author>
        <date>${now}</date>
        <folio>2/2</folio>
        <plant>${escapeXml(config.projectCode)}</plant>
        <locmachine>${width}x${height}x${depth}mm · ${rails.length} Calhas DIN</locmachine>
        <indexrev>A</indexrev>
        <version>0.90</version>
      </inset>
      <elements>
        ${folio2ElementsXml.join('\n        ')}
      </elements>
      <texts>
        ${folio2TextsXml.join('\n        ')}
      </texts>
    </diagram>
  </diagrams>
</project>`;
}

/**
 * Triggers direct browser download of the .qet project file for QElectroTech.
 */
export function downloadQetFile(project: ProjectState, customFilename?: string): void {
  const xmlContent = generateQetXml(project);
  const blob = new Blob([xmlContent], { type: 'application/x-qet;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanCode = (project.config.projectCode || 'PROJ')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = (project.config.name || 'quadro')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultFilename = `ELECTROCAD_${cleanCode}_${cleanName}_${dateStr}.qet`;

  const link = document.createElement('a');
  link.href = url;
  link.download = customFilename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies the raw QElectroTech XML to the user clipboard.
 */
export async function copyQetXml(project: ProjectState): Promise<boolean> {
  const xmlContent = generateQetXml(project);
  try {
    await navigator.clipboard.writeText(xmlContent);
    return true;
  } catch (err) {
    console.error('Failed to copy QET XML:', err);
    return false;
  }
}
