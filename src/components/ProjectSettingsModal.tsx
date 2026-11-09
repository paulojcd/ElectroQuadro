import React, { useState } from 'react';
import { EnclosureConfig } from '../types/electrical';
import { verifyEnclosureIpIk, ENVIRONMENT_SPECS } from '../utils/ipIkVerification';
import { X, Check, Box, Sliders, Layers, Info, AlertCircle, Sparkles, ShieldCheck, ShieldAlert, AlertTriangle, Euro, Tag, Building } from 'lucide-react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EnclosureConfig;
  onSaveConfig: (newConfig: EnclosureConfig) => void;
}

const ENCLOSURE_PRESETS = [
  { name: '400 x 500 x 140', w: 400, h: 500, d: 140, rails: 2, spacing: 150, duct: 30, label: 'Residencial T0/T1 (24M)' },
  { name: '450 x 600 x 140', w: 450, h: 600, d: 140, rails: 3, spacing: 140, duct: 30, label: 'Residencial T2/T3 (36M)' },
  { name: '500 x 700 x 150', w: 500, h: 700, d: 150, rails: 4, spacing: 140, duct: 35, label: 'Moradia T4+ / EV (48M)' },
  { name: '600 x 800 x 250', w: 600, h: 800, d: 250, rails: 3, spacing: 170, duct: 40, label: 'Standard Industrial' },
  { name: '800 x 1000 x 300', w: 800, h: 1000, d: 300, rails: 4, spacing: 175, duct: 60, label: 'Grande Automação' },
  { name: '1000 x 1200 x 300', w: 1000, h: 1200, d: 300, rails: 6, spacing: 160, duct: 80, label: 'Centro de Comando' },
];

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<EnclosureConfig>({ ...config });

  // Only synchronize on modal opening (strictly avoids infinite loops)
  React.useEffect(() => {
    if (isOpen) {
      setFormData({ ...config });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    onClose();
  };

  const applyPreset = (preset: typeof ENCLOSURE_PRESETS[0]) => {
    setFormData((prev) => ({
      ...prev,
      widthMm: preset.w,
      heightMm: preset.h,
      depthMm: preset.d,
      railCount: preset.rails,
      railSpacingMm: preset.spacing,
      sideDuctWidthMm: preset.duct,
    }));
  };

  // Calculations for usable space
  const sideDuct = formData.sideDuctWidthMm || 40;
  const usableWidthMm = Math.max(80, formData.widthMm - 2 * sideDuct - 40);
  const modulesPerRail = Math.floor(usableWidthMm / 18);
  const totalModules = modulesPerRail * formData.railCount;
  const estimatedHeightNeeded = 80 + (formData.railCount - 1) * (formData.railSpacingMm || 150) + 120;
  const isHeightTight = formData.heightMm < estimatedHeightNeeded;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Configurações & Dimensões do Quadro</h2>
              <p className="text-xs text-slate-400">Personalize o tamanho do armário, calhas de fiação e calhas DIN 35mm.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Quick Preset Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Modelos Industriais Padrão (Dimensões Rápidas):</span>
              </label>
              <span className="text-[11px] text-slate-400">Clique para aplicar</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ENCLOSURE_PRESETS.map((p) => {
                const isSelected =
                  formData.widthMm === p.w &&
                  formData.heightMm === p.h &&
                  formData.railCount === p.rails;

                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                        : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono text-white">{p.name}mm</div>
                    <div className="text-[10px] text-slate-400">{p.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. Cabinet Dimensions (Tamanho do Quadro) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wide font-mono flex items-center gap-1.5">
                <Box className="w-4 h-4" />
                <span>1. Dimensões do Quadro / Armário (mm)</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                {formData.widthMm} x {formData.heightMm} x {formData.depthMm} mm
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-medium">Largura (mm):</label>
                <input
                  type="number"
                  min="300"
                  max="1600"
                  step="25"
                  value={formData.widthMm}
                  onChange={(e) => setFormData({ ...formData, widthMm: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-blue-500"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Mín: 300mm · Máx: 1600mm</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-medium">Altura (mm):</label>
                <input
                  type="number"
                  min="400"
                  max="2000"
                  step="25"
                  value={formData.heightMm}
                  onChange={(e) => setFormData({ ...formData, heightMm: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-blue-500"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Mín: 400mm · Máx: 2000mm</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-medium">Profundidade (mm):</label>
                <input
                  type="number"
                  min="150"
                  max="600"
                  step="25"
                  value={formData.depthMm}
                  onChange={(e) => setFormData({ ...formData, depthMm: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-blue-500"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Ex: 200, 250, 300mm</span>
              </div>
            </div>

            {/* Dados Comerciais e Custo do Armário no BOM */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-300 block mb-2 flex items-center gap-1.5">
                <Euro className="w-3.5 h-3.5 text-emerald-400" />
                <span>Modelo Comercial & Custo no Orçamento / BOM:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Fabricante:</label>
                  <input
                    type="text"
                    value={formData.enclosureBrand || ''}
                    onChange={(e) => setFormData({ ...formData, enclosureBrand: e.target.value })}
                    placeholder="Ex: Schneider, Rittal, Hager"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Ref. Comercial (Part Number):</label>
                  <input
                    type="text"
                    value={formData.enclosurePartNumber || ''}
                    onChange={(e) => setFormData({ ...formData, enclosurePartNumber: e.target.value })}
                    placeholder="Ex: NSYS3D6420P"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Preço no BOM (€):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.enclosurePriceEur ?? ''}
                    onChange={(e) => setFormData({ ...formData, enclosurePriceEur: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="Ex: 118.00"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {isHeightTight && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Atenção: A altura ({formData.heightMm}mm) está no limite para {formData.railCount} calhas com espaçamento de {formData.railSpacingMm}mm. Recomenda-se aumentar a altura ou reduzir o espaçamento.
                </span>
              </div>
            )}
          </div>

          {/* 2. Ducts & DIN Rails (Tamanho da Calha e Canaletas) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide font-mono flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>2. Canaletas de Cabos & Calhas DIN 35mm</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                {formData.railCount} Calhas · {modulesPerRail} módulos/calha
              </span>
            </div>

            {/* Wire Ducts (Canaletas de Fiação) */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2">Canaletas de Passagem de Cabos (Wire Ducts):</span>
              <div className="grid grid-cols-2 gap-3">
                {/* Side Duct */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Largura da Canaleta Lateral (mm):
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[25, 40, 60, 80].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setFormData({ ...formData, sideDuctWidthMm: w })}
                        className={`flex-1 py-1 rounded text-xs font-mono font-bold transition border ${
                          formData.sideDuctWidthMm === w
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {w}mm
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horizontal Duct */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Altura da Canaleta Horizontal (mm):
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[25, 40, 60, 80].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setFormData({ ...formData, horizontalDuctHeightMm: h })}
                        className={`flex-1 py-1 rounded text-xs font-mono font-bold transition border ${
                          (formData.horizontalDuctHeightMm || 40) === h
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {h}mm
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* DIN Rails Configuration */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
              {/* Rail Count */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                  Número de Calhas DIN 35mm:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, railCount: Math.max(1, formData.railCount - 1) })}
                    disabled={formData.railCount <= 1}
                    className="w-9 h-8 bg-slate-900 border border-slate-700 hover:bg-slate-800 disabled:opacity-40 rounded-lg text-white font-bold text-sm flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-mono font-bold text-sm text-sky-400 bg-slate-900 border border-slate-800 py-1.5 rounded-lg">
                    {formData.railCount} {formData.railCount === 1 ? 'Calha' : 'Calhas'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, railCount: Math.min(8, formData.railCount + 1) })}
                    disabled={formData.railCount >= 8}
                    className="w-9 h-8 bg-slate-900 border border-slate-700 hover:bg-slate-800 disabled:opacity-40 rounded-lg text-white font-bold text-sm flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Permite de 1 a 8 calhas DIN</span>
              </div>

              {/* Rail Spacing */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                  Espaçamento entre Calhas (mm):
                </label>
                <input
                  type="number"
                  min="110"
                  max="260"
                  step="10"
                  value={formData.railSpacingMm || 160}
                  onChange={(e) => setFormData({ ...formData, railSpacingMm: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-blue-500"
                />
                <div className="flex gap-1 mt-1">
                  {[125, 150, 175, 200].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({ ...formData, railSpacingMm: s })}
                      className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Space Calculation Summary Banner */}
            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Comprimento Útil por Calha:</span>
                <strong className="text-white text-sm">{usableWidthMm} mm</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Módulos DIN (18mm) / Calha:</span>
                <strong className="text-sky-400 text-sm">~{modulesPerRail} módulos</strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Capacidade Total Quadro:</span>
                <strong className="text-emerald-400 text-sm">~{totalModules} módulos DIN</strong>
              </div>
            </div>
          </div>

          {/* 3. Project Identification & Electrical Spec */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono block border-b border-slate-800/80 pb-1.5">
              3. Dados do Projeto & Rede Elétrica
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome do Quadro / Instalação:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Código do Projeto:</label>
                <input
                  type="text"
                  value={formData.projectCode}
                  onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Ambiente de Instalação & Influências Externas:</label>
                <select
                  value={formData.installationEnvironment || (formData.applicationType === 'residential' ? 'residential_indoor_dry' : 'industrial_clean_control')}
                  onChange={(e) => {
                    const newEnv = e.target.value as any;
                    const spec = ENVIRONMENT_SPECS[newEnv as keyof typeof ENVIRONMENT_SPECS];
                    setFormData((prev) => ({
                      ...prev,
                      installationEnvironment: newEnv,
                      // Auto-suggest optimal ratings if changing environment
                      ipRating: spec ? (spec.minIpRating as any) : prev.ipRating,
                      ikRating: spec ? spec.minIkRating : prev.ikRating,
                      enclosureMaterial: spec ? spec.recommendedMaterial : prev.enclosureMaterial,
                    }));
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-blue-500 font-medium"
                >
                  <optgroup label="🏠 Habitação & Residencial (RTIEBT)">
                    <option value="residential_indoor_dry">Habitação Interior Seco (Salas, Quartos, Corredor) · Min IP40/IK07</option>
                    <option value="residential_indoor_damp">Habitação Zonas Húmidas (Garagens, Caves, Lavandarias) · Min IP44/IK07</option>
                    <option value="residential_outdoor_sheltered">Residencial Exterior Abrigado (Alpendres, Varandas) · Min IP55/IK08</option>
                    <option value="residential_outdoor_exposed">Residencial Exterior Desabrigado (Jardim, Muro, Wallbox EV) · Min IP65/IK08</option>
                  </optgroup>
                  <optgroup label="🏢 Edifícios Comerciais & Terciário">
                    <option value="commercial_office">Comercial / Escritórios / Salas Técnicas Limpas · Min IP40/IK07</option>
                    <option value="commercial_kitchen_wash">Cozinhas Comerciais & Zonas de Lavagem · Min IP55/IK08</option>
                  </optgroup>
                  <optgroup label="🏭 Automação & Indústria (EN 60204-1)">
                    <option value="industrial_clean_control">Indústria Ligeira / Sala de Controlo & Autómatos · Min IP54/IK08</option>
                    <option value="industrial_dusty_workshop">Oficina com Poeiras (Serralharia, Carpintaria) · Min IP65/IK08</option>
                    <option value="industrial_heavy_washdown">Indústria Alimentar / Lavagem a Alta Pressão · Min IP66/IK09</option>
                    <option value="outdoor_severe_industrial">Exterior Industrial Severo & Marítimo · Min IP66/IK10</option>
                  </optgroup>
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Define as exigências mínimas de estanqueidade à água, pó e choques mecânicos segundo RTIEBT Quadro 51A.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tipo de Aplicação:</label>
                <select
                  value={formData.applicationType || 'residential'}
                  onChange={(e) => setFormData({ ...formData, applicationType: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-blue-500 font-medium"
                >
                  <option value="residential">🏠 Residencial (RTIEBT)</option>
                  <option value="automation">🏭 Automação (EN 60204-1)</option>
                  <option value="commercial">🏢 Comercial / Terciário</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Tensão de Alimentação:</label>
                <select
                  value={formData.supplyVoltage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplyVoltage: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-blue-500 font-mono"
                >
                  <option value="230V AC (1F+N+PE)">230V AC (1F+N+PE)</option>
                  <option value="400V AC (3F+N+PE)">400V AC (3F+N+PE)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Grau de Proteção (IP):</label>
                <select
                  value={formData.ipRating}
                  onChange={(e) => setFormData({ ...formData, ipRating: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                >
                  <option value="IP40">IP40 (Residencial c/ Porta)</option>
                  <option value="IP30">IP30 (Residencial sem Porta)</option>
                  <option value="IP44">IP44 (Zonas Húmidas / Garagem)</option>
                  <option value="IP54">IP54 (Indústria Ligeira)</option>
                  <option value="IP55">IP55 (Estanque a Poeiras/Salpicos)</option>
                  <option value="IP65">IP65 (Totalmente Estanque ao Pó)</option>
                  <option value="IP66">IP66 (Jatos Fortes de Água / Vagas)</option>
                  <option value="IP67">IP67 (Imersão Temporária)</option>
                  <option value="IP20">IP20 (Aberto / Interior de Armário)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Impactos Mecânicos (IK):</label>
                <select
                  value={formData.ikRating || (formData.applicationType === 'residential' ? 'IK07' : 'IK08')}
                  onChange={(e) => setFormData({ ...formData, ikRating: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                >
                  <option value="IK05">IK05 (0.7 Joules - Interior Ligeiro)</option>
                  <option value="IK07">IK07 (2.0 Joules - Padrão Habitação)</option>
                  <option value="IK08">IK08 (5.0 Joules - Padrão Industrial)</option>
                  <option value="IK09">IK09 (10.0 Joules - Elevado Impacto)</option>
                  <option value="IK10">IK10 (20.0 Joules - Máxima Robustez)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Material do Invólucro:</label>
                <select
                  value={formData.enclosureMaterial || (formData.applicationType === 'residential' ? 'thermoplastic' : 'sheet_steel')}
                  onChange={(e) => setFormData({ ...formData, enclosureMaterial: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-blue-500 font-medium"
                >
                  <option value="thermoplastic">Termoplástico ABS / Policarbonato (Habitação)</option>
                  <option value="sheet_steel">Chapa de Aço Pintada a Epóxi (Padrão Industrial)</option>
                  <option value="polyester">Poliéster Reforçado com Fibra de Vidro (Exterior)</option>
                  <option value="stainless_steel">Aço Inoxidável AISI 304/316 (Alimentar / Corrosivo)</option>
                  <option value="aluminium">Alumínio Naval</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4 sm:pt-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.hasDoor !== false}
                    onChange={(e) => setFormData({ ...formData, hasDoor: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-900 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-200">
                    Porta Frontal Instalada
                  </span>
                </label>
                <span className="text-[10px] text-slate-400">
                  (Obrigatória para garantir IP40 em habitação RTIEBT)
                </span>
              </div>
            </div>

            {/* Live IP/IK Verification Feedback Banner */}
            {(() => {
              const check = verifyEnclosureIpIk(formData);
              return (
                <div
                  className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    check.isCompliant
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : check.status === 'warning'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                      : 'bg-red-950/40 border-red-500/40 text-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {check.isCompliant ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : check.status === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span>
                          {check.isCompliant
                            ? 'Grau de Proteção e Impacto CONFORME ao Ambiente'
                            : check.status === 'warning'
                            ? 'Recomendação de Atenção no Grau IP / IK'
                            : 'NÃO-CONFORMIDADE: Proteção IP/IK Insuficiente'}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/40">
                          {check.environment.rtiebtInfluences.adWater} · {check.environment.rtiebtInfluences.agImpact}
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5 opacity-90">
                        {check.isCompliant ? (
                          <span>
                            O invólucro {formData.ipRating} / {check.actualIk} cumpre os requisitos normativos mínimos de {check.requiredIp} e {check.requiredIk} ({check.actualJoules}J ≥ {check.requiredJoules}J) segundo a {check.environment.normativeReference}.
                          </span>
                        ) : (
                          <span>
                            {check.findings[0]?.message || 'Ajuste as características do quadro para atender às exigências normativas.'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!check.isCompliant && check.recommendedCorrection && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          ipRating: check.recommendedCorrection!.ipRating,
                          ikRating: check.recommendedCorrection!.ikRating,
                          enclosureMaterial: check.recommendedCorrection!.enclosureMaterial,
                          hasDoor: check.recommendedCorrection!.hasDoor,
                        }));
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shrink-0 transition shadow-xs flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-Ajustar para {check.requiredIp} / {check.requiredIk}</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Notas do Projeto / Caderno de Encargos */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Notas do Projeto & Observações Técnicas (para Relatório PDF):
              </label>
              <textarea
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações técnicas, normas aplicáveis, instruções de montagem..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar Dimensões ao Quadro</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
