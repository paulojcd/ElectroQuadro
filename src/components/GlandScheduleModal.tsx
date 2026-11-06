import React, { useState } from 'react';
import { CableGland, GlandMetric } from '../types/electrical';
import { GLAND_SPECS, CIRCUIT_TYPE_INFO, autoDistributeGlands } from '../utils/glandUtils';
import { 
  X, Download, Copy, Check, Plus, Trash2, ArrowUpCircle, ArrowDownCircle,
  Sliders, Box, AlertCircle, Wrench, ShieldCheck, Printer
} from 'lucide-react';

interface GlandScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  glands: CableGland[];
  cabWidth: number;
  cabHeight: number;
  onUpdateGlands: (updated: CableGland[]) => void;
}

export const GlandScheduleModal: React.FC<GlandScheduleModalProps> = ({
  isOpen,
  onClose,
  glands,
  cabWidth,
  cabHeight,
  onUpdateGlands,
}) => {
  const [filterLocation, setFilterLocation] = useState<'all' | 'top' | 'bottom'>('all');
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const topGlands = glands.filter((g) => g.location === 'top').sort((a, b) => a.xOffsetMm - b.xOffsetMm);
  const bottomGlands = glands.filter((g) => g.location === 'bottom').sort((a, b) => a.xOffsetMm - b.xOffsetMm);

  const displayedGlands = glands
    .filter((g) => filterLocation === 'all' || g.location === filterLocation)
    .sort((a, b) => (a.location === b.location ? a.xOffsetMm - b.xOffsetMm : a.location === 'top' ? -1 : 1));

  // Export CSV Schedule
  const handleExportCsv = () => {
    const headers = [
      'Etiqueta (Tag)',
      'Posição (Entrada/Saída)',
      'Métrica',
      'Diâmetro Furo (mm)',
      'Gama Cabo (mm)',
      'Coordenada X (mm)',
      'Binário Aperto (Nm)',
      'Descrição do Circuito / Destino',
      'Material / IP',
      'Preço Est. (€)',
    ];

    const rows = displayedGlands.map((g) => {
      const spec = GLAND_SPECS[g.size];
      return [
        `"${g.tag}"`,
        `"${g.location === 'top' ? 'Entrada (Topo)' : 'Saída (Base)'}"`,
        `"${g.size}"`,
        spec.holeDiameterMm,
        `"${g.cableDiameterRangeMm}"`,
        g.xOffsetMm,
        spec.recommendedTorqueNm,
        `"${g.label}"`,
        `"${g.material || 'Poliamida'} / IP68"`,
        (g.estimatedPriceEur || spec.estimatedPriceEur).toFixed(2),
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mapa_furacao_bucins_${cabWidth}x${cabHeight}mm.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy Summary
  const handleCopySummary = () => {
    const summary = displayedGlands
      .map(
        (g) =>
          `${g.tag} [${g.location === 'top' ? 'ENTRADA' : 'SAÍDA'}]: ${g.size} (Furo Ø${GLAND_SPECS[g.size].holeDiameterMm}mm, X=${g.xOffsetMm}mm) -> ${g.label} [Cabo ${g.cableDiameterRangeMm}]`
      )
      .join('\n');

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick Add Gland
  const handleAddNewGland = (location: 'top' | 'bottom') => {
    const nextNum = glands.length + 1;
    const size: GlandMetric = location === 'top' ? 'M20' : 'M16';
    const spec = GLAND_SPECS[size];
    const newGland: CableGland = {
      id: `gland-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tag: location === 'top' ? `BG-IN-0${nextNum}` : `BG-OUT-0${nextNum}`,
      location,
      size,
      xOffsetMm: Math.min(cabWidth - 60, 60 + (glands.filter((g) => g.location === location).length * 60)),
      label: location === 'top' ? 'Entrada Circuito Auxiliar' : 'Saída Circuito Campo',
      cableDiameterRangeMm: spec.cableRange,
      holeDiameterMm: spec.holeDiameterMm,
      circuitType: location === 'top' ? 'control' : 'sensors',
      material: 'polyamide',
      estimatedPriceEur: spec.estimatedPriceEur,
    };

    onUpdateGlands([...glands, newGland]);
  };

  // Delete Gland
  const handleDeleteGland = (id: string) => {
    onUpdateGlands(glands.filter((g) => g.id !== id));
  };

  // Change Gland Metric Size
  const handleChangeMetric = (id: string, newMetric: GlandMetric) => {
    const spec = GLAND_SPECS[newMetric];
    const updated = glands.map((g) => {
      if (g.id !== id) return g;
      return {
        ...g,
        size: newMetric,
        holeDiameterMm: spec.holeDiameterMm,
        cableDiameterRangeMm: spec.cableRange,
        estimatedPriceEur: spec.estimatedPriceEur,
      };
    });
    onUpdateGlands(updated);
  };

  // Auto distribute
  const handleAutoAlign = (location: 'top' | 'bottom') => {
    const updated = autoDistributeGlands(glands, location, cabWidth);
    onUpdateGlands(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-sky-400 border border-blue-500/30 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Mapa Técnico de Furação & Marcação de Bucins
                </h2>
                <span className="text-[11px] font-mono font-bold bg-slate-800 text-sky-300 px-2 py-0.5 rounded border border-slate-700">
                  {glands.length} Bucins Definidos
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Especificação de bucins métricos (M12-M50), diâmetros de serra-copo/punçoadeira, coordenadas X e circuitos de passagem.
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

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 bg-slate-900/90 border-b border-slate-800 gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Filtrar Posição:</span>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilterLocation('all')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  filterLocation === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({glands.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterLocation('top')}
                className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                  filterLocation === 'top' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" /> Entrada - Topo ({topGlands.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterLocation('bottom')}
                className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                  filterLocation === 'bottom' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" /> Saída - Base ({bottomGlands.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddNewGland('top')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> + Bucim Entrada (Topo)
            </button>
            <button
              type="button"
              onClick={() => handleAddNewGland('bottom')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> + Bucim Saída (Base)
            </button>
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Mapa (CSV)</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Visual 2D Strip Preview of Top & Bottom Gland Flange Plates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Gland Plate Schematic */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ArrowDownCircle className="w-4 h-4 text-amber-400" /> Placa Passa-Cabos Superior (Entrada)
                </span>
                <button
                  type="button"
                  onClick={() => handleAutoAlign('top')}
                  className="text-[11px] font-mono text-sky-400 hover:underline"
                >
                  ⚡ Auto-alinhar
                </button>
              </div>

              {/* Top SVG Strip */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-x-auto">
                <svg viewBox={`0 0 ${cabWidth} 70`} className="w-full h-18 select-none">
                  {/* Flange plate */}
                  <rect x="10" y="8" width={cabWidth - 20} height="52" fill="#1e293b" stroke="#475569" strokeWidth="1.5" rx="4" />
                  <line x1="20" y1="34" x2={cabWidth - 20} y2="34" stroke="#334155" strokeDasharray="3 3" />
                  
                  {topGlands.map((gland) => {
                    const spec = GLAND_SPECS[gland.size];
                    const r = spec.holeDiameterMm / 2;
                    return (
                      <g key={gland.id} transform={`translate(${gland.xOffsetMm}, 34)`}>
                        {/* Outer Nut */}
                        <circle cx="0" cy="0" r={r + 3} fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
                        {/* Hole */}
                        <circle cx="0" cy="0" r={r} fill="#1e293b" stroke="#cbd5e1" strokeWidth="1" />
                        {/* Cable Core */}
                        <circle cx="0" cy="0" r={Math.max(2, r - 3)} fill="#f59e0b" opacity="0.8" />
                        {/* Tag Label */}
                        <text x="0" y={-r - 6} fill="#fde047" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                          {gland.tag}
                        </text>
                        {/* Metric Label */}
                        <text x="0" y={r + 11} fill="#94a3b8" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">
                          {gland.size} (Ø{spec.holeDiameterMm})
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                <span>Largura Flange: {cabWidth} mm</span>
                <span>{topGlands.length} furações de entrada</span>
              </div>
            </div>

            {/* Bottom Gland Plate Schematic */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <ArrowUpCircle className="w-4 h-4 text-emerald-400" /> Placa Passa-Cabos Inferior (Saída)
                </span>
                <button
                  type="button"
                  onClick={() => handleAutoAlign('bottom')}
                  className="text-[11px] font-mono text-sky-400 hover:underline"
                >
                  ⚡ Auto-alinhar
                </button>
              </div>

              {/* Bottom SVG Strip */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-x-auto">
                <svg viewBox={`0 0 ${cabWidth} 70`} className="w-full h-18 select-none">
                  {/* Flange plate */}
                  <rect x="10" y="8" width={cabWidth - 20} height="52" fill="#1e293b" stroke="#475569" strokeWidth="1.5" rx="4" />
                  <line x1="20" y1="34" x2={cabWidth - 20} y2="34" stroke="#334155" strokeDasharray="3 3" />
                  
                  {bottomGlands.map((gland) => {
                    const spec = GLAND_SPECS[gland.size];
                    const r = spec.holeDiameterMm / 2;
                    return (
                      <g key={gland.id} transform={`translate(${gland.xOffsetMm}, 34)`}>
                        {/* Outer Nut */}
                        <circle cx="0" cy="0" r={r + 3} fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                        {/* Hole */}
                        <circle cx="0" cy="0" r={r} fill="#1e293b" stroke="#cbd5e1" strokeWidth="1" />
                        {/* Cable Core */}
                        <circle cx="0" cy="0" r={Math.max(2, r - 3)} fill="#10b981" opacity="0.8" />
                        {/* Tag Label */}
                        <text x="0" y={-r - 6} fill="#6ee7b7" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono" textAnchor="middle">
                          {gland.tag}
                        </text>
                        {/* Metric Label */}
                        <text x="0" y={r + 11} fill="#94a3b8" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">
                          {gland.size} (Ø{spec.holeDiameterMm})
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                <span>Largura Flange: {cabWidth} mm</span>
                <span>{bottomGlands.length} furações de saída</span>
              </div>
            </div>
          </div>

          {/* Technical Drilling Schedule Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Tabela de Furação e Lista de Bucins (IEC 62444 / EN 50262)
              </span>
              <span className="text-[11px] text-slate-400">
                Prensa-cabos estanques com contra-porca incluída
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="py-2.5 px-3">Tag</th>
                    <th className="py-2.5 px-3">Posição</th>
                    <th className="py-2.5 px-3">Métrica</th>
                    <th className="py-2.5 px-3">Broca Furo (Ø mm)</th>
                    <th className="py-2.5 px-3">Cabo Permitido</th>
                    <th className="py-2.5 px-3">Cota X</th>
                    <th className="py-2.5 px-3">Circuito / Destino</th>
                    <th className="py-2.5 px-3 text-right">Aperto</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {displayedGlands.map((gland) => {
                    const spec = GLAND_SPECS[gland.size];
                    const isTop = gland.location === 'top';

                    return (
                      <tr key={gland.id} className="hover:bg-slate-800/50 transition">
                        {/* Tag */}
                        <td className="py-2 px-3 font-mono font-bold">
                          <input
                            type="text"
                            value={gland.tag}
                            onChange={(e) => {
                              const updated = glands.map((g) => (g.id === gland.id ? { ...g, tag: e.target.value } : g));
                              onUpdateGlands(updated);
                            }}
                            className={`bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold w-24 ${
                              isTop ? 'text-amber-300' : 'text-emerald-300'
                            }`}
                          />
                        </td>

                        {/* Location */}
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => {
                              const newLoc: 'top' | 'bottom' = isTop ? 'bottom' : 'top';
                              const updated = glands.map((g) =>
                                g.id === gland.id ? { ...g, location: newLoc } : g
                              );
                              onUpdateGlands(updated);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                              isTop
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {isTop ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                            <span>{isTop ? 'Entrada (Topo)' : 'Saída (Base)'}</span>
                          </button>
                        </td>

                        {/* Metric Size Dropdown */}
                        <td className="py-2 px-3">
                          <select
                            value={gland.size}
                            onChange={(e) => handleChangeMetric(gland.id, e.target.value as GlandMetric)}
                            className="bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs font-mono font-bold cursor-pointer focus:outline-none focus:border-blue-500"
                          >
                            {(['M12', 'M16', 'M20', 'M25', 'M32', 'M40', 'M50'] as GlandMetric[]).map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Drill Hole Diameter */}
                        <td className="py-2 px-3 font-mono font-bold text-sky-400">
                          Ø {spec.holeDiameterMm} mm
                        </td>

                        {/* Cable Range */}
                        <td className="py-2 px-3 font-mono text-slate-300 text-[11px]">
                          {spec.cableRange}
                        </td>

                        {/* X Offset Coordinate */}
                        <td className="py-2 px-3 font-mono">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={30}
                              max={cabWidth - 30}
                              step={5}
                              value={gland.xOffsetMm}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const updated = glands.map((g) => (g.id === gland.id ? { ...g, xOffsetMm: val } : g));
                                onUpdateGlands(updated);
                              }}
                              className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-center font-mono text-slate-200"
                            />
                            <span className="text-[10px] text-slate-400">mm</span>
                          </div>
                        </td>

                        {/* Label / Circuit description */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={gland.label}
                            onChange={(e) => {
                              const updated = glands.map((g) => (g.id === gland.id ? { ...g, label: e.target.value } : g));
                              onUpdateGlands(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </td>

                        {/* Torque */}
                        <td className="py-2 px-3 text-right font-mono text-slate-400 text-[11px]">
                          {spec.recommendedTorqueNm} Nm
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteGland(gland.id)}
                            className="p-1 text-slate-400 hover:text-red-400 rounded transition"
                            title="Remover bucim"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Technical Reference Guide */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2 text-slate-300">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Recomendações Técnicas de Instalação (Bucins & Furação):
            </span>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
              <li>
                <strong>Distância mínima entre centros de furação:</strong> Recomenda-se manter pelo menos 1.5x o diâmetro exterior da contra-porca entre centros para permitir o aperto com chave de bocas ou chave para bucins sem colisões.
              </li>
              <li>
                <strong>Estanquidade IP65 / IP68:</strong> Utilize sempre anilha de vedação plana (O-ring de neoprene ou borracha EPDM) entre a cabeça do bucim e a face exterior da placa metálica.
              </li>
              <li>
                <strong>Entrada vs. Saída:</strong> Por regra de boa prática industrial, os cabos de alimentação de rede geral entram preferencialmente pelo topo (lado do corte geral e proteções primárias) e as saídas para motores e atuadores de campo saem pela base do armário.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-t border-slate-800 shrink-0">
          <span className="text-xs text-slate-400 font-mono">
            {glands.length} bucins · Largura do armário: {cabWidth} mm
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            Concluir & Aplicar Marcação
          </button>
        </div>
      </div>
    </div>
  );
};
