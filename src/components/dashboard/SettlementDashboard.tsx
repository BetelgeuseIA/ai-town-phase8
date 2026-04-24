import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';

import SettlementLiveView from './SettlementLiveView';
import GameView from '../../game/GameView';

export default function SettlementDashboard({ worldId }: { worldId: Id<'worlds'> }) {
  const data = useQuery((api as any).settlement.dashboard.getDashboard, { worldId }) as
    | {
        settlement: Doc<'settlements'>;
        summary: {
          population: number;
          totalFood: number;
          totalWood: number;
          totalStone: number;
          avgHunger: number;
          avgEnergy: number;
          avgSafety: number;
          avgMorale: number;
          avgHealth: number;
          pendingTasks: number;
          inProgressTasks: number;
          doneTasks: number;
          resolvedTasks: number;
          criticalAgents: number;
          sickAgents: number;
          injuredAgents: number;
          criticalHealthAgents: number;
          lowMoraleAgents: number;
          socialRisk: string;
        };
        households: Doc<'households'>[];
        agents: Doc<'agentNeeds'>[];
        events: Doc<'settlementEvents'>[];
        tasks: Doc<'taskQueue'>[];
        buildings: Doc<'buildings'>[];
      }
    | null
    | undefined;

  if (data === undefined) {
    return <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">Loading settlement dashboard...</div>;
  }

  if (!data) {
    return <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">No settlement bootstrapped yet for this world.</div>;
  }

  const { settlement, summary, households, agents, events, tasks, buildings } = data;

  const crisisColor =
    settlement.crisisLevel === 'collapse' ? 'bg-red-600' :
    settlement.crisisLevel === 'critical' ? 'bg-red-500' :
    settlement.crisisLevel === 'strained' ? 'bg-amber-500' :
    settlement.crisisLevel === 'watch' ? 'bg-yellow-500' : 'bg-emerald-500';

  const crisisText =
    settlement.crisisLevel === 'collapse' ? 'text-red-300' :
    settlement.crisisLevel === 'critical' ? 'text-red-300' :
    settlement.crisisLevel === 'strained' ? 'text-amber-300' :
    settlement.crisisLevel === 'watch' ? 'text-yellow-300' : 'text-emerald-300';

  return (
    <div className="space-y-4 text-white">
      {/* Crisis Banner */}
      <div className={`rounded-2xl border border-white/10 ${crisisColor}/20 p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 animate-pulse rounded-full ${crisisColor}`}></div>
            <div>
              <span className="font-semibold uppercase tracking-wider">{settlement.crisisLevel ?? 'stable'}</span>
              {settlement.crisisReason && <span className="ml-2 text-sm text-white/70">{settlement.crisisReason}</span>}
            </div>
          </div>
          <div className="text-sm text-white/70">
            Tick: {settlement.tick} | Emergency: {settlement.emergencyMode ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Population" value={summary.population} />
        <MetricCard label="Food" value={summary.totalFood} tone={summary.totalFood < summary.population * 2 ? 'red' : 'green'} />
        <MetricCard label="Wood" value={summary.totalWood} />
        <MetricCard label="Stone" value={summary.totalStone} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Avg Hunger" value={summary.avgHunger.toFixed(1)} tone={summary.avgHunger > 70 ? 'red' : summary.avgHunger < 30 ? 'green' : 'default'} />
        <MetricCard label="Avg Energy" value={summary.avgEnergy.toFixed(1)} tone={summary.avgEnergy < 30 ? 'red' : summary.avgEnergy > 70 ? 'green' : 'default'} />
        <MetricCard label="Avg Morale" value={summary.avgMorale.toFixed(1)} tone={summary.avgMorale < 30 ? 'red' : summary.avgMorale > 70 ? 'green' : 'default'} />
        <MetricCard label="Avg Health" value={`${summary.avgHealth.toFixed(0)}%`} tone={summary.avgHealth < 50 ? 'red' : summary.avgHealth > 80 ? 'green' : 'default'} />
      </div>

      {/* Riesgos */}
      <div className="grid gap-3 md:grid-cols-3">
        <RiskCard label="Social Risk" value={summary.socialRisk} level={summary.socialRisk} />
        <RiskCard label="Critical Agents" value={summary.criticalAgents} level={summary.criticalAgents > 3 ? 'high' : summary.criticalAgents > 0 ? 'medium' : 'low'} />
        <RiskCard label="Health Critical" value={summary.criticalHealthAgents} level={summary.criticalHealthAgents > 2 ? 'high' : summary.criticalHealthAgents > 0 ? 'medium' : 'low'} />
      </div>

      {/* Live View */}
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h2 className="mb-3 text-lg font-semibold">Settlement Live View</h2>
        <SettlementLiveView
          agents={agents}
          tasks={tasks}
          buildings={buildings}
          households={households}
          crisisLevel={settlement.crisisLevel ?? 'stable'}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Buildings */}
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="mb-3 text-lg font-semibold">Buildings ({buildings.length})</h2>
          <div className="space-y-2">
            {buildings.map((b: Doc<'buildings'>) => (
              <div key={b._id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <strong className="capitalize">{b.type}</strong>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-1 text-white/70">
                  {b.status === 'under_construction' && b.progress !== undefined && b.durationTicks
                    ? `Progress: ${b.progress}/${b.durationTicks}`
                    : b.status === 'active'
                    ? `Durability: ${b.durability}`
                    : 'Waiting for resources'}
                </div>
              </div>
            ))}
            {buildings.length === 0 && <div className="text-sm text-white/50">No buildings yet</div>}
          </div>
        </section>

        {/* Tasks */}
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
          <div className="mb-2 flex gap-4 text-xs text-white/60">
            <span>Pending: {summary.pendingTasks}</span>
            <span>In Progress: {summary.inProgressTasks}</span>
            <span>Done: {summary.doneTasks}</span>
            <span>Resolved: {summary.resolvedTasks}</span>
          </div>
          <div className="max-h-64 space-y-2 overflow-auto">
            {tasks.slice(0, 15).map((t: Doc<'taskQueue'>) => (
              <div key={t._id} className="rounded-xl border border-white/10 bg-white/5 p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="capitalize">{t.type}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-1 text-xs text-white/60">
                  {t.status === 'in_progress' && t.progress !== undefined && t.durationTicks
                    ? `Progress: ${t.progress}/${t.durationTicks}`
                    : t.status === 'done'
                    ? 'Completed'
                    : t.status === 'resolved'
                    ? 'Resolved'
                    : `Priority: ${t.priority}`}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Agents */}
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="mb-3 text-lg font-semibold">Agents ({agents.length})</h2>
          <div className="max-h-96 space-y-2 overflow-auto">
            {agents.map((agent: Doc<'agentNeeds'>) => (
              <div key={agent._id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <strong>{agent.playerId?.toString().slice(-6)}</strong>
                  <div className="flex gap-2">
                    <span className="text-xs uppercase text-white/50">{agent.role ?? 'unknown'}</span>
                    {agent.healthStatus && agent.healthStatus !== 'healthy' && (
                      <span className={`text-xs ${agent.healthStatus === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
                        {agent.healthStatus}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1 text-xs">
                  <StatBar label="H" value={agent.hunger} max={100} reverse />
                  <StatBar label="E" value={agent.energy} max={100} />
                  <StatBar label="S" value={agent.safety} max={100} />
                  <StatBar label="M" value={agent.morale ?? 60} max={100} />
                  <StatBar label="HP" value={agent.health ?? 100} max={100} />
                </div>
                {(agent.sickness ?? 0) > 0 && <div className="mt-1 text-xs text-red-400">Sickness: {agent.sickness}</div>}
                {(agent.injury ?? 0) > 0 && <div className="mt-1 text-xs text-red-400">Injury: {agent.injury}</div>}
                {(agent.exhaustion ?? 0) > 40 && <div className="mt-1 text-xs text-amber-400">Exhaustion: {agent.exhaustion}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Households */}
        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="mb-3 text-lg font-semibold">Households</h2>
          <div className="space-y-2">
            {households.map((household: Doc<'households'>) => (
              <div key={household._id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <strong>{household.name}</strong>
                  <span className="text-white/60">{household.memberIds.length} members</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-white/80">
                  <span className={household.food < household.memberIds.length * 2 ? 'text-red-300' : ''}>Food: {household.food}</span>
                  <span>Wood: {household.wood}</span>
                  <span>Stone: {household.stone}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Events */}
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h2 className="mb-3 text-lg font-semibold">Chronicle</h2>
        <div className="space-y-2 text-sm">
          {events.map((event: Doc<'settlementEvents'>) => (
            <div key={event._id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{event.type}</span>
                <span className="text-xs text-white/50">Tick {event.tick}</span>
              </div>
              <p className="mt-1 text-white/80">{event.summary}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Game View Experiment */}
      <section>
        <GameView />
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'red' | 'green' }) {
  const toneClass = tone === 'red' ? 'text-red-300' : tone === 'green' ? 'text-emerald-300' : 'text-white';
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function RiskCard({ label, value, level }: { label: string; value: string | number; level: string }) {
  const color = level === 'high' ? 'border-red-500/30 bg-red-500/10 text-red-300' :
    level === 'medium' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' :
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300',
    assigned: 'bg-blue-500/20 text-blue-300',
    in_progress: 'bg-amber-500/20 text-amber-300',
    done: 'bg-emerald-500/20 text-emerald-300',
    resolved: 'bg-gray-500/20 text-gray-300',
    cancelled: 'bg-red-500/20 text-red-300',
    planned: 'bg-purple-500/20 text-purple-300',
    under_construction: 'bg-blue-500/20 text-blue-300',
    active: 'bg-emerald-500/20 text-emerald-300',
    damaged: 'bg-red-500/20 text-red-300',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs capitalize ${colors[status] || 'bg-white/10 text-white'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function StatBar({ label, value, max, reverse }: { label: string; value: number; max: number; reverse?: boolean }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const isBad = reverse ? pct > 70 : pct < 30;
  const isGood = reverse ? pct < 30 : pct > 70;
  const color = isBad ? 'bg-red-500' : isGood ? 'bg-emerald-500' : 'bg-amber-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-white/60">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full rounded bg-white/10">
        <div className={`h-1.5 rounded ${color}`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
}