import React from 'react';
import { TEMPLATES } from '../data/templates';
import { ProjectState } from '../types/electrical';
import { createEmptyProject } from '../utils/projectStorage';
import { X, FolderOpen, ArrowRight, PlusCircle, Sparkles } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (state: ProjectState) => void;
  onOpenNewProjectModal?: () => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  onOpenNewProjectModal,
}) => {
  const [filterCategory, setFilterCategory] = React.useState<'all' | 'residential' | 'automation'>('all');

  if (!isOpen) return null;

  const handleCreateEmpty = () => {
    if (onOpenNewProjectModal) {
      onClose();
      onOpenNewProjectModal();
    } else {
      const emptyState = createEmptyProject({
        name: 'Novo Quadro Elétrico',
        projectCode: `PRJ-${Math.floor(100 + Math.random() * 900)}`,
        widthMm: 450,
        heightMm: 600,
        depthMm: 150,
        railCount: 3,
        supplyVoltage: '230V AC (1F+N+PE)',
      });
      onSelectTemplate(emptyState);
      onClose();
    }
  };

  const filteredTemplates = TEMPLATES.filter((tmpl) => {
    if (filterCategory === 'all') return true;
    const isRes = tmpl.id.includes('residencial') || tmpl.state.config.applicationType === 'residential' || tmpl.name.toLowerCase().includes('residencial');
    if (filterCategory === 'residential') return isRes;
    if (filterCategory === 'automation') return !isRes;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-slate-100">Modelos Prontos & Novo Quadro</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 bg-slate-950/70 border-b border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterCategory === 'all'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Todos os Modelos ({TEMPLATES.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('residential')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              filterCategory === 'residential'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>🏠 Residencial (RTIEBT)</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('automation')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              filterCategory === 'automation'
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>🏭 Automação Industrial</span>
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          {/* Featured Option: EMPTY PROJECT / QUADRO EM BRANCO */}
          <div className="bg-gradient-to-r from-emerald-950/60 to-slate-950 border-2 border-emerald-500/50 hover:border-emerald-400 rounded-xl p-4 transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                  <PlusCircle className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Quadro Vazio / Projeto em Branco (Sem Componentes)
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Inicie um novo projeto totalmente limpo do zero para habitação ou indústria. Calhas DIN vazias prontas para posicionar a aparelhagem livremente.
              </p>
              <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-emerald-400">
                <span>Totalmente Limpo</span>
                <span>·</span>
                <span>0 Componentes</span>
                <span>·</span>
                <span>Dimensões Configuráveis</span>
              </div>
            </div>

            <button
              onClick={handleCreateEmpty}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition whitespace-nowrap self-start sm:self-center active:scale-98"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Criar Quadro Vazio</span>
            </button>
          </div>

          <div className="pt-2 pb-1 text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Modelos Pré-Configurados:</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Apresentando {filteredTemplates.length} de {TEMPLATES.length}
            </span>
          </div>

          {/* Pre-configured Templates */}
          {filteredTemplates.map((tmpl) => {
            const isRes = tmpl.id.includes('residencial') || tmpl.state.config.applicationType === 'residential' || tmpl.name.toLowerCase().includes('residencial');
            return (
              <div
                key={tmpl.id}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg p-4 transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                  {tmpl.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {tmpl.description}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-slate-500">
                  <span>{tmpl.state.config.supplyVoltage}</span>
                  <span>·</span>
                  <span>{tmpl.state.config.widthMm}x{tmpl.state.config.heightMm}mm</span>
                  <span>·</span>
                  <span>{tmpl.state.rails.length} Calhas</span>
                  <span>·</span>
                  <span>{tmpl.state.rails.reduce((acc, r) => acc + r.items.length, 0)} Componentes</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectTemplate(tmpl.state);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition whitespace-nowrap self-start sm:self-center"
              >
                <span>Carregar Modelo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
