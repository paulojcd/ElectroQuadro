import React, { useState, useRef, useEffect } from 'react';
import { ElectricalComponent } from '../types/electrical';
import { 
  INDUSTRIAL_SVG_TEMPLATES, 
  ComponentSvgTemplate, 
  readSvgFile, 
  downloadSvgFile, 
  svgToDataUri 
} from '../utils/componentSvgLibrary';
import { 
  X, Upload, Sparkles, Download, Trash2, Check, FileCode, 
  Eye, RefreshCw, ZoomIn, Sliders, ExternalLink 
} from 'lucide-react';

interface ComponentSvgPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: Partial<ElectricalComponent>;
  onApplySvg: (svgContent: string, fileName?: string, aspectMode?: 'contain' | 'stretch') => void;
  onRemoveSvg?: () => void;
}

export const ComponentSvgPickerModal: React.FC<ComponentSvgPickerModalProps> = ({
  isOpen,
  onClose,
  component,
  onApplySvg,
  onRemoveSvg,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'catalog' | 'code'>('upload');
  const [currentSvg, setCurrentSvg] = useState<string>(component.customSvg || '');
  const [svgFileName, setSvgFileName] = useState<string>(component.svgFileName || '');
  const [aspectMode, setAspectMode] = useState<'contain' | 'stretch'>(component.svgAspectMode || 'contain');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [svgCodeInput, setSvgCodeInput] = useState<string>(component.customSvg || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentSvg(component.customSvg || '');
      setSvgFileName(component.svgFileName || '');
      setAspectMode(component.svgAspectMode || 'contain');
      setSvgCodeInput(component.customSvg || '');
      setSelectedTemplateId(null);
      setErrorMessage(null);
    }
  }, [isOpen, component.customSvg, component.svgFileName, component.svgAspectMode]);

  if (!isOpen) return null;

  // Handler para ler ficheiro SVG carregado do disco
  const handleFileUpload = async (file: File) => {
    try {
      setErrorMessage(null);
      const result = await readSvgFile(file);
      setCurrentSvg(result.content);
      setSvgFileName(result.name);
      setSvgCodeInput(result.content);
      setSelectedTemplateId(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar o ficheiro SVG.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSelectTemplate = (template: ComponentSvgTemplate) => {
    setSelectedTemplateId(template.id);
    setCurrentSvg(template.svgContent);
    setSvgFileName(`${template.name}.svg`);
    setSvgCodeInput(template.svgContent);
    setErrorMessage(null);
  };

  const handleApply = () => {
    if (!currentSvg.trim()) {
      if (onRemoveSvg) onRemoveSvg();
    } else {
      onApplySvg(currentSvg, svgFileName, aspectMode);
    }
    onClose();
  };

  const previewUri = currentSvg ? svgToDataUri(currentSvg) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Aparência Gráfica Vectorial (Ficheiro SVG)</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {component.tag || component.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Carregue ficheiros .SVG personalizados ou selecione modelos industriais fotorealistas para o layout.
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

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'upload'
                ? 'border-sky-500 text-sky-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Carregar Ficheiro .SVG</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'catalog'
                ? 'border-sky-500 text-sky-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Modelos SVG Industriais ({INDUSTRIAL_SVG_TEMPLATES.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'code'
                ? 'border-sky-500 text-sky-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Código SVG Direto</span>
          </button>
        </div>

        {/* Modal Content Grid (Left Controls, Right Live Preview) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 p-4 overflow-y-auto">
          {/* Left Column: Form & Inputs */}
          <div className="md:col-span-7 flex flex-col space-y-3.5">
            {errorMessage && (
              <div className="p-3 bg-red-950/80 border border-red-500/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            {/* TAB 1: File Upload */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                    isDragging
                      ? 'border-sky-400 bg-sky-950/40 text-sky-200'
                      : 'border-slate-700 bg-slate-950/60 hover:border-slate-500 text-slate-300'
                  }`}
                >
                  <div className="p-3 rounded-full bg-slate-900 border border-slate-700 text-sky-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">
                      Clique para escolher ou arraste o ficheiro .SVG
                    </span>
                    <span className="text-xs text-slate-400">
                      Suporta ficheiros exportados do SolidWorks, AutoCAD, Illustrator ou bibliotecas de fabricantes
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mt-1 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    Procurar no Computador
                  </button>
                </div>

                {svgFileName && (
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 truncate max-w-xs">📄 {svgFileName}</span>
                    <span className="text-emerald-400 font-bold">Ficheiro Carregado</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Pre-made Industrial Templates */}
            {activeTab === 'catalog' && (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Selecione um gráfico vectorial pré-definido com acabamento profissional:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {INDUSTRIAL_SVG_TEMPLATES.map((tpl) => {
                    const isSelected = selectedTemplateId === tpl.id;
                    const uri = svgToDataUri(tpl.svgContent);

                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleSelectTemplate(tpl)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                          isSelected
                            ? 'bg-sky-950/50 border-sky-500 text-white shadow-md'
                            : 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="w-12 h-14 bg-slate-900 rounded border border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                          <img src={uri} alt={tpl.name} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                              {tpl.brand}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white truncate">{tpl.name}</h4>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {tpl.widthMm}×{tpl.heightMm} mm
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Direct SVG XML Code */}
            {activeTab === 'code' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Cole ou edite o código &lt;svg&gt;...&lt;/svg&gt;:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSvg(svgCodeInput);
                      setSelectedTemplateId(null);
                    }}
                    className="text-sky-400 hover:underline font-bold"
                  >
                    Atualizar Pré-Visualização
                  </button>
                </div>
                <textarea
                  value={svgCodeInput}
                  onChange={(e) => {
                    setSvgCodeInput(e.target.value);
                    setCurrentSvg(e.target.value);
                  }}
                  rows={10}
                  placeholder="<svg viewBox='0 0 100 100' ...> ... </svg>"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:border-sky-500 focus:outline-hidden"
                />
              </div>
            )}

            {/* Proportion / Aspect Ratio Settings */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>Ajuste de Escala no Trilho ({component.widthMm}×{component.heightMm || 90}mm):</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectMode('contain')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition text-left ${
                    aspectMode === 'contain'
                      ? 'bg-sky-600/30 border-sky-500 text-sky-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">Proporcional (Conter)</div>
                  <div className="text-[10px] text-slate-400">Mantém o rácio original do SVG</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectMode('stretch')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition text-left ${
                    aspectMode === 'stretch'
                      ? 'bg-sky-600/30 border-sky-500 text-sky-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">Preenchimento Total</div>
                  <div className="text-[10px] text-slate-400">Preenche a largura e altura exatas</div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Real-Time Preview on DIN Rail */}
          <div className="md:col-span-5 bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-between">
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pré-Visualização no Trilho DIN</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {component.widthMm ?? 18} × {component.heightMm || 90} mm
              </span>
            </div>

            {/* Simulated DIN Rail Stage */}
            <div className="w-full flex-1 flex items-center justify-center p-3 relative my-3 bg-slate-900/90 rounded-xl border border-slate-800/80 overflow-hidden min-h-[220px]">
              {/* DIN Rail Steel Bar Graphic Behind Component */}
              <div className="absolute left-0 right-0 h-5 bg-slate-700 border-y border-slate-500/60 shadow-inner flex items-center justify-around opacity-60">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-3 h-2 bg-slate-900 rounded-xs" />
                ))}
              </div>

              {/* Component Canvas Preview */}
              {previewUri ? (
                <div
                  className="relative z-10 rounded border border-sky-400/80 shadow-2xl overflow-hidden bg-slate-950/60"
                  style={{
                    width: `${Math.min(180, Math.max(50, (component.widthMm ?? 18) * 1.5))}px`,
                    height: `${Math.min(180, Math.max(80, (component.heightMm || 90) * 1.5))}px`,
                  }}
                >
                  <img
                    src={previewUri}
                    alt="Pré-visualização do SVG"
                    className={`w-full h-full ${aspectMode === 'contain' ? 'object-contain' : 'object-fill'}`}
                  />
                  {/* Overlay Tag Preview */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-slate-700 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold text-sky-400 shadow-md">
                    {component.tag || 'Q1'}
                  </div>
                </div>
              ) : (
                <div className="text-center z-10 text-slate-500 p-4">
                  <FileCode className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                  <span className="text-xs font-semibold block text-slate-400">Nenhum SVG Selecionado</span>
                  <span className="text-[11px] text-slate-600 block mt-0.5">
                    O componente utilizará o desenho vetorial geométrico padrão.
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions (Download SVG / Clear) */}
            <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              {currentSvg ? (
                <>
                  <button
                    type="button"
                    onClick={() => downloadSvgFile(currentSvg, svgFileName || `${component.name}.svg`)}
                    className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition"
                    title="Descarregar ficheiro SVG"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Descarregar .SVG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSvg('');
                      setSvgFileName('');
                      setSvgCodeInput('');
                      setSelectedTemplateId(null);
                    }}
                    className="py-1.5 px-2.5 bg-red-950/50 hover:bg-red-900 text-red-300 rounded-lg text-xs font-semibold border border-red-500/30 flex items-center justify-center gap-1 transition"
                    title="Remover SVG e repor visualização normal"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Limpar</span>
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-slate-500 italic">
                  Pronto para atribuir gráfico vectorial SVG.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="text-xs text-slate-400">
            {currentSvg ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Pronto a aplicar ao componente
              </span>
            ) : (
              <span>Modo gráfico normal ativo</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar SVG ao Componente</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
