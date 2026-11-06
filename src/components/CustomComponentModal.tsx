import React, { useState, useEffect } from 'react';
import { CatalogItem, ComponentCategory } from '../types/electrical';
import { CATEGORY_DEFINITIONS } from '../utils/excelComponentIO';
import { saveCustomComponent } from '../utils/customComponentStorage';
import { 
  X, Check, Sparkles, Box, Sliders, Zap, Tag, Euro, Ruler, Palette, 
  Layers, AlertCircle, Info, Plus, Copy, Eye
} from 'lucide-react';

interface CustomComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: Partial<CatalogItem> | null;
  targetRailIndex?: number;
  onSaved?: (item: CatalogItem, addToRail?: boolean) => void;
}

const COMMON_BRANDS = [
  'Schneider Electric',
  'Siemens',
  'Legrand',
  'ABB',
  'Hager',
  'Mean Well',
  'Finder',
  'Phoenix Contact',
  'Weidmüller',
  'Chint',
  'Eaton',
  'Genérico',
];

const COLOR_PRESETS = [
  { name: 'Azul Fonte (Mean Well)', color: '#0284c7' },
  { name: 'Cinzento Disjuntor AC', color: '#334155' },
  { name: 'Azul Petróleo (Siemens)', color: '#0f766e' },
  { name: 'Azul Comando (Relés)', color: '#0369a1' },
  { name: 'Vermelho Segurança (Cat 4)', color: '#dc2626' },
  { name: 'Verde/Amarelo Terra PE', color: '#15803d' },
  { name: 'Azul Neutro N', color: '#2563eb' },
  { name: 'Laranja / Ambar Alerta', color: '#d97706' },
  { name: 'Preto / Grafite Escuro', color: '#1e293b' },
  { name: 'Cinzento Claro / Bege', color: '#64748b' },
];

export const CustomComponentModal: React.FC<CustomComponentModalProps> = ({
  isOpen,
  onClose,
  initialItem,
  targetRailIndex,
  onSaved,
}) => {
  const isEditing = Boolean(initialItem?.catalogId);

  // Form State
  const [name, setName] = useState(initialItem?.name || '');
  const [brand, setBrand] = useState(initialItem?.brand || 'Genérico');
  const [series, setSeries] = useState(initialItem?.series || '');
  const [partNumber, setPartNumber] = useState(initialItem?.partNumber || '');
  const [category, setCategory] = useState<ComponentCategory>(initialItem?.category || 'protection_ac');
  const [tagPrefix, setTagPrefix] = useState(initialItem?.tagPrefix || 'Q');
  const [description, setDescription] = useState(initialItem?.description || '');
  const [widthMm, setWidthMm] = useState<number>(initialItem?.widthMm || 18);
  const [heightMm, setHeightMm] = useState<number>(initialItem?.heightMm || 90);
  const [depthMm, setDepthMm] = useState<number>(initialItem?.depthMm || 70);
  const [dinModules, setDinModules] = useState<number>(initialItem?.dinModules || 1);
  const [inputVoltage, setInputVoltage] = useState(initialItem?.inputVoltage || '230V AC');
  const [outputVoltage, setOutputVoltage] = useState(initialItem?.outputVoltage || '');
  const [ratedCurrentA, setRatedCurrentA] = useState<string>(initialItem?.ratedCurrentA !== undefined ? String(initialItem.ratedCurrentA) : '16');
  const [ratedPowerW, setRatedPowerW] = useState<string>(initialItem?.ratedPowerW !== undefined ? String(initialItem.ratedPowerW) : '');
  const [dcConsumptionA, setDcConsumptionA] = useState<string>(initialItem?.dcConsumptionA !== undefined ? String(initialItem.dcConsumptionA) : '');
  const [dcConsumptionW, setDcConsumptionW] = useState<string>(initialItem?.dcConsumptionW !== undefined ? String(initialItem.dcConsumptionW) : '');
  const [terminalsSummary, setTerminalsSummary] = useState(initialItem?.terminalsSummary || '');
  const [estimatedPriceEur, setEstimatedPriceEur] = useState<string>(initialItem?.estimatedPriceEur !== undefined ? String(initialItem.estimatedPriceEur) : '15.00');
  const [color, setColor] = useState(initialItem?.color || '#334155');
  const [addImmediately, setAddImmediately] = useState(targetRailIndex !== undefined);
  const [errors, setErrors] = useState<string[]>([]);

  // Update fields when initialItem changes
  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        setName(initialItem.name || '');
        setBrand(initialItem.brand || 'Genérico');
        setSeries(initialItem.series || '');
        setPartNumber(initialItem.partNumber || '');
        setCategory(initialItem.category || 'protection_ac');
        setTagPrefix(initialItem.tagPrefix || CATEGORY_DEFINITIONS[initialItem.category || 'protection_ac']?.defaultPrefix || 'Q');
        setDescription(initialItem.description || '');
        setWidthMm(initialItem.widthMm || 18);
        setHeightMm(initialItem.heightMm || 90);
        setDepthMm(initialItem.depthMm || 70);
        setDinModules(initialItem.dinModules || Math.round(((initialItem.widthMm || 18) / 18) * 10) / 10);
        setInputVoltage(initialItem.inputVoltage || '');
        setOutputVoltage(initialItem.outputVoltage || '');
        setRatedCurrentA(initialItem.ratedCurrentA !== undefined ? String(initialItem.ratedCurrentA) : '');
        setRatedPowerW(initialItem.ratedPowerW !== undefined ? String(initialItem.ratedPowerW) : '');
        setDcConsumptionA(initialItem.dcConsumptionA !== undefined ? String(initialItem.dcConsumptionA) : '');
        setDcConsumptionW(initialItem.dcConsumptionW !== undefined ? String(initialItem.dcConsumptionW) : '');
        setTerminalsSummary(initialItem.terminalsSummary || '');
        setEstimatedPriceEur(initialItem.estimatedPriceEur !== undefined ? String(initialItem.estimatedPriceEur) : '15.00');
        setColor(initialItem.color || CATEGORY_DEFINITIONS[initialItem.category || 'protection_ac']?.defaultColor || '#334155');
      } else {
        // Reset to default new component
        setName('');
        setBrand('Genérico');
        setSeries('');
        setPartNumber('');
        setCategory('protection_ac');
        setTagPrefix('Q');
        setDescription('');
        setWidthMm(18);
        setHeightMm(85);
        setDepthMm(70);
        setDinModules(1.0);
        setInputVoltage('230V AC');
        setOutputVoltage('');
        setRatedCurrentA('16');
        setRatedPowerW('');
        setDcConsumptionA('');
        setDcConsumptionW('');
        setTerminalsSummary('1 (L-In), 3 (N-In) / 2 (L-Out), 4 (N-Out)');
        setEstimatedPriceEur('12.50');
        setColor('#334155');
      }
      setErrors([]);
    }
  }, [isOpen, initialItem]);

  // Handle category change: update tag prefix, default height, and color if unchanged
  const handleCategoryChange = (newCat: ComponentCategory) => {
    setCategory(newCat);
    const def = CATEGORY_DEFINITIONS[newCat];
    if (def) {
      setTagPrefix(def.defaultPrefix);
      if (!isEditing) {
        setHeightMm(def.defaultHeightMm);
        setColor(def.defaultColor);
      }
    }
  };

  // Auto-calculate modules when width changes
  const handleWidthChange = (val: number) => {
    const w = Math.max(1, val);
    setWidthMm(w);
    setDinModules(Math.round((w / 18) * 10) / 10);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!name.trim()) {
      newErrors.push('O nome do componente é obrigatório.');
    }
    if (widthMm <= 0) {
      newErrors.push('A largura deve ser superior a 0 mm.');
    }
    if (heightMm <= 0) {
      newErrors.push('A altura deve ser superior a 0 mm.');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const itemToSave: CatalogItem = {
      catalogId: initialItem?.catalogId || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      brand: brand.trim() || 'Genérico',
      series: series.trim() || undefined,
      partNumber: partNumber.trim() || name.trim().toUpperCase().replace(/\s+/g, '-'),
      tagPrefix: tagPrefix.trim().toUpperCase() || 'Q',
      category,
      description: description.trim() || `${name} (${brand})`,
      widthMm: Number(widthMm),
      heightMm: Number(heightMm),
      depthMm: Number(depthMm),
      dinModules: Number(dinModules),
      inputVoltage: inputVoltage.trim() || undefined,
      outputVoltage: outputVoltage.trim() || undefined,
      ratedCurrentA: ratedCurrentA !== '' ? Number(ratedCurrentA) : undefined,
      ratedPowerW: ratedPowerW !== '' ? Number(ratedPowerW) : undefined,
      dcConsumptionA: dcConsumptionA !== '' ? Number(dcConsumptionA) : undefined,
      dcConsumptionW: dcConsumptionW !== '' ? Number(dcConsumptionW) : undefined,
      terminalsSummary: terminalsSummary.trim() || undefined,
      estimatedPriceEur: Math.max(0, Number(estimatedPriceEur) || 0),
      color: color || '#334155',
    };

    saveCustomComponent(itemToSave);

    if (onSaved) {
      onSaved(itemToSave, addImmediately);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 overflow-y-auto select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Box className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isEditing ? 'Editar Componente Personalizado' : 'Criar Novo Componente Personalizado'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60">
                  DIN Rail TS35
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure as dimensões mecânicas, parâmetros elétricos e aparência para calhas DIN.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Por favor corrija os seguintes campos:</p>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Row: Form Inputs + Live Preview Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Main Info */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Name & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Componente *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Disjuntor Bipolar 16A Curva C"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fabricante / Marca
                  </label>
                  <input
                    type="text"
                    list="brand-suggestions"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ex: Schneider, Siemens, Genérico"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden"
                  />
                  <datalist id="brand-suggestions">
                    {COMMON_BRANDS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Part Number & Series */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Referência / Código Fabricante (Part Number)
                  </label>
                  <input
                    type="text"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="Ex: A9F74216 ou NDR-120-24"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-sm font-mono text-white placeholder-slate-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Série / Família de Produto
                  </label>
                  <input
                    type="text"
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    placeholder="Ex: Acti9, SITOP, Viking 3"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Category & Tag Prefix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria Funcional *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as ComponentCategory)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-white focus:outline-hidden cursor-pointer"
                  >
                    {Object.entries(CATEGORY_DEFINITIONS).map(([code, def]) => (
                      <option key={code} value={code}>
                        {def.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Prefixo de Tag Elétrica</span>
                    <span className="text-[10px] text-slate-400 font-normal">Ex: Q1, G1, A1, K1, X1</span>
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={tagPrefix}
                    onChange={(e) => setTagPrefix(e.target.value.toUpperCase())}
                    placeholder="Q"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-sm font-mono font-bold text-amber-400 placeholder-slate-500 focus:outline-hidden uppercase"
                  />
                </div>
              </div>

            </div>

            {/* Right 1 Col: Live Visual Preview on DIN Rail */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <span>Pré-visualização DIN</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {widthMm}mm ({dinModules} mod)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Aparência proporcional na calha DIN TS35 de 35mm:
                </p>

                {/* SVG Visual Preview Box */}
                <div className="h-44 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                  {/* Background DIN rail TS35 metallic profile */}
                  <div className="absolute inset-x-0 h-9 bg-linear-to-b from-amber-700/30 via-amber-600/20 to-amber-800/40 border-y border-amber-600/40 flex items-center justify-between px-3">
                    <span className="text-[9px] font-mono text-amber-500/60 uppercase tracking-widest">TS35 DIN EN 50022</span>
                    <span className="text-[9px] font-mono text-amber-500/60 uppercase tracking-widest">35mm</span>
                  </div>

                  {/* Component preview */}
                  <div 
                    className="relative z-10 rounded-md shadow-xl border flex flex-col justify-between p-2 transition-all duration-200"
                    style={{
                      backgroundColor: color,
                      borderColor: 'rgba(255,255,255,0.25)',
                      width: `${Math.min(Math.max(widthMm * 2.2, 50), 220)}px`,
                      height: `${Math.min(Math.max(heightMm * 1.3, 70), 150)}px`,
                    }}
                  >
                    {/* Top terminal area */}
                    <div className="flex items-center justify-between border-b border-white/20 pb-1">
                      <span className="text-[10px] font-mono font-bold text-amber-300 bg-black/40 px-1 rounded">
                        {tagPrefix || 'Q'}?
                      </span>
                      <span className="text-[9px] font-mono text-white/70 truncate max-w-[80px]">
                        {brand || 'Genérico'}
                      </span>
                    </div>

                    {/* Middle info */}
                    <div className="my-auto text-center px-1 overflow-hidden">
                      <div className="text-[11px] font-bold text-white truncate drop-shadow-xs" title={name || 'Nome do Componente'}>
                        {name || 'Novo Componente'}
                      </div>
                      <div className="text-[9px] font-mono text-white/80 truncate">
                        {partNumber || category}
                      </div>
                      {ratedCurrentA && (
                        <div className="text-[9px] font-mono text-emerald-300 font-bold mt-0.5">
                          {ratedCurrentA}A {inputVoltage ? `| ${inputVoltage}` : ''}
                        </div>
                      )}
                    </div>

                    {/* Bottom DIN rail latch & specs */}
                    <div className="border-t border-white/20 pt-1 flex items-center justify-between text-[8px] font-mono text-white/70">
                      <span>{widthMm}mm</span>
                      <span className="w-2 h-2 rounded-full bg-white/40"></span>
                      <span>{estimatedPriceEur ? `${Number(estimatedPriceEur).toFixed(2)}€` : '0€'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Color Palette */}
              <div className="mt-3 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3 h-3 text-sky-400" />
                  <span>Cor de Destaque</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.color}
                      type="button"
                      onClick={() => setColor(p.color)}
                      title={p.name}
                      className={`w-5 h-5 rounded-md border transition-transform ${
                        color === p.color ? 'scale-125 border-white shadow-md' : 'border-slate-700 hover:scale-110'
                      }`}
                      style={{ backgroundColor: p.color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    title="Escolher cor personalizada"
                    className="w-5 h-5 rounded-md border border-slate-700 cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Section: Physical Dimensions */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Ruler className="w-4 h-4 text-emerald-400" />
              <span>Dimensões Mecânicas (Calha DIN)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Largura (mm) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  required
                  value={widthMm}
                  onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg text-sm font-mono text-white focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">1 módulo DIN = 18mm</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Módulos DIN (18mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={dinModules}
                  onChange={(e) => setDinModules(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg text-sm font-mono text-white focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Ex: 1P=1, 2P=2, 3P=3</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Altura (mm)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={heightMm}
                  onChange={(e) => setHeightMm(parseFloat(e.target.value) || 85)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg text-sm font-mono text-white focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Padrão DIN: 85 a 125mm</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Profundidade (mm)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={depthMm}
                  onChange={(e) => setDepthMm(parseFloat(e.target.value) || 70)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg text-sm font-mono text-white focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Para profundidade do quadro</span>
              </div>
            </div>
          </div>

          {/* Section: Electrical Ratings & Power Balance */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Parâmetros Elétricos & Balanço de Potência</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tensão de Entrada
                </label>
                <input
                  type="text"
                  value={inputVoltage}
                  onChange={(e) => setInputVoltage(e.target.value)}
                  placeholder="Ex: 230V AC"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg text-sm font-mono text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tensão de Saída
                </label>
                <input
                  type="text"
                  value={outputVoltage}
                  onChange={(e) => setOutputVoltage(e.target.value)}
                  placeholder="Ex: 24V DC"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg text-sm font-mono text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Corrente Nominal (A)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={ratedCurrentA}
                  onChange={(e) => setRatedCurrentA(e.target.value)}
                  placeholder="Ex: 16"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg text-sm font-mono text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Potência Nominal (W)
                </label>
                <input
                  type="number"
                  step="1"
                  value={ratedPowerW}
                  onChange={(e) => setRatedPowerW(e.target.value)}
                  placeholder="Ex: 120"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg text-sm font-mono text-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-900">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Consumo em 24V DC (Amperes)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={dcConsumptionA}
                  onChange={(e) => setDcConsumptionA(e.target.value)}
                  placeholder="Ex: 0.5 (para balanço de carga DC)"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg text-sm font-mono text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Consumo em 24V DC (Watts)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={dcConsumptionW}
                  onChange={(e) => setDcConsumptionW(e.target.value)}
                  placeholder="Ex: 12"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg text-sm font-mono text-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section: Terminals & Commercial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Resumo dos Bornes e Terminais de Ligação
              </label>
              <input
                type="text"
                value={terminalsSummary}
                onChange={(e) => setTerminalsSummary(e.target.value)}
                placeholder="Ex: 1, 3 (In) / 2, 4 (Out) ou AC: L, N, PE | DC: +V, -V"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Euro className="w-3.5 h-3.5 text-emerald-400" />
                <span>Preço Estimado (€)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={estimatedPriceEur}
                onChange={(e) => setEstimatedPriceEur(e.target.value)}
                placeholder="15.00"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-sm font-mono text-emerald-300 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Descrição Técnica / Notas Adicionais
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhes como poder de corte (ex: 6kA), tipo de contacto, certificações, etc."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Option: Add immediately to rail */}
          {targetRailIndex !== undefined && (
            <div className="flex items-center gap-2 p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs text-blue-200">
              <input
                type="checkbox"
                id="add-immediately-check"
                checked={addImmediately}
                onChange={(e) => setAddImmediately(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <label htmlFor="add-immediately-check" className="cursor-pointer font-medium">
                Adicionar imediatamente este componente à <span className="font-bold underline">Calha {targetRailIndex + 1}</span> após gravar
              </label>
            </div>
          )}

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isEditing ? 'Atualizar Componente' : 'Gravar na Biblioteca'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
