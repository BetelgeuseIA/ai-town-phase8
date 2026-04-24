// ────────────────────────────────────────────────
// GameSettings.ts — Tipos, interfaces y valores por defecto
// ────────────────────────────────────────────────

// ── Calidad gráfica ──
export type GraphicsQuality = 'low' | 'medium' | 'high';

// ── Límite de FPS ──
export const FPS_LIMITS = [30, 60, 120, 144, 240, 0] as const; // 0 = unlimited
export type FpsLimit = (typeof FPS_LIMITS)[number];

// ── Configuración de gráficos ──
export interface GraphicsSettings {
  quality: GraphicsQuality;
  fpsLimit: FpsLimit;
  showFPS: boolean;
}

// ── Configuración de audio ──
export interface AudioSettings {
  masterVolume: number;   // 0–1
  musicVolume: number;    // 0–1
  effectsVolume: number;  // 0–1
  uiSounds: boolean;
}

// ── Configuración de gameplay ──
export interface GameplaySettings {
  gameSpeed: number;       // 0.5 – 3.0
  autosaveEnabled: boolean;
  autosaveInterval: number; // segundos
  showMinimap: boolean;
  notificationsEnabled: boolean;
}

// ── Controles (solo lectura / visualización) ──
export interface ControlBinding {
  key: string;
  label: string;
  category: string;
}

export const CONTROL_BINDINGS: ControlBinding[] = [
  // Movimiento
  { key: 'W / ↑', label: 'Mover arriba', category: 'Movimiento' },
  { key: 'S / ↓', label: 'Mover abajo', category: 'Movimiento' },
  { key: 'A / ←', label: 'Mover izquierda', category: 'Movimiento' },
  { key: 'D / →', label: 'Mover derecha', category: 'Movimiento' },
  // Cámara
  { key: 'Scroll', label: 'Zoom', category: 'Cámara' },
  { key: 'Click + Drag', label: 'Rotar cámara', category: 'Cámara' },
  // Generales
  { key: 'ESC', label: 'Menú / Pausar', category: 'General' },
  { key: 'M', label: 'Silenciar audio', category: 'General' },
  { key: 'Space', label: 'Acción rápida / Confirmar', category: 'General' },
  // Edificios
  { key: 'B', label: 'Panel de edificios', category: 'Edificios' },
  { key: '1–5', label: 'Seleccionar edificio', category: 'Edificios' },
  // Agentes
  { key: 'Click agente', label: 'Seleccionar agente', category: 'Agentes' },
  { key: 'E', label: 'Interactuar con agente', category: 'Agentes' },
  { key: 'I', label: 'Panel de agente', category: 'Agentes' },
];

// ── Configuración completa ──
export interface GameSettings {
  version: number;
  graphics: GraphicsSettings;
  audio: AudioSettings;
  gameplay: GameplaySettings;
}

// ────────────────────────────────────────────────
// Valores por defecto
// ────────────────────────────────────────────────
export const DEFAULT_GRAPHICS: GraphicsSettings = {
  quality: 'medium',
  fpsLimit: 60,
  showFPS: false,
};

export const DEFAULT_AUDIO: AudioSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  effectsVolume: 0.8,
  uiSounds: true,
};

export const DEFAULT_GAMEPLAY: GameplaySettings = {
  gameSpeed: 1.0,
  autosaveEnabled: true,
  autosaveInterval: 60,
  showMinimap: true,
  notificationsEnabled: true,
};

export const DEFAULT_SETTINGS: GameSettings = {
  version: 1,
  graphics: DEFAULT_GRAPHICS,
  audio: DEFAULT_AUDIO,
  gameplay: DEFAULT_GAMEPLAY,
};

// ────────────────────────────────────────────────
// Validación y sanitización
// ────────────────────────────────────────────────

const QUALITY_OPTIONS: GraphicsQuality[] = ['low', 'medium', 'high'];
const SPEED_MIN = 0.5;
const SPEED_MAX = 3.0;
const VOLUME_MIN = 0;
const VOLUME_MAX = 1;

/** Sanitiza un valor de calidadgraphics, devuelve default si es inválido */
export function sanitizeQuality(v: unknown): GraphicsQuality {
  if (typeof v === 'string' && QUALITY_OPTIONS.includes(v as GraphicsQuality)) {
    return v as GraphicsQuality;
  }
  return DEFAULT_GRAPHICS.quality;
}

/** Sanitiza FPS, devuelve default si no está en la lista */
export function sanitizeFpsLimit(v: unknown): FpsLimit {
  if (FPS_LIMITS.includes(v as FpsLimit)) return v as FpsLimit;
  return DEFAULT_GRAPHICS.fpsLimit;
}

/** Sanitiza volumen 0–1 */
export function sanitizeVolume(v: unknown): number {
  const n = Number(v);
  if (isNaN(n)) return DEFAULT_AUDIO.masterVolume;
  return Math.max(VOLUME_MIN, Math.min(VOLUME_MAX, n));
}

/** Sanitiza velocidad del juego */
export function sanitizeGameSpeed(v: unknown): number {
  const n = Number(v);
  if (isNaN(n)) return DEFAULT_GAMEPLAY.gameSpeed;
  return Math.max(SPEED_MIN, Math.min(SPEED_MAX, n));
}

/** Valida y sanitiza un objeto settings incompleto */
export function sanitizeSettings(raw: Partial<GameSettings>): GameSettings {
  return {
    version: typeof raw.version === 'number' ? raw.version : DEFAULT_SETTINGS.version,
    graphics: {
      quality: sanitizeQuality(raw.graphics?.quality),
      fpsLimit: sanitizeFpsLimit(raw.graphics?.fpsLimit),
      showFPS: Boolean(raw.graphics?.showFPS),
    },
    audio: {
      masterVolume: sanitizeVolume(raw.audio?.masterVolume),
      musicVolume: sanitizeVolume(raw.audio?.musicVolume),
      effectsVolume: sanitizeVolume(raw.audio?.effectsVolume),
      uiSounds: Boolean(raw.audio?.uiSounds),
    },
    gameplay: {
      gameSpeed: sanitizeGameSpeed(raw.gameplay?.gameSpeed),
      autosaveEnabled: Boolean(raw.gameplay?.autosaveEnabled),
      autosaveInterval: Math.max(10, Number(raw.gameplay?.autosaveInterval) || DEFAULT_GAMEPLAY.autosaveInterval),
      showMinimap: Boolean(raw.gameplay?.showMinimap),
      notificationsEnabled: Boolean(raw.gameplay?.notificationsEnabled),
    },
  };
}
