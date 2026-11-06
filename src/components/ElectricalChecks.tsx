import React from 'react';
import { ProjectState, EnclosureConfig } from '../types/electrical';
import { calculatePowerBalance, runEngineeringValidations, isResidentialProject } from '../utils/calculations';
import { verifyEnclosureIpIk } from '../utils/ipIkVerification';
import { 
  ShieldAlert, ShieldCheck, Zap, AlertTriangle, Info, Home, 
  Cpu, Layers, Shield, BookOpen, Compass, Droplets, Hammer, Sparkles, ArrowRight 
} from 'lucide-react';

interface ElectricalChecksProps {
  project: ProjectState;
  onOpenCatalog: (railIndex: number) => void;
  onOpenIpIkVerification?: () => void;
  onOpenComplianceDocs?: () => void;
  onOpenIecAssistant?: () => void;
  onUpdateConfig?: (newConfig: EnclosureConfig) => void;
}

export const ElectricalChecks: React.FC<ElectricalChecksProps> = ({ 
  project, 
  onOpenCatalog,
  onOpenIpIkVerification,
  onOpenComplianceDocs,
  onOpenIecAssistant,
  onUpdateConfig,
}) => {
  const balance = calculatePowerBalance(project);
  const issues = runEngineeringValidations(project);
  const isResidential = isResidentialProject(project);
  const ipIkReport = verifyEnclosureIpIk(project.config);

  const errors = issues.filter((i) => i.type === 'error');
  const warnings = issues.filter((i) => i.type === 'warning');
  const infos = issues.filter((i) => i.type === 'info');

  // Residential calculations
  const allItems = project.rails.flatMap((r) => r.items);
  const mainBreakers = allItems.filter(
    (i) =>
      (i.data.category === 'protection_ac' || i.data.category === 'residential_modular') &&
      (i.data.poles === '2P' || i.data.poles === '4P' || i.data.widthMm >= 36) &&
      (i.data.ratedCurrentA || 0) >= 25 &&
      !i.data.name.toLowerCase().includes('diferencial')
  );
  const mainBreaker = mainBreakers[0];
  const mainIn = mainBreaker?.data.ratedCurrentA || (project.config.supplyVoltage?.includes('400V') ? 32 : 40);
  const is3Phase = project.config.supplyVoltage?.includes('400V') || mainBreaker?.data.poles === '4P';
  const estimatedKva = is3Phase
    ? Math.round((Math.sqrt(3) * 400 * mainIn) / 100) / 10
    : Math.round((230 * mainIn) / 100) / 10;

  const rccbs = allItems.filter(
    (i) =>
      (i.data.category === 'protection_ac' || i.data.category === 'residential_modular') &&
      (i.data.name.toLowerCase().includes('diferencial') ||
        i.data.description?.toLowerCase().includes('diferencial') ||
        i.data.partNumber?.toLowerCase().includes('cda') ||
        i.data.partNumber?.toLowerCase().includes('a9z'))
  );

  const terminalCircuits = allItems.filter(
    (i) =>
      (i.data.category === 'protection_ac' || i.data.category === 'residential_modular') &&
      (i.data.poles === '1P+N' || i.data.poles === '1P' || ((i.data.ratedCurrentA || 0) <= 32 && i !== mainBreaker))
  );

  const totalUsableMm = project.rails.reduce((sum, r) => sum + r.usableWidthMm, 0);
  const occupiedMm = allItems.reduce((sum, i) => sum + i.data.widthMm, 0);
  const freeMm = Math.max(0, totalUsableMm - occupiedMm);
  const freePercentage = totalUsableMm > 0 ? Math.round((freeMm / totalUsableMm) * 100) : 0;
  const totalModules = Math.floor(totalUsableMm / 18);
  const usedModules = Math.ceil(occupiedMm / 18);
  const freeModules = Math.max(0, totalModules - usedModules);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-y-auto p-5 shadow-xl text-slate-200 gap-6">
      {/* Top Banner Status */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-lg gap-3">
        <div className="flex items-center gap-3">
          {errors.length > 0 ? (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
          ) : warnings.length > 0 ? (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          )}

          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>
                {errors.length > 0
                  ? `${errors.length} Não-Conformidade(s) Detetada(s)`
                  : warnings.length > 0
                  ? `${warnings.length} Ponto(s) de Atenção no Dimensionamento`
                  : 'Dimensionamento e Conformidade Técnica Verificados'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {isResidential ? 'RTIEBT / EN 61439-3' : 'EN 60204-1 / EN 61439'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isResidential
                ? 'Verificação em tempo real de corte geral, diferenciais 30mA, reserva de espaço (RTIEBT 539.1) e proteções para habitação.'
                : 'Análise em tempo real de potência 24VDC da fonte Mean Well, calhas DIN e proteções segundo normas EN 61439 / EN 60204-1.'}
            </p>
          </div>
        </div>

        {/* Status Pills & Direct Tool Triggers */}
        <div className="flex items-center flex-wrap gap-2">
          {onOpenComplianceDocs && (
            <button
              type="button"
              onClick={onOpenComplianceDocs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/60 rounded-lg text-xs font-semibold text-indigo-300 transition"
              title="Consultar manual normativo de conformidades RTIEBT / EN 61439"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Manual Normativo</span>
            </button>
          )}

          {onOpenIpIkVerification && (
            <button
              type="button"
              onClick={onOpenIpIkVerification}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-950/60 hover:bg-sky-900 border border-sky-700/60 rounded-lg text-xs font-semibold text-sky-300 transition"
              title="Abrir ferramenta de verificação de grau de proteção IP e impactos IK"
            >
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span>Verificar IP / IK</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
            <span className="text-xs px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-mono">
              {errors.length} Erros
            </span>
            <span className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono">
              {warnings.length} Alertas
            </span>
          </div>
        </div>
      </div>

      {/* Residential Distribution Card */}
      {isResidential && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-400" />
              Balanço de Distribuição Residencial (RTIEBT / Habitação)
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Reserva de Módulos:{' '}
              <strong className={freePercentage >= 20 ? 'text-emerald-400' : 'text-amber-400'}>
                {freePercentage}% Livre ({freeModules}M)
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Corte Geral / Entrada</span>
              <span className="text-lg font-bold font-mono text-sky-400 block mt-1">
                {mainBreaker ? `${mainBreaker.data.poles} ${mainIn}A` : `${mainIn}A`}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Potência est.: <strong className="text-slate-300 font-mono">{estimatedKva} kVA</strong>
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Circuitos Terminais</span>
              <span className="text-lg font-bold font-mono text-amber-400 block mt-1">
                {terminalCircuits.length} Circuitos
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Iluminação, tomadas e eletrod.
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Proteção Diferencial</span>
              <span className={`text-lg font-bold font-mono block mt-1 ${rccbs.length > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {rccbs.length} {rccbs.length === 1 ? 'Interruptor' : 'Interruptores'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                {rccbs.length > 0 ? '30mA (Proteção de pessoas)' : 'Obrigatório >= 1x 30mA'}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Reserva de Espaço (RTIEBT 539.1)</span>
              <span className={`text-lg font-bold font-mono block mt-1 ${freePercentage >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {freePercentage}% <span className="text-xs font-normal text-slate-400">({freeModules}M livres)</span>
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                {freePercentage >= 20 ? '>= 20% Cumprido' : 'Recomendado min. 20%'}
              </span>
            </div>
          </div>

          {/* Space occupancy bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Ocupação do Quadro</span>
              <span>{usedModules}M ocupados de {totalModules}M totais ({100 - freePercentage}%)</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  freePercentage < 10
                    ? 'bg-red-500'
                    : freePercentage < 20
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100 - freePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 24VDC Power Balance Card (Mean Well Sizing) - Show when not residential or when PSU is present */}
      {(!isResidential || balance.totalDcSuppliedA > 0 || balance.totalDcConsumedA > 0) && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              Balanço de Carga 24VDC (Fonte Mean Well vs Consumidores)
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Taxa de Carga: <strong className={balance.loadingPercentage > 85 ? 'text-red-400' : 'text-emerald-400'}>{balance.loadingPercentage}%</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Capacidade da Fonte Mean Well</span>
              <span className="text-lg font-bold font-mono text-sky-400 block mt-1">
                {balance.totalDcSuppliedA} A <span className="text-xs text-slate-400 font-normal">({balance.totalDcSuppliedW} W)</span>
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">Tensão estabilizada 24.0V DC</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Consumo Total Estimado 24VDC</span>
              <span className="text-lg font-bold font-mono text-amber-400 block mt-1">
                {balance.totalDcConsumedA} A <span className="text-xs text-slate-400 font-normal">({balance.totalDcConsumedW} W)</span>
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">PLCs + Relés + Módulos de Controlo</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Margem Térmica Disponível</span>
              <span className={`text-lg font-bold font-mono block mt-1 ${balance.isOverloaded ? 'text-red-400' : 'text-emerald-400'}`}>
                {(balance.totalDcSuppliedA - balance.totalDcConsumedA).toFixed(2)} A
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">Reserva para expansões futuras</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Carga da Fonte</span>
              <span>{balance.loadingPercentage}% de {balance.totalDcSuppliedA}A</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  balance.loadingPercentage > 100
                    ? 'bg-red-500'
                    : balance.loadingPercentage > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(balance.loadingPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Protection & Upgrade Tips */}
          {balance.primaryProtectionRecommendation && (
            <div className="mt-4 p-3 bg-blue-950/40 border border-blue-900/50 rounded-lg text-xs flex items-start gap-2.5 text-blue-200">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-blue-100">Proteção Primária Recomendada para a Fonte:</strong>{' '}
                {balance.primaryProtectionRecommendation}.
              </div>
            </div>
          )}

          {balance.recommendedPsuUpgrade && (
            <div className="mt-3 p-3 bg-amber-950/40 border border-amber-900/50 rounded-lg text-xs flex items-start gap-2.5 text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-100">Recomendação de Upgrade de Fonte:</strong>{' '}
                {balance.recommendedPsuUpgrade}.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assistente Inteligente IEC 60898 (Curvas B, C, D & Corrente Nominal) */}
      <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 border border-amber-800/40 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Assistente Inteligente IEC 60898 (Curvas B, C, D &amp; Calibres In)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-700/60 font-semibold">
                IEC 60898-1 / RTIEBT
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Analisa automaticamente os consumos de fontes comutadas (Mean Well), PLCs (Siemens S7-1200), motores, tomadas e aquecimento, sugerindo a curva instantânea ideal e o calibre comercial com proteção contra inrush.
            </p>
          </div>
        </div>

        {onOpenIecAssistant && (
          <button
            type="button"
            onClick={onOpenIecAssistant}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition shrink-0 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Abrir Assistente IEC</span>
          </button>
        )}
      </div>

      {/* IP (EN 60529) & IK (EN 62262) Protection Verification Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Grau de Proteção IP (EN 60529) & Resistência Mecânica IK (EN 62262)</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    ipIkReport.isCompliant
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : ipIkReport.status === 'warning'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}
                >
                  {ipIkReport.isCompliant
                    ? 'CONFORME ✓'
                    : ipIkReport.status === 'warning'
                    ? 'ATENÇÃO ⚠️'
                    : 'NÃO-CONFORME ✗'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Validação de conformidade das influências externas segundo RTIEBT Quadro 51A e normas europeias de quadros.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!ipIkReport.isCompliant && ipIkReport.recommendedCorrection && onUpdateConfig && (
              <button
                type="button"
                onClick={() => {
                  onUpdateConfig({
                    ...project.config,
                    ipRating: ipIkReport.recommendedCorrection!.ipRating,
                    ikRating: ipIkReport.recommendedCorrection!.ikRating,
                    enclosureMaterial: ipIkReport.recommendedCorrection!.enclosureMaterial,
                    hasDoor: ipIkReport.recommendedCorrection!.hasDoor,
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Corrigir ({ipIkReport.requiredIp} / {ipIkReport.requiredIk})</span>
              </button>
            )}

            {onOpenIpIkVerification && (
              <button
                type="button"
                onClick={onOpenIpIkVerification}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
              >
                <span>Verificador Detalhado</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Metric Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Ambiente de Instalação</span>
            <span className="text-sm font-bold text-white block mt-1 truncate" title={ipIkReport.environment.label}>
              {ipIkReport.environment.label.split('(')[0].trim()}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1 font-mono">
              {ipIkReport.environment.rtiebtInfluences.adWater.split(' ')[0]} · {ipIkReport.environment.rtiebtInfluences.agImpact.split(' ')[0]}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Estanqueidade IP (EN 60529)</span>
            <span className={`text-lg font-bold font-mono block mt-1 ${ipIkReport.solidPass && ipIkReport.liquidPass ? 'text-emerald-400' : 'text-red-400'}`}>
              {ipIkReport.actualIp}{' '}
              <span className="text-xs text-slate-400 font-normal">
                (Mín: {ipIkReport.requiredIp})
              </span>
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              {ipIkReport.solidPass && ipIkReport.liquidPass ? 'Proteção poeiras/água conforme' : 'Proteção insuficiente'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Resistência a Impactos (IK)</span>
            <span className={`text-lg font-bold font-mono block mt-1 ${ipIkReport.ikPass ? 'text-emerald-400' : 'text-red-400'}`}>
              {ipIkReport.actualIk}{' '}
              <span className="text-xs text-slate-400 font-normal">
                ({ipIkReport.actualJoules}J / Mín: {ipIkReport.requiredJoules}J)
              </span>
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              {ipIkReport.ikPass ? 'Absorção de choque conforme' : 'Risco de rutura mecânica'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Porta Frontal & Material</span>
            <span className="text-sm font-bold text-sky-400 block mt-1">
              {project.config.hasDoor !== false ? 'Porta Fechada ✓' : 'Sem Porta (IP30)'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1 capitalize">
              {project.config.enclosureMaterial || (isResidential ? 'Termoplástico' : 'Chapa de Aço')}
            </span>
          </div>
        </div>

        {/* Warning message if non-compliant */}
        {!ipIkReport.isCompliant && (
          <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs flex items-start gap-2.5 text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-red-100">Alerta de Não-Conformidade Ambiental:</strong>{' '}
              {ipIkReport.findings.find((f) => f.type === 'error')?.message ||
                ipIkReport.findings.find((f) => f.type === 'warning')?.message ||
                'O armário não satisfaz as exigências mínimas para este local.'}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Issues & Compliance Rules List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Itens de Verificação Técnica
        </h3>

        {issues.map((issue) => (
          <div
            key={issue.id}
            className={`p-4 rounded-lg border text-xs flex items-start justify-between gap-3 ${
              issue.type === 'error'
                ? 'bg-red-950/20 border-red-800/60 text-red-200'
                : issue.type === 'warning'
                ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {issue.type === 'error' ? (
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : issue.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold block text-slate-100">{issue.title}</span>
                <p className="mt-0.5 text-slate-300 leading-relaxed">{issue.description}</p>
                {issue.suggestedAction && (
                  <p className="mt-1 text-sky-400 font-medium">
                    Sugestão: {issue.suggestedAction}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => onOpenCatalog(0)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs border border-slate-700 shrink-0 transition"
            >
              Resolver no Catálogo
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
