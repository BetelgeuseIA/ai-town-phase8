import React from 'react';
import type { Doc } from '../../../convex/_generated/dataModel';

interface BuildingAvatarProps {
  building: Doc<'buildings'>;
  index: number;
}

const BUILDING_CONFIG: Record<string, { color: string; icon: string; name: string }> = {
  shelter: { color: '#d97706', icon: '🏠', name: 'Shelter' },
  storage: { color: '#92400e', icon: '📦', name: 'Storage' },
  watchtower: { color: '#7c3aed', icon: '🗼', name: 'Watchtower' },
  farm: { color: '#16a34a', icon: '🚜', name: 'Farm' },
};

export default function BuildingAvatar({ building, index }: BuildingAvatarProps) {
  const config = BUILDING_CONFIG[building.type] || { color: '#6b7280', icon: '🏗️', name: 'Building' };
  const isActive = building.status === 'active';
  const isConstruction = building.status === 'under_construction';
  const progress = building.progress || 0;
  const duration = building.durationTicks || 1;
  const progressPct = Math.min(100, (progress / duration) * 100);

  return (
    <div
      className="building-avatar"
      style={{
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
        transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      title={`${config.name} - ${building.status}`}
    >
      <svg
        width={96}
        height={112}
        viewBox="0 0 48 56"
        style={{
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5)) drop-shadow(0 0 8px rgba(0,0,0,0.3))',
          animation: isConstruction ? 'build-pulse 1s infinite' : 'none',
        }}
      >
        {/* Base / Foundation */}
        <rect
          x={4}
          y={40}
          width={40}
          height={12}
          rx={2}
          fill="rgba(0,0,0,0.3)"
        />

        {/* Building shape based on type */}
        {building.type === 'shelter' && (
          <>
            {/* House body */}
            <rect x={8} y={20} width={32} height={24} rx={3} fill={config.color} fillOpacity={0.8} stroke={config.color} strokeWidth={2} />
            {/* Roof */}
            <polygon points="24,8 40,20 8,20" fill={config.color} fillOpacity={0.9} />
            {/* Door */}
            <rect x={18} y={32} width={12} height={12} rx={2} fill="rgba(0,0,0,0.4)" />
            {/* Window */}
            <rect x={12} y={24} width={8} height={8} rx={2} fill="rgba(255,255,255,0.3)" />
            <rect x={28} y={24} width={8} height={8} rx={2} fill="rgba(255,255,255,0.3)" />
          </>
        )}

        {building.type === 'storage' && (
          <>
            {/* Warehouse body */}
            <rect x={6} y={14} width={36} height={32} rx={3} fill={config.color} fillOpacity={0.7} stroke={config.color} strokeWidth={2} />
            {/* Door */}
            <rect x={16} y={30} width={16} height={16} rx={2} fill="rgba(0,0,0,0.4)" />
            {/* Top stripe */}
            <rect x={6} y={18} width={36} height={4} fill={config.color} fillOpacity={0.9} />
          </>
        )}

        {building.type === 'watchtower' && (
          <>
            {/* Tower body */}
            <rect x={14} y={12} width={20} height={36} rx={2} fill={config.color} fillOpacity={0.7} stroke={config.color} strokeWidth={2} />
            {/* Platform */}
            <rect x={8} y={10} width={32} height={6} rx={2} fill={config.color} fillOpacity={0.9} />
            {/* Flag */}
            <line x1={26} y1={10} x2={26} y2={2} stroke="#ef4444" strokeWidth={2} />
            <polygon points="26,2 34,6 26,10" fill="#ef4444" />
          </>
        )}

        {building.type === 'farm' && (
          <>
            {/* Field */}
            <rect x={4} y={28} width={40} height={20} rx={3} fill="#16a34a" fillOpacity={0.3} stroke="#16a34a" strokeWidth={2} />
            {/* Rows */}
            <line x1={4} y1={34} x2={44} y2={34} stroke="#16a34a" strokeWidth={1} strokeOpacity={0.5} />
            <line x1={4} y1={40} x2={44} y2={40} stroke="#16a34a" strokeWidth={1} strokeOpacity={0.5} />
            <line x1={4} y1={46} x2={44} y2={46} stroke="#16a34a" strokeWidth={1} strokeOpacity={0.5} />
            {/* Barn */}
            <rect x={14} y={14} width={20} height={20} rx={2} fill={config.color} fillOpacity={0.8} stroke={config.color} strokeWidth={2} />
            <polygon points="24,8 32,14 16,14" fill={config.color} />
          </>
        )}

        {/* Status indicator */}
        {isActive && (
          <circle cx={42} cy={8} r={4} fill="#22c55e" opacity={0.9}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
        )}

        {isConstruction && (
          <>
            <circle cx={42} cy={8} r={4} fill="#3b82f6" />
            {/* Progress ring */}
            <circle
              cx={24}
              cy={28}
              r={20}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray={`${progressPct * 1.26} 126`}
              strokeLinecap="round"
              opacity={0.6}
            />
          </>
        )}

        {/* Durability bar for active buildings */}
        {isActive && building.durability !== undefined && (
          <>
            <rect x={8} y={52} width={32} height={3} rx={1.5} fill="rgba(0,0,0,0.5)" />
            <rect
              x={8}
              y={52}
              width={(building.durability / 100) * 32}
              height={3}
              rx={1.5}
              fill="#22c55e"
            />
          </>
        )}
      </svg>

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          bottom: -24,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 13,
          color: 'rgba(255,255,255,0.9)',
          whiteSpace: 'nowrap',
          textShadow: '0 2px 4px rgba(0,0,0,0.7)',
          textAlign: 'center',
          fontWeight: 600,
        }}
      >
        <div>{config.icon} {config.name}</div>
        {isConstruction && <div style={{ fontSize: 9, color: '#60a5fa' }}>{Math.round(progressPct)}%</div>}
      </div>
    </div>
  );
}

// Add animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes build-pulse {
    0%, 100% { filter: brightness(1) drop-shadow(0 0 4px #3b82f6) drop-shadow(0 0 8px rgba(59,130,246,0.5)); }
    50% { filter: brightness(1.2) drop-shadow(0 0 8px #3b82f6) drop-shadow(0 0 16px rgba(59,130,246,0.7)); }
  }
`;
document.head.appendChild(styleSheet);
