import React, { useState, useMemo } from 'react';
import { ProjectState, PlacedComponent, ElectricalComponent } from '../types/electrical';
import {
  runIec60898ProjectAudit,
  analyzeLoadIec60898,
  applyIecRecommendationToProject,
  applyAllIecRecommendationsToProject,
  LoadNatureType,
  IecCurveType,
  STANDARD_MCB_RATINGS,
} from '../utils/iec60898Assistant';
import {
  X,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  Sliders,
  SlidersHorizontal,
  ArrowRight,
  Copy,
  Download,
  Check,
  RefreshCw,
  Cpu,
  Layers,
  Wrench,
  Boxes,
  HelpCircle,
} from 'lucide-react';

interface Iec60898AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onUpdateProject: (updated: ProjectState) => void;
  onShowNotification?: (msg: string) => void;
}

export const Iec60898AssistantModal: React.FC<Iec60898AssistantModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onShowNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'simulator' | 'guide'>('audit');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'issues_only' | 'compliant_only'>('all');
  const [copied, setCopied] = useState(false);

  // Estados do Simulador Interativo
  const [simNature, setSimNature] = useState<LoadNatureType>('smps_power_supply');
  const [simPowerW, setSimPowerW] = useState<number>(120);
  const [simVoltage, setSimVoltage] = useState<number>(230);
  const [simIsThreePhase, setSimIsThreePhase] = useState<boolean>(false);
  const [simCosPhi, setSimCosPhi] = useState<number>(0.85);

  // Executar auditoria IEC 60898 no projeto atual
  const auditReport = useMemo(() => {
    return runIec60898ProjectAudit(project);
  }, [project]);

  // Cálculo da simulação interativa
  const simResult = useMemo(() => {
    return analyzeLoadIec60898(
      simNature,
      simPowerW,
      simVoltage,
      simIsThreePhase,
      simCosPhi
    );
  }, [simNature, simPowerW, simVoltage, simIsThreePhase, simCosPhi]);

  if (!isOpen) return null;

  // Filtrar itens da lista de auditoria
  const filteredItems = auditReport.items.filter((item) => {
    if (filterSeverity === 'issues_only') {
      return item.complianceStatus !== 'compliant';
    }
    if (filterSeverity === 'compliant_only') {
      return item.complianceStatus === 'compliant';
    }
    return true;
  });

  // Aplicar recomendação individual
  const handleApplySingle = (instanceId: string, curve: IecCurveType, ratingA: number, name: string) => {
    const updated = applyIecRecommendationToProject(project, instanceId, curve, ratingA);
    onUpdateProject(updated);
    onShowNotification?.(`Disjuntor atualizado com sucesso: Curva ${curve} / ${ratingA}A para ${name}`);
  };

  // Aplicar todas as recomendações de uma vez (Auto-Fix)
  const handleApplyAll = () => {
    const issuesCount = auditReport.curveMismatchCount + auditReport.overratedCount + auditReport.underratedCount;
    if (issuesCount === 0) {
      onShowNotification?.('Todos os disjuntores já se encontram em conformidade com a IEC 60898-1.');
      return;
    }
    const updated = applyAllIecRecommendationsToProject(project, auditReport);
    onUpdateProject(updated);
    onShowNotification?.(`Aplicadas correções automáticas IEC 60898 em ${issuesCount} circuito(s).`);
  };

  // Copiar relatório técnico
  const handleCopyReport = () => {
    let report = `=======================================================\n`;
    report += `RELATÓRIO TÉCNICO DE SELEÇÃO DE CURVAS IEC 60898-1\n`;
    report += `Projeto: ${project.config.name} (${project.config.projectCode})\n`;
    report += `Data: ${new Date().toLocaleDateString('pt-PT')} | Alimentação: ${project.config.supplyVoltage}\n`;
    report += `=======================================================\n\n`;

    auditReport.items.forEach((item, index) => {
      report += `[${index + 1}] ${item.name} (${item.tag})\n`;
      report += `    Natureza da Carga: ${item.loadNatureLabel}\n`;
      report += `    Tensão: ${item.nominalVoltage} | Potência: ${item.powerW}W | Corrente Ib: ${item.calculatedIbA}A\n`;
      report += `    Pico Inrush Estimado: ${item.estimatedInrushPeakA}A (~${item.inrushRatio}x Ib)\n`;
      if (item.associatedBreaker) {
        report += `    Disjuntor Atual: ${item.associatedBreaker.tag} - Curva ${item.associatedBreaker.curve || 'C'} / ${item.associatedBreaker.ratedCurrentA}A\n`;
      } else {
        report += `    Disjuntor Atual: Nenhum disjuntor dedicado associado\n`;
      }
      report += `    RECOMENDAÇÃO IEC 60898-1: Curva ${item.recommendedCurve} | ${item.recommendedInA}A | Cabo ${item.recommendedCableSpec}\n`;
      report += `    Fundamentação: ${item.technicalJustification}\n`;
      report += `    Norma: ${item.iecNormClause}\n`;
      report += `    Estado: ${item.statusBadge.label}\n\n`;
    });

    navigator.clipboard.writeText(report);
    setCopied(true);
    onShowNotification?.('Relatório técnico IEC 60898 copiado para a área de transferência.');
    setTimeout(() => setCopied(false), 2500);
  };

  // Adicionar disjuntor da simulação ao projeto
  const handleAddSimulatedBreakerToProject = () => {
    const targetRail = project.rails[0];
    if (!targetRail) {
      onShowNotification?.('Não foi encontrada nenhuma calha DIN no projeto.');
      return;
    }

    const newInstanceId = `mcb-sim-${Date.now()}`;
    const tag = `Q${targetRail.items.length + 1}`;
    const poles = simIsThreePhase ? '3P+N' : '1P+N';
    const modules = simIsThreePhase ? 4 : 2;
    const widthMm = modules * 18;

    const newComponent: ElectricalComponent = {
      id: newInstanceId,
      catalogId: `mcb-iec-${simResult.recommendedCurve.toLowerCase()}-${simResult.recommendedInA}a`,
      tag,
      name: `Disjuntor ${poles} ${simResult.recommendedInA}A Curva ${simResult.recommendedCurve} (IEC 60898)`,
      brand: 'Genérico IEC',
      partNumber: `MCB-${poles}-${simResult.recommendedInA}A-${simResult.recommendedCurve}`,
      category: 'protection_ac',
      description: `Disjuntor modular magnetotérmico Curva ${simResult.recommendedCurve} ${simResult.recommendedInA}A, poder de corte 6kA/10kA. Otimizado para ${getLoadNatureName(simNature)}.`,
      widthMm,
      heightMm: 85,
      dinModules: modules,
      inputVoltage: simIsThreePhase ? '400V AC' : '230V AC',
      ratedCurrentA: simResult.recommendedInA,
      poles,
      curve: simResult.recommendedCurve,
      breakingCapacityKa: simIsThreePhase ? 10 : 6,
      estimatedPriceEur: simIsThreePhase ? 28.5 : 12.0,
      color: '#475569',
    };

    // Calcular posição à direita na calha
    const currentMaxX = targetRail.items.reduce((max, it) => Math.max(max, it.positionMm + it.data.widthMm), 0);
    const positionMm = currentMaxX + 5;

    const newPlacedItem: PlacedComponent = {
      instanceId: newInstanceId,
      catalogId: newComponent.catalogId,
      tag,
      railIndex: 0,
      positionMm,
      data: newComponent,
    };

    const updatedRails = [...project.rails];
    updatedRails[0] = {
      ...targetRail,
      items: [...targetRail.items, newPlacedItem],
    };

    onUpdateProject({
      ...project,
      rails: updatedRails,
    });

    onShowNotification?.(`Disjuntor ${tag} (Curva ${simResult.recommendedCurve} ${simResult.recommendedInA}A) adicionado à Calha DIN 1!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden font-sans">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Assistente Inteligente IEC 60898
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md">
                  Curvas B, C, D &amp; Calibres
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dimensionamento de curvas e correntes nominais de disjuntores modulares segundo a norma IEC 60898-1 e RTIEBT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition"
              title="Copiar relatório técnico com justificações normativas"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Relatório'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Fechar (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & KPI Summary Bar */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'audit'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Auditoria do Quadro ({auditReport.totalAnalyzedLoads})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'simulator'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Simulador Interativo de Cargas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'guide'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Guia Normativo IEC 60898-1</span>
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 text-emerald-300 border border-emerald-800/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span><strong>{auditReport.compliantCount}</strong> Conformes</span>
            </div>

            {auditReport.curveMismatchCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/40 text-amber-300 border border-amber-800/50">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span><strong>{auditReport.curveMismatchCount}</strong> Curvas Inadequadas</span>
              </div>
            )}

            {auditReport.missingBreakerCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/40 text-red-300 border border-red-800/50">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span><strong>{auditReport.missingBreakerCount}</strong> Sem Disjuntor</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: AUDITORIA DO QUADRO */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              
              {/* Reference Curve Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      CURVA B (3 - 5 × In)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      {auditReport.curveDistribution.B} no quadro
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Cargas puramente resistivas, aquecimento sem motor, circuitos de condutores longos onde Icc_min é reduzida.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-800/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      CURVA C (5 - 10 × In)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {auditReport.curveDistribution.C} no quadro
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Fontes chaveadas (Mean Well), PLCs (Siemens S7-1200), tomadas gerais, lâmpadas LED com drivers eletrónicos.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-800/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                      CURVA D (10 - 20 × In)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {auditReport.curveDistribution.D} no quadro
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Motores com arranque direto (DOL), transformadores de comando e equipamentos com forte magnetização transitória.
                  </p>
                </div>
              </div>

              {/* Action & Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Filtrar:</span>
                  <button
                    type="button"
                    onClick={() => setFilterSeverity('all')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                      filterSeverity === 'all'
                        ? 'bg-slate-700 text-white font-bold'
                        : 'text-slate-400 hover:text-white bg-slate-850'
                    }`}
                  >
                    Todos ({auditReport.items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterSeverity('issues_only')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                      filterSeverity === 'issues_only'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-amber-400 hover:text-white bg-slate-850'
                    }`}
                  >
                    Apenas Alertas ({auditReport.curveMismatchCount + auditReport.overratedCount + auditReport.underratedCount + auditReport.missingBreakerCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterSeverity('compliant_only')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                      filterSeverity === 'compliant_only'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-emerald-400 hover:text-white bg-slate-850'
                    }`}
                  >
                    Conformes ({auditReport.compliantCount})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleApplyAll}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-lg shadow-md transition transform active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Aplicar Todas as Sugestões (Auto-Fix)</span>
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <h3 className="text-sm font-bold text-white">Nenhum circuito pendente neste filtro</h3>
                    <p className="text-xs text-slate-400 mt-1">Todos os circuitos atendem aos critérios normativos IEC 60898-1.</p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Device Info */}
                      <div className="space-y-1.5 flex-1 min-w-[240px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                            {item.tag}
                          </span>
                          <span className="text-sm font-bold text-white">
                            {item.name}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.statusBadge.color}`}>
                            {item.statusBadge.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span>Categoria: <strong className="text-slate-200">{item.loadNatureLabel}</strong></span>
                          <span>Tensão: <strong className="text-slate-200">{item.nominalVoltage}</strong></span>
                          <span>Potência: <strong className="text-amber-400">{item.powerW}W</strong></span>
                          <span>Corrente Ib: <strong className="text-sky-400">{item.calculatedIbA}A</strong></span>
                          <span>Pico Inrush: <strong className="text-orange-400">{item.estimatedInrushPeakA}A</strong> (~{item.inrushRatio}x)</span>
                        </div>

                        {/* Technical Rationale Box */}
                        <div className="mt-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                          <p className="text-slate-200">
                            <span className="text-amber-400 font-semibold">IEC 60898-1 Rationale: </span>
                            {item.technicalJustification}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                            <span>Ref: <strong className="text-slate-300">{item.iecNormClause}</strong></span>
                            <span>Condutor recomendado: <strong className="text-emerald-400">{item.recommendedCableSpec}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Breaker Comparison & Action */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 md:pl-4 md:border-l md:border-slate-800">
                        {/* Currently Placed Breaker Info */}
                        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-center min-w-[130px]">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                            Disjuntor Atual
                          </span>
                          {item.associatedBreaker ? (
                            <div>
                              <div className="font-mono text-sm font-bold text-white">
                                {item.associatedBreaker.tag}
                              </div>
                              <div className="text-[11px] text-slate-300 font-medium">
                                Curva <strong className="text-amber-400">{item.associatedBreaker.curve || 'C'}</strong> / {item.associatedBreaker.ratedCurrentA}A
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {item.associatedBreaker.poles} • {item.associatedBreaker.breakingCapacityKa || 6}kA
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-red-400 font-medium py-1">
                              Sem proteção dedicada
                            </div>
                          )}
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block shrink-0" />

                        {/* Recommended IEC 60898 Breaker */}
                        <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-center min-w-[140px]">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                            Recomendação IEC
                          </span>
                          <div className="inline-block px-2 py-0.5 rounded-md font-black text-sm text-white bg-amber-600 mb-1">
                            CURVA {item.recommendedCurve}
                          </div>
                          <div className="font-mono text-xs font-bold text-slate-200">
                            {item.recommendedInA}A • {item.recommendedPoles}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Icn ≥ {item.recommendedBreakingCapacityKa}kA
                          </div>
                        </div>

                        {/* Apply Action Button */}
                        {item.associatedBreaker && item.complianceStatus !== 'compliant' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleApplySingle(
                                item.associatedBreaker!.instanceId,
                                item.recommendedCurve,
                                item.recommendedInA,
                                item.name
                              )
                            }
                            className="w-full sm:w-auto px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                            title="Atualizar este disjuntor com a curva e corrente recomendadas"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aplicar {item.recommendedCurve}/{item.recommendedInA}A</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SIMULADOR INTERATIVO */}
          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Configuração da Carga para Cálculo IEC 60898-1</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Selecione o tipo de dispositivo e os seus parâmetros elétricos. O motor de cálculo determinará instantaneamente a curva recomendada (B, C ou D), o calibre nominal e a justificação normativa.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Load Nature */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Tipo de Carga / Dispositivo:
                    </label>
                    <select
                      value={simNature}
                      onChange={(e) => setSimNature(e.target.value as LoadNatureType)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="smps_power_supply">Fonte de Alimentação Chaveada (SMPS / Mean Well)</option>
                      <option value="plc_automation">Controlador Lógico / PLC (Siemens S7-1200 / LOGO!)</option>
                      <option value="resistive_heating">Aquecimento Resistivo Puro / Termoacumulador</option>
                      <option value="lighting_led_mixed">Iluminação LED com Balastros Eletrónicos</option>
                      <option value="general_sockets">Tomadas de Uso Geral (TUG)</option>
                      <option value="inductive_motor_direct">Motor Elétrico Indutivo (Arranque Direto)</option>
                      <option value="transformer_isolation">Transformador de Comando / Isolamento</option>
                      <option value="hvac_heat_pump">Unidade de AVAC / Bomba de Calor</option>
                      <option value="ev_charger">Posto de Carregamento Veículo Elétrico (Wallbox)</option>
                      <option value="dc_secondary">Circuito de Comando 24V DC</option>
                    </select>
                  </div>

                  {/* Power in Watts */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Potência Nominal da Carga (W):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="10"
                        max="50000"
                        step="10"
                        value={simPowerW}
                        onChange={(e) => setSimPowerW(Math.max(1, Number(e.target.value) || 0))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-xs text-slate-400 font-mono">W</span>
                    </div>
                  </div>

                  {/* Voltage */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Tensão Nominal de Alimentação:
                    </label>
                    <select
                      value={simVoltage}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setSimVoltage(v);
                        if (v === 400) setSimIsThreePhase(true);
                        else setSimIsThreePhase(false);
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value={230}>230V AC (Monofásico 1F+N)</option>
                      <option value={400}>400V AC (Trifásico 3F+N)</option>
                      <option value={24}>24V DC (Corrente Contínua)</option>
                    </select>
                  </div>

                  {/* Cos Phi */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Fator de Potência (cos φ):
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={simCosPhi}
                      onChange={(e) => setSimCosPhi(Math.min(1.0, Math.max(0.5, Number(e.target.value) || 0.85)))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Simulation Result Presentation Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/40 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Resultado do Dimensionamento Normativo
                    </span>
                    <h4 className="text-lg font-bold text-white">
                      Disjuntor Recomendado para {getLoadNatureName(simNature)}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddSimulatedBreakerToProject}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition"
                    >
                      <Boxes className="w-4 h-4" />
                      <span>Inserir Disjuntor no Quadro DIN</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Curva IEC</span>
                    <span className="text-2xl font-black text-amber-400">
                      CURVA {simResult.recommendedCurve}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Calibre In</span>
                    <span className="text-2xl font-black text-sky-400 font-mono">
                      {simResult.recommendedInA}A
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Corrente Ib</span>
                    <span className="text-2xl font-black text-white font-mono">
                      {simResult.calculatedIbA}A
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Pico Inrush</span>
                    <span className="text-2xl font-black text-orange-400 font-mono">
                      {simResult.estimatedInrushPeakA}A
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="font-semibold text-amber-300">
                    Porquê a Curva {simResult.recommendedCurve}?
                  </div>
                  <p className="leading-relaxed">
                    {simResult.technicalJustification}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <span>Base Normativa: <strong className="text-slate-200">{simResult.iecNormClause}</strong></span>
                    <span>Condutor de Cobre: <strong className="text-emerald-400">{simResult.recommendedWireSectionMm2} mm²</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GUIA NORMATIVO IEC 60898-1 */}
          {activeTab === 'guide' && (
            <div className="space-y-6 text-xs text-slate-300">
              <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Princípios da Norma IEC 60898-1 para Disjuntores Modulares</span>
                </h3>

                <p className="leading-relaxed">
                  A norma internacional <strong>IEC 60898-1</strong> (adotada em Portugal como <strong>NP EN 60898-1</strong> e referenciada nas <strong>RTIEBT</strong>) estabelece as características de funcionamento e as curvas de disparo instantâneo dos disjuntores de proteção contra sobreintensidades para instalações domésticas e análogas:
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-800 text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-200">
                        <th className="p-2.5 border border-slate-800 font-bold">Curva</th>
                        <th className="p-2.5 border border-slate-800 font-bold">Gama de Disparo Magnético</th>
                        <th className="p-2.5 border border-slate-800 font-bold">Aplicações Típicas Recomendadas</th>
                        <th className="p-2.5 border border-slate-800 font-bold">Riscos de Escolha Errada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      <tr>
                        <td className="p-2.5 font-bold text-blue-400 border border-slate-800">Curva B</td>
                        <td className="p-2.5 font-mono border border-slate-800">3 In a 5 In</td>
                        <td className="p-2.5 border border-slate-800">
                          Aquecimento puramente resistivo, termoacumuladores estáticos, iluminação incandescente, condutores longos onde Icc_min no final da linha é baixa.
                        </td>
                        <td className="p-2.5 text-amber-300 border border-slate-800">
                          Se utilizada em motores ou fontes chaveadas, dispara intempestivamente na energização.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-emerald-400 border border-slate-800">Curva C</td>
                        <td className="p-2.5 font-mono border border-slate-800">5 In a 10 In</td>
                        <td className="p-2.5 border border-slate-800">
                          Fontes chaveadas (Mean Well NDR/SDR), controladores PLCs (Siemens S7-1200), circuitos de tomadas de uso geral (TUG), iluminação LED com balastros eletrónicos.
                        </td>
                        <td className="p-2.5 text-slate-400 border border-slate-800">
                          Curva universal padrão. Em linhas extremamente longas (&gt;40m) requer verificação da Icc_min para garantir disparo em &lt;0.4s.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-purple-400 border border-slate-800">Curva D</td>
                        <td className="p-2.5 font-mono border border-slate-800">10 In a 20 In</td>
                        <td className="p-2.5 border border-slate-800">
                          Motores de indução com arranque direto (DOL), transformadores de comando, conversores com forte magnetização.
                        </td>
                        <td className="p-2.5 text-red-300 border border-slate-800">
                          Se aplicada em tomadas residenciais, pode falhar o disparo instantâneo em curto-circuitos fracos, sobreaquecendo os cabos.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-amber-300 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span>Critério de Coordenação Fundamental: Ib ≤ In ≤ Iz</span>
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li><strong>Ib (Corrente de Projeto):</strong> Corrente consumida pelo equipamento em regime nominal.</li>
                    <li><strong>In (Calibre do Disjuntor):</strong> Deve ser superior a Ib com margem de 1.15 a 1.25x para evitar desarmes térmicos por aquecimento ambiente contínuo.</li>
                    <li><strong>Iz (Capacidade de Corrente do Cabo):</strong> O disjuntor NUNCA pode ter calibre superior à corrente admissível do condutor instalado.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/90 text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Motor de Análise Baseado em <strong>IEC 60898-1</strong> &amp; <strong>RTIEBT 533</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg font-semibold transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

function getLoadNatureName(nature: LoadNatureType): string {
  switch (nature) {
    case 'smps_power_supply':
      return 'Fonte Chaveada SMPS';
    case 'plc_automation':
      return 'Controlador PLC';
    case 'resistive_heating':
      return 'Aquecimento Resistivo';
    case 'lighting_led_mixed':
      return 'Iluminação LED';
    case 'general_sockets':
      return 'Tomadas de Uso Geral';
    case 'inductive_motor_direct':
      return 'Motor Indutivo (DOL)';
    case 'transformer_isolation':
      return 'Transformador de Comando';
    case 'hvac_heat_pump':
      return 'AVAC / Bomba de Calor';
    case 'ev_charger':
      return 'Wallbox Veículo Elétrico';
    case 'dc_secondary':
      return 'Circuito 24VDC';
  }
}
