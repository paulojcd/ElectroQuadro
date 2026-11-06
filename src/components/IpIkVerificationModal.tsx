import React, { useState } from 'react';
import { ProjectState, EnclosureConfig, InstallationEnvironment, IkRating, EnclosureMaterial } from '../types/electrical';
import { 
  verifyEnclosureIpIk, 
  ENVIRONMENT_SPECS, 
  IK_ENERGY_JOULES, 
  IP_SOLID_DESCRIPTIONS, 
  IP_LIQUID_DESCRIPTIONS,
  parseIpRating,
  normalizeIkRating
} from '../utils/ipIkVerification';
import { 
  X, Shield, ShieldCheck, ShieldAlert, AlertTriangle, Check, 
  Sparkles, Info, Droplets, HardHat, Compass, Box, Hammer, ArrowRight, RefreshCw 
} from 'lucide-react';

interface IpIkVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onUpdateConfig: (updatedConfig: EnclosureConfig) => void;
  onShowNotification?: (msg: string) => void;
}

export const IpIkVerificationModal: React.FC<IpIkVerificationModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateConfig,
  onShowNotification,
}) => {
  const currentConfig = project.config;

  // Selected environment for what-if simulation (initializes to current project environment)
  const [selectedEnv, setSelectedEnv] = useState<InstallationEnvironment>(() => {
    return currentConfig.installationEnvironment || 
      (currentConfig.applicationType === 'residential' ? 'residential_indoor_dry' : 'industrial_clean_control');
  });

  const [simIp, setSimIp] = useState<string>(currentConfig.ipRating || 'IP40');
  const [simIk, setSimIk] = useState<IkRating>(normalizeIkRating(currentConfig.ikRating));
  const [simMaterial, setSimMaterial] = useState<EnclosureMaterial>(currentConfig.enclosureMaterial || 'thermoplastic');
  const [simHasDoor, setSimHasDoor] = useState<boolean>(currentConfig.hasDoor !== false);

  if (!isOpen) return null;

  // Create mock config to evaluate
  const evalConfig: EnclosureConfig = {
    ...currentConfig,
    installationEnvironment: selectedEnv,
    ipRating: simIp as any,
    ikRating: simIk,
    enclosureMaterial: simMaterial,
    hasDoor: simHasDoor,
  };

  const report = verifyEnclosureIpIk(evalConfig);
  const spec = report.environment;
  const parsedSimIp = parseIpRating(simIp);

  // Apply to project
  const handleApplyToProject = () => {
    const updated: EnclosureConfig = {
      ...currentConfig,
      installationEnvironment: selectedEnv,
      ipRating: simIp as any,
      ikRating: simIk,
      enclosureMaterial: simMaterial,
      hasDoor: simHasDoor,
    };
    onUpdateConfig(updated);
    if (onShowNotification) {
      onShowNotification(`Grau de proteção ${simIp} e ${simIk} aplicados ao projeto com sucesso!`);
    }
    onClose();
  };

  const handleAutoFix = () => {
    if (report.recommendedCorrection) {
      setSimIp(report.recommendedCorrection.ipRating);
      setSimIk(report.recommendedCorrection.ikRating);
      setSimMaterial(report.recommendedCorrection.enclosureMaterial);
      setSimHasDoor(report.recommendedCorrection.hasDoor);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Verificador de Grau de Proteção IP & Resistência a Impactos IK
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  EN 60529 · EN 62262 · RTIEBT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Avaliação de conformidade das influências externas (água, pó, choque mecânico) com base no ambiente de instalação.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Overall Verdict Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
              report.isCompliant
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : report.status === 'warning'
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                : 'bg-red-950/40 border-red-500/50 text-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 ${
                  report.isCompliant
                    ? 'bg-emerald-500 text-slate-950'
                    : report.status === 'warning'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-red-500 text-white'
                }`}
              >
                {report.isCompliant ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : report.status === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <ShieldAlert className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {report.isCompliant
                      ? 'Invólucro Totalmente Adequado ao Ambiente de Instalação'
                      : report.status === 'warning'
                      ? 'Atenção: Margem de Segurança Reduzida ou Porta Ausente'
                      : 'NÃO-CONFORMIDADE CRÍTICA: Invólucro Incompatível com o Ambiente'}
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 text-slate-200">
                    Exigido: {spec.minIpRating} / {spec.minIkRating} · Atual: {simIp} / {simIk}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {report.isCompliant
                    ? `O invólucro atende a todas as exigências das normas ${spec.normativeReference} para o local "${spec.label}". Suporta impactos de ${report.actualJoules}J (mínimo ${report.requiredJoules}J) e estanqueidade ${report.effectiveIp}.`
                    : report.findings.find((f) => f.type === 'error')?.message ||
                      report.findings.find((f) => f.type === 'warning')?.message ||
                      'O armário não cumpre os requisitos mínimos normativos para o ambiente.'}
                </p>
              </div>
            </div>

            {!report.isCompliant && report.recommendedCorrection && (
              <button
                type="button"
                onClick={handleAutoFix}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shrink-0 transition shadow-md shadow-blue-500/20 whitespace-nowrap self-stretch md:self-auto justify-center"
              >
                <Sparkles className="w-4 h-4" />
                <span>Auto-Corrigir para {spec.minIpRating} / {spec.minIkRating}</span>
              </button>
            )}
          </div>

          {/* Controls: Environment Selector & Enclosure Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Environment Selection */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Compass className="w-4 h-4" />
                  <span>1. Ambiente de Serviço & Local de Instalação</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">RTIEBT Quadro 51A</span>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Selecione o Ambiente de Instalação:
                </label>
                <select
                  value={selectedEnv}
                  onChange={(e) => setSelectedEnv(e.target.value as InstallationEnvironment)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                >
                  <optgroup label="🏠 Habitação & Residencial (RTIEBT)">
                    <option value="residential_indoor_dry">Habitação Interior Seco (Salas, Quartos, Hall) · Mín IP40/IK07</option>
                    <option value="residential_indoor_damp">Habitação Zonas Húmidas (Garagem, Cave, Lavandaria) · Mín IP44/IK07</option>
                    <option value="residential_outdoor_sheltered">Residencial Exterior Abrigado (Alpendre, Varanda) · Mín IP55/IK08</option>
                    <option value="residential_outdoor_exposed">Residencial Exterior Desabrigado (Jardim, Muro, Wallbox EV) · Mín IP65/IK08</option>
                  </optgroup>
                  <optgroup label="🏢 Edifícios Comerciais & Terciário">
                    <option value="commercial_office">Comercial / Escritórios / Salas Técnicas Limpas · Mín IP40/IK07</option>
                    <option value="commercial_kitchen_wash">Cozinhas Comerciais & Zonas de Lavagem · Mín IP55/IK08</option>
                  </optgroup>
                  <optgroup label="🏭 Automação & Indústria (EN 60204-1)">
                    <option value="industrial_clean_control">Indústria Ligeira / Sala de Controlo & Autómatos · Mín IP54/IK08</option>
                    <option value="industrial_dusty_workshop">Oficina com Poeiras (Serralharia, Carpintaria) · Mín IP65/IK08</option>
                    <option value="industrial_heavy_washdown">Indústria Alimentar / Lavagem a Alta Pressão · Mín IP66/IK09</option>
                    <option value="outdoor_severe_industrial">Exterior Industrial Severo & Marítimo · Mín IP66/IK10</option>
                  </optgroup>
                </select>
              </div>

              {/* Environmental Details */}
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800/80 text-xs space-y-2">
                <p className="text-slate-300 leading-relaxed">{spec.description}</p>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-200">Locais típicos:</strong> {spec.typicalLocations}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">Água / Humidade</span>
                    <span className="font-mono text-xs font-bold text-sky-400 mt-0.5 block">{spec.rtiebtInfluences.adWater.split(' ')[0]}</span>
                    <span className="text-[9px] text-slate-500 block truncate">{spec.rtiebtInfluences.adWater}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">Corpos Sólidos</span>
                    <span className="font-mono text-xs font-bold text-amber-400 mt-0.5 block">{spec.rtiebtInfluences.aeSolids.split(' ')[0]}</span>
                    <span className="text-[9px] text-slate-500 block truncate">{spec.rtiebtInfluences.aeSolids}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">Impacto Mecânico</span>
                    <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5 block">{spec.rtiebtInfluences.agImpact.split(' ')[0]}</span>
                    <span className="text-[9px] text-slate-500 block truncate">{spec.rtiebtInfluences.agImpact}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Enclosure Properties */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Box className="w-4 h-4" />
                  <span>2. Características do Invólucro a Testar</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">EN 60529 / EN 62262</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Grau de Proteção (IP):
                  </label>
                  <select
                    value={simIp}
                    onChange={(e) => setSimIp(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="IP40">IP40 (Residencial c/ Porta)</option>
                    <option value="IP30">IP30 (Residencial sem Porta)</option>
                    <option value="IP44">IP44 (Zonas Húmidas / Garagem)</option>
                    <option value="IP54">IP54 (Indústria Ligeira)</option>
                    <option value="IP55">IP55 (Estanque a Poeiras/Salpicos)</option>
                    <option value="IP65">IP65 (Totalmente Estanque ao Pó)</option>
                    <option value="IP66">IP66 (Jatos Fortes de Água / Vagas)</option>
                    <option value="IP67">IP67 (Imersão Temporária)</option>
                    <option value="IP20">IP20 (Aberto / Interior de Armário)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Resistência a Impactos (IK):
                  </label>
                  <select
                    value={simIk}
                    onChange={(e) => setSimIk(e.target.value as IkRating)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="IK05">IK05 (0.7 Joules - Interior Ligeiro)</option>
                    <option value="IK07">IK07 (2.0 Joules - Padrão Habitação)</option>
                    <option value="IK08">IK08 (5.0 Joules - Padrão Industrial)</option>
                    <option value="IK09">IK09 (10.0 Joules - Elevado Impacto)</option>
                    <option value="IK10">IK10 (20.0 Joules - Máxima Robustez)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Material do Invólucro:
                  </label>
                  <select
                    value={simMaterial}
                    onChange={(e) => setSimMaterial(e.target.value as EnclosureMaterial)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="thermoplastic">Termoplástico ABS / PC</option>
                    <option value="sheet_steel">Chapa de Aço Pintada</option>
                    <option value="polyester">Poliéster c/ Fibra Vidro</option>
                    <option value="stainless_steel">Aço Inox AISI 304/316</option>
                    <option value="aluminium">Alumínio Naval</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={simHasDoor}
                      onChange={(e) => setSimHasDoor(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      Porta Frontal Instalada
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Sem porta: IP40 desclassifica para IP30
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Detailed Engineering Comparison Cards (Solids, Liquids, Impact) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: 1st Digit (Solids) */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                report.solidPass
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-red-950/20 border-red-800/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span>1º Dígito: Sólidos & Pó</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      report.solidPass ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {report.solidPass ? 'CONFORME ✓' : 'NÃO CONFORME ✗'}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Atual (Efetivo)</span>
                    <span className="text-xl font-mono font-bold text-white">
                      IP{parsedSimIp.solid}X
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Mínimo Exigido</span>
                    <span className="text-xl font-mono font-bold text-sky-400">
                      IP{spec.minIpSolid}X
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {IP_SOLID_DESCRIPTIONS[parsedSimIp.solid]?.detail}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
                Norma: EN 60529 Secção 13
              </div>
            </div>

            {/* Card 2: 2nd Digit (Liquids) */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                report.liquidPass
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-red-950/20 border-red-800/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-sky-400" />
                    <span>2º Dígito: Água & Humidade</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      report.liquidPass ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {report.liquidPass ? 'CONFORME ✓' : 'NÃO CONFORME ✗'}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Atual</span>
                    <span className="text-xl font-mono font-bold text-white">
                      IPX{parsedSimIp.liquid}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Mínimo Exigido</span>
                    <span className="text-xl font-mono font-bold text-sky-400">
                      IPX{spec.minIpLiquid}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {IP_LIQUID_DESCRIPTIONS[parsedSimIp.liquid]?.detail}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
                Influência: {spec.rtiebtInfluences.adWater}
              </div>
            </div>

            {/* Card 3: Mechanical Impact IK */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                report.ikPass
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-red-950/20 border-red-800/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Hammer className="w-4 h-4 text-emerald-400" />
                    <span>Resistência IK: Impactos</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      report.ikPass ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {report.ikPass ? 'CONFORME ✓' : 'NÃO CONFORME ✗'}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Atual</span>
                    <span className="text-xl font-mono font-bold text-white">
                      {simIk} <span className="text-xs text-slate-400">({report.actualJoules} J)</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Mínimo Exigido</span>
                    <span className="text-xl font-mono font-bold text-sky-400">
                      {spec.minIkRating} <span className="text-xs text-slate-400">({report.requiredJoules} J)</span>
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {IK_ENERGY_JOULES[simIk]?.testDescription}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
                Norma: EN 62262 ({spec.rtiebtInfluences.agImpact})
              </div>
            </div>
          </div>

          {/* Detailed Findings List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Relatório de Ensaios & Justificação Normativa
            </h4>

            {report.findings.map((f, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                  f.type === 'error'
                    ? 'bg-red-950/20 border-red-800/60 text-red-200'
                    : f.type === 'warning'
                    ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                {f.type === 'error' ? (
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                ) : f.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-100">{f.title}</span>
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                      {f.normativeStandard}
                    </span>
                  </div>
                  <p className="mt-0.5 leading-relaxed opacity-90">{f.message}</p>
                  {f.suggestedAction && (
                    <p className="mt-1 text-sky-400 font-medium">
                      Ação Recomendada: {f.suggestedAction}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-400">
            Ambiente atual: <strong className="text-slate-200">{spec.label}</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleApplyToProject}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              <Check className="w-4 h-4" />
              <span>Gravar Especificações no Projeto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
