import React, { useState } from 'react';
import { ProjectState, PlacedComponent, CableGland } from '../types/electrical';
import { GLAND_SPECS } from '../utils/glandUtils';
import { getConsolidatedBom } from '../utils/bomUtils';
import { exportFullProjectTechnicalPdf } from '../utils/schematicPdfExporter';
import { getDefaultControlPanelConfig } from '../data/controlPanelCatalog';
import { 
  X, Printer, Sliders, Check, Eye, FileText, Download, 
  Building, User, Calendar, ShieldCheck, Layers, Zap, 
  Euro, Sparkles, CheckSquare, Square, RotateCcw, Box, Wrench
} from 'lucide-react';

export interface PrintOptions {
  companyName: string;
  technicianName: string;
  reportTitle: string;
  clientName: string;
  revision: string;
  date: string;
  orientation: 'portrait' | 'landscape';
  fontSize: 'compact' | 'normal';
  
  // Sections to include
  includeCover: boolean;
  includeLayout2D: boolean;
  includeDoorIdMap: boolean;
  includeControlPanel: boolean;
  includeBom: boolean;
  includePrices: boolean;
  includePowerBalance: boolean;
  includeGlands: boolean;
  includeSchematicSummary: boolean;
  includeComplianceDeclaration: boolean;
  includeNotes: boolean;
  customNotes: string;
}

interface PrintCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onShowNotification?: (msg: string) => void;
}

export const PrintCustomizationModal: React.FC<PrintCustomizationModalProps> = ({
  isOpen,
  onClose,
  project,
  onShowNotification,
}) => {
  const [options, setOptions] = useState<PrintOptions>({
    companyName: 'Eletrotécnica & Automação Industrial, Lda.',
    technicianName: project.config.designerName || 'Técnico Responsável / Instalador Credenciado',
    reportTitle: 'Dossier Técnico & Certificação de Quadro Elétrico',
    clientName: project.config.clientName || 'Instalação Industrial / Linha de Produção',
    revision: 'Rev. 1.0',
    date: project.config.date || new Date().toISOString().split('T')[0],
    orientation: 'portrait',
    fontSize: 'normal',

    includeCover: true,
    includeLayout2D: true,
    includeDoorIdMap: true,
    includeControlPanel: true,
    includeBom: true,
    includePrices: false, // Default false for clean client reports
    includePowerBalance: true,
    includeGlands: true,
    includeSchematicSummary: true,
    includeComplianceDeclaration: true,
    includeNotes: true,
    customNotes: project.config.notes || 'Quadro elétrico montado e ensaiado de acordo com a norma europeia EN 61439-1 / EN 61439-2. Todos os circuitos foram submetidos a teste de continuidade e isolamento 500V DC.',
  });

  // Keep synced with project state whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setOptions((prev) => ({
        ...prev,
        technicianName: project.config.designerName || prev.technicianName,
        clientName: project.config.clientName || prev.clientName,
        customNotes: project.config.notes || prev.customNotes,
      }));
    }
  }, [isOpen, project.config]);

  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');
  const [isExportingFullPdf, setIsExportingFullPdf] = useState(false);

  if (!isOpen) return null;

  const config = project.config;
  const rails = project.rails;
  const glands = project.glands || [];

  // Helper to render formatted notes with bullets, checkboxes, and warning badges
  const renderFormattedNotes = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-1 text-xs text-slate-800 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          // Section title (e.g. "1. CONFORMIDADE...", "2. INSTRUÇÕES...")
          if (/^\d+\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s&/-]{3,}:?$/.test(trimmed) || /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s&/-]{4,}:$/.test(trimmed)) {
            return (
              <div key={idx} className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 pt-2 text-[11px] uppercase tracking-wider">
                {trimmed}
              </div>
            );
          }

          // Warning line
          if (trimmed.includes('⚠️') || trimmed.startsWith('ATENÇÃO:') || trimmed.startsWith('AVISO:')) {
            return (
              <div key={idx} className="bg-amber-50 border border-amber-300 text-amber-950 px-2.5 py-1.5 rounded text-xs font-semibold flex items-start gap-1.5 my-1">
                <span className="text-amber-600 shrink-0">⚠️</span>
                <span>{trimmed.replace(/^⚠️\s*/, '')}</span>
              </div>
            );
          }

          // Checked item [X]
          if (/^\[[xX]\]\s*/.test(trimmed)) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-2">
                <span className="font-mono text-emerald-600 font-bold shrink-0">☑</span>
                <span className="text-slate-800">{trimmed.replace(/^\[[xX]\]\s*/, '')}</span>
              </div>
            );
          }

          // Unchecked item [ ]
          if (/^\[\s*\]\s*/.test(trimmed)) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-2">
                <span className="font-mono text-slate-400 font-bold shrink-0">☐</span>
                <span className="text-slate-700">{trimmed.replace(/^\[\s*\]\s*/, '')}</span>
              </div>
            );
          }

          // Bullet point
          if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-2">
                <span className="text-blue-600 font-bold shrink-0">•</span>
                <span className="text-slate-800">{trimmed.replace(/^[•\-*]\s*/, '')}</span>
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={idx} className="text-slate-700">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  // Group components for BOM
  const bomSummary = getConsolidatedBom(project);
  const totalBomPrice = bomSummary.reduce((acc, it) => acc + it.totalPriceEur, 0);
  const totalComponentsCount = rails.reduce((acc, r) => acc + (r.items ? r.items.length : 0), 0);

  // Power balance
  let totalSuppliedW = 0;
  let totalConsumedW = 0;
  rails.forEach((r) => {
    r.items.forEach((it) => {
      if (it.data.category === 'power_supply' && it.data.ratedPowerW) totalSuppliedW += it.data.ratedPowerW;
      if (it.data.dcConsumptionW) totalConsumedW += it.data.dcConsumptionW;
    });
  });

  const handlePrint = () => {
    window.print();
    if (onShowNotification) {
      onShowNotification('A abrir diálogo de impressão / guardar PDF...');
    }
  };

  const handleExportFullPdf = async () => {
    try {
      setIsExportingFullPdf(true);
      await exportFullProjectTechnicalPdf(project, {
        companyName: options.companyName,
        technicianName: options.technicianName,
        clientName: options.clientName,
        revision: options.revision,
        customNotes: options.customNotes,
        includePrices: options.includePrices,
      });
      if (onShowNotification) {
        onShowNotification('📄 Dossier Técnico Completo exportado em PDF com sucesso!');
      }
    } catch (err) {
      console.error('Error exporting complete PDF:', err);
    } finally {
      setIsExportingFullPdf(false);
    }
  };

  const handleResetDefaults = () => {
    setOptions({
      companyName: 'Eletrotécnica & Automação Industrial, Lda.',
      technicianName: 'Técnico Responsável / Instalador Credenciado',
      reportTitle: 'Dossier Técnico & Certificação de Quadro Elétrico',
      clientName: 'Instalação Industrial / Linha de Produção',
      revision: 'Rev. 1.0',
      date: new Date().toISOString().split('T')[0],
      orientation: 'portrait',
      fontSize: 'normal',
      includeCover: true,
      includeLayout2D: true,
      includeDoorIdMap: true,
      includeControlPanel: true,
      includeBom: true,
      includePrices: false,
      includePowerBalance: true,
      includeGlands: true,
      includeSchematicSummary: true,
      includeComplianceDeclaration: true,
      includeNotes: true,
      customNotes: 'Quadro elétrico montado e ensaiado de acordo com a norma europeia EN 61439-1 / EN 61439-2.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[95vh]">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Personalizar Impressão & Dossier Técnico (PDF / A4)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                  EN 61439
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Escolha os dados da empresa, secções a incluir, preçários e notas técnicas para o cliente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher for small screens */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-md font-semibold transition ${
                  activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Opções & Dados
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md font-semibold transition ${
                  activeTab === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pré-Visualização
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportFullPdf}
              disabled={isExportingFullPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition active:scale-98 disabled:opacity-50"
              title="Gerar e descarregar diretamente o ficheiro PDF completo de apresentação"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isExportingFullPdf ? 'A gerar...' : 'Descarregar PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-md transition active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
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

        {/* Content Area: Two Columns (Settings Sidebar + Live A4 Preview) */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* SETTINGS PANEL */}
          <div
            className={`w-full md:w-80 lg:w-96 p-5 border-r border-slate-800 bg-slate-950/80 overflow-y-auto space-y-5 text-xs shrink-0 no-print ${
              activeTab === 'settings' ? 'block' : 'hidden md:block'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Dados de Identificação</span>
              </h3>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
                title="Repor valores pré-definidos"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Repor</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Empresa / Instalador</label>
                <input
                  type="text"
                  value={options.companyName}
                  onChange={(e) => setOptions({ ...options, companyName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Técnico Projetista / Responsável</label>
                <input
                  type="text"
                  value={options.technicianName}
                  onChange={(e) => setOptions({ ...options, technicianName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Cliente / Instalação</label>
                <input
                  type="text"
                  value={options.clientName}
                  onChange={(e) => setOptions({ ...options, clientName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Data Emissão</label>
                  <input
                    type="date"
                    value={options.date}
                    onChange={(e) => setOptions({ ...options, date: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Revisão</label>
                  <input
                    type="text"
                    value={options.revision}
                    onChange={(e) => setOptions({ ...options, revision: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTIONS TO INCLUDE CHECKBOXES */}
            <div className="border-t border-slate-800 pt-4 space-y-2.5">
              <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Secções a Incluir no Dossier</span>
              </h3>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={options.includeCover}
                  onChange={(e) => setOptions({ ...options, includeCover: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Capa Técnica & Especificações do Armário</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={options.includeDoorIdMap}
                  onChange={(e) => setOptions({ ...options, includeDoorIdMap: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Mapa de Circuitos (Documento de Porta)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={options.includeControlPanel}
                  onChange={(e) => setOptions({ ...options, includeControlPanel: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-emerald-400 font-semibold">Porta Frontal, HMI & Furação CNC</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={options.includeBom}
                  onChange={(e) => setOptions({ ...options, includeBom: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Lista Consolidada de Materiais (BOM)</span>
              </label>

              {options.includeBom && (
                <div className="pl-6">
                  <label className="flex items-center gap-2 cursor-pointer text-amber-300 hover:text-amber-200 select-none">
                    <input
                      type="checkbox"
                      checked={options.includePrices}
                      onChange={(e) => setOptions({ ...options, includePrices: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Exibir Preços na Lista (Orçamento)</span>
                  </label>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={options.includePowerBalance}
                  onChange={(e) => setOptions({ ...options, includePowerBalance: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Balanço de Potência & Alimentação 24V</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={options.includeGlands}
                  onChange={(e) => setOptions({ ...options, includeGlands: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Tabela de Bucins & Cabos (IEC 62444)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={options.includeComplianceDeclaration}
                  onChange={(e) => setOptions({ ...options, includeComplianceDeclaration: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Declaração de Conformidade CE / EN 61439</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={options.includeNotes}
                  onChange={(e) => setOptions({ ...options, includeNotes: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Notas Técnicas & Observações</span>
              </label>
            </div>

            {/* Custom Notes text area */}
            {options.includeNotes && (
              <div className="border-t border-slate-800 pt-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-400 font-medium">Notas & Observações do Projeto</label>
                  {project.config.notes && (
                    <button
                      type="button"
                      onClick={() => setOptions({ ...options, customNotes: project.config.notes || '' })}
                      className="text-[10px] text-sky-400 hover:underline"
                      title="Recarregar texto original das notas do projeto"
                    >
                      Recarregar do Projeto
                    </button>
                  )}
                </div>
                <textarea
                  rows={5}
                  value={options.customNotes}
                  onChange={(e) => setOptions({ ...options, customNotes: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
                  placeholder="Observações técnicas e instruções que constarão no relatório impresso..."
                />
                <div className="text-[10px] text-slate-500 text-right font-mono">
                  {options.customNotes.length} caracteres
                </div>
              </div>
            )}
          </div>

          {/* LIVE A4 PRINT PREVIEW AREA */}
          <div
            className={`flex-1 p-4 sm:p-6 bg-slate-950 overflow-y-auto ${
              activeTab === 'preview' ? 'block' : 'hidden md:block'
            }`}
          >
            {/* White Sheet of Paper */}
            <div
              id="printable-dossier"
              className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-2xl max-w-4xl mx-auto space-y-8 font-sans print:p-0 print:shadow-none print:m-0"
              style={{
                minHeight: '297mm',
              }}
            >
              {/* Document Header Bar */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black tracking-widest uppercase bg-slate-900 text-white px-2 py-0.5 rounded font-mono">
                      ELECTROCAD DIN
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      NORMA EN 61439-1 / EN 61439-2
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    {options.reportTitle}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Projeto: <strong className="font-mono text-slate-900">{config.projectCode}</strong> — {config.name}
                  </p>
                </div>

                <div className="text-right text-xs shrink-0">
                  <div className="font-bold text-slate-900">{options.companyName}</div>
                  <div className="text-slate-600">{options.technicianName}</div>
                  <div className="text-slate-500 font-mono mt-1">
                    Data: {options.date} | {options.revision}
                  </div>
                </div>
              </div>

              {/* SECTION 1: COVER & NOMINAL SPECS */}
              {options.includeCover && (
                <div className="space-y-4">
                  <div className="bg-slate-100 border border-slate-300 rounded-lg p-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 border-b border-slate-300 pb-1 flex items-center justify-between">
                      <span>1. Características Nominais do Conjunto (Quadro Elétrico)</span>
                      <span className="font-mono font-normal text-slate-500">Ref: {config.projectCode}</span>
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Tensão Nominal (Un):</span>
                        <strong className="text-slate-900 font-mono">{config.supplyVoltage}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Frequência:</span>
                        <strong className="text-slate-900 font-mono">50 Hz</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Grau de Proteção:</span>
                        <strong className="text-slate-900 font-mono">{config.ipRating} / IK08</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Dimensões (L x A x P):</span>
                        <strong className="text-slate-900 font-mono">
                          {config.widthMm} x {config.heightMm} x {config.depthMm} mm
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Nº de Calhas DIN:</span>
                        <strong className="text-slate-900 font-mono">{rails.length} Calhas</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Total Componentes:</span>
                        <strong className="text-slate-900 font-mono">{totalComponentsCount} aparelhos</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Entradas / Bucins:</span>
                        <strong className="text-slate-900 font-mono">{glands.length} furos estanque</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cliente / Destino:</span>
                        <strong className="text-slate-900">{options.clientName}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: DOOR CIRCUIT IDENTIFICATION MAP */}
              {options.includeDoorIdMap && (
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b-2 border-slate-300 pb-1">
                    2. Mapa de Identificação de Circuitos & Aparelhagem (Documento de Porta)
                  </h2>
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                        <tr>
                          <th className="p-2 border-r border-slate-300">Calha</th>
                          <th className="p-2 border-r border-slate-300">Tag</th>
                          <th className="p-2 border-r border-slate-300">Aparelho</th>
                          <th className="p-2 border-r border-slate-300">Função / Circuito Atribuído</th>
                          <th className="p-2 border-r border-slate-300">Especificação Elétrica</th>
                          <th className="p-2">Módulos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {rails.map((rail, rIdx) =>
                          rail.items.map((it) => (
                            <tr key={it.instanceId || it.tag} className="hover:bg-slate-50">
                              <td className="p-2 font-mono text-slate-600 border-r border-slate-200">
                                {rail.name || `Calha ${rIdx + 1}`}
                              </td>
                              <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-200">
                                {it.tag}
                              </td>
                              <td className="p-2 font-semibold text-slate-800 border-r border-slate-200">
                                {it.data.name}
                              </td>
                              <td className="p-2 text-slate-700 border-r border-slate-200">
                                {it.data.customNotes || it.data.description || 'Circuito de Alimentação'}
                              </td>
                              <td className="p-2 font-mono text-slate-600 border-r border-slate-200">
                                {it.data.ratedCurrentA ? `${it.data.ratedCurrentA}A` : it.data.inputVoltage || '-'}
                              </td>
                              <td className="p-2 font-mono text-slate-600">
                                {Math.ceil(it.data.widthMm / 18)} TE
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION: FRONT DOOR & HMI CONTROL PANEL DRILLING SCHEDULE */}
              {options.includeControlPanel && (() => {
                const controlPanel = project.controlPanel || getDefaultControlPanelConfig(config.widthMm || 600, config.heightMm || 800);
                const devices = controlPanel.devices || [];
                const doorWidthMm = controlPanel.widthMm || config.widthMm || 600;
                const doorHeightMm = controlPanel.heightMm || config.heightMm || 800;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b-2 border-slate-300 pb-1">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Plano de Furação e Disposição da Porta / Painel HMI (IEC 60947-5-1 / EN 60204-1)
                      </h2>
                      <span className="text-[11px] font-mono text-slate-600 font-bold">
                        Porta: {doorWidthMm}×{doorHeightMm} mm · {devices.length} Furos/Recortes
                      </span>
                    </div>

                    {/* Door Specs Summary Chip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Acabamento:</span>
                        <strong className="text-slate-800">
                          {controlPanel.finishColor === 'stainless' ? 'Aço Inox Escovado' : controlPanel.finishColor === 'ral_7032' ? 'RAL 7032 (Bege)' : 'RAL 7035 (Cinza)'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Dobradiças / Fecho:</span>
                        <strong className="text-slate-800">
                          {controlPanel.hingeSide === 'left' ? 'Esquerda' : 'Direita'} · Chave DIN
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Folga da Vedação:</span>
                        <strong className="text-slate-800">≥ 45 mm (Estanque IP65)</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Binário Porcas M22:</span>
                        <strong className="text-emerald-700">2.0 N·m (IEC 60947-5-1)</strong>
                      </div>
                    </div>

                    {/* CNC Drilling Table */}
                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                          <tr>
                            <th className="p-2 border-r border-slate-300">Posição / Tag</th>
                            <th className="p-2 border-r border-slate-300">Equipamento</th>
                            <th className="p-2 border-r border-slate-300">Recorte / Broca CNC</th>
                            <th className="p-2 border-r border-slate-300 text-center">Coord. X (Esq.)</th>
                            <th className="p-2 border-r border-slate-300 text-center">Coord. Y (Base)</th>
                            <th className="p-2 border-r border-slate-300">Gravação Plaqueta</th>
                            <th className="p-2">Referência / Marca</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {devices.map((dev) => {
                            const yFromBottomMm = Math.round(doorHeightMm - dev.yMm);
                            const xFromLeftMm = Math.round(dev.xMm);
                            return (
                              <tr key={dev.id} className="hover:bg-slate-50">
                                <td className="p-2 font-mono font-bold text-blue-700 border-r border-slate-200">
                                  {dev.tag}
                                </td>
                                <td className="p-2 font-semibold text-slate-800 border-r border-slate-200">
                                  {dev.name}
                                </td>
                                <td className="p-2 font-mono font-bold text-emerald-700 border-r border-slate-200">
                                  {dev.cutoutType === 'round'
                                    ? `Furo Ø${dev.holeDiameterMm || 22.5} mm`
                                    : `Recorte ${dev.widthMm}×${dev.heightMm} mm`}
                                </td>
                                <td className="p-2 font-mono text-center font-bold text-slate-900 border-r border-slate-200">
                                  {xFromLeftMm} mm
                                </td>
                                <td className="p-2 font-mono text-center font-bold text-slate-900 border-r border-slate-200">
                                  {yFromBottomMm} mm
                                </td>
                                <td className="p-2 font-mono text-slate-700 border-r border-slate-200">
                                  {dev.label || '-'}
                                </td>
                                <td className="p-2 font-mono text-slate-600">
                                  {dev.partNumber || dev.brand || 'IEC 60947-5-1'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* SECTION 3: BILL OF MATERIALS (BOM) */}
              {options.includeBom && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-slate-300 pb-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      3. Lista de Componentes e Material (BOM)
                    </h2>
                    {options.includePrices && (
                      <span className="text-xs font-bold text-emerald-700 font-mono">
                        Total Estimado: {totalBomPrice.toFixed(2)} €
                      </span>
                    )}
                  </div>

                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                        <tr>
                          <th className="p-2 border-r border-slate-300 text-center">Qtd</th>
                          <th className="p-2 border-r border-slate-300">Designações (Tags)</th>
                          <th className="p-2 border-r border-slate-300">Fabricante</th>
                          <th className="p-2 border-r border-slate-300">Referência (Part Nº)</th>
                          <th className="p-2 border-r border-slate-300 text-center">Bitola Sugerida</th>
                          <th className="p-2 border-r border-slate-300">Descrição Técnica</th>
                          {options.includePrices && (
                            <>
                              <th className="p-2 border-r border-slate-300 text-right">P. Unit (€)</th>
                              <th className="p-2 text-right">Total (€)</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {bomSummary.map((item) => (
                          <tr key={item.key || item.partNumber} className="hover:bg-slate-50">
                            <td className="p-2 font-bold font-mono text-center border-r border-slate-200">
                              {item.quantity}
                            </td>
                            <td className="p-2 font-mono text-slate-700 border-r border-slate-200">
                              {item.tags.join(', ')}
                            </td>
                            <td className="p-2 font-semibold text-slate-800 border-r border-slate-200">
                              {item.brand}
                            </td>
                            <td className="p-2 font-mono text-slate-900 border-r border-slate-200">
                              {item.partNumber}
                            </td>
                            <td className="p-2 font-mono text-center font-bold text-slate-900 border-r border-slate-200">
                              {item.recommendedWireMm2 ? `${item.recommendedWireMm2} mm²` : '--'}
                            </td>
                            <td className="p-2 text-slate-600 border-r border-slate-200">
                              {item.name}
                            </td>
                            {options.includePrices && (
                              <>
                                <td className="p-2 font-mono text-right text-slate-700 border-r border-slate-200">
                                  {item.unitPriceEur.toFixed(2)}
                                </td>
                                <td className="p-2 font-mono text-right font-bold text-slate-900">
                                  {item.totalPriceEur.toFixed(2)}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 4: POWER BALANCE & GLANDS */}
              {(options.includePowerBalance || options.includeGlands) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {options.includePowerBalance && (
                    <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                      <h3 className="text-xs font-bold uppercase text-slate-800 mb-2 border-b border-slate-200 pb-1">
                        4. Balanço de Potência 24VDC
                      </h3>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Capacidade Fonte 24V:</span>
                          <strong className="font-mono text-slate-900">{totalSuppliedW} W ({(totalSuppliedW / 24).toFixed(1)} A)</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Consumo Estimado Cargas:</span>
                          <strong className="font-mono text-slate-900">{totalConsumedW} W ({(totalConsumedW / 24).toFixed(1)} A)</strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1">
                          <span className="text-slate-600">Taxa de Carga da Fonte:</span>
                          <strong className="font-mono text-slate-900">
                            {totalSuppliedW > 0 ? `${Math.round((totalConsumedW / totalSuppliedW) * 100)}%` : 'Sem Fonte 24V'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {options.includeGlands && (
                    <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                      <h3 className="text-xs font-bold uppercase text-slate-800 mb-2 border-b border-slate-200 pb-1">
                        5. Entradas de Cabos & Bucins (IEC 62444)
                      </h3>
                      {glands.length > 0 ? (
                        <div className="space-y-1 text-xs">
                          {glands.map((g) => (
                            <div key={g.id} className="flex justify-between">
                              <span className="font-mono text-slate-700">{g.tag} ({g.size}):</span>
                              <span className="text-slate-600">{g.label || 'Cabo de Entrada'} ({g.cableDiameterRangeMm})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Sem bucins configurados.</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: CADERNO DE ENCARGOS, INSTRUÇÕES DE MONTAGEM & NOTAS DO PROJETO */}
              {options.includeNotes && options.customNotes && options.customNotes.trim().length > 0 && (
                <div className="border border-slate-300 rounded-lg p-4 bg-slate-50/70 break-inside-avoid space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Caderno de Encargos, Instruções de Montagem & Notas do Projeto</span>
                    </h2>
                    <span className="text-[10px] font-mono text-slate-500">Ref: {config.projectCode}</span>
                  </div>
                  {renderFormattedNotes(options.customNotes)}
                </div>
              )}

              {/* SECTION 5: COMPLIANCE DECLARATION & SIGNATURE */}
              {options.includeComplianceDeclaration && (
                <div className="border-t-2 border-slate-900 pt-4 space-y-3">
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong>DECLARAÇÃO DE CONFORMIDADE TÉCNICA & ENSAIOS:</strong>{' '}
                    {config.applicationType === 'residential' ? (
                      <span>
                        O presente quadro elétrico de distribuição predial / habitação foi concebido e dimensionado em conformidade estrita com as <strong>Regras Técnicas das Instalações Elétricas de Baixa Tensão (RTIEBT - Portaria n.º 949-A/2006)</strong> e a norma europeia <strong>EN 61439-3 (DBO)</strong>. Foram validados os requisitos de corte geral omnipolar (RTIEBT 537.1), proteção diferencial residual de alta sensibilidade 30mA Tipo A (RTIEBT 412.5), descarregador de sobretensões (DPS Classe II), reserva mínima de 20% em módulos DIN (RTIEBT 539.1) e grau de estanqueidade <strong>{config.ipRating}</strong> com resistência mecânica a impactos <strong>{config.ikRating || 'IK07'}</strong> (normas <strong>EN 60529</strong> e <strong>EN 62262</strong>).
                      </span>
                    ) : (
                      <span>
                        O presente quadro elétrico de automação e comando industrial foi concebido e dimensionado segundo a Diretiva de Máquinas e de Baixa Tensão (2014/35/UE), em conformidade estrita com as normas europeias <strong>EN 60204-1</strong> e <strong>EN 61439-1 / EN 61439-2</strong>. Foram validados os circuitos de segurança e comando a tensão reduzida SELV/PELV 24VDC, balanço térmico de dissipação, proteção primária/secundária da fonte e invólucro com grau de estanqueidade <strong>{config.ipRating}</strong> e resistência ao choque <strong>{config.ikRating || 'IK08'}</strong> (normas <strong>EN 60529</strong> e <strong>EN 62262</strong>).
                      </span>
                    )}
                  </div>

                  {/* Signature Box */}
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="border-t border-slate-400 pt-2 text-center text-xs text-slate-600">
                      O Técnico Instalador Credenciado
                      <div className="font-bold text-slate-900 mt-1">{options.technicianName}</div>
                    </div>
                    <div className="border-t border-slate-400 pt-2 text-center text-xs text-slate-600">
                      Pela Entidade Receptora / Cliente
                      <div className="font-bold text-slate-900 mt-1">{options.clientName}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Footer */}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Gerado por ElectroCad DIN - Sistema de Engenharia de Quadros Elétricos</span>
                <span>Página 1 de 1 · {options.date}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
