/**
 * StateMapper.ts
 * Mapea tipos de Convex a tipos del juego
 */

import type { SerializedPlayer } from '../../../convex/aiTown/player';
import type { SerializedAgent } from '../../../convex/aiTown/agent';

// Tipos del juego
export interface GameAgent {
  id: string;
  playerId: string;
  x: number;
  y: number;
  color: number;
  name: string;
  role?: string;
  health?: number;
  activity?: string;
  activityUntil?: number;
}

export interface GameBuilding {
  id: string;
  type: 'shelter' | 'storage' | 'watchtower' | 'farm';
  status: 'planned' | 'under_construction' | 'active' | 'damaged';
  x: number;
  y: number;
  durability: number;
  progress?: number;
}

export interface GameResource {
  householdId: string;
  food: number;
  wood: number;
  stone: number;
}

export interface GameTask {
  id: string;
  type: string;
  status: string;
  playerId?: string;
  progress?: number;
  startedAt?: number;
}

// Mapeo de player de Convex → GameAgent
export function convexAgentToGame(
  agent: SerializedAgent,
  player: SerializedPlayer,
  name?: string
): GameAgent {
  return {
    id: agent.id,
    playerId: agent.playerId,
    x: player.position.x,
    y: player.position.y,
    color: 0xff0000, // default, se puede override con character
    name: name || 'Agent',
    activity: player.activity?.description,
    activityUntil: player.activity?.until,
  };
}

// Mapeo building de Convex → GameBuilding
export function convexBuildingToGame(building: any): GameBuilding {
  return {
    id: building._id,
    type: building.type,
    status: building.status,
    x: 0, // posición se puede calcular del household o asignar después
    y: 0,
    durability: building.durability,
    progress: building.progress,
  };
}

// Mapeo task → Animation (para UI)
export function convexTaskToAnimation(task: any): GameTask {
  return {
    id: task._id,
    type: task.type,
    status: task.status,
    playerId: task.playerId,
    progress: task.progress,
    startedAt: task.startedAt,
  };
}

// Mapeo household → Resources
export function convexHouseholdToResources(household: any): GameResource {
  return {
    householdId: household._id,
    food: household.food,
    wood: household.wood,
    stone: household.stone,
  };
}
