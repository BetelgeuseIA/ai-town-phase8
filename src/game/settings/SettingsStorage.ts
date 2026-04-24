// ────────────────────────────────────────────────
// SettingsStorage.ts — Persistencia en localStorage
// ────────────────────────────────────────────────

import {
  GameSettings,
  DEFAULT_SETTINGS,
  sanitizeSettings,
} from './GameSettings';

const STORAGE_KEY = 'ai-town-game-settings';
const CURRENT_VERSION = 1;

// ────────────────────────────────────────────────
// Cargar desde localStorage
// ────────────────────────────────────────────────

/**
 * Carga la configuración desde localStorage.
 * Si no existe o está corrupta, devuelve defaults.
 */
export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const migrated = migrateSettings(parsed);
    return sanitizeSettings(migrated);
  } catch {
    // JSON inválido o error de acceso
    return { ...DEFAULT_SETTINGS };
  }
}

// ────────────────────────────────────────────────
// Guardar en localStorage
// ────────────────────────────────────────────────

/**
 * Guarda la configuración completa en localStorage.
 */
export function saveSettings(settings: GameSettings): void {
  try {
    const toSave: GameSettings = {
      ...settings,
      version: CURRENT_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('[SettingsStorage] No se pudo guardar:', e);
  }
}

// ────────────────────────────────────────────────
// Resetear a valores por defecto
// ────────────────────────────────────────────────

/**
 * Restaura defaults y guarda en localStorage.
 */
export function resetSettings(): GameSettings {
  const defaults = { ...DEFAULT_SETTINGS, version: CURRENT_VERSION };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch (e) {
    console.warn('[SettingsStorage] No se pudo guardar reset:', e);
  }
  return defaults;
}

// ────────────────────────────────────────────────
// Migración de versiones antiguas
// ────────────────────────────────────────────────

/**
 * Migra settings de versiones antiguas a la versión actual.
 * Añade campos que falten; no elimina campos obsoletos (forward-compatible).
 */
function migrateSettings(raw: Partial<GameSettings>): Partial<GameSettings> {
  const version = raw.version ?? 0;
  let current = { ...raw };

  // Migración 0 → 1
  if (version < 1) {
    // Versión 1: estructura base con graphics/audio/gameplay
    current = {
      ...current,
      version: 1,
      graphics: {
        quality: 'medium',
        fpsLimit: 60,
        showFPS: false,
        ...((current as { graphics?: object }).graphics ?? {}),
      },
      audio: {
        masterVolume: 0.8,
        musicVolume: 0.6,
        effectsVolume: 0.8,
        uiSounds: true,
        ...((current as { audio?: object }).audio ?? {}),
      },
      gameplay: {
        gameSpeed: 1.0,
        autosaveEnabled: true,
        autosaveInterval: 60,
        showMinimap: true,
        notificationsEnabled: true,
        ...((current as { gameplay?: object }).gameplay ?? {}),
      },
    };
  }

  // Futuras migraciones: añadir aquí
  // if (version < 2) { ... }

  return current;
}

// ────────────────────────────────────────────────
// Utilidades de debug
// ────────────────────────────────────────────────

/** Elimina todos los settings guardados (útil para testing) */
export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[SettingsStorage] No se pudo limpiar:', e);
  }
}
