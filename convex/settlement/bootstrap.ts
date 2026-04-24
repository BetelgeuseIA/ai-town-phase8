import { mutation } from '../_generated/server';
import { v } from 'convex/values';

function clampNeed(value: number) {
  return Math.max(0, Math.min(100, value));
}

export const bootstrapSettlement = mutation({
  args: {
    worldId: v.id('worlds'),
    name: v.optional(v.string()),
    householdSize: v.optional(v.number()),
    initialFood: v.optional(v.number()),
    initialWood: v.optional(v.number()),
    initialStone: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) throw new Error(`Invalid world ID: ${args.worldId}`);

    const existingSettlement = await ctx.db
      .query('settlements')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (existingSettlement) {
      return {
        ok: true,
        settlementId: existingSettlement._id,
        message: 'Settlement already exists for this world',
      };
    }

    const now = Date.now();
    const players = [...world.players];
    const householdSize = Math.max(1, args.householdSize ?? 3);
    const settlementId = await ctx.db.insert('settlements', {
      worldId: args.worldId,
      name: args.name ?? 'First Settlement',
      status: 'bootstrapping',
      tick: 0,
    });

    const householdIds: string[] = [];
    for (let i = 0; i < players.length; i += householdSize) {
      const slice = players.slice(i, i + householdSize);
      const householdId = await ctx.db.insert('households', {
        worldId: args.worldId,
        name: `Household ${householdIds.length + 1}`,
        memberIds: slice.map((p: any) => p.id),
        food: args.initialFood ?? 12,
        wood: args.initialWood ?? 8,
        stone: args.initialStone ?? 4,
      });
      householdIds.push(householdId);

      await ctx.db.insert('settlementEvents', {
        worldId: args.worldId,
        tick: 0,
        type: 'household_created',
        summary: `Created household ${householdIds.length} with ${slice.length} members`,
        householdId,
        createdAt: now,
      });
    }

    const roles = ['forager', 'builder', 'guard', 'laborer'];

    for (const [idx, player] of (players as any[]).entries()) {
      await ctx.db.insert('agentNeeds', {
        worldId: args.worldId,
        playerId: player.id,
        hunger: clampNeed(25 + Math.floor(Math.random() * 20)),
        energy: clampNeed(60 + Math.floor(Math.random() * 25)),
        safety: clampNeed(70),
        updatedAt: now,
        role: roles[idx % roles.length] as any,
        morale: 60,
      });

      await ctx.db.insert('taskQueue', {
        worldId: args.worldId,
        playerId: player.id,
        type: 'idle',
        status: 'pending',
        priority: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert('settlementEvents', {
      worldId: args.worldId,
      tick: 0,
      type: 'settlement_bootstrapped',
      summary: `Bootstrapped settlement with ${players.length} players across ${householdIds.length} households`,
      createdAt: now,
    });

    await ctx.db.patch(settlementId, {
      status: 'active',
    });

    return {
      ok: true,
      settlementId,
      householdsCreated: householdIds.length,
      agentsInitialized: players.length,
    };
  },
});
