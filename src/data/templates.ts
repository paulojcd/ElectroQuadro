import { ProjectState, PlacedComponent, ElectricalComponent } from '../types/electrical';
import { COMPONENT_CATALOG } from './componentLibrary';
import { getDefaultGlands } from '../utils/glandUtils';

function findCatalogItem(id: string) {
  const item = COMPONENT_CATALOG.find((c) => c.catalogId === id);
  if (!item) throw new Error(`Catalog item ${id} not found`);
  return item;
}

function createPlaced(
  catalogId: string,
  tag: string,
  railIndex: number,
  positionMm: number
): PlacedComponent {
  const catalog = findCatalogItem(catalogId);
  const data: ElectricalComponent = {
    ...catalog,
    id: `${tag}-${Math.random().toString(36).substring(2, 7)}`,
    tag,
  };

  return {
    instanceId: data.id,
    catalogId,
    tag,
    railIndex,
    positionMm,
    data,
  };
}

export const TEMPLATES: { id: string; name: string; description: string; state: ProjectState }[] = [
  {
    id: 's7-1200-ndr120',
    name: 'Quadro Automação Siemens S7-1200 + Mean Well NDR-120',
    description: 'Solução industrial completa de 230VAC para automação fabril com PLC S7-1214C, fonte Mean Well 5A, proteções modulares e réguas de bornes.',
    state: {
      config: {
        name: 'Quadro de Automação Fabril - Linha 1',
        projectCode: 'PRJ-S712-01',
        clientName: 'Indústria Metalomecânica Lda',
        designerName: 'Eng. Eletrotécnico',
        date: new Date().toISOString().split('T')[0],
        supplyVoltage: '230V AC (1F+N+PE)',
        frequencyHz: 50,
        ipRating: 'IP65',
        widthMm: 600,
        heightMm: 800,
        depthMm: 250,
        sideDuctWidthMm: 40,
        horizontalDuctHeightMm: 40,
        railSpacingMm: 160,
        railCount: 3,
        notes: `1. CONFORMIDADE NORMATIVA & MARCAÇÃO CE:
• Quadro elétrico concebido e montado de acordo com as normas europeias EN 61439-1 e EN 61439-2.
• Tensão nominal de isolamento Ui = 500V AC. Grau de proteção IP65 (IEC 60529).

2. INSTRUÇÕES DE MONTAGEM & CABLAGEM:
• Cabos flexíveis H07V-K com ponteiras cravadas sob pressão.
• Segregação física entre calhas de potência AC e calhas de comando 24VDC/sinais analógicos.
• Binários de aperto verificados: disjuntores 2.5 N·m; bornes 0.8 N·m.

3. PROTOCOLO DE ENSAIOS FINAIS:
• [X] Continuidade do circuito de proteção PE (R < 0.1 Ω).
• [X] Resistência de isolamento a 500V DC (R > 100 MΩ).
• [X] Teste funcional da fonte Mean Well NDR-120 (24.0V DC estável sob carga).
• [X] Verificação de paragem de emergência e relé de segurança.

4. SEGURANÇA:
• ⚠️ ATENÇÃO: Desligar disjuntor geral antes de qualquer intervenção mecânica ou elétrica.`,
      },
      rails: [
        {
          id: 'rail-0',
          index: 0,
          name: 'Calha 1 - Alimentação Primária & 24VDC',
          usableWidthMm: 480,
          yPositionMm: 120,
          items: [
            createPlaced('sie-mcb-2p-16a-c', 'Q0', 0, 10),
            createPlaced('sie-rccb-2p-25a-30ma', 'Q_DIFF', 0, 50),
            createPlaced('sie-spd-1pn-t2', 'SPD1', 0, 90),
            createPlaced('sie-mcb-1pn-6a-c-psu', 'Q1', 0, 130),
            createPlaced('mw-ndr-120-24', 'G1', 0, 155),
            createPlaced('sie-mcb-1p-4a-dc', 'F1', 0, 205),
            createPlaced('sch-socket-din-230v', 'XS1', 0, 230),
          ],
        },
        {
          id: 'rail-1',
          index: 1,
          name: 'Calha 2 - Automação & Comunicações (Siemens)',
          usableWidthMm: 480,
          yPositionMm: 280,
          items: [
            createPlaced('sie-s7-1214c-dc', 'A1', 1, 10),
            createPlaced('sie-s7-sm1221-di8', 'SM1', 1, 125),
            createPlaced('sie-s7-sm1222-dq8-rly', 'SM2', 1, 175),
            createPlaced('sie-csm-1277', 'NET1', 1, 225),
            createPlaced('fin-relay-39-24vdc', 'K1', 1, 275),
            createPlaced('fin-relay-40-socket-24vdc', 'K2', 1, 285),
            createPlaced('fin-timer-80-multivolt', 'KT1', 1, 305),
          ],
        },
        {
          id: 'rail-2',
          index: 2,
          name: 'Calha 3 - Força, Bornes Viking 3 & Distribuição',
          usableWidthMm: 480,
          yPositionMm: 440,
          items: [
            createPlaced('sie-cont-3rt2-9a-24vdc', 'K10', 2, 10),
            createPlaced('weid-dist-24v-block', 'XD1', 2, 65),
            createPlaced('leg-viking-pas-2.5', 'X1', 2, 110),
            createPlaced('leg-viking-neutro-2.5', 'XN1', 2, 165),
            createPlaced('leg-viking-terra-2.5', 'XPE1', 2, 220),
            createPlaced('leg-viking-secc-fusivel', 'XF1', 2, 250),
          ],
        },
      ],
      glands: getDefaultGlands(600, false),
    },
  },
  {
    id: 'logo-hdr60-pumping',
    name: 'Quadro Bombagem / AVAC com Siemens LOGO! 8 + Mean Well HDR-60',
    description: 'Quadro compacto para controlo de 2 bombas com Siemens LOGO! 24RCE, fonte modular compacta Mean Well HDR-60, disjuntores-motor Sirius e contactores.',
    state: {
      config: {
        name: 'Quadro de Bombagem e Pressurização',
        projectCode: 'BOMB-AVAC-02',
        clientName: 'Edifício Residencial Horizonte',
        designerName: 'Projetista Instalações',
        date: new Date().toISOString().split('T')[0],
        supplyVoltage: '400V AC (3F+N+PE)',
        frequencyHz: 50,
        ipRating: 'IP55',
        widthMm: 500,
        heightMm: 700,
        depthMm: 200,
        sideDuctWidthMm: 40,
        horizontalDuctHeightMm: 40,
        railSpacingMm: 160,
        railCount: 3,
      },
      rails: [
        {
          id: 'rail-0',
          index: 0,
          name: 'Calha 1 - Corte Geral & Fonte Mean Well',
          usableWidthMm: 390,
          yPositionMm: 110,
          items: [
            createPlaced('sie-mcb-4p-32a-c', 'QM0', 0, 10),
            createPlaced('sie-rccb-4p-40a-30ma', 'Q_DIFF', 0, 85),
            createPlaced('sie-mcb-1pn-2a-c-psu', 'Q1', 0, 160),
            createPlaced('mw-hdr-60-24', 'G1', 0, 185),
            createPlaced('sie-mcb-1p-4a-dc', 'F1', 0, 245),
          ],
        },
        {
          id: 'rail-1',
          index: 1,
          name: 'Calha 2 - Controlador Siemens LOGO! 8',
          usableWidthMm: 390,
          yPositionMm: 270,
          items: [
            createPlaced('sie-logo-24rce', 'PLC1', 1, 10),
            createPlaced('sie-logo-dm8-24r', 'EX1', 1, 85),
            createPlaced('weid-dist-24v-block', 'XD1', 1, 125),
          ],
        },
        {
          id: 'rail-2',
          index: 2,
          name: 'Calha 3 - Arrancadores Motores & Bornes',
          usableWidthMm: 390,
          yPositionMm: 430,
          items: [
            createPlaced('sie-mms-3rv2-4a', 'QM1', 2, 10),
            createPlaced('sie-cont-3rt2-9a-24vdc', 'K1', 2, 60),
            createPlaced('sie-mms-3rv2-4a', 'QM2', 2, 110),
            createPlaced('sie-cont-3rt2-9a-24vdc', 'K2', 2, 160),
            createPlaced('leg-viking-pas-4', 'X1', 2, 215),
            createPlaced('leg-viking-terra-2.5', 'XPE1', 2, 280),
          ],
        },
      ],
      glands: getDefaultGlands(500, true),
    },
  },
  {
    id: 's7-1500-heavy-sdr240',
    name: 'Quadro Máquina Industrial Siemens S7-1500 + Mean Well SDR-240',
    description: 'Quadro de alta cadência com S7-1500, relé de paragem de emergência Sirius 3SK1, fonte Mean Well SDR-240 de 10A com pico 150% e múltiplos módulos de I/O.',
    state: {
      config: {
        name: 'Quadro Controlo de Célula Robótica / CNC',
        projectCode: 'ROB-1500-03',
        clientName: 'Automotive Components SA',
        designerName: 'Automação & Segurança',
        date: new Date().toISOString().split('T')[0],
        supplyVoltage: '400V AC (3F+N+PE)',
        frequencyHz: 50,
        ipRating: 'IP66',
        widthMm: 800,
        heightMm: 1000,
        depthMm: 300,
        sideDuctWidthMm: 50,
        horizontalDuctHeightMm: 40,
        railSpacingMm: 180,
        railCount: 4,
      },
      rails: [
        {
          id: 'rail-0',
          index: 0,
          name: 'Calha 1 - Alimentação Primária & Segurança',
          usableWidthMm: 660,
          yPositionMm: 120,
          items: [
            createPlaced('sie-mcb-4p-32a-c', 'QM0', 0, 10),
            createPlaced('sie-rccb-4p-40a-30ma', 'Q_DIFF', 0, 85),
            createPlaced('sie-spd-1pn-t2', 'SPD1', 0, 160),
            createPlaced('sie-mcb-1pn-6a-c-psu', 'Q1', 0, 200),
            createPlaced('mw-sdr-120-24', 'G1', 0, 225),
            createPlaced('sie-mcb-1p-10a-dc', 'F1', 0, 275),
            createPlaced('sie-safety-3sk1', 'KS1', 0, 300),
            createPlaced('sch-socket-din-230v', 'XS1', 0, 330),
          ],
        },
        {
          id: 'rail-1',
          index: 1,
          name: 'Calha 2 - Siemens SIMATIC S7-1500',
          usableWidthMm: 660,
          yPositionMm: 300,
          items: [
            createPlaced('sie-s7-1511-pn', 'PLC1', 1, 20),
            createPlaced('sie-s7-1500-di16', 'SM1', 1, 60),
            createPlaced('sie-s7-1500-di16', 'SM2', 1, 90),
            createPlaced('sie-s7-1500-dq16', 'SM3', 1, 120),
            createPlaced('fin-relay-39-24vdc', 'K1', 1, 160),
            createPlaced('fin-relay-39-24vdc', 'K2', 1, 168),
            createPlaced('fin-relay-39-24vdc', 'K3', 1, 176),
            createPlaced('fin-relay-39-24vdc', 'K4', 1, 184),
          ],
        },
        {
          id: 'rail-2',
          index: 2,
          name: 'Calha 3 - Comutação de Potência',
          usableWidthMm: 660,
          yPositionMm: 480,
          items: [
            createPlaced('sie-mms-3rv2-10a', 'QM1', 2, 20),
            createPlaced('sie-cont-3rt2-9a-24vdc', 'K10', 2, 75),
            createPlaced('sie-mms-3rv2-4a', 'QM2', 2, 130),
            createPlaced('sie-cont-3rt2-9a-24vdc', 'K11', 2, 185),
          ],
        },
        {
          id: 'rail-3',
          index: 3,
          name: 'Calha 4 - Barramentos & Bornes de Campo',
          usableWidthMm: 660,
          yPositionMm: 660,
          items: [
            createPlaced('weid-dist-24v-block', 'XD1', 3, 20),
            createPlaced('weid-wdu-block-10', 'X1', 3, 70),
            createPlaced('weid-wdu-block-10', 'X2', 3, 130),
            createPlaced('weid-pe-block-5', 'XPE1', 3, 195),
          ],
        },
      ],
      glands: getDefaultGlands(800, true),
    },
  },
  {
    id: 'custom-blank',
    name: 'Quadro em Branco (Personalizado)',
    description: 'Inicie um quadro limpo configurável para desenhar as suas próprias calhas e componentes.',
    state: {
      config: {
        name: 'Novo Quadro Elétrico',
        projectCode: 'PRJ-NOVO-01',
        clientName: 'Cliente Industrial',
        designerName: 'Eng. Projetista',
        date: new Date().toISOString().split('T')[0],
        supplyVoltage: '230V AC (1F+N+PE)',
        frequencyHz: 50,
        ipRating: 'IP65',
        widthMm: 600,
        heightMm: 800,
        depthMm: 250,
        sideDuctWidthMm: 40,
        horizontalDuctHeightMm: 40,
        railSpacingMm: 160,
        railCount: 3,
      },
      rails: [
        {
          id: 'rail-0',
          index: 0,
          name: 'Calha 1 - Superior',
          usableWidthMm: 480,
          yPositionMm: 120,
          items: [],
        },
        {
          id: 'rail-1',
          index: 1,
          name: 'Calha 2 - Intermédia',
          usableWidthMm: 480,
          yPositionMm: 280,
          items: [],
        },
        {
          id: 'rail-2',
          index: 2,
          name: 'Calha 3 - Inferior',
          usableWidthMm: 480,
          yPositionMm: 440,
          items: [],
        },
      ],
      glands: getDefaultGlands(600, false),
    },
  },
  {
    id: 'quadro-residencial-t2-t3',
    name: 'Quadro Residencial T2 / T3 (Monofásico 230V - RTIEBT)',
    description: 'Quadro de distribuição de habitação segundo as Regras Técnicas RTIEBT e EN 61439-3. Corte geral 40A, DPS Tipo 2, diferencial 40A 30mA Tipo A, placa vitrocerâmica (32A), forno, máquinas, tomadas e iluminação.',
    state: {
      config: {
        name: 'Quadro de Distribuição Residencial - Apartamento T3',
        projectCode: 'QD-HAB-01',
        clientName: 'Instalação Residencial T3',
        designerName: 'Técnico Instalador Credenciado',
        date: new Date().toISOString().split('T')[0],
        supplyVoltage: '230V AC (1F+N+PE)',
        frequencyHz: 50,
        ipRating: 'IP40',
        applicationType: 'residential',
        widthMm: 450,
        heightMm: 600,
        depthMm: 140,
        sideDuctWidthMm: 30,
        horizontalDuctHeightMm: 30,
        railSpacingMm: 140,
        railCount: 3,
        notes: `1. CONFORMIDADE NORMATIVA (RTIEBT & EN 61439-3):
• Quadro elétrico de distribuição para habitação concebido de acordo com as Regras Técnicas das Instalações Elétricas de Baixa Tensão (Portaria n.º 949-A/2006).
• Grau de proteção frontal IP40 (instalação interior saliente/encastrada).

2. PROTEÇÃO DE PESSOAS & SOBRETENSÕES:
• Proteção diferencial geral de alta sensibilidade (30mA Tipo A) conforme RTIEBT Secção 412.5.
• Descarregador de sobretensões transitórias (DPS Classe II) instalado à entrada do quadro (RTIEBT Secção 534).

3. DIMENSIONAMENTO DE CONDUTORES (RTIEBT):
• Iluminação: Disjuntores 10A com condutor H07V-K de 1.5 mm².
• Tomadas de uso geral e cozinha: Disjuntores 16A com condutor de 2.5 mm².
• Forno elétrico: Disjuntor 20A com condutor de 2.5 mm² ou 4.0 mm².
• Placa de indução / fogão: Disjuntor dedicado 32A com condutor de 6.0 mm² (obrigatório).

4. RESERVA DE ESPAÇO:
• Quadro com reserva de módulos livres superior a 20% para ampliações futuras (RTIEBT Secção 539.1).`,
      },
      rails: [
        {
          id: 'rail-res-0',
          index: 0,
          name: 'Calha 1 - Cabeceira (Corte Geral, DPS & Diferencial)',
          usableWidthMm: 360,
          yPositionMm: 100,
          items: [
            createPlaced('hgr-mcb-2p-40a-c-geral', 'Q0', 0, 10),
            createPlaced('hgr-spd-1pn-t2', 'DPS1', 0, 55),
            createPlaced('hgr-rccb-2p-40a-30ma-a', 'Q_DIFF1', 0, 100),
            createPlaced('leg-bell-modular-230v', 'HA1', 0, 150),
            createPlaced('gen-socket-schuko', 'XS1', 0, 180),
          ],
        },
        {
          id: 'rail-res-1',
          index: 1,
          name: 'Calha 2 - Iluminação & Tomadas Gerais',
          usableWidthMm: 360,
          yPositionMm: 240,
          items: [
            createPlaced('hgr-mcb-1pn-10a-c', 'Q1_ILUM', 1, 10),
            createPlaced('hgr-mcb-1pn-10a-c', 'Q2_ILUM', 1, 35),
            createPlaced('hgr-mcb-1pn-16a-c', 'Q3_TOM_SALA', 1, 60),
            createPlaced('hgr-mcb-1pn-16a-c', 'Q4_TOM_QUARTOS', 1, 85),
            createPlaced('hgr-mcb-1pn-16a-c', 'Q5_TOM_COZ', 1, 110),
            createPlaced('hgr-telerruptor-16a', 'TL1', 1, 140),
          ],
        },
        {
          id: 'rail-res-2',
          index: 2,
          name: 'Calha 3 - Eletrodomésticos & Alta Potência',
          usableWidthMm: 360,
          yPositionMm: 380,
          items: [
            createPlaced('hgr-mcb-1pn-32a-c', 'Q6_PLACA', 2, 10),
            createPlaced('hgr-mcb-1pn-20a-c', 'Q7_FORNO', 2, 35),
            createPlaced('hgr-mcb-1pn-16a-c-mlr', 'Q8_MLR', 2, 60),
            createPlaced('hgr-mcb-1pn-16a-c-mll', 'Q9_MLL', 2, 85),
            createPlaced('hgr-mcb-1pn-16a-c', 'Q10_TERMO', 2, 110),
            createPlaced('hgr-contactor-dia-noite', 'KM1_NOT', 2, 135),
          ],
        },
      ],
      glands: getDefaultGlands(450, false),
    },
  },
  {
    id: 'quadro-residencial-moradia-ev',
    name: 'Quadro Residencial Moradia c/ Wallbox EV & AVAC (RTIEBT)',
    description: 'Quadro completo para moradia unifamiliar com posto de carregamento de veículo elétrico (Wallbox EV com diferencial dedicado Tipo A-EV), climatização AVAC, bomba de calor e distribuição de tomadas e iluminação.',
    state: {
      config: {
        name: 'Quadro Geral de Moradia c/ Posto EV & Climatização',
        projectCode: 'QD-MORADIA-01',
        clientName: 'Moradia Unifamiliar',
        designerName: 'Técnico Instalador Credenciado',
        date: new Date().toISOString().split('T')[0],
        supplyVoltage: '230V AC (1F+N+PE)',
        frequencyHz: 50,
        ipRating: 'IP40',
        applicationType: 'residential',
        widthMm: 500,
        heightMm: 700,
        depthMm: 150,
        sideDuctWidthMm: 35,
        horizontalDuctHeightMm: 35,
        railSpacingMm: 150,
        railCount: 4,
        notes: `1. ESPECIFICAÇÃO TÉCNICA (RTIEBT & IEC 62955):
• Instalação residencial equipada com circuito dedicado para Carregamento de Veículo Elétrico (Wallbox até 7.4kW / 32A).
• Proteção diferencial dedicada Tipo A-EV com deteção de corrente de fuga contínua DC > 6mA (conforme IEC 62955).
• Descarregador de sobretensões DPS Classe II à entrada do quadro.
• Circuitos de climatização AVAC e Bomba de Calor protegidos individualmente.`,
      },
      rails: [
        {
          id: 'rail-mor-0',
          index: 0,
          name: 'Calha 1 - Corte Geral, DPS & Sub-medição',
          usableWidthMm: 410,
          yPositionMm: 90,
          items: [
            createPlaced('hgr-mcb-2p-40a-c-geral', 'Q0_GERAL', 0, 10),
            createPlaced('hgr-spd-1pn-t2', 'DPS1', 0, 55),
            createPlaced('fnd-energy-meter-din', 'PJ1_KWH', 0, 100),
            createPlaced('leg-bell-modular-230v', 'HA1', 0, 130),
            createPlaced('gen-socket-schuko', 'XS1', 0, 160),
          ],
        },
        {
          id: 'rail-mor-1',
          index: 1,
          name: 'Calha 2 - Diferencial Habitação & Iluminação / Tomadas',
          usableWidthMm: 410,
          yPositionMm: 230,
          items: [
            createPlaced('hgr-rccb-2p-40a-30ma-a', 'Q_DIFF1', 1, 10),
            createPlaced('hgr-mcb-1pn-10a-c', 'Q1_ILUM_P0', 1, 55),
            createPlaced('hgr-mcb-1pn-10a-c', 'Q2_ILUM_P1', 1, 80),
            createPlaced('hgr-mcb-1pn-16a-c', 'Q3_TOM_SALA', 1, 105),
            createPlaced('hgr-mcb-1pn-16a-c', 'Q4_TOM_QUARTOS', 1, 130),
            createPlaced('hgr-mcb-1pn-16a-c', 'Q5_TOM_EXT', 1, 155),
            createPlaced('hgr-minuteria-escada', 'KT_ESC', 1, 185),
          ],
        },
        {
          id: 'rail-mor-2',
          index: 2,
          name: 'Calha 3 - Cozinha & Eletrodomésticos',
          usableWidthMm: 410,
          yPositionMm: 370,
          items: [
            createPlaced('hgr-mcb-1pn-32a-c', 'Q6_PLACA', 2, 10),
            createPlaced('hgr-mcb-1pn-20a-c', 'Q7_FORNO', 2, 35),
            createPlaced('hgr-mcb-1pn-16a-c-mlr', 'Q8_MLR', 2, 60),
            createPlaced('hgr-mcb-1pn-16a-c-mll', 'Q9_MLL', 2, 85),
            createPlaced('hgr-mcb-1pn-16a-c', 'Q10_BOMBA_CALOR', 2, 110),
            createPlaced('hgr-rele-horario-semanal', 'KT_HORA', 2, 135),
          ],
        },
        {
          id: 'rail-mor-3',
          index: 3,
          name: 'Calha 4 - Carregamento Veículo Elétrico (Wallbox) & AVAC',
          usableWidthMm: 410,
          yPositionMm: 510,
          items: [
            createPlaced('sch-rccb-2p-40a-30ma-ev', 'Q_DIFF_EV', 3, 10),
            createPlaced('hgr-mcb-1pn-32a-c', 'Q_WALLBOX_EV', 3, 55),
            createPlaced('hgr-mcb-1pn-20a-c', 'Q_AVAC_SALA', 3, 80),
            createPlaced('hgr-mcb-1pn-16a-c', 'Q_AVAC_QUARTOS', 3, 105),
          ],
        },
      ],
      glands: getDefaultGlands(500, false),
    },
  },
];
