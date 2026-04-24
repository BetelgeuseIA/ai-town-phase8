import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────
export interface Agent {
  id: string;
  name: string;
  role: string;
  health: number; // 0–100
  morale: number; // 0–100
  currentTask?: string;
  avatar?: string; // emoji o URL
}

interface AgentDetailsPanelProps {
  agent: Agent | null;
  onClose: () => void;
  onFollow: (agentId: string) => void;
  onDismiss: (agentId: string) => void;
}

// ────────────────────────────────────────────────
// Sub-componentes
// ────────────────────────────────────────────────

const StatBar: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-0.5">
        <span className="text-xs font-body uppercase tracking-wider text-[#8b9bb4]">
          {label}
        </span>
        <span className="text-xs font-body text-white">{clamped}%</span>
      </div>
      <div className="h-2.5 w-full rounded-sm overflow-hidden bg-[#181425]">
        <motion.div
          className="h-full rounded-sm"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

const ActionButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'danger';
}> = ({ onClick, children, variant = 'primary' }) => {
  const bgColor = variant === 'primary' ? '#3a4466' : '#6e2146';
  const hoverColor = variant === 'primary' ? '#4a5476' : '#8e3156';

  return (
    <motion.button
      onClick={onClick}
      className="relative px-4 py-2 font-body text-sm uppercase tracking-wider text-white rounded-sm border-2 border-[#262b44]"
      style={{ backgroundColor: bgColor }}
      whileHover={{ scale: 1.03, backgroundColor: hoverColor }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.button>
  );
};

// ────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────

export const AgentDetailsPanel: React.FC<AgentDetailsPanelProps> = ({
  agent,
  onClose,
  onFollow,
  onDismiss,
}) => {
  return (
    <AnimatePresence>
      {agent && (
        <motion.div
          className="fixed z-50"
          style={{ top: '1.5rem', right: '1.5rem' }}
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* ─ Card con borde pixelado ─ */}
          <div
            className="relative w-72 p-5"
            style={{
              borderWidth: '12px',
              borderImageSource: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='1' y='1' width='14' height='14' fill='%233A4466'/%3E%3Crect x='0' y='0' width='16' height='16' fill='none' stroke='%23181425' stroke-width='2'/%3E%3Crect x='2' y='2' width='12' height='12' fill='%234a5476'/%3E%3C/svg%3E")`,
              borderImageRepeat: 'stretch',
              borderImageSlice: '12.5%',
              backgroundColor: '#171421',
            }}
          >
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute top-1 right-2 text-[#8b9bb4] hover:text-white transition-colors font-body text-lg leading-none"
              aria-label="Cerrar"
            >
              ✕
            </button>

            {/* Avatar + Nombre + Rol */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-sm bg-[#3a4466] flex items-center justify-center text-2xl border-2 border-[#262b44]">
                {agent.avatar || '🤖'}
              </div>
              <div>
                <h3 className="font-display text-lg text-[#fec742] leading-tight drop-shadow-[0_1px_0_#6e2146]">
                  {agent.name}
                </h3>
                <span className="font-body text-xs uppercase tracking-wider text-[#8b9bb4]">
                  {agent.role}
                </span>
              </div>
            </div>

            {/* Separador */}
            <div className="h-px w-full bg-[#262b44] mb-3" />

            {/* Stats */}
            <div className="mb-3">
              <StatBar label="Salud" value={agent.health} color="#e74c3c" />
              <StatBar label="Moral" value={agent.morale} color="#2ecc71" />
            </div>

            {/* Tarea actual */}
            {agent.currentTask && (
              <div className="mb-4">
                <span className="text-xs font-body uppercase tracking-wider text-[#8b9bb4] block mb-1">
                  Tarea actual
                </span>
                <div className="flex items-center gap-2 bg-[#181425] rounded-sm px-3 py-2 border border-[#262b44]">
                  <span className="text-sm">⚡</span>
                  <span className="font-body text-sm text-[#d4cfc8]">
                    {agent.currentTask}
                  </span>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2">
              <ActionButton
                onClick={() => onFollow(agent.id)}
                variant="primary"
              >
                👁 Seguir
              </ActionButton>
              <ActionButton
                onClick={() => onDismiss(agent.id)}
                variant="danger"
              >
                ✕ Despedir
              </ActionButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgentDetailsPanel;
