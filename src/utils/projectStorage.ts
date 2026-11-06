import { ProjectState, SavedProjectEntry } from '../types/electrical';
import { getDefaultGlands } from './glandUtils';

export const SAVED_PROJECTS_KEY = 'electrocad_saved_projects_v2';
export const CURRENT_PROJECT_KEY = 'electrocad_din_project_v2';
export const LAST_SAVED_TIMESTAMP_KEY = 'electrocad_last_saved_time';

/**
 * Retrieve all saved projects from browser localStorage
 */
export function getSavedProjects(): SavedProjectEntry[] {
  try {
    const raw = localStorage.getItem(SAVED_PROJECTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return list;
    }
    return [];
  } catch (err) {
    console.error('Error loading saved projects from localStorage:', err);
    return [];
  }
}

/**
 * Save or update a project in the saved projects library
 */
export function saveProjectToLibrary(
  project: ProjectState,
  customName?: string,
  customCode?: string
): SavedProjectEntry {
  const projects = getSavedProjects();
  const now = new Date().toISOString();

  // Name and code from args or config
  const name = customName?.trim() || project.config.name || 'Quadro Elétrico DIN';
  const code = customCode?.trim() || project.config.projectCode || 'PROJ-001';

  const updatedConfig = {
    ...project.config,
    name,
    projectCode: code,
  };

  const updatedState: ProjectState = {
    ...project,
    config: updatedConfig,
    glands: project.glands && project.glands.length > 0 
      ? project.glands 
      : getDefaultGlands(project.config.widthMm, project.config.supplyVoltage?.includes('400V')),
  };

  const compCount = updatedState.rails.reduce((acc, r) => acc + (r.items ? r.items.length : 0), 0);
  const glandCount = updatedState.glands?.length || 0;

  // Check if project with this code already exists
  const existingIdx = projects.findIndex(
    (p) => p.code.toLowerCase() === code.toLowerCase() || p.id === code
  );

  let savedEntry: SavedProjectEntry;

  if (existingIdx >= 0) {
    savedEntry = {
      ...projects[existingIdx],
      name,
      code,
      updatedAt: now,
      dimensions: {
        width: updatedConfig.widthMm,
        height: updatedConfig.heightMm,
        depth: updatedConfig.depthMm,
      },
      railCount: updatedState.rails.length,
      componentCount: compCount,
      glandCount,
      state: updatedState,
    };
    projects[existingIdx] = savedEntry;
  } else {
    savedEntry = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      code,
      createdAt: now,
      updatedAt: now,
      dimensions: {
        width: updatedConfig.widthMm,
        height: updatedConfig.heightMm,
        depth: updatedConfig.depthMm,
      },
      railCount: updatedState.rails.length,
      componentCount: compCount,
      glandCount,
      state: updatedState,
    };
    projects.unshift(savedEntry);
  }

  // Persist both current workspace and library list
  localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(projects));
  localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(updatedState));
  localStorage.setItem(LAST_SAVED_TIMESTAMP_KEY, now);

  return savedEntry;
}

/**
 * Duplicate a saved project with a new ID and code
 */
export function duplicateProjectInLibrary(id: string): SavedProjectEntry | null {
  const projects = getSavedProjects();
  const source = projects.find((p) => p.id === id);
  if (!source) return null;

  const now = new Date().toISOString();
  const newCode = `${source.code}-COPIA`;
  const newName = `${source.name} (Cópia)`;

  const newState: ProjectState = {
    ...source.state,
    config: {
      ...source.state.config,
      projectCode: newCode,
      name: newName,
    },
  };

  const newEntry: SavedProjectEntry = {
    id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: newName,
    code: newCode,
    createdAt: now,
    updatedAt: now,
    dimensions: { ...source.dimensions },
    railCount: source.railCount,
    componentCount: source.componentCount,
    glandCount: source.glandCount,
    state: newState,
  };

  projects.unshift(newEntry);
  localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(projects));
  return newEntry;
}

/**
 * Delete a saved project from the library
 */
export function deleteProjectFromLibrary(id: string): boolean {
  const projects = getSavedProjects();
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length !== projects.length) {
    localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(filtered));
    return true;
  }
  return false;
}

/**
 * Export project as a downloadable formatted .json file
 */
export function exportProjectAsJson(project: ProjectState, customFilename?: string): void {
  const exportPayload = {
    app: 'ElectroCad DIN',
    schemaVersion: '2.0.0',
    exportedAt: new Date().toISOString(),
    projectCode: project.config.projectCode || 'PROJ-001',
    projectName: project.config.name || 'Quadro Elétrico DIN',
    summary: {
      dimensionsMm: `${project.config.widthMm} x ${project.config.heightMm} x ${project.config.depthMm}`,
      supplyVoltage: project.config.supplyVoltage,
      railCount: project.rails.length,
      totalComponents: project.rails.reduce((acc, r) => acc + (r.items ? r.items.length : 0), 0),
      totalGlands: project.glands ? project.glands.length : 0,
    },
    state: project,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanCode = (project.config.projectCode || 'PROJ')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = (project.config.name || 'quadro')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultFilename = `ELECTROCAD_${cleanCode}_${cleanName}_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = customFilename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export automatic or manual backup JSON directly to the browser downloads folder
 * Returns the generated filename for feedback / toast display
 */
export function exportProjectBackupJson(
  project: ProjectState,
  reason: string = 'inatividade_5min'
): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}m${String(now.getSeconds()).padStart(2, '0')}s`;
  const cleanCode = (project.config.projectCode || 'PROJ').replace(/[^a-zA-Z0-9_-]/g, '_');

  const filename = `backup_ElectroCad_${cleanCode}_${dateStr}_${timeStr}.json`;

  const exportPayload = {
    app: 'ElectroCad DIN',
    schemaVersion: '2.0.0',
    backupType: 'auto_inactivity_backup',
    reason,
    exportedAt: now.toISOString(),
    projectCode: project.config.projectCode || 'PROJ-001',
    projectName: project.config.name || 'Quadro Elétrico DIN',
    summary: {
      dimensionsMm: `${project.config.widthMm} x ${project.config.heightMm} x ${project.config.depthMm}`,
      supplyVoltage: project.config.supplyVoltage,
      railCount: project.rails.length,
      totalComponents: project.rails.reduce((acc, r) => acc + (r.items ? r.items.length : 0), 0),
      totalGlands: project.glands ? project.glands.length : 0,
    },
    state: project,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Parse and validate an imported project JSON file
 */
export function parseProjectJson(jsonString: string): { 
  success: boolean; 
  state?: ProjectState; 
  projectName?: string;
  error?: string 
} {
  try {
    const parsed = JSON.parse(jsonString);

    // Support both wrapped export payload { app, state } and direct ProjectState { config, rails }
    const stateCandidate: ProjectState = parsed.state ? parsed.state : parsed;

    if (!stateCandidate.config || !Array.isArray(stateCandidate.rails)) {
      return {
        success: false,
        error: 'O ficheiro selecionado não tem a estrutura válida de um projeto ElectroCad (faltam config ou rails).',
      };
    }

    // Ensure glands are defined
    if (!stateCandidate.glands || !Array.isArray(stateCandidate.glands) || stateCandidate.glands.length === 0) {
      stateCandidate.glands = getDefaultGlands(
        stateCandidate.config.widthMm || 600,
        stateCandidate.config.supplyVoltage?.includes('400V')
      );
    }

    // Ensure rails have valid items
    stateCandidate.rails = stateCandidate.rails.map((r, idx) => ({
      ...r,
      index: typeof r.index === 'number' ? r.index : idx,
      name: r.name || `Calha ${idx + 1}`,
      items: Array.isArray(r.items) ? r.items : [],
    }));

    return {
      success: true,
      state: stateCandidate,
      projectName: stateCandidate.config.name || 'Projeto Importado',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Erro ao descodificar o ficheiro JSON: ${err.message || 'formato inválido'}`,
    };
  }
}

/**
 * Format relative or absolute timestamp in Portuguese
 */
export function formatSavedTime(isoString?: string | null): string {
  if (!isoString) return 'Nunca gravado';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Recente';
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
           ' (' + d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ')';
  } catch {
    return 'Recente';
  }
}

export interface EmptyProjectOptions {
  name?: string;
  projectCode?: string;
  widthMm?: number;
  heightMm?: number;
  depthMm?: number;
  railCount?: number;
  supplyVoltage?: string;
  ipRating?: string;
  applicationType?: 'residential' | 'automation' | 'commercial';
}

/**
 * Creates a brand new pristine empty project with customizable dimensions and DIN rails
 */
export function createEmptyProject(options?: EmptyProjectOptions): ProjectState {
  const widthMm = options?.widthMm || 600;
  const heightMm = options?.heightMm || 800;
  const depthMm = options?.depthMm || 250;
  const railCount = Math.max(1, options?.railCount || 3);
  const supplyVoltage: '230V AC (1F+N+PE)' | '400V AC (3F+N+PE)' = 
    options?.supplyVoltage === '400V AC (3F+N+PE)' ? '400V AC (3F+N+PE)' : '230V AC (1F+N+PE)';
  const applicationType = options?.applicationType || 'automation';
  const ipRating: 'IP20' | 'IP30' | 'IP40' | 'IP55' | 'IP65' | 'IP66' = 
    (options?.ipRating as any) || (applicationType === 'residential' ? 'IP40' : 'IP65');
  const name = options?.name || (applicationType === 'residential' ? 'Quadro Residencial Habitação' : 'Novo Quadro Elétrico');
  const projectCode = options?.projectCode || `PRJ-${Math.floor(100 + Math.random() * 900)}`;

  const railSpacing = Math.round(Math.max(120, (heightMm - 140) / Math.max(1, railCount)));
  const usableWidth = widthMm - 80;

  const rails = Array.from({ length: railCount }).map((_, idx) => ({
    id: `rail-${idx}`,
    index: idx,
    name: `Calha ${idx + 1} (DIN 35mm)`,
    items: [],
    usableWidthMm: usableWidth,
    yPositionMm: 80 + idx * railSpacing,
  }));

  const glands = getDefaultGlands(widthMm, supplyVoltage.includes('400V'));

  return {
    config: {
      name,
      projectCode,
      clientName: '',
      designerName: '',
      date: new Date().toISOString().split('T')[0],
      supplyVoltage,
      frequencyHz: 50,
      ipRating,
      widthMm,
      heightMm,
      depthMm,
      sideDuctWidthMm: 40,
      horizontalDuctHeightMm: 40,
      railSpacingMm: railSpacing,
      railCount,
      applicationType,
    },
    rails,
    glands,
  };
}

