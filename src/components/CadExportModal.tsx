import React, { useState } from 'react';
import { ProjectState } from '../types/electrical';
import { downloadDrawioFile, generateDrawioXml } from '../utils/drawioExporter';
import { downloadQetFile, generateQetXml } from '../utils/qelectrotechExporter';
import { downloadCabinetDxf } from '../utils/dxfExporter';
import { exportProjectAsJson } from '../utils/projectStorage';
import { 
  X, Download, FileCode, Check, ExternalLink, Zap, 
  Layers, HardDrive, Sparkles, CheckCircle, FileText, Copy, Info 
} from 'lucide-react';

interface CadExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onExportSvg?: () => void;
  onShowNotification?: (msg: string) => void;
}

export const CadExportModal: React.FC<CadExportModalProps> = ({
  isOpen,
  onClose,
  project,
  onExportSvg,
  onShowNotification,
}) => {
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const notify = (msg: string, fmt: string) => {
    setDownloadedFormat(fmt);
    if (onShowNotification) onShowNotification(msg);
    setTimeout(() => setDownloadedFormat(null), 3000);
  };

  const handleExportDrawio = () => {
    downloadDrawioFile(project);
    notify('Ficheiro draw.io (.drawio) descarregado com sucesso!', 'drawio');
  };

  const handleCopyDrawio = async () => {
    try {
      const xml = generateDrawioXml(project);
      await navigator.clipboard.writeText(xml);
      setCopiedFormat('drawio');
      if (onShowNotification) onShowNotification('Código XML draw.io copiado para a área de transferência!');
      setTimeout(() => setCopiedFormat(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportQet = () => {
    downloadQetFile(project);
    notify('Projeto QElectroTech (.qet) descarregado com sucesso!', 'qet');
  };

  const handleCopyQet = async () => {
    try {
      const xml = generateQetXml(project);
      await navigator.clipboard.writeText(xml);
      setCopiedFormat('qet');
      if (onShowNotification) onShowNotification('Código XML QElectroTech copiado!');
      setTimeout(() => setCopiedFormat(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportDxf = () => {
    downloadCabinetDxf(project);
    notify('Desenho técnico DXF (AutoCAD / CAD 1:1 mm) descarregado!', 'dxf');
  };

  const handleExportJson = () => {
    exportProjectAsJson(project);
    notify('Ficheiro de projeto ElectroCad (.json) descarregado!', 'json');
  };

  const totalComponents = project.rails.reduce((acc, r) => acc + (r.items ? r.items.length : 0), 0);
  const totalGlands = project.glands ? project.glands.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Exportação CAD Elétrico & Diagramas</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                  QELETTROTECH · DRAW.IO · AUTOCAD DXF
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Exporte o quadro e os esquemas elétricos diretamente para software de engenharia aberto ou profissional.
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

        {/* Project Summary Strip */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2 shrink-0">
          <span>{project.config.projectCode}: <strong className="text-slate-200">{project.config.name}</strong></span>
          <span>{project.config.widthMm}x{project.config.heightMm}mm · {project.rails.length} calhas · {totalComponents} componentes · {totalGlands} bucins</span>
        </div>

        {/* Export Options Grid */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* 1. QElectroTech (.qet) */}
          <div className="p-4 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-xl transition group flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition">
                    QElectroTech Project (.qet)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold">
                    CAD Elétrico Open-Source
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ficheiro de projeto nativo para o <strong>QElectroTech</strong> (compatível com v0.8x, v0.9x e v1.0). Inclui coleção embutida de símbolos e definições completas, garantindo que as páginas e diagramas abrem 100% preenchidos:
                </p>
                <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-0.5 pl-1">
                  <li><strong>Fólio 1:</strong> Esquema Unifilar com condutores coloridos por fase/neutro/terra/24V, secção mm² e terminais.</li>
                  <li><strong>Fólio 2:</strong> Disposição física 2D do quadro com calhas DIN 35mm, aparelhos etiquetados e furação de bucins.</li>
                </ul>
                <div className="text-[11px] text-emerald-400/90 font-mono pt-1">
                  ✓ Símbolos IEC embutidos no ficheiro (.qet) · Não necessita de bibliotecas externas
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={handleCopyQet}
                className="w-full sm:w-auto px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                title="Copiar código XML do projeto QElectroTech"
              >
                {copiedFormat === 'qet' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar XML</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportQet}
                className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center justify-center gap-2 active:scale-98"
              >
                {downloadedFormat === 'qet' ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Descarregado! ✓</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Descarregar .QET</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. draw.io / diagrams.net (.drawio) */}
          <div className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-xl transition group flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition">
                    draw.io / diagrams.net (.drawio)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold">
                    Multi-Separadores Editáveis
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Documento XML padrão com <strong>dois separadores de página interativos</strong>:
                </p>
                <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-0.5 pl-1">
                  <li><strong>Aba 1 (Disposição 2D):</strong> Invólucro, calhas ranhuradas, calhas DIN, bucins e blocos de componentes em escala.</li>
                  <li><strong>Aba 2 (Esquema Unifilar):</strong> Barramentos AC/DC, disjuntores, fontes, PLC e cablagem com setas de ligação.</li>
                </ul>
                <div className="text-[11px] text-slate-500 font-mono pt-1 flex items-center gap-2">
                  <span>Ficheiro: <code className="text-blue-300">.drawio</code></span>
                  <span>·</span>
                  <a
                    href="https://app.diagrams.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Abrir diagrams.net web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={handleCopyDrawio}
                className="w-full sm:w-auto px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                title="Copiar código XML compatível com diagrams.net"
              >
                {copiedFormat === 'drawio' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar XML</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportDrawio}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center justify-center gap-2 active:scale-98"
              >
                {downloadedFormat === 'drawio' ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Descarregado! ✓</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Descarregar .DRAWIO</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. AutoCAD / CAD Universal (.dxf) */}
          <div className="p-4 bg-slate-950 border border-slate-800 hover:border-purple-500/50 rounded-xl transition group flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                <FileCode className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition">
                    AutoCAD / CAD Universal (.dxf)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-semibold">
                    Escala Real 1:1 mm
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Desenho técnico vetorial padrão <strong>AutoCAD R12/R2000</strong> com camadas industriais separadas (Chapa, Calhas, DIN 35mm, Componentes, Bucins, Cotas Lineares e Carimbo de Engenharia). Compatível com SolidWorks, LibreCAD, FreeCAD e DraftSight.
                </p>
                <div className="text-[11px] text-slate-500 font-mono pt-0.5">
                  Ficheiro: <code className="text-purple-300">.dxf</code> · Medidas precisas em milímetros ($INSUNITS=4)
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportDxf}
              className="w-full md:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center justify-center gap-2 shrink-0 active:scale-98"
            >
              {downloadedFormat === 'dxf' ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Descarregado! ✓</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descarregar .DXF</span>
                </>
              )}
            </button>
          </div>

          {/* 4. Imagem Vetorial SVG & Projeto JSON */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* SVG */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Imagem Vetorial SVG (.svg)</span>
                <span className="text-[11px] text-slate-400">Gráfico vetorial nítido de alta resolução</span>
              </div>
              {onExportSvg && (
                <button
                  type="button"
                  onClick={onExportSvg}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition shrink-0 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Baixar SVG</span>
                </button>
              )}
            </div>

            {/* JSON */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Ficheiro ElectroCad (.json)</span>
                <span className="text-[11px] text-slate-400">Dados integrais do projeto para backup</span>
              </div>
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition shrink-0 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Baixar JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-t border-slate-800 shrink-0 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Formatos abertos e editáveis sem restrições nem bloqueios proprietários</span>
          </span>
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
