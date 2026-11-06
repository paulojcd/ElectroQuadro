import { ProjectState } from '../types/electrical';
import { GLAND_SPECS } from './glandUtils';
import { calculateComponentWireRecommendation } from './wireCalculations';

export interface ConsolidatedBomItem {
  key: string;
  partNumber: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  tags: string[];
  widthMm: number;
  quantity: number;
  unitPriceEur: number;
  totalPriceEur: number;
  powerRating?: string;
  recommendedWireMm2?: number;
  recommendedWireLabel?: string;
}

export function getConsolidatedBom(project: ProjectState): ConsolidatedBomItem[] {
  const map = new Map<string, ConsolidatedBomItem>();

  project.rails.forEach((rail) => {
    rail.items.forEach((item) => {
      const key = item.data.partNumber;
      if (!map.has(key)) {
        const isThreePhase = project.config.supplyVoltage?.includes('400V') ?? false;
        const wireRec = calculateComponentWireRecommendation(item.data, undefined, isThreePhase);
        map.set(key, {
          key,
          partNumber: item.data.partNumber,
          name: item.data.name,
          brand: item.data.brand,
          category: item.data.category,
          description: item.data.description,
          tags: [item.tag],
          widthMm: item.data.widthMm,
          quantity: 1,
          unitPriceEur: item.data.estimatedPriceEur,
          totalPriceEur: item.data.estimatedPriceEur,
          powerRating: item.data.ratedPowerW
            ? `${item.data.ratedPowerW}W (${item.data.ratedCurrentA}A)`
            : item.data.ratedCurrentA
            ? `${item.data.ratedCurrentA}A`
            : undefined,
          recommendedWireMm2: wireRec.recommendedGaugeMm2,
          recommendedWireLabel: `${wireRec.recommendedGaugeMm2} mm² (${wireRec.wireType.split(' ')[0]})`,
        });
      } else {
        const existing = map.get(key)!;
        existing.quantity += 1;
        existing.totalPriceEur += item.data.estimatedPriceEur;
        if (!existing.tags.includes(item.tag)) {
          existing.tags.push(item.tag);
        }
      }
    });
  });

  // Add Cable Glands & Locknuts (Bucins com contra-porcas)
  const glands = project.glands || [];
  glands.forEach((gland) => {
    const key = `LEG-BUC-${gland.size}`;
    const spec = GLAND_SPECS[gland.size] || { holeDiameterMm: 20, cableRange: '6-12mm', estimatedPriceEur: 2.0 };
    const price = gland.estimatedPriceEur || spec.estimatedPriceEur;

    if (!map.has(key)) {
      map.set(key, {
        key,
        partNumber: `LEG-BUC-${gland.size}`,
        name: `Bucim Métrico ${gland.size} IP68 c/ Contraporca`,
        brand: 'Legrand / Lapp',
        category: 'accessories',
        description: `Prensa-cabos estanque ${gland.size} em poliamida RAL 7035 com contra-porca (Furo Ø${spec.holeDiameterMm}mm, cabo ${gland.cableDiameterRangeMm})`,
        tags: [gland.tag],
        widthMm: 0,
        quantity: 1,
        unitPriceEur: price,
        totalPriceEur: price,
      });
    } else {
      const existing = map.get(key)!;
      existing.quantity += 1;
      existing.totalPriceEur += price;
      if (!existing.tags.includes(gland.tag)) {
        existing.tags.push(gland.tag);
      }
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)
  );
}
