/**
 * StateSync.ts
 * Sincroniza estado de Convex → Game Engine
 * Detecta cambios y emite eventos para actualizar el juego
 */

import type { SerializedPlayer } from '../../../convex/aiTown/player';
import type { SerializedAgent } from '../../../convex/aiTown/agent';
import {
  GameAgent,
  GameBuilding,
  GameResource,
  GameTask,
  convexAgentToGame,
  convexBuildingToGame,
  convexTaskToAnimation,
  convexHouseholdToResources,
} from './StateMapper';

export type StateChangeCallback = (change: StateChangeEvent) => void;

export interface StateChangeEvent {
  type: 'agent_added' | 'agent_removed' | 'agent_moved' | 'agent_updated' |
        'building_added' | 'building_removed' | 'building_updated' |
        'resource_updated' | 'task_updated' | 'full_sync';
  payload: any;
}

interface AgentState {
  id: string;
  playerId: string;
  x: number;
  y: number;
  lastUpdate: number;
}

interface BuildingState {
  id: string;
  type: string;
  status: string;
  durability: number;
  lastUpdate: number;
}

export class StateSync {
  private agents: Map<string, AgentState> = new Map();
  private buildings: Map<string, BuildingState> = new Map();
  private resources: Map<string, GameResource> = new Map();
  private callbacks: StateChangeCallback[] = [];

  // Registrar callback para cambios
  onChange(callback: StateChangeCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  private emit(event: StateChangeEvent) {
    this.callbacks.forEach(cb => cb(event));
  }

  // Sincronizar agents de Convex → Game
  syncAgents(
    convexAgents: Array<{ agent: SerializedAgent; player: SerializedPlayer; name?: string }>,
    gameAgents: GameAgent[]
  ): void {
    const now = Date.now();

    // Index actual de game agents por playerId
    const gameIndex = new Map<string, GameAgent>();
    gameAgents.forEach(a => gameIndex.set(a.playerId, a));

    // Index de Convex por playerId
    const convexIndex = new Map<string, typeof convexAgents[0]>();
    convexAgents.forEach(c => convexIndex.set(c.player.id, c));

    // Detectar REMOVIDOS (hay en game pero no en convex)
    gameAgents.forEach(gameAgent => {
      if (!convexIndex.has(gameAgent.playerId)) {
        this.agents.delete(gameAgent.id);
        this.emit({ type: 'agent_removed', payload: { id: gameAgent.id } });
      }
    });

    // Detectar NUEVOS y ACTUALIZADOS (hay en convex pero no en game, o cambió posición)
    convexAgents.forEach(({ agent, player, name }) => {
      const existing = this.agents.get(agent.id);
      const isNew = !existing;
      const moved = existing && (
        Math.abs(existing.x - player.position.x) > 0.1 ||
        Math.abs(existing.y - player.position.y) > 0.1
      );

      // Mapear a GameAgent
      const gameAgent = convexAgentToGame(agent, player, name);

      if (isNew) {
        this.emit({ type: 'agent_added', payload: gameAgent });
      } else if (moved) {
        this.emit({ type: 'agent_moved', payload: gameAgent });
      } else if (existing) {
        // Check for other updates (activity, etc)
        const prev = gameIndex.get(player.id);
        if (prev && prev.activity !== gameAgent.activity) {
          this.emit({ type: 'agent_updated', payload: gameAgent });
        }
      }

      // Actualizar estado interno
      this.agents.set(agent.id, {
        id: agent.id,
        playerId: agent.playerId,
        x: player.position.x,
        y: player.position.y,
        lastUpdate: now,
      });
    });
  }

  // Sincronizar buildings
  syncBuildings(
    convexBuildings: any[],
    gameBuildings: GameBuilding[]
  ): void {
    const now = Date.now();

    const gameIndex = new Map<string, GameBuilding>();
    gameBuildings.forEach(b => gameIndex.set(b.id, b));

    // REMOVIDOS
    gameBuildings.forEach(gameBuilding => {
      const exists = convexBuildings.find(b => b._id === gameBuilding.id);
      if (!exists) {
        this.buildings.delete(gameBuilding.id);
        this.emit({ type: 'building_removed', payload: { id: gameBuilding.id } });
      }
    });

    // NUEVOS y ACTUALIZADOS
    convexBuildings.forEach(building => {
      const existing = this.buildings.get(building._id);
      const isNew = !existing;
      const updated = existing && (
        existing.status !== building.status ||
        existing.durability !== building.durability
      );

      const gameBuilding = convexBuildingToGame(building);

      if (isNew) {
        this.emit({ type: 'building_added', payload: gameBuilding });
      } else if (updated) {
        this.emit({ type: 'building_updated', payload: gameBuilding });
      }

      this.buildings.set(building._id, {
        id: building._id,
        type: building.type,
        status: building.status,
        durability: building.durability,
        lastUpdate: now,
      });
    });
  }

  // Sincronizar resources (households)
  syncResources(convexHouseholds: any[]): void {
    convexHouseholds.forEach(household => {
      const resources = convexHouseholdToResources(household);
      const existing = this.resources.get(household._id);

      // Solo emitir si cambió algo
      if (!existing ||
          existing.food !== resources.food ||
          existing.wood !== resources.wood ||
          existing.stone !== resources.stone) {
        this.resources.set(household._id, resources);
        this.emit({ type: 'resource_updated', payload: resources });
      }
    });
  }

  // Sincronizar tasks (para animaciones)
  syncTasks(convexTasks: any[]): void {
    convexTasks.forEach(task => {
      const gameTask = convexTaskToAnimation(task);
      this.emit({ type: 'task_updated', payload: gameTask });
    });
  }

  // Full sync - emite todos los estados actuales
  fullSync(data: {
    agents: Array<{ agent: SerializedAgent; player: SerializedPlayer; name?: string }>;
    buildings: any[];
    households: any[];
    tasks: any[];
  }): void {
    // Convertir a GameAgents
    const gameAgents: GameAgent[] = data.agents.map(({ agent, player, name }) =>
      convexAgentToGame(agent, player, name)
    );

    const gameBuildings: GameBuilding[] = data.buildings.map(convexBuildingToGame);

    this.emit({
      type: 'full_sync',
      payload: {
        agents: gameAgents,
        buildings: gameBuildings,
        households: data.households,
        tasks: data.tasks.map(convexTaskToAnimation),
      },
    });
  }

  // Limpiar estado
  clear(): void {
    this.agents.clear();
    this.buildings.clear();
    this.resources.clear();
  }
}

// Singleton para uso global
export const stateSync = new StateSync();
