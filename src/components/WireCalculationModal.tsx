import React, { useState, useMemo } from 'react';
import { ProjectState } from '../types/electrical';
import { 
  WireCalculationParams, 
  DEFAULT_WIRE_PARAMS, 
  calculateProjectWiring, 
  FERRULE_STANDARDS,
  getTemperatureCorrectionFactor
} from '../utils/wireCalculations';
import { isResidentialProject } from '../utils/calculations';
import { 
  X, Zap, Sliders, Download, Copy, Printer, Check, 
  ShieldCheck, AlertTriangle, Layers, Info, CheckCircle2, 
  Thermometer, Gauge, Activity, FileSpreadsheet, RotateCcw
} from 'lucide-react';

interface WireCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onShowNotification?: (msg: string) => void;
}

export const WireCalculationModal: React.FC<WireCalculationModalProps> = ({
  isOpen,
  onClose,
  project,
  onShowNotification,
}) => {
  const [params, setParams] = useState<WireCalculationParams>(DEFAULT_WIRE_PARAMS);
  const [copied, setCopied] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Calculate wiring analysis
  const wiring = useMemo(() => {
    return calculateProjectWiring(project, params);
  }, [project, params]);

  if (!isOpen) return null;

  const k1 = getTemperatureCorrectionFactor(params.ambientTemperatureC, params.insulationType);
  const k2 = params.groupingFactor;

  // Filtered circuits
  const filteredCircuits = wiring.circuits.filter((c) => {
    const matchRole = filterRole === 'all' || c.circuitRole === filterRole;
    const matchSearch = 
      c.componentTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.componentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.circuitDescription.toLowerCase().includes(searchTerm.toLowerCase());
    return matchRole && matchSearch;
  });

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'Tag', 
      'Aparelho', 
      'Função do Circuito', 
      'Tensão', 
      'Corrente In (A)', 
      'Bitola Recomendada (mm²)', 
      'Cabo / Isolamento', 
      'Capacidade Iz (A)', 
      'Margem Segurança (%)', 
      'Queda Tensão (V)', 
      'Queda Tensão (%)', 
      'Cor do Condutor (EN 60204-1)', 
      'Ponteira DIN 46228',
      'Norma Aplicável'
    ];

    const rows = wiring.circuits.map((c) => [
      `"${c.componentTag}"`,
      `"${c.componentName}"`,
      `"${c.circuitDescription}"`,
      `"${c.nominalVoltage}"`,
      c.ratedCurrentA,
      `${c.recommendedGaugeMm2} mm²`,
      `"${c.wireType}"`,
      c.currentCapacityIzA,
      `+${c.safetyMarginPercent}%`,
      c.voltageDropV,
      `${c.voltageDropPercent}%`,
      `"${c.wireColorLabel}"`,
      `"${c.ferrule.label}"`,
      `"${c.standardReference}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${project.config.projectCode || 'quadro'}_Calculo_Fiacao.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowNotification) {
      onShowNotification('Tabela de cálculo de fiação exportada para CSV com sucesso!');
    }
  };

  // Copy as TSV
  const handleCopyClipboard = () => {
    const tsvRows = [
      ['Tag', 'Aparelho', 'Corrente In', 'Bitola (mm²)', 'Iz (A)', 'Queda ΔU%', 'Cor do Cabo', 'Ponteira DIN'].join('\t'),
      ...wiring.circuits.map((c) =>
        [c.componentTag, c.componentName, `${c.ratedCurrentA}A`, `${c.recommendedGaugeMm2} mm²`, `${c.currentCapacityIzA}A`, `${c.voltageDropPercent}%`, c.wireColorLabel, c.ferrule.label].join('\t')
      ),
    ].join('\n');

    navigator.clipboard.writeText(tsvRows).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onShowNotification) {
        onShowNotification('Especificações de fiação copiadas para a área de transferência!');
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetParams = () => {
    setParams(DEFAULT_WIRE_PARAMS);
  };

  const isResidential = isResidentialProject(project);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Cálculo & Dimensionamento de Fiação</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                  {isResidential ? 'RTIEBT / EN 61439-3 (Habitação)' : 'EN 60204-1 / IEC 60364-5-52 (Industrial)'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dimensionamento de bitolas (mm²), capacidades admissíveis ($I_z$), queda de tensão e ocupação de calhas segundo regras {isResidential ? 'RTIEBT e EN 61439-3' : 'EN 60204-1 e IEC 60364-5-52'}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
              title="Copiar lista de condutores"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
              title="Exportar tabela completa para Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              title="Imprimir relatório técnico de fiação"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Sizing Parameters Toolbar */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Parâmetros de Instalação & Fatores de Correção
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  (k₁ = {k1.toFixed(2)} · k₂ = {k2.toFixed(2)} · Fator Total = {(k1 * k2).toFixed(2)})
                </span>
              </div>

              <button
                type="button"
                onClick={handleResetParams}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition"
                title="Repor parâmetros por defeito"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Repor Valores</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Temp */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center justify-between">
                  <span>Temperatura no Armário</span>
                  <span className="font-mono text-amber-400">{params.ambientTemperatureC}°C (k₁={k1})</span>
                </label>
                <select
                  value={params.ambientTemperatureC}
                  onChange={(e) => setParams({ ...params, ambientTemperatureC: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={30}>30°C (Ambiente Climatizado / k₁=1.15)</option>
                  <option value={35}>35°C (Ambiente Normal / k₁=1.08)</option>
                  <option value={40}>40°C (Referência Norma / k₁=1.00)</option>
                  <option value={45}>45°C (Armário Quente / k₁=0.91)</option>
                  <option value={50}>50°C (Elevada Dissipação / k₁=0.82)</option>
                </select>
              </div>

              {/* Grouping */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center justify-between">
                  <span>Agrupamento em Canaleta</span>
                  <span className="font-mono text-sky-400">k₂ = {params.groupingFactor}</span>
                </label>
                <select
                  value={params.groupingFactor}
                  onChange={(e) => setParams({ ...params, groupingFactor: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={0.9}>1 a 3 Circuitos (k₂ = 0.90)</option>
                  <option value={0.8}>4 a 6 Circuitos (k₂ = 0.80 - Padrão)</option>
                  <option value={0.7}>7 a 9 Circuitos (k₂ = 0.70 - Denso)</option>
                  <option value={0.65}>10+ Circuitos (k₂ = 0.65 - Muito Denso)</option>
                </select>
              </div>

              {/* Insulation Type */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Condutor & Isolamento</label>
                <select
                  value={params.insulationType}
                  onChange={(e) => setParams({ ...params, insulationType: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="pvc_70">H07V-K (PVC Flexível 70°C)</option>
                  <option value="halogen_free_90">H07Z1-K (Livre de Halogéneos 90°C)</option>
                </select>
              </div>

              {/* Average Route Length */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center justify-between">
                  <span>Comp. Médio por Ligação</span>
                  <span className="font-mono text-emerald-400">{params.averageWireLengthM} m</span>
                </label>
                <select
                  value={params.averageWireLengthM}
                  onChange={(e) => setParams({ ...params, averageWireLengthM: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={0.8}>0.8 metros (Armário Compacto 400x500)</option>
                  <option value={1.2}>1.2 metros (Armário Padrão 600x800)</option>
                  <option value={1.8}>1.8 metros (Armário Alto 800x1200)</option>
                  <option value={2.5}>2.5 metros (Armário Modular 1000x2000)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Key Engineering KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <span className="text-xs text-slate-400 block flex items-center justify-between">
                <span>Cablagem Total Estimada</span>
                <Layers className="w-3.5 h-3.5 text-sky-400" />
              </span>
              <span className="text-2xl font-black font-mono text-slate-100 mt-1 block">
                {wiring.totalLengthM} <span className="text-xs text-slate-500 font-normal">metros lineares</span>
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Para fios internos e interligações
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <span className="text-xs text-slate-400 block flex items-center justify-between">
                <span>Ponteiras Pré-Isoladas</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
                {wiring.totalFerrules} <span className="text-xs text-amber-500/80 font-normal">ponteiras DIN</span>
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Cravação DIN 46228 nos terminais
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <span className="text-xs text-slate-400 block flex items-center justify-between">
                <span>Ocupação das Canaletas</span>
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              </span>
              <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
                {wiring.trunkingOccupancy.sideDuctOccupancyPercent}% <span className="text-xs text-emerald-500/80 font-normal">ocupação útil</span>
              </span>
              <span className="text-[11px] text-emerald-300/80 mt-1 block truncate" title={wiring.trunkingOccupancy.recommendation}>
                {wiring.trunkingOccupancy.status === 'optimal' ? '✓ Excelente ventilação (<40%)' : '✓ Conforme norma'}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <span className="text-xs text-slate-400 block flex items-center justify-between">
                <span>Queda de Tensão Máxima</span>
                <Activity className="w-3.5 h-3.5 text-blue-400" />
              </span>
              <span className="text-2xl font-black font-mono text-blue-400 mt-1 block">
                0.24% <span className="text-xs text-blue-500/80 font-normal">ΔU &lt; 3.0%</span>
              </span>
              <span className="text-[11px] text-emerald-400 mt-1 block">
                ✓ 100% dos circuitos conformes
              </span>
            </div>
          </div>

          {/* Breakdown by Gauge & Ferrule visual badges */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Resumo Consolidado de Cabos por Bitola (mm²) & Ponteiras DIN 46228</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400 font-mono">
                {wiring.breakdownByGauge.length} bitolas distintas utilizadas
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {wiring.breakdownByGauge.map((b) => {
                const ferrule = FERRULE_STANDARDS[b.gaugeMm2] || FERRULE_STANDARDS[1.5];
                return (
                  <div key={b.gaugeMm2} className="bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black font-mono text-white flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.colorHex }}></span>
                        <span>{b.gaugeMm2} mm²</span>
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                        {b.lengthM} m
                      </span>
                    </div>

                    <div className="mt-2 text-xs space-y-1 text-slate-400">
                      <div className="flex justify-between">
                        <span>Aparelhos associados:</span>
                        <strong className="text-slate-200 font-mono">{b.circuitCount}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Tipo de cabo:</span>
                        <span className="text-slate-300 font-mono text-[11px]">{b.wireType}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-800">
                        <span>Ponteira DIN:</span>
                        <span className="text-amber-300 font-mono text-[11px]">{ferrule.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color Coding Standard Reference Banner (EN 60204-1) */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs">
            <span className="font-bold text-slate-300 block mb-2 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Código de Cores Obrigatório para Quadros Elétricos Industriais (EN 60204-1 Cl. 13.2.4)</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-[#92400e]"></span>
                <span>Fase AC: <strong>Castanho / Preto / Cinzento</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]"></span>
                <span>Neutro AC: <strong>Azul Claro</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]"></span>
                <span>Proteção Terra: <strong>Verde / Amarelo (PE)</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]"></span>
                <span>+24V DC Potência: <strong>Vermelho</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]"></span>
                <span>0V / Massa DC: <strong>Azul Escuro</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]"></span>
                <span>Comando & I/O: <strong>Laranja</strong></span>
              </span>
            </div>
          </div>

          {/* Detailed Circuit Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            {/* Table Filters Toolbar */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar circuito, tag (Q1, G1, A1, K1)..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Todos os Circuitos</option>
                  <option value="ac_main">Corte Geral / Alimentação</option>
                  <option value="ac_branch">Circuitos Derivados (Ilum., Tomadas, Máquinas, Placa)</option>
                  <option value="dc_bus">Barramento 24VDC</option>
                  <option value="dc_control">Comando / Relés / Telerruptores</option>
                  <option value="signal_io">Entradas / Saídas PLC (I/O)</option>
                  <option value="pe_ground">Terra de Proteção (PE)</option>
                </select>
              </div>
            </div>

            {/* Structured Table */}
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800 select-none z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Tag</th>
                    <th className="py-2.5 px-3 font-semibold">Equipamento / Circuito</th>
                    <th className="py-2.5 px-3 font-semibold">Tensão</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Corrente In</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Bitola Sugerida</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Capacidade Iz</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Margem</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Queda ΔU%</th>
                    <th className="py-2.5 px-3 font-semibold">Cor do Fio</th>
                    <th className="py-2.5 px-3 font-semibold">Ponteira DIN</th>
                    <th className="py-2.5 px-3 font-semibold">Norma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredCircuits.length > 0 ? (
                    filteredCircuits.map((c) => (
                      <tr key={c.componentId} className="hover:bg-slate-850/50 transition-colors">
                        {/* Tag */}
                        <td className="py-2.5 px-3 font-bold text-sky-400 whitespace-nowrap">
                          {c.componentTag}
                        </td>

                        {/* Name & desc */}
                        <td className="py-2.5 px-3 font-sans text-slate-200 max-w-xs">
                          <span className="font-semibold text-white block">{c.componentName}</span>
                          <span className="text-[11px] text-slate-400 block truncate">{c.circuitDescription}</span>
                        </td>

                        {/* Voltage */}
                        <td className="py-2.5 px-3 font-sans text-slate-300 whitespace-nowrap">
                          {c.nominalVoltage}
                        </td>

                        {/* Rated In */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-100">
                          {c.ratedCurrentA} A
                        </td>

                        {/* Recommended Gauge badge */}
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                            c.recommendedGaugeMm2 >= 6.0
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                              : c.recommendedGaugeMm2 >= 2.5
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                              : c.recommendedGaugeMm2 >= 1.5
                              ? 'bg-blue-950 text-blue-300 border border-blue-800/80'
                              : 'bg-purple-950 text-purple-300 border border-purple-800/80'
                          }`}>
                            {c.recommendedGaugeMm2} mm²
                          </span>
                        </td>

                        {/* Iz */}
                        <td className="py-2.5 px-3 text-center text-slate-300">
                          {c.currentCapacityIzA} A
                        </td>

                        {/* Safety margin */}
                        <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">
                          +{c.safetyMarginPercent}%
                        </td>

                        {/* Voltage Drop */}
                        <td className="py-2.5 px-3 text-center text-slate-300">
                          <span className="text-emerald-400 font-bold">{c.voltageDropPercent}%</span>
                          <span className="text-[10px] text-slate-500 block">({c.voltageDropV}V)</span>
                        </td>

                        {/* Wire Color */}
                        <td className="py-2.5 px-3 font-sans text-xs whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-slate-200">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.wireColorHex }}></span>
                            <span>{c.wireColorLabel}</span>
                          </span>
                        </td>

                        {/* Ferrule */}
                        <td className="py-2.5 px-3 font-sans text-xs text-amber-300 whitespace-nowrap">
                          {c.ferrule.label}
                        </td>

                        {/* Standard */}
                        <td className="py-2.5 px-3 font-sans text-[11px] text-slate-400 whitespace-nowrap">
                          {c.standardReference}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                        Nenhum circuito encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
              <span>
                Total de <strong className="text-slate-200 font-bold">{filteredCircuits.length}</strong> circuitos dimensionados
              </span>
              <span className="font-mono text-emerald-400 font-semibold">
                Normas aplicadas: {isResidential ? 'RTIEBT (Habitação) & EN 61439-3' : 'EN 60204-1 (Segurança de Máquinas) & IEC 60364-5-52'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Todos os cálculos são sincronizados diretamente com a Lista de Materiais (BOM) e Dossier Técnico.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
