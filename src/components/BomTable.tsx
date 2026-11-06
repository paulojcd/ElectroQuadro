import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProjectState } from '../types/electrical';
import { 
  Download, Copy, Printer, Search, Check, FileSpreadsheet, 
  Euro, Layers, ShieldCheck, Sliders, Zap, FileText, ChevronDown, Table, Sparkles 
} from 'lucide-react';
import { PrintCustomizationModal } from './PrintCustomizationModal';
import { WireCalculationModal } from './WireCalculationModal';
import { SchematicPdfExportModal } from './SchematicPdfExportModal';
import { getConsolidatedBom, ConsolidatedBomItem } from '../utils/bomUtils';
import { 
  exportBomToExcelEuropeanCsv, 
  exportBomToUniversalCsv, 
  exportBomToExcelXml, 
  copyBomToClipboard 
} from '../utils/bomExporter';

interface BomTableProps {
  project: ProjectState;
}

export const BomTable: React.FC<BomTableProps> = ({ project }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isWireModalOpen, setIsWireModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3000);
  };

  // Group components by Part Number
  const bomItems: ConsolidatedBomItem[] = useMemo(() => {
    return getConsolidatedBom(project);
  }, [project]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return bomItems.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchBrand = brandFilter === 'all' || item.brand === brandFilter;

      return matchSearch && matchCategory && matchBrand;
    });
  }, [bomItems, searchTerm, categoryFilter, brandFilter]);

  // Totals
  const totalCost = useMemo(() => bomItems.reduce((sum, it) => sum + it.totalPriceEur, 0), [bomItems]);
  const totalQuantity = useMemo(() => bomItems.reduce((sum, it) => sum + it.quantity, 0), [bomItems]);
  const totalWidthMm = useMemo(() => bomItems.reduce((sum, it) => sum + it.widthMm * it.quantity, 0), [bomItems]);

  // Direct 1-Click Excel Export (.xls)
  const handleExportExcel = () => {
    setIsExportMenuOpen(false);
    exportBomToExcelXml(project, { filterCategory: categoryFilter, filterBrand: brandFilter });
    showNotification('Planilha Excel (.xls) com fórmulas e preços gerada com sucesso!');
  };

  // European CSV (Excel-friendly with ; delimiter)
  const handleExportExcelCsv = () => {
    setIsExportMenuOpen(false);
    exportBomToExcelEuropeanCsv(project, { filterCategory: categoryFilter, filterBrand: brandFilter });
    showNotification('CSV para Excel (Portugal/UE com delimitador ;) gerado com sucesso!');
  };

  // Universal CSV (Standard with , delimiter)
  const handleExportUniversalCsv = () => {
    setIsExportMenuOpen(false);
    exportBomToUniversalCsv(project, { filterCategory: categoryFilter, filterBrand: brandFilter });
    showNotification('CSV Universal (Google Sheets / ERPs) gerado com sucesso!');
  };

  // Copy to clipboard as TSV
  const handleCopyClipboard = async () => {
    setIsExportMenuOpen(false);
    const success = await copyBomToClipboard(project, { filterCategory: categoryFilter, filterBrand: brandFilter });
    if (success) {
      setCopied(true);
      showNotification('Tabela copiada! Pode colar diretamente no Excel ou Google Sheets (Ctrl+V)');
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl text-slate-200">
      {/* Top Header & Summary KPIs */}
      <div className="p-4 bg-slate-950 border-b border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
              Lista de Componentes e Material (BOM)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Projeto: <span className="text-slate-200 font-mono">{project.config.projectCode}</span> — {project.config.name}
            </p>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => setIsWireModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-200 text-xs font-semibold rounded-lg border border-amber-600/50 shadow-sm transition active:scale-98"
              title="Abrir módulo de dimensionamento e cálculo de fiação (EN 60204-1 / IEC 60364-5-52)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Cálculo de Fiação</span>
            </button>

            {/* Excel & Spreadsheet Export Suite */}
            <div className="relative" ref={exportDropdownRef}>
              <div className="flex items-center rounded-lg shadow-sm border border-emerald-600/60 bg-emerald-950/80 overflow-hidden">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-emerald-900 text-emerald-200 text-xs font-bold transition active:scale-98"
                  title="Descarregar planilha Excel (.xls) com formatação profissional, preços em euros e fórmulas de totais"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Planilha Excel (.xls)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  className="px-1.5 py-1.5 border-l border-emerald-700 hover:bg-emerald-900 text-emerald-300 transition"
                  title="Mais opções de exportação: CSV Excel, CSV Universal, Copiar"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Formatos de Planilha & Orçamentação
                  </div>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-slate-200 hover:text-white hover:bg-emerald-950/60 transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-emerald-300">Planilha Excel (.xls)</div>
                      <div className="text-[10px] text-slate-400">Estilos corporativos, tipos moeda (€) e fórmulas</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcelCsv}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
                  >
                    <Download className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">CSV para Excel (Portugal / UE)</div>
                      <div className="text-[10px] text-slate-400">Separador ponto e vírgula (;) e UTF-8 com BOM</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportUniversalCsv}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-slate-200 hover:text-white hover:bg-slate-800 transition"
                  >
                    <Download className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">CSV Padrão Internacional</div>
                      <div className="text-[10px] text-slate-400">Separador vírgula (,) para Google Sheets e ERPs</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyClipboard}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-slate-200 hover:text-white hover:bg-slate-800 transition border-t border-slate-800 mt-1 pt-1.5"
                  >
                    <Copy className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Copiar Tabela (TSV)</div>
                      <div className="text-[10px] text-slate-400">Colar direto no Excel ou Google Sheets (Ctrl+V)</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-98"
              title="Exportar todo o projeto num documento PDF formatado profissionalmente (Esquemas, Layout 2D, BOM e Ensaios)"
            >
              <FileText className="w-3.5 h-3.5 text-white" />
              <span>Dossier PDF Completo</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white text-xs font-medium rounded-lg border border-sky-500/40 transition"
              title="Personalizar dados da empresa, cliente, cabeçalho e opções do relatório técnico"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Personalizar Impressão</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </div>

        {/* Export Notification Toast */}
        {exportNotice && (
          <div className="mb-3 px-3.5 py-2 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Total de Artigos</span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-1 block">
              {totalQuantity} <span className="text-xs text-slate-500 font-normal">unidades</span>
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Ocupação Total DIN</span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-1 block">
              {totalWidthMm} <span className="text-xs text-slate-500 font-normal">mm lineares</span>
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Referências Únicas</span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-1 block">
              {bomItems.length} <span className="text-xs text-slate-500 font-normal">modelos</span>
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Orçamento Estimado</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {totalCost.toFixed(2)} <span className="text-xs text-emerald-500 font-normal">€</span>
            </span>
          </div>
        </div>

        {/* Live Filter & Search Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800/80 no-print">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por modelo, marca ou tag (Q1, G1, A1)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Brand Filter */}
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todas as Marcas</option>
              <option value="Mean Well">Mean Well</option>
              <option value="Siemens">Siemens</option>
              <option value="Legrand">Legrand (Bornes Viking 3)</option>
              <option value="Finder">Finder (Relés & Temporizadores)</option>
              <option value="Schneider Electric">Schneider Electric</option>
              <option value="Phoenix Contact">Phoenix Contact</option>
              <option value="Weidmüller">Weidmüller</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todas as Categorias</option>
              <option value="power_supply">Fontes de Alimentação DIN</option>
              <option value="plc_cpu">CPUs Siemens</option>
              <option value="plc_expansion">Expansões Siemens</option>
              <option value="relays">Relés (Interface, Potência, Timers)</option>
              <option value="terminals">Bornes (Viking 3 Legrand, Weidmüller)</option>
              <option value="protection_ac">Proteções AC</option>
              <option value="protection_dc">Proteções DC</option>
              <option value="motor_control">Comando Motores / Contactores</option>
              <option value="safety_relays">Segurança / Emergência</option>
            </select>
          </div>
        </div>
      </div>

      {/* Structured Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 select-none">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Designação / Tags</th>
              <th className="py-2.5 px-4 font-semibold">Fabricante</th>
              <th className="py-2.5 px-4 font-semibold">Referência Comercial</th>
              <th className="py-2.5 px-4 font-semibold">Descrição Técnica</th>
              <th className="py-2.5 px-3 font-semibold text-center" title="Bitola recomendada de condutor flexível de cobre (EN 60204-1 / IEC 60364-5-52)">
                Bitola Sugerida
              </th>
              <th className="py-2.5 px-3 font-semibold text-center">Largura</th>
              <th className="py-2.5 px-3 font-semibold text-center">Qtd</th>
              <th className="py-2.5 px-4 font-semibold text-right">P. Unit (€)</th>
              <th className="py-2.5 px-4 font-semibold text-right">Total (€)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr key={item.key} className="hover:bg-slate-800/40 transition-colors">
                  {/* Tags */}
                  <td className="py-2.5 px-4 font-bold text-sky-400">
                    {item.tags.join(', ')}
                  </td>

                  {/* Brand */}
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-300">
                    {item.brand === 'Mean Well' ? (
                      <span className="text-sky-400 font-bold">Mean Well</span>
                    ) : item.brand === 'Siemens' ? (
                      <span className="text-teal-400 font-bold">Siemens</span>
                    ) : item.brand === 'Legrand' ? (
                      <span className="text-amber-400 font-bold">Legrand (Viking 3)</span>
                    ) : item.brand === 'Finder' ? (
                      <span className="text-blue-400 font-bold">Finder</span>
                    ) : (
                      item.brand
                    )}
                  </td>

                  {/* Part Number */}
                  <td className="py-2.5 px-4 font-bold text-slate-100">
                    {item.partNumber}
                  </td>

                  {/* Description */}
                  <td className="py-2.5 px-4 font-sans text-slate-300 max-w-md">
                    <span className="font-medium text-slate-200 block">{item.name}</span>
                    <span className="text-[11px] text-slate-500 block truncate">{item.description}</span>
                  </td>

                  {/* Recommended Wire Badge */}
                  <td className="py-2.5 px-3 text-center">
                    {item.recommendedWireMm2 ? (
                      <button
                        type="button"
                        onClick={() => setIsWireModalOpen(true)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold font-mono transition hover:scale-105 cursor-pointer ${
                          item.recommendedWireMm2 >= 6.0
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/80 hover:bg-amber-900'
                            : item.recommendedWireMm2 >= 2.5
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900'
                            : item.recommendedWireMm2 >= 1.5
                            ? 'bg-blue-950 text-blue-300 border border-blue-800/80 hover:bg-blue-900'
                            : 'bg-purple-950 text-purple-300 border border-purple-800/80 hover:bg-purple-900'
                        }`}
                        title={`Bitola recomendada: ${item.recommendedWireMm2} mm² segundo EN 60204-1. Clique para abrir o módulo de cálculo.`}
                      >
                        <Zap className="w-2.5 h-2.5 opacity-80" />
                        <span>{item.recommendedWireMm2} mm²</span>
                      </button>
                    ) : (
                      <span className="text-slate-600 font-sans text-xs">--</span>
                    )}
                  </td>

                  {/* Width mm */}
                  <td className="py-2.5 px-3 text-center text-slate-400">
                    {item.widthMm > 0 ? `${item.widthMm} mm` : '--'}
                  </td>

                  {/* Quantity */}
                  <td className="py-2.5 px-3 text-center font-bold text-slate-100">
                    {item.quantity}
                  </td>

                  {/* Unit Price */}
                  <td className="py-2.5 px-4 text-right text-slate-300">
                    {item.unitPriceEur.toFixed(2)} €
                  </td>

                  {/* Total Price */}
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-400">
                    {item.totalPriceEur.toFixed(2)} €
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                  Nenhum componente encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Total */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-950 border-t border-slate-800 text-xs">
        <span className="text-slate-400">
          Apresentando <span className="text-slate-200 font-bold">{filteredItems.length}</span> de{' '}
          <span className="text-slate-200 font-bold">{bomItems.length}</span> linhas de componentes
        </span>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">Valor Total Estimado:</span>
          <span className="text-base font-bold font-mono text-emerald-400">
            {totalCost.toFixed(2)} €
          </span>
        </div>
      </div>

      {isPrintModalOpen && (
        <PrintCustomizationModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          project={project}
        />
      )}

      {isWireModalOpen && (
        <WireCalculationModal
          isOpen={isWireModalOpen}
          onClose={() => setIsWireModalOpen(false)}
          project={project}
        />
      )}

      {isPdfModalOpen && (
        <SchematicPdfExportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          project={project}
        />
      )}
    </div>
  );
};
