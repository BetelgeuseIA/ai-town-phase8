import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────
export interface Building {
  id: string;
  name: string;
  icon: string; // emoji
  description: string;
  cost: {
    wood: number;
    stone: number;
    food: number;
  };
  buildTime: number; // segundos
  unlocked: boolean;
}

export interface Resources {
  wood: number;
  stone: number;
  food: number;
}

interface BuildingPanelProps {
  buildings: Building[];
  resources: Resources;
  onBuild: (buildingId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

const canAfford = (building: Building, resources: Resources): boolean => {
  return (
    resources.wood >= building.cost.wood &&
    resources.stone >= building.cost.stone &&
    resources.food >= building.cost.food
  );
};

const formatCost = (amount: number): string => {
  if (amount === 0) return '';
  return amount.toString();
};

// ────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────

export const BuildingPanel: React.FC<BuildingPanelProps> = ({
  buildings,
  resources,
  onBuild,
  isOpen,
  onToggle,
}) => {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null
  );

  return (
    <>
      {/* ─ Toggle button ─ */}
      <motion.button
        onClick={onToggle}
        className="fixed bottom-4 left-1/2 z-50 px-6 py-2.5 font-display text-base uppercase tracking-wider text-[#fec742] border-2 border-[#6e2146] bg-[#181425]/90 backdrop-blur-sm rounded-sm"
        style={{
          transform: 'translateX(-50%)',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
        }}
        whileHover={{ scale: 1.05, backgroundColor: 'rgba(24,20,37,0.98)' }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.1 }}
      >
        {isOpen ? '❌ Cerrar' : '🏗️ Construir'}
      </motion.button>

      {/* ─ Panel deslizable ─ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-16 left-1/2 z-40 w-full max-w-2xl px-4"
            style={{ transform: 'translateX(-50%)' }}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div
              className="p-4 rounded-sm"
              style={{
                borderWidth: '12px',
                borderImageSource: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='1' y='1' width='14' height='14' fill='%233A4466'/%3E%3Crect x='0' y='0' width='16' height='16' fill='none' stroke='%23181425' stroke-width='2'/%3E%3Crect x='2' y='2' width='12' height='12' fill='%234a5476'/%3E%3C/svg%3E")`,
                borderImageRepeat: 'stretch',
                borderImageSlice: '12.5%',
                backgroundColor: '#171421',
              }}
            >
              {/* Título */}
              <h3 className="font-display text-xl text-[#fec742] text-center mb-4 drop-shadow-[0_1px_0_#6e2146]">
                🏗️ Edificios
              </h3>

              {/* Grid de edificios */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {buildings.map((building) => {
                  const affordable = canAfford(building, resources);
                  const locked = !building.unlocked;
                  const isSelected = selectedBuilding?.id === building.id;

                  return (
                    <motion.div
                      key={building.id}
                      className="relative cursor-pointer rounded-sm p-3 border-2 transition-colors"
                      style={{
                        borderColor: isSelected
                          ? '#fec742'
                          : locked
                            ? '#2a2535'
                            : '#262b44',
                        backgroundColor: isSelected
                          ? '#3a4466'
                          : locked
                            ? '#181425'
                            : '#1f1d2e',
                      }}
                      onClick={() => {
                        if (locked) return;
                        setSelectedBuilding(
                          isSelected ? null : building
                        );
                      }}
                      whileHover={
                        !locked
                          ? {
                              scale: 1.04,
                              borderColor: '#fec742',
                              backgroundColor: '#2a3045',
                            }
                          : {}
                      }
                      whileTap={!locked ? { scale: 0.96 } : {}}
                      transition={{ duration: 0.1 }}
                    >
                      {/* Icono */}
                      <div className="text-center mb-2">
                        <span className="text-3xl block mb-1">
                          {locked ? '🔒' : building.icon}
                        </span>
                        <span className="font-display text-sm text-[#d4cfc8] leading-tight block">
                          {locked ? '???' : building.name}
                        </span>
                      </div>

                      {/* Costos */}
                      {!locked && (
                        <div className="flex justify-center gap-2 text-xs font-body">
                          {building.cost.wood > 0 && (
                            <span
                              className={
                                resources.wood >= building.cost.wood
                                  ? 'text-[#c19a6b]'
                                  : 'text-[#8b3a3a]'
                              }
                            >
                              🪵{formatCost(building.cost.wood)}
                            </span>
                          )}
                          {building.cost.stone > 0 && (
                            <span
                              className={
                                resources.stone >= building.cost.stone
                                  ? 'text-[#8b9bb4]'
                                  : 'text-[#8b3a3a]'
                              }
                            >
                              🪨{formatCost(building.cost.stone)}
                            </span>
                          )}
                          {building.cost.food > 0 && (
                            <span
                              className={
                                resources.food >= building.cost.food
                                  ? 'text-[#d4a843]'
                                  : 'text-[#8b3a3a]'
                              }
                            >
                              🌾{formatCost(building.cost.food)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Overlay disabled */}
                      {!affordable && building.unlocked && (
                        <div className="absolute inset-0 rounded-sm bg-[#181425]/70 flex items-center justify-center">
                          <span className="font-body text-xs uppercase text-[#8b3a3a] bg-[#181425] px-2 py-1 rounded-sm border border-[#6e2146]">
                            Sin recursos
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Detalle + botón construir */}
              <AnimatePresence>
                {selectedBuilding && (
                  <motion.div
                    className="mt-4 p-3 rounded-sm border-2 border-[#fec742]/30 bg-[#181425]"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-display text-base text-[#fec742] mb-1">
                          {selectedBuilding.icon} {selectedBuilding.name}
                        </h4>
                        <p className="font-body text-xs text-[#8b9bb4] leading-relaxed">
                          {selectedBuilding.description}
                        </p>
                        <div className="mt-2 font-body text-xs text-[#8b9bb4]">
                          ⏱ Tiempo: {selectedBuilding.buildTime}s
                        </div>
                      </div>
                      <motion.button
                        onClick={() => {
                          onBuild(selectedBuilding.id);
                          setSelectedBuilding(null);
                        }}
                        className="px-5 py-2.5 font-display text-sm uppercase tracking-wider text-[#181425] rounded-sm border-2 border-[#6e2146] bg-[#fec742]"
                        whileHover={{ scale: 1.05, backgroundColor: '#ffe066' }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                      >
                        ⚒️ Construir
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BuildingPanel;
