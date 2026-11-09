import React, { useState, useMemo } from 'react';
import { ProjectState, PlacedComponent } from '../types/electrical';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  Layers,
  Zap,
  Cpu,
  ShieldCheck,
  Building,
  Euro,
  Boxes,
  Activity,
  AlertTriangle,
  Info,
  Maximize2,
  Sliders,
  CheckCircle2,
  Printer,
  Sparkles,
  ArrowRight,
  Box,
} from 'lucide-react';
import { getConsolidatedBom } from '../utils/bomUtils';

interface ProjectAnalyticsDashboardProps {
  project: ProjectState;
  onNavigateToTab?: (tab: 'layout' | 'schematic' | 'bom' | 'checks') => void;
}

// Visual Palette for charts
const CATEGORY_COLORS: Record<string, string> = {
  enclosure: '#38bdf8',   // Sky Blue (Armário / Invólucro)
  disjuntores: '#3b82f6', // Blue (Circuit Breakers / Protection)
  bornes: '#10b981',      // Emerald Green (Terminal Blocks)
  plcs: '#8b5cf6',        // Purple (PLCs & Controllers)
  fontes: '#06b6d4',      // Cyan (Power Supplies)
  reles: '#f59e0b',       // Amber (Relays & Contactors)
  outros: '#64748b',      // Slate (Accessories & Others)
};

const BRAND_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
  '#06b6d4', '#ec4899', '#f97316', '#64748b'
];

export const ProjectAnalyticsDashboard: React.FC<ProjectAnalyticsDashboardProps> = ({
  project,
  onNavigateToTab,
}) => {
  const [metricType, setMetricType] = useState<'count' | 'width' | 'cost'>('count');
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const config = project.config;
  const rails = project.rails;

  // Flatten all placed components
  const allPlacedItems: PlacedComponent[] = useMemo(() => {
    return rails.flatMap((r) => r.items || []);
  }, [rails]);

  const bomItems = useMemo(() => getConsolidatedBom(project), [project]);

  // Total statistics
  const totalComponents = allPlacedItems.length;
  const totalWidthMm = allPlacedItems.reduce((acc, it) => acc + (it.data.widthMm || 0), 0);
  const totalCostEur = bomItems.reduce((acc, it) => acc + it.totalPriceEur, 0);

  const totalUsableWidthMm = rails.reduce((acc, r) => acc + (r.usableWidthMm || config.widthMm - (config.sideDuctWidthMm || 40) * 2), 0);
  const globalOccupancyPercent = totalUsableWidthMm > 0 ? Math.round((totalWidthMm / totalUsableWidthMm) * 100) : 0;
  const reservePercent = Math.max(0, 100 - globalOccupancyPercent);

  // =========================================================================
  // 1. DATA PREPARATION: Component Types (Disjuntores, Bornes, PLCs, etc.)
  // =========================================================================
  const categoryStats = useMemo(() => {
    let disjuntoresCount = 0;
    let disjuntoresWidth = 0;
    let disjuntoresCost = 0;

    let bornesCount = 0;
    let bornesWidth = 0;
    let bornesCost = 0;

    let plcsCount = 0;
    let plcsWidth = 0;
    let plcsCost = 0;

    let fontesCount = 0;
    let fontesWidth = 0;
    let fontesCost = 0;

    let relesCount = 0;
    let relesWidth = 0;
    let relesCost = 0;

    let outrosCount = 0;
    let outrosWidth = 0;
    let outrosCost = 0;

    allPlacedItems.forEach((item) => {
      const cat = item.data.category;
      const tag = item.tag || '';
      const name = (item.data.name || '').toLowerCase();
      const w = item.data.widthMm || 0;
      const price = item.data.estimatedPriceEur || 0;

      // 1. Disjuntores & Proteções
      if (
        cat === 'protection_ac' ||
        cat === 'protection_dc' ||
        cat === 'residential_modular' ||
        tag.startsWith('Q') ||
        tag.startsWith('F') ||
        name.includes('disjuntor') ||
        name.includes('diferencial') ||
        name.includes('fusível') ||
        name.includes('motor')
      ) {
        disjuntoresCount++;
        disjuntoresWidth += w;
        disjuntoresCost += price;
      }
      // 2. Bornes Terminais
      else if (
        cat === 'terminals' ||
        tag.startsWith('X') ||
        name.includes('borne') ||
        name.includes('terminal') ||
        name.includes('viking')
      ) {
        bornesCount++;
        bornesWidth += w;
        bornesCost += price;
      }
      // 3. PLCs & Controladores
      else if (
        cat === 'plc_cpu' ||
        cat === 'plc_expansion' ||
        tag.startsWith('PLC') ||
        tag.startsWith('A') ||
        name.includes('plc') ||
        name.includes('s7-1200') ||
        name.includes('logo!') ||
        name.includes('cpu')
      ) {
        plcsCount++;
        plcsWidth += w;
        plcsCost += price;
      }
      // 4. Fontes de Alimentação
      else if (
        cat === 'power_supply' ||
        tag.startsWith('G') ||
        name.includes('fonte') ||
        name.includes('mean well') ||
        name.includes('ndr')
      ) {
        fontesCount++;
        fontesWidth += w;
        fontesCost += price;
      }
      // 5. Relés e Contactores
      else if (
        cat === 'relays' ||
        cat === 'safety_relays' ||
        cat === 'motor_control' ||
        tag.startsWith('K') ||
        name.includes('relé') ||
        name.includes('contactor')
      ) {
        relesCount++;
        relesWidth += w;
        relesCost += price;
      }
      // 6. Outros
      else {
        outrosCount++;
        outrosWidth += w;
        outrosCost += price;
      }
    });

    const encItem = bomItems.find((it) => it.category === 'enclosure');
    const encPrice = encItem ? encItem.totalPriceEur : (project.config.enclosurePriceEur || 0);
    const encBrand = project.config.enclosureBrand || project.config.enclosureModel?.brand || 'Standard';
    const encPart = project.config.enclosurePartNumber || project.config.enclosureModel?.partNumber || `QD-${project.config.widthMm}x${project.config.heightMm}`;

    const list = [
      {
        key: 'enclosure',
        name: 'Armário / Invólucro',
        shortName: 'Quadro',
        count: 1,
        width: 0,
        cost: Math.round(encPrice * 100) / 100,
        color: CATEGORY_COLORS.enclosure,
        icon: Box,
        description: `Quadro elétrico ${encBrand} (${encPart}) · ${project.config.widthMm}x${project.config.heightMm}x${project.config.depthMm}mm`,
      },
      {
        key: 'disjuntores',
        name: 'Disjuntores & Proteções',
        shortName: 'Disjuntores',
        count: disjuntoresCount,
        width: disjuntoresWidth,
        cost: Math.round(disjuntoresCost * 100) / 100,
        color: CATEGORY_COLORS.disjuntores,
        icon: Zap,
        description: 'Disjuntores AC/DC, diferenciais residuais e disjuntores motor',
      },
      {
        key: 'bornes',
        name: 'Blocos Terminais (Bornes)',
        shortName: 'Bornes',
        count: bornesCount,
        width: bornesWidth,
        cost: Math.round(bornesCost * 100) / 100,
        color: CATEGORY_COLORS.bornes,
        icon: Boxes,
        description: 'Bornes de passagem (Fase, Neutro, Terra PE e Seccionáveis)',
      },
      {
        key: 'plcs',
        name: 'Automação & PLCs',
        shortName: 'PLCs',
        count: plcsCount,
        width: plcsWidth,
        cost: Math.round(plcsCost * 100) / 100,
        color: CATEGORY_COLORS.plcs,
        icon: Cpu,
        description: 'CPUs Siemens S7-1200 / LOGO! e módulos de expansão I/O',
      },
      {
        key: 'fontes',
        name: 'Fontes 24VDC',
        shortName: 'Fontes',
        count: fontesCount,
        width: fontesWidth,
        cost: Math.round(fontesCost * 100) / 100,
        color: CATEGORY_COLORS.fontes,
        icon: Activity,
        description: 'Fontes de alimentação chaveadas para calha DIN (Mean Well)',
      },
      {
        key: 'reles',
        name: 'Relés & Manobra',
        shortName: 'Relés',
        count: relesCount,
        width: relesWidth,
        cost: Math.round(relesCost * 100) / 100,
        color: CATEGORY_COLORS.reles,
        icon: Sliders,
        description: 'Relés industriais de interface, temporizadores e contactores',
      },
      {
        key: 'outros',
        name: 'Acessórios & Outros',
        shortName: 'Outros',
        count: outrosCount,
        width: outrosWidth,
        cost: Math.round(outrosCost * 100) / 100,
        color: CATEGORY_COLORS.outros,
        icon: Info,
        description: 'Transformadores, sinalizadores e tampas terminais',
      },
    ].filter((item) => item.count > 0);

    return list;
  }, [allPlacedItems]);

  // Data formatted for Pie Chart according to metricType
  const pieChartData = useMemo(() => {
    return categoryStats.map((cat) => ({
      name: cat.name,
      shortName: cat.shortName,
      value: metricType === 'count' ? cat.count : metricType === 'width' ? cat.width : cat.cost,
      color: cat.color,
      count: cat.count,
      width: cat.width,
      cost: cat.cost,
    }));
  }, [categoryStats, metricType]);

  // =========================================================================
  // 2. DATA PREPARATION: Rail Occupancy Breakdown (Bar Chart)
  // =========================================================================
  const railOccupancyData = useMemo(() => {
    return rails.map((rail, idx) => {
      const occupiedMm = (rail.items || []).reduce((sum, it) => sum + (it.data.widthMm || 0), 0);
      const usableMm = rail.usableWidthMm || (config.widthMm - (config.sideDuctWidthMm || 40) * 2);
      const availableMm = Math.max(0, usableMm - occupiedMm);
      const percent = usableMm > 0 ? Math.round((occupiedMm / usableMm) * 100) : 0;
      const count = rail.items ? rail.items.length : 0;

      return {
        name: rail.name || `Calha ${idx + 1}`,
        shortName: `Calha ${idx + 1}`,
        railIndex: idx + 1,
        occupiedMm,
        usableMm,
        availableMm,
        percent,
        count,
        status: percent > 85 ? 'Saturada' : percent >= 70 ? 'Ideal' : 'Folga Alta',
      };
    });
  }, [rails, config]);

  // =========================================================================
  // 3. DATA PREPARATION: Circuit Breaker Amperage Ratings Distribution
  // =========================================================================
  const breakerRatingsData = useMemo(() => {
    const ratingsMap: Record<string, number> = {};

    allPlacedItems.forEach((it) => {
      const cat = it.data.category;
      const tag = it.tag || '';
      const name = (it.data.name || '').toLowerCase();

      if (
        cat === 'protection_ac' ||
        cat === 'protection_dc' ||
        cat === 'residential_modular' ||
        tag.startsWith('Q') ||
        tag.startsWith('F') ||
        name.includes('disjuntor')
      ) {
        const rating = it.data.ratedCurrentA ? `${it.data.ratedCurrentA}A` : 'Outro';
        ratingsMap[rating] = (ratingsMap[rating] || 0) + 1;
      }
    });

    const order = ['2A', '4A', '6A', '10A', '16A', '20A', '25A', '32A', '40A', '50A', '63A', 'Outro'];
    return Object.keys(ratingsMap)
      .sort((a, b) => {
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.localeCompare(b);
      })
      .map((rating) => ({
        rating,
        circuitos: ratingsMap[rating],
      }));
  }, [allPlacedItems]);

  // =========================================================================
  // 4. DATA PREPARATION: Brand Distribution
  // =========================================================================
  const brandDistributionData = useMemo(() => {
    const brandMap: Record<string, { brand: string; count: number; cost: number; width: number }> = {};

    allPlacedItems.forEach((it) => {
      const b = it.data.brand || 'Genérico';
      if (!brandMap[b]) {
        brandMap[b] = { brand: b, count: 0, cost: 0, width: 0 };
      }
      brandMap[b].count++;
      brandMap[b].width += it.data.widthMm || 0;
      brandMap[b].cost += it.data.estimatedPriceEur || 0;
    });

    return Object.values(brandMap)
      .sort((a, b) => b.count - a.count)
      .map((item, idx) => ({
        ...item,
        cost: Math.round(item.cost * 100) / 100,
        color: BRAND_COLORS[idx % BRAND_COLORS.length],
      }));
  }, [allPlacedItems]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-y-auto text-slate-100 p-4 space-y-5">
      {/* Top Banner & Metric Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Dashboard de Análise do Quadro & Métricas
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {config.projectCode || 'PROJ-001'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Distribuição quantitativa, ocupação física em calhas DIN e ponderação orçamentária dos equipamentos.
            </p>
          </div>
        </div>

        {/* Action Controls & Metric Mode Selector */}
        <div className="flex items-center gap-3 no-print">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={() => setMetricType('count')}
              className={`px-3 py-1.5 rounded-md transition ${
                metricType === 'count'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visualizar por quantidade de aparelhos"
            >
              Unidades (Qtd)
            </button>
            <button
              onClick={() => setMetricType('width')}
              className={`px-3 py-1.5 rounded-md transition ${
                metricType === 'width'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visualizar por largura ocupada na calha (mm)"
            >
              Largura (mm)
            </button>
            <button
              onClick={() => setMetricType('cost')}
              className={`px-3 py-1.5 rounded-md transition ${
                metricType === 'cost'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visualizar por valor orçamentário (€)"
            >
              Custo (€)
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
            title="Imprimir relatório analítico"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Components */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Componentes</span>
            <Boxes className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-white">
              {totalComponents}
            </span>
            <span className="text-[11px] text-slate-400 ml-1.5">aparelhos</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Disjuntores: {categoryStats.find(c => c.key === 'disjuntores')?.count || 0}</span>
            <span>Bornes: {categoryStats.find(c => c.key === 'bornes')?.count || 0}</span>
          </div>
        </div>

        {/* DIN Occupancy */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Ocupação Calhas DIN</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-white">
              {globalOccupancyPercent}%
            </span>
            <span className="text-[11px] text-slate-400 ml-1.5">
              ({totalWidthMm} / {totalUsableWidthMm} mm)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] flex items-center justify-between">
            <span className={reservePercent >= 20 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              Reserva: {reservePercent}%
            </span>
            <span className="text-slate-500 font-mono">RTIEBT &ge; 20%</span>
          </div>
        </div>

        {/* Estimated BOM Cost */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Orçamento Estimado</span>
            <Euro className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {totalCostEur.toFixed(2)} €
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>{bomItems.length} referências</span>
            <span>PVP médio: {totalComponents > 0 ? (totalCostEur / totalComponents).toFixed(1) : 0} €/un</span>
          </div>
        </div>

        {/* Enclosure & IP/IK */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Invólucro & Proteção</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-sky-400">
              {config.ipRating || 'IP55'} / {config.ikRating || 'IK08'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>{config.widthMm}&times;{config.heightMm}&times;{config.depthMm || 250}mm</span>
            <span className="text-slate-300 font-semibold">{rails.length} calhas</span>
          </div>
        </div>
      </div>

      {/* Main Charts Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CHART 1: Donut / Pie Chart - Distribution of Component Types (Disjuntores, Bornes, PLCs, etc.) */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Distribuição por Tipo de Componente
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Métrica: {metricType === 'count' ? 'Qtd Unidades' : metricType === 'width' ? 'Milímetros (mm)' : 'Valor (€)'}
            </span>
          </div>

          <div className="h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActivePieIndex(index)}
                  onMouseLeave={() => setActivePieIndex(null)}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={activePieIndex === index ? '#ffffff' : '#0f172a'}
                      strokeWidth={activePieIndex === index ? 2 : 1}
                      className="transition-all duration-200 cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const percent =
                        metricType === 'count'
                          ? Math.round((data.count / Math.max(1, totalComponents)) * 100)
                          : metricType === 'width'
                          ? Math.round((data.width / Math.max(1, totalWidthMm)) * 100)
                          : Math.round((data.cost / Math.max(1, totalCostEur)) * 100);

                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 shadow-xl text-xs font-sans">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: data.color }}
                            />
                            <span className="font-bold text-white">{data.name}</span>
                          </div>
                          <div className="text-slate-300 space-y-0.5 text-[11px] font-mono">
                            <div>Quantidade: <span className="text-white font-bold">{data.count} un</span> ({percent}%)</div>
                            <div>Largura Total: <span className="text-sky-300 font-bold">{data.width} mm</span></div>
                            <div>Custo Estimado: <span className="text-emerald-400 font-bold">{data.cost.toFixed(2)} €</span></div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Central Summary in Donut Hole */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-extrabold font-mono text-white">
                {metricType === 'count'
                  ? totalComponents
                  : metricType === 'width'
                  ? `${totalWidthMm}mm`
                  : `${Math.round(totalCostEur)}€`}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {metricType === 'count' ? 'Total Itens' : metricType === 'width' ? 'Largura Total' : 'Custo Total'}
              </span>
            </div>
          </div>

          {/* Interactive Legend with values */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-800/80">
            {categoryStats.map((cat, idx) => {
              const val = metricType === 'count' ? `${cat.count} un` : metricType === 'width' ? `${cat.width} mm` : `${cat.cost.toFixed(1)} €`;
              const percent =
                metricType === 'count'
                  ? Math.round((cat.count / Math.max(1, totalComponents)) * 100)
                  : metricType === 'width'
                  ? Math.round((cat.width / Math.max(1, totalWidthMm)) * 100)
                  : Math.round((cat.cost / Math.max(1, totalCostEur)) * 100);

              return (
                <div
                  key={cat.key}
                  onMouseEnter={() => setActivePieIndex(idx)}
                  onMouseLeave={() => setActivePieIndex(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    activePieIndex === idx ? 'bg-slate-850 ring-1 ring-slate-600' : 'bg-slate-900/60 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-slate-300 truncate text-[11px] font-medium">{cat.shortName}</span>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[11px]">
                    <span className="text-white font-bold">{val}</span>
                    <span className="text-slate-500 ml-1 text-[10px]">({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 2: Bar Chart - DIN Rail Physical Occupancy (mm vs. Usable Capacity) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Ocupação Linear por Calha DIN (mm Ocupados vs. Disponíveis)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                Reserva &ge; 20%
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={railOccupancyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="shortName" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="mm" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 shadow-xl text-xs font-sans">
                            <div className="font-bold text-white mb-1">{d.name}</div>
                            <div className="space-y-0.5 font-mono text-[11px]">
                              <div className="text-sky-300">Ocupado: <strong>{d.occupiedMm} mm</strong> ({d.percent}%)</div>
                              <div className="text-emerald-400">Livre: <strong>{d.availableMm} mm</strong></div>
                              <div className="text-slate-400">Total Útil: <strong>{d.usableMm} mm</strong></div>
                              <div className="text-slate-300 pt-1 border-t border-slate-800">Componentes: <strong>{d.count} aparelhos</strong></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="occupiedMm" name="Largura Ocupada (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {railOccupancyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.percent > 85 ? '#ef4444' : entry.percent > 70 ? '#f59e0b' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="availableMm" name="Espaço de Reserva Livre (mm)" fill="#1e293b" stroke="#334155" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Rail Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-3 border-t border-slate-800/80 text-[11px]">
            {railOccupancyData.map((r) => (
              <div key={r.railIndex} className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 font-medium">{r.shortName}</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono font-bold text-white">{r.percent}%</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      r.percent > 85
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : r.percent > 70
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Charts: Breaker Amperages & Brands */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CHART 3: Circuit Breaker Amperages */}
        <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Calibres dos Disjuntores & Circuitos (Amperagens)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Total: {categoryStats.find(c => c.key === 'disjuntores')?.count || 0} proteções
            </span>
          </div>

          <div className="h-56">
            {breakerRatingsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakerRatingsData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="rating" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 shadow-xl text-xs font-sans">
                            <span className="font-bold text-white block">Calibre {d.rating}</span>
                            <span className="text-amber-400 font-mono text-[11px]">
                              Circuitos Protegidos: <strong>{d.circuitos}</strong>
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="circuitos" name="Circuitos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Nenhum disjuntor adicionado ao quadro ainda.
              </div>
            )}
          </div>
        </div>

        {/* CHART 4: Manufacturers & Brands Distribution */}
        <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Distribuição por Fabricante / Marca
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {brandDistributionData.length} marcas distintas
            </span>
          </div>

          <div className="h-56">
            {brandDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={brandDistributionData}
                  margin={{ top: 5, right: 20, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="brand" stroke="#64748b" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 shadow-xl text-xs font-sans">
                            <span className="font-bold text-white block">{d.brand}</span>
                            <div className="text-[11px] font-mono space-y-0.5 text-slate-300 mt-1">
                              <div>Aparelhos: <strong className="text-white">{d.count} un</strong></div>
                              <div>Largura: <strong className="text-sky-300">{d.width} mm</strong></div>
                              <div>Valor: <strong className="text-emerald-400">{d.cost.toFixed(2)} €</strong></div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" name="Quantidade de Aparelhos" radius={[0, 4, 4, 0]}>
                    {brandDistributionData.map((entry, index) => (
                      <Cell key={`brand-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Nenhum componente configurado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decomposed Analytical Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Tabela de Decomposição Analítica dos Equipamentos
            </h3>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('bom')}
              className="text-xs text-sky-400 hover:text-white flex items-center gap-1 font-semibold transition"
            >
              <span>Ver Lista Completa BOM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] text-slate-400 font-semibold">
                <th className="py-2 px-3">Tipo de Componente</th>
                <th className="py-2 px-3">Descrição Técnica</th>
                <th className="py-2 px-3 text-center">Quantidade</th>
                <th className="py-2 px-3 text-center">Largura (mm)</th>
                <th className="py-2 px-3 text-center">Peso no Quadro (%)</th>
                <th className="py-2 px-3 text-right">Custo Estimado (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {categoryStats.map((cat) => {
                const percent = Math.round((cat.count / Math.max(1, totalComponents)) * 100);
                const Icon = cat.icon;

                return (
                  <tr key={cat.key} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-white">{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {cat.description}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                      {cat.count}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-sky-300">
                      {cat.width} mm
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${percent}%`, backgroundColor: cat.color }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-300">{percent}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {cat.cost.toFixed(2)} €
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 border-t-2 border-slate-800 font-bold text-xs">
                <td className="py-2.5 px-3 text-white" colSpan={2}>
                  TOTAL CONSOLIDADO DO QUADRO
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-white">
                  {totalComponents} un
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-sky-400">
                  {totalWidthMm} mm
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                  100%
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-400 text-sm">
                  {totalCostEur.toFixed(2)} €
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
