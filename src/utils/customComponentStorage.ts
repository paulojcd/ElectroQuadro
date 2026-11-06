import { useState, useEffect, useCallback } from 'react';
import { CatalogItem } from '../types/electrical';
import { COMPONENT_CATALOG } from '../data/componentLibrary';

export const CUSTOM_COMPONENTS_STORAGE_KEY = 'electrocad_custom_components_v1';
export const CUSTOM_COMPONENTS_UPDATED_EVENT = 'electrocad:custom_components_updated';

/**
 * Retrieve all custom components saved by the user in localStorage
 */
export function getCustomComponents(): CatalogItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_COMPONENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is CatalogItem => {
        return Boolean(item && typeof item === 'object' && item.name && item.category && typeof item.widthMm === 'number');
      });
    }
    return [];
  } catch (err) {
    console.error('Error reading custom components from localStorage:', err);
    return [];
  }
}

/**
 * Save or update a single custom component
 */
export function saveCustomComponent(component: CatalogItem): CatalogItem {
  const current = getCustomComponents();
  const catalogId = component.catalogId || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  const finalizedItem: CatalogItem = {
    ...component,
    catalogId,
    // Ensure numeric values are sanitized
    widthMm: Math.max(1, Number(component.widthMm) || 18),
    heightMm: Math.max(1, Number(component.heightMm) || 90),
    depthMm: component.depthMm ? Math.max(1, Number(component.depthMm)) : 70,
    dinModules: component.dinModules ? Number(component.dinModules) : Math.round(((Number(component.widthMm) || 18) / 18) * 10) / 10,
    estimatedPriceEur: Math.max(0, Number(component.estimatedPriceEur) || 0),
    ratedCurrentA: component.ratedCurrentA ? Number(component.ratedCurrentA) : undefined,
    ratedPowerW: component.ratedPowerW ? Number(component.ratedPowerW) : undefined,
    dcConsumptionA: component.dcConsumptionA ? Number(component.dcConsumptionA) : undefined,
    dcConsumptionW: component.dcConsumptionW ? Number(component.dcConsumptionW) : undefined,
  };

  const existingIndex = current.findIndex((c) => c.catalogId === catalogId);
  let updatedList: CatalogItem[];

  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = finalizedItem;
  } else {
    updatedList = [finalizedItem, ...current];
  }

  localStorage.setItem(CUSTOM_COMPONENTS_STORAGE_KEY, JSON.stringify(updatedList));
  window.dispatchEvent(new CustomEvent(CUSTOM_COMPONENTS_UPDATED_EVENT, { detail: { action: 'save', item: finalizedItem } }));
  return finalizedItem;
}

/**
 * Delete a custom component by catalogId
 */
export function deleteCustomComponent(catalogId: string): boolean {
  const current = getCustomComponents();
  const filtered = current.filter((c) => c.catalogId !== catalogId);
  if (filtered.length === current.length) return false;

  localStorage.setItem(CUSTOM_COMPONENTS_STORAGE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new CustomEvent(CUSTOM_COMPONENTS_UPDATED_EVENT, { detail: { action: 'delete', catalogId } }));
  return true;
}

/**
 * Import multiple custom components (e.g. from Excel)
 */
export function importCustomComponents(
  newItems: CatalogItem[],
  mode: 'merge' | 'replace' = 'merge'
): { added: number; updated: number; total: number } {
  const sanitized = newItems.map((item, idx) => {
    const catalogId = item.catalogId?.trim() || `imported-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`;
    return {
      ...item,
      catalogId,
      widthMm: Math.max(1, Number(item.widthMm) || 18),
      heightMm: Math.max(1, Number(item.heightMm) || 90),
      depthMm: item.depthMm ? Math.max(1, Number(item.depthMm)) : 70,
      dinModules: item.dinModules ? Number(item.dinModules) : Math.round(((Number(item.widthMm) || 18) / 18) * 10) / 10,
      estimatedPriceEur: Math.max(0, Number(item.estimatedPriceEur) || 0),
      ratedCurrentA: item.ratedCurrentA ? Number(item.ratedCurrentA) : undefined,
      ratedPowerW: item.ratedPowerW ? Number(item.ratedPowerW) : undefined,
      dcConsumptionA: item.dcConsumptionA ? Number(item.dcConsumptionA) : undefined,
      dcConsumptionW: item.dcConsumptionW ? Number(item.dcConsumptionW) : undefined,
    };
  });

  if (mode === 'replace') {
    localStorage.setItem(CUSTOM_COMPONENTS_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent(CUSTOM_COMPONENTS_UPDATED_EVENT, { detail: { action: 'replace', count: sanitized.length } }));
    return { added: sanitized.length, updated: 0, total: sanitized.length };
  }

  // Merge mode: check existing by catalogId or by (partNumber + brand)
  const current = getCustomComponents();
  let addedCount = 0;
  let updatedCount = 0;
  const mergedMap = new Map<string, CatalogItem>();

  // Add existing to map
  current.forEach((item) => {
    mergedMap.set(item.catalogId, item);
  });

  // Apply new items
  sanitized.forEach((item) => {
    // Check if matching partNumber and brand exists
    let matchedId = item.catalogId;
    if (!mergedMap.has(matchedId)) {
      const matchByPart = current.find(
        (c) => c.partNumber.toLowerCase() === item.partNumber.toLowerCase() && c.brand.toLowerCase() === item.brand.toLowerCase()
      );
      if (matchByPart) {
        matchedId = matchByPart.catalogId;
      }
    }

    if (mergedMap.has(matchedId)) {
      mergedMap.set(matchedId, { ...item, catalogId: matchedId });
      updatedCount++;
    } else {
      mergedMap.set(matchedId, item);
      addedCount++;
    }
  });

  const mergedList = Array.from(mergedMap.values());
  localStorage.setItem(CUSTOM_COMPONENTS_STORAGE_KEY, JSON.stringify(mergedList));
  window.dispatchEvent(new CustomEvent(CUSTOM_COMPONENTS_UPDATED_EVENT, { detail: { action: 'merge', added: addedCount, updated: updatedCount } }));
  return { added: addedCount, updated: updatedCount, total: mergedList.length };
}

/**
 * Returns merged catalog containing built-in factory components and custom/imported components.
 * Custom components take precedence and are also listed with an 'isCustom' flag if needed.
 */
export function getMergedCatalog(): CatalogItem[] {
  const customItems = getCustomComponents();
  const customIds = new Set(customItems.map((c) => c.catalogId));

  // Exclude factory items that were overridden by a custom item with the same catalogId
  const nonOverriddenFactory = COMPONENT_CATALOG.filter((f) => !customIds.has(f.catalogId));

  // Custom components first, followed by factory components
  return [...customItems, ...nonOverriddenFactory];
}

/**
 * React hook to listen for component catalog updates and provide reactive state
 */
export function useComponentCatalog() {
  const [customComponents, setCustomComponents] = useState<CatalogItem[]>(() => getCustomComponents());
  const [allComponents, setAllComponents] = useState<CatalogItem[]>(() => getMergedCatalog());

  const refreshCatalog = useCallback(() => {
    const customs = getCustomComponents();
    setCustomComponents(customs);
    setAllComponents(getMergedCatalog());
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      refreshCatalog();
    };

    window.addEventListener(CUSTOM_COMPONENTS_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(CUSTOM_COMPONENTS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshCatalog]);

  return {
    allComponents,
    customComponents,
    factoryComponents: COMPONENT_CATALOG,
    refreshCatalog,
    saveComponent: saveCustomComponent,
    deleteComponent: deleteCustomComponent,
    importComponents: importCustomComponents,
  };
}
