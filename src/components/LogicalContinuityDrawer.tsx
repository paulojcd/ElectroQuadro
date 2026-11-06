import React, { useState } from 'react';
import { LogicalContinuityReport, LogicalContinuityIssue } from '../types/electrical';
import { 
  X, ShieldAlert, CheckCircle2, AlertTriangle, Info, Zap, 
  Search, Wrench, ChevronRight, Sparkles, Filter, ExternalLink, Check 
} from 'lucide-react';

interface LogicalContinuityDrawerProps {
  report: LogicalContinuityReport;
  isOpen: boolean;
  onClose: () => void;
  selectedIssue: LogicalContinuityIssue | null;
  onSelectIssue: (issue: LogicalContinuityIssue | null) => void;
  onAutoResolve?: (issue: LogicalContinuityIssue) => void;
  onFocusComponent?: (tag: string) => void;
}

export const LogicalContinuityDrawer: React.FC<LogicalContinuityDrawerProps> = ({
  report,
  isOpen,
  onClose,
  selectedIssue,
  onSelectIssue,
  onAutoResolve,
  onFocusComponent,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'info' | 'components'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const filteredIssues = report.issues.filter((issue) => {
    if (filterSeverity !== 'all' && filterSeverity !== 'components' && issue.severity !== filterSeverity) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        issue.componentTag.toLowerCase().includes(q) ||
        issue.componentName.toLowerCase().includes(q) ||
        issue.terminalLabel.toLowerCase().includes(q) ||
        issue.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleResolveClick = (issue: LogicalContinuityIssue) => {
    setResolvedIds((prev) => new Set(prev).add(issue.id));
    if (onAutoResolve) {
      onAutoResolve(issue);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 text-xs animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Verificador de Continuidade Lógica</h3>
            <p className="text-[10px] text-slate-400">Auditoria de nós, pinos de E/S e retorno elétrico (IEC 60204-1)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metric KPI Strip */}
      <div className="grid grid-cols-4 gap-2 p-3 bg-slate-950 border-b border-slate-850 shrink-0 text-center font-mono">
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <span className="text-[9px] text-slate-400 block uppercase">Índice</span>
          <span className={`text-sm font-bold ${
            report.continuityScorePercent >= 90 ? 'text-emerald-400' : report.continuityScorePercent >= 70 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {report.continuityScorePercent}%
          </span>
        </div>
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <span className="text-[9px] text-red-400 block uppercase">Críticos</span>
          <span className="text-sm font-bold text-red-400">{report.criticalCount}</span>
        </div>
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <span className="text-[9px] text-amber-400 block uppercase">Avisos</span>
          <span className="text-sm font-bold text-amber-400">{report.warningCount}</span>
        </div>
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <span className="text-[9px] text-slate-400 block uppercase">Pinos</span>
          <span className="text-sm font-bold text-sky-400">{report.connectedPinsCount}/{report.totalPinsAudited}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 border-b border-slate-850 space-y-2 shrink-0 bg-slate-900/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por tag (ex: G1, Q1, A1, K1) ou pino..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-hidden focus:border-sky-500"
          />
        </div>

        {/* Severity Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterSeverity('all')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition whitespace-nowrap ${
              filterSeverity === 'all' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Todos ({report.issues.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('critical')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition whitespace-nowrap ${
              filterSeverity === 'critical' ? 'bg-red-600 text-white font-bold' : 'bg-slate-900 text-red-400 hover:text-white'
            }`}
          >
            Críticos ({report.criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('warning')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition whitespace-nowrap ${
              filterSeverity === 'warning' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-900 text-amber-400 hover:text-white'
            }`}
          >
            Avisos ({report.warningCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('components')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition whitespace-nowrap ${
              filterSeverity === 'components' ? 'bg-purple-600 text-white font-bold' : 'bg-slate-900 text-purple-400 hover:text-white'
            }`}
          >
            Por Componente
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filterSeverity === 'components' ? (
          // Component-by-Component Overview
          <div className="space-y-2">
            {report.componentStats.map((stat) => (
              <div
                key={stat.tag}
                onClick={() => onFocusComponent && onFocusComponent(stat.tag)}
                className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl transition cursor-pointer"
              >
                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-2 h-2 rounded-full" style={{
                      backgroundColor: stat.status === 'complete' ? '#22c55e' : stat.status === 'partial' ? '#f59e0b' : '#ef4444'
                    }} />
                    <span>{stat.tag}</span>
                    <span className="text-slate-400 font-sans font-normal text-[11px] truncate max-w-[140px]">
                      {stat.name}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    stat.status === 'complete'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : stat.status === 'partial'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}>
                    {stat.connectedTerminals}/{stat.totalTerminals} Bornes
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : filteredIssues.length > 0 ? (
          // Issues List
          filteredIssues.map((issue) => {
            const isSelected = selectedIssue?.id === issue.id;
            const isResolved = resolvedIds.has(issue.id);

            return (
              <div
                key={issue.id}
                onClick={() => {
                  onSelectIssue(issue);
                  if (onFocusComponent) onFocusComponent(issue.componentTag);
                }}
                className={`p-3 rounded-xl border transition cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-slate-900 border-sky-500 shadow-md ring-1 ring-sky-500'
                    : issue.severity === 'critical'
                    ? 'bg-slate-900/90 border-red-900/60 hover:border-red-600/60'
                    : 'bg-slate-900/90 border-amber-900/60 hover:border-amber-600/60'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {issue.severity === 'critical' ? (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="font-mono font-bold text-white text-xs">{issue.componentTag}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {issue.terminalLabel}
                    </span>
                  </div>

                  <span className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded ${
                    issue.severity === 'critical' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {issue.severity === 'critical' ? 'Crítico' : 'Aviso'}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="font-bold text-white text-xs leading-snug">{issue.title}</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                    {issue.description}
                  </p>
                </div>

                {/* Normative Reference */}
                <div className="p-1.5 bg-slate-950/70 rounded border border-slate-800 text-[10px] text-slate-400 font-mono">
                  <span className="text-sky-400 font-bold">Norma:</span> {issue.normativeRef}
                </div>

                {/* Remedy & Auto-resolve action */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-[10px] text-emerald-400 font-medium truncate max-w-[200px]" title={issue.suggestedRemedy}>
                    ✓ {issue.suggestedRemedy}
                  </span>

                  {onAutoResolve && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolveClick(issue);
                      }}
                      disabled={isResolved}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 shrink-0 ${
                        isResolved
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 cursor-default'
                          : 'bg-sky-600 hover:bg-sky-500 text-white active:scale-95 shadow-xs'
                      }`}
                    >
                      {isResolved ? <Check className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                      <span>{isResolved ? 'Resolvido' : 'Corrigir'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 space-y-2 text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-white font-bold text-sm">Continuidade Lógica Perfeita</h4>
            <p className="text-[11px] max-w-xs mx-auto">
              Todos os nós elétricos essenciais (fases, neutros, massas 0V e terras PE) encontram-se ligados e fechados.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-slate-400 font-mono">
          Normas EN 60204-1 · EN 61439-1
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-xs transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
