export type ComponentCategory = 
  | 'power_supply'        // Fontes de Alimentação DIN (Mean Well)
  | 'plc_cpu'             // PLCs / CPUs Siemens
  | 'plc_expansion'       // Módulos de Expansão Siemens (SM, DM, AM)
  | 'protection_ac'       // Disjuntores, Diferenciais AC
  | 'protection_dc'       // Disjuntores DC, Fusíveis 24V
  | 'relays'              // Relés de Interface, Industriais, Temporizados
  | 'motor_control'       // Disjuntores-motor, Contactores
  | 'safety_relays'       // Relés de Segurança, Paragem de Emergência
  | 'terminals'           // Réguas de Bornes (Viking 3 Legrand, Weidmüller)
  | 'residential_modular' // Aparelhagem Residencial Modular (Campainhas, Telerruptores, Minuterias, Relés Horários, Contactores Dia/Noite, Pentes)
  | 'accessories';        // Tomadas DIN, Descarregadores SPD

export interface ElectricalComponent {
  id: string; // unique instance id in project
  catalogId: string;
  tag: string; // e.g., G1, Q1, A1, K1, X1
  name: string;
  brand: string; // e.g. "Mean Well", "Siemens", "Legrand", "Genérico", "Hager", "ABB", "Chint", "Eaton", etc.
  partNumber: string;
  category: ComponentCategory;
  description: string;
  widthMm: number; // exact width in millimeters
  heightMm: number; // standard height in mm (e.g. 90mm for DIN)
  depthMm?: number; // depth in mm (e.g. 75mm, 115mm, 129mm)
  dinModules: number; // width in standard 18mm modules (approx)
  
  // Electrical ratings
  inputVoltage?: string; // e.g. "230V AC", "3x400V AC"
  outputVoltage?: string; // e.g. "24V DC"
  ratedCurrentA?: number; // e.g. 5.0 (for PSU) or 16.0 (for MCB)
  ratedPowerW?: number; // e.g. 120 (for PSU)
  poles?: string; // e.g. "1P", "1P+N", "2P", "3P", "3P+N", "4P"
  breakingCapacityKa?: number; // e.g. 6 or 10 kA (IEC 60898 / IEC 60947-2)
  curve?: string; // e.g. "B", "C", "D"
  
  // Consumption ratings (for sizing 24V DC balance)
  dcConsumptionA?: number; // e.g. 0.5A for PLC CPU + 24V loads
  dcConsumptionW?: number; // e.g. 12W
  
  // I/O & Terminal info (for schematic)
  terminalsSummary?: string;
  digitalInputs?: number;
  digitalOutputs?: number;
  analogInputs?: number;
  analogOutputs?: number;
  communication?: string; // e.g. "PROFINET", "Ethernet"

  // Pricing & metadata
  estimatedPriceEur: number;
  color?: string; // visual tint
  customNotes?: string;
}

export interface CatalogItem extends Omit<ElectricalComponent, 'id' | 'tag'> {
  tagPrefix: string; // e.g. 'G' for PSU, 'Q' for breaker, 'A' for PLC, 'K' for contactor
  series?: string; // e.g. "NDR", "S7-1200", "LOGO! 8"
}

export interface PlacedComponent {
  instanceId: string;
  catalogId: string;
  tag: string;
  railIndex: number; // 0, 1, 2, ...
  positionMm: number; // offset in mm from left of rail
  data: ElectricalComponent;
}

export interface DinRail {
  id: string;
  index: number;
  name: string;
  usableWidthMm: number;
  yPositionMm: number;
  items: PlacedComponent[];
}

export interface ProjectNotesConfig {
  generalNotes?: string;
  assemblyInstructions?: string; // Instruções de Montagem & Cablagem
  testingCommissioning?: string; // Ensaios & Comissionamento (Norma EN 61439)
  safetyWarnings?: string; // Advertências de Segurança & EPIs
  revisionHistory?: string; // Histórico de Revisões
}

export type InstallationEnvironment =
  | 'residential_indoor_dry'        // Habitação interior seco (quartos, salas, corredores)
  | 'residential_indoor_damp'       // Habitação zonas húmidas (caves, garagens, lavandarias, arrecadações)
  | 'residential_outdoor_sheltered' // Residencial exterior abrigado (alpendres, varandas cobertas)
  | 'residential_outdoor_exposed'   // Residencial exterior exposto (jardins, muros, postos EV desabrigados)
  | 'commercial_office'             // Escritórios, lojas, salas técnicas climatizadas
  | 'commercial_kitchen_wash'       // Cozinhas industriais, zonas de lavagem de loiça comercial
  | 'industrial_clean_control'      // Indústria ligeira / sala de controlo & autómatos
  | 'industrial_dusty_workshop'     // Oficinas, carpintarias, serralharias (pó, serradura, aparas)
  | 'industrial_heavy_washdown'     // Indústria alimentar, química, agro-pecuária (lavagem sob pressão)
  | 'outdoor_severe_industrial';    // Exterior industrial severo, zonas portuárias / costeiras

export type IkRating = 'IK02' | 'IK05' | 'IK07' | 'IK08' | 'IK09' | 'IK10';

export type EnclosureMaterial = 'sheet_steel' | 'stainless_steel' | 'polyester' | 'thermoplastic' | 'aluminium';

export interface EnclosureConfig {
  name: string;
  projectCode: string;
  clientName: string;
  designerName: string;
  date: string;
  supplyVoltage: '230V AC (1F+N+PE)' | '400V AC (3F+N+PE)';
  frequencyHz: number;
  ipRating: 'IP20' | 'IP30' | 'IP31' | 'IP40' | 'IP44' | 'IP54' | 'IP55' | 'IP65' | 'IP66' | 'IP67' | 'IP68';
  ikRating?: IkRating; // Grau de proteção contra impactos mecânicos externos (EN 62262)
  installationEnvironment?: InstallationEnvironment; // Ambiente de serviço / influências externas
  hasDoor?: boolean; // Se o invólucro possui porta frontal fechada (impacta grau IP efetivo)
  enclosureMaterial?: EnclosureMaterial; // Material de construção do armário
  applicationType?: 'residential' | 'automation' | 'commercial'; // 'residential' (RTIEBT / Habitação) vs 'automation' (EN 60204-1)
  widthMm: number; // e.g. 600
  heightMm: number; // e.g. 800
  depthMm: number; // e.g. 250
  sideDuctWidthMm: number; // e.g. 40
  horizontalDuctHeightMm: number; // e.g. 40
  railSpacingMm: number; // e.g. 150
  railCount: number;
  notes?: string; // Observações / Notas gerais do projeto
  projectNotes?: ProjectNotesConfig; // Notas técnicas estruturadas para o relatório
}

export type GlandMetric = 'M12' | 'M16' | 'M20' | 'M25' | 'M32' | 'M40' | 'M50';
export type GlandLocation = 'top' | 'bottom'; // Topo (Entrada de cabos) ou Fundo (Saída de cabos)
export type GlandCircuitType = 
  | 'power_in'       // Entrada de Alimentação Geral (AC / DC)
  | 'power_out'      // Saída de Força / Carga
  | 'motor'          // Saída para Motor (U, V, W, PE)
  | 'control'        // Comando e Automação
  | 'sensors'        // Sensores de Campo (Digitais / Analógicos)
  | 'network'        // PROFINET / Ethernet / Modbus
  | 'ground'         // Ligação à Terra Exterior
  | 'reserve';       // Bucim / Furo de Reserva com bujão cego

export interface CableGland {
  id: string;
  tag: string; // ex: "BG-IN-01", "BG-OUT-01"
  location: GlandLocation; // 'top' (entrada) | 'bottom' (saída)
  size: GlandMetric; // 'M12' | 'M16' | 'M20' | 'M25' | 'M32' | 'M40' | 'M50'
  xOffsetMm: number; // Distância X em mm a partir da margem esquerda do armário
  label: string; // ex: "Entrada Geral 230V AC", "Saída Motor Trifásico M1", "Cabo PROFINET"
  cableDiameterRangeMm: string; // ex: "9.0 - 17.0 mm"
  holeDiameterMm: number; // ex: 25.5 mm
  circuitType: GlandCircuitType;
  material?: 'polyamide' | 'brass_nickel' | 'stainless';
  estimatedPriceEur: number;
}

export type ControlPanelDeviceType = 
  | 'hmi'              // Ecrã Tátil HMI (Siemens, Weintek, Schneider)
  | 'pushbutton'       // Botão de Pressão 22mm (Arrancar, Parar, Reset)
  | 'emergency_stop'   // Paragem de Emergência Cogumelo 40mm com anel amarelo
  | 'selector'         // Seletor Rotativo 22mm (Man/Auto, 3 Posições, Chave)
  | 'pilot_light'      // Sinalizador LED 22mm (Verde, Vermelho, Branco, Âmbar)
  | 'meter'            // Instrumento Digital de Painel (Voltímetro, Multímetro 96x96 / 72x72)
  | 'buzzer';          // Sinalizador Acústico / Alarme Sonoro 22mm

export interface ControlPanelDevice {
  id: string;
  tag: string; // ex: "HMI1", "SB1", "SB2", "HL1", "HL2", "SA1", "PM1"
  name: string;
  type: ControlPanelDeviceType;
  xMm: number; // Coordenada X no painel a partir do canto superior esquerdo (mm)
  yMm: number; // Coordenada Y no painel a partir do canto superior esquerdo (mm)
  widthMm: number; // Largura do recorte ou do corpo (mm)
  heightMm: number; // Altura do recorte ou do corpo (mm)
  holeDiameterMm?: number; // Diâmetro de furação circular (ex: 22.5 mm)
  cutoutType: 'round' | 'rectangular';
  color?: string; // Cor do manipulador / lente (ex: 'green', 'red', 'yellow', 'blue', 'white', 'black')
  label?: string; // Gravação / Texto da plaqueta (ex: "ARRANQUE", "PARAGEM", "EMERGÊNCIA", "MAN / AUTO")
  voltage?: string; // ex: "24V DC", "230V AC"
  contactConfig?: string; // ex: "1NA", "1NF", "1NA+1NF", "2NF", "N/A"
  brand?: string;
  partNumber?: string;
  priceEur?: number;
}

export interface ControlPanelConfig {
  widthMm: number; // Largura da porta / painel frontal em mm
  heightMm: number; // Altura da porta / painel frontal em mm
  depthMm?: number; // Profundidade útil da porta em mm
  material: 'sheet_steel' | 'stainless_steel' | 'polyester' | 'aluminium';
  finishColor: 'ral_7035' | 'ral_7032' | 'stainless' | 'black';
  doorType: 'single' | 'double' | 'desk_console';
  hingeSide: 'left' | 'right';
  hasWindow?: boolean; // Visor em vidro temperado
  showDrillingGrid?: boolean; // Exibir grelha e linhas de cota
  devices: ControlPanelDevice[];
  notes?: string;
}

export interface LogicalContinuityIssue {
  id: string;
  componentId: string;
  componentTag: string;
  componentName: string;
  terminalId: string;
  terminalLabel: string;
  terminalType: 'input' | 'output' | 'power_in' | 'power_out' | 'ground' | 'signal';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  normativeRef: string; // ex: "IEC 60204-1 §7.2", "EN 61439-1 §8.5.2", "IEC 60898"
  suggestedRemedy: string;
  x?: number;
  y?: number;
  schematicTargetId?: string;
}

export interface LogicalContinuityReport {
  totalPinsAudited: number;
  connectedPinsCount: number;
  incompletePinsCount: number;
  continuityScorePercent: number; // ex: 92%
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  issues: LogicalContinuityIssue[];
  componentStats: Array<{
    tag: string;
    name: string;
    totalTerminals: number;
    connectedTerminals: number;
    openTerminals: number;
    status: 'complete' | 'partial' | 'unconnected';
  }>;
}

export interface ProjectState {
  config: EnclosureConfig;
  rails: DinRail[];
  glands?: CableGland[]; // Marcação dos bucins de saída e entrada
  wires?: WireConnection[]; // Ligações e cablagem do projeto (adicionadas manual ou automaticamente)
  controlPanel?: ControlPanelConfig; // Configuração e furação da porta/painel de controlo
}

export interface SavedProjectEntry {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  dimensions: { width: number; height: number; depth: number };
  railCount: number;
  componentCount: number;
  glandCount: number;
  state: ProjectState;
}

export interface PowerBalanceCalculation {
  totalDcSuppliedA: number;
  totalDcSuppliedW: number;
  totalDcConsumedA: number;
  totalDcConsumedW: number;
  loadingPercentage: number;
  isOverloaded: boolean;
  recommendedPsuUpgrade?: string;
  primaryProtectionRecommendation?: string;
}

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'power' | 'space' | 'protection' | 'normative' | 'enclosure';
  title: string;
  description: string;
  suggestedAction?: string;
}

export type WireNetType = 
  | 'ac_phase'       // Fase L1, L2, L3 (Castanho / Preto / Cinzento)
  | 'ac_neutral'     // Neutro N (Azul claro)
  | 'pe_ground'      // Terra de Proteção PE (Verde / Amarelo)
  | 'dc_positive'    // +24V DC (Vermelho)
  | 'dc_negative'    // 0V DC / M (Azul escuro ou Preto)
  | 'control_signal' // Comando & Entradas/Saídas (Laranja / Roxo)
  | 'analog_signal'; // Sinal analógico (Cinzento / Par entrançado)

export interface WireConnection {
  id: string;
  wireTag: string; // ex: "W01", "L-01", "24V-01", "M-01", "DQ0-K1"
  fromComponentId: string;
  fromComponentTag: string;
  fromTerminal: string; // ex: "L1", "N", "+V", "DQ 0.0", "11", "PE"
  toComponentId: string;
  toComponentTag: string;
  toTerminal: string; // ex: "L", "N", "A1", "A2", "14", "X1:1"
  netType: WireNetType;
  color: string; // hex color for rendering
  crossSectionMm2: number; // 0.75, 1.0, 1.5, 2.5, 4.0, 6.0, 10.0
  isEnergized?: boolean;
  notes?: string;
}

export interface SimulationState {
  isPowered: boolean; // Alimentação Geral AC ligada (230V/400V)
  isMainBreakerOn: boolean; // Disjuntor Geral Q1 armado
  isRcdTripped: boolean; // Diferencial disparado
  isEmergencyStopActive: boolean; // Botão de Emergência premido
  isPsuHealthy: boolean; // Fonte 24VDC a debitar tensão correta
  measuredAcVoltage: number; // ex: 230.2 V
  measuredDcVoltage: number; // ex: 24.05 V
  measuredTotalCurrentA: number; // ex: 1.85 A
  plcMode: 'RUN' | 'STOP' | 'FAULT';
  digitalInputs: Record<string, boolean>; // ex: { "DI0": true (Marcha), "DI1": false (Paragem), "DI2": true (Sensor) }
  digitalOutputs: Record<string, boolean>; // ex: { "DQ0": true }
  relayStates: Record<string, boolean>; // ex: { "K1": true, "K2": false }
  trippedBreakerTags: string[]; // ex: ["Q1"] se disparado
  activeFault: 'none' | 'overload' | 'short_circuit' | 'rcd_leakage' | 'dc_short';
}
