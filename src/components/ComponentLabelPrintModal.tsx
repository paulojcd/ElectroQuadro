import React, { useState, useMemo, useEffect } from 'react';
import { 
  ProjectState, 
  PlacedComponent 
} from '../types/electrical';
import { 
  LABEL_PRESETS, 
  LabelPresetId, 
  LabelPresetConfig,
  LabelPdfExportOptions,
  PrintableComponentItem,
  getPrintableItemsFromProject,
  generateComponentLabelsPdf
} from '../utils/labelPdfGenerator';
import { 
  Printer, Download, X, Eye, CheckSquare, Square, 
  Sliders, Tag, Layers, RefreshCw, Sparkles, 
  FileText, Check, Search, HelpCircle, Scissors, 
  ZoomIn, ZoomOut, AlertCircle, Bookmark, ShieldCheck
} from 'lucide-react';

interface ComponentLabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onShowNotification?: (msg: string) => void;
}

export const ComponentLabelPrintModal: React.FC<ComponentLabelPrintModalProps> = ({
  isOpen,
  onClose,
  project,
  onShowNotification,
}) => {
  // Preset selection
  const [selectedPresetId, setSelectedPresetId] = useState<LabelPresetId>('strip_din_a4');
  const [activeTab, setActiveTab] = useState<'preview' | 'items'>('preview');

  // Display toggles
  const [showTag, setShowTag] = useState<boolean>(true);
  const [showDescription, setShowDescription] = useState<boolean>(true);
  const [showRating, setShowRating] = useState<boolean>(true);
  const [showCircuitSymbol, setShowCircuitSymbol] = useState<boolean>(true);
  const [showPartNumber, setShowPartNumber] = useState<boolean>(false);
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [showCutLines, setShowCutLines] = useState<boolean>(true);
  const [showRailHeader, setShowRailHeader] = useState<boolean>(true);
  const [fontSizePreference, setFontSizePreference] = useState<'compact' | 'normal' | 'large'>('normal');

  // Preview zoom
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [previewFilterRail, setPreviewFilterRail] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Editable items state
  const [itemOverrides, setItemOverrides] = useState<Record<string, { tag?: string; description?: string; selected?: boolean }>>({});
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Sync / populate items
  const items: PrintableComponentItem[] = useMemo(() => {
    return getPrintableItemsFromProject(project, itemOverrides);
  }, [project, itemOverrides]);

  const selectedPreset: LabelPresetConfig = LABEL_PRESETS[selectedPresetId] || LABEL_PRESETS.strip_din_a4;

  const selectedItems = useMemo(() => items.filter((i) => i.selected), [items]);
  const totalModules = useMemo(() => selectedItems.reduce((acc, it) => acc + it.dinModules, 0), [selectedItems]);

  // Handle single item field update
  const handleUpdateItem = (id: string, field: 'tag' | 'description', value: string) => {
    setItemOverrides((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  // Toggle item selection
  const handleToggleSelect = (id: string) => {
    setItemOverrides((prev) => {
      const current = prev[id]?.selected !== undefined ? prev[id].selected : true;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          selected: !current,
        },
      };
    });
  };

  // Toggle all items
  const handleSelectAll = (select: boolean) => {
    const updated: Record<string, { tag?: string; description?: string; selected?: boolean }> = { ...itemOverrides };
    items.forEach((it) => {
      updated[it.id] = {
        ...updated[it.id],
        selected: select,
      };
    });
    setItemOverrides(updated);
  };

  // Reset all overrides
  const handleResetOverrides = () => {
    setItemOverrides({});
    if (onShowNotification) onShowNotification('Textos das etiquetas repostos para os valores padrão do quadro.');
  };

  // Quick Preset Profiles
  const applyQuickProfile = (profile: 'residential' | 'industrial' | 'compact') => {
    if (profile === 'residential') {
      setSelectedPresetId('strip_din_a4');
      setShowTag(true);
      setShowDescription(true);
      setShowRating(true);
      setShowCircuitSymbol(true);
      setShowPartNumber(false);
      setShowBorders(true);
      setShowCutLines(true);
      setFontSizePreference('normal');
    } else if (profile === 'industrial') {
      setSelectedPresetId('thermal_roll_50x25');
      setShowTag(true);
      setShowDescription(true);
      setShowRating(true);
      setShowCircuitSymbol(false);
      setShowPartNumber(true);
      setShowBorders(true);
      setShowCutLines(false);
      setFontSizePreference('large');
    } else if (profile === 'compact') {
      setSelectedPresetId('strip_din_12mm_a4');
      setShowTag(true);
      setShowDescription(true);
      setShowRating(false);
      setShowCircuitSymbol(true);
      setShowPartNumber(false);
      setShowBorders(true);
      setShowCutLines(true);
      setFontSizePreference('compact');
    }
  };

  // Export PDF Handler
  const handleExportPdf = () => {
    if (selectedItems.length === 0) {
      if (onShowNotification) onShowNotification('Selecione pelo menos um componente para gerar as etiquetas.');
      return;
    }

    try {
      setIsExporting(true);
      const options: LabelPdfExportOptions = {
        presetId: selectedPresetId,
        showTag,
        showDescription,
        showRating,
        showCircuitSymbol,
        showPartNumber,
        showBorders,
        showCutLines,
        showRailHeader,
        fontSizePreference,
        colorMode: 'thermal_high_contrast',
        items,
      };

      const doc = generateComponentLabelsPdf(project, options);
      const filename = `Etiquetas_${project.config.projectCode || 'Quadro'}_${selectedPresetId}.pdf`;
      doc.save(filename);

      if (onShowNotification) {
        onShowNotification(`PDF "${filename}" gerado com sucesso! Pronto para imprimir.`);
      }
    } catch (err) {
      console.error('Erro ao gerar PDF de etiquetas:', err);
      if (onShowNotification) onShowNotification('Ocorreu um erro ao gerar o PDF de etiquetas.');
    } finally {
      setIsExporting(false);
    }
  };

  // Print Handler (opens in browser window)
  const handleDirectPrint = () => {
    if (selectedItems.length === 0) {
      if (onShowNotification) onShowNotification('Selecione pelo menos um componente para imprimir.');
      return;
    }

    try {
      const options: LabelPdfExportOptions = {
        presetId: selectedPresetId,
        showTag,
        showDescription,
        showRating,
        showCircuitSymbol,
        showPartNumber,
        showBorders,
        showCutLines,
        showRailHeader,
        fontSizePreference,
        colorMode: 'thermal_high_contrast',
        items,
      };

      const doc = generateComponentLabelsPdf(project, options);
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      } else {
        doc.save(`Etiquetas_${project.config.projectCode || 'Quadro'}.pdf`);
      }
    } catch (err) {
      console.error('Erro na impressão direta:', err);
      handleExportPdf();
    }
  };

  if (!isOpen) return null;

  // Filtered items for preview & table
  const filteredItems = items.filter((it) => {
    const matchesRail = previewFilterRail === 'all' || it.railIndex === previewFilterRail;
    const matchesSearch = 
      !searchTerm.trim() || 
      it.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRail && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col w-full max-w-6xl max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-950/70 border border-purple-700/60 flex items-center justify-center text-purple-400 shrink-0 shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Etiquetas de Identificação de Componentes (Calhas DIN & Térmicas)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  EN 61439-3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Compatível com porta-etiquetas frontais sob os disjuntores (18mm) e impressoras térmicas (Zebra, Brother P-Touch, Dymo).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Settings Sidebar + Right Live Preview / Table */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left Panel: Format, Presets & Content Controls */}
          <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950/70 p-4 overflow-y-auto space-y-4 shrink-0">
            
            {/* Quick Profiles */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                ⚡ Perfis Recomendados
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyQuickProfile('residential')}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 text-[11px] font-medium text-slate-200 transition text-center"
                >
                  🏡 Residencial
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickProfile('industrial')}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 text-[11px] font-medium text-slate-200 transition text-center"
                >
                  🏭 Térmica 50x25
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickProfile('compact')}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 text-[11px] font-medium text-slate-200 transition text-center"
                >
                  📏 Estreito 12mm
                </button>
              </div>
            </div>

            {/* Presets Format Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                📋 Formato & Tipo de Impressão
              </label>
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value as LabelPresetId)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <optgroup label="🗂️ Tiras Modulares Calha DIN (A4 sob os disjuntores)">
                  <option value="strip_din_a4">Tira DIN 15mm A4 (Padrão Schneider/Hager/Legrand)</option>
                  <option value="strip_din_12mm_a4">Tira DIN 12mm A4 (Estreita / Gewiss / Nedbox)</option>
                  <option value="strip_din_18mm_a4">Tira DIN 18mm A4 (Larga / Armários Industriais)</option>
                </optgroup>
                <optgroup label="🖨️ Fitas Contínuas Térmicas (Brother P-Touch / TZe)">
                  <option value="brother_tape_18mm">Brother P-Touch Fita TZe 18mm</option>
                  <option value="brother_tape_24mm">Brother P-Touch Fita TZe 24mm</option>
                  <option value="strip_thermal_continuous">Tira Contínua em Rolo Térmico (Zebra / Brother QL)</option>
                </optgroup>
                <optgroup label="🏷️ Rolo Térmico Individual (Zebra / TSC / Dymo)">
                  <option value="thermal_roll_50x25">Rolo Térmico 50 x 25 mm (Padrão Industrial)</option>
                  <option value="thermal_roll_60x30">Rolo Térmico 60 x 30 mm (Médio com Notas)</option>
                  <option value="thermal_roll_38x19">Rolo Térmico 38 x 19 mm (Disjuntor Compacto)</option>
                  <option value="dymo_99010">Dymo 99010 (89 x 28 mm)</option>
                </optgroup>
                <optgroup label="📄 Folhas A4 Autoadesivas de Escritório">
                  <option value="avery_a4_40">Avery A4 - 40 Etiquetas (48.5 x 25.4 mm)</option>
                  <option value="avery_a4_24">Avery A4 - 24 Etiquetas (70 x 37 mm)</option>
                </optgroup>
              </select>

              {/* Description of current format */}
              <div className="mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] space-y-1">
                <div className="font-semibold text-purple-300 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>{selectedPreset.name}</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  {selectedPreset.description}
                </p>
                <div className="text-[10px] font-mono text-slate-500 pt-0.5 border-t border-slate-850">
                  Destino: <span className="text-slate-300">{selectedPreset.targetDevice}</span>
                </div>
              </div>
            </div>

            {/* Display Fields Checkboxes */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                👁️ Informação Visível na Etiqueta
              </label>

              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTag}
                    onChange={(e) => setShowTag(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-0 bg-slate-950"
                  />
                  <div>
                    <span className="font-semibold text-slate-200">Tag do Componente</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-mono">(ex: Q1, F1, K1)</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDescription}
                    onChange={(e) => setShowDescription(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-0 bg-slate-950"
                  />
                  <div>
                    <span className="font-semibold text-slate-200">Descrição / Função</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">(ex: Iluminação Sala)</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRating}
                    onChange={(e) => setShowRating(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-0 bg-slate-950"
                  />
                  <div>
                    <span className="font-semibold text-slate-200">Corrente Nominal & Polos</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-mono">(ex: 16A 1P+N)</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCircuitSymbol}
                    onChange={(e) => setShowCircuitSymbol(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-0 bg-slate-950"
                  />
                  <div>
                    <span className="font-semibold text-slate-200">Código Mnemónico de Circuito</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-mono">(ex: [ILUM], [TOM], [PLACA])</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPartNumber}
                    onChange={(e) => setShowPartNumber(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-0 bg-slate-950"
                  />
                  <div>
                    <span className="font-semibold text-slate-200">Referência Comercial / Marca</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-mono">(ex: A9F74116)</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBorders}
                    onChange={(e) => setShowBorders(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-0 bg-slate-950"
                  />
                  <span className="font-semibold text-slate-200">Moldura e Linhas Divisórias</span>
                </label>

                {selectedPreset.category === 'din_strip' && (
                  <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCutLines}
                      onChange={(e) => setShowCutLines(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-0 bg-slate-950"
                    />
                    <div>
                      <span className="font-semibold text-slate-200">Guias de Corte e Picotado</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">(Guias verticais para tesoura/x-ato)</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Typography / Size options */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                🔤 Tamanho da Tipografia
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['compact', 'normal', 'large'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSizePreference(sz)}
                    className={`py-1.5 rounded-lg font-medium transition text-center ${
                      fontSizePreference === sz
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {sz === 'compact' ? 'Compacto' : sz === 'normal' ? 'Normal' : 'Grande'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleResetOverrides}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition"
                title="Voltar aos textos e tags automáticos gerados pelo circuito"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Repor Padrões</span>
              </button>

              <span className="text-[11px] font-mono text-slate-500">
                {selectedItems.length} de {items.length} componentes
              </span>
            </div>
          </div>

          {/* Right Panel: Viewport with Tabs (Live Visual Preview vs Item Edit Table) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/40">
            
            {/* Viewport Top Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/90 gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'preview'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pré-Visualização Gráfica</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'items'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Editar Textos & Seleção ({selectedItems.length})</span>
                </button>
              </div>

              {/* Filtering Controls */}
              <div className="flex items-center gap-2">
                {/* Rail Selector */}
                <select
                  value={previewFilterRail}
                  onChange={(e) => setPreviewFilterRail(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="all">Todas as Calhas ({project.rails.length})</option>
                  {project.rails.map((r, idx) => (
                    <option key={r.id || idx} value={idx}>
                      {r.name || `Calha ${idx + 1}`}
                    </option>
                  ))}
                </select>

                {/* Zoom Controls for Preview */}
                {activeTab === 'preview' && (
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.max(0.6, z - 0.2))}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title="Diminuir Zoom"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-purple-300 px-1.5 select-none">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.min(2.0, z + 0.2))}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title="Aumentar Zoom"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* TAB CONTENT 1: VISUAL PREVIEW */}
            {activeTab === 'preview' && (
              <div className="flex-1 overflow-auto p-6 flex flex-col items-center bg-slate-900/60 select-none">
                
                {selectedItems.length === 0 ? (
                  <div className="my-auto text-center p-8 max-w-md">
                    <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-white mb-1">Nenhum componente selecionado</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Ative os componentes na aba "Editar Textos & Seleção" para visualizar a fita de identificação.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Selecionar Todos os Componentes
                    </button>
                  </div>
                ) : (
                  <div 
                    className="w-full max-w-4xl space-y-8 transition-transform origin-top"
                    style={{ transform: `scale(${previewZoom})` }}
                  >
                    {/* Render strips grouped by DIN Rail */}
                    {project.rails.map((rail, rIdx) => {
                      if (previewFilterRail !== 'all' && previewFilterRail !== rIdx) return null;
                      const railItems = selectedItems.filter((i) => i.railIndex === rIdx);
                      if (railItems.length === 0) return null;

                      return (
                        <div key={rail.id || rIdx} className="space-y-2">
                          {/* Rail Heading */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-purple-400" />
                              <span>{rail.name || `Calha ${rIdx + 1}`}</span>
                              <span className="text-slate-500 font-mono text-[11px]">
                                ({railItems.reduce((acc, it) => acc + it.dinModules, 0)} módulos DIN · {railItems.length} aparelhos)
                              </span>
                            </span>
                            <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                              Passo 18.0 mm · Altura {selectedPreset.heightMm} mm
                            </span>
                          </div>

                          {/* Live Strip Mockup Container */}
                          <div className="overflow-x-auto p-4 bg-slate-950/80 rounded-xl border border-slate-800 shadow-inner">
                            <div className="inline-flex items-center border border-dashed border-slate-700/60 p-2 rounded-lg bg-white/5">
                              
                              {/* The Label Strip Paper / Adhesive */}
                              <div className="flex bg-white rounded-sm shadow-md overflow-hidden border border-slate-400 text-slate-900 select-none">
                                {railItems.map((it) => {
                                  // 1 DIN module = 18mm -> calculate visual width (e.g. 18mm * 3.8px/mm)
                                  const scalePx = 3.6; // px per mm
                                  const cellWidthPx = Math.max(54, it.dinModules * 18 * scalePx);
                                  const cellHeightPx = Math.max(48, selectedPreset.heightMm * scalePx);

                                  return (
                                    <div
                                      key={it.id}
                                      style={{ width: `${cellWidthPx}px`, minHeight: `${cellHeightPx}px` }}
                                      className="relative flex flex-col border-r border-slate-400 bg-white p-1 hover:bg-slate-50 transition shrink-0"
                                      title={`${it.tag}: ${it.description} (${it.dinModules} Módulos)`}
                                    >
                                      {/* Top Tag Header */}
                                      <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-0.5 mb-1 bg-slate-100/90 -mx-1 -mt-1 px-1.5 py-0.5">
                                        {showTag && (
                                          <span className="font-extrabold font-mono text-[11px] text-slate-900 tracking-tight truncate">
                                            {it.tag}
                                          </span>
                                        )}
                                        {showRating && it.ratedCurrentA && (
                                          <span className="font-mono text-[9px] font-bold text-slate-600 bg-slate-200/80 px-1 rounded shrink-0">
                                            {it.ratedCurrentA}A
                                          </span>
                                        )}
                                      </div>

                                      {/* Middle: Circuit Mnemonic / Symbol & Description */}
                                      <div className="flex-1 flex flex-col justify-center text-center px-0.5 overflow-hidden">
                                        {showCircuitSymbol && it.circuitCode && (
                                          <div className="font-mono text-[9px] font-black text-slate-800 tracking-wider truncate mb-0.5">
                                            [{it.circuitCode}]
                                          </div>
                                        )}

                                        {showDescription && (
                                          <div className="text-[9.5px] leading-tight font-semibold text-slate-800 line-clamp-2">
                                            {it.description}
                                          </div>
                                        )}
                                      </div>

                                      {/* Bottom Part Number or Module indicator */}
                                      {showPartNumber && it.partNumber && (
                                        <div className="pt-0.5 border-t border-slate-200 text-[8px] font-mono text-slate-500 text-center truncate">
                                          {it.partNumber}
                                        </div>
                                      )}

                                      {/* Module width indicator tick */}
                                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-500 opacity-60">
                                        {it.dinModules}M
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                            </div>
                          </div>

                          {/* Cutting hint */}
                          {showCutLines && selectedPreset.category === 'din_strip' && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pl-2">
                              <Scissors className="w-3 h-3 text-slate-400" />
                              <span>Recorte a tira pelo contorno e insira na calha porta-etiquetas transparente sob a fila de disjuntores.</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Industrial Compliance Note */}
                    <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-lg flex items-start gap-2.5 text-xs text-purple-200">
                      <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Conformidade com a Norma EN 61439-3 & RTIEBT:</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Todos os circuitos devem possuir identificação indelével indicando a função da carga e o respetivo calibre de proteção. As etiquetas modulares de 18mm garantem o alinhamento físico estrito com as manivelas de corte dos aparelhos.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: ITEM EDIT TABLE */}
            {activeTab === 'items' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
                {/* Search and Table Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filtrar por Tag, nome ou circuito..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md text-xs font-semibold text-slate-300 transition"
                    >
                      Selecionar Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md text-xs font-semibold text-slate-300 transition"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                {/* Editable Items Table */}
                <div className="flex-1 overflow-auto border border-slate-800 rounded-lg bg-slate-950/70">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold z-10">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">Sel.</th>
                        <th className="py-2 px-3 w-28">Tag</th>
                        <th className="py-2 px-3">Descrição na Etiqueta</th>
                        <th className="py-2 px-3 w-24">Módulos</th>
                        <th className="py-2 px-3 w-24">Calibre</th>
                        <th className="py-2 px-3 w-32">Calha DIN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {filteredItems.map((it) => (
                        <tr 
                          key={it.id}
                          className={`hover:bg-slate-900/60 transition ${!it.selected ? 'opacity-40 bg-slate-950/40' : ''}`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(it.id)}
                              className="text-purple-400 hover:text-purple-300"
                            >
                              {it.selected ? (
                                <CheckSquare className="w-4 h-4 text-purple-500" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600" />
                              )}
                            </button>
                          </td>

                          {/* Tag Input */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={it.tag}
                              onChange={(e) => handleUpdateItem(it.id, 'tag', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded px-2 py-1 font-mono font-bold text-slate-200 text-xs focus:outline-none"
                            />
                          </td>

                          {/* Description Input */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={it.description}
                              onChange={(e) => handleUpdateItem(it.id, 'description', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                              placeholder="Identificação do circuito ou carga..."
                            />
                          </td>

                          {/* DIN Modules */}
                          <td className="py-2 px-3 font-mono text-slate-400">
                            {it.dinModules} M ({it.widthMm}mm)
                          </td>

                          {/* Rated Current */}
                          <td className="py-2 px-3 font-mono font-semibold text-slate-300">
                            {it.ratedCurrentA ? `${it.ratedCurrentA}A` : '-'}
                          </td>

                          {/* Rail Name */}
                          <td className="py-2 px-3 text-slate-400 text-[11px] truncate">
                            {it.railName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 shrink-0">
                  <span>Pode personalizar diretamente os textos da etiqueta antes de descarregar o PDF.</span>
                  <span>{filteredItems.length} componentes listados</span>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Total a Imprimir: <strong className="text-white">{selectedItems.length}</strong> etiquetas ({totalModules} módulos DIN)
            </span>
            <span className="hidden sm:inline text-slate-700">·</span>
            <span className="hidden sm:inline text-xs text-slate-500 font-mono">
              Formato: {selectedPreset.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={selectedItems.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold transition disabled:opacity-50"
              title="Abrir pré-visualização de impressão no navegador"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={selectedItems.length === 0 || isExporting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 active:scale-98 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'A gerar...' : 'Descarregar PDF de Etiquetas'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
