import React, { useState } from 'react';
import { EnclosureModel, EnclosureMaterial, IkRating } from '../types/electrical';
import { 
  STANDARD_ENCLOSURE_CATALOG, 
  getAllEnclosures, 
  getCustomEnclosures, 
  saveCustomEnclosure, 
  deleteCustomEnclosure,
  getDefaultEnclosurePrice
} from '../data/enclosureCatalog';
import { 
  X, Box, Search, Check, Plus, Trash2, ShieldCheck, Sparkles,
  Layers, Ruler, Euro, Tag, ArrowRight, Bookmark, Filter
} from 'lucide-react';

interface EnclosurePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: {
    widthMm: number;
    heightMm: number;
    depthMm: number;
    ipRating: string;
    ikRating?: string;
    enclosureMaterial?: EnclosureMaterial;
    enclosureModel?: EnclosureModel;
    enclosurePriceEur?: number;
    enclosureBrand?: string;
    enclosurePartNumber?: string;
  };
  onSelectModel: (model: EnclosureModel) => void;
}

export const EnclosurePickerModal: React.FC<EnclosurePickerModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSelectModel,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom' | 'create'>('catalog');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [materialFilter, setMaterialFilter] = useState<string>('all');

  // Form state for creating a new custom enclosure model
  const [customName, setCustomName] = useState<string>('');
  const [customBrand, setCustomBrand] = useState<string>('Schneider Electric');
  const [customPartNumber, setCustomPartNumber] = useState<string>('');
  const [customWidth, setCustomWidth] = useState<number>(currentConfig.widthMm || 600);
  const [customHeight, setCustomHeight] = useState<number>(currentConfig.heightMm || 800);
  const [customDepth, setCustomDepth] = useState<number>(currentConfig.depthMm || 250);
  const [customIp, setCustomIp] = useState<'IP20' | 'IP40' | 'IP54' | 'IP55' | 'IP65' | 'IP66'>('IP66');
  const [customIk, setCustomIk] = useState<IkRating>('IK10');
  const [customMaterial, setCustomMaterial] = useState<EnclosureMaterial>('sheet_steel');
  const [customPrice, setCustomPrice] = useState<number>(
    currentConfig.enclosurePriceEur || getDefaultEnclosurePrice(600, 800, 250, 'sheet_steel')
  );
  const [customDesc, setCustomDesc] = useState<string>('');

  if (!isOpen) return null;

  const customEnclosures = getCustomEnclosures();
  const allCatalog = STANDARD_ENCLOSURE_CATALOG;

  // Filter items
  const sourceList = activeTab === 'custom' ? customEnclosures : allCatalog;

  const filteredModels = sourceList.filter((m) => {
    const matchesBrand = selectedBrand === 'all' || m.brand.toLowerCase().includes(selectedBrand.toLowerCase());
    const matchesMaterial = materialFilter === 'all' || m.material === materialFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${m.widthMm}x${m.heightMm}`.includes(searchQuery.toLowerCase());

    return matchesBrand && matchesMaterial && matchesSearch;
  });

  const handleApplyModel = (model: EnclosureModel) => {
    onSelectModel(model);
    onClose();
  };

  const handleCreateAndApply = (e: React.FormEvent) => {
    e.preventDefault();
    const newModel: EnclosureModel = {
      id: `custom-enc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: customName.trim() || `Quadro ${customWidth}×${customHeight}×${customDepth}mm`,
      brand: customBrand.trim() || 'Personalizado',
      partNumber: customPartNumber.trim() || `ENC-${customWidth}x${customHeight}`,
      widthMm: customWidth,
      heightMm: customHeight,
      depthMm: customDepth,
      ipRating: customIp,
      ikRating: customIk,
      material: customMaterial,
      doorType: 'solid',
      mountingPlateIncluded: true,
      estimatedPriceEur: Math.max(0, Number(customPrice) || 0),
      description: customDesc.trim() || `Armário ${customWidth}×${customHeight}×${customDepth}mm, ${customIp}, ${customMaterial}`,
      isCustom: true,
    };

    saveCustomEnclosure(newModel);
    onSelectModel(newModel);
    onClose();
  };

  const handleDeleteCustom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Tem a certeza que deseja eliminar este modelo guardado da sua biblioteca?')) {
      deleteCustomEnclosure(id);
      // force re-render
      setActiveTab('custom');
    }
  };

  const isCurrentModel = (m: EnclosureModel) => {
    if (currentConfig.enclosureModel && currentConfig.enclosureModel.id === m.id) return true;
    if (currentConfig.enclosurePartNumber && currentConfig.enclosurePartNumber === m.partNumber) return true;
    return (
      currentConfig.widthMm === m.widthMm &&
      currentConfig.heightMm === m.heightMm &&
      currentConfig.depthMm === m.depthMm &&
      currentConfig.enclosureBrand === m.brand
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-sky-400 border border-blue-500/30 rounded-xl">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Modelos de Quadro & Invólucro Industrial
                </h2>
                <span className="text-[11px] font-mono font-bold bg-slate-800 text-sky-300 px-2 py-0.5 rounded border border-slate-700">
                  Conta na BOM / Custos
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Selecione um modelo de armário padrão ou reutilize modelos personalizados guardados. O quadro é integrado na lista de materiais com preço e especificações.
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

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 shrink-0 gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'catalog'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Catálogo Fabricantes ({STANDARD_ENCLOSURE_CATALOG.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'custom'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-purple-300" />
              <span>Meus Modelos Guardados ({customEnclosures.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-300" />
              <span>Criar Novo Modelo</span>
            </button>
          </div>

          {/* Active Enclosure Snapshot in header */}
          <div className="hidden md:flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Quadro Atual:</span>
            <span className="font-bold text-sky-400">
              {currentConfig.widthMm}×{currentConfig.heightMm}×{currentConfig.depthMm}mm
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-400 font-bold">
              {(currentConfig.enclosurePriceEur || currentConfig.enclosureModel?.estimatedPriceEur || getDefaultEnclosurePrice(currentConfig.widthMm, currentConfig.heightMm, currentConfig.depthMm)).toFixed(2)} €
            </span>
          </div>
        </div>

        {/* Search & Filter Bar (only for catalog & custom tabs) */}
        {activeTab !== 'create' && (
          <div className="flex flex-wrap items-center justify-between px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por modelo, referência, marca ou medidas (ex: 600x800)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Brand Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              <span className="text-slate-400 font-medium mr-1 text-[11px]">Marca:</span>
              {[
                { id: 'all', label: 'Todas' },
                { id: 'Schneider', label: 'Schneider' },
                { id: 'Rittal', label: 'Rittal' },
                { id: 'Hager', label: 'Hager' },
                { id: 'Legrand', label: 'Legrand' },
                { id: 'Gewiss', label: 'Gewiss' },
                { id: 'Eldon', label: 'Eldon/nVent' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBrand(b.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    selectedBrand === b.id
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Material Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 font-medium text-[11px]">Material:</span>
              <select
                value={materialFilter}
                onChange={(e) => setMaterialFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-sky-500"
              >
                <option value="all">Todos</option>
                <option value="sheet_steel">Chapa de Aço</option>
                <option value="stainless_steel">Inox 304L</option>
                <option value="polyester">Poliéster</option>
                <option value="thermoplastic">Termoplástico</option>
              </select>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'create' ? (
            /* CREATE CUSTOM ENCLOSURE MODEL FORM */
            <form onSubmit={handleCreateAndApply} className="max-w-2xl mx-auto space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Criar Novo Modelo de Quadro</h3>
                    <p className="text-xs text-slate-400">
                      Defina as especificações e o custo do armário para poder reaproveitá-lo em qualquer projeto.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Designação / Nome do Modelo:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Schneider Spacial S3D 600x800x250 c/ Placa"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Brand */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Fabricante / Marca:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Schneider Electric, Rittal, Hager..."
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Part Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Referência Comercial (Part Number):</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: NSYS3D8625P, AX 1058.000..."
                      value={customPartNumber}
                      onChange={(e) => setCustomPartNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Dimensions: Width, Height, Depth */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Largura (W) mm:</label>
                    <input
                      type="number"
                      required
                      min={300}
                      max={1800}
                      step={50}
                      value={customWidth}
                      onChange={(e) => {
                        const w = Number(e.target.value);
                        setCustomWidth(w);
                        setCustomPrice(getDefaultEnclosurePrice(w, customHeight, customDepth, customMaterial));
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Altura (H) mm:</label>
                    <input
                      type="number"
                      required
                      min={300}
                      max={2200}
                      step={50}
                      value={customHeight}
                      onChange={(e) => {
                        const h = Number(e.target.value);
                        setCustomHeight(h);
                        setCustomPrice(getDefaultEnclosurePrice(customWidth, h, customDepth, customMaterial));
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Profundidade (D) mm:</label>
                    <input
                      type="number"
                      required
                      min={120}
                      max={600}
                      step={10}
                      value={customDepth}
                      onChange={(e) => {
                        const d = Number(e.target.value);
                        setCustomDepth(d);
                        setCustomPrice(getDefaultEnclosurePrice(customWidth, customHeight, d, customMaterial));
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Estimated Price in € */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Preço de Aquisição / Custo (€):</span>
                      <span className="text-[10px] text-emerald-400 font-normal">Entra na BOM</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={0}
                        step={0.5}
                        value={customPrice}
                        onChange={(e) => setCustomPrice(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">€</span>
                    </div>
                  </div>

                  {/* IP Rating */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Grau de Estanquidade (IP):</label>
                    <select
                      value={customIp}
                      onChange={(e) => setCustomIp(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="IP66">IP66 (Estanque contra jatos potentes)</option>
                      <option value="IP65">IP65 (Estanque contra poeiras e jatos)</option>
                      <option value="IP55">IP55 (Industrial protegido)</option>
                      <option value="IP54">IP54 (Ambiente abrigado)</option>
                      <option value="IP40">IP40 (Residencial saliente)</option>
                      <option value="IP20">IP20 (Interior seco sem porta)</option>
                    </select>
                  </div>

                  {/* IK Rating */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Resistência ao Choque (IK):</label>
                    <select
                      value={customIk}
                      onChange={(e) => setCustomIk(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="IK10">IK10 (Máxima proteção anti-vandalismo 20 Joules)</option>
                      <option value="IK09">IK09 (10 Joules)</option>
                      <option value="IK08">IK08 (5 Joules standard industrial)</option>
                      <option value="IK07">IK07 (2 Joules comercial/residencial)</option>
                      <option value="IK05">IK05 (0.7 Joules)</option>
                    </select>
                  </div>

                  {/* Material */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Material de Construção:</label>
                    <select
                      value={customMaterial}
                      onChange={(e) => {
                        const mat = e.target.value as EnclosureMaterial;
                        setCustomMaterial(mat);
                        setCustomPrice(getDefaultEnclosurePrice(customWidth, customHeight, customDepth, mat));
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="sheet_steel">Chapa de Aço Fosfatizada e Pintada RAL 7035</option>
                      <option value="stainless_steel">Aço Inoxidável AISI 304L / 316L (Alimentar / Química)</option>
                      <option value="polyester">Poliéster reforçado com fibra de vidro (Exterior severo)</option>
                      <option value="thermoplastic">Termoplástico / Policarbonato livre de halogéneos</option>
                      <option value="aluminium">Alumínio Naval</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Descrição Técnica / Notas:</label>
                    <textarea
                      rows={2}
                      placeholder="Armário monobloco com placa de montagem lisa zincada e fecho palhetão duplo..."
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Guardar & Aplicar ao Quadro</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* MODELS GRID (CATALOG OR CUSTOM) */
            <div className="space-y-4">
              {filteredModels.length === 0 ? (
                <div className="p-12 text-center bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                    <Box className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">
                    {activeTab === 'custom'
                      ? 'Ainda não tem modelos personalizados guardados na sua biblioteca.'
                      : 'Nenhum modelo de armário encontrado com os filtros aplicados.'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {activeTab === 'custom'
                      ? 'Pode criar novos modelos personalizados com as suas referências de compra e preços habituais clicando em «Criar Novo Modelo».'
                      : 'Tente alterar os termos de pesquisa ou limpar os filtros de fabricante e material.'}
                  </p>
                  {activeTab === 'custom' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('create')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Criar Primeiro Modelo Personalizado</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredModels.map((model) => {
                    const active = isCurrentModel(model);

                    return (
                      <div
                        key={model.id}
                        onClick={() => handleApplyModel(model)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
                          active
                            ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                            : 'bg-slate-950/70 hover:bg-slate-850/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Top Badges */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700 font-mono">
                              {model.brand}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {active && (
                                <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                  <Check className="w-3 h-3" /> Atual
                                </span>
                              )}
                              {model.isCustom && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCustom(e, model.id)}
                                  className="p-1 text-slate-500 hover:text-red-400 rounded transition opacity-0 group-hover:opacity-100"
                                  title="Eliminar modelo personalizado"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Model Name */}
                          <h4 className="text-xs font-bold text-slate-100 group-hover:text-sky-300 transition line-clamp-1">
                            {model.name}
                          </h4>

                          {/* Part Number */}
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            Ref: <strong className="text-slate-300">{model.partNumber}</strong>
                          </div>

                          {/* Dimensions & Specs Pills */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                            <span className="text-[10px] font-mono font-bold bg-slate-900 text-sky-400 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                              <Ruler className="w-3 h-3" /> {model.widthMm}×{model.heightMm}×{model.depthMm}mm
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-slate-900 text-amber-400 px-1.5 py-0.5 rounded border border-slate-800">
                              {model.ipRating}
                            </span>
                            {model.ikRating && (
                              <span className="text-[10px] font-mono font-bold bg-slate-900 text-emerald-400 px-1.5 py-0.5 rounded border border-slate-800">
                                {model.ikRating}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                            {model.description}
                          </p>
                        </div>

                        {/* Footer: Price & Select Action */}
                        <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Preço de Custo (BOM):</span>
                            <span className="text-sm font-bold font-mono text-emerald-400">
                              {model.estimatedPriceEur.toFixed(2)} €
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplyModel(model)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                              active
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 group-hover:bg-blue-600 text-slate-200 group-hover:text-white'
                            }`}
                          >
                            <span>{active ? 'Selecionado' : 'Aplicar'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-400">
            Dica: Ao selecionar um modelo, a largura, altura, profundidade, fabricante e o valor em euros são automaticamente sincronizados com a Lista de Materiais (BOM).
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
