import React, { useState, useMemo } from 'react';
import { CatalogItem, ComponentCategory } from '../types/electrical';
import { useComponentCatalog, saveCustomComponent } from '../utils/customComponentStorage';
import { ComponentLibraryManagerModal } from './ComponentLibraryManagerModal';
import { CustomComponentModal } from './CustomComponentModal';
import { 
  Search, X, Plus, Check, Zap, Cpu, Shield, Layers, 
  Wrench, Sparkles, Filter, Box, SlidersHorizontal, ArrowRight,
  FileSpreadsheet, Edit3, Copy, Globe, Tag, Folder, RotateCcw
} from 'lucide-react';

interface ComponentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRailIndex: number;
  railCount: number;
  onAddComponent: (item: CatalogItem, railIndex: number, quantity?: number) => void;
  onOpenLibraryManager?: () => void;
}

interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  badge: string;
  filter: (item: CatalogItem) => boolean;
}

const CATEGORY_TABS: CategoryOption[] = [
  {
    id: 'all',
    name: 'Todos os Componentes',
    icon: '⚡',
    badge: 'Catálogo completo',
    filter: () => true,
  },
  {
    id: 'residential',
    name: '🏠 Residencial & Habitação (RTIEBT)',
    icon: '🏠',
    badge: 'Disjuntores 1P+N, Diferenciais 30mA, Campainhas, DPS, Telerruptores',
    filter: (item) =>
      item.category === 'residential_modular' ||
      Boolean(item.series?.toLowerCase().includes('residencial')) ||
      item.name.toLowerCase().includes('residencial') ||
      item.name.toLowerCase().includes('habita') ||
      item.name.toLowerCase().includes('iluminação') ||
      item.name.toLowerCase().includes('tomadas') ||
      item.name.toLowerCase().includes('campainha') ||
      item.name.toLowerCase().includes('telerruptor') ||
      item.name.toLowerCase().includes('minuteria') ||
      item.name.toLowerCase().includes('placa') ||
      item.name.toLowerCase().includes('forno') ||
      item.name.toLowerCase().includes('wallbox') ||
      item.catalogId.startsWith('hgr-') ||
      item.partNumber.includes('MJT') ||
      item.partNumber.includes('CDA'),
  },
  {
    id: 'custom',
    name: '⭐ Os Meus / Personalizados',
    icon: '✨',
    badge: 'Criados & Excel (.xlsx)',
    filter: (item) => Boolean(item.catalogId?.startsWith('custom-') || item.catalogId?.startsWith('imp-') || item.catalogId?.startsWith('imported-') || item.brand === 'Personalizado'),
  },
  {
    id: 'generic',
    name: 'Material Genérico (Multimarca)',
    icon: '📦',
    badge: 'Disjuntores, Bornes, Fontes, Relés',
    filter: (item) => item.brand === 'Genérico' || item.name.toLowerCase().includes('genérico'),
  },
  {
    id: 'protections',
    name: 'Disjuntores & Proteções AC/DC',
    icon: '🛡️',
    badge: '1P+N, 2P, 3P, 4P, Diferenciais, SPD',
    filter: (item) => item.category === 'protection_ac' || item.category === 'protection_dc',
  },
  {
    id: 'power_supplies',
    name: 'Fontes de Alimentação DIN (24V)',
    icon: '⚡',
    badge: 'Mean Well & Genéricas 24VDC',
    filter: (item) => item.category === 'power_supply',
  },
  {
    id: 'terminals',
    name: 'Bornes de Ligação & Viking 3',
    icon: '🔌',
    badge: 'Legrand Viking, Neutro, PE, Passagem',
    filter: (item) => item.category === 'terminals',
  },
  {
    id: 'relays',
    name: 'Relés de Comando & Temporizadores',
    icon: '🔄',
    badge: 'Interface 6.2mm, Industriais, Timers',
    filter: (item) => item.category === 'relays' || item.category === 'safety_relays',
  },
  {
    id: 'motor_control',
    name: 'Comando de Motores & Contactores',
    icon: '⚙️',
    badge: 'Contactores TeSys, Sirius, AF, Modulares, Inversores, Térmicos',
    filter: (item) =>
      item.category === 'motor_control' ||
      item.name.toLowerCase().includes('contactor') ||
      item.name.toLowerCase().includes('contator') ||
      item.description.toLowerCase().includes('contactor') ||
      item.description.toLowerCase().includes('contator'),
  },
  {
    id: 'plcs',
    name: 'Autómatos & PLCs (Siemens)',
    icon: '🤖',
    badge: 'S7-1200, LOGO! 8, Módulos I/O',
    filter: (item) => item.category === 'plc_cpu' || item.category === 'plc_expansion',
  },
  {
    id: 'accessories',
    name: 'Acessórios de Quadro',
    icon: '🧱',
    badge: 'Tomadas DIN, Switch Ethernet',
    filter: (item) => item.category === 'accessories',
  },
];

const BRAND_FILTERS = [
  { id: 'all', label: 'Todas as Marcas' },
  { id: 'Schneider Electric', label: '🟢 Schneider (TeSys / Acti9)', highlight: true },
  { id: 'Siemens', label: '🤖 Siemens (Sirius / S7)', highlight: true },
  { id: 'ABB', label: '🔴 ABB (AF / Compact)' },
  { id: 'Eaton', label: '⚙️ Eaton (DILM)' },
  { id: 'Finder', label: '🔄 Finder (Relés & 22)' },
  { id: 'Hager', label: '🏠 Hager (ESC / Modular)' },
  { id: 'Legrand', label: '🔌 Legrand (Viking 3 / CX3)' },
  { id: 'Mean Well', label: '⚡ Mean Well' },
  { id: 'Genérico', label: '📦 Genérico / Outros' },
];

const normalizeText = (text: string): string => {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const matchesSearch = (
  item: CatalogItem,
  query: string,
  target: 'all' | 'name' | 'brand' = 'all'
): boolean => {
  if (!query || !query.trim()) return true;
  const q = normalizeText(query.trim());
  const terms = q.split(/\s+/).filter(Boolean);

  let targetText = '';
  if (target === 'brand') {
    targetText = normalizeText(`${item.brand} ${item.series || ''}`);
  } else if (target === 'name') {
    targetText = normalizeText(
      `${item.name} ${item.partNumber} ${item.description || ''} ${item.series || ''}`
    );
  } else {
    // 'all': Nome ou Fabricante (e código/descrição/categoria)
    targetText = normalizeText(
      `${item.name} ${item.brand} ${item.partNumber} ${item.description || ''} ${item.series || ''} ${item.inputVoltage || ''} ${item.outputVoltage || ''} ${item.ratedCurrentA ? item.ratedCurrentA + 'a' : ''} ${item.category || ''}`
    );
  }

  return terms.every((term) => targetText.includes(term));
};

const HighlightedText: React.FC<{ text: string; query: string; className?: string }> = ({ text, query, className = '' }) => {
  if (!query || !query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }
  const q = normalizeText(query.trim());
  const terms = q.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return <span className={className}>{text}</span>;

  // Safe regex escaping for all terms
  const escapedTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  try {
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span className={className}>
        {parts.map((part, i) => {
          const isMatch = terms.some((t) => normalizeText(t) === normalizeText(part));
          return isMatch ? (
            <mark key={i} className="bg-amber-400/30 text-amber-200 px-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            part
          );
        })}
      </span>
    );
  } catch {
    return <span className={className}>{text}</span>;
  }
};

const QUICK_SEARCH_CHIPS = [
  { label: '⚡ Fontes 24V', query: '24V' },
  { label: '🛡️ Disjuntor C16', query: 'C16' },
  { label: '🤖 Siemens S7', query: 'Siemens' },
  { label: '⚡ Mean Well', query: 'Mean Well' },
  { label: '🔌 Viking 3', query: 'Viking' },
  { label: '🔄 Relés', query: 'Relé' },
  { label: '⚙️ Contactores', query: 'Contactor' },
  { label: '⭐ Personalizados', query: 'Personalizado' },
];

export const ComponentPickerModal: React.FC<ComponentPickerModalProps> = ({
  isOpen,
  onClose,
  targetRailIndex,
  railCount,
  onAddComponent,
  onOpenLibraryManager,
}) => {
  const { allComponents, customComponents, refreshCatalog } = useComponentCatalog();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [editingModalItem, setEditingModalItem] = useState<CatalogItem | null>(null);

  const customIdSet = useMemo(() => new Set(customComponents.map((c) => c.catalogId)), [customComponents]);

  // 1. All hooks unconditionally called at top level
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedRail, setSelectedRail] = useState<number>(targetRailIndex);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTarget, setSearchTarget] = useState<'all' | 'name' | 'brand'>('all');
  const [searchScope, setSearchScope] = useState<'all' | 'category'>('all');
  const [recentNotification, setRecentNotification] = useState<string | null>(null);

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Dynamic list of all manufacturers present in the catalog with model counts
  const availableBrands = useMemo(() => {
    const brandsMap = new Map<string, number>();
    allComponents.forEach((item) => {
      const b = item.brand || 'Genérico';
      brandsMap.set(b, (brandsMap.get(b) || 0) + 1);
    });
    return Array.from(brandsMap.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
  }, [allComponents]);

  // Custom component creation form
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('Genérico');
  const [customCategory, setCustomCategory] = useState<ComponentCategory>('protection_ac');
  const [customWidthMm, setCustomWidthMm] = useState<number>(18);
  const [customCurrent, setCustomCurrent] = useState('16');
  const [customVoltage, setCustomVoltage] = useState('230V AC');
  const [customPower, setCustomPower] = useState('');
  const [customPrice, setCustomPrice] = useState('12.00');
  const [customDescription, setCustomDescription] = useState('');

  // Synchronize target rail and auto-focus search input when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRail(targetRailIndex);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, targetRailIndex]);

  // Real-time matches across the entire catalog (independent of category)
  const globalMatches = useMemo(() => {
    if (!searchTerm.trim()) return allComponents;
    return allComponents.filter((item) => matchesSearch(item, searchTerm, searchTarget));
  }, [allComponents, searchTerm, searchTarget]);

  // Real-time matches within the currently active category
  const categoryMatches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return allComponents.filter((item) => {
      if (!matchesSearch(item, searchTerm, searchTarget)) return false;
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'custom') return customIdSet.has(item.catalogId);
      const catDef = CATEGORY_TABS.find((c) => c.id === selectedCategory);
      return catDef ? catDef.filter(item) : true;
    });
  }, [allComponents, searchTerm, searchTarget, selectedCategory, customIdSet]);

  // Filter items based on active criteria and search scope
  const filteredItems = useMemo(() => {
    const hasSearch = searchTerm.trim().length > 0;

    return allComponents.filter((item) => {
      // 1. Search filter by Nome ou Fabricante conforme searchTarget
      if (hasSearch) {
        if (!matchesSearch(item, searchTerm, searchTarget)) return false;

        // If user specifically chose to limit search to current category
        if (searchScope === 'category') {
          if (selectedCategory !== 'all') {
            if (selectedCategory === 'custom') {
              if (!customIdSet.has(item.catalogId)) return false;
            } else {
              const categoryDef = CATEGORY_TABS.find((c) => c.id === selectedCategory);
              if (categoryDef && !categoryDef.filter(item)) return false;
            }
          }
        }
      } else {
        // No search: standard category filtering
        if (selectedCategory !== 'all') {
          if (selectedCategory === 'custom') {
            if (!customIdSet.has(item.catalogId)) return false;
          } else {
            const categoryDef = CATEGORY_TABS.find((c) => c.id === selectedCategory);
            if (categoryDef && !categoryDef.filter(item)) return false;
          }
        }
      }

      // 2. Brand / Fabricante filter
      if (selectedBrand !== 'all') {
        if (selectedBrand === 'Genérico' && item.brand !== 'Genérico') return false;
        if (selectedBrand !== 'Genérico' && item.brand !== selectedBrand) return false;
      }

      return true;
    });
  }, [allComponents, customIdSet, searchTerm, searchTarget, searchScope, selectedBrand, selectedCategory]);

  // Group items by series / family for clean visual scanning
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: CatalogItem[] } = {};
    filteredItems.forEach((item) => {
      const groupKey = item.series || `${item.brand} - Geral`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleAddSingle = (item: CatalogItem, qty: number = 1) => {
    onAddComponent(item, selectedRail, qty);
    const label = qty > 1 ? `${qty}x ${item.name}` : item.name;
    setRecentNotification(`Adicionado ${label} à Calha ${selectedRail + 1}`);
    setTimeout(() => setRecentNotification(null), 2000);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    let tagPrefix = 'Q';
    if (customCategory === 'power_supply') tagPrefix = 'G';
    else if (customCategory === 'plc_cpu' || customCategory === 'plc_expansion') tagPrefix = 'A';
    else if (customCategory === 'relays' || customCategory === 'motor_control') tagPrefix = 'K';
    else if (customCategory === 'safety_relays') tagPrefix = 'KS';
    else if (customCategory === 'terminals') tagPrefix = 'X';
    else if (customCategory === 'accessories') tagPrefix = 'XS';

    const newItem: CatalogItem = {
      catalogId: `custom-${Date.now()}`,
      name: customName.trim(),
      brand: customBrand.trim() || 'Genérico',
      series: `${customBrand.trim() || 'Genérico'} Customizado`,
      partNumber: customName.trim().toUpperCase().substring(0, 16),
      category: customCategory,
      tagPrefix,
      description: customDescription.trim() || `${customName} - ${customBrand}`,
      widthMm: Number(customWidthMm) || 18,
      heightMm: 90,
      dinModules: Math.round(((Number(customWidthMm) || 18) / 18) * 10) / 10,
      inputVoltage: customVoltage || undefined,
      ratedCurrentA: customCurrent ? Number(customCurrent) : undefined,
      ratedPowerW: customPower ? Number(customPower) : undefined,
      estimatedPriceEur: customPrice ? Number(customPrice) : 10.0,
      color: '#64748b',
    };

    saveCustomComponent(newItem);
    refreshCatalog();

    onAddComponent(newItem, selectedRail, 1);
    setRecentNotification(`Adicionado e gravado ${newItem.name} na Calha ${selectedRail + 1}`);
    setTimeout(() => setRecentNotification(null), 2000);
    setActiveTab('catalog');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 md:p-6 select-none">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col h-[90vh] text-slate-100 overflow-hidden">
        
        {/* ====================================================================
            1. TOP BAR: Title, Rail Destination & Tab Mode Switch
            ==================================================================== */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-sm font-mono text-blue-400">
              ⚡
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Adicionar Componentes ao Quadro</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Genérico, Mean Well, Siemens, Viking, etc.
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Escolha componentes normalizados com dimensões e esquemas elétricos automáticos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Excel / Library Manager Button */}
            <button
              type="button"
              onClick={() => {
                if (onOpenLibraryManager) {
                  onClose();
                  onOpenLibraryManager();
                } else {
                  setIsLibraryOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold shadow-xs transition"
              title="Gerir biblioteca, criar novos e importar/exportar para Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel / Biblioteca</span>
            </button>

            {/* Rich Custom Component Modal trigger */}
            <button
              type="button"
              onClick={() => {
                setEditingModalItem(null);
                setIsCustomModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition"
              title="Criar componente com pré-visualização completa DIN"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo Componente</span>
            </button>

            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'catalog'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Catálogo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'custom'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Formulário Rápido</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ====================================================================
            2. REAL-TIME SEARCH BAR & QUICK FILTERS (Barra de Pesquisa por Nome e Fabricante)
            ==================================================================== */}
        {activeTab === 'catalog' && (
          <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 space-y-2.5 shrink-0">
            {/* Main Search Input Row with Field Target Toggle and Manufacturer Select */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
              {/* Primary Search Input */}
              <div className="relative flex-1 group">
                <Search className="w-4 h-4 text-blue-400 absolute left-3.5 top-3 pointer-events-none group-focus-within:text-blue-300 transition" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    searchTarget === 'name'
                      ? 'Filtrar por nome do componente (ex: Contactor TeSys, Disjuntor C16, Fonte 24V, Borne Viking)...'
                      : searchTarget === 'brand'
                      ? 'Filtrar por fabricante / marca (ex: Siemens, Schneider, ABB, Eaton, Finder, Legrand, Mean Well)...'
                      : 'Filtrar componentes por nome ou fabricante (ex: Siemens, Contactor, Schneider, C16, Borne, Mean Well)...'
                  }
                  className="w-full bg-slate-900 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 rounded-xl pl-10 pr-24 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition shadow-inner font-sans"
                  autoComplete="off"
                  spellCheck={false}
                />

                {/* Right controls inside input */}
                <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition cursor-pointer"
                      title="Limpar pesquisa (Esc)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {searchTerm.trim() && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800 font-bold hidden sm:inline-block">
                      {filteredItems.length} {filteredItems.length === 1 ? 'resultado' : 'resultados'}
                    </span>
                  )}
                </div>
              </div>

              {/* Search Target Mode Selector: [ Tudo (Nome ou Fabricante) | Por Nome | Por Fabricante ] */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5 hidden xl:inline">
                  Filtrar por:
                </span>
                <button
                  type="button"
                  onClick={() => setSearchTarget('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer ${
                    searchTarget === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Pesquisar tanto no Nome como no Fabricante"
                >
                  <Search className="w-3 h-3" />
                  <span>Nome ou Fabricante</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchTarget('name')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer ${
                    searchTarget === 'name'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Pesquisar apenas pelo Nome do componente ou modelo"
                >
                  <Tag className="w-3 h-3 text-sky-400" />
                  <span>Nome</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchTarget('brand')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer ${
                    searchTarget === 'brand'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Pesquisar apenas pelo Fabricante ou Marca"
                >
                  <Box className="w-3 h-3 text-amber-400" />
                  <span>Fabricante</span>
                </button>
              </div>

              {/* Dedicated Fabricante (Manufacturer) Dropdown Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 shrink-0 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">
                  Fabricante:
                </span>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
                  title="Filtrar componentes por fabricante específico"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">
                    Todos os Fabricantes ({allComponents.length})
                  </option>
                  {availableBrands.map((b) => (
                    <option key={b.brand} value={b.brand} className="bg-slate-900 text-slate-200">
                      {b.brand} ({b.count})
                    </option>
                  ))}
                </select>
                {selectedBrand !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedBrand('all')}
                    className="p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
                    title="Remover filtro de fabricante"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Search Scope Switcher (All Catalog vs Current Category) */}
              {searchTerm.trim().length > 0 && selectedCategory !== 'all' && (
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={() => setSearchScope('all')}
                    className={`px-2 py-1 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer ${
                      searchScope === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Pesquisar em todo o catálogo"
                  >
                    <Globe className="w-3 h-3" />
                    <span>Catálogo Todo ({globalMatches.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchScope('category')}
                    className={`px-2 py-1 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer ${
                      searchScope === 'category'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Pesquisar apenas nesta categoria"
                  >
                    <Folder className="w-3 h-3" />
                    <span>Nesta Categoria ({categoryMatches.length})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Filter Chips: Top Manufacturers & Popular Components */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Filtros Rápidos:
              </span>

              {/* Manufacturer Quick Buttons */}
              {availableBrands.slice(0, 7).map((b) => {
                const isSelected = selectedBrand === b.brand;
                return (
                  <button
                    key={b.brand}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedBrand('all');
                      } else {
                        setSelectedBrand(b.brand);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition whitespace-nowrap border shrink-0 flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{b.brand}</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/40 text-slate-400">
                      {b.count}
                    </span>
                  </button>
                );
              })}

              <span className="text-slate-700 mx-1">|</span>

              {/* Component Name Quick Chips */}
              {QUICK_SEARCH_CHIPS.map((chip) => {
                const isActive = searchTerm.toLowerCase().includes(chip.query.toLowerCase());
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      if (isActive && searchTerm.trim().toLowerCase() === chip.query.toLowerCase()) {
                        setSearchTerm('');
                      } else {
                        setSearchTerm(chip.query);
                        setSearchTarget('all');
                        setSearchScope('all');
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition whitespace-nowrap border shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}

              {(searchTerm || selectedBrand !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedBrand('all');
                    setSearchTarget('all');
                  }}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium text-amber-300 hover:text-white bg-amber-950/50 border border-amber-600/40 hover:bg-amber-900 transition whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
            3. SECONDARY CONTROLS BAR: Rail Destination & Active Filters Status
            ==================================================================== */}
        <div className="px-5 py-2 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Target Rail Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Inserir na Calha:
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              {Array.from({ length: railCount }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedRail(idx)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
                    selectedRail === idx
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  Calha {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Indicators */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              <strong className="text-slate-100">{filteredItems.length}</strong> {filteredItems.length === 1 ? 'componente disponível' : 'componentes disponíveis'}
            </span>

            {selectedBrand !== 'all' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-sky-950 text-sky-300 border border-sky-800/80 flex items-center gap-1">
                <span>Fabricante: {selectedBrand}</span>
                <button
                  type="button"
                  onClick={() => setSelectedBrand('all')}
                  className="hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchTerm && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800/80 flex items-center gap-1">
                <span>{searchTarget === 'name' ? 'Nome' : searchTarget === 'brand' ? 'Fabricante' : 'Pesquisa'}: "{searchTerm}"</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {recentNotification && (
            <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-800 px-2.5 py-1 rounded-lg">
              <Check className="w-3.5 h-3.5" />
              <span>{recentNotification}</span>
            </div>
          )}
        </div>

        {/* ====================================================================
            4. MAIN BODY
            ==================================================================== */}
        {activeTab === 'catalog' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Category Sidebar */}
            <div className="w-60 bg-slate-950 border-r border-slate-800 flex flex-col p-2 overflow-y-auto shrink-0 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 tracking-wider">
                Famílias de Aparelhagem
              </span>
              {CATEGORY_TABS.map((cat) => {
                const count = cat.id === 'custom'
                  ? customComponents.length
                  : allComponents.filter(cat.filter).length;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex items-center justify-between group ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">{cat.icon}</span>
                      <div className="min-w-0">
                        <span className="block truncate leading-tight">{cat.name}</span>
                        <span
                          className={`text-[10px] block truncate leading-tight ${
                            isSelected ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          {cat.badge}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono rounded px-1.5 py-0.5 ml-1 shrink-0 ${
                        isSelected ? 'bg-blue-700 text-white' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Components List */}
            <div className="flex-1 bg-slate-900/60 overflow-y-auto p-4 md:p-5 space-y-5">
              {Object.keys(groupedItems).length > 0 ? (
                Object.entries(groupedItems).map(([groupTitle, items]) => (
                  <div key={groupTitle} className="space-y-2">
                    {/* Group Header */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-blue-400 uppercase tracking-wide">
                          {groupTitle}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({items.length} {items.length === 1 ? 'modelo' : 'modelos'})
                        </span>
                      </div>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 gap-2.5">
                      {items.map((item) => {
                        const isTerminal = item.category === 'terminals';

                        return (
                          <div
                            key={item.catalogId}
                            className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition group hover:bg-slate-950/90"
                          >
                            {/* Item Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold font-mono text-slate-100 group-hover:text-blue-400 transition-colors">
                                  <HighlightedText text={item.partNumber} query={searchTerm} />
                                </span>
                                <span className="text-xs text-slate-300 font-semibold truncate">
                                  — <HighlightedText text={item.name} query={searchTerm} />
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBrand(item.brand);
                                  }}
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition hover:brightness-125 cursor-pointer ${
                                    item.brand === 'Genérico'
                                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/80 font-bold'
                                      : item.brand === 'Mean Well'
                                      ? 'bg-sky-950/60 text-sky-300 border-sky-800/80'
                                      : item.brand === 'Siemens'
                                      ? 'bg-teal-950/60 text-teal-300 border-teal-800/80'
                                      : item.brand === 'Legrand'
                                      ? 'bg-orange-950/60 text-orange-300 border-orange-800/80'
                                      : item.brand === 'Schneider Electric'
                                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                                      : item.brand === 'ABB'
                                      ? 'bg-rose-950/60 text-rose-300 border-rose-800/80'
                                      : 'bg-slate-900 text-slate-400 border-slate-800'
                                  }`}
                                  title={`Filtrar apenas por este fabricante: ${item.brand}`}
                                >
                                  <HighlightedText text={item.brand} query={searchTerm} />
                                </button>

                                {customIdSet.has(item.catalogId) && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                                    Personalizado
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                <HighlightedText text={item.description} query={searchTerm} />
                              </p>

                              {/* Technical Details Badges */}
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-mono text-slate-400">
                                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                                  📏 {item.widthMm}mm ({item.dinModules} TE)
                                </span>

                                {item.inputVoltage && (
                                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-sky-400">
                                    {item.inputVoltage}
                                  </span>
                                )}

                                {item.outputVoltage && (
                                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-emerald-400">
                                    Saída: {item.outputVoltage}
                                  </span>
                                )}

                                {item.ratedCurrentA && (
                                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                                    {item.ratedCurrentA}A {item.ratedPowerW ? `· ${item.ratedPowerW}W` : ''}
                                  </span>
                                )}

                                {item.dcConsumptionA && (
                                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-amber-400">
                                    Consumo 24V: {item.dcConsumptionA}A
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions & Price */}
                            <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                              <span className="text-xs font-mono font-bold text-emerald-400 min-w-[65px] text-right">
                                {item.estimatedPriceEur.toFixed(2)} €
                              </span>

                              {/* Duplicate button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const cloned: Partial<CatalogItem> = {
                                    ...item,
                                    catalogId: undefined,
                                    name: `${item.name} (Cópia)`,
                                    partNumber: `${item.partNumber}-MOD`,
                                  };
                                  setEditingModalItem(cloned as CatalogItem);
                                  setIsCustomModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                                title="Duplicar / Criar variante deste componente"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit button (if custom) */}
                              {customIdSet.has(item.catalogId) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingModalItem(item);
                                    setIsCustomModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-800 transition"
                                  title="Editar componente personalizado"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isTerminal ? (
                                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => handleAddSingle(item, 1)}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded transition"
                                    title="Adicionar 1 Borne"
                                  >
                                    +1 Borne
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddSingle(item, 5)}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold rounded transition"
                                    title="Adicionar réguinha de 5 bornes"
                                  >
                                    +5x
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddSingle(item, 10)}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded transition"
                                    title="Adicionar bloco de 10 bornes"
                                  >
                                    +10x
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddSingle(item, 1)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-xs transition whitespace-nowrap"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Adicionar à Calha {selectedRail + 1}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-14 px-4 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Search className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      {searchTerm.trim()
                        ? `Nenhum componente encontrado para "${searchTerm}"`
                        : 'Nenhum componente nesta categoria com os filtros ativos'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {searchTerm.trim() && searchScope === 'category' && globalMatches.length > 0
                        ? `Existem ${globalMatches.length} componentes compatíveis noutras categorias do catálogo.`
                        : 'Tente pesquisar por termos mais gerais (ex: 24V, 16A, Siemens, Borne), verificar a marca ou limpar os filtros.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {searchTerm.trim() && searchScope === 'category' && globalMatches.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSearchScope('all')}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Ver todos os {globalMatches.length} resultados no catálogo</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedBrand('all');
                        setSelectedCategory('all');
                        setSearchScope('all');
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                    >
                      Limpar Pesquisa e Filtros
                    </button>
                    {searchTerm.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomName(searchTerm.trim());
                          setActiveTab('custom');
                        }}
                        className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        title="Criar novo componente com este nome"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Criar "{searchTerm.trim()}" como Novo</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ====================================================================
             5. CUSTOM MATERIAL CREATOR (Fast & Versatile for other brands)
             ==================================================================== */
          <div className="flex-1 bg-slate-900/60 overflow-y-auto p-6 flex justify-center">
            <form onSubmit={handleCreateCustom} className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-400" />
                  <span>Criar Componente Genérico ou de Outra Marca</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adicione qualquer material (Hager, ABB, Schneider Electric, Chint, Lovato, Eaton, Carlo Gavazzi, etc.) à Calha {selectedRail + 1}.
                </p>
              </div>

              {/* Name & Brand */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Nome do Componente: *
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex: Disjuntor 1P+N 16A Curva C"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Marca do Fabricante:
                  </label>
                  <input
                    type="text"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    placeholder="Ex: Hager, ABB, Chint, Genérico"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                  {/* Quick brand suggestions */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Genérico', 'Hager', 'ABB', 'Schneider', 'Chint', 'Eaton', 'Legrand', 'Finder'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setCustomBrand(b)}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category & Width */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Categoria Elétrica:
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as ComponentCategory)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="protection_ac">Disjuntor / Diferencial AC</option>
                    <option value="protection_dc">Proteção DC 24V</option>
                    <option value="power_supply">Fonte de Alimentação DIN</option>
                    <option value="terminals">Borne de Ligação</option>
                    <option value="relays">Relé de Interface / Temporizador</option>
                    <option value="motor_control">Contactor / Disjuntor-Motor</option>
                    <option value="safety_relays">Relé de Segurança</option>
                    <option value="accessories">Tomada / Acessório DIN</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Largura em Calha DIN (mm):
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={customWidthMm}
                    onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  {/* Preset width buttons */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[
                      { label: '6.2mm (Fino)', mm: 6.2 },
                      { label: '18mm (1 TE)', mm: 18 },
                      { label: '36mm (2 TE)', mm: 36 },
                      { label: '40mm (Fonte)', mm: 40 },
                      { label: '54mm (3 TE)', mm: 54 },
                      { label: '72mm (4 TE)', mm: 72 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setCustomWidthMm(p.mm)}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Electrical Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tensão Nominal:</label>
                  <input
                    type="text"
                    value={customVoltage}
                    onChange={(e) => setCustomVoltage(e.target.value)}
                    placeholder="230V AC ou 24V DC"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Corrente Nominal (A):</label>
                  <input
                    type="text"
                    value={customCurrent}
                    onChange={(e) => setCustomCurrent(e.target.value)}
                    placeholder="Ex: 16"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Preço Estimado (€):</label>
                  <input
                    type="text"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="Ex: 12.50"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Descrição Técnica / Notas:</label>
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Ex: Disjuntor 1P+N Curva C 6kA para circuito de iluminação"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
                >
                  Voltar ao Catálogo
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Inserir Componente na Calha {selectedRail + 1}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Sub-modals for Excel Library Management & Rich Component Creator */}
      {isLibraryOpen && (
        <ComponentLibraryManagerModal
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          targetRailIndex={selectedRail}
          railCount={railCount}
          onAddComponent={onAddComponent}
          onShowNotification={(msg) => {
            setRecentNotification(msg);
            setTimeout(() => setRecentNotification(null), 2500);
          }}
        />
      )}

      {isCustomModalOpen && (
        <CustomComponentModal
          isOpen={isCustomModalOpen}
          onClose={() => {
            setIsCustomModalOpen(false);
            setEditingModalItem(null);
          }}
          initialItem={editingModalItem}
          targetRailIndex={selectedRail}
          onSaved={(saved, addToRail) => {
            refreshCatalog();
            if (addToRail) {
              onAddComponent(saved, selectedRail, 1);
            }
            setRecentNotification(`Componente "${saved.name}" gravado com sucesso!`);
            setTimeout(() => setRecentNotification(null), 2500);
          }}
        />
      )}
    </div>
  );
};
