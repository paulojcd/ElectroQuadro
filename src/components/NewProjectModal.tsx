import React, { useState } from 'react';
import { ProjectState } from '../types/electrical';
import { createEmptyProject, EmptyProjectOptions } from '../utils/projectStorage';
import { 
  X, PlusCircle, Box, Sparkles, Check, AlertTriangle, 
  Layers, Zap, Sliders, ArrowRight 
} from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ProjectState;
  onCreateNewProject: (newProject: ProjectState) => void;
  onShowNotification?: (msg: string) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onCreateNewProject,
  onShowNotification,
}) => {
  const [applicationType, setApplicationType] = useState<'residential' | 'automation'>('residential');
  const [preset, setPreset] = useState<'compact' | 'standard' | 'large' | 'custom'>('standard');
  const [name, setName] = useState('Quadro de Habitação T2/T3');
  const [projectCode, setProjectCode] = useState(`PRJ-${Math.floor(100 + Math.random() * 900)}`);
  const [supplyVoltage, setSupplyVoltage] = useState('230V AC (1F+N+PE)');
  const [customWidth, setCustomWidth] = useState(600);
  const [customHeight, setCustomHeight] = useState(800);
  const [customDepth, setCustomDepth] = useState(250);
  const [customRails, setCustomRails] = useState(3);

  if (!isOpen) return null;

  const currentCompCount = currentProject.rails.reduce((acc, r) => acc + (r.items ? r.items.length : 0), 0);

  const handleApplicationTypeChange = (type: 'residential' | 'automation') => {
    setApplicationType(type);
    if (type === 'residential') {
      if (name === 'Novo Quadro de Automação' || name === 'Quadro de Habitação T2/T3') {
        setName('Quadro de Habitação T2/T3');
      }
    } else {
      if (name === 'Quadro de Habitação T2/T3' || name === 'Novo Quadro de Automação') {
        setName('Novo Quadro de Automação');
      }
    }
  };

  const handleCreate = () => {
    let opts: EmptyProjectOptions = {
      name,
      projectCode,
      supplyVoltage,
      applicationType,
      ipRating: applicationType === 'residential' ? 'IP40' : 'IP65',
    };

    if (preset === 'compact') {
      opts = { ...opts, widthMm: 400, heightMm: 500, depthMm: 160, railCount: 2 };
    } else if (preset === 'standard') {
      opts = { ...opts, widthMm: applicationType === 'residential' ? 450 : 600, heightMm: applicationType === 'residential' ? 600 : 800, depthMm: 200, railCount: 3 };
    } else if (preset === 'large') {
      opts = { ...opts, widthMm: applicationType === 'residential' ? 500 : 800, heightMm: applicationType === 'residential' ? 700 : 1000, depthMm: 250, railCount: 4 };
    } else {
      opts = {
        ...opts,
        widthMm: customWidth,
        heightMm: customHeight,
        depthMm: customDepth,
        railCount: customRails,
      };
    }

    const newEmpty = createEmptyProject(opts);
    onCreateNewProject(newEmpty);
    onClose();

    const successMsg = `Novo quadro ${applicationType === 'residential' ? 'residencial' : 'industrial'} "${name}" criado com sucesso!`;
    if (onShowNotification) onShowNotification(successMsg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Criar Novo Projeto / Quadro Vazio</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  EM BRANCO
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Inicie um novo quadro elétrico de raiz, limpo e pronto para montagem de aparelhagem.
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

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Warning if current project has components */}
          {currentCompCount > 0 && (
            <div className="flex items-start gap-3 p-3.5 bg-amber-950/40 border border-amber-600/40 rounded-xl text-amber-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-300">
                  O projeto atual contém {currentCompCount} componentes.
                </strong>
                <span>
                  Ao criar um novo quadro vazio, o espaço de trabalho atual será reiniciado. Se pretender guardar o trabalho atual, utilize primeiro o botão «Gravar» (Ctrl+S).
                </span>
              </div>
            </div>
          )}

          {/* Switchboard Application Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tipo de Aplicação do Quadro
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleApplicationTypeChange('residential')}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                  applicationType === 'residential'
                    ? 'bg-emerald-950/70 border-emerald-500 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className={`p-2 rounded-lg ${applicationType === 'residential' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🏠 Residencial / Habitação</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono mt-0.5">Normas RTIEBT & EN 61439-3</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Apartamentos e moradias, corte 2P/4P, diferenciais 30mA, reserva 20%, IP40.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplicationTypeChange('automation')}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                  applicationType === 'automation'
                    ? 'bg-emerald-950/70 border-emerald-500 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className={`p-2 rounded-lg ${applicationType === 'automation' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🏭 Automação Industrial</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono mt-0.5">EN 60204-1 & EN 61439-1/2</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Máquinas, PLCs Siemens, fontes Mean Well 24VDC, relés de segurança, IP65.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Project Name and Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nome do Projeto
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={applicationType === 'residential' ? 'Ex: Quadro Habitação T3' : 'Ex: Quadro Automação Linha 2'}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código / Referência
              </label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                placeholder="Ex: PRJ-002"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Supply Voltage */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tensão de Alimentação
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: '230V AC (1F+N+PE)', label: '230V Monofásico', sub: '1F + N + PE · 50Hz' },
                { id: '400V AC (3F+N+PE)', label: '400V Trifásico', sub: '3F + N + PE · 50Hz' },
                { id: '24V DC (Gabinete)', label: '24V DC Direto', sub: 'Automação DC' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSupplyVoltage(v.id)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    supplyVoltage === v.id
                      ? 'bg-emerald-950/60 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">{v.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{v.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dimension Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {applicationType === 'residential' ? 'Configuração do Quadro de Habitação (Módulos DIN)' : 'Dimensões e Calhas DIN do Armário Industrial'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Compact */}
              <button
                type="button"
                onClick={() => setPreset('compact')}
                className={`p-3 rounded-xl border text-left transition ${
                  preset === 'compact'
                    ? 'bg-emerald-950/70 border-emerald-500 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    {applicationType === 'residential' ? '📦 T1 / T2 (24M)' : '📦 Compacto'}
                  </span>
                  {preset === 'compact' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[11px] font-mono text-emerald-300 mt-1">400 x 500 x 160 mm</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {applicationType === 'residential' ? '2 Calhas DIN · Até 24 módulos' : '2 Calhas DIN · Residencial/I/O'}
                </div>
              </button>

              {/* Standard */}
              <button
                type="button"
                onClick={() => setPreset('standard')}
                className={`p-3 rounded-xl border text-left transition ${
                  preset === 'standard'
                    ? 'bg-emerald-950/70 border-emerald-500 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    {applicationType === 'residential' ? '🏠 T2 / T3 (36M)' : '🏢 Padrão Industrial'}
                  </span>
                  {preset === 'standard' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[11px] font-mono text-emerald-300 mt-1">
                  {applicationType === 'residential' ? '450 x 600 x 200 mm' : '600 x 800 x 250 mm'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {applicationType === 'residential' ? '3 Calhas DIN · Até 36 módulos' : '3 Calhas DIN · Padrão fabril'}
                </div>
              </button>

              {/* Large */}
              <button
                type="button"
                onClick={() => setPreset('large')}
                className={`p-3 rounded-xl border text-left transition ${
                  preset === 'large'
                    ? 'bg-emerald-950/70 border-emerald-500 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    {applicationType === 'residential' ? '🏡 Moradia T4+ / EV (48M)' : '🏭 Grande / Força'}
                  </span>
                  {preset === 'large' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[11px] font-mono text-emerald-300 mt-1">
                  {applicationType === 'residential' ? '500 x 700 x 250 mm' : '800 x 1000 x 300 mm'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {applicationType === 'residential' ? '4 Calhas DIN · Até 48 módulos' : '4 Calhas DIN · Distribuição'}
                </div>
              </button>
            </div>

            {/* Custom toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setPreset('custom')}
                className={`text-xs flex items-center gap-1.5 font-semibold transition ${
                  preset === 'custom' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configurar dimensões personalizadas (manual)</span>
              </button>

              {preset === 'custom' && (
                <div className="mt-3 p-4 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Largura (mm)</label>
                    <input
                      type="number"
                      min="300"
                      max="1200"
                      step="50"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Altura (mm)</label>
                    <input
                      type="number"
                      min="400"
                      max="1600"
                      step="50"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Profundidade (mm)</label>
                    <input
                      type="number"
                      min="150"
                      max="400"
                      step="50"
                      value={customDepth}
                      onChange={(e) => setCustomDepth(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Calhas DIN</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={customRails}
                      onChange={(e) => setCustomRails(Math.max(1, Math.min(6, Number(e.target.value))))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800 shrink-0 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-600/20 transition active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Criar Quadro Vazio</span>
          </button>
        </div>
      </div>
    </div>
  );
};
