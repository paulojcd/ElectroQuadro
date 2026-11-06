import React, { useState, useMemo } from 'react';
import { ProjectState } from '../types/electrical';
import { 
  getProjectWiringList, 
  calculateCableMeterageSummary, 
  exportWiringListToCsv, 
  copyWiringListToClipboard, 
  WiringListItem 
} from '../utils/wiringListExporter';
import { 
  X, Download, Copy, Check, Filter, Search, 
  Activity, Tag, Disc, Layers, Zap, ArrowRight, Table, PackageCheck 
} from 'lucide-react';

interface WiringListModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onShowNotification?: (msg: string) => void;
}

export const WiringListModal: React.FC<WiringListModalProps> = ({
  isOpen,
  onClose,
  project,
  onShowNotification,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'ac_phase' | 'ac_neutral' | 'pe_ground' | 'dc' | 'control'>('all');
  const [activeView, setActiveView] = useState<'table' | 'stock'>('table');
  const [copiedRecently, setCopiedRecently] = useState(false);

  const wiringItems: WiringListItem[] = useMemo(() => {
    return getProjectWiringList(project);
  }, [project]);

  const stockSummary = useMemo(() => {
    return calculateCableMeterageSummary(wiringItems);
  }, [wiringItems]);

  const totalLengthM = useMemo(() => {
    return Math.round(wiringItems.reduce((acc, curr) => acc + curr.lengthM, 0) * 10) / 10;
  }, [wiringItems]);

  // Filter items based on category and search query
  const filteredItems = useMemo(() => {
    return wiringItems.filter((w) => {
      // Category filter
      if (selectedFilter === 'ac_phase' && w.netType !== 'ac_phase') return false;
      if (selectedFilter === 'ac_neutral' && w.netType !== 'ac_neutral') return false;
      if (selectedFilter === 'pe_ground' && w.netType !== 'pe_ground') return false;
      if (selectedFilter === 'dc' && w.netType !== 'dc_positive' && w.netType !== 'dc_negative') return false;
      if (selectedFilter === 'control' && w.netType !== 'control_signal' && w.netType !== 'analog_signal') return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        w.wireTag.toLowerCase().includes(q) ||
        w.fromComponentTag.toLowerCase().includes(q) ||
        w.fromComponentName.toLowerCase().includes(q) ||
        w.fromTerminal.toLowerCase().includes(q) ||
        w.toComponentTag.toLowerCase().includes(q) ||
        w.toComponentName.toLowerCase().includes(q) ||
        w.toTerminal.toLowerCase().includes(q) ||
        w.netTypeLabel.toLowerCase().includes(q) ||
        w.wireColorName.toLowerCase().includes(q)
      );
    });
  }, [wiringItems, selectedFilter, searchQuery]);

  const handleCopyClipboard = async () => {
    const success = await copyWiringListToClipboard(wiringItems);
    if (success) {
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2500);
      onShowNotification?.('📋 Lista de cablagem copiada em formato TSV (Compatível c/ Excel e Sheets)!');
    } else {
      onShowNotification?.('❌ Não foi possível copiar para a área de transferência.');
    }
  };

  const handleExportCsv = (format: 'european_excel' | 'universal_csv') => {
    exportWiringListToCsv(wiringItems, project.config.name || 'Quadro_Eletrico', { format });
    onShowNotification?.(
      format === 'european_excel'
        ? '📥 Ficheiro CSV (Excel Portugal / UE com delimitador ";" e UTF-8 BOM) descarregado!'
        : '📥 Ficheiro CSV Universal descarregado!'
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Lista de Cablagem Detalhada (De-Para)</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 font-bold">
                  EN 60204-1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mapeamento de ligações From-To, secções recomendadas por corrente, cores normalizadas e comprimentos ortogonais (Manhattan)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800 shrink-0">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-950/50 text-blue-400 border border-blue-800/40">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Total de Condutores</div>
              <div className="text-lg font-bold text-white font-mono">{wiringItems.length} fios</div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Metragem Total Roteada</div>
              <div className="text-lg font-bold text-emerald-300 font-mono">{totalLengthM} m</div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-950/50 text-purple-400 border border-purple-800/40">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Bobinas & Calibres</div>
              <div className="text-lg font-bold text-purple-300 font-mono">{stockSummary.length} tipos</div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-950/50 text-amber-400 border border-amber-800/40">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Norma do Condutor</div>
              <div className="text-sm font-bold text-amber-300 font-mono truncate">H07V-K / H05V-K</div>
            </div>
          </div>
        </div>

        {/* View Switcher, Filter & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-6 py-2.5 bg-slate-950/80 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveView('table')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                activeView === 'table' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabela De-Para ({filteredItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('stock')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                activeView === 'stock' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Resumo Metragem & Stock ({stockSummary.length})</span>
            </button>
          </div>

          {activeView === 'table' && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 text-[11px] font-medium bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedFilter('all')}
                  className={`px-2 py-0.8 rounded ${selectedFilter === 'all' ? 'bg-slate-750 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('ac_phase')}
                  className={`px-2 py-0.8 rounded ${selectedFilter === 'ac_phase' ? 'bg-amber-900 text-amber-200 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Fase L
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('ac_neutral')}
                  className={`px-2 py-0.8 rounded ${selectedFilter === 'ac_neutral' ? 'bg-sky-900 text-sky-200 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Neutro N
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('pe_ground')}
                  className={`px-2 py-0.8 rounded ${selectedFilter === 'pe_ground' ? 'bg-emerald-900 text-emerald-200 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Terra PE
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('dc')}
                  className={`px-2 py-0.8 rounded ${selectedFilter === 'dc' ? 'bg-red-900 text-red-200 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  DC 24V
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('control')}
                  className={`px-2 py-0.8 rounded ${selectedFilter === 'control' ? 'bg-orange-900 text-orange-200 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Sinais
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-48 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Pesquisar borne, tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Body / Table View */}
        <div className="flex-1 overflow-auto p-4">
          {activeView === 'table' ? (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 shadow-inner">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <th className="py-2.5 px-3">Anilha</th>
                    <th className="py-2.5 px-3">Origem (DE)</th>
                    <th className="py-2.5 px-3">Destino (PARA)</th>
                    <th className="py-2.5 px-3">Circuito</th>
                    <th className="py-2.5 px-3">Cor & Secção (EN 60204)</th>
                    <th className="py-2.5 px-3 text-right">In (A)</th>
                    <th className="py-2.5 px-3 text-right">Comp. Roteado</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        Nenhum condutor encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/60 transition group">
                        {/* Wire Tag */}
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-600/40 text-[11px]">
                            {item.wireTag}
                          </span>
                        </td>

                        {/* From Component & Terminal */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <span>{item.fromComponentTag}</span>
                            <span className="px-1 py-0.2 rounded bg-slate-800 text-sky-400 text-[10px] font-mono border border-slate-700">
                              T:{item.fromTerminal}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[170px]" title={item.fromComponentName}>
                            {item.fromComponentName}
                          </div>
                          <div className="text-[9px] text-slate-500">{item.fromLocation}</div>
                        </td>

                        {/* To Component & Terminal */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <span>{item.toComponentTag}</span>
                            <span className="px-1 py-0.2 rounded bg-slate-800 text-sky-400 text-[10px] font-mono border border-slate-700">
                              T:{item.toTerminal}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[170px]" title={item.toComponentName}>
                            {item.toComponentName}
                          </div>
                          <div className="text-[9px] text-slate-500">{item.toLocation}</div>
                        </td>

                        {/* Circuit Type */}
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-200">{item.netTypeLabel}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.voltage}</div>
                        </td>

                        {/* Cable Color & Cross-section */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-700 shadow-xs"
                              style={{ backgroundColor: item.wireColorHex }}
                            />
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{item.crossSectionMm2} mm²</span>
                                <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                                  {item.cableSpec}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">{item.wireColorName}</div>
                            </div>
                          </div>
                        </td>

                        {/* Nominal Current */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300 font-semibold">
                          {item.currentNominalA > 0 ? `${item.currentNominalA.toFixed(1)} A` : '—'}
                        </td>

                        {/* Physical Length */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-mono font-bold text-white">{item.lengthM.toFixed(2)} m</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.lengthMm} mm</div>
                        </td>

                        {/* Energized Status */}
                        <td className="py-2.5 px-3 text-center">
                          {item.isEnergized ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/40 text-[10px] text-emerald-300 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                              0V
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Stock Meterage Summary Table */
            <div className="space-y-4">
              <div className="p-4 bg-purple-950/20 border border-purple-800/40 rounded-xl text-xs text-purple-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm mb-0.5">Resumo de Stock & Compra de Bobinas de Fio</h4>
                  <p className="text-slate-400">
                    Comprimentos agrupados por tipo, cor normalizada e secção transversal com margem de segurança de corte (+15%).
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xl font-bold text-emerald-400">{totalLengthM} m</div>
                  <div className="text-[11px] text-slate-400">Comprimento Total Necessário</div>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-4">Norma & Calibre</th>
                      <th className="py-2.5 px-4">Cor EN 60204-1</th>
                      <th className="py-2.5 px-4">Aplicação / Circuito</th>
                      <th className="py-2.5 px-4 text-center">Nº Condutores</th>
                      <th className="py-2.5 px-4 text-right">Comprimento Real</th>
                      <th className="py-2.5 px-4 text-right">Bobina Recomendada (+15%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {stockSummary.map((stock) => (
                      <tr key={stock.key} className="hover:bg-slate-900/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white font-mono text-sm">
                            {stock.cableSpec} {stock.crossSectionMm2} mm²
                          </div>
                          <div className="text-[10px] text-slate-400">Cabo flexível unipolar (EN 50525-2-31)</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-4 h-4 rounded-full border border-slate-700 shadow-xs shrink-0"
                              style={{ backgroundColor: stock.colorHex }}
                            />
                            <span className="font-semibold text-slate-200">{stock.colorName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {stock.netTypeLabel}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-sky-400">
                          {stock.wireCount} fios
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white text-sm">
                          {stock.totalLengthM.toFixed(1)} m
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-block px-2 py-0.8 rounded-md bg-emerald-950 border border-emerald-600/40 text-emerald-300 font-mono font-bold">
                            {stock.recommendedSpoolM} m
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition active:scale-98"
              title="Copiar lista de fios como tabela TSV para colar diretamente no Excel ou Google Sheets"
            >
              {copiedRecently ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedRecently ? 'Copiado!' : 'Copiar (Excel / Sheets)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportCsv('universal_csv')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition active:scale-98"
              title="Descarregar CSV com delimitador de vírgula padrão"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>CSV Universal</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportCsv('european_excel')}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-emerald-700/20 active:scale-98"
              title="Descarregar ficheiro CSV formatado especificamente para Excel em Portugal / UE (delimitador ';' e acentuação UTF-8 BOM correta)"
            >
              <Download className="w-4 h-4" />
              <span>Descarregar CSV (Excel Portugal / UE)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition ml-1"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
