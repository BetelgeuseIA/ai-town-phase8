import React from 'react';
import type { Doc } from '../../../convex/_generated/dataModel';

interface AgentAvatarProps {
  agent: Doc<'agentNeeds'>;
  task?: Doc<'taskQueue'>;
  isSelected?: boolean;
  onClick?: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  forager: '#22c55e',
  builder: '#3b82f6',
  guard: '#ef4444',
  laborer: '#a855f7',
};

const ROLE_ICONS: Record<string, string> = {
  forager: '🌾',
  builder: '🔨',
  guard: '🛡️',
  laborer: '⚒️',
};

const getHealthColor = (health?: number) => {
  if ((health ?? 100) > 70) return '#22c55e';
  if ((health ?? 100) > 40) return '#eab308';
  return '#ef4444';
};

const getAnimationClass = (taskType?: string, healthStatus?: string) => {
  if (healthStatus === 'critical') return 'animate-critical';
  if (healthStatus === 'sick' || healthStatus === 'injured') return 'animate-warning';
  if (taskType?.startsWith('gather')) return 'animate-walking';
  if (taskType?.startsWith('build')) return 'animate-working';
  if (taskType === 'rest' || taskType === 'eat') return 'animate-idle';
  return 'animate-idle';
};

export default function AgentAvatar({ agent, task, isSelected, onClick }: AgentAvatarProps) {
  const color = ROLE_COLORS[agent.role ?? 'laborer'] || '#a855f7';
  const icon = ROLE_ICONS[agent.role ?? 'laborer'] || '👤';
  const healthColor = getHealthColor(agent.health);
  const animClass = getAnimationClass(task?.type, agent.healthStatus ?? 'healthy');
  const healthPct = Math.min(100, Math.max(0, agent.health ?? 100));
  const moralePct = Math.min(100, Math.max(0, agent.morale ?? 60));

  return (
    <div
      className={`agent-avatar ${animClass} ${isSelected ? 'agent-selected' : ''}`}
      onClick={onClick}
      style={{
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: isSelected ? 100 : 10,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Task icon above */}
      {task && (
        <div
          className="agent-task-icon"
          style={{
            position: 'absolute',
            top: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 28,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            animation: 'float 2s ease-in-out infinite',
          }}
        >
          {(task.type as string) === 'gather_food' && '🍎'}
          {(task.type as string) === 'gather_wood' && '🪵'}
          {(task.type as string) === 'gather_stone' && '🪨'}
          {(task.type as string)?.startsWith('build') && '🏗️'}
          {(task.type as string) === 'rest' && '😴'}
          {(task.type as string) === 'eat' && '🍽️'}
          {(task.type as string) === 'idle' && '💤'}
        </div>
      )}

      {/* SVG Agent */}
      <svg
        width={120}
        height={144}
        viewBox="0 0 40 48"
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 12px rgba(0,0,0,0.3))',
          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Body */}
        <ellipse
          cx={20}
          cy={32}
          rx={12}
          ry={14}
          fill={color}
          fillOpacity={0.2}
          stroke={color}
          strokeWidth={2}
        />
        
        {/* Head */}
        <circle
          cx={20}
          cy={14}
          r={10}
          fill={color}
          fillOpacity={0.9}
        />
        
        {/* Eyes */}
        <circle cx={16} cy={12} r={2} fill="white" />
        <circle cx={24} cy={12} r={2} fill="white" />
        <circle cx={16} cy={12} r={1} fill="black" />
        <circle cx={24} cy={12} r={1} fill="black" />
        
        {/* Role icon on chest */}
        <text
          x={20}
          y={36}
          textAnchor="middle"
          fontSize={12}
        >
          {icon}
        </text>

        {/* Health ring */}
        <circle
          cx={20}
          cy={24}
          r={18}
          fill="none"
          stroke={healthColor}
          strokeWidth={2}
          strokeDasharray={`${healthPct * 1.13} 113`}
          strokeLinecap="round"
          opacity={0.8}
        />
      </svg>

      {/* Morale bar */}
      <div
        style={{
          position: 'absolute',
          bottom: -18,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 60,
          height: 6,
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            width: `${moralePct}%`,
            height: '100%',
            background: moralePct > 50 ? '#22c55e' : '#eab308',
            borderRadius: 2,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {/* Status indicators */}
      {(agent.healthStatus ?? 'healthy') !== 'healthy' && (
        <div
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            fontSize: 22,
            animation: 'pulse 1s infinite',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
          }}
        >
          {agent.healthStatus === 'critical' && '🔴'}
          {agent.healthStatus === 'sick' && '🤢'}
          {agent.healthStatus === 'injured' && '🤕'}
          {agent.healthStatus === 'tired' && '😫'}
        </div>
      )}
    </div>
  );
}

// Styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes float {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-4px); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .agent-avatar {
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .agent-selected {
    filter: drop-shadow(0 0 12px rgba(255,255,255,0.6)) drop-shadow(0 0 24px rgba(255,255,255,0.3));
  }

  .animate-idle {
    animation: bounce-idle 3s ease-in-out infinite;
  }

  .animate-walking {
    animation: walk-bob 0.8s ease-in-out infinite;
  }

  .animate-working {
    animation: work-hammer 1.2s ease-in-out infinite;
  }

  .animate-warning {
    animation: warning-shake 2s ease-in-out infinite;
  }

  .animate-critical {
    animation: critical-flash 1s ease-in-out infinite;
  }

  @keyframes bounce-idle {
    0%, 100% { transform: translate(-50%, -50%) translateY(0); }
    50% { transform: translate(-50%, -50%) translateY(-3px); }
  }

  @keyframes walk-bob {
    0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(-2deg); }
    25% { transform: translate(-50%, -50%) translateY(-2px) rotate(2deg); }
    50% { transform: translate(-50%, -50%) translateY(0) rotate(-2deg); }
    75% { transform: translate(-50%, -50%) translateY(-2px) rotate(2deg); }
  }

  @keyframes work-hammer {
    0%, 100% { transform: translate(-50%, -50%) rotate(-5deg); }
    50% { transform: translate(-50%, -50%) rotate(5deg); }
  }

  @keyframes warning-shake {
    0%, 90%, 100% { transform: translate(-50%, -50%) translateX(0); }
    92%, 96% { transform: translate(-50%, -50%) translateX(-2px); }
    94%, 98% { transform: translate(-50%, -50%) translateX(2px); }
  }

  @keyframes critical-flash {
    0%, 100% { opacity: 1; filter: brightness(1); }
    50% { opacity: 0.7; filter: brightness(1.5) saturate(1.5); }
  }
`;
document.head.appendChild(styleSheet);
