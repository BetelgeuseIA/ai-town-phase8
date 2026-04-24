import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  GameSettings,
  DEFAULT_SETTINGS,
  GraphicsQuality,
  FPS_LIMITS,
  FpsLimit,
  CONTROL_BINDINGS,
} from '../settings/GameSettings';
import { loadSettings, saveSettings, resetSettings } from '../settings/SettingsStorage';

// ────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────
type TabId = 'graphics' | 'audio' | 'gameplay' | 'controls';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'graphics',  label: 'Gráficos',  icon: '🎮' },
  { id: 'audio',     label: 'Audio',     icon: '🔊' },
  { id: 'gameplay',  label: 'Juego',     icon: '⚡' },
  { id: 'controls',  label: 'Controles', icon: '⌨️' },
];

const QUALITY_OPTIONS: { value: GraphicsQuality; label: string }[] = [
  { value: 'low',    label: 'Bajo' },
  { value: 'medium', label: 'Medio' },
  { value: 'high',   label: 'Alto' },
];

const FPS_LABELS: Record<number, string> = {
  0:   'Sin límite',
  30:  '30 FPS',
  60:  '60 FPS',
  120: '120 FPS',
  144: '144 FPS',
  240: '240 FPS',
};

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: GameSettings) => void;
}

// ────────────────────────────────────────────────
// Sub-componente: slider con etiqueta de valor
// ────────────────────────────────────────────────
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}

const SettingSlider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 0.05,
  onChange,
  formatValue = (v) => `${Math.round(v * 100)}%`,
}) => {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-body text-sm text-[#d4cfc8]">{label}</span>
        <span className="font-body text-sm text-[#fec742] tabular-nums">
          {formatValue(value)}
        </span>
      </div>
      <div className="relative h-2 rounded-sm bg-[#181425] border border-[#2a2535]">
        <div
          className="absolute left-0 top-0 h-full rounded-sm bg-gradient-to-r from-[#6e2146] to-[#fec742]"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────
// Sub-componente: toggle on/off
// ────────────────────────────────────────────────
interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const SettingToggle: React.FC<ToggleProps> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between mb-4">
    <span className="font-body text-sm text-[#d4cfc8]">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className="relative w-12 h-6 rounded-sm border-2 transition-colors duration-200"
      style={{
        backgroundColor: checked ? '#fec742' : '#181425',
        borderColor: checked ? '#6e2146' : '#2a2535',
      }}
    >
      <motion.div
        className="absolute top-0.5 w-4 h-4 rounded-sm bg-[#d4cfc8]"
        animate={{ left: checked ? 'calc(100% - 18px)' : '2px' }}
        transition={{ duration: 0.15 }}
      />
    </button>
  </div>
);

// ────────────────────────────────────────────────
// Sub-componente: selector de opción
// ────────────────────────────────────────────────
interface OptionSelectorProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function SettingOptionSelector<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: OptionSelectorProps<T>) {
  return (
    <div className="mb-4">
      <div className="font-body text-sm text-[#d4cfc8] mb-2">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 font-body text-xs rounded-sm border-2 transition-colors duration-150"
            style={{
              backgroundColor: value === opt.value ? '#fec742' : '#181425',
              borderColor: value === opt.value ? '#6e2146' : '#2a2535',
              color: value === opt.value ? '#181425' : '#d4cfc8',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Panel genérico de sección con borde decorativo
// ────────────────────────────────────────────────
const SectionBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="p-4 rounded-sm mb-4"
    style={{
      borderWidth: '8px',
      borderImageSource: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='1' y='1' width='14' height='14' fill='%233A4466'/%3E%3Crect x='0' y='0' width='16' height='16' fill='none' stroke='%23181425' stroke-width='2'/%3E%3Crect x='2' y='2' width='12' height='12' fill='%234a5476'/%3E%3C/svg%3E")`,
      borderImageRepeat: 'stretch',
      borderImageSlice: '12.5%',
      backgroundColor: '#171421',
    }}
  >
    {children}
  </div>
);

// ────────────────────────────────────────────────
// Pestaña: Gráficos
// ────────────────────────────────────────────────
const GraphicsTab: React.FC<{ s: GameSettings['graphics']; onChange: (g: GameSettings['graphics']) => void }> = ({ s, onChange }) => (
  <div>
    <SettingOptionSelector<GraphicsQuality>
      label="Calidad gráfica"
      value={s.quality}
      options={QUALITY_OPTIONS}
      onChange={(q) => onChange({ ...s, quality: q })}
    />
    <SettingOptionSelector<FpsLimit>
      label="Límite de FPS"
      value={s.fpsLimit}
      options={FPS_LIMITS.map((f) => ({ value: f, label: FPS_LABELS[f] ?? `${f}` }))}
      onChange={(f) => onChange({ ...s, fpsLimit: f })}
    />
    <SettingToggle
      label="Mostrar contador de FPS"
      checked={s.showFPS}
      onChange={(v) => onChange({ ...s, showFPS: v })}
    />
  </div>
);

// ────────────────────────────────────────────────
// Pestaña: Audio
// ────────────────────────────────────────────────
const AudioTab: React.FC<{ s: GameSettings['audio']; onChange: (a: GameSettings['audio']) => void }> = ({ s, onChange }) => (
  <div>
    <SettingSlider
      label="Volumen master"
      value={s.masterVolume}
      min={0}
      max={1}
      onChange={(v) => onChange({ ...s, masterVolume: v })}
    />
    <SettingSlider
      label="Volumen música"
      value={s.musicVolume}
      min={0}
      max={1}
      onChange={(v) => onChange({ ...s, musicVolume: v })}
    />
    <SettingSlider
      label="Volumen efectos"
      value={s.effectsVolume}
      min={0}
      max={1}
      onChange={(v) => onChange({ ...s, effectsVolume: v })}
    />
    <SettingToggle
      label="Sonidos de interfaz"
      checked={s.uiSounds}
      onChange={(v) => onChange({ ...s, uiSounds: v })}
    />
  </div>
);

// ────────────────────────────────────────────────
// Pestaña: Gameplay
// ────────────────────────────────────────────────
const GameplayTab: React.FC<{ s: GameSettings['gameplay']; onChange: (g: GameSettings['gameplay']) => void }> = ({ s, onChange }) => (
  <div>
    <SettingSlider
      label="Velocidad del juego"
      value={s.gameSpeed}
      min={0.5}
      max={3.0}
      step={0.1}
      formatValue={(v) => `${v.toFixed(1)}x`}
      onChange={(v) => onChange({ ...s, gameSpeed: v })}
    />
    <SettingToggle
      label="Autosave automático"
      checked={s.autosaveEnabled}
      onChange={(v) => onChange({ ...s, autosaveEnabled: v })}
    />
    {s.autosaveEnabled && (
      <SettingSlider
        label="Intervalo de autosave"
        value={s.autosaveInterval}
        min={10}
        max={300}
        step={10}
        formatValue={(v) => v < 60 ? `${v}s` : `${Math.round(v / 60)}m`}
        onChange={(v) => onChange({ ...s, autosaveInterval: v })}
      />
    )}
    <SettingToggle
      label="Mostrar minimapa"
      checked={s.showMinimap}
      onChange={(v) => onChange({ ...s, showMinimap: v })}
    />
    <SettingToggle
      label="Notificaciones"
      checked={s.notificationsEnabled}
      onChange={(v) => onChange({ ...s, notificationsEnabled: v })}
    />
  </div>
);

// ────────────────────────────────────────────────
// Pestaña: Controles (solo lectura)
// ────────────────────────────────────────────────
const ControlsTab: React.FC = () => {
  const categories = [...new Set(CONTROL_BINDINGS.map((b) => b.category))];

  return (
    <div className="max-h-80 overflow-y-auto pr-1 custom-scrollbar">
      {categories.map((cat) => (
        <div key={cat} className="mb-4">
          <h4 className="font-display text-sm text-[#fec742] mb-2 uppercase tracking-wider">
            {cat}
          </h4>
          <div className="space-y-1.5">
            {CONTROL_BINDINGS.filter((b) => b.category === cat).map((b) => (
              <div
                key={b.key}
                className="flex items-center justify-between py-1.5 px-3 rounded-sm"
                style={{ backgroundColor: '#1f1d2e', border: '1px solid #2a2535' }}
              >
                <span className="font-body text-xs text-[#8b9bb4]">{b.label}</span>
                <kbd className="font-body text-xs text-[#d4cfc8] bg-[#181425] px-2 py-0.5 rounded-sm border border-[#3a4466]">
                  {b.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ────────────────────────────────────────────────
// Componente principal: SettingsMenu
// ────────────────────────────────────────────────
export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  isOpen,
  onClose,
  onSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('graphics');
  const [draft, setDraft] = useState<GameSettings>(loadSettings());
  const [hasChanges, setHasChanges] = useState(false);

  // Sincronizar draft cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setDraft(loadSettings());
      setHasChanges(false);
      setActiveTab('graphics');
    }
  }, [isOpen]);

  const update = useCallback(
    <K extends keyof GameSettings>(section: K, data: GameSettings[K]) => {
      setDraft((prev) => {
        const next = { ...prev, [section]: data };
        setHasChanges(
          JSON.stringify(next) !== JSON.stringify(loadSettings())
        );
        return next;
      });
    },
    []
  );

  const handleSave = useCallback(() => {
    saveSettings(draft);
    onSettingsChange?.(draft);
    setHasChanges(false);
    onClose();
  }, [draft, onClose, onSettingsChange]);

  const handleReset = useCallback(() => {
    const defaults = resetSettings();
    setDraft(defaults);
    setHasChanges(true);
  }, []);

  const handleCancel = useCallback(() => {
    setDraft(loadSettings());
    setHasChanges(false);
    onClose();
  }, [onClose]);

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay oscuro */}
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(10,8,16,0.82)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCancel}
          >
            {/* Modal */}
            <motion.div
              className="w-full max-w-lg"
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Borde decorativo */}
              <div
                className="p-5 rounded-sm"
                style={{
                  borderWidth: '12px',
                  borderImageSource: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='1' y='1' width='14' height='14' fill='%233A4466'/%3E%3Crect x='0' y='0' width='16' height='16' fill='none' stroke='%23181425' stroke-width='2'/%3E%3Crect x='2' y='2' width='12' height='12' fill='%234a5476'/%3E%3C/svg%3E")`,
                  borderImageRepeat: 'stretch',
                  borderImageSlice: '12.5%',
                  backgroundColor: '#171421',
                }}
              >
                {/* Título */}
                <div className="text-center mb-4">
                  <h2 className="font-display text-2xl text-[#fec742] uppercase tracking-widest drop-shadow-[0_1px_0_#6e2146]">
                    ⚙️ Configuración
                  </h2>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-4 p-1 rounded-sm" style={{ backgroundColor: '#181425' }}>
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-sm font-display text-xs uppercase tracking-wider transition-all duration-150"
                      style={{
                        backgroundColor: activeTab === tab.id ? '#3a4466' : 'transparent',
                        color: activeTab === tab.id ? '#fec742' : '#8b9bb4',
                        border: activeTab === tab.id ? '1px solid #6e2146' : '1px solid transparent',
                      }}
                    >
                      <span>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Contenido del tab */}
                <div className="mb-5" style={{ minHeight: 260 }}>
                  {activeTab === 'graphics' && (
                    <GraphicsTab
                      s={draft.graphics}
                      onChange={(g) => update('graphics', g)}
                    />
                  )}
                  {activeTab === 'audio' && (
                    <AudioTab
                      s={draft.audio}
                      onChange={(a) => update('audio', a)}
                    />
                  )}
                  {activeTab === 'gameplay' && (
                    <GameplayTab
                      s={draft.gameplay}
                      onChange={(g) => update('gameplay', g)}
                    />
                  )}
                  {activeTab === 'controls' && <ControlsTab />}
                </div>

                {/* Botones */}
                <div className="flex items-center justify-between gap-3">
                  <motion.button
                    onClick={handleReset}
                    className="px-4 py-2 font-display text-xs uppercase tracking-wider rounded-sm border-2 transition-colors duration-150"
                    style={{ borderColor: '#6e2146', color: '#8b9bb4', backgroundColor: 'transparent' }}
                    whileHover={{ borderColor: '#fec742', color: '#d4cfc8' }}
                    whileTap={{ scale: 0.96 }}
                  >
                    Reset
                  </motion.button>

                  <div className="flex gap-3">
                    <motion.button
                      onClick={handleCancel}
                      className="px-5 py-2.5 font-display text-sm uppercase tracking-wider rounded-sm border-2 transition-colors duration-150"
                      style={{ borderColor: '#2a2535', color: '#8b9bb4', backgroundColor: 'transparent' }}
                      whileHover={{ borderColor: '#6e2146', color: '#d4cfc8' }}
                      whileTap={{ scale: 0.96 }}
                    >
                      Cancelar
                    </motion.button>

                    <motion.button
                      onClick={handleSave}
                      className="px-6 py-2.5 font-display text-sm uppercase tracking-wider rounded-sm border-2 transition-colors duration-150"
                      style={{
                        borderColor: hasChanges ? '#6e2146' : '#2a2535',
                        color: hasChanges ? '#181425' : '#8b9bb4',
                        backgroundColor: hasChanges ? '#fec742' : 'transparent',
                        cursor: hasChanges ? 'pointer' : 'not-allowed',
                      }}
                      whileHover={hasChanges ? { scale: 1.04, backgroundColor: '#ffe066' } : {}}
                      whileTap={hasChanges ? { scale: 0.96 } : {}}
                    >
                      Guardar
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsMenu;
