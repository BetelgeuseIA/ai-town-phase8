import { useState, useMemo } from 'react';
import type { Doc } from '../../../convex/_generated/dataModel';
import AgentAvatar from './AgentAvatar';
import BuildingAvatar from './BuildingAvatar';

interface Props {
  agents: Doc<'agentNeeds'>[];
  tasks: Doc<'taskQueue'>[];
  buildings: Doc<'buildings'>[];
  households: Doc<'households'>[];
  crisisLevel?: string;
}

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 1000;

const ZONES = {
  center: { x: 500, y: 350, label: 'Settlement' },
  forest: { x: 150, y: 350, label: 'Forest' },
  quarry: { x: 850, y: 350, label: 'Quarry' },
  farm: { x: 500, y: 120, label: 'Farm' },
  construction: { x: 500, y: 580, label: 'Construction' },
};

function getAgentPosition(taskType?: string) {
  switch (taskType) {
    case 'gather_food': return ZONES.farm;
    case 'gather_wood': return ZONES.forest;
    case 'gather_stone': return ZONES.quarry;
    case 'rest':
    case 'eat': return ZONES.center;
    case 'idle': return ZONES.center;
    default: return ZONES.center;
  }
}

function getBuildingPosition(type: string, index: number) {
  const offset = index * 80;
  switch (type) {
    case 'shelter': return { x: 420 + offset, y: 300 };
    case 'storage': return { x: 420 + offset, y: 400 };
    case 'watchtower': return { x: 380, y: 200 + offset };
    case 'farm': return { x: 620, y: 150 + offset };
    default: return { x: 500 + offset, y: 350 };
  }
}

// Distribute agents in a circle around zone center
function getAgentOffset(index: number, totalInZone: number) {
  if (totalInZone <= 1) return { x: 0, y: 0 };
  const angle = (index / totalInZone) * 2 * Math.PI;
  const radius = 120 + (index % 3) * 50;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

export default function SettlementLiveView({ agents, tasks, buildings, crisisLevel }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const crisisColor =
    crisisLevel === 'collapse' ? '#ef4444' :
    crisisLevel === 'critical' ? '#f97316' :
    crisisLevel === 'strained' ? '#eab308' :
    crisisLevel === 'watch' ? '#fbbf24' : '#10b981';

  const agentsByZone = useMemo(() => {
    const groups: Record<string, Array<{ agent: Doc<'agentNeeds'>; task?: Doc<'taskQueue'>; offset: { x: number; y: number } }>> = {};
    
    agents.forEach((agent, i) => {
      const activeTask = tasks.find(t =>
        t.playerId === agent.playerId &&
        (t.status === 'pending' || t.status === 'in_progress' || t.status === 'assigned')
      );
      const zone = getAgentPosition(activeTask?.type);
      const zoneKey = zone.label;
      
      if (!groups[zoneKey]) groups[zoneKey] = [];
      groups[zoneKey].push({ agent, task: activeTask, offset: { x: 0, y: 0 } });
    });

    Object.keys(groups).forEach(zoneKey => {
      const zoneAgents = groups[zoneKey];
      zoneAgents.forEach((item, idx) => {
        item.offset = getAgentOffset(idx, zoneAgents.length);
      });
    });

    return groups;
  }, [agents, tasks]);

  const positionedAgents = useMemo(() => {
    const result: Array<{
      agent: Doc<'agentNeeds'>;
      task?: Doc<'taskQueue'>;
      pos: { x: number; y: number };
    }> = [];

    Object.values(agentsByZone).forEach(zoneAgents => {
      zoneAgents.forEach(({ agent, task, offset }) => {
        const basePos = getAgentPosition(task?.type);
        result.push({
          agent,
          task,
          pos: { x: basePos.x + offset.x, y: basePos.y + offset.y },
        });
      });
    });

    return result;
  }, [agentsByZone]);

  return (
    <div className="w-full">
      {/* FASE 7D MARKER - Visible confirmation */}
      <div style={{
        width: '100%',
        textAlign: 'center',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #7c3aed 100%)',
          color: 'white',
          padding: '12px 28px',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 4px 20px rgba(124,58,237,0.5), 0 0 40px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.2)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          🎮 FASE 7D ACTIVE — Animated Settlement View
        </div>
      </div>

      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗺️</span>
          <span className="text-sm font-semibold text-white/80">Settlement Live View</span>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full px-2 py-0.5 text-xs" style={{
            backgroundColor: crisisColor + '20',
            color: crisisColor,
            border: `1px solid ${crisisColor}40`
          }}>
            {crisisLevel?.toUpperCase() ?? 'STABLE'}
          </span>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white/60 hover:bg-white/20"
          >
            {showDebug ? 'Hide' : 'Debug'}
          </button>
        </div>
      </div>

      {/* Debug info */}
      {showDebug && (
        <div className="mb-2 rounded-lg border border-white/10 bg-black/60 p-2 text-[10px] text-white/60">
          <div>Agents: {agents.length} | Buildings: {buildings.length} | Tasks: {tasks.length}</div>
          <div>Crisis: {crisisLevel ?? 'none'}</div>
        </div>
      )}

      {/* Map container - larger on mobile */}
      <div 
        className="relative w-full overflow-x-auto overflow-y-hidden rounded-2xl border border-white/10 bg-black/40"
        style={{ 
          minHeight: '800px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.2) transparent',
        }}
      >
        <div 
          className="relative mx-auto"
          style={{ 
            width: '100%',
            maxWidth: MAP_WIDTH,
            minHeight: MAP_HEIGHT,
            height: MAP_HEIGHT,
          }}
        >
          {/* SVG Map Background */}
          <svg 
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Base */}
            <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#0d1117" rx={16} />

            {/* Farm zone - gradient */}
            <defs>
              <linearGradient id="farmGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(34,197,94,0.15)" />
                <stop offset="100%" stopColor="rgba(34,197,94,0.05)" />
              </linearGradient>
              <linearGradient id="forestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(21,128,61,0.15)" />
                <stop offset="100%" stopColor="rgba(21,128,61,0.05)" />
              </linearGradient>
              <linearGradient id="quarryGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(120,53,15,0.15)" />
                <stop offset="100%" stopColor="rgba(120,53,15,0.05)" />
              </linearGradient>
              <linearGradient id="constructionGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="rgba(59,130,246,0.12)" />
                <stop offset="100%" stopColor="rgba(59,130,246,0.04)" />
              </linearGradient>
              <linearGradient id="centerGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
              </linearGradient>
              <filter id="zoneShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="rgba(0,0,0,0.3)" />
              </filter>
            </defs>

            {/* Ground texture - settlement area */}
            <circle cx={500} cy={450} r={180} fill="url(#centerGrad)" filter="url(#zoneShadow)" />
            <circle cx={500} cy={450} r={160} fill="rgba(34,197,94,0.04)" stroke="rgba(34,197,94,0.15)" strokeWidth={1} strokeDasharray="8 4" />

            {/* Farm zone */}
            <rect x={350} y={20} width={300} height={220} rx={16}
              fill="url(#farmGrad)" stroke="rgba(34,197,94,0.3)" strokeWidth={2} strokeDasharray="6 3" filter="url(#zoneShadow)" />
            <text x={500} y={48} textAnchor="middle" fill="rgba(34,197,94,0.85)" fontSize={16} fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>🌾 Farm</text>
            {/* Field rows */}
            <line x1={370} y1={85} x2={630} y2={85} stroke="rgba(34,197,94,0.2)" strokeWidth={1} />
            <line x1={370} y1={120} x2={630} y2={120} stroke="rgba(34,197,94,0.2)" strokeWidth={1} />
            <line x1={370} y1={155} x2={630} y2={155} stroke="rgba(34,197,94,0.2)" strokeWidth={1} />
            <line x1={370} y1={190} x2={630} y2={190} stroke="rgba(34,197,94,0.2)" strokeWidth={1} />
            <line x1={370} y1={225} x2={630} y2={225} stroke="rgba(34,197,94,0.2)" strokeWidth={1} />

            {/* Forest zone */}
            <rect x={20} y={250} width={240} height={400} rx={16}
              fill="url(#forestGrad)" stroke="rgba(21,128,61,0.3)" strokeWidth={2} strokeDasharray="6 3" filter="url(#zoneShadow)" />
            <text x={140} y={278} textAnchor="middle" fill="rgba(21,128,61,0.85)" fontSize={16} fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>🌲 Forest</text>
            {/* Simple trees */}
            <circle cx={60} cy={340} r={18} fill="rgba(21,128,61,0.25)" />
            <circle cx={100} cy={380} r={22} fill="rgba(21,128,61,0.2)" />
            <circle cx={80} cy={440} r={16} fill="rgba(21,128,61,0.25)" />
            <circle cx={180} cy={360} r={20} fill="rgba(21,128,61,0.2)" />
            <circle cx={200} cy={430} r={18} fill="rgba(21,128,61,0.25)" />
            <circle cx={160} cy={500} r={24} fill="rgba(21,128,61,0.15)" />
            <circle cx={120} cy={560} r={18} fill="rgba(21,128,61,0.2)" />
            <circle cx={60} cy={600} r={20} fill="rgba(21,128,61,0.25)" />

            {/* Quarry zone */}
            <rect x={740} y={250} width={240} height={400} rx={16}
              fill="url(#quarryGrad)" stroke="rgba(120,53,15,0.3)" strokeWidth={2} strokeDasharray="6 3" filter="url(#zoneShadow)" />
            <text x={860} y={278} textAnchor="middle" fill="rgba(120,53,15,0.85)" fontSize={16} fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>⛰️ Quarry</text>
            {/* Rocks */}
            <polygon points="780,380 800,360 820,380 800,400" fill="rgba(120,53,15,0.25)" />
            <polygon points="840,420 860,400 880,420 860,440" fill="rgba(120,53,15,0.2)" />
            <polygon points="760,480 780,460 800,480 780,500" fill="rgba(120,53,15,0.25)" />
            <polygon points="840,520 860,500 880,520 860,540" fill="rgba(120,53,15,0.2)" />
            <polygon points="780,580 800,560 820,580 800,600" fill="rgba(120,53,15,0.25)" />

            {/* Construction zone */}
            <rect x={350} y={700} width={300} height={250} rx={16}
              fill="url(#constructionGrad)" stroke="rgba(59,130,246,0.3)" strokeWidth={2} strokeDasharray="6 3" filter="url(#zoneShadow)" />
            <text x={500} y={728} textAnchor="middle" fill="rgba(59,130,246,0.85)" fontSize={16} fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>🏗️ Construction</text>

            {/* Settlement center */}
            <circle cx={500} cy={450} r={130}
              fill="url(#centerGrad)" stroke={crisisColor} strokeWidth={3} strokeDasharray="8 4" filter="url(#zoneShadow)" />
            <text x={500} y={435} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={20} fontWeight="bold" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>🏘️ Settlement</text>
            <text x={500} y={465} textAnchor="middle" fill={crisisColor} fontSize={14} fontWeight="600">
              {agents.length} agents
            </text>

            {/* Connection lines from settlement to zones */}
            <line x1={500} y1={450} x2={500} y2={150} stroke="rgba(34,197,94,0.2)" strokeWidth={2} strokeDasharray="4 4" />
            <line x1={500} y1={450} x2={150} y2={450} stroke="rgba(21,128,61,0.2)" strokeWidth={2} strokeDasharray="4 4" />
            <line x1={500} y1={450} x2={850} y2={450} stroke="rgba(120,53,15,0.2)" strokeWidth={2} strokeDasharray="4 4" />
            <line x1={500} y1={450} x2={500} y2={750} stroke="rgba(59,130,246,0.2)" strokeWidth={2} strokeDasharray="4 4" />

            {/* Drag hint */}
            <text x={500} y={985} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={13}>
              👆 Tap agent for details • Drag to explore
            </text>
          </svg>

          {/* Buildings */}
          {buildings.map((b, i) => {
            const pos = getBuildingPosition(b.type, i);
            return (
              <div key={b._id}
                style={{ 
                  position: 'absolute',
                  left: `${(pos.x / MAP_WIDTH) * 100}%`, 
                  top: `${(pos.y / MAP_HEIGHT) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <BuildingAvatar building={b} index={i} />
              </div>
            );
          })}

          {/* Agents */}
          {positionedAgents.map(({ agent, task, pos }) => {
            const isSelected = selectedAgent === agent._id;
            return (
              <div key={agent._id}
                style={{ 
                  position: 'absolute',
                  left: `${(pos.x / MAP_WIDTH) * 100}%`, 
                  top: `${(pos.y / MAP_HEIGHT) * 100}%`,
                }}
              >
                <AgentAvatar
                  agent={agent}
                  task={task}
                  isSelected={isSelected}
                  onClick={() => setSelectedAgent(isSelected ? null : agent._id)}
                />
                
                {/* Selected agent tooltip */}
                {isSelected && (
                  <div 
                    className="agent-tooltip"
                    style={{
                      position: 'absolute',
                      top: 155,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 100,
                      minWidth: 180,
                    }}
                  >
                    <div className="rounded-xl border border-white/20 bg-black/90 p-3 text-xs text-white shadow-2xl">
                      <div className="font-bold text-sm mb-1" style={{ color: agent.role === 'forager' ? '#22c55e' : agent.role === 'builder' ? '#3b82f6' : agent.role === 'guard' ? '#ef4444' : '#a855f7' }}>
                        {agent.role?.toUpperCase()} — {agent.playerId?.toString().slice(-4)}
                      </div>
                      <div className="mt-1 space-y-1 text-white/80">
                        <div>❤️ Health: {agent.health ?? 100}%</div>
                        <div>😊 Morale: {agent.morale ?? 60}%</div>
                        <div>🍖 Hunger: {agent.hunger}</div>
                        <div>⚡ Energy: {agent.energy}</div>
                        {task && (
                          <div className="text-blue-300 mt-1 pt-1 border-t border-white/10">
                            🎯 {task.type.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-[10px] text-white/50 italic">
                        {agent.healthStatus === 'critical' ? '⚠️ Needs urgent help!' :
                         agent.healthStatus === 'sick' ? '🤢 Feeling sick' :
                         agent.healthStatus === 'injured' ? '🤕 Injured' :
                         agent.healthStatus === 'tired' ? '😫 Very tired' :
                         task?.type?.startsWith('gather') ? `Gathering ${task.type.split('_')[1]}...` :
                         task?.type?.startsWith('build') ? 'Building structure...' :
                         task?.type === 'rest' ? 'Resting at settlement' :
                         'Idle / waiting'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex gap-3 overflow-x-auto px-2 pb-1 text-[10px] text-white/60">
        <div className="flex items-center gap-1 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Forager
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Builder
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Guard
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Laborer
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Sick/Injured
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full border border-red-500 bg-red-500/50" /> Critical
        </div>
      </div>
    </div>
  );
}
