import React, { useState } from 'react';
import { ProjectState } from '../types/electrical';
import { downloadCabinetDxf, generateCabinetDxf, DxfExportOptions } from '../utils/dxfExporter';
import { 
  X, Download, Layers, Check, Copy, Box, Sliders, 
  FileCode, CheckCircle, Info, Sparkles 
} from 'lucide-react';

interface DxfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onShowNotification?: (msg: string) => void;
}

export const DxfExportModal: React.FC<DxfExportModalProps> = ({
  isOpen,
  onClose,
  project,
  onShowNotification,
}) => {
  const [options, setOptions] = useState<DxfExportOptions>({
    includeDimensions: true,
    includeTitleBlock: true,
    includeGlandsPunching: true,
    includeDuctSlots: true,
    includeComponentLabels: true,
    includeTerminals: true,
  });

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    downloadCabinetDxf(project, undefined, options);
    if (onShowNotification) {
      onShowNotification('Desenho DXF (AutoCAD / CAD 1:1 mm) descarregado com sucesso!');
    }
    onClose();
  };

  const handleCopy = () => {
    const text = generateCabinetDxf(project, options);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onShowNotification) {
      onShowNotification('Código ASCII DXF copiado para a área de transferência.');
    }
  };

  const toggleOption = (key: keyof DxfExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalComponents = project.rails.reduce((acc, r) => acc + (r.items ? r.items.length : 0), 0);
  const totalGlands = project.glands ? project.glands.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Exportar Desenho CAD (Formato DXF)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  ESCALA 1:1
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Compatível com AutoCAD, SolidWorks, LibreCAD, FreeCAD, DraftSight e QCAD.
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Technical Specs Overview */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Quadro / Projeto:</span>
              <span className="font-bold text-white font-mono">
                {project.config.projectCode}: {project.config.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Dimensões do Desenho:</span>
              <span className="font-bold text-sky-400 font-mono">
                {project.config.widthMm} x {project.config.heightMm} x {project.config.depthMm} mm
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Elementos Incluídos:</span>
              <span className="font-semibold text-slate-300">
                {project.rails.length} calhas DIN · {totalComponents} componentes · {totalGlands} bucins
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Unidades CAD:</span>
              <span className="font-mono text-emerald-400 font-bold">
                Milímetros ($INSUNITS = 4)
              </span>
            </div>
          </div>

          {/* Layer Customization & Export Options */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
              Camadas (Layers) e Elementos a Gerar:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Cotas */}
              <button
                type="button"
                onClick={() => toggleOption('includeDimensions')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition ${
                  options.includeDimensions
                    ? 'bg-slate-950 border-blue-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 ${
                  options.includeDimensions ? 'bg-blue-600 text-white' : 'border border-slate-700'
                }`}>
                  {options.includeDimensions && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="text-xs font-bold block">Cotas Técnicas (Linhas de Medida)</span>
                  <span className="text-[10px] text-slate-500">Largura, altura e cotas das calhas DIN</span>
                </div>
              </button>

              {/* Bucins */}
              <button
                type="button"
                onClick={() => toggleOption('includeGlandsPunching')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition ${
                  options.includeGlandsPunching
                    ? 'bg-slate-950 border-amber-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 ${
                  options.includeGlandsPunching ? 'bg-amber-600 text-white' : 'border border-slate-700'
                }`}>
                  {options.includeGlandsPunching && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="text-xs font-bold block">Furação dos Bucins & Eixos</span>
                  <span className="text-[10px] text-slate-500">Cruzetas de centro e diâmetros de punçoamento</span>
                </div>
              </button>

              {/* Carimbo */}
              <button
                type="button"
                onClick={() => toggleOption('includeTitleBlock')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition ${
                  options.includeTitleBlock
                    ? 'bg-slate-950 border-blue-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 ${
                  options.includeTitleBlock ? 'bg-blue-600 text-white' : 'border border-slate-700'
                }`}>
                  {options.includeTitleBlock && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="text-xs font-bold block">Carimbo Técnico (Title Block)</span>
                  <span className="text-[10px] text-slate-500">Identificação, data, escala e normas</span>
                </div>
              </button>

              {/* Ranhuras */}
              <button
                type="button"
                onClick={() => toggleOption('includeDuctSlots')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition ${
                  options.includeDuctSlots
                    ? 'bg-slate-950 border-emerald-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 ${
                  options.includeDuctSlots ? 'bg-emerald-600 text-white' : 'border border-slate-700'
                }`}>
                  {options.includeDuctSlots && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="text-xs font-bold block">Ranhuras das Caleiras</span>
                  <span className="text-[10px] text-slate-500">Aberturas nas calhas de passagem de fios</span>
                </div>
              </button>

              {/* Labels */}
              <button
                type="button"
                onClick={() => toggleOption('includeComponentLabels')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition ${
                  options.includeComponentLabels
                    ? 'bg-slate-950 border-purple-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 ${
                  options.includeComponentLabels ? 'bg-purple-600 text-white' : 'border border-slate-700'
                }`}>
                  {options.includeComponentLabels && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="text-xs font-bold block">Etiquetas dos Componentes</span>
                  <span className="text-[10px] text-slate-500">Tags (Q1, KM1...), marcas e referências</span>
                </div>
              </button>

              {/* Terminais */}
              <button
                type="button"
                onClick={() => toggleOption('includeTerminals')}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition ${
                  options.includeTerminals
                    ? 'bg-slate-950 border-pink-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 ${
                  options.includeTerminals ? 'bg-pink-600 text-white' : 'border border-slate-700'
                }`}>
                  {options.includeTerminals && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="text-xs font-bold block">Terminais e Parafusos</span>
                  <span className="text-[10px] text-slate-500">Pontos de ligação dos condutores</span>
                </div>
              </button>
            </div>
          </div>

          {/* CAD Layers Legend */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-300 mb-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Camadas CAD Normalizadas Criadas no Ficheiro:</span>
            </div>
            <p className="leading-relaxed">
              <code className="text-sky-300">QUADRO_EXTERIOR</code>, <code className="text-slate-300">PLACA_MONTAGEM</code>, <code className="text-emerald-400">CALEIRAS_RANHURADAS</code>, <code className="text-cyan-400">CALHAS_DIN35</code>, <code className="text-white">COMPONENTES_CORPO</code>, <code className="text-yellow-300">COMPONENTES_TEXTO</code>, <code className="text-red-400">BUCINS_FURACAO</code>, <code className="text-red-300">COTAS_TECNICAS</code>, <code className="text-white">CARIMBO_LEGENDA</code>.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar DXF</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-lg shadow-blue-900/50 transition active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Descarregar Ficheiro .DXF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
