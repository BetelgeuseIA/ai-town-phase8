import React from 'react';
import { motion } from 'framer-motion';

// ────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────
export interface Resources {
  food: number;
  wood: number;
  stone: number;
}

export interface ResourceDelta {
  food: number;   // + / - por segundo
  wood: number;
  stone: number;
}

interface ResourceBarProps {
  resources: Resources;
  deltas?: ResourceDelta; // cambio por segundo (opcional)
  population?: { current: number; max: number };
}

// ────────────────────────────────────────────────
// Sub-componentes
// ────────────────────────────────────────────────

interface ResourceItemProps {
  icon: string;
  label: string;
  value: number;
  delta?: number;
  color: string;
  index: number;
}

const ResourceItem: React.FC<ResourceItemProps> = ({
  icon,
  label,
  value,
  delta,
  color,
  index,
}) => {
  const deltaPositive = (delta ?? 0) > 0;
  const deltaNegative = (delta ?? 0) < 0;
  const deltaZero = (delta ?? 0) === 0;

  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 rounded-sm border border-white/5"
      style={{ backgroundColor: 'rgba(23, 20, 33, 0.6)' }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.25 }}
    >
      {/* Icono */}
      <span className="text-xl select-none">{icon}</span>

      {/* Valor + etiqueta */}
      <div className="flex flex-col">
        <motion.span
          key={value} // re-animar al cambiar
          className="font-display text-lg leading-none"
          style={{ color }}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {value.toLocaleString()}
        </motion.span>

        {/* Delta */}
        <span
          className="font-body text-[10px] uppercase tracking-wider leading-none"
          style={{
            color: deltaPositive
              ? '#2ecc71'
              : deltaNegative
                ? '#e74c3c'
                : '#5a5a5a',
          }}
        >
          {deltaZero
            ? label
            : `${(delta ?? 0) > 0 ? '+' : ''}${delta ?? 0}/s`}
        </span>
      </div>
    </motion.div>
  );
};

const PopulationBadge: React.FC<{
  current: number;
  max: number;
}> = ({ current, max }) => {
  const isFull = current >= max;
  const isHigh = current / max > 0.8;

  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 rounded-sm border"
      style={{
        backgroundColor: 'rgba(23, 20, 33, 0.6)',
        borderColor: isFull
          ? '#e74c3c'
          : isHigh
            ? '#dd7c42'
            : 'rgba(255,255,255,0.05)',
      }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32, duration: 0.25 }}
    >
      <span className="text-xl select-none">👥</span>
      <div className="flex flex-col">
        <span
          className="font-display text-lg leading-none"
          style={{
            color: isFull ? '#e74c3c' : isHigh ? '#dd7c42' : '#fec742',
          }}
        >
          {current}/{max}
        </span>
        <span className="font-body text-[10px] uppercase tracking-wider text-[#8b9bb4] leading-none">
          Población
        </span>
      </div>
    </motion.div>
  );
};

// ────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────

export const ResourceBar: React.FC<ResourceBarProps> = ({
  resources,
  deltas,
  population,
}) => {
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-2.5"
      style={{
        background:
          'linear-gradient(to bottom, rgba(23, 20, 33, 0.92), rgba(23, 20, 33, 0.75))',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(38, 43, 68, 0.6)',
      }}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Recursos */}
      <ResourceItem
        icon="🌾"
        label="Comida"
        value={resources.food}
        delta={deltas?.food}
        color="#d4a843"
        index={0}
      />

      <ResourceItem
        icon="🪵"
        label="Madera"
        value={resources.wood}
        delta={deltas?.wood}
        color="#c19a6b"
        index={1}
      />

      <ResourceItem
        icon="🪨"
        label="Piedra"
        value={resources.stone}
        delta={deltas?.stone}
        color="#8b9bb4"
        index={2}
      />

      {/* Separador */}
      <div className="w-px h-8 bg-white/10" />

      {/* Población */}
      {population && (
        <PopulationBadge
          current={population.current}
          max={population.max}
        />
      )}

      {/* Reloj del juego */}
      <GameClock />
    </motion.div>
  );
};

// ─ Reloj del juego ─
const GameClock: React.FC = () => {
  const [time, setTime] = React.useState(0); // minutos desde inicio

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => t + 1);
    }, 1000); // cada segundo = 1 minuto de juego
    return () => clearInterval(interval);
  }, []);

  const day = Math.floor(time / 1440) + 1;
  const hour = Math.floor((time % 1440) / 60);
  const minute = time % 60;

  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 rounded-sm border border-white/5"
      style={{ backgroundColor: 'rgba(23, 20, 33, 0.6)' }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.25 }}
    >
      <span className="text-xl select-none">🌅</span>
      <div className="flex flex-col">
        <span className="font-display text-lg text-[#fec742] leading-none">
          {timeString}
        </span>
        <span className="font-body text-[10px] uppercase tracking-wider text-[#8b9bb4] leading-none">
          Día {day}
        </span>
      </div>
    </motion.div>
  );
};

export default ResourceBar;
