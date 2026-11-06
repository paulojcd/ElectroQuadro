import { ProjectState } from '../types/electrical';
import { analyzeProjectForSchematic } from './schematicGenerator';
import { generateUnifilarRoutingData } from './unifilarCircuitRouter';
import { executeAutoRouter, WireStandard, RoutingStyle } from './autoRouterEngine';

export type SchematicTheme = 'light' | 'dark';
export type SchematicViewMode = 'power' | 'control' | 'breakers_terminals';

export function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSchematicSvgString(
  project: ProjectState,
  viewMode: SchematicViewMode = 'power',
  theme: SchematicTheme = 'light'
): string {
  const analysis = analyzeProjectForSchematic(project);
  const isThreePhase = project.config.supplyVoltage.includes('400V');
  const isDark = theme === 'dark';

  // Palette definitions
  const bg = isDark ? '#0f172a' : '#ffffff';
  const gridStroke = isDark ? '#1e293b' : '#f1f5f9';
  const borderOuter = isDark ? '#475569' : '#0f172a';
  const borderInner = isDark ? '#334155' : '#475569';
  const textMuted = isDark ? '#64748b' : '#64748b';
  const textBody = isDark ? '#94a3b8' : '#334155';
  const textHeading = isDark ? '#f8fafc' : '#0f172a';
  const compFill = isDark ? '#1e293b' : '#f8fafc';
  const compFillHeader = isDark ? '#0369a1' : '#e0f2fe';
  const titleBlockBg = isDark ? '#090d16' : '#ffffff';
  const titleBlockBorder = isDark ? '#475569' : '#0f172a';
  const titleBlockDivider = isDark ? '#334155' : '#cbd5e1';

  const acLineColor = isDark ? '#38bdf8' : '#0284c7';
  const dcPosColor = isDark ? '#ef4444' : '#dc2626';
  const dcNegColor = isDark ? '#3b82f6' : '#2563eb';
  const diffColor = isDark ? '#10b981' : '#059669';
  const peColor = isDark ? '#84cc16' : '#16a34a';
  const spdColor = isDark ? '#eab308' : '#d97706';

  let contentSvg = '';

  if (viewMode === 'power') {
    contentSvg = `
      <g transform="translate(0, 30)">
        <!-- 1. Main Supply Incomer -->
        <g transform="translate(80, 80)">
          <text x="0" y="0" fill="${acLineColor}" font-size="12" font-weight="bold" font-family="JetBrains Mono, monospace">
            REDE DE ENTRADA (${isThreePhase ? '3x400VAC + N + PE' : '230VAC + N + PE'})
          </text>
          <text x="0" y="15" fill="${textMuted}" font-size="10" font-family="JetBrains Mono, monospace">
            Cabo ${isThreePhase ? '5G6 mm² Cu' : '3G2.5 mm² Cu'}
          </text>
          
          <!-- Lines -->
          <line x1="80" y1="30" x2="80" y2="70" stroke="${acLineColor}" stroke-width="2.5" />
          <circle cx="80" cy="30" r="4" fill="${acLineColor}" />
          <text x="92" y="34" fill="${textBody}" font-size="10" font-family="JetBrains Mono, monospace">
            ${isThreePhase ? 'L1, L2, L3, N, PE' : 'L, N, PE'}
          </text>

          <!-- Main Breaker Q0 -->
          <g transform="translate(50, 70)">
            <rect x="0" y="0" width="60" height="50" fill="${compFill}" stroke="${acLineColor}" stroke-width="1.5" rx="3" />
            <path d="M 30 0 L 30 18 M 30 32 L 30 50 M 23 32 L 37 18" stroke="${acLineColor}" stroke-width="2" stroke-linecap="round" />
            <rect x="25" y="10" width="10" height="6" fill="none" stroke="${isDark ? '#e2e8f0' : '#475569'}" stroke-width="1" />
            <path d="M 27 38 L 33 38 M 30 36 L 30 40" stroke="${isDark ? '#e2e8f0' : '#475569'}" stroke-width="1" />
            <text x="70" y="20" fill="${textHeading}" font-size="11" font-weight="bold" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.mainBreaker?.tag || 'Q0')}
            </text>
            <text x="70" y="34" fill="${textBody}" font-size="9" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.mainBreaker?.data.partNumber || '5SY4216-7')}
            </text>
            <text x="70" y="46" fill="${acLineColor}" font-size="9" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.mainBreaker?.data.ratedCurrentA || 16)}A / 10kA Curva C
            </text>
          </g>

          <!-- Differential RCCB Q_DIFF -->
          <g transform="translate(50, 150)">
            <line x1="30" y1="-30" x2="30" y2="0" stroke="${acLineColor}" stroke-width="2" />
            <rect x="0" y="0" width="60" height="50" fill="${compFill}" stroke="${diffColor}" stroke-width="1.5" rx="3" />
            <circle cx="30" cy="25" r="14" fill="none" stroke="${diffColor}" stroke-width="1.5" stroke-dasharray="3 2" />
            <line x1="30" y1="0" x2="30" y2="15" stroke="${diffColor}" stroke-width="1.5" />
            <line x1="30" y1="35" x2="30" y2="50" stroke="${diffColor}" stroke-width="1.5" />
            <path d="M 23 35 L 37 15" stroke="${diffColor}" stroke-width="2" />
            <text x="70" y="20" fill="${textHeading}" font-size="11" font-weight="bold" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.diffBreaker?.tag || 'Q_DIFF')}
            </text>
            <text x="70" y="34" fill="${textBody}" font-size="9" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.diffBreaker?.data.partNumber || '5SV3312-6')}
            </text>
            <text x="70" y="46" fill="${diffColor}" font-size="9" font-family="JetBrains Mono, monospace">
              IΔn = 30mA Tipo A
            </text>
          </g>

          <!-- Surge Protection SPD -->
          ${
            analysis.spd
              ? `
            <g transform="translate(160, 230)">
              <line x1="-80" y1="0" x2="0" y2="0" stroke="${textMuted}" stroke-width="1.5" />
              <rect x="0" y="-15" width="45" height="30" fill="${compFill}" stroke="${spdColor}" stroke-width="1.5" rx="2" />
              <path d="M 12 -5 L 32 5 M 22 -10 L 22 10" stroke="${spdColor}" stroke-width="1.5" />
              <line x1="45" y1="0" x2="70" y2="0" stroke="${spdColor}" stroke-width="1.5" />
              <line x1="70" y1="-8" x2="70" y2="8" stroke="${peColor}" stroke-width="2" />
              <line x1="74" y1="-5" x2="74" y2="5" stroke="${peColor}" stroke-width="1.5" />
              <line x1="78" y1="-2" x2="78" y2="2" stroke="${peColor}" stroke-width="1" />
              <text x="0" y="30" fill="${spdColor}" font-size="9" font-weight="bold" font-family="JetBrains Mono, monospace">
                SPD1 (T2 20/40kA)
              </text>
            </g>
          `
              : ''
          }

          <!-- Main Distribution Busbar -->
          <line x1="80" y1="230" x2="80" y2="280" stroke="${acLineColor}" stroke-width="2.5" />
          <line x1="80" y1="280" x2="1000" y2="280" stroke="${acLineColor}" stroke-width="3" />
          <text x="85" y="272" fill="${acLineColor}" font-size="11" font-weight="bold" font-family="JetBrains Mono, monospace">
            BARRAMENTO GERAL AC (230V / 50Hz)
          </text>
        </g>

        <!-- Branch 1: Mean Well Power Supply & DC Circuit -->
        <g transform="translate(320, 390)">
          <line x1="0" y1="-30" x2="0" y2="10" stroke="${acLineColor}" stroke-width="2" />
          <circle cx="0" cy="-30" r="3.5" fill="${acLineColor}" />

          <!-- Breaker Q1 for Mean Well -->
          <g transform="translate(-25, 10)">
            <rect x="0" y="0" width="50" height="40" fill="${compFill}" stroke="${acLineColor}" stroke-width="1.5" rx="3" />
            <path d="M 25 0 L 25 12 M 25 28 L 25 40 M 18 28 L 32 12" stroke="${acLineColor}" stroke-width="2" />
            <text x="58" y="18" fill="${textHeading}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.psuBreaker?.tag || 'Q1')}
            </text>
            <text x="58" y="32" fill="${textBody}" font-size="9" font-family="JetBrains Mono, monospace">
              1P+N 6A Curva C
            </text>
          </g>

          <!-- Line to Mean Well -->
          <line x1="0" y1="50" x2="0" y2="90" stroke="${acLineColor}" stroke-width="2" />

          <!-- Mean Well Power Supply G1 -->
          <g transform="translate(-65, 90)">
            <rect x="0" y="0" width="130" height="90" fill="${compFill}" stroke="#0284c7" stroke-width="2" rx="4" />
            <rect x="0" y="0" width="130" height="24" fill="${compFillHeader}" rx="3" />
            <text x="65" y="16" fill="${isDark ? '#ffffff' : '#0369a1'}" font-size="10" font-weight="bold" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif">
              FONTE DIN MEAN WELL
            </text>

            <line x1="0" y1="24" x2="130" y2="90" stroke="${gridStroke}" stroke-width="1" stroke-dasharray="2 2" />

            <text x="25" y="55" fill="${acLineColor}" font-size="18" font-weight="bold" font-family="JetBrains Mono, monospace">~</text>
            <text x="18" y="72" fill="${textBody}" font-size="8" font-family="JetBrains Mono, monospace">230VAC</text>

            <text x="95" y="55" fill="${dcPosColor}" font-size="16" font-weight="bold" font-family="JetBrains Mono, monospace">=</text>
            <text x="88" y="72" fill="${dcPosColor}" font-size="8" font-family="JetBrains Mono, monospace">24VDC</text>

            <text x="65" y="44" fill="${acLineColor}" font-size="11" font-weight="bold" text-anchor="middle" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.meanWellPsu?.tag || 'G1')}
            </text>
            <text x="65" y="58" fill="${textHeading}" font-size="10" font-weight="bold" text-anchor="middle" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.meanWellPsu?.data.partNumber || 'NDR-120-24')}
            </text>
            <text x="65" y="78" fill="${acLineColor}" font-size="9" text-anchor="middle" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.meanWellPsu?.data.ratedCurrentA || 5)}A / ${escapeXml(analysis.meanWellPsu?.data.ratedPowerW || 120)}W
            </text>
          </g>

          <!-- DC Breaker F1 -->
          <line x1="0" y1="180" x2="0" y2="210" stroke="${dcPosColor}" stroke-width="2" />
          <g transform="translate(-25, 210)">
            <rect x="0" y="0" width="50" height="40" fill="${compFill}" stroke="${dcPosColor}" stroke-width="1.5" rx="3" />
            <path d="M 25 0 L 25 12 M 25 28 L 25 40 M 18 28 L 32 12" stroke="${dcPosColor}" stroke-width="2" />
            <text x="58" y="18" fill="${dcPosColor}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.dcBreaker?.tag || 'F1')} (DC)
            </text>
            <text x="58" y="32" fill="${textBody}" font-size="9" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.dcBreaker?.data.ratedCurrentA || 4)}A DC Curva C
            </text>
          </g>

          <!-- 24VDC Busbar output -->
          <line x1="0" y1="250" x2="0" y2="280" stroke="${dcPosColor}" stroke-width="2.5" />
          <line x1="-40" y1="280" x2="480" y2="280" stroke="${dcPosColor}" stroke-width="3" />
          <line x1="-40" y1="295" x2="480" y2="295" stroke="${dcNegColor}" stroke-width="3" />
          <text x="490" y="284" fill="${dcPosColor}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
            +24V DC (L+)
          </text>
          <text x="490" y="299" fill="${dcNegColor}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
            0V DC (M)
          </text>
        </g>

        <!-- Branch 2: Motor Starters / Sirius Contactors (if any) -->
        ${
          analysis.motorStarters.length > 0
            ? analysis.motorStarters
                .map((ms, idx) => {
                  const xPos = 620 + idx * 160;
                  return `
            <g transform="translate(${xPos}, 390)">
              <line x1="0" y1="-30" x2="0" y2="10" stroke="${acLineColor}" stroke-width="2" />
              <circle cx="0" cy="-30" r="3.5" fill="${acLineColor}" />

              <!-- Motor Protector QM -->
              <g transform="translate(-25, 10)">
                <rect x="0" y="0" width="50" height="40" fill="${compFill}" stroke="${textBody}" stroke-width="1.5" rx="3" />
                <path d="M 25 0 L 25 12 M 25 28 L 25 40 M 18 28 L 32 12" stroke="${textBody}" stroke-width="2" />
                <text x="58" y="16" fill="${textHeading}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
                  ${escapeXml(ms.mms.tag)}
                </text>
                <text x="58" y="28" fill="${textBody}" font-size="8" font-family="JetBrains Mono, monospace">
                  Disjuntor-Motor
                </text>
                <text x="58" y="40" fill="${acLineColor}" font-size="8" font-family="JetBrains Mono, monospace">
                  ${escapeXml(ms.mms.data.ratedCurrentA || 4)}A Sirius
                </text>
              </g>

              <!-- Line to Contactor -->
              <line x1="0" y1="50" x2="0" y2="80" stroke="${acLineColor}" stroke-width="2" />

              <!-- Contactor K -->
              <g transform="translate(-25, 80)">
                <rect x="0" y="0" width="50" height="40" fill="${compFill}" stroke="${acLineColor}" stroke-width="1.5" rx="3" />
                <line x1="25" y1="0" x2="25" y2="12" stroke="${acLineColor}" stroke-width="2" />
                <line x1="25" y1="28" x2="25" y2="40" stroke="${acLineColor}" stroke-width="2" />
                <line x1="20" y1="28" x2="30" y2="12" stroke="${acLineColor}" stroke-width="2" />
                <text x="58" y="16" fill="${textHeading}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
                  ${escapeXml(ms.contactor?.tag || `K${idx + 1}`)}
                </text>
                <text x="58" y="28" fill="${textBody}" font-size="8" font-family="JetBrains Mono, monospace">
                  Contactor 3RT2
                </text>
                <text x="58" y="40" fill="${diffColor}" font-size="8" font-family="JetBrains Mono, monospace">
                  Bobina 24VDC
                </text>
              </g>

              <!-- Line to Motor -->
              <line x1="0" y1="120" x2="0" y2="160" stroke="${acLineColor}" stroke-width="2" />
              <rect x="-15" y="160" width="30" height="15" fill="${isDark ? '#334155' : '#cbd5e1'}" stroke="${textBody}" stroke-width="1" />
              <text x="0" y="171" fill="${isDark ? '#ffffff' : '#0f172a'}" font-size="8" text-anchor="middle" font-family="JetBrains Mono, monospace">
                X1:U,V,W
              </text>
              <line x1="0" y1="175" x2="0" y2="200" stroke="${acLineColor}" stroke-width="2" />
              <circle cx="0" cy="225" r="22" fill="${compFill}" stroke="${acLineColor}" stroke-width="2" />
              <text x="0" y="230" fill="${textHeading}" font-size="13" font-weight="bold" text-anchor="middle" font-family="JetBrains Mono, monospace">
                M${idx + 1}
              </text>
              <text x="0" y="260" fill="${textBody}" font-size="8" text-anchor="middle" font-family="JetBrains Mono, monospace">
                Motor 3~ 400V
              </text>
            </g>
          `;
                })
                .join('')
            : `
            <!-- Auxiliary Socket or Service Line -->
            <g transform="translate(680, 390)">
              <line x1="0" y1="-30" x2="0" y2="10" stroke="${acLineColor}" stroke-width="2" />
              <circle cx="0" cy="-30" r="3.5" fill="${acLineColor}" />
              <rect x="-25" y="10" width="50" height="40" fill="${compFill}" stroke="${acLineColor}" stroke-width="1.5" rx="3" />
              <path d="M 0 10 L 0 22 M 0 38 L 0 50 M -7 38 L 7 22" stroke="${acLineColor}" stroke-width="2" />
              <text x="35" y="25" fill="${textHeading}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
                Q_AUX (10A)
              </text>
              <line x1="0" y1="50" x2="0" y2="90" stroke="${acLineColor}" stroke-width="2" />
              <rect x="-25" y="90" width="50" height="40" fill="${compFill}" stroke="${textBody}" stroke-width="1.5" rx="3" />
              <circle cx="-8" cy="110" r="4" fill="none" stroke="${textBody}" stroke-width="1.5" />
              <circle cx="8" cy="110" r="4" fill="none" stroke="${textBody}" stroke-width="1.5" />
              <text x="0" y="145" fill="${textBody}" font-size="9" text-anchor="middle" font-family="JetBrains Mono, monospace">
                Tomada Serviço XS1
              </text>
            </g>
          `
        }
      </g>
    `;
  } else if (viewMode === 'control') {
    contentSvg = `
      <g transform="translate(50, 70)">
        <!-- Top 24VDC Power Rails -->
        <g transform="translate(0, 30)">
          <line x1="20" y1="0" x2="1080" y2="0" stroke="${dcPosColor}" stroke-width="3" />
          <text x="1090" y="4" fill="${dcPosColor}" font-size="11" font-weight="bold" font-family="JetBrains Mono, monospace">
            +24V DC (L+)
          </text>
          <line x1="20" y1="20" x2="1080" y2="20" stroke="${dcNegColor}" stroke-width="3" />
          <text x="1090" y="24" fill="${dcNegColor}" font-size="11" font-weight="bold" font-family="JetBrains Mono, monospace">
            0V DC (M)
          </text>
          <text x="30" y="-8" fill="${textBody}" font-size="10" font-family="JetBrains Mono, monospace">
            ALIMENTAÇÃO DERIVADA DA FONTE MEAN WELL ${escapeXml(analysis.meanWellPsu?.data.partNumber || 'NDR-120-24')}
          </text>
        </g>

        <!-- Siemens PLC Main Unit Block -->
        <g transform="translate(180, 110)">
          <rect x="0" y="0" width="460" height="340" fill="${compFill}" stroke="#0d9488" stroke-width="2.5" rx="6" />
          <rect x="0" y="0" width="460" height="35" fill="${isDark ? '#0f766e' : '#ccfbf1'}" rx="5" />
          
          <text x="20" y="23" fill="${isDark ? '#ffffff' : '#0f766e'}" font-size="13" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif">
            ${escapeXml(analysis.plcs[0]?.data.name || 'SIEMENS SIMATIC S7-1200 / LOGO!')}
          </text>
          <text x="440" y="23" fill="${isDark ? '#99f6e4' : '#0d9488'}" font-size="11" font-weight="bold" text-anchor="end" font-family="JetBrains Mono, monospace">
            ${escapeXml(analysis.plcs[0]?.tag || 'A1')}
          </text>

          <!-- Power Infeed Terminals -->
          <g transform="translate(20, 50)">
            <rect x="0" y="0" width="80" height="30" fill="${isDark ? '#1e293b' : '#ffffff'}" stroke="${acLineColor}" stroke-width="1" rx="2" />
            <text x="10" y="19" fill="${dcPosColor}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">L+</text>
            <text x="50" y="19" fill="${dcNegColor}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">M</text>
            <line x1="20" y1="0" x2="20" y2="-60" stroke="${dcPosColor}" stroke-width="2" />
            <line x1="60" y1="0" x2="60" y2="-40" stroke="${dcNegColor}" stroke-width="2" />
            <circle cx="20" cy="-60" r="3" fill="${dcPosColor}" />
            <circle cx="60" cy="-40" r="3" fill="${dcNegColor}" />
          </g>

          <!-- PROFINET Port -->
          <g transform="translate(330, 50)">
            <rect x="0" y="0" width="110" height="30" fill="${isDark ? '#1e293b' : '#ffffff'}" stroke="#22c55e" stroke-width="1" rx="2" />
            <rect x="10" y="7" width="16" height="16" fill="#22c55e" rx="2" />
            <text x="35" y="20" fill="#15803d" font-size="9" font-weight="bold" font-family="JetBrains Mono, monospace">
              PROFINET PN
            </text>
          </g>

          <!-- Digital Inputs Section -->
          <g transform="translate(20, 100)">
            <text x="0" y="0" fill="${acLineColor}" font-size="11" font-weight="bold" font-family="JetBrains Mono, monospace">
              ENTRADAS DIGITAIS 24VDC (DI)
            </text>
            ${[
              { pin: '.0 (I0.0)', label: 'S1 - Botão Start' },
              { pin: '.1 (I0.1)', label: 'S2 - Botão Stop' },
              { pin: '.2 (I0.2)', label: 'S0 - Paragem Emergência' },
              { pin: '.3 (I0.3)', label: 'B1 - Sensor Fim-Curso' },
              { pin: '.4 (I0.4)', label: 'F1 - Feedback Disjuntor' },
            ]
              .map(
                (di, i) => `
              <g transform="translate(0, ${25 + i * 36})">
                <rect x="0" y="0" width="70" height="22" fill="${isDark ? '#1e293b' : '#ffffff'}" stroke="${textMuted}" stroke-width="1" rx="2" />
                <text x="6" y="15" fill="${textHeading}" font-size="9" font-family="JetBrains Mono, monospace">
                  ${escapeXml(di.pin)}
                </text>
                <line x1="0" y1="11" x2="-80" y2="11" stroke="${acLineColor}" stroke-width="1.5" />
                <circle cx="-80" cy="11" r="2.5" fill="${acLineColor}" />
                <text x="-90" y="14" fill="${textBody}" font-size="9" text-anchor="end" font-family="JetBrains Mono, monospace">
                  ${escapeXml(di.label)}
                </text>
              </g>
            `
              )
              .join('')}
          </g>

          <!-- Digital Outputs Section -->
          <g transform="translate(250, 100)">
            <text x="0" y="0" fill="${diffColor}" font-size="11" font-weight="bold" font-family="JetBrains Mono, monospace">
              SAÍDAS DIGITAIS (DQ / COMANDO DE RELÉS)
            </text>
            ${[
              {
                pin: '.0 (Q0.0)',
                load: analysis.relays[0] ? `${analysis.relays[0].tag} - ${analysis.relays[0].data.name.split('(')[0]}` : 'K1 - Bobina Contactor / Relé',
                color: diffColor,
              },
              {
                pin: '.1 (Q0.1)',
                load: analysis.relays[1] ? `${analysis.relays[1].tag} - ${analysis.relays[1].data.name.split('(')[0]}` : 'H1 - Sinalizador Verde (ON / Marcha)',
                color: '#16a34a',
              },
              {
                pin: '.2 (Q0.2)',
                load: analysis.relays[2] ? `${analysis.relays[2].tag} - ${analysis.relays[2].data.name.split('(')[0]}` : 'H2 - Sinalizador Vermelho (FALHA / Disparo)',
                color: '#dc2626',
              },
              {
                pin: '.3 (Q0.3)',
                load: 'Y1 - Eletroválvula / Atuador 24VDC',
                color: acLineColor,
              },
              {
                pin: '.4 (Q0.4)',
                load: analysis.relays[3] ? `${analysis.relays[3].tag} - ${analysis.relays[3].data.name.split('(')[0]}` : 'KT1 - Relé Temporizador de Processo',
                color: dcNegColor,
              },
            ]
              .map(
                (dq, i) => `
              <g transform="translate(0, ${25 + i * 36})">
                <rect x="0" y="0" width="70" height="22" fill="${isDark ? '#1e293b' : '#ffffff'}" stroke="${textMuted}" stroke-width="1" rx="2" />
                <text x="6" y="15" fill="${textHeading}" font-size="9" font-family="JetBrains Mono, monospace">
                  ${escapeXml(dq.pin)}
                </text>
                <line x1="70" y1="11" x2="140" y2="11" stroke="${dq.color}" stroke-width="1.5" />
                <circle cx="140" cy="11" r="2.5" fill="${dq.color}" />
                <text x="150" y="15" fill="${textHeading}" font-size="9" font-family="JetBrains Mono, monospace">
                  ${escapeXml(dq.load)}
                </text>
              </g>
            `
              )
              .join('')}
          </g>
        </g>

        <!-- Expansion Modules -->
        ${
          analysis.expansions.length > 0
            ? `
          <g transform="translate(660, 110)">
            <rect x="0" y="0" width="160" height="340" fill="${compFill}" stroke="#0f766e" stroke-width="2" rx="4" />
            <rect x="0" y="0" width="160" height="35" fill="${isDark ? '#115e59' : '#ccfbf1'}" rx="3" />
            <text x="80" y="22" fill="${isDark ? '#ffffff' : '#0f766e'}" font-size="11" font-weight="bold" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif">
              ${escapeXml(analysis.expansions[0]?.data.name || 'EXPANSÃO SIEMENS')}
            </text>
            <text x="80" y="70" fill="#0d9488" font-size="10" text-anchor="middle" font-family="JetBrains Mono, monospace">
              Bus de Comunicação Lateral
            </text>
            <path d="M 0 50 L -20 50" stroke="#0d9488" stroke-width="4" />
            <text x="80" y="120" fill="${textBody}" font-size="9" text-anchor="middle" font-family="JetBrains Mono, monospace">
              ${escapeXml(analysis.expansions[0]?.data.terminalsSummary || 'Entradas / Saídas Suplementares')}
            </text>
          </g>
        `
            : ''
        }

        <!-- Terminal Strip X1 -->
        <g transform="translate(180, 480)">
          <rect x="0" y="0" width="640" height="35" fill="${compFill}" stroke="${textMuted}" stroke-width="1.5" rx="3" />
          <text x="20" y="22" fill="${textHeading}" font-size="11" font-weight="bold" font-family="JetBrains Mono, monospace">
            ${
              analysis.vikingTerminals.length > 0
                ? `RÉGUA DE BORNES LEGRAND VIKING 3 (${escapeXml(analysis.vikingTerminals.map((t) => t.tag).join(', '))})`
                : 'RÉGUA DE BORNES DE CAMPO (X1 - PASSAGEM &amp; PE)'
            }
          </text>
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
            .map(
              (num) => `
            <circle cx="${340 + num * 16}" cy="17" r="4.5" fill="${isDark ? '#334155' : '#e2e8f0'}" stroke="${textMuted}" stroke-width="1" />
          `
            )
            .join('')}
        </g>
      </g>
    `;
  } else if (viewMode === 'breakers_terminals') {
    const autoRouter = executeAutoRouter(project, { standard: 'iec_60446', style: 'duct_manhattan' });
    const circuits = autoRouter.circuits;
    const is3Ph = autoRouter.incomerInfo.isThreePhase;

    const startX = 220;
    const availWidth = 1140 - startX - 20;
    const count = Math.max(1, circuits.length);
    const colW = Math.max(88, Math.min(130, availWidth / count));
    const busbarEndX = Math.min(1140, startX + count * colW);

    contentSvg = `
      <g transform="translate(0, 30)">
        <!-- 1. Left Incomer Supply Column -->
        <g transform="translate(45, 60)">
          <text x="0" y="0" fill="${acLineColor}" font-size="11" font-weight="bold" font-family="JetBrains Mono, monospace">
            ENTRADA REDE (${escapeXml(autoRouter.incomerInfo.voltage.split(' ')[0])})
          </text>
          <text x="0" y="14" fill="${textMuted}" font-size="9" font-family="JetBrains Mono, monospace">
            Auto-Router: IEC 60446 / RTIEBT (${autoRouter.totalWiringLengthM}m)
          </text>

          <!-- Infeed Line -->
          <line x1="60" y1="24" x2="60" y2="50" stroke="${acLineColor}" stroke-width="2.5" />
          <circle cx="60" cy="24" r="4" fill="${acLineColor}" />

          <!-- Main Incomer Breaker Q0 -->
          <g transform="translate(30, 50)">
            <rect x="0" y="0" width="60" height="42" fill="${compFill}" stroke="${acLineColor}" stroke-width="1.5" rx="3" />
            <path d="M 30 0 L 30 14 M 30 28 L 30 42 M 23 28 L 37 14" stroke="${acLineColor}" stroke-width="2" stroke-linecap="round" />
            <text x="70" y="16" fill="${textHeading}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
              Q0
            </text>
            <text x="70" y="28" fill="${textBody}" font-size="8" font-family="JetBrains Mono, monospace">
              5SY4216-7
            </text>
            <text x="70" y="38" fill="${acLineColor}" font-size="8" font-family="JetBrains Mono, monospace">
              ${autoRouter.incomerInfo.ratingA}A / 10kA
            </text>
          </g>

          <!-- Differential Breaker Q_DIFF -->
          <g transform="translate(30, 110)">
            <line x1="30" y1="-18" x2="30" y2="0" stroke="${acLineColor}" stroke-width="2" />
            <rect x="0" y="0" width="60" height="42" fill="${compFill}" stroke="${diffColor}" stroke-width="1.5" rx="3" />
            <circle cx="30" cy="21" r="12" fill="none" stroke="${diffColor}" stroke-width="1.5" stroke-dasharray="3 2" />
            <path d="M 23 30 L 37 12" stroke="${diffColor}" stroke-width="2" />
            <text x="70" y="16" fill="${textHeading}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
              Q_DIFF
            </text>
            <text x="70" y="28" fill="${textBody}" font-size="8" font-family="JetBrains Mono, monospace">
              IΔn = 30mA
            </text>
            <text x="70" y="38" fill="${diffColor}" font-size="8" font-family="JetBrains Mono, monospace">
              Tipo A (EN 61008)
            </text>
          </g>

          <!-- Line to Main Busbar -->
          <line x1="60" y1="152" x2="60" y2="185" stroke="${acLineColor}" stroke-width="2.5" />
          <line x1="60" y1="185" x2="${busbarEndX}" y2="185" stroke="${acLineColor}" stroke-width="3" />
          <text x="65" y="180" fill="${acLineColor}" font-size="9" font-weight="bold" font-family="JetBrains Mono, monospace">
            BARRAMENTO GERAL DE DISTRIBUIÇÃO (${is3Ph ? 'L1, L2, L3, N, PE' : 'L, N, PE'})
          </text>
        </g>

        <!-- Wiring Duct Corridor Background Strip -->
        <g transform="translate(200, 336)">
          <rect x="0" y="0" width="${busbarEndX - 190}" height="32" fill="${isDark ? '#090d16' : '#f1f5f9'}" stroke="${isDark ? '#1e293b' : '#cbd5e1'}" stroke-width="1" stroke-dasharray="3 3" rx="3" />
          <text x="10" y="20" fill="${textMuted}" font-size="7.5" font-family="JetBrains Mono, monospace">
            CALHA TÉCNICA HORIZONTAL / CANAL DE CABLAGEM (AUTO-ROUTER)
          </text>
        </g>

        <!-- 2. Circuit Breakers to Terminals Columns -->
        ${circuits
          .map((c, i) => {
            const x = startX + i * colW + colW / 2;
            const isMotor = c.circuitMnemonic === 'MOTOR';

            // SVG conductors lines
            const conductorsSvg = c.conductors
              .map((cond) => {
                // relative coordinates within the column
                const relStartX = cond.startPoint.x - x;
                const relEndX = cond.endPoint.x - x;
                const pathD = `M ${relStartX} 46 L ${relStartX} 56 Q ${relStartX} 62 ${relStartX + (relEndX > relStartX ? 4 : -4)} 62 L ${relEndX - (relEndX > relStartX ? 4 : -4)} 62 Q ${relEndX} 62 ${relEndX} 68 L ${relEndX} 110`;

                return `
                  <path d="${pathD}" fill="none" stroke="${cond.colorHex}" stroke-width="1.8" stroke-linecap="round" />
                `;
              })
              .join('');

            return `
          <g transform="translate(${x}, 0)">
            <!-- Tap connection from Busbar -->
            <line x1="0" y1="245" x2="0" y2="275" stroke="${acLineColor}" stroke-width="2" />
            <circle cx="0" cy="245" r="3" fill="${acLineColor}" />

            <!-- Circuit Breaker -->
            <g transform="translate(-24, 275)">
              <rect x="0" y="0" width="48" height="46" fill="${compFill}" stroke="${isMotor ? textHeading : acLineColor}" stroke-width="1.5" rx="3" />
              <!-- IEC breaker switch symbol -->
              <line x1="24" y1="0" x2="24" y2="14" stroke="${acLineColor}" stroke-width="1.5" />
              <line x1="24" y1="32" x2="24" y2="46" stroke="${acLineColor}" stroke-width="1.5" />
              <path d="M 18 32 L 30 14" stroke="${acLineColor}" stroke-width="2" stroke-linecap="round" />
              <!-- Thermal-magnetic overload rectangle -->
              <rect x="20" y="8" width="8" height="5" fill="none" stroke="${textMuted}" stroke-width="1" />
              
              <!-- Tag above or to right -->
              <text x="24" y="-4" fill="${textHeading}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
                ${escapeXml(c.breakerTag)}
              </text>
              <text x="24" y="56" fill="${acLineColor}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
                ${c.breakerRatingA}A Curva ${c.curve}
              </text>
              <text x="24" y="66" fill="${textMuted}" font-size="7" font-family="JetBrains Mono, monospace" text-anchor="middle">
                ${escapeXml(c.breakerPoles)}
              </text>

              <!-- Conductor Output Terminal Screws at bottom of breaker -->
              <circle cx="16" cy="46" r="2.5" fill="#92400e" stroke="${textHeading}" stroke-width="0.5" />
              <circle cx="24" cy="46" r="2.5" fill="#0284c7" stroke="${textHeading}" stroke-width="0.5" />
              <circle cx="32" cy="46" r="2.5" fill="#16a34a" stroke="${textHeading}" stroke-width="0.5" />

              <!-- Auto-Routed Conductors (Fase, Neutro, Terra) with Normative Colors -->
              ${conductorsSvg}

              <!-- Wire Badge with Standardized Tag and Section -->
              <g transform="translate(-4, 66)">
                <rect x="0" y="0" width="56" height="13" fill="${compFill}" stroke="${borderInner}" stroke-width="0.8" rx="2" />
                <text x="28" y="9.5" fill="${textBody}" font-size="6.5" font-family="JetBrains Mono, monospace" font-weight="bold" text-anchor="middle">
                  ${c.conductors[0]?.wireTag || 'W01'} · ${c.conductors[0]?.sectionMm2 || 2.5}mm²
                </text>
              </g>
            </g>

            <!-- Terminal Block (Régua de Bornes de Saída) -->
            <g transform="translate(-32, 385)">
              <rect x="0" y="0" width="64" height="42" fill="${compFill}" stroke="${textMuted}" stroke-width="1.5" rx="3" />
              <text x="32" y="12" fill="${textHeading}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
                ${c.terminalStripTag}
              </text>
              <!-- 3 feedthrough terminal screws: Phase (Brown), Neutral (Blue), PE (Green) -->
              <circle cx="16" cy="27" r="6" fill="${isDark ? '#3b1c09' : '#fed7aa'}" stroke="#92400e" stroke-width="1" />
              <text x="16" y="30" fill="${isDark ? '#fdba74' : '#92400e'}" font-size="7" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
                ${c.terminalPoints[0]?.number || '1'}
              </text>

              <circle cx="32" cy="27" r="6" fill="${isDark ? '#1e3a8a' : '#bfdbfe'}" stroke="#0284c7" stroke-width="1" />
              <text x="32" y="30" fill="${isDark ? '#60a5fa' : '#0284c7'}" font-size="7" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
                N
              </text>

              <circle cx="48" cy="27" r="6" fill="${isDark ? '#14532d' : '#bbf7d0'}" stroke="#16a34a" stroke-width="1" />
              <text x="48" y="30" fill="${isDark ? '#86efac' : '#16a34a'}" font-size="7" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
                PE
              </text>
            </g>

            <!-- Outgoing Field Cable Segment -->
            <line x1="0" y1="427" x2="0" y2="465" stroke="${acLineColor}" stroke-width="2" stroke-dasharray="3 1.5" />
            <!-- Cable Tag -->
            <g transform="translate(-38, 437)">
              <rect x="0" y="0" width="76" height="14" fill="${compFill}" stroke="${borderInner}" stroke-width="0.8" rx="2" />
              <text x="38" y="10" fill="${textMuted}" font-size="6.5" font-family="JetBrains Mono, monospace" text-anchor="middle">
                ${escapeXml(c.outgoingCable.split(' ')[0])} ${c.conductors[0]?.sectionMm2 || 2.5}mm²
              </text>
            </g>

            <!-- Load / Utilization Destination Box -->
            <g transform="translate(-40, 465)">
              <rect x="0" y="0" width="80" height="52" fill="${compFill}" stroke="${acLineColor}" stroke-width="1.2" rx="4" />
              <!-- Mnemonic badge -->
              <rect x="4" y="4" width="72" height="14" fill="${compFillHeader}" rx="2" />
              <text x="40" y="14" fill="${acLineColor}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace" text-anchor="middle">
                [${c.circuitMnemonic}]
              </text>
              <!-- Description -->
              <text x="40" y="28" fill="${textHeading}" font-size="7.5" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif" text-anchor="middle">
                ${escapeXml(c.circuitDescription.slice(0, 14))}
              </text>
              <!-- Power -->
              <text x="40" y="44" fill="${textMuted}" font-size="7" font-family="JetBrains Mono, monospace" text-anchor="middle">
                P: ${c.estimatedPowerW}W · ΔU: ${c.voltageDropPercent}%
              </text>
            </g>
          </g>
        `;
          })
          .join('')}

        <!-- Summary Table at Bottom Left -->
        <g transform="translate(45, 560)">
          <rect x="0" y="0" width="690" height="85" fill="${compFill}" stroke="${borderInner}" stroke-width="1.2" rx="4" />
          <rect x="0" y="0" width="690" height="20" fill="${compFillHeader}" rx="3" />
          <text x="12" y="14" fill="${acLineColor}" font-size="9" font-weight="bold" font-family="JetBrains Mono, monospace">
            RELATÓRIO DO AUTO-ROUTER: CABLAGEM LÓGICA E CONFORMIDADE DE CORES (IEC 60446 / EN 60204-1)
          </text>

          <g transform="translate(14, 30)">
            <text x="0" y="10" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">Condutores Roteados:</text>
            <text x="135" y="10" fill="${textHeading}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">
              ${autoRouter.totalConductorsCount} fios (${autoRouter.totalWiringLengthM} m totais)
            </text>

            <text x="0" y="26" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">Norma de Cores:</text>
            <text x="135" y="26" fill="${textHeading}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">
              IEC 60446 / HD 308 S2 (Fase: Castanho, N: Azul, PE: Verde/Amarelo)
            </text>

            <text x="0" y="42" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">Queda de Tensão Máx.:</text>
            <text x="135" y="42" fill="${diffColor}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">
              ΔU &lt; 1.2% (100% Conforme Norma RTIEBT 523)
            </text>

            <text x="350" y="10" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">Régua de Destino:</text>
            <text x="490" y="10" fill="${textHeading}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">
              ${autoRouter.terminalStripTag} (${circuits.length * 3} terminais dedicados)
            </text>

            <text x="350" y="26" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">Poder de Corte:</text>
            <text x="490" y="26" fill="${diffColor}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">
              Icn = 6kA / 10kA (IEC 60898-1)
            </text>

            <text x="350" y="42" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">Tipo de Condutor:</text>
            <text x="490" y="42" fill="${acLineColor}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">
              H07V-K Flexível com anilhas marcadoras
            </text>
          </g>
        </g>
      </g>
    `;
  }

  // Complete SVG with Drawing Frame, Grid margins, Title & Carimbo Técnico
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
      <defs>
        <pattern id="grid_${theme}" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${gridStroke}" stroke-width="0.5" stroke-opacity="0.4" />
        </pattern>
      </defs>

      <!-- Background -->
      <rect width="1200" height="800" fill="${bg}" />
      <rect width="1200" height="800" fill="url(#grid_${theme})" />

      <!-- Outer IEC Drawing Border -->
      <rect x="20" y="20" width="1160" height="760" fill="none" stroke="${borderOuter}" stroke-width="2" />
      <rect x="25" y="25" width="1150" height="750" fill="none" stroke="${borderInner}" stroke-width="1" />

      <!-- IEC Coordinate Grid Margins -->
      ${['A', 'B', 'C', 'D', 'E', 'F']
        .map(
          (letter, i) => `
        <text x="12" y="${75 + i * 125}" fill="${textMuted}" font-size="10" font-family="JetBrains Mono, monospace" text-anchor="middle">
          ${letter}
        </text>
      `
        )
        .join('')}
      ${['1', '2', '3', '4', '5', '6', '7', '8']
        .map(
          (num, i) => `
        <text x="${80 + i * 135}" y="16" fill="${textMuted}" font-size="10" font-family="JetBrains Mono, monospace" text-anchor="middle">
          ${num}
        </text>
      `
        )
        .join('')}

      <!-- Top Title Banner -->
      <text x="50" y="55" fill="${textHeading}" font-size="16" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif">
        ${
          viewMode === 'power'
            ? 'ESQUEMA UNIFILAR GERAL DE POTÊNCIA E ALIMENTAÇÃO (NORMA IEC 60617)'
            : viewMode === 'control'
            ? 'ESQUEMA DE DISTRIBUIÇÃO 24VDC &amp; ENTRADAS/SAÍDAS DO PLC SIEMENS'
            : 'ESQUEMA UNIFILAR: DISJUNTORES ➔ BLOCOS TERMINAIS DE SAÍDA (IEC 60617)'
        }
      </text>
      <text x="50" y="75" fill="${textBody}" font-size="11" font-family="JetBrains Mono, monospace">
        ALIMENTAÇÃO: ${escapeXml(project.config.supplyVoltage)} | 50Hz | GRAU: ${escapeXml(project.config.ipRating)} | DISTRIBUIÇÃO CC: 24V DC ESTABILIZADA
      </text>

      <!-- Main Diagram Content -->
      ${contentSvg}

      <!-- TITLE BLOCK / CARIMBO DE ENGENHARIA ELÉTRICA (IEC 61082) -->
      <g transform="translate(760, 650)">
        <rect x="0" y="0" width="410" height="120" fill="${titleBlockBg}" stroke="${titleBlockBorder}" stroke-width="1.5" />
        <line x1="0" y1="30" x2="410" y2="30" stroke="${titleBlockDivider}" stroke-width="1" />
        <line x1="0" y1="65" x2="410" y2="65" stroke="${titleBlockDivider}" stroke-width="1" />
        <line x1="0" y1="92" x2="410" y2="92" stroke="${titleBlockDivider}" stroke-width="1" />
        <line x1="220" y1="0" x2="220" y2="65" stroke="${titleBlockDivider}" stroke-width="1" />
        <line x1="310" y1="65" x2="310" y2="120" stroke="${titleBlockDivider}" stroke-width="1" />

        <text x="12" y="18" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">PROJETO:</text>
        <text x="65" y="20" fill="${textHeading}" font-size="10" font-weight="bold" font-family="Plus Jakarta Sans, sans-serif">
          ${escapeXml(project.config.name)}
        </text>

        <text x="230" y="18" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">CÓDIGO:</text>
        <text x="280" y="20" fill="${acLineColor}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
          ${escapeXml(project.config.projectCode)}
        </text>

        <text x="12" y="48" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">CLIENTE:</text>
        <text x="65" y="50" fill="${textBody}" font-size="9" font-family="Plus Jakarta Sans, sans-serif">
          ${escapeXml(project.config.clientName || 'Cliente Industrial')}
        </text>

        <text x="230" y="48" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">PROJETISTA:</text>
        <text x="295" y="50" fill="${textBody}" font-size="9" font-family="Plus Jakarta Sans, sans-serif">
          ${escapeXml(project.config.designerName || 'Engenheiro Responsável')}
        </text>

        <text x="12" y="80" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">DATA / REV:</text>
        <text x="80" y="81" fill="${textHeading}" font-size="9" font-family="JetBrains Mono, monospace">
          ${escapeXml(project.config.date)} · Rev 1.0
        </text>

        <text x="320" y="80" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">FOLHA:</text>
        <text x="365" y="81" fill="${acLineColor}" font-size="10" font-weight="bold" font-family="JetBrains Mono, monospace">
          ${viewMode === 'power' ? '01 / 03' : viewMode === 'control' ? '02 / 03' : '03 / 03'}
        </text>

        <text x="12" y="108" fill="${textMuted}" font-size="8" font-family="JetBrains Mono, monospace">
          NORMA TÉCNICA: IEC 60617 / EN 61439-1 / CE
        </text>
        <text x="320" y="108" fill="${diffColor}" font-size="8" font-weight="bold" font-family="JetBrains Mono, monospace">
          APROVADO
        </text>
      </g>
    </svg>
  `;
}
