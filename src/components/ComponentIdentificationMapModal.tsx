import React, { useState } from 'react';
import { ProjectState, PlacedComponent, CableGland, ComponentCategory } from '../types/electrical';
import { GLAND_SPECS } from '../utils/glandUtils';
import { 
  X, Printer, Download, Copy, Check, Edit3, ShieldAlert, 
  Layers, Zap, Cpu, Box, CheckCircle, AlertTriangle, FileText, 
  ExternalLink, Sparkles, Sliders, Info, Eye, EyeOff 
} from 'lucide-react';
import { PrintCustomizationModal } from './PrintCustomizationModal';

interface ComponentIdentificationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onUpdateProject?: (updated: ProjectState) => void;
  onShowNotification?: (msg: string) => void;
}

// Function to generate an intelligent default circuit description
function getDefaultFunctionDescription(item: PlacedComponent, rIdx: number): string {
  if (item.data.customNotes && item.data.customNotes.trim()) {
    return item.data.customNotes;
  }

  const cat = item.data.category;
  const tag = item.tag;

  if (tag === 'Q1' || (rIdx === 0 && cat === 'protection_ac' && item.positionMm < 30)) {
    return 'Alimentação Geral / Seccionamento e Proteção de Entrada do Armário';
  }
  if (cat === 'protection_ac') {
    if (item.data.name.includes('Diferencial') || item.data.name.includes('RCD')) {
      return 'Interruptor Diferencial Geral (Proteção de Pessoas e Fuga à Terra 30mA)';
    }
    return `Disjuntor Magnetotérmico de Proteção AC (${item.data.ratedCurrentA || 16}A)`;
  }
  if (cat === 'protection_dc') {
    return `Proteção do Barramento 24VDC (${item.data.ratedCurrentA || 6}A)`;
  }
  if (cat === 'motor_control') {
    if (item.data.name.includes('Contactor')) {
      return 'Contactor de Comando e Manobra de Força do Motor (KM1)';
    }
    return 'Disjuntor-Motor Magnetotérmico de Proteção do Motor (M1)';
  }
  if (cat === 'power_supply') {
    return 'Fonte de Alimentação Comutada (Barramento de Comando 24VDC)';
  }
  if (cat === 'plc_cpu' || cat === 'plc_expansion') {
    return 'Autómato Programável (PLC) - CPU de Gestão e Controlo do Sistema';
  }
  if (cat === 'safety_relays') {
    return 'Módulo de Segurança e Paragem de Emergência (E-STOP)';
  }
  if (cat === 'relays') {
    return 'Relé de Interface e Comando de Saídas Digitais';
  }
  if (cat === 'terminals') {
    if (tag.includes('PE') || item.data.name.includes('Terra')) {
      return 'Barramento / Bornes de Proteção Equipotencial à Terra (PE)';
    }
    if (tag.includes('X1') || item.data.name.includes('Viking')) {
      return 'Régua de Bornes de Ligação para Cabos de Campo (Entradas/Saídas)';
    }
    return 'Bornes de Distribuição e Interligação Elétrica';
  }
  if (cat === 'accessories') {
    if (item.data.name.includes('Sobretensões') || item.data.name.includes('DPS')) {
      return 'Descarregador de Sobretensões Transitórias (DPS Tipo 2)';
    }
    return 'Acessório de Serviço e Distribuição';
  }

  return item.data.description || 'Circuito de Distribuição e Comando';
}

// Visual category color badge for map
function getCategoryBadge(category: ComponentCategory): { bg: string; text: string; border: string; label: string } {
  switch (category) {
    case 'protection_ac':
    case 'protection_dc':
      return { bg: 'bg-red-500/10 text-red-400 border-red-500/30', text: 'text-red-400', border: 'border-red-500', label: 'Proteção' };
    case 'motor_control':
      return { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', text: 'text-blue-400', border: 'border-blue-500', label: 'Motor & Força' };
    case 'relays':
    case 'safety_relays':
      return { bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30', text: 'text-indigo-400', border: 'border-indigo-500', label: 'Comando & Relés' };
    case 'power_supply':
      return { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', text: 'text-amber-400', border: 'border-amber-500', label: 'Alimentação 24V' };
    case 'plc_cpu':
    case 'plc_expansion':
      return { bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30', text: 'text-purple-400', border: 'border-purple-500', label: 'Automação PLC' };
    case 'terminals':
      return { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', text: 'text-emerald-400', border: 'border-emerald-500', label: 'Bornes de Campo' };
    case 'accessories':
    default:
      return { bg: 'bg-slate-500/10 text-slate-300 border-slate-500/30', text: 'text-slate-300', border: 'border-slate-500', label: 'Acessório' };
  }
}

export const ComponentIdentificationMapModal: React.FC<ComponentIdentificationMapModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onShowNotification,
}) => {
  const [isPaperMode, setIsPaperMode] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  if (!isOpen) return null;

  const config = project.config;
  const rails = project.rails;
  const glands = project.glands || [];

  const totalComponents = rails.reduce((acc, r) => acc + (r.items ? r.items.length : 0), 0);

  // Trigger browser print dialog formatted for A4
  const handlePrint = () => {
    window.print();
  };

  // Save customized notes back to project
  const handleSaveNotes = () => {
    if (!onUpdateProject) return;

    const updatedRails = rails.map((r, rIdx) => ({
      ...r,
      items: r.items.map((item) => {
        const key = item.instanceId || item.tag;
        if (editedNotes[key] !== undefined) {
          return {
            ...item,
            data: {
              ...item.data,
              customNotes: editedNotes[key],
            },
          };
        }
        return item;
      }),
    }));

    onUpdateProject({
      ...project,
      rails: updatedRails,
    });

    setIsEditingNotes(false);
    if (onShowNotification) {
      onShowNotification('Legendas de função dos circuitos atualizadas no projeto!');
    }
  };

  // Copy table to TSV/clipboard for Excel
  const handleCopyTsv = () => {
    const headers = ['Calha', 'Tag', 'Componente', 'Função / Circuito Atribuído', 'Características Elétricas', 'Marca / Modelo', 'Módulos 18mm'];
    const rows: string[] = [headers.join('\t')];

    rails.forEach((rail, rIdx) => {
      rail.items.forEach((item) => {
        const desc = editedNotes[item.instanceId || item.tag] !== undefined 
          ? editedNotes[item.instanceId || item.tag] 
          : getDefaultFunctionDescription(item, rIdx);
        const spec = item.data.ratedPowerW 
          ? `${item.data.ratedPowerW}W (${item.data.ratedCurrentA}A)` 
          : item.data.ratedCurrentA 
          ? `${item.data.ratedCurrentA}A` 
          : item.data.inputVoltage || '-';

        rows.push([
          rail.name || `Calha ${rIdx + 1}`,
          item.tag,
          item.data.name,
          desc,
          spec,
          `${item.data.brand} ${item.data.partNumber}`,
          `${item.data.dinModules || Math.ceil(item.data.widthMm / 18)} TE`,
        ].join('\t'));
      });
    });

    navigator.clipboard.writeText(rows.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onShowNotification) {
      onShowNotification('Tabela de identificação copiada (pronta para colar no Excel).');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] border transition-colors ${
          isPaperMode 
            ? 'bg-white text-slate-900 border-slate-300' 
            : 'bg-slate-900 text-slate-100 border-slate-800'
        }`}
      >
        {/* Top Action Bar (hidden on print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-950 border-b border-slate-800 text-slate-200 shrink-0 select-none no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              📋
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span>Mapa de Identificação de Componentes do Quadro</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  DOCUMENTO DE PORTA (EN 61439)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Planta esquemática e legenda dos circuitos para afixar na porta interior do armário.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Paper Preview */}
            <button
              type="button"
              onClick={() => setIsPaperMode(!isPaperMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                isPaperMode
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
              }`}
              title="Alternar entre modo escuro e visualização em papel branco A4"
            >
              {isPaperMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isPaperMode ? 'Modo Escuro' : 'Modo Papel A4'}</span>
            </button>

            {/* Toggle Edit Notes */}
            <button
              type="button"
              onClick={() => {
                if (isEditingNotes) {
                  handleSaveNotes();
                } else {
                  setIsEditingNotes(true);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                isEditingNotes
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
              }`}
              title="Editar descrições das funções dos circuitos atribuídas a cada disjuntor/aparelho"
            >
              {isEditingNotes ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5 text-blue-400" />}
              <span>{isEditingNotes ? 'Salvar Legendas' : 'Editar Funções'}</span>
            </button>

            {/* Copy Table to Excel */}
            <button
              type="button"
              onClick={handleCopyTsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-lg text-xs font-semibold border border-slate-800 transition"
              title="Copiar dados da tabela para colar no Excel ou Word"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copiado!' : 'Copiar Tabela'}</span>
            </button>

            {/* Customize Print Button */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-sky-300 hover:text-white rounded-lg text-xs font-semibold border border-sky-500/40 transition"
              title="Personalizar dados do instalador, cliente, cabeçalho e opções de impressão"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Personalizar Impressão</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-900/40 transition active:scale-98"
              title="Imprimir folha de identificação em impressora ou guardar em PDF (A4)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Identification Sheet Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 print:p-0 print:m-0 print:space-y-4">
          
          {/* ==============================================================
              1. OFFICIAL TECHNICAL HEADER / CARTELA TÉCNICA DO QUADRO
             ============================================================== */}
          <div className={`p-5 rounded-xl border ${
            isPaperMode 
              ? 'bg-slate-50 border-slate-300 text-slate-900' 
              : 'bg-slate-950 border-slate-800 text-slate-100'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white font-mono font-bold text-lg shadow-sm">
                  ⚡
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    MAPA DE IDENTIFICAÇÃO DE COMPONENTES E CIRCUITOS
                  </span>
                  <h1 className="text-lg md:text-xl font-extrabold tracking-tight">
                    {config.name || 'Quadro Elétrico DIN'}
                  </h1>
                </div>
              </div>

              <div className="text-left sm:text-right font-mono text-xs">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  REF: {config.projectCode || 'PROJ-001'}
                </span>
                <span className="block text-[11px] text-slate-500 mt-1">
                  Norma: EN 61439-1 / IEC 60204-1
                </span>
              </div>
            </div>

            {/* Technical Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
              <div className={`p-2.5 rounded border ${isPaperMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-500 block uppercase">Alimentação & Tensão</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {config.supplyVoltage} ({config.frequencyHz}Hz)
                </span>
              </div>

              <div className={`p-2.5 rounded border ${isPaperMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-500 block uppercase">Dimensões do Armário</span>
                <span className="font-bold">
                  {config.widthMm} x {config.heightMm} x {config.depthMm} mm
                </span>
              </div>

              <div className={`p-2.5 rounded border ${isPaperMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-500 block uppercase">Índice de Proteção</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {config.ipRating || 'IP55'} · Interior
                </span>
              </div>

              <div className={`p-2.5 rounded border ${isPaperMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                <span className="text-[10px] text-slate-500 block uppercase">Aparelhagem Montada</span>
                <span className="font-bold">
                  {rails.length} Calhas · {totalComponents} Itens
                </span>
              </div>
            </div>
          </div>

          {/* ==============================================================
              2. VISUAL RAIL LAYOUT MAP (MAPA VISUAL DA POSIÇÃO DAS CALHAS)
             ============================================================== */}
          <div className={`p-5 rounded-xl border ${
            isPaperMode 
              ? 'bg-slate-50 border-slate-300' 
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                <span>Disposição Física das Calhas (Mapa Esquemático)</span>
              </h3>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>Proteção</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>Comando</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>24VDC</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>PLC</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Bornes</span>
                </span>
              </div>
            </div>

            {/* Visual rails diagram */}
            <div className="space-y-3">
              {rails.map((rail, rIdx) => {
                const itemsCount = rail.items.length;

                return (
                  <div key={rail.id || rIdx} className="space-y-1">
                    {/* Rail Header */}
                    <div className="flex items-center justify-between text-[11px] font-mono px-1">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {rail.name || `Calha ${rIdx + 1}`} (DIN 35mm)
                      </span>
                      <span className="text-slate-500">
                        {itemsCount} componentes ({rail.items.reduce((acc, it) => acc + (it.data.dinModules || Math.ceil(it.data.widthMm / 18)), 0)} TE)
                      </span>
                    </div>

                    {/* Rail horizontal track with components */}
                    <div className={`p-2 rounded-lg border flex flex-wrap items-center gap-1.5 min-h-[52px] ${
                      isPaperMode 
                        ? 'bg-white border-slate-300 shadow-xs' 
                        : 'bg-slate-900 border-slate-800'
                    }`}>
                      {itemsCount === 0 ? (
                        <span className="text-[11px] text-slate-400 italic px-2">
                          (Calha de reserva vazia para expansão futura)
                        </span>
                      ) : (
                        rail.items.map((item, iIdx) => {
                          const badge = getCategoryBadge(item.data.category);
                          const desc = editedNotes[item.instanceId || item.tag] || getDefaultFunctionDescription(item, rIdx);

                          return (
                            <div
                              key={item.instanceId || iIdx}
                              className={`px-2.5 py-1.5 rounded border flex flex-col justify-center transition-all ${
                                isPaperMode
                                  ? 'bg-slate-50 border-slate-400 text-slate-900'
                                  : 'bg-slate-950 border-slate-700 text-slate-100'
                              }`}
                              style={{ minWidth: `${Math.max(48, item.data.widthMm * 0.9)}px` }}
                              title={`${item.tag} - ${item.data.name}\n${desc}`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400">
                                  {item.tag}
                                </span>
                                <span className={`text-[9px] font-mono px-1 rounded ${badge.bg}`}>
                                  {item.data.dinModules || Math.ceil(item.data.widthMm / 18)}TE
                                </span>
                              </div>
                              <span className="text-[10px] font-medium truncate max-w-[120px] text-slate-600 dark:text-slate-300">
                                {item.data.name.split(' ')[0]}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ==============================================================
              3. COMPREHENSIVE COMPONENT IDENTIFICATION TABLE
             ============================================================== */}
          <div className={`rounded-xl border overflow-hidden ${
            isPaperMode 
              ? 'bg-white border-slate-300' 
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className={`px-5 py-3 border-b flex items-center justify-between ${
              isPaperMode ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-800'
            }`}>
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>Tabela Detalhada de Identificação de Circuitos & Aparelhagem</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                {totalComponents} circuitos listados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-mono uppercase ${
                    isPaperMode ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}>
                    <th className="py-2.5 px-3 w-16">Local</th>
                    <th className="py-2.5 px-3 w-20">Tag</th>
                    <th className="py-2.5 px-3 w-44">Equipamento</th>
                    <th className="py-2.5 px-4">Função / Circuito Atribuído (Destino de Campo)</th>
                    <th className="py-2.5 px-3 w-36">Características</th>
                    <th className="py-2.5 px-3 w-40">Fabricante & Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-sans">
                  {rails.map((rail, rIdx) => (
                    <React.Fragment key={rail.id || rIdx}>
                      {/* Rail Section Divider Row */}
                      <tr className={isPaperMode ? 'bg-slate-100/70 font-bold' : 'bg-slate-900/80 font-bold'}>
                        <td colSpan={6} className="py-2 px-3 text-[11px] font-mono text-blue-600 dark:text-blue-400">
                          {rail.name || `Calha ${rIdx + 1}`} · {rail.items.length} componentes montados
                        </td>
                      </tr>

                      {rail.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-2.5 px-3 text-slate-400 italic text-center text-xs">
                            Sem componentes instalados nesta calha.
                          </td>
                        </tr>
                      ) : (
                        rail.items.map((item, iIdx) => {
                          const badge = getCategoryBadge(item.data.category);
                          const key = item.instanceId || item.tag;
                          const currentDesc = editedNotes[key] !== undefined 
                            ? editedNotes[key] 
                            : getDefaultFunctionDescription(item, rIdx);

                          const spec = item.data.ratedPowerW 
                            ? `${item.data.ratedPowerW}W (${item.data.ratedCurrentA}A)` 
                            : item.data.ratedCurrentA 
                            ? `${item.data.ratedCurrentA}A` 
                            : item.data.inputVoltage || '-';

                          return (
                            <tr 
                              key={item.instanceId || iIdx}
                              className={isPaperMode ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'}
                            >
                              {/* Local / Posição */}
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                C{rIdx + 1}.{iIdx + 1}
                              </td>

                              {/* Tag */}
                              <td className="py-2.5 px-3 font-mono">
                                <span className="font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                  {item.tag}
                                </span>
                              </td>

                              {/* Equipamento */}
                              <td className="py-2.5 px-3 font-medium">
                                <span className="block font-bold">{item.data.name}</span>
                                <span className="text-[10px] text-slate-500 block font-mono">
                                  {badge.label} · {item.data.widthMm}mm ({item.data.dinModules || Math.ceil(item.data.widthMm / 18)}TE)
                                </span>
                              </td>

                              {/* Função do Circuito (Editable when isEditingNotes) */}
                              <td className="py-2.5 px-4">
                                {isEditingNotes ? (
                                  <input
                                    type="text"
                                    value={currentDesc}
                                    onChange={(e) => {
                                      setEditedNotes({
                                        ...editedNotes,
                                        [key]: e.target.value,
                                      });
                                    }}
                                    className={`w-full px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                      isPaperMode 
                                        ? 'bg-white border-slate-400 text-slate-900' 
                                        : 'bg-slate-950 border-slate-700 text-white'
                                    }`}
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                                    {currentDesc}
                                  </span>
                                )}
                              </td>

                              {/* Características Elétricas */}
                              <td className="py-2.5 px-3 font-mono text-xs">
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">{spec}</span>
                                {item.data.inputVoltage && (
                                  <span className="block text-[10px] text-slate-500">{item.data.inputVoltage}</span>
                                )}
                              </td>

                              {/* Fabricante & Referência */}
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                <span className="font-bold block text-slate-700 dark:text-slate-300">{item.data.brand}</span>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                                  {item.data.partNumber}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==============================================================
              4. CABLE ENTRY & EXIT CONNECTIONS MAP (BUCINS E BORNES)
             ============================================================== */}
          {glands.length > 0 && (
            <div className={`p-5 rounded-xl border ${
              isPaperMode 
                ? 'bg-slate-50 border-slate-300' 
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-amber-500" />
                  <span>Mapa de Bucins & Cabos de Entrada e Saída de Campo (IEC 62444)</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {glands.length} bucins estanques IP68
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Entradas - Topo */}
                <div className={`p-3 rounded-lg border ${isPaperMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block mb-2 font-mono flex items-center gap-1.5">
                    <span>⬇️ FLANGE SUPERIOR (ENTRADAS DE ALIMENTAÇÃO E REDE)</span>
                  </span>
                  <div className="space-y-2 font-mono">
                    {glands.filter((g) => g.location === 'top').map((g) => {
                      const spec = GLAND_SPECS[g.size] || GLAND_SPECS.M20;
                      return (
                        <div key={g.id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]">
                          <div>
                            <span className="font-bold text-amber-500 mr-2">{g.tag} ({g.size})</span>
                            <span className="text-slate-700 dark:text-slate-300 font-sans">{g.label}</span>
                          </div>
                          <span className="text-slate-500 text-[10px]">
                            Ø{spec.holeDiameterMm}mm · {g.cableDiameterRangeMm}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Saídas - Fundo */}
                <div className={`p-3 rounded-lg border ${isPaperMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block mb-2 font-mono flex items-center gap-1.5">
                    <span>⬆️ FLANGE INFERIOR (SAÍDAS PARA MOTORES E SENSORES)</span>
                  </span>
                  <div className="space-y-2 font-mono">
                    {glands.filter((g) => g.location === 'bottom').map((g) => {
                      const spec = GLAND_SPECS[g.size] || GLAND_SPECS.M16;
                      return (
                        <div key={g.id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]">
                          <div>
                            <span className="font-bold text-emerald-500 mr-2">{g.tag} ({g.size})</span>
                            <span className="text-slate-700 dark:text-slate-300 font-sans">{g.label}</span>
                          </div>
                          <span className="text-slate-500 text-[10px]">
                            Ø{spec.holeDiameterMm}mm · {g.cableDiameterRangeMm}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              5. INSTRUÇÕES DE SEGURANÇA E MANUTENÇÃO (PORTA DO QUADRO)
             ============================================================== */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start gap-4 text-xs ${
            isPaperMode 
              ? 'bg-amber-50 border-amber-300 text-amber-900' 
              : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
          }`}>
            <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1 leading-relaxed">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-400">
                Instruções Importantes de Segurança e Operação (EN 61439-1 / IEC 60204-1)
              </h4>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li><strong>Atenção:</strong> Presença de tensão elétrica perigosa. Desligar o seccionador geral antes de qualquer intervenção no interior do armário.</li>
                <li>Em caso de disparo automático de um disjuntor ou relé térmico, investigar e solucionar a avaria antes de rearmar o aparelho.</li>
                <li>Efetuar o teste mensal de disparo do interruptor diferencial de fuga à terra pressionando o botão de teste <em>(T)</em>.</li>
                <li>Manter a porta do quadro sempre fechada e trancada para garantir o grau de estanquidade ({config.ipRating}) e evitar a entrada de poeiras.</li>
              </ul>
            </div>
          </div>

          {/* Signature & Date line for cabinet manufacturing tag */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500">
            <div>
              <span>Fabricado em: {new Date().toLocaleDateString('pt-PT')}</span>
              <span className="mx-2">·</span>
              <span>Software: ElectroCad DIN v2.0</span>
            </div>
            <div>
              <span>Técnico Responsável / Inspetor: ___________________________</span>
            </div>
          </div>
        </div>

        {/* Modal Footer (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-t border-slate-800 shrink-0 text-xs no-print">
          <span className="text-slate-400 flex items-center gap-1.5 font-mono">
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Dica: Use <strong>Imprimir / PDF</strong> para gerar uma folha A4 e colocar na mica porta-documentos do quadro.</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>

      {isPrintModalOpen && (
        <PrintCustomizationModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          project={project}
          onShowNotification={onShowNotification}
        />
      )}
    </div>
  );
};
