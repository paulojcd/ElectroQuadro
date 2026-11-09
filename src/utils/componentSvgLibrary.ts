/**
 * Component SVG Graphic Library & Utility Functions
 * For rendering, importing, exporting, and managing SVG vector graphics for electrical components
 */

export interface ComponentSvgTemplate {
  id: string;
  name: string;
  brand: string;
  category: string;
  widthMm: number;
  heightMm: number;
  svgContent: string;
  description: string;
}

/**
 * Converte código SVG (string) numa Data URI segura para o elemento <image href="..." />
 */
export function svgToDataUri(svgString: string): string {
  if (!svgString) return '';
  if (svgString.startsWith('data:') || svgString.startsWith('http')) {
    return svgString;
  }
  
  // Assegurar namespace SVG se não existir
  let cleanSvg = svgString.trim();
  if (!cleanSvg.includes('xmlns=')) {
    cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Codificar para base64 para evitar problemas de caracteres especiais e entidades XML
  try {
    const base64 = btoa(unescape(encodeURIComponent(cleanSvg)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    return `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;
  }
}

/**
 * Lê um ficheiro SVG carregado pelo utilizador (via input de ficheiro) e retorna a string SVG
 */
export async function readSvgFile(file: File): Promise<{ content: string; name: string }> {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      reject(new Error('O ficheiro selecionado não é um ficheiro SVG (.svg) válido.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text || !text.includes('<svg')) {
        reject(new Error('O ficheiro não contém código SVG válido.'));
        return;
      }
      resolve({ content: text, name: file.name });
    };
    reader.onerror = () => reject(new Error('Erro ao ler o ficheiro SVG.'));
    reader.readAsText(file);
  });
}

/**
 * Permite descarregar o SVG de um componente para o disco local do utilizador
 */
export function downloadSvgFile(svgContent: string, fileName: string = 'componente.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.svg') ? fileName : `${fileName}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Catálogo de templates SVG industriais prontos a utilizar com 1 clique
 */
export const INDUSTRIAL_SVG_TEMPLATES: ComponentSvgTemplate[] = [
  // 1. SIEMENS S7-1200 CPU
  {
    id: 'svg-siemens-s7-1200',
    name: 'Siemens SIMATIC S7-1200 CPU 1214C',
    brand: 'Siemens',
    category: 'plc_cpu',
    widthMm: 110,
    heightMm: 100,
    description: 'Frente detalhada com tampas basculantes de bornes, LEDs RUN/STOP/ERROR e porta PROFINET RJ45.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 100" width="100%" height="100%">
  <defs>
    <linearGradient id="s7body" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38434f"/>
      <stop offset="50%" stop-color="#2a333c"/>
      <stop offset="100%" stop-color="#1f262d"/>
    </linearGradient>
    <linearGradient id="s7door" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4a5563"/>
      <stop offset="100%" stop-color="#374151"/>
    </linearGradient>
  </defs>
  <!-- Corpo Principal -->
  <rect x="0" y="0" width="110" height="100" rx="3" fill="url(#s7body)" stroke="#111827" stroke-width="1"/>
  <!-- Tampa Superior de Entradas Digitais -->
  <rect x="3" y="3" width="104" height="24" rx="2" fill="url(#s7door)" stroke="#1f2937" stroke-width="0.8"/>
  <rect x="6" y="6" width="98" height="6" fill="#111827" rx="1"/>
  <circle cx="12" cy="9" r="1.5" fill="#e5e7eb"/><circle cx="20" cy="9" r="1.5" fill="#e5e7eb"/>
  <circle cx="28" cy="9" r="1.5" fill="#e5e7eb"/><circle cx="36" cy="9" r="1.5" fill="#e5e7eb"/>
  <circle cx="44" cy="9" r="1.5" fill="#e5e7eb"/><circle cx="52" cy="9" r="1.5" fill="#e5e7eb"/>
  <circle cx="60" cy="9" r="1.5" fill="#e5e7eb"/><circle cx="68" cy="9" r="1.5" fill="#e5e7eb"/>
  <circle cx="76" cy="9" r="1.5" fill="#e5e7eb"/><circle cx="84" cy="9" r="1.5" fill="#e5e7eb"/>
  <text x="8" y="22" fill="#9ca3af" font-size="5" font-family="sans-serif" font-weight="bold">DI a .0 .1 .2 .3 .4 .5 .6 .7</text>
  <!-- Painel Central -->
  <rect x="3" y="29" width="104" height="42" fill="#1a222a" rx="1.5" stroke="#111827" stroke-width="0.5"/>
  <text x="8" y="41" fill="#00a3a6" font-size="8.5" font-family="sans-serif" font-weight="900" letter-spacing="0.5">SIEMENS</text>
  <text x="8" y="50" fill="#f3f4f6" font-size="6.5" font-family="sans-serif" font-weight="bold">SIMATIC S7-1200</text>
  <text x="8" y="58" fill="#9ca3af" font-size="5" font-family="sans-serif">CPU 1214C DC/DC/DC</text>
  <!-- LEDs de Estado -->
  <g transform="translate(68, 35)">
    <circle cx="6" cy="4" r="2.2" fill="#22c55e" stroke="#15803d" stroke-width="0.5"/>
    <text x="12" y="5.5" fill="#d1d5db" font-size="4" font-family="sans-serif">RUN/STOP</text>
    <circle cx="6" cy="11" r="2.2" fill="#374151"/>
    <text x="12" y="12.5" fill="#9ca3af" font-size="4" font-family="sans-serif">ERROR</text>
    <circle cx="6" cy="18" r="2.2" fill="#eab308" stroke="#a16207" stroke-width="0.5"/>
    <text x="12" y="19.5" fill="#d1d5db" font-size="4" font-family="sans-serif">MAINT</text>
  </g>
  <!-- Conector RJ45 PROFINET -->
  <rect x="10" y="62" width="14" height="7" rx="1" fill="#0284c7" stroke="#0369a1" stroke-width="0.6"/>
  <text x="17" y="67" fill="#ffffff" font-size="3.5" font-family="sans-serif" font-weight="bold" text-anchor="middle">X1 P1</text>
  <!-- Tampa Inferior de Saídas Digitais -->
  <rect x="3" y="73" width="104" height="24" rx="2" fill="url(#s7door)" stroke="#1f2937" stroke-width="0.8"/>
  <rect x="6" y="85" width="98" height="6" fill="#111827" rx="1"/>
  <circle cx="12" cy="88" r="1.5" fill="#e5e7eb"/><circle cx="20" cy="88" r="1.5" fill="#e5e7eb"/>
  <circle cx="28" cy="88" r="1.5" fill="#e5e7eb"/><circle cx="36" cy="88" r="1.5" fill="#e5e7eb"/>
  <circle cx="44" cy="88" r="1.5" fill="#e5e7eb"/><circle cx="52" cy="88" r="1.5" fill="#e5e7eb"/>
  <text x="8" y="81" fill="#9ca3af" font-size="5" font-family="sans-serif" font-weight="bold">DQ a .0 .1 .2 .3 .4 .5</text>
</svg>`,
  },

  // 2. FONTE MEAN WELL NDR-120
  {
    id: 'svg-meanwell-ndr-120',
    name: 'Fonte Mean Well NDR-120-24 (24VDC 5A)',
    brand: 'Mean Well',
    category: 'power_supply',
    widthMm: 40,
    heightMm: 125,
    description: 'Chassi metálico em chapa zincada com furação de ventilação, potenciómetro de ajuste e LED DC OK.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 125" width="100%" height="100%">
  <defs>
    <linearGradient id="mwbody" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2d3748"/>
      <stop offset="30%" stop-color="#4a5568"/>
      <stop offset="70%" stop-color="#2d3748"/>
      <stop offset="100%" stop-color="#1a202c"/>
    </linearGradient>
    <linearGradient id="mwfront" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <!-- Corpo Metálico Industrial -->
  <rect x="0" y="0" width="40" height="125" rx="2" fill="url(#mwbody)" stroke="#1e293b" stroke-width="1"/>
  <!-- Bloco Frontal de Comando -->
  <rect x="3" y="10" width="34" height="105" rx="1.5" fill="url(#mwfront)" stroke="#334155" stroke-width="0.8"/>
  <!-- Grelha de Ventilação Superior -->
  <g fill="#0284c7" opacity="0.6">
    <circle cx="8" cy="18" r="1.2"/><circle cx="14" cy="18" r="1.2"/><circle cx="20" cy="18" r="1.2"/><circle cx="26" cy="18" r="1.2"/><circle cx="32" cy="18" r="1.2"/>
    <circle cx="11" cy="22" r="1.2"/><circle cx="17" cy="22" r="1.2"/><circle cx="23" cy="22" r="1.2"/><circle cx="29" cy="22" r="1.2"/>
  </g>
  <!-- Logótipo e Marca Mean Well -->
  <text x="20" y="36" fill="#e2e8f0" font-size="5.5" font-family="sans-serif" font-weight="900" text-anchor="middle" letter-spacing="0.5">MW</text>
  <text x="20" y="43" fill="#38bdf8" font-size="4" font-family="sans-serif" font-weight="bold" text-anchor="middle">MEAN WELL</text>
  <line x1="8" y1="46" x2="32" y2="46" stroke="#38bdf8" stroke-width="0.6"/>
  <!-- Modelo & Potência -->
  <text x="20" y="54" fill="#ffffff" font-size="5" font-family="sans-serif" font-weight="bold" text-anchor="middle">NDR-120-24</text>
  <text x="20" y="62" fill="#94a3b8" font-size="3.5" font-family="sans-serif" text-anchor="middle">INPUT: 100-240VAC</text>
  <text x="20" y="68" fill="#38bdf8" font-size="4" font-family="sans-serif" font-weight="bold" text-anchor="middle">OUTPUT: 24V 5A</text>
  <!-- LED DC OK e Trimmer de Ajuste -->
  <circle cx="12" cy="78" r="2" fill="#22c55e" stroke="#15803d" stroke-width="0.5"/>
  <text x="17" y="79.5" fill="#86efac" font-size="3.2" font-family="sans-serif" font-weight="bold">DC OK</text>
  <circle cx="12" cy="88" r="3" fill="#475569" stroke="#94a3b8" stroke-width="0.6"/>
  <line x1="10" y1="88" x2="14" y2="88" stroke="#f1f5f9" stroke-width="0.8"/>
  <text x="18" y="89.5" fill="#cbd5e1" font-size="3" font-family="sans-serif">+V ADJ</text>
  <!-- Bornes Terminais Inferiores -->
  <rect x="5" y="98" width="30" height="14" rx="1" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
  <circle cx="10" cy="105" r="2" fill="#94a3b8"/><text x="10" y="110" fill="#ffffff" font-size="2.5" text-anchor="middle">-V</text>
  <circle cx="16" cy="105" r="2" fill="#94a3b8"/><text x="16" y="110" fill="#ffffff" font-size="2.5" text-anchor="middle">+V</text>
  <circle cx="24" cy="105" r="2" fill="#94a3b8"/><text x="24" y="110" fill="#ffffff" font-size="2.5" text-anchor="middle">N</text>
  <circle cx="30" cy="105" r="2" fill="#94a3b8"/><text x="30" y="110" fill="#ffffff" font-size="2.5" text-anchor="middle">L</text>
</svg>`,
  },

  // 3. DISJUNTOR MODULAR 1P+N (MCB 18mm)
  {
    id: 'svg-breaker-mcb-1pn',
    name: 'Disjuntor Magnetotérmico 1P+N 16A',
    brand: 'Schneider / Hager',
    category: 'protection_ac',
    widthMm: 18,
    heightMm: 85,
    description: 'Aparelhagem modular DIN padrão 18mm com manípulo de rearme articulado e visor ótico de disparo.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 85" width="100%" height="100%">
  <defs>
    <linearGradient id="mcbbody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <!-- Corpo Plástico Modular Branco RAL 9010 -->
  <rect x="0" y="0" width="18" height="85" rx="1.5" fill="url(#mcbbody)" stroke="#94a3b8" stroke-width="0.8"/>
  <!-- Parafuso Borne Superior -->
  <rect x="4" y="3" width="10" height="8" rx="1" fill="#334155"/>
  <circle cx="9" cy="7" r="2.2" fill="#64748b" stroke="#cbd5e1" stroke-width="0.4"/>
  <line x1="7.5" y1="7" x2="10.5" y2="7" stroke="#0f172a" stroke-width="0.6"/>
  <!-- Ranhura Central do Mecanismo -->
  <rect x="2" y="24" width="14" height="36" rx="1" fill="#cbd5e1" stroke="#94a3b8" stroke-width="0.5"/>
  <!-- Visor de Estado (Verde = Desligado, Vermelho = Ligado) -->
  <rect x="6" y="27" width="6" height="4" rx="0.5" fill="#22c55e" stroke="#15803d" stroke-width="0.4"/>
  <!-- Alavanca de Manobra / Basculante -->
  <rect x="4.5" y="34" width="9" height="18" rx="2" fill="#0f172a" stroke="#334155" stroke-width="0.6"/>
  <line x1="5.5" y1="39" x2="12.5" y2="39" stroke="#64748b" stroke-width="0.6"/>
  <line x1="5.5" y1="43" x2="12.5" y2="43" stroke="#64748b" stroke-width="0.6"/>
  <!-- Gravação Técnica -->
  <text x="9" y="66" fill="#0f172a" font-size="3.2" font-family="sans-serif" font-weight="900" text-anchor="middle">C16</text>
  <text x="9" y="70" fill="#475569" font-size="2.2" font-family="sans-serif" font-weight="bold" text-anchor="middle">230V~</text>
  <rect x="4" y="71.5" width="10" height="3" fill="none" stroke="#0f172a" stroke-width="0.4"/>
  <text x="9" y="74" fill="#0f172a" font-size="2.2" font-family="sans-serif" font-weight="bold" text-anchor="middle">6000</text>
  <!-- Parafuso Borne Inferior -->
  <rect x="4" y="75" width="10" height="7" rx="1" fill="#334155"/>
  <circle cx="9" cy="78.5" r="2.2" fill="#64748b" stroke="#cbd5e1" stroke-width="0.4"/>
  <line x1="7.5" y1="78.5" x2="10.5" y2="78.5" stroke="#0f172a" stroke-width="0.6"/>
</svg>`,
  },

  // 4. INTERRUPTOR DIFERENCIAL (RCCB 36mm 2P 30mA)
  {
    id: 'svg-rccb-2p-30ma',
    name: 'Interruptor Diferencial RCCB 2P 40A 30mA',
    brand: 'Schneider / Hager',
    category: 'protection_ac',
    widthMm: 36,
    heightMm: 85,
    description: 'Diferencial residual com botão de teste periódico T e manípulo bipolar acoplado.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 85" width="100%" height="100%">
  <defs>
    <linearGradient id="rcdbody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="36" height="85" rx="2" fill="url(#rcdbody)" stroke="#94a3b8" stroke-width="0.8"/>
  <!-- Bornes Topo -->
  <rect x="4" y="3" width="11" height="8" rx="1" fill="#334155"/>
  <circle cx="9.5" cy="7" r="2.2" fill="#64748b"/><line x1="8" y1="7" x2="11" y2="7" stroke="#0f172a" stroke-width="0.6"/>
  <rect x="21" y="3" width="11" height="8" rx="1" fill="#334155"/>
  <circle cx="26.5" cy="7" r="2.2" fill="#64748b"/><line x1="25" y1="7" x2="28" y2="7" stroke="#0f172a" stroke-width="0.6"/>
  <!-- Botão de Ensaio / Teste "T" -->
  <circle cx="10" cy="22" r="5" fill="#0284c7" stroke="#0369a1" stroke-width="0.6"/>
  <text x="10" y="24" fill="#ffffff" font-size="5" font-family="sans-serif" font-weight="900" text-anchor="middle">T</text>
  <text x="10" y="30" fill="#64748b" font-size="2.2" font-family="sans-serif" text-anchor="middle">TEST</text>
  <!-- Alavanca Bipolar Acoplada -->
  <rect x="19" y="25" width="12" height="22" rx="2" fill="#0f172a" stroke="#334155" stroke-width="0.6"/>
  <line x1="21" y1="32" x2="29" y2="32" stroke="#64748b" stroke-width="0.6"/>
  <line x1="21" y1="37" x2="29" y2="37" stroke="#64748b" stroke-width="0.6"/>
  <!-- Rótulo do Diferencial -->
  <text x="18" y="58" fill="#0f172a" font-size="4" font-family="sans-serif" font-weight="900" text-anchor="middle">40A  IΔn 30mA</text>
  <text x="18" y="64" fill="#0369a1" font-size="3" font-family="sans-serif" font-weight="bold" text-anchor="middle">TIPO A ~ 230V</text>
  <!-- Bornes Fundo -->
  <rect x="4" y="74" width="11" height="8" rx="1" fill="#334155"/>
  <circle cx="9.5" cy="78" r="2.2" fill="#64748b"/><line x1="8" y1="78" x2="11" y2="78" stroke="#0f172a" stroke-width="0.6"/>
  <rect x="21" y="74" width="11" height="8" rx="1" fill="#334155"/>
  <circle cx="26.5" cy="78" r="2.2" fill="#64748b"/><line x1="25" y1="78" x2="28" y2="78" stroke="#0f172a" stroke-width="0.6"/>
</svg>`,
  },

  // 5. RELÉ DE INTERFACE SLIM (Finder 39 Series / Phoenix Contact)
  {
    id: 'svg-relay-slim-finder',
    name: 'Relé de Interface Slim 24VDC (6.2mm)',
    brand: 'Finder',
    category: 'relays',
    widthMm: 6.2,
    heightMm: 90,
    description: 'Relé de acoplamento ultra-estreito 6.2mm com suporte DIN e indicador LED de bobina.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6.2 90" width="100%" height="100%">
  <!-- Base de Encaixe DIN Azul Finder -->
  <rect x="0" y="0" width="6.2" height="90" rx="0.8" fill="#0284c7" stroke="#0369a1" stroke-width="0.4"/>
  <!-- Bornes Superior A1 / A2 -->
  <rect x="0.8" y="3" width="4.6" height="6" rx="0.5" fill="#0f172a"/>
  <circle cx="3.1" cy="6" r="1.1" fill="#cbd5e1"/>
  <!-- Janela de Relé Central Transparente / Cartucho Eletromecânico -->
  <rect x="0.8" y="24" width="4.6" height="42" rx="0.5" fill="#0369a1" stroke="#38bdf8" stroke-width="0.3"/>
  <circle cx="3.1" cy="32" r="1.1" fill="#22c55e" stroke="#15803d" stroke-width="0.2"/>
  <line x1="1.5" y1="45" x2="4.7" y2="45" stroke="#f0f9ff" stroke-width="0.4"/>
  <line x1="3.1" y1="42" x2="3.1" y2="48" stroke="#f0f9ff" stroke-width="0.4"/>
  <!-- Bornes Inferiores de Contacto (11, 14, 12) -->
  <rect x="0.8" y="81" width="4.6" height="6" rx="0.5" fill="#0f172a"/>
  <circle cx="3.1" cy="84" r="1.1" fill="#cbd5e1"/>
</svg>`,
  },

  // 6. CONTACTOR TRIPOLAR (Schneider TeSys / Siemens SIRIUS)
  {
    id: 'svg-contactor-schneider-tesys',
    name: 'Contactor Tripolar TeSys 9A (24VDC)',
    brand: 'Schneider Electric',
    category: 'motor_control',
    widthMm: 45,
    heightMm: 85,
    description: 'Contactor de potência tripolar para comando de motores AC-3 com contacto auxiliar NA.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 85" width="100%" height="100%">
  <defs>
    <linearGradient id="tesys" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <!-- Corpo Robusto do Contactor -->
  <rect x="0" y="0" width="45" height="85" rx="2" fill="url(#tesys)" stroke="#334155" stroke-width="1"/>
  <!-- Bornes de Potência Superiores (1/L1, 3/L2, 5/L3) + Bobina A1 -->
  <g fill="#475569">
    <circle cx="7" cy="8" r="3" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="17" cy="8" r="3" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="27" cy="8" r="3" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="38" cy="8" r="2.5" fill="#f59e0b" stroke="#ffffff" stroke-width="0.5"/>
  </g>
  <text x="38" y="15" fill="#f59e0b" font-size="3" font-family="sans-serif" text-anchor="middle">A1</text>
  <!-- Tampa Frontal de Acessórios -->
  <rect x="5" y="24" width="35" height="38" rx="2" fill="#334155" stroke="#475569" stroke-width="0.8"/>
  <text x="22.5" y="36" fill="#00a3a6" font-size="4.5" font-family="sans-serif" font-weight="900" text-anchor="middle">Schneider</text>
  <text x="22.5" y="44" fill="#ffffff" font-size="5" font-family="sans-serif" font-weight="bold" text-anchor="middle">TeSys D</text>
  <text x="22.5" y="52" fill="#94a3b8" font-size="3.5" font-family="sans-serif" text-anchor="middle">LC1D09 · 9A AC3</text>
  <!-- Contacto Auxiliar 13-14 NO -->
  <rect x="8" y="55" width="29" height="5" fill="#1e293b" rx="1"/>
  <text x="22.5" y="59" fill="#38bdf8" font-size="3" font-family="sans-serif" font-weight="bold" text-anchor="middle">13 NO  14 NO</text>
  <!-- Bornes de Potência Inferiores (2/T1, 4/T2, 6/T3) + Bobina A2 -->
  <g fill="#475569">
    <circle cx="7" cy="77" r="3" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="17" cy="77" r="3" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="27" cy="77" r="3" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="38" cy="77" r="2.5" fill="#f59e0b" stroke="#ffffff" stroke-width="0.5"/>
  </g>
  <text x="38" y="71" fill="#f59e0b" font-size="3" font-family="sans-serif" text-anchor="middle">A2</text>
</svg>`,
  },

  // 7. BORNE VIKING 3 (Legrand 2.5mm² Cinzento)
  {
    id: 'svg-terminal-viking-3',
    name: 'Borne de Passagem Viking 3 (2.5mm² Cinzento)',
    brand: 'Legrand',
    category: 'terminals',
    widthMm: 5,
    heightMm: 50,
    description: 'Bloco terminal com mola/parafuso, ranhura para pente de ligação equipotencial e tomada de teste.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 50" width="100%" height="100%">
  <!-- Bloco Poliamida Cinzento RAL 7035 -->
  <rect x="0" y="0" width="5" height="50" rx="0.5" fill="#475569" stroke="#64748b" stroke-width="0.4"/>
  <!-- Entrada Superior de Condutor -->
  <circle cx="2.5" cy="6" r="1.2" fill="#0f172a" stroke="#94a3b8" stroke-width="0.3"/>
  <circle cx="2.5" cy="13" r="0.9" fill="#cbd5e1"/>
  <!-- Canal de Barramento Equipotencial Central -->
  <rect x="1" y="21" width="3" height="8" rx="0.4" fill="#0f172a"/>
  <!-- Entrada Inferior de Condutor -->
  <circle cx="2.5" cy="37" r="0.9" fill="#cbd5e1"/>
  <circle cx="2.5" cy="44" r="1.2" fill="#0f172a" stroke="#94a3b8" stroke-width="0.3"/>
</svg>`,
  },

  // 8. BORNE DE TERRA PE (Verde e Amarelo 2.5mm²)
  {
    id: 'svg-terminal-ground-pe',
    name: 'Borne de Terra PE (Verde / Amarelo)',
    brand: 'Legrand / Weidmüller',
    category: 'terminals',
    widthMm: 6,
    heightMm: 50,
    description: 'Borne de condutor de proteção PE com contacto mecânico direto à calha DIN 35mm.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 50" width="100%" height="100%">
  <!-- Riscas Verdes e Amarelas Normalizadas -->
  <rect x="0" y="0" width="6" height="50" rx="0.5" fill="#15803d" stroke="#166534" stroke-width="0.4"/>
  <rect x="0" y="15" width="6" height="20" fill="#eab308"/>
  <circle cx="3" cy="6" r="1.3" fill="#0f172a" stroke="#facc15" stroke-width="0.3"/>
  <circle cx="3" cy="44" r="1.3" fill="#0f172a" stroke="#facc15" stroke-width="0.3"/>
  <text x="3" y="27" fill="#0f172a" font-size="3.5" font-family="sans-serif" font-weight="900" text-anchor="middle">PE</text>
</svg>`,
  },

  // 9. PARAGEM DE EMERGÊNCIA (Cogumelo 40mm Vermelho com Colar Amarelo)
  {
    id: 'svg-emergency-stop',
    name: 'Botão de Paragem de Emergência (Cogumelo Ø40mm)',
    brand: 'Schneider Harmony',
    category: 'accessories',
    widthMm: 45,
    heightMm: 65,
    description: 'Botão cogumelo de segurança com bloqueio mecânico e destravamento por rotação.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 65" width="100%" height="100%">
  <!-- Anel de Base Amarelo Segurança RAL 1021 -->
  <circle cx="22.5" cy="30" r="21" fill="#eab308" stroke="#ca8a04" stroke-width="1.2"/>
  <text x="22.5" y="15" fill="#000000" font-size="3" font-family="sans-serif" font-weight="900" text-anchor="middle">PARAGEM DE EMERGÊNCIA</text>
  <!-- Cogumelo Vermelho ISO 13850 -->
  <circle cx="22.5" cy="32" r="16" fill="#dc2626" stroke="#991b1b" stroke-width="1.5"/>
  <circle cx="22.5" cy="32" r="12" fill="#ef4444"/>
  <!-- Setas de Rotação de Desbloqueio -->
  <path d="M 16 32 A 6.5 6.5 0 0 1 29 32" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-dasharray="2 1"/>
  <polygon points="29,29 31,33 27,33" fill="#ffffff"/>
  <text x="22.5" y="59" fill="#0f172a" font-size="3.5" font-family="sans-serif" font-weight="bold" text-anchor="middle">RESET ↻</text>
</svg>`,
  },

  // 10. PAINEL HMI SIEMENS KTP700 BASIC
  {
    id: 'svg-siemens-hmi-ktp700',
    name: 'Painel Touchscreen HMI Siemens KTP700 Basic',
    brand: 'Siemens',
    category: 'accessories',
    widthMm: 214,
    heightMm: 158,
    description: 'Ecrã tátil industrial panorâmico de 7 polegadas com moldura frontal estanque IP65.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 214 158" width="100%" height="100%">
  <!-- Moldura Frontal Cinzenta Siemens -->
  <rect x="0" y="0" width="214" height="158" rx="6" fill="#374151" stroke="#1f2937" stroke-width="2"/>
  <!-- Chanfro Interior Escuro -->
  <rect x="12" y="12" width="190" height="134" rx="3" fill="#111827"/>
  <!-- Ecrã Ativo 7 Polegadas -->
  <rect x="24" y="22" width="166" height="104" rx="2" fill="#0f172a" stroke="#0284c7" stroke-width="1"/>
  <!-- Interface Gráfica / Dashboard HMI -->
  <rect x="28" y="26" width="158" height="16" fill="#0284c7" rx="1"/>
  <text x="34" y="37" fill="#ffffff" font-size="8" font-family="sans-serif" font-weight="bold">SUPERVISÃO DO QUADRO · QD1</text>
  <text x="178" y="37" fill="#e0f2fe" font-size="7" font-family="JetBrains Mono" text-anchor="end">24.1 VDC · 4.8A</text>
  <!-- Gráficos e Botões do Ecrã -->
  <rect x="32" y="50" width="46" height="36" rx="2" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
  <text x="55" y="65" fill="#38bdf8" font-size="6" font-family="sans-serif" font-weight="bold" text-anchor="middle">MOTOR M1</text>
  <circle cx="55" cy="74" r="4" fill="#22c55e"/>
  <rect x="84" y="50" width="46" height="36" rx="2" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
  <text x="107" y="65" fill="#38bdf8" font-size="6" font-family="sans-serif" font-weight="bold" text-anchor="middle">AUTOMÁTICO</text>
  <rect x="94" y="70" width="26" height="10" rx="2" fill="#0284c7"/>
  <text x="107" y="77" fill="#ffffff" font-size="5" font-family="sans-serif" font-weight="bold" text-anchor="middle">START</text>
  <!-- Logótipo Siemens na Moldura -->
  <text x="30" y="146" fill="#00a3a6" font-size="9" font-family="sans-serif" font-weight="900" letter-spacing="1">SIEMENS</text>
  <text x="184" y="146" fill="#9ca3af" font-size="7" font-family="sans-serif" font-weight="bold" text-anchor="end">SIMATIC HMI</text>
</svg>`,
  },

  // 11. CONTACTOR SIEMENS SIRIUS 3RT20 (45x58mm)
  {
    id: 'svg-contactor-siemens-sirius',
    name: 'Contactor Siemens SIRIUS 3RT20 (S00/S0 45mm)',
    brand: 'Siemens',
    category: 'motor_control',
    widthMm: 45,
    heightMm: 58,
    description: 'Contactor tripolar Siemens Sirius compacto tamanho S00 para comando de motores até 4kW.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 58" width="100%" height="100%">
  <defs>
    <linearGradient id="sirius-bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <!-- Corpo Cárter Siemens Cinzento-Escuro -->
  <rect x="0" y="0" width="45" height="58" rx="2" fill="url(#sirius-bg)" stroke="#334155" stroke-width="1"/>
  <!-- Faixa Turquesa Siemens Superior -->
  <rect x="2" y="2" width="41" height="5" rx="1" fill="#00a3a6"/>
  <text x="22.5" y="6" fill="#ffffff" font-size="3" font-family="sans-serif" font-weight="900" text-anchor="middle" letter-spacing="0.5">SIEMENS · SIRIUS</text>
  <!-- Terminais Superiores: 1/L1, 3/L2, 5/L3 e Bobina A1 -->
  <g fill="#475569">
    <circle cx="8" cy="12" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="17.5" cy="12" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="27" cy="12" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="37" cy="12" r="2.2" fill="#0284c7" stroke="#ffffff" stroke-width="0.5"/>
  </g>
  <text x="8" y="18" fill="#94a3b8" font-size="2.5" font-family="sans-serif" text-anchor="middle">1/L1</text>
  <text x="17.5" y="18" fill="#94a3b8" font-size="2.5" font-family="sans-serif" text-anchor="middle">3/L2</text>
  <text x="27" y="18" fill="#94a3b8" font-size="2.5" font-family="sans-serif" text-anchor="middle">5/L3</text>
  <text x="37" y="18" fill="#38bdf8" font-size="2.5" font-family="sans-serif" font-weight="bold" text-anchor="middle">A1</text>
  <!-- Centro / Placa Frontal de Especificações -->
  <rect x="4" y="21" width="37" height="18" rx="1.5" fill="#0f172a" stroke="#1e293b" stroke-width="0.8"/>
  <text x="22.5" y="28" fill="#ffffff" font-size="3.8" font-family="JetBrains Mono" font-weight="bold" text-anchor="middle">3RT2016-1BB41</text>
  <text x="22.5" y="34" fill="#38bdf8" font-size="3" font-family="sans-serif" text-anchor="middle">9A (4kW) · 24V DC</text>
  <!-- Terminais Inferiores: 2/T1, 4/T2, 6/T3 e Bobina A2 -->
  <g fill="#475569">
    <circle cx="8" cy="46" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="17.5" cy="46" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="27" cy="46" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
    <circle cx="37" cy="46" r="2.2" fill="#0284c7" stroke="#ffffff" stroke-width="0.5"/>
  </g>
  <text x="8" y="54" fill="#94a3b8" font-size="2.5" font-family="sans-serif" text-anchor="middle">2/T1</text>
  <text x="17.5" y="54" fill="#94a3b8" font-size="2.5" font-family="sans-serif" text-anchor="middle">4/T2</text>
  <text x="27" y="54" fill="#94a3b8" font-size="2.5" font-family="sans-serif" text-anchor="middle">6/T3</text>
  <text x="37" y="54" fill="#38bdf8" font-size="2.5" font-family="sans-serif" font-weight="bold" text-anchor="middle">A2</text>
</svg>`,
  },

  // 12. CONTACTOR MODULAR DE CALHA DIN (18x85mm)
  {
    id: 'svg-contactor-modular-din',
    name: 'Contactor Modular DIN 2P (18mm / 25A)',
    brand: 'Schneider / Hager',
    category: 'residential_modular',
    widthMm: 18,
    heightMm: 85,
    description: 'Contactor modular silencioso para iluminação, termoacumuladores e cargas monofásicas em calha DIN.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 85" width="100%" height="100%">
  <!-- Cárter Modular DIN RAL 7035 -->
  <rect x="0" y="0" width="18" height="85" rx="1.5" fill="#334155" stroke="#475569" stroke-width="0.8"/>
  <!-- Terminal Superior Potência (1, 3) e Bobina A1 -->
  <circle cx="5" cy="7" r="2.2" fill="#0f172a" stroke="#94a3b8" stroke-width="0.5"/>
  <circle cx="13" cy="7" r="2.2" fill="#0f172a" stroke="#94a3b8" stroke-width="0.5"/>
  <text x="5" y="14" fill="#cbd5e1" font-size="2.5" font-family="sans-serif" text-anchor="middle">1</text>
  <text x="13" y="14" fill="#f59e0b" font-size="2.5" font-family="sans-serif" font-weight="bold" text-anchor="middle">A1</text>
  <!-- Frente Modular com Seletor Auto / 0 / 1 -->
  <rect x="2" y="24" width="14" height="38" rx="1" fill="#1e293b" stroke="#334155" stroke-width="0.6"/>
  <!-- Janela de Estado (Verde = Desligado, Vermelho = Ativo) -->
  <rect x="4" y="28" width="10" height="4" rx="0.5" fill="#22c55e" stroke="#15803d" stroke-width="0.3"/>
  <!-- Alavanca / Seletor Frontal de 3 Posições -->
  <rect x="4" y="36" width="10" height="12" rx="1" fill="#0f172a" stroke="#64748b" stroke-width="0.5"/>
  <rect x="6" y="39" width="6" height="6" rx="0.5" fill="#dc2626"/>
  <text x="9" y="44" fill="#ffffff" font-size="3" font-family="sans-serif" font-weight="bold" text-anchor="middle">AUTO</text>
  <text x="9" y="55" fill="#94a3b8" font-size="2.4" font-family="sans-serif" text-anchor="middle">25A · 2NO</text>
  <text x="9" y="59" fill="#38bdf8" font-size="2.2" font-family="sans-serif" text-anchor="middle">230V~</text>
  <!-- Terminais Inferiores Potência (2, 4) e Bobina A2 -->
  <text x="5" y="73" fill="#cbd5e1" font-size="2.5" font-family="sans-serif" text-anchor="middle">2</text>
  <text x="13" y="73" fill="#f59e0b" font-size="2.5" font-family="sans-serif" font-weight="bold" text-anchor="middle">A2</text>
  <circle cx="5" cy="78" r="2.2" fill="#0f172a" stroke="#94a3b8" stroke-width="0.5"/>
  <circle cx="13" cy="78" r="2.2" fill="#0f172a" stroke="#94a3b8" stroke-width="0.5"/>
</svg>`,
  },

  // 13. CONTACTOR INVERSOR DE MARCHA DUPLO (90x77mm)
  {
    id: 'svg-contactor-reversing',
    name: 'Contactor Inversor de Marcha com Encravamento (90mm)',
    brand: 'Schneider / Siemens',
    category: 'motor_control',
    widthMm: 90,
    heightMm: 77,
    description: 'Conjunto de dois contactores montados com encravamento mecânico e elétrico para inversão de sentido de motores.',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 77" width="100%" height="100%">
  <!-- Contactor KM1 (Esquerda - Rotação Direita) -->
  <rect x="0" y="0" width="44" height="77" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
  <!-- Contactor KM2 (Direita - Rotação Esquerda) -->
  <rect x="46" y="0" width="44" height="77" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
  <!-- Bloco Central de Encravamento Mecânico -->
  <rect x="42" y="24" width="6" height="28" rx="1" fill="#dc2626" stroke="#991b1b" stroke-width="0.6"/>
  <line x1="43" y1="38" x2="47" y2="38" stroke="#ffffff" stroke-width="1"/>
  <!-- Bornes KM1 -->
  <circle cx="7" cy="8" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="17" cy="8" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="27" cy="8" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="37" cy="8" r="2" fill="#f59e0b"/>
  <!-- Bornes KM2 -->
  <circle cx="53" cy="8" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="63" cy="8" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="73" cy="8" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="83" cy="8" r="2" fill="#f59e0b"/>
  <!-- Placas Frontais -->
  <rect x="5" y="20" width="34" height="34" rx="1.5" fill="#334155" stroke="#475569" stroke-width="0.6"/>
  <text x="22" y="32" fill="#00a3a6" font-size="4" font-family="sans-serif" font-weight="bold" text-anchor="middle">KM1 (CW)</text>
  <text x="22" y="42" fill="#ffffff" font-size="4" font-family="sans-serif" font-weight="bold" text-anchor="middle">TeSys D 9A</text>
  <text x="22" y="50" fill="#38bdf8" font-size="3" font-family="sans-serif" text-anchor="middle">Avanço · 24VDC</text>
  <rect x="51" y="20" width="34" height="34" rx="1.5" fill="#334155" stroke="#475569" stroke-width="0.6"/>
  <text x="68" y="32" fill="#f59e0b" font-size="4" font-family="sans-serif" font-weight="bold" text-anchor="middle">KM2 (CCW)</text>
  <text x="68" y="42" fill="#ffffff" font-size="4" font-family="sans-serif" font-weight="bold" text-anchor="middle">TeSys D 9A</text>
  <text x="68" y="50" fill="#38bdf8" font-size="3" font-family="sans-serif" text-anchor="middle">Recuo · 24VDC</text>
  <!-- Bornes Inferiores KM1 e KM2 -->
  <circle cx="7" cy="69" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="17" cy="69" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="27" cy="69" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="37" cy="69" r="2" fill="#f59e0b"/>
  <circle cx="53" cy="69" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="63" cy="69" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="73" cy="69" r="2.5" fill="#64748b" stroke="#cbd5e1" stroke-width="0.5"/>
  <circle cx="83" cy="69" r="2" fill="#f59e0b"/>
</svg>`,
  },
];
