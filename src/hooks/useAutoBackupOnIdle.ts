import { useEffect, useRef, useState, useCallback } from 'react';
import { ProjectState } from '../types/electrical';
import { exportProjectBackupJson } from '../utils/projectStorage';

export const AUTO_BACKUP_CONFIG_KEY = 'electrocad_auto_backup_config_v1';
export const LAST_AUTO_BACKUP_TIME_KEY = 'electrocad_last_auto_backup_time';
export const LAST_AUTO_BACKUP_FILE_KEY = 'electrocad_last_auto_backup_file';

export interface AutoBackupConfig {
  enabled: boolean;
  idleMinutes: number; // default: 5
}

export type AutoBackupState = ReturnType<typeof useAutoBackupOnIdle>;

interface UseAutoBackupOnIdleOptions {
  project: ProjectState;
  onBackupExported?: (filename: string, timestamp: string) => void;
}

export function useAutoBackupOnIdle({ project, onBackupExported }: UseAutoBackupOnIdleOptions) {
  // Load configuration from localStorage (default: enabled = true, idleMinutes = 5)
  const [config, setConfig] = useState<AutoBackupConfig>(() => {
    try {
      const stored = localStorage.getItem(AUTO_BACKUP_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
          idleMinutes: typeof parsed.idleMinutes === 'number' && parsed.idleMinutes > 0 ? parsed.idleMinutes : 5,
        };
      }
    } catch (e) {
      console.warn('Failed to parse auto-backup config, using defaults', e);
    }
    return { enabled: true, idleMinutes: 5 };
  });

  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    return localStorage.getItem(LAST_AUTO_BACKUP_TIME_KEY);
  });

  const [lastBackupFileName, setLastBackupFileName] = useState<string | null>(() => {
    return localStorage.getItem(LAST_AUTO_BACKUP_FILE_KEY);
  });

  const [secondsUntilIdle, setSecondsUntilIdle] = useState<number>(() => config.idleMinutes * 60);

  // References to avoid stale closures in event listeners and timers
  const projectRef = useRef<ProjectState>(project);
  projectRef.current = project;

  const onBackupExportedRef = useRef(onBackupExported);
  onBackupExportedRef.current = onBackupExported;

  const configRef = useRef<AutoBackupConfig>(config);
  configRef.current = config;

  const lastActivityTimestampRef = useRef<number>(Date.now());
  const hasFiredForCurrentIdleSessionRef = useRef<boolean>(false);
  const lastThrottleEventTimestampRef = useRef<number>(0);

  // Save config changes to localStorage
  const updateConfig = useCallback((newConfig: Partial<AutoBackupConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem(AUTO_BACKUP_CONFIG_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save auto-backup config', e);
      }
      return updated;
    });
  }, []);

  // Manual trigger function
  const triggerManualBackup = useCallback((): string => {
    const filename = exportProjectBackupJson(projectRef.current, 'manual_instantaneo');
    const nowIso = new Date().toISOString();
    
    setLastBackupTime(nowIso);
    setLastBackupFileName(filename);
    try {
      localStorage.setItem(LAST_AUTO_BACKUP_TIME_KEY, nowIso);
      localStorage.setItem(LAST_AUTO_BACKUP_FILE_KEY, filename);
    } catch {}

    if (onBackupExportedRef.current) {
      onBackupExportedRef.current(filename, nowIso);
    }
    return filename;
  }, []);

  // Activity detection: mouse, keyboard, touch, scroll
  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();
      // Throttle activity event handling to avoid CPU overhead
      if (now - lastThrottleEventTimestampRef.current < 400) {
        return;
      }
      lastThrottleEventTimestampRef.current = now;
      lastActivityTimestampRef.current = now;

      // When the user resumes activity, reset the idle fired guard for the next idle interval
      if (hasFiredForCurrentIdleSessionRef.current) {
        hasFiredForCurrentIdleSessionRef.current = false;
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'pointerdown'];
    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, []);

  // Inactivity check interval loop
  useEffect(() => {
    const checkIntervalMs = 1000; // Check every 1 second

    const intervalId = setInterval(() => {
      const currentConfig = configRef.current;
      if (!currentConfig.enabled) {
        return;
      }

      const idleThresholdMs = currentConfig.idleMinutes * 60 * 1000;
      const now = Date.now();
      const elapsedSinceActivity = now - lastActivityTimestampRef.current;
      const remainingMs = Math.max(0, idleThresholdMs - elapsedSinceActivity);
      setSecondsUntilIdle(Math.ceil(remainingMs / 1000));

      // Trigger condition:
      // 1. Elapsed time >= configured idle time (default 5 minutes = 300,000ms)
      // 2. Has NOT already fired for this specific idle session
      if (elapsedSinceActivity >= idleThresholdMs && !hasFiredForCurrentIdleSessionRef.current) {
        hasFiredForCurrentIdleSessionRef.current = true;

        const currentProj = projectRef.current;
        const filename = exportProjectBackupJson(
          currentProj, 
          `inatividade_${currentConfig.idleMinutes}min`
        );
        const nowIso = new Date().toISOString();

        setLastBackupTime(nowIso);
        setLastBackupFileName(filename);
        try {
          localStorage.setItem(LAST_AUTO_BACKUP_TIME_KEY, nowIso);
          localStorage.setItem(LAST_AUTO_BACKUP_FILE_KEY, filename);
        } catch {}

        if (onBackupExportedRef.current) {
          onBackupExportedRef.current(filename, nowIso);
        }
      }
    }, checkIntervalMs);

    return () => clearInterval(intervalId);
  }, []);

  return {
    isEnabled: config.enabled,
    setIsEnabled: (enabled: boolean) => updateConfig({ enabled }),
    idleMinutes: config.idleMinutes,
    setIdleMinutes: (idleMinutes: number) => updateConfig({ idleMinutes }),
    lastBackupTime,
    lastBackupFileName,
    secondsUntilIdle,
    triggerManualBackup,
  };
}
