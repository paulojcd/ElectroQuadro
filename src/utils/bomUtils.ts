import { ProjectState } from '../types/electrical';
import { GLAND_SPECS } from './glandUtils';
import { calculateComponentWireRecommendation } from './wireCalculations';
import { getDefaultEnclosurePrice } from '../data/enclosureCatalog';

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

  // 1. Enclosure as a component (Quadro / Armário Elétrico reaproveitável)
  const encModel = project.config.enclosureModel;
  const encBrand = encModel?.brand || project.config.enclosureBrand || 'Schneider Electric';
  const encPartNumber = encModel?.partNumber || project.config.enclosurePartNumber || `NSYS3D${Math.round(project.config.heightMm / 10)}${Math.round(project.config.widthMm / 10)}${Math.round(project.config.depthMm / 10)}P`;
  const encName = encModel?.name || `Quadro Elétrico ${project.config.widthMm}×${project.config.heightMm}×${project.config.depthMm}mm (${project.config.ipRating || 'IP66'})`;
  const encPrice = project.config.enclosurePriceEur !== undefined 
    ? project.config.enclosurePriceEur 
    : encModel?.estimatedPriceEur !== undefined 
    ? encModel.estimatedPriceEur 
    : getDefaultEnclosurePrice(project.config.widthMm, project.config.heightMm, project.config.depthMm, project.config.enclosureMaterial);
  const encDesc = encModel?.description || `Armário industrial monobloco ${project.config.widthMm}×${project.config.heightMm}×${project.config.depthMm}mm, estanquidade ${project.config.ipRating || 'IP66'}, IK10, com placa de montagem zincada incluída`;

  map.set(encPartNumber, {
    key: `ENC-${encPartNumber}`,
    partNumber: encPartNumber,
    name: encName,
    brand: encBrand,
    category: 'enclosure',
    description: encDesc,
    tags: ['QD1'],
    widthMm: project.config.widthMm,
    quantity: 1,
    unitPriceEur: encPrice,
    totalPriceEur: encPrice,
  });

  // 2. Door Control Panel Devices (HMI, Botões 22mm, Emergência, Switches Alavanca)
  if (project.controlPanel && project.controlPanel.devices) {
    project.controlPanel.devices.forEach((dev) => {
      const key = `CP-${dev.partNumber || dev.tag || dev.name}`;
      const price = dev.priceEur || 15.0;
      if (!map.has(key)) {
        map.set(key, {
          key,
          partNumber: dev.partNumber || `DEV-${dev.tag}`,
          name: dev.name,
          brand: dev.brand || 'Schneider Harmony',
          category: dev.type === 'hmi' ? 'hmi' : 'accessories',
          description: `Aparelho de porta: ${dev.name} [Furação Ø${dev.holeDiameterMm || dev.widthMm}mm]`,
          tags: [dev.tag],
          widthMm: dev.widthMm,
          quantity: 1,
          unitPriceEur: price,
          totalPriceEur: price,
        });
      } else {
        const existing = map.get(key)!;
        existing.quantity += 1;
        existing.totalPriceEur += price;
        if (!existing.tags.includes(dev.tag)) {
          existing.tags.push(dev.tag);
        }
      }
    });
  }

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
