import React, { useState, useMemo } from 'react';
import { ProjectState } from '../types/electrical';
import { runEngineeringValidations, calculatePowerBalance, isResidentialProject } from '../utils/calculations';
import { verifyEnclosureIpIk, ENVIRONMENT_SPECS, IK_ENERGY_JOULES } from '../utils/ipIkVerification';
import { 
  X, BookOpen, Search, ShieldCheck, ShieldAlert, AlertTriangle, 
  Home, Zap, Shield, FileText, CheckCircle2, ChevronRight, Download, Printer, Copy, Sparkles, ExternalLink, Info
} from 'lucide-react';

interface ComplianceDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onOpenPrintModal?: () => void;
  onShowNotification?: (msg: string) => void;
}

type DocSection = 'residential' | 'automation' | 'ip_ik' | 'live_audit';

export const ComplianceDocsModal: React.FC<ComplianceDocsModalProps> = ({
  isOpen,
  onClose,
  project,
  onOpenPrintModal,
  onShowNotification,
}) => {
  const [activeSection, setActiveSection] = useState<DocSection>('residential');
  const [searchQuery, setSearchQuery] = useState('');

  const issues = useMemo(() => runEngineeringValidations(project), [project]);
  const isResidential = useMemo(() => isResidentialProject(project), [project]);
  const ipIkReport = useMemo(() => verifyEnclosureIpIk(project.config), [project]);
  const powerBalance = useMemo(() => calculatePowerBalance(project), [project]);

  if (!isOpen) return null;

  // Space calculation for residential
  const totalUsableMm = project.rails.reduce((sum, r) => sum + r.usableWidthMm, 0);
  const occupiedMm = project.rails.flatMap((r) => r.items).reduce((sum, i) => sum + i.data.widthMm, 0);
  const freeMm = Math.max(0, totalUsableMm - occupiedMm);
  const freePercentage = totalUsableMm > 0 ? Math.round((freeMm / totalUsableMm) * 100) : 0;

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    if (onShowNotification) {
      onShowNotification('Texto normativo copiado para a área de transferência.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Documentação Técnica & Manual de Conformidades Normativas
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  RTIEBT · EN 61439 · EN 60204-1 · EN 60529
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Regras regulamentares de dimensionamento, proteção de pessoas, fiação e ensaios de conformidade.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPrintModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrintModal();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
              >
                <Printer className="w-3.5 h-3.5 text-sky-400" />
                <span>Imprimir Dossier</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 bg-slate-950/70 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveSection('residential')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSection === 'residential'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Home className="w-4 h-4 text-emerald-400" />
              <span>1. Habitação (RTIEBT & EN 61439-3)</span>
            </button>

            <button
              onClick={() => setActiveSection('automation')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSection === 'automation'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>2. Automação (EN 60204-1)</span>
            </button>

            <button
              onClick={() => setActiveSection('ip_ik')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSection === 'ip_ik'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4 text-sky-400" />
              <span>3. Graus IP & IK (EN 60529 / 62262)</span>
            </button>

            <button
              onClick={() => setActiveSection('live_audit')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeSection === 'live_audit'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>4. Auditoria do Projeto Atual</span>
              {issues.filter((i) => i.type === 'error').length > 0 ? (
                <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded-full font-mono">
                  {issues.filter((i) => i.type === 'error').length}
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-mono">
                  ✓
                </span>
              )}
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar norma (ex: 539.1, 30mA, IK08, SELV)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-300 leading-relaxed">
          {/* SECTION 1: HABITAÇÃO & RESIDENCIAL */}
          {activeSection === 'residential' && (
            <div className="space-y-6">
              {/* Intro Banner */}
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                <Home className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Regras Técnicas das Instalações Elétricas de Baixa Tensão (RTIEBT)
                  </h3>
                  <p className="mt-1 text-slate-300">
                    Aprovadas pela Portaria n.º 949-A/2006 e norma europeia EN 61439-3 (Quadros de distribuição destinados a serem manobrados por pessoas vulgares - DBO).
                  </p>
                </div>
              </div>

              {/* Requirement 1: Corte Geral */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 font-mono flex items-center justify-center text-xs font-bold">1</span>
                    <span>Aparelho de Corte Geral do Quadro (RTIEBT Secção 537.1.4)</span>
                  </h4>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Obrigatório
                  </span>
                </div>
                <p>
                  Todo o quadro de distribuição em locais de habitação deve dispor de um aparelho de corte geral colocado na origem da instalação ou imediatamente a montante dos barramentos de distribuição:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                  <li><strong>Rede Monofásica (230V):</strong> Corte bipolar (2P) com corte simultâneo da Fase e do Neutro. Corrente nominal típica: <strong>32A, 40A ou 45A Curva C</strong> (poder de corte mínimo 4.5 kA ou 6 kA).</li>
                  <li><strong>Rede Trifásica (400V):</strong> Corte tetrapolar (4P ou 3P+N) com corte simultâneo das 3 Fases e do Neutro. Corrente nominal típica: <strong>20A, 25A, 32A ou 40A Curva C</strong>.</li>
                  <li>O aparelho deve ser visivelmente identificado e facilmente acessível sem necessidade de ferramentas.</li>
                </ul>
              </div>

              {/* Requirement 2: Proteção Diferencial */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 font-mono flex items-center justify-center text-xs font-bold">2</span>
                    <span>Proteção Diferencial Residual 30mA (RTIEBT Secções 412.5 & 531.2)</span>
                  </h4>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Proteção de Vidas
                  </span>
                </div>
                <p>
                  A proteção contra contactos indiretos em habitação assenta no corte automático da alimentação por interruptores diferenciais de alta sensibilidade (<strong>IΔn ≤ 30 mA</strong>):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="font-bold text-white block">Tipo A (Habitação Padrão)</span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Obrigatório para cargas com retificação eletrónica (máquinas de lavar roupa, placas de indução, computadores e variadores). Deteta componentes contínuas pulsantes.
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="font-bold text-white block">Tipo A-EV (Carregadores Wallbox)</span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Conforme <strong>IEC 62955</strong> para veículos elétricos. Inclui sensor de 6mA DC para evitar a saturação magnética do núcleo toroidal em caso de fuga contínua da bateria do carro.
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="font-bold text-white block">Tipo AC (Tradicional)</span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Apenas para correntes sinusoidais puras (resistências térmicas simples). Desaconselhado nas instalações residenciais modernas face ao uso intensivo de eletrónica.
                    </span>
                  </div>
                </div>
              </div>

              {/* Requirement 3: Reserva de Espaço 20% */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 font-mono flex items-center justify-center text-xs font-bold">3</span>
                    <span>Reserva Mínima de 20% em Módulos DIN (RTIEBT Secção 539.1)</span>
                  </h4>
                  <span className="font-mono text-[10px] text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    Espaço Físico
                  </span>
                </div>
                <p>
                  Para permitir futuras ampliações sem necessidade de substituição ou quebra de alvenaria do invólucro, o quadro elétrico de entrada de uma habitação deve dispor de pelo menos <strong>20% de espaço livre em módulos DIN de 18mm</strong> em relação à sua capacidade total instalada.
                </p>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
                  Estado no Projeto Ativo: <strong>{freePercentage}% Livre</strong> ({Math.round((totalUsableMm - occupiedMm) / 18)} módulos de folga) ·{' '}
                  <span className={freePercentage >= 20 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {freePercentage >= 20 ? 'CONFORME (≥ 20%) ✓' : 'ABAIXO DO MÍNIMO REGULAMENTAR (Requer aumento de calha ou quadro)'}
                  </span>
                </div>
              </div>

              {/* Requirement 4: Tabela de Dimensionamento de Cabos */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 font-mono flex items-center justify-center text-xs font-bold">4</span>
                  <span>Tabela Oficial de Dimensionamento de Circuitos Residenciais</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-800">
                    <thead className="bg-slate-900 text-slate-300 font-mono text-[11px]">
                      <tr>
                        <th className="p-2.5 border-b border-slate-800">Circuito Terminal</th>
                        <th className="p-2.5 border-b border-slate-800">Disjuntor (In)</th>
                        <th className="p-2.5 border-b border-slate-800">Bitola Mínima Cobre</th>
                        <th className="p-2.5 border-b border-slate-800">Capacidade Cabo (Iz)</th>
                        <th className="p-2.5 border-b border-slate-800">Ref. RTIEBT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono text-slate-300 text-[11px]">
                      <tr>
                        <td className="p-2.5 text-white font-sans font-medium">Iluminação Geral Interior / Exterior</td>
                        <td className="p-2.5 text-amber-400 font-bold">10A (Curva C)</td>
                        <td className="p-2.5 text-emerald-400 font-bold">1.5 mm²</td>
                        <td className="p-2.5">15.5 A (Método B1)</td>
                        <td className="p-2.5 text-slate-500">801.4.3.1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-white font-sans font-medium">Tomadas de Uso Geral (16A)</td>
                        <td className="p-2.5 text-amber-400 font-bold">16A (Curva C)</td>
                        <td className="p-2.5 text-emerald-400 font-bold">2.5 mm²</td>
                        <td className="p-2.5">21.0 A (Método B1)</td>
                        <td className="p-2.5 text-slate-500">801.4.4.1</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-white font-sans font-medium">Máquina de Lavar Roupa (MLR)</td>
                        <td className="p-2.5 text-amber-400 font-bold">16A (Curva C)</td>
                        <td className="p-2.5 text-emerald-400 font-bold">2.5 mm²</td>
                        <td className="p-2.5">21.0 A</td>
                        <td className="p-2.5 text-slate-500">801.4.4.2</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-white font-sans font-medium">Máquina de Lavar Louça (MLL)</td>
                        <td className="p-2.5 text-amber-400 font-bold">16A (Curva C)</td>
                        <td className="p-2.5 text-emerald-400 font-bold">2.5 mm²</td>
                        <td className="p-2.5">21.0 A</td>
                        <td className="p-2.5 text-slate-500">801.4.4.2</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-white font-sans font-medium">Forno Elétrico / Termoacumulador</td>
                        <td className="p-2.5 text-amber-400 font-bold">20A (Curva C)</td>
                        <td className="p-2.5 text-emerald-400 font-bold">2.5 mm² a 4.0 mm²</td>
                        <td className="p-2.5">28.0 A (4mm²)</td>
                        <td className="p-2.5 text-slate-500">801.4.4.3</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-white font-sans font-medium">Placa de Indução / Vitrocerâmica</td>
                        <td className="p-2.5 text-amber-400 font-bold">32A (Curva C)</td>
                        <td className="p-2.5 text-emerald-400 font-bold">6.0 mm²</td>
                        <td className="p-2.5">36.0 A (Método B1)</td>
                        <td className="p-2.5 text-slate-500">801.4.4.4</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-white font-sans font-medium">Carregador Veículo Elétrico (Wallbox EV)</td>
                        <td className="p-2.5 text-amber-400 font-bold">32A (Curva C)</td>
                        <td className="p-2.5 text-emerald-400 font-bold">6.0 mm² ou 10.0 mm²</td>
                        <td className="p-2.5">36.0 A / 50.0 A</td>
                        <td className="p-2.5 text-slate-500">Secção 722</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Requirement 5: Descarregador de Sobretensões */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 font-mono flex items-center justify-center text-xs font-bold">5</span>
                    <span>Descarregadores de Sobretensões DPS / SPD (RTIEBT 443 & 534)</span>
                  </h4>
                  <span className="font-mono text-[10px] text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                    Classe II
                  </span>
                </div>
                <p>
                  A proteção contra sobretensões transitórias (descargas atmosféricas e manobras na rede pública da e-redes) é exigida nas instalações de habitação alimentadas por linhas aéreas ou com equipamentos sensíveis.
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                  <li><strong>Tecnologia:</strong> DPS Tipo 2 (Classe II) com varístores de óxido metálico (MOV) e centelhador a gás para o Neutro (esquema 1+1 ou 3+1).</li>
                  <li><strong>Corrente Nominal de Descarga (In):</strong> Mínimo 20 kA (onda 8/20 µs) por polo; Corrente Máxima (Imax): 40 kA.</li>
                  <li><strong>Nível de Proteção (Up):</strong> ≤ 1.5 kV para garantir a integridade dos aparelhos eletrónicos domésticos e eletrodomésticos inverter.</li>
                  <li><strong>Comprimento de Ligação:</strong> A soma do condutor de alimentação e do condutor de ligação à terra PE do DPS deve ser inferior a <strong>50 cm</strong> (L1+L2 ≤ 0.5m) para evitar sobretensões induzidas na cablagem.</li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 2: AUTOMAÇÃO & INDÚSTRIA */}
          {activeSection === 'automation' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-xl flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Norma EN 60204-1 (Segurança de Máquinas - Equipamento Elétrico)
                  </h3>
                  <p className="mt-1 text-slate-300">
                    Requisitos normativos europeus para o projeto, montagem e ensaio de armários elétricos de comando industrial, automação e linhas de produção.
                  </p>
                </div>
              </div>

              {/* SELV / PELV Circuits */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-amber-600/20 text-amber-400 font-mono flex items-center justify-center text-xs font-bold">1</span>
                  <span>Circuitos de Comando a Tensão Reduzida (24VDC SELV / PELV)</span>
                </h4>
                <p>
                  Os circuitos de comando, sensores e autómatos programáveis (PLCs Siemens S7-1200 / LOGO!) devem ser alimentados a muito baixa tensão de segurança através de transformador de isolamento de segurança ou fontes comutadas reguladas com isolamento galvânico reforçado (<strong>Mean Well séries NDR / HDR</strong>):
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                  <li><strong>PELV (Protective Extra-Low Voltage):</strong> O polo 0V (M) da fonte de 24VDC é solidamente ligado ao barramento de proteção PE na entrada do armário. Evita arranques acidentais da máquina causados por defeitos de isolamento à massa nos cabos de sensores.</li>
                  <li><strong>Proteção do Primário (230V AC):</strong> Disjuntor magneto-térmico 1P+N Curva C (2A a 10A) dimensionado para suportar a corrente de irrupção (inrush current) dos condensadores primários da fonte.</li>
                  <li><strong>Proteção do Secundário (24V DC):</strong> Disjuntores eletrónicos seletivos ou disjuntores DC termomagnéticos dedicados para evitar a desativação da fonte por curto-circuito num único sensor de campo.</li>
                </ul>
              </div>

              {/* Emergency Stop & Safety */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-amber-600/20 text-amber-400 font-mono flex items-center justify-center text-xs font-bold">2</span>
                  <span>Função de Paragem de Emergência (EN ISO 13850 & EN 60204-1 Secção 9.2)</span>
                </h4>
                <p>
                  A função de paragem de emergência deve sobrepor-se a todas as outras operações da máquina e operar segundo:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="font-bold text-white block">Categoria de Paragem 0 (Incondicional)</span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Supressão imediata da energia mecânica aos atuadores através de contactores de segurança redundantes com corte físico de potência.
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="font-bold text-white block">Categoria de Paragem 1 (Controlada)</span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Paragem desacelerada controlada pelo variador de frequência com corte final de energia após imobilização completa.
                    </span>
                  </div>
                </div>
              </div>

              {/* Thermal Management & Ventilation */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-amber-600/20 text-amber-400 font-mono flex items-center justify-center text-xs font-bold">3</span>
                  <span>Gestão Térmica e Espaçamento de Ventilação em Calhas DIN</span>
                </h4>
                <p>
                  As fontes de alimentação chaveadas dissipam calor considerável (rendimento típico 88% a 92%). Para prevenir o derating térmico e degradação prematura dos condensadores eletrolíticos:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                  <li>Manter espaçamento lateral livre de no mínimo <strong>20 mm à esquerda e à direita</strong> das fontes Mean Well NDR-75, NDR-120 e NDR-240.</li>
                  <li>Garantir no mínimo <strong>40 mm livre acima e abaixo</strong> da fonte para permitir a convecção natural de ar ascendente.</li>
                  <li>Evitar instalar PLCs sensíveis (Siemens S7-1200) diretamente encostados a fontes quentes ou bobinas de contactores de potência.</li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 3: GRAUS IP & IK */}
          {activeSection === 'ip_ik' && (
            <div className="space-y-6">
              <div className="p-4 bg-sky-950/30 border border-sky-500/30 rounded-xl flex items-start gap-3">
                <Shield className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Graus de Proteção dos Invólucros: IP (EN 60529) e IK (EN 62262)
                  </h3>
                  <p className="mt-1 text-slate-300">
                    Classificação internacional contra a penetração de corpos sólidos, poeiras, água e resistência mecânica a choques e impactos.
                  </p>
                </div>
              </div>

              {/* IP Table */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-sm font-bold text-white">
                  Tabela do Código IP (Ingress Protection - EN 60529)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-amber-400 font-mono block mb-2">1º Dígito: Proteção contra Corpos Sólidos e Poeiras</span>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IP0X:</strong> <span className="text-slate-400">Sem proteção</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IP2X:</strong> <span className="text-slate-400">Dedos e objetos &gt; 12.5 mm</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IP3X:</strong> <span className="text-slate-400">Ferramentas e cabos &gt; 2.5 mm</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IP4X:</strong> <span className="text-slate-400">Fios finos e parafusos &gt; 1.0 mm (Habitação c/ porta)</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IP5X:</strong> <span className="text-slate-400">Protegido contra poeiras (depósito sem risco)</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IP6X:</strong> <span className="text-slate-400">Totalmente estanque ao pó fino</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-sky-400 font-mono block mb-2">2º Dígito: Proteção contra Líquidos e Água</span>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IPX0:</strong> <span className="text-slate-400">Sem proteção contra água</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IPX1 / IPX2:</strong> <span className="text-slate-400">Gotas verticais ou inclinadas até 15°</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IPX4:</strong> <span className="text-slate-400">Salpicos de qualquer direção (Garagens/Húmido)</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IPX5:</strong> <span className="text-slate-400">Jatos de mangueira (Exterior Abrigado)</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IPX6:</strong> <span className="text-slate-400">Jatos potentes / vagas de mar (Lavagem de pressão)</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                        <strong>IPX7:</strong> <span className="text-slate-400">Imersão temporária até 1 metro</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* IK Table */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-sm font-bold text-white">
                  Tabela do Código IK de Resistência a Impactos (EN 62262)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-800 font-mono">
                    <thead className="bg-slate-900 text-slate-300 text-[11px]">
                      <tr>
                        <th className="p-2.5 border-b border-slate-800">Código IK</th>
                        <th className="p-2.5 border-b border-slate-800">Energia de Choque</th>
                        <th className="p-2.5 border-b border-slate-800">Massa e Altura de Queda do Martelo</th>
                        <th className="p-2.5 border-b border-slate-800">Aplicação Típica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-[11px] text-slate-300">
                      <tr>
                        <td className="p-2.5 font-bold text-white">IK02</td>
                        <td className="p-2.5 text-slate-400">0.2 Joules</td>
                        <td className="p-2.5">200g a 10 cm</td>
                        <td className="p-2.5 font-sans">Apenas toques e manuseio muito ligeiro</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-white">IK05</td>
                        <td className="p-2.5 text-slate-400">0.7 Joules</td>
                        <td className="p-2.5">200g a 35 cm</td>
                        <td className="p-2.5 font-sans">Interior de caixas e quadros protegidos</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-emerald-400">IK07</td>
                        <td className="p-2.5 text-emerald-300 font-bold">2.0 Joules</td>
                        <td className="p-2.5">500g a 40 cm</td>
                        <td className="p-2.5 font-sans text-white">Padrão habitacional e edifícios (plásticos técnicos de qualidade)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-sky-400">IK08</td>
                        <td className="p-2.5 text-sky-300 font-bold">5.0 Joules</td>
                        <td className="p-2.5">1.7 kg a 30 cm</td>
                        <td className="p-2.5 font-sans text-white">Padrão armários industriais de chapa de aço e poliéster exterior</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-amber-400">IK09</td>
                        <td className="p-2.5 text-amber-300 font-bold">10.0 Joules</td>
                        <td className="p-2.5">5.0 kg a 20 cm</td>
                        <td className="p-2.5 font-sans">Locais públicos e indústrias pesadas com risco de colisões</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-purple-400">IK10</td>
                        <td className="p-2.5 text-purple-300 font-bold">20.0 Joules</td>
                        <td className="p-2.5">5.0 kg a 40 cm</td>
                        <td className="p-2.5 font-sans">Máxima resistência antivandálica, minas, zonas portuárias</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: LIVE PROJECT AUDIT */}
          {activeSection === 'live_audit' && (
            <div className="space-y-6">
              {/* Audit Summary Card */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span>Auditoria Normativa do Projeto Atual</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Projeto: <strong className="text-slate-200">{project.config.name}</strong> ({project.config.projectCode}) ·{' '}
                      Aplicação: <strong className="text-slate-200">{project.config.applicationType === 'residential' ? 'Habitação (RTIEBT)' : 'Automação (EN 60204-1)'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-mono font-bold">
                      {issues.filter((i) => i.type === 'error').length} Erros
                    </span>
                    <span className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono font-bold">
                      {issues.filter((i) => i.type === 'warning').length} Alertas
                    </span>
                  </div>
                </div>

                {/* Audit Grid of Normative Checkpoints */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Item 1: Corte Geral */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">1. Corte Geral</span>
                    <span className="font-bold text-sm block mt-1">
                      {issues.some((i) => i.id.includes('no-main')) ? (
                        <span className="text-red-400 flex items-center gap-1">✗ Não Instalado</span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">✓ Conforme</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">RTIEBT 537.1 / EN 60204-1</span>
                  </div>

                  {/* Item 2: Proteção Diferencial */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">2. Diferencial 30mA</span>
                    <span className="font-bold text-sm block mt-1">
                      {issues.some((i) => i.id.includes('no-rcd')) ? (
                        <span className="text-red-400 flex items-center gap-1">✗ Ausente</span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">✓ Proteção 30mA</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">RTIEBT 412.5 / EN 61439</span>
                  </div>

                  {/* Item 3: Grau IP & IK */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">3. Grau IP & IK</span>
                    <span className="font-bold text-sm block mt-1">
                      {ipIkReport.isCompliant ? (
                        <span className="text-emerald-400 flex items-center gap-1">✓ {ipIkReport.actualIp} / {ipIkReport.actualIk}</span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1">✗ Exige {ipIkReport.requiredIp}</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">EN 60529 / EN 62262</span>
                  </div>

                  {/* Item 4: Reserva / Térmico */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">
                      {isResidential ? '4. Reserva Espaço' : '4. Balanço 24VDC'}
                    </span>
                    <span className="font-bold text-sm block mt-1">
                      {isResidential ? (
                        freePercentage >= 20 ? (
                          <span className="text-emerald-400 flex items-center gap-1">✓ {freePercentage}% Livre</span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">⚠️ {freePercentage}% (&lt; 20%)</span>
                        )
                      ) : powerBalance.isOverloaded ? (
                        <span className="text-red-400 flex items-center gap-1">✗ Sobrecarga</span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">✓ Carga {powerBalance.loadingPercentage}%</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {isResidential ? 'RTIEBT 539.1 (Mín 20%)' : 'EN 60204-1 SELV'}
                    </span>
                  </div>
                </div>

                {/* Audit Findings */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Lista Detalhada de Itens Avaliados no Quadro
                  </h4>

                  {issues.length === 0 ? (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Parabéns! O projeto cumpre integralmente todas as normas e regulamentos técnicos aplicáveis.</span>
                    </div>
                  ) : (
                    issues.map((iss) => (
                      <div
                        key={iss.id}
                        className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                          iss.type === 'error'
                            ? 'bg-red-950/20 border-red-800/60 text-red-200'
                            : iss.type === 'warning'
                            ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        {iss.type === 'error' ? (
                          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        ) : iss.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <span className="font-bold text-slate-100">{iss.title}</span>
                          <p className="mt-0.5 opacity-90 leading-relaxed">{iss.description}</p>
                          {iss.suggestedAction && (
                            <p className="mt-1 text-sky-400 font-medium">
                              Sugestão: {iss.suggestedAction}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Guia Normativo ElectroCad DIN v2.4</span>
            <span>·</span>
            <span>Documentação Técnica Integrada</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            Fechar Manual
          </button>
        </div>
      </div>
    </div>
  );
};
