import React, { useState, useRef, useMemo } from 'react';
import { CatalogItem, ComponentCategory } from '../types/electrical';
import { 
  useComponentCatalog, 
  deleteCustomComponent, 
  importCustomComponents 
} from '../utils/customComponentStorage';
import { 
  exportComponentsToExcel, 
  exportBlankExcelTemplate, 
  parseExcelComponentFile, 
  CATEGORY_DEFINITIONS,
  ParseResult 
} from '../utils/excelComponentIO';
import { CustomComponentModal } from './CustomComponentModal';
import { 
  X, Search, Plus, Download, Upload, FileSpreadsheet, Trash2, Edit3, 
  Copy, Check, AlertCircle, Info, Sparkles, Filter, ChevronRight, 
  Layers, ArrowUpDown, RefreshCw, AlertTriangle, ArrowRight, Eye, Box
} from 'lucide-react';

interface ComponentLibraryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRailIndex?: number;
  railCount?: number;
  onAddComponent?: (item: CatalogItem, railIndex: number, quantity?: number) => void;
  onShowNotification?: (msg: string) => void;
}

export const ComponentLibraryManagerModal: React.FC<ComponentLibraryManagerModalProps> = ({
  isOpen,
  onClose,
  targetRailIndex = 0,
  railCount = 4,
  onAddComponent,
  onShowNotification,
}) => {
  const { allComponents, customComponents, factoryComponents, refreshCatalog } = useComponentCatalog();
  
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'all' | 'custom' | 'factory'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRail, setSelectedRail] = useState<number>(targetRailIndex);

  // Sub-modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ParseResult | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deletion confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Custom set for fast lookup
  const customIdSet = useMemo(() => {
    return new Set(customComponents.map((c) => c.catalogId));
  }, [customComponents]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let list: CatalogItem[] = [];
    if (activeTab === 'all') {
      list = allComponents;
    } else if (activeTab === 'custom') {
      list = customComponents;
    } else {
      list = factoryComponents;
    }

    return list.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchTerm.trim().length > 0) {
        const q = searchTerm.toLowerCase();
        const matches =
          item.name.toLowerCase().includes(q) ||
          item.partNumber.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          (item.series && item.series.toLowerCase().includes(q)) ||
          item.description.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allComponents, customComponents, factoryComponents, activeTab, selectedCategory, searchTerm]);

  // Handle Excel file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = async (file: File) => {
    setIsImporting(true);
    setImportFileName(file.name);
    try {
      const parsed = await parseExcelComponentFile(file);
      setImportResult(parsed);
    } catch (err: any) {
      setImportResult({
        items: [],
        errors: [`Erro ao processar ficheiro: ${err?.message || 'Ficheiro corrompido'}`],
        warnings: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const confirmImport = () => {
    if (!importResult || importResult.items.length === 0) return;

    const stats = importCustomComponents(importResult.items, importMode);
    refreshCatalog();

    const msg = `Importados com sucesso ${stats.added} componentes novos (${stats.updated} atualizados)!`;
    if (onShowNotification) {
      onShowNotification(msg);
    }

    setImportResult(null);
    setImportFileName('');
    setActiveTab('custom');
  };

  const cancelImport = () => {
    setImportResult(null);
    setImportFileName('');
  };

  const handleDelete = (catalogId: string) => {
    deleteCustomComponent(catalogId);
    refreshCatalog();
    setDeletingId(null);
    if (onShowNotification) {
      onShowNotification('Componente removido da biblioteca personalizada.');
    }
  };

  const handleOpenEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setIsCreateModalOpen(true);
  };

  const handleDuplicate = (item: CatalogItem) => {
    const cloned: Partial<CatalogItem> = {
      ...item,
      catalogId: undefined, // generates new ID
      name: `${item.name} (Cópia)`,
      partNumber: `${item.partNumber}-MOD`,
    };
    setEditingItem(cloned as CatalogItem);
    setIsCreateModalOpen(true);
  };

  const handleAddDirectly = (item: CatalogItem) => {
    if (onAddComponent) {
      onAddComponent(item, selectedRail, 1);
      if (onShowNotification) {
        onShowNotification(`Adicionado "${item.name}" à Calha ${selectedRail + 1}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 overflow-hidden select-none">
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[94vh] text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Gestão da Biblioteca de Componentes</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  Excel (.xlsx) & Personalizados
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Crie os seus componentes, exporte para o Excel para editar ou adicione novos em massa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Actions Buttons */}
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Componente</span>
            </button>

            <button
              type="button"
              onClick={() => exportComponentsToExcel()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-600/50 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              title="Descarregar toda a biblioteca em ficheiro Excel (.xlsx) com guia de categorias"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => exportBlankExcelTemplate()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Descarregar modelo em branco do Excel com exemplos para preencher novos componentes"
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              <span>Modelo Vazio</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/50 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              title="Importar componentes de ficheiro Excel (.xlsx) ou CSV"
            >
              <Upload className="w-4 h-4 text-purple-400" />
              <span>Importar Excel</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content / Body */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* If Excel Import in progress / Previewing Result */}
          {importResult && (
            <div className="p-5 bg-slate-950 border-b border-purple-900/60 shadow-lg shrink-0 max-h-[45vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Pré-visualização da Importação Excel:</span>
                      <span className="font-mono text-xs text-purple-300 font-semibold">{importFileName}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Foram detetados <strong>{importResult.items.length}</strong> componentes válidos prontos para inclusão na sua biblioteca.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelImport}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmImport}
                    disabled={importResult.items.length === 0}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar & Gravar {importResult.items.length} Componentes</span>
                  </button>
                </div>
              </div>

              {/* Mode Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
                <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  importMode === 'merge' ? 'bg-purple-950/40 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-200">Adicionar e Atualizar (Recomendado)</div>
                    <div className="text-[11px] text-slate-400">Mantém os seus componentes existentes e adiciona os novos do ficheiro Excel.</div>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  importMode === 'replace' ? 'bg-purple-950/40 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-200">Substituir Biblioteca Personalizada</div>
                    <div className="text-[11px] text-slate-400">Substitui integralmente todos os itens personalizados pelos do Excel.</div>
                  </div>
                </label>
              </div>

              {/* Errors & Warnings */}
              {importResult.errors.length > 0 && (
                <div className="mb-3 p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-red-200 text-xs">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span>Erros na leitura:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importResult.warnings.length > 0 && (
                <div className="mb-3 p-3 bg-amber-950/60 border border-amber-500/50 rounded-xl text-amber-200 text-xs">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Avisos de formatação ({importResult.warnings.length}):</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-0.5 pl-5 list-disc">
                    {importResult.warnings.slice(0, 10).map((w, i) => (
                      <div key={i}>• {w}</div>
                    ))}
                    {importResult.warnings.length > 10 && (
                      <div className="font-semibold mt-1">... e mais {importResult.warnings.length - 10} avisos.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Table of Parsed Components */}
              <div className="border border-slate-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Tag</th>
                      <th className="py-2 px-3">Nome</th>
                      <th className="py-2 px-3">Marca</th>
                      <th className="py-2 px-3">Part Number</th>
                      <th className="py-2 px-3">Categoria</th>
                      <th className="py-2 px-3 text-right">Largura (mm)</th>
                      <th className="py-2 px-3 text-right">Preço (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {importResult.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60">
                        <td className="py-1.5 px-3 text-amber-400 font-bold">{item.tagPrefix}</td>
                        <td className="py-1.5 px-3 text-white font-sans font-medium">{item.name}</td>
                        <td className="py-1.5 px-3 text-slate-300">{item.brand}</td>
                        <td className="py-1.5 px-3 text-slate-400">{item.partNumber}</td>
                        <td className="py-1.5 px-3 text-sky-400">{CATEGORY_DEFINITIONS[item.category]?.name || item.category}</td>
                        <td className="py-1.5 px-3 text-right text-emerald-400 font-bold">{item.widthMm}mm</td>
                        <td className="py-1.5 px-3 text-right text-slate-300">{item.estimatedPriceEur?.toFixed(2)}€</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-header: Filter bar & Search */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Todos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                  {allComponents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'custom' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Os Meus / Personalizados</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-200 font-mono font-bold">
                  {customComponents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('factory')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'factory' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Catálogo de Fábrica</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                  {factoryComponents.length}
                </span>
              </button>
            </div>

            {/* Category Dropdown & Search Bar */}
            <div className="flex items-center gap-2.5 flex-1 max-w-xl">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Todas as Categorias</option>
                {Object.entries(CATEGORY_DEFINITIONS).map(([code, def]) => (
                  <option key={code} value={code}>
                    {def.name}
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome, referência, marca..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Target rail for quick placement */}
            {onAddComponent && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                <span>Destino:</span>
                <select
                  value={selectedRail}
                  onChange={(e) => setSelectedRail(Number(e.target.value))}
                  className="bg-transparent text-white font-semibold focus:outline-hidden cursor-pointer"
                >
                  {Array.from({ length: railCount }).map((_, i) => (
                    <option key={i} value={i} className="bg-slate-900">
                      Calha {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Drag & Drop Overlay or Main Table */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-1 overflow-y-auto relative ${
              isDragging ? 'bg-purple-950/20 border-2 border-dashed border-purple-500' : ''
            }`}
          >
            {isDragging && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-xs pointer-events-none">
                <FileSpreadsheet className="w-16 h-16 text-purple-400 animate-bounce mb-3" />
                <p className="text-base font-bold text-white">Largue o ficheiro Excel (.xlsx ou .csv) aqui</p>
                <p className="text-xs text-slate-400 mt-1">Os componentes serão lidos e adicionados à sua biblioteca</p>
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center text-slate-400 p-6">
                <Box className="w-12 h-12 text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-200">Nenhum componente encontrado</h4>
                <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                  {searchTerm
                    ? `Nenhum resultado corresponde à pesquisa "${searchTerm}".`
                    : activeTab === 'custom'
                    ? 'Ainda não tem componentes personalizados criados ou importados.'
                    : 'Não existem componentes nesta categoria.'}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar Primeiro Componente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportBlankExcelTemplate()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Descarregar Modelo Excel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filteredItems.map((item) => {
                  const isCustom = customIdSet.has(item.catalogId);
                  const isDeleting = deletingId === item.catalogId;

                  return (
                    <div
                      key={item.catalogId}
                      className="p-3.5 hover:bg-slate-850/60 flex items-center justify-between gap-4 transition group"
                    >
                      {/* Left: Component Visual + Info */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Mini Color Swatch / DIN Icon */}
                        <div
                          className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 border border-white/20 shadow-xs relative"
                          style={{ backgroundColor: item.color || '#334155' }}
                        >
                          <span className="text-[10px] font-mono font-bold text-white drop-shadow-xs">
                            {item.tagPrefix}
                          </span>
                          <span className="text-[8px] font-mono text-white/80">
                            {item.widthMm}m
                          </span>
                        </div>

                        {/* Title & Metadata */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-xs font-bold text-white truncate max-w-[340px]" 
                              title={item.name}
                            >
                              {item.name}
                            </span>
                            
                            {isCustom ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                                Personalizado
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                                Fábrica
                              </span>
                            )}

                            <span className="text-[10px] text-slate-400 hidden sm:inline">
                              • {CATEGORY_DEFINITIONS[item.category]?.name || item.category}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-slate-300 font-medium">{item.brand}</span>
                            {item.series && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span>{item.series}</span>
                              </>
                            )}
                            <span className="text-slate-600">•</span>
                            <span className="font-mono text-slate-300">{item.partNumber}</span>
                            <span className="text-slate-600">•</span>
                            <span className="font-mono text-emerald-400 font-bold">{item.widthMm}mm ({item.dinModules || Math.round((item.widthMm / 18) * 10) / 10} mod)</span>
                            {item.ratedCurrentA && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="font-mono text-amber-300">{item.ratedCurrentA}A</span>
                              </>
                            )}
                            {item.ratedPowerW && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="font-mono text-amber-300">{item.ratedPowerW}W</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Price & Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-bold text-emerald-400 w-16 text-right hidden md:inline">
                          {item.estimatedPriceEur !== undefined ? `${Number(item.estimatedPriceEur).toFixed(2)}€` : '0.00€'}
                        </span>

                        {/* Add to current rail */}
                        {onAddComponent && (
                          <button
                            type="button"
                            onClick={() => handleAddDirectly(item)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                            title={`Adicionar à Calha ${selectedRail + 1}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Calha {selectedRail + 1}</span>
                          </button>
                        )}

                        {/* Duplicate / Make Variant */}
                        <button
                          type="button"
                          onClick={() => handleDuplicate(item)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                          title="Duplicar e criar variante deste componente"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit (if custom) */}
                        {isCustom ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition"
                            title="Editar especificações do componente"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}

                        {/* Delete (if custom) */}
                        {isCustom ? (
                          isDeleting ? (
                            <div className="flex items-center gap-1 bg-red-950 p-1 rounded-lg border border-red-500/60 animate-in fade-in duration-100">
                              <button
                                type="button"
                                onClick={() => handleDelete(item.catalogId)}
                                className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-500"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="px-1.5 py-0.5 text-slate-400 hover:text-white text-[10px]"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingId(item.catalogId)}
                              className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                              title="Eliminar este componente da biblioteca"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        ) : null}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Guide & Help Strip */}
          <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{customComponents.length} Personalizados</span>
              </span>
              <span>•</span>
              <span>{factoryComponents.length} de Fábrica</span>
              <span>•</span>
              <span className="text-slate-300 font-bold">{allComponents.length} Total no Catálogo</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">
                💡 Dica: Pode exportar para Excel, editar colunas ou adicionar centenas de componentes e depois importar com 1 clique.
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Sub-Modal: Custom Component Form */}
      {isCreateModalOpen && (
        <CustomComponentModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingItem(null);
          }}
          initialItem={editingItem}
          targetRailIndex={selectedRail}
          onSaved={(savedItem, addToRail) => {
            refreshCatalog();
            setActiveTab('custom');
            if (addToRail && onAddComponent) {
              onAddComponent(savedItem, selectedRail, 1);
            }
            if (onShowNotification) {
              onShowNotification(`Componente "${savedItem.name}" gravado com sucesso!`);
            }
          }}
        />
      )}
    </div>
  );
};
