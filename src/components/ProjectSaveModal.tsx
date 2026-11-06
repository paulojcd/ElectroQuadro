import React, { useState, useEffect, useRef } from 'react';
import { ProjectState, SavedProjectEntry } from '../types/electrical';
import { 
  getSavedProjects, 
  saveProjectToLibrary, 
  duplicateProjectInLibrary, 
  deleteProjectFromLibrary, 
  exportProjectAsJson, 
  exportProjectBackupJson,
  parseProjectJson,
  formatSavedTime 
} from '../utils/projectStorage';
import { downloadCabinetDxf } from '../utils/dxfExporter';
import { downloadQetFile, generateQetXml } from '../utils/qelectrotechExporter';
import { downloadDrawioFile, generateDrawioXml } from '../utils/drawioExporter';
import { AutoBackupState } from '../hooks/useAutoBackupOnIdle';
import { 
  Save, Download, Upload, FolderOpen, Trash2, Copy, Check, 
  X, AlertCircle, FileText, CheckCircle, Clock, HardDrive, 
  Layers, Cpu, Box, Sparkles, RefreshCw, FileCode, Zap, ExternalLink, PlusCircle,
  ShieldCheck, Shield, Timer
} from 'lucide-react';

interface ProjectSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onUpdateProject: (updated: ProjectState) => void;
  onOpenNewProject?: () => void;
  onShowNotification?: (msg: string) => void;
  autoBackup?: AutoBackupState;
}

export const ProjectSaveModal: React.FC<ProjectSaveModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onOpenNewProject,
  onShowNotification,
  autoBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'library' | 'export_import'>('save');
  
  // Form fields for saving
  const [projectName, setProjectName] = useState(project.config.name || 'Quadro de Automação');
  const [projectCode, setProjectCode] = useState(project.config.projectCode || 'PROJ-001');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  
  // Library of saved projects
  const [savedList, setSavedList] = useState<SavedProjectEntry[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedQet, setCopiedQet] = useState(false);
  const [copiedDrawio, setCopiedDrawio] = useState(false);
  
  // Import state
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or project changes
  useEffect(() => {
    if (isOpen) {
      setProjectName(project.config.name || 'Quadro de Automação');
      setProjectCode(project.config.projectCode || 'PROJ-001');
      setSavedList(getSavedProjects());
      setSaveSuccessMessage(null);
      setImportError(null);
      setImportSuccess(null);
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const totalComponents = project.rails.reduce((acc, r) => acc + (r.items ? r.items.length : 0), 0);
  const totalGlands = project.glands ? project.glands.length : 0;

  // Handle direct save
  const handleSaveCurrent = () => {
    const updated = saveProjectToLibrary(project, projectName, projectCode);
    setSavedList(getSavedProjects());
    
    // Also update parent state with updated name & code
    onUpdateProject(updated.state);

    const msg = `Projeto "${updated.name}" gravado com sucesso!`;
    setSaveSuccessMessage(msg);
    if (onShowNotification) onShowNotification(msg);

    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3500);
  };

  // Handle save as duplicate copy
  const handleSaveAsCopy = () => {
    const copyCode = `${projectCode}-COPIA-${Math.floor(100 + Math.random() * 900)}`;
    const copyName = `${projectName} (Cópia)`;
    const updated = saveProjectToLibrary(project, copyName, copyCode);
    setSavedList(getSavedProjects());
    onUpdateProject(updated.state);

    const msg = `Cópia "${copyName}" criada e gravada com sucesso!`;
    setSaveSuccessMessage(msg);
    if (onShowNotification) onShowNotification(msg);
    setActiveTab('library');
  };

  // Handle load project from library
  const handleLoadFromLibrary = (entry: SavedProjectEntry) => {
    onUpdateProject(entry.state);
    const msg = `Projeto "${entry.name}" carregado para a área de trabalho.`;
    if (onShowNotification) onShowNotification(msg);
    onClose();
  };

  // Handle duplicate in library
  const handleDuplicate = (id: string) => {
    duplicateProjectInLibrary(id);
    setSavedList(getSavedProjects());
    if (onShowNotification) onShowNotification('Projeto duplicado na biblioteca.');
  };

  // Handle delete in library
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Tem a certeza que deseja eliminar o projeto "${name}" dos seus projetos gravados?`)) {
      deleteProjectFromLibrary(id);
      setSavedList(getSavedProjects());
      if (onShowNotification) onShowNotification(`Projeto "${name}" removido.`);
    }
  };

  // Handle Export File
  const handleExportJson = () => {
    exportProjectAsJson(project);
    if (onShowNotification) onShowNotification('Ficheiro de projeto descarregado (.json).');
  };

  // Handle Export DXF for CAD
  const handleExportDxf = () => {
    downloadCabinetDxf(project);
    if (onShowNotification) onShowNotification('Desenho DXF para AutoCAD / CAD (1:1 mm) descarregado com sucesso!');
  };

  // Handle Export QElectroTech (.qet)
  const handleExportQet = () => {
    downloadQetFile(project);
    if (onShowNotification) onShowNotification('Projeto QElectroTech (.qet) descarregado com sucesso!');
  };

  // Handle Copy QElectroTech XML
  const handleCopyQet = async () => {
    try {
      const xml = generateQetXml(project);
      await navigator.clipboard.writeText(xml);
      setCopiedQet(true);
      setTimeout(() => setCopiedQet(false), 2500);
      if (onShowNotification) onShowNotification('Código XML QElectroTech copiado!');
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Export draw.io (.drawio)
  const handleExportDrawio = () => {
    downloadDrawioFile(project);
    if (onShowNotification) onShowNotification('Ficheiro draw.io (.drawio) descarregado com sucesso!');
  };

  // Handle Copy draw.io XML
  const handleCopyDrawio = async () => {
    try {
      const xml = generateDrawioXml(project);
      await navigator.clipboard.writeText(xml);
      setCopiedDrawio(true);
      setTimeout(() => setCopiedDrawio(false), 2500);
      if (onShowNotification) onShowNotification('Código XML draw.io copiado!');
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Copy JSON to clipboard
  const handleCopyJson = () => {
    const str = JSON.stringify(project, null, 2);
    navigator.clipboard.writeText(str);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
    if (onShowNotification) onShowNotification('JSON do projeto copiado para a área de transferência.');
  };

  // Handle File Upload / Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = parseProjectJson(text);
      if (res.success && res.state) {
        onUpdateProject(res.state);
        // Also save to library
        saveProjectToLibrary(res.state);
        setSavedList(getSavedProjects());
        setImportSuccess(`Projeto "${res.projectName}" importado com sucesso!`);
        setImportError(null);
        if (onShowNotification) onShowNotification(`Projeto "${res.projectName}" carregado com sucesso!`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setImportError(res.error || 'Erro desconhecido ao carregar ficheiro.');
        setImportSuccess(null);
      }
    };
    reader.onerror = () => {
      setImportError('Falha ao ler o ficheiro local.');
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredProjects = savedList.filter((p) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.dimensions.width.toString().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Gravar e Gerir Projeto</span>
                <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {project.config.projectCode || 'PROJ-001'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Grave na memória local do navegador, exporte em formato ficheiro (.json) ou restaure versões anteriores.
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
        <div className="flex border-b border-slate-800 bg-slate-950/80 px-6 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('save')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'save'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Gravar Projeto Atual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'library'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Os Meus Projetos ({savedList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export_import')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'export_import'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar & Importar Ficheiro (.json)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* =========================================================
              TAB 1: SAVE CURRENT PROJECT
             ========================================================= */}
          {activeTab === 'save' && (
            <div className="space-y-5">
              {/* Notification Banner */}
              {saveSuccessMessage && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-medium animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {/* Form inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Nome do Projeto / Quadro:
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ex: Quadro Geral de Distribuição QGBT-01"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500">
                    Nome descritivo exibido nos relatórios, lista de materiais e cabeçalho.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Código / Tag:
                  </label>
                  <input
                    type="text"
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                    placeholder="Ex: PROJ-2026-A"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500">
                    Identificador único do armário.
                  </span>
                </div>
              </div>

              {/* Technical Summary Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-blue-400" />
                    Resumo do Quadro a Gravar
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Versão CAD 2.0
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Dimensões</span>
                    <span className="font-bold text-slate-200">
                      {project.config.widthMm} x {project.config.heightMm} x {project.config.depthMm} mm
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Tensão & Alimentação</span>
                    <span className="font-bold text-sky-400">
                      {project.config.supplyVoltage} ({project.config.frequencyHz}Hz)
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Calhas & Componentes</span>
                    <span className="font-bold text-emerald-400">
                      {project.rails.length} calhas DIN · {totalComponents} componentes
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Bucins Entrada / Saída</span>
                    <span className="font-bold text-amber-400">
                      {totalGlands} bucins marcados
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-400">
                  <span className="text-slate-500 font-mono">Calhas ativas:</span>
                  {project.rails.map((r, idx) => (
                    <span key={r.id || idx} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono text-[10px]">
                      {r.name || `Calha ${idx + 1}`} ({r.items?.length || 0} itens)
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveCurrent}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-950 transition active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  <span>Gravar Projeto Agora</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAsCopy}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg transition"
                  title="Gera uma nova cópia sem sobrescrever o código anterior"
                >
                  <Copy className="w-4 h-4 text-blue-400" />
                  <span>Gravar Como Cópia</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg transition"
                  title="Descarrega o ficheiro .json do projeto para o disco"
                >
                  <Download className="w-4 h-4 text-purple-400" />
                  <span>Descarregar .JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportDxf}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-blue-950/70 hover:bg-blue-900 border border-blue-500/50 text-blue-300 hover:text-white font-bold rounded-lg transition"
                  title="Descarrega o desenho técnico em formato CAD DXF (AutoCAD, SolidWorks, 1:1 mm)"
                >
                  <FileCode className="w-4 h-4 text-blue-400" />
                  <span>Exportar .DXF (CAD)</span>
                </button>
              </div>

              {/* Auto-Backup Status Indicator */}
              {autoBackup && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      {autoBackup.isEnabled && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${autoBackup.isEnabled ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                    </span>
                    <div>
                      <span className="font-semibold text-white">
                        Backup Automático por Inatividade ({autoBackup.idleMinutes} min):
                      </span>{' '}
                      <span className={autoBackup.isEnabled ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                        {autoBackup.isEnabled ? 'Ativo e a monitorizar' : 'Desativado'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    {autoBackup.isEnabled && (
                      <span>Próximo disparo se ocioso: {Math.floor(autoBackup.secondsUntilIdle / 60)}m {autoBackup.secondsUntilIdle % 60}s</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('export_import')}
                      className="text-blue-400 hover:text-blue-300 underline font-sans ml-1"
                    >
                      Configurar
                    </button>
                  </div>
                </div>
              )}

              {/* Start Empty Project prompt */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Deseja iniciar um projeto novo do zero?</span>
                    <p className="text-[11px] text-slate-400">Comece com um quadro limpo, sem componentes pré-instalados.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenNewProject) onOpenNewProject();
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs whitespace-nowrap shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Criar Projeto Vazio</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: SAVED PROJECTS LIBRARY
             ========================================================= */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 max-w-sm">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Pesquisar projetos gravados..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenNewProject) onOpenNewProject();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition"
                    title="Iniciar um novo projeto em branco"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Criar Projeto Vazio</span>
                  </button>
                  <span className="text-xs text-slate-400 font-mono">
                    {filteredProjects.length} de {savedList.length}
                  </span>
                </div>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-950/60 border border-dashed border-slate-800 rounded-lg">
                  <HardDrive className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-300">Nenhum projeto encontrado</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    {searchFilter ? 'Nenhum resultado corresponde à sua pesquisa.' : 'Ainda não gravou nenhum projeto nesta biblioteca.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('save')}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                  >
                    Gravar o Projeto Atual
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredProjects.map((entry) => {
                    const isCurrent = entry.code.toLowerCase() === project.config.projectCode?.toLowerCase();

                    return (
                      <div
                        key={entry.id}
                        className={`p-4 bg-slate-950 border rounded-lg transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isCurrent 
                            ? 'border-emerald-500/50 bg-emerald-950/10' 
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400">
                              {entry.code}
                            </span>
                            <h3 className="text-sm font-bold text-white truncate">
                              {entry.name}
                            </h3>
                            {isCurrent && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                EM USO ATUALMENTE
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] font-mono text-slate-400">
                            <span>{entry.dimensions.width}x{entry.dimensions.height}x{entry.dimensions.depth}mm</span>
                            <span>·</span>
                            <span>{entry.railCount} calhas</span>
                            <span>·</span>
                            <span>{entry.componentCount} componentes</span>
                            <span>·</span>
                            <span className="text-amber-400">{entry.glandCount || 0} bucins</span>
                            <span>·</span>
                            <span className="text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatSavedTime(entry.updatedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadFromLibrary(entry)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition flex items-center gap-1"
                            title="Carregar este projeto para edição"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Abrir</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => exportProjectAsJson(entry.state)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 transition"
                            title="Descarregar ficheiro .json"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicate(entry.id)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 transition"
                            title="Duplicar projeto"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id, entry.name)}
                            className="p-1.5 bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded border border-slate-800 hover:border-red-900 transition"
                            title="Eliminar projeto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 3: EXPORT & IMPORT FILE (.JSON)
             ========================================================= */}
          {activeTab === 'export_import' && (
            <div className="space-y-6">
              {/* Feature: Exportar Backup Automático por Inatividade (5 min) */}
              <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-5 space-y-4 shadow-lg shadow-emerald-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">Exportação Automática de Backup (JSON)</h3>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                          autoBackup?.isEnabled 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${autoBackup?.isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          {autoBackup?.isEnabled ? `Ativo (${autoBackup?.idleMinutes || 5} min)` : 'Desativado'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Salva e transfere automaticamente o ficheiro JSON para a pasta de downloads após 5 minutos de inatividade.
                      </p>
                    </div>
                  </div>

                  {autoBackup && (
                    <button
                      type="button"
                      onClick={() => {
                        autoBackup.setIsEnabled(!autoBackup.isEnabled);
                        if (onShowNotification) {
                          onShowNotification(
                            !autoBackup.isEnabled
                              ? `Backup automático por inatividade ATIVADO (${autoBackup.idleMinutes} min)`
                              : 'Backup automático por inatividade desativado'
                          );
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center ${
                        autoBackup.isEnabled
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <span>{autoBackup.isEnabled ? 'Ligado' : 'Desligado'}</span>
                    </button>
                  )}
                </div>

                {/* Explanation text */}
                <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 border border-slate-800/80 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2 text-slate-300">
                    <Timer className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p>
                      <strong>Como funciona:</strong> A aplicação monitoriza continuamente os eventos do rato, teclado e toques no ecrã. Caso se ausente ou não interaja durante <span className="text-emerald-400 font-bold">{autoBackup?.idleMinutes || 5} minutos consecutivos</span>, é gerado e descarregado automaticamente um ficheiro <code className="text-sky-300 font-mono">backup_ElectroCad_...json</code> diretamente na pasta de transferências padrão do seu navegador. Isto evita qualquer perda de trabalho em caso de quebra de energia, fecho acidental ou falha de sistema.
                    </p>
                  </div>
                </div>

                {/* Status & Options grid */}
                {autoBackup && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Interval selection */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-slate-300 mb-2">Tempo de Inatividade para Disparo:</span>
                      <div className="flex items-center gap-1.5">
                        {[
                          { mins: 2, label: '2 min (Rápido)' },
                          { mins: 5, label: '5 min (Padrão)' },
                          { mins: 10, label: '10 min' },
                          { mins: 15, label: '15 min' },
                        ].map((opt) => (
                          <button
                            key={opt.mins}
                            type="button"
                            onClick={() => {
                              autoBackup.setIdleMinutes(opt.mins);
                              if (onShowNotification) onShowNotification(`Intervalo de inatividade alterado para ${opt.mins} minutos`);
                            }}
                            className={`flex-1 py-1 px-1 text-center text-[11px] font-bold rounded transition ${
                              autoBackup.idleMinutes === opt.mins
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live status */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col justify-between text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-300">Estado em Tempo Real:</span>
                        <span className="font-mono text-emerald-400 font-bold text-[11px]">
                          {autoBackup.isEnabled
                            ? `${Math.floor(autoBackup.secondsUntilIdle / 60)}m ${autoBackup.secondsUntilIdle % 60}s para disparo`
                            : 'Pausado'}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-400 truncate">
                        {autoBackup.lastBackupFileName ? (
                          <span title={autoBackup.lastBackupFileName}>
                            Último: <code className="text-slate-300 font-mono">{autoBackup.lastBackupFileName}</code>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Nenhum backup descarregado nesta sessão ainda</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Instant trigger button */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (autoBackup) {
                        const filename = autoBackup.triggerManualBackup();
                        if (onShowNotification) {
                          onShowNotification(`💾 Backup exportado para a pasta de transferências: ${filename}`);
                        }
                      } else {
                        const filename = exportProjectBackupJson(project, 'manual');
                        if (onShowNotification) {
                          onShowNotification(`💾 Backup exportado: ${filename}`);
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md shadow-emerald-950 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Disparar / Exportar Backup Agora (.json)</span>
                  </button>

                  <span className="text-[11px] text-slate-400">
                    O ficheiro é gravado imediatamente sem sair desta página.
                  </span>
                </div>
              </div>

              {/* Export section */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Descarregar Ficheiro de Projeto (.json)</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Guarde uma cópia exata do seu projeto como ficheiro no seu disco local. Poderá reabri-lo a qualquer momento, enviá-lo por email a colegas ou fazer backup.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descarregar {project.config.projectCode || 'PROJETO'}.json</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copiar Código JSON</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CAD DXF Export section */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Exportar Desenho CAD Profissional (.dxf)</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gere um desenho técnico vetorial rigoroso em escala 1:1 (milímetros) compatível com <strong className="text-white">AutoCAD, SolidWorks, FreeCAD, LibreCAD, QCAD e DraftSight</strong>. Inclui camadas técnicas normalizadas, invólucro exterior, placa de montagem zincada, calhas de cablagem ranhuradas, calhas DIN 35mm, blocos de componentes com tags e mapa de furação dos bucins.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleExportDxf}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descarregar Desenho DXF (1:1 mm)</span>
                  </button>
                </div>
              </div>

              {/* QElectroTech (.qet) Export section */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Exportar Projeto QElectroTech (.qet)</h3>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                    CAD Elétrico Open-Source
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Exporta diretamente um projeto completo compatível com o software <strong className="text-white">QElectroTech (v0.8x, v0.9x, v1.0)</strong> no Windows, Linux e macOS. Cria automaticamente <strong>Fólio 1 (Esquema Unifilar com condutores e aparelhos)</strong> e <strong>Fólio 2 (Disposição física 2D do armário com calhas DIN e bucins)</strong>.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleExportQet}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descarregar {project.config.projectCode || 'PROJETO'}.qet</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyQet}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    {copiedQet ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copiar Código XML QET</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* draw.io / diagrams.net (.drawio) Export section */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Exportar Diagrama draw.io / diagrams.net (.drawio)</h3>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                    2 Abas Editáveis
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Documento XML estruturado pronto a abrir no <strong className="text-white">draw.io desktop ou app.diagrams.net</strong>. Inclui a aba de Layout Físico 2D em blocos vetorizados e a aba de Esquema Elétrico e Ligações com fiação funcional.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleExportDrawio}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descarregar {project.config.projectCode || 'PROJETO'}.drawio</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyDrawio}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    {copiedDrawio ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copiar XML Draw.io</span>
                      </>
                    )}
                  </button>

                  <a
                    href="https://app.diagrams.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-blue-400 text-xs font-semibold transition"
                  >
                    <span>Abrir app.diagrams.net</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Import section */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Importar / Carregar Ficheiro do Computador</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Carregue um ficheiro <code className="text-sky-300">.json</code> gravado anteriormente pelo ElectroCad DIN.
                </p>

                {importError && (
                  <div className="flex items-center gap-2 p-3 rounded bg-red-950/80 border border-red-800 text-red-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {importSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{importSuccess}</span>
                  </div>
                )}

                <div className="pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.elec,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                    id="project-file-input"
                  />
                  <label
                    htmlFor="project-file-input"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-lg cursor-pointer bg-slate-900/60 hover:bg-slate-900 transition group"
                  >
                    <Upload className="w-8 h-8 text-slate-500 group-hover:text-blue-400 mb-2 transition" />
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                      Clique para escolher ou arraste o ficheiro JSON
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Suporta ficheiros .json gerados pelo ElectroCad
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-950 border-t border-slate-800 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gravação instantânea e permanente no armazenamento local</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
