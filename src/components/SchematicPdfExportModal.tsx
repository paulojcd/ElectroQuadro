import React, { useState } from 'react';
import { ProjectState } from '../types/electrical';
import { downloadSchematicPdf, SchematicPdfExportOptions } from '../utils/schematicPdfExporter';
import { 
  FileText, Download, Printer, Check, X, Sliders, Layers, 
  Sparkles, CheckSquare, Square, Zap, Cpu, Building, User, Calendar, 
  Euro, Info, ShieldCheck, RefreshCw, Eye, Box, Wrench, Shield
} from 'lucide-react';

interface SchematicPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
}

export const SchematicPdfExportModal: React.FC<SchematicPdfExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<SchematicPdfExportOptions>({
    theme: 'light',
    includeCover: true,
    includeLayout2D: true,
    includeControlPanel: true,
    includeBreakersTerminalsSchematic: true,
    includePowerSchematic: true,
    includeControlSchematic: true,
    includeEngineeringReport: true,
    includeWireSchedule: true,
    includeBom: true,
    includePrices: true,
    includeComplianceDeclaration: true,
    paperFormat: 'a4',
    companyName: 'Eletrotécnica & Automação Industrial, Lda.',
    technicianName: project.config.designerName || 'Engenheiro Responsável / Instalador Credenciado',
    clientName: project.config.clientName || 'Cliente Industrial / Linha de Produção',
    revision: 'Rev. 1.0',
    customNotes: project.config.notes || 'Quadro elétrico montado e ensaiado segundo as normas EN 61439-1 e EN 61439-2. Todos os condutores identificados com anilhas marcadoras de acordo com o esquema unifilar.',
  });

  const [activeTab, setActiveTab] = useState<'options' | 'preview'>('options');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectAll = (select: boolean) => {
    setOptions((prev) => ({
      ...prev,
      includeCover: select,
      includeLayout2D: select,
      includeControlPanel: select,
      includeBreakersTerminalsSchematic: select,
      includePowerSchematic: select,
      includeControlSchematic: select,
      includeEngineeringReport: select,
      includeWireSchedule: select,
      includeBom: select,
      includeComplianceDeclaration: select,
    }));
  };

  const handleExport = async () => {
    setIsGenerating(true);
    setSuccessMessage(null);
    try {
      await downloadSchematicPdf(project, options);
      setSuccessMessage('Dossier Técnico PDF gerado e descarregado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Exportar Todo o Projeto (PDF de Apresentação Técnica & BOM)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                  EN 61439 / CE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dossier completo formatado para impressão ou entrega formal ao cliente, com capa executiva, layout 2D com cotas, esquemas unifilares, caderno de cablagem, lista BOM e termo de conformidade.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Quick Select */}
        <div className="flex flex-wrap items-center justify-between px-6 py-2 bg-slate-950/50 border-b border-slate-800 text-xs gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('options')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'options'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configurações do Dossier</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'preview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Estrutura das Pranchas (Páginas)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-850"
            >
              Selecionar Tudo (Dossier Completo)
            </button>
            <button
              type="button"
              onClick={() => {
                setOptions((prev) => ({
                  ...prev,
                  includeCover: false,
                  includeLayout2D: false,
                  includeBreakersTerminalsSchematic: true,
                  includePowerSchematic: true,
                  includeControlSchematic: false,
                  includeEngineeringReport: false,
                  includeWireSchedule: false,
                  includeBom: true,
                  includeComplianceDeclaration: false,
                }));
              }}
              className="text-[11px] text-slate-400 hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-800"
            >
              Apenas Esquemas + BOM
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60">
          {activeTab === 'options' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Pranchas e Conteúdo a Incluir (6 cols) */}
              <div className="md:col-span-6 flex flex-col gap-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      1. Pranchas a Incluir no Documento PDF
                    </span>
                  </label>

                  <div className="space-y-2">
                    {/* Capa de Apresentação Técnica */}
                    <label className="flex items-start gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800/90 hover:border-slate-700 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={options.includeCover ?? true}
                        onChange={(e) => setOptions({ ...options, includeCover: e.target.checked })}
                        className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            Capa Executiva de Apresentação Técnica
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">Capa</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                          Identificação formal com logótipo, metadados do cliente, dados elétricos nominais e índice do projeto.
                        </p>
                      </div>
                    </label>

                    {/* Layout Mecânico 2D */}
                    <label className="flex items-start gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800/90 hover:border-slate-700 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={options.includeLayout2D ?? true}
                        onChange={(e) => setOptions({ ...options, includeLayout2D: e.target.checked })}
                        className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Box className="w-3.5 h-3.5 text-sky-400" />
                            Prancha 01: Disposição Física & Layout Mecânico 2D
                          </span>
                          <span className="text-[10px] font-mono text-sky-300 bg-sky-950/60 px-1.5 rounded border border-sky-800">Cotas L×A</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                          Desenho 2D com invólucro, calhas DIN, canaletas técnicas ranhuradas, componentes montados e bucins.
                        </p>
                      </div>
                    </label>

                    {/* Porta Frontal, Painel HMI & Mapa de Furação CNC */}
                    <label className="flex items-start gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800/90 hover:border-slate-700 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={options.includeControlPanel ?? true}
                        onChange={(e) => setOptions({ ...options, includeControlPanel: e.target.checked })}
                        className="mt-0.5 rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-emerald-400" />
                            Prancha 02: Porta Frontal, Painel HMI & Furação CNC
                          </span>
                          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 rounded border border-emerald-800">CNC / Cotas</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                          Layout da porta com ecrãs HMI, botoneiras Ø22.5mm, cotas de centro (X, Y) e tabela de furação CNC.
                        </p>
                      </div>
                    </label>

                    {/* Breakers to Terminals Unifilar */}
                    <label className="flex items-start gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800/90 hover:border-slate-700 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={options.includeBreakersTerminalsSchematic ?? true}
                        onChange={(e) => setOptions({ ...options, includeBreakersTerminalsSchematic: e.target.checked })}
                        className="mt-0.5 rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-purple-400" />
                            Prancha 02: Unifilar Disjuntores ➔ Bornes X1
                          </span>
                          <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-1.5 rounded border border-purple-800">Auto-Router</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                          Conexões calculadas pelo Auto-Router (IEC 60446 / EN 60204-1) entre disjuntores e réguas de bornes.
                        </p>
                      </div>
                    </label>

                    {/* Power Schematic */}
                    <label className="flex items-start gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800/90 hover:border-slate-700 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={options.includePowerSchematic ?? true}
                        onChange={(e) => setOptions({ ...options, includePowerSchematic: e.target.checked })}
                        className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-sky-400" />
                            Prancha 03: Esquema Geral de Potência (AC/DC)
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">IEC 60617</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                          Entrada de rede, proteção geral Q0, diferencial residual 30mA, SPD e fonte Mean Well.
                        </p>
                      </div>
                    </label>

                    {/* Control Schematic */}
                    <label className="flex items-start gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800/90 hover:border-slate-700 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={options.includeControlSchematic ?? true}
                        onChange={(e) => setOptions({ ...options, includeControlSchematic: e.target.checked })}
                        className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                            Prancha 04: Distribuição 24VDC & Siemens PLC (I/O)
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">Automação</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                          Barramento de controlo 24VDC SELV/PELV, autómato S7-1200/LOGO! e sinais de E/S.
                        </p>
                      </div>
                    </label>

                    {/* Engineering Report & IP/IK */}
                    <label className="flex items-start gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800/90 hover:border-slate-700 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={options.includeEngineeringReport ?? true}
                        onChange={(e) => setOptions({ ...options, includeEngineeringReport: e.target.checked })}
                        className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-blue-400" />
                            Prancha 05: Relatório de Engenharia & Conformidade IP/IK
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">EN 61439</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                          Verificação ambiental IP/IK, balanço de potências 24VDC, tabela de bucins e notas técnicas.
                        </p>
                      </div>
                    </label>

                    {/* Wire Schedule (Caderno de Cablagem) */}
                    <label className="flex items-start gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800/90 hover:border-slate-700 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={options.includeWireSchedule ?? true}
                        onChange={(e) => setOptions({ ...options, includeWireSchedule: e.target.checked })}
                        className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                            Prancha 06: Caderno de Cablagem Lógica & Marcadores
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">De / Para</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                          Tabela de fios com marcadores de anilha (W01), secção em mm², ponteiras DIN 46228 e calhas.
                        </p>
                      </div>
                    </label>

                    {/* BOM Table */}
                    <label className="flex items-start gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800/90 hover:border-slate-700 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={options.includeBom ?? true}
                        onChange={(e) => setOptions({ ...options, includeBom: e.target.checked })}
                        className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            Prancha 07: Lista Consolidada de Materiais (BOM)
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">Orçamento</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                          Tabela de equipamentos com referências, part numbers, módulos DIN, bitolas e quantitativos.
                        </p>
                      </div>
                    </label>

                    {/* Declaração de Conformidade CE */}
                    <label className="flex items-start gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800/90 hover:border-slate-700 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={options.includeComplianceDeclaration ?? true}
                        onChange={(e) => setOptions({ ...options, includeComplianceDeclaration: e.target.checked })}
                        className="mt-0.5 rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Prancha 08: Declaração de Conformidade CE & Ensaios
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400">Certificado</span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                          Termo formal de responsabilidade técnica segundo EN 61439-1 com ensaios individuais e assinaturas.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Visual Theme & Prices */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-2.5 uppercase tracking-wider">
                    2. Configurações de Apresentação
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <button
                      type="button"
                      onClick={() => setOptions({ ...options, theme: 'light' })}
                      className={`p-2.5 rounded-lg border text-left transition ${
                        options.theme === 'light'
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">Documento Técnico (Fundo Branco)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Ideal para impressão e arquivo formal</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOptions({ ...options, theme: 'dark' })}
                      className={`p-2.5 rounded-lg border text-left transition ${
                        options.theme === 'dark'
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">CAD Blueprint (Fundo Escuro)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Estilo moderno de visualização digital</div>
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={options.includePrices ?? true}
                      onChange={(e) => setOptions({ ...options, includePrices: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                    />
                    <Euro className="w-3.5 h-3.5 text-amber-400" />
                    <span>Incluir valores financeiros e orçamentação (€) na lista BOM</span>
                  </label>
                </div>
              </div>

              {/* Right Column: Metadados do Projeto e Carimbo (6 cols) */}
              <div className="md:col-span-6 flex flex-col gap-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-400" />
                    3. Metadados do Projeto & Carimbo de Engenharia
                  </label>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Empresa Instaladora / Fabricante:</label>
                      <input
                        type="text"
                        value={options.companyName}
                        onChange={(e) => setOptions({ ...options, companyName: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-blue-500"
                        placeholder="Nome da sua empresa técnica..."
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Técnico Projetista / Instalador Credenciado:</label>
                      <input
                        type="text"
                        value={options.technicianName}
                        onChange={(e) => setOptions({ ...options, technicianName: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-blue-500"
                        placeholder="Nome do engenheiro responsável..."
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Cliente / Local de Instalação:</label>
                      <input
                        type="text"
                        value={options.clientName}
                        onChange={(e) => setOptions({ ...options, clientName: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-blue-500"
                        placeholder="Nome da empresa ou cliente final..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Revisão do Dossier:</label>
                        <input
                          type="text"
                          value={options.revision}
                          onChange={(e) => setOptions({ ...options, revision: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Formato de Papel:</label>
                        <select
                          value={options.paperFormat}
                          onChange={(e) => setOptions({ ...options, paperFormat: e.target.value as 'a4' | 'a3' })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-hidden focus:border-blue-500"
                        >
                          <option value="a4">A4 Paisagem (297×210 mm)</option>
                          <option value="a3">A3 Paisagem (420×297 mm)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Notas do Projeto para o Relatório:</label>
                      <textarea
                        rows={3}
                        value={options.customNotes}
                        onChange={(e) => setOptions({ ...options, customNotes: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-hidden focus:border-blue-500"
                        placeholder="Instruções de montagem, ensaios de isolamento e continuidade..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW TAB */
            <div className="space-y-4">
              <div className="p-3 bg-blue-950/40 border border-blue-900/50 rounded-xl text-xs text-blue-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  O documento final será compilado em formato <strong>PDF Paisagem de Engenharia</strong> de alta resolução, pronto para apresentação ao cliente, arquivamento técnico ou submissão regulamentar.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {options.includeCover && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 font-mono">CAPA</span>
                      <h4 className="text-xs font-bold text-white mt-1">Capa Executiva</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Título em destaque, metadados do cliente e índice do dossier.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Incluído no PDF
                    </div>
                  </div>
                )}

                {options.includeLayout2D && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-sky-400 font-mono">PRANCHA 01</span>
                      <h4 className="text-xs font-bold text-white mt-1">Layout Mecânico 2D</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Desenho frontal do quadro com calhas DIN, cotas L×A e bucins.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Incluído no PDF
                    </div>
                  </div>
                )}

                {options.includeControlPanel && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">PRANCHA 02</span>
                      <h4 className="text-xs font-bold text-white mt-1">Porta Frontal & HMI</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Layout da porta, botoneiras Ø22.5mm, cotas de centro e mapa de furação CNC.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Incluído no PDF
                    </div>
                  </div>
                )}

                {options.includeBreakersTerminalsSchematic && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-purple-400 font-mono">PRANCHA 02</span>
                      <h4 className="text-xs font-bold text-white mt-1">Disjuntores ➔ Bornes</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Cablagem ortogonal Auto-Router e conformidade IEC 60446 / EN 60204-1.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Incluído no PDF
                    </div>
                  </div>
                )}

                {options.includePowerSchematic && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-sky-400 font-mono">PRANCHA 03</span>
                      <h4 className="text-xs font-bold text-white mt-1">Esquema Unifilar Geral</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Entrada de rede, proteções AC e fonte Mean Well com carimbo técnico.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Incluído no PDF
                    </div>
                  </div>
                )}

                {options.includeControlSchematic && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">PRANCHA 04</span>
                      <h4 className="text-xs font-bold text-white mt-1">Distribuição 24VDC & PLC</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Esquema funcional de controlo, CPU Siemens S7-1200/LOGO!, I/O e bornes.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Incluído no PDF
                    </div>
                  </div>
                )}

                {options.includeEngineeringReport && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 font-mono">PRANCHA 05</span>
                      <h4 className="text-xs font-bold text-white mt-1">Dossier & IP/IK</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Balanço de potências, verificação do ambiente e mapa de bucins.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Incluído no PDF
                    </div>
                  </div>
                )}

                {options.includeWireSchedule && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-400 font-mono">PRANCHA 06</span>
                      <h4 className="text-xs font-bold text-white mt-1">Caderno de Fiação</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Marcadores de anilha, cores normativas e ponteiras DIN 46228.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Incluído no PDF
                    </div>
                  </div>
                )}

                {options.includeBom && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 font-mono">PRANCHA 07</span>
                      <h4 className="text-xs font-bold text-white mt-1">Lista de Materiais (BOM)</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Tabela consolidada com referências de encomenda e quantitativos.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Incluído no PDF
                    </div>
                  </div>
                )}

                {options.includeComplianceDeclaration && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">PRANCHA 08</span>
                      <h4 className="text-xs font-bold text-white mt-1">Conformidade CE</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Termo de responsabilidade técnica e registo de ensaios de rotina.
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Incluído no PDF
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-semibold animate-in fade-in duration-300">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/90 gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Dossier de Engenharia:</span>
            <span className="text-white font-mono font-bold bg-slate-800 px-2 py-0.5 rounded">
              {project.config.projectCode || 'PROJ-001'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              title="Abrir diálogo de impressão do navegador"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>A compilar pranchas e a gerar PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Gerar e Descarregar PDF Completo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
