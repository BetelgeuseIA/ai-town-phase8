import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { playerId } from '../aiTown/ids';

export const needFields = {
  hunger: v.number(),
  energy: v.number(),
  safety: v.number(),
};

export const settlementTables = {
  settlements: defineTable({
    worldId: v.id('worlds'),
    name: v.string(),
    status: v.union(v.literal('bootstrapping'), v.literal('active'), v.literal('paused')),
    tick: v.number(),
    emergencyMode: v.optional(v.boolean()),
    emergencyReason: v.optional(v.string()),
    // FASE 4: Crisis Levels
    crisisLevel: v.optional(v.union(
      v.literal('stable'),
      v.literal('watch'),
      v.literal('strained'),
      v.literal('critical'),
      v.literal('collapse'),
    )),
    crisisReason: v.optional(v.string()),
    lastCrisisAt: v.optional(v.number()),
    // Campos legacy para compatibilidad
    lastCycleAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index('worldId', ['worldId']),

  households: defineTable({
    worldId: v.id('worlds'),
    name: v.string(),
    memberIds: v.array(playerId),
    food: v.number(),
    wood: v.number(),
    stone: v.number(),
    productivityScore: v.optional(v.number()),
    strainScore: v.optional(v.number()),
  }).index('worldId', ['worldId']),

  agentNeeds: defineTable({
    worldId: v.id('worlds'),
    playerId,
    ...needFields,
    updatedAt: v.number(),
    role: v.optional(v.union(v.literal('forager'), v.literal('builder'), v.literal('guard'), v.literal('laborer'))),
    morale: v.optional(v.number()),
    // FASE 6: Salud
    health: v.optional(v.number()),
    sickness: v.optional(v.number()),
    injury: v.optional(v.number()),
    exhaustion: v.optional(v.number()),
    healthStatus: v.optional(v.union(
      v.literal('healthy'),
      v.literal('tired'),
      v.literal('sick'),
      v.literal('injured'),
      v.literal('critical'),
    )),
  })
    .index('worldId', ['worldId'])
    .index('playerId', ['worldId', 'playerId']),

  taskQueue: defineTable({
    worldId: v.id('worlds'),
    playerId: v.optional(playerId),
    householdId: v.optional(v.id('households')),
    type: v.union(
      v.literal('gather_food'),
      v.literal('gather_wood'),
      v.literal('gather_stone'),
      v.literal('eat'),
      v.literal('rest'),
      v.literal('idle'),
    ),
    status: v.union(v.literal('pending'), v.literal('assigned'), v.literal('in_progress'), v.literal('done'), v.literal('resolved'), v.literal('cancelled')),
    priority: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    role: v.optional(v.union(v.literal('forager'), v.literal('builder'), v.literal('guard'), v.literal('laborer'))),
    morale: v.optional(v.number()),
    // FASE 2: Campos para tareas progresivas
    durationTicks: v.optional(v.number()),
    progress: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    failureChance: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index('worldId', ['worldId', 'status'])
    .index('playerId', ['worldId', 'playerId', 'status']),

  settlementEvents: defineTable({
    worldId: v.id('worlds'),
    tick: v.number(),
    type: v.string(),
    summary: v.string(),
    playerId: v.optional(playerId),
    householdId: v.optional(v.id('households')),
    createdAt: v.number(),
  }).index('worldId', ['worldId', 'tick']),

  // FASE 3: Buildings MVP
  buildings: defineTable({
    worldId: v.id('worlds'),
    type: v.union(
      v.literal('shelter'),
      v.literal('storage'),
      v.literal('watchtower'),
      v.literal('farm'),
    ),
    status: v.union(v.literal('planned'), v.literal('under_construction'), v.literal('active'), v.literal('damaged')),
    durability: v.number(),
    householdId: v.optional(v.id('households')),
    progress: v.optional(v.number()),
    durationTicks: v.optional(v.number()),
    builtAtTick: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('worldId', ['worldId', 'status'])
    .index('worldId_type', ['worldId', 'type']),
};
