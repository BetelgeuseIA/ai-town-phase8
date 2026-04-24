import { mutation } from '../_generated/server';
import { v } from 'convex/values';

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function chooseTask(needs: { hunger: number; energy: number; safety: number }) {
  if (needs.hunger >= 70) return 'eat';
  if (needs.energy <= 30) return 'rest';
  if (needs.safety <= 30) return 'idle';
  if (needs.hunger >= 45) return 'gather_food';
  if (needs.energy >= 60) return 'gather_wood';
  return 'gather_stone';
}

export const runSettlementTick = mutation({
  args: {
    worldId: v.id('worlds'),
    hungerDecay: v.optional(v.number()),
    energyDecay: v.optional(v.number()),
    safetyDecay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const settlement = await ctx.db
      .query('settlements')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!settlement) throw new Error(`No settlement found for world ${args.worldId}`);

    const now = Date.now();
    const hungerDecay = args.hungerDecay ?? 6;
    const energyDecay = args.energyDecay ?? 4;
    const safetyDecay = args.safetyDecay ?? 1;

    const needsDocs = await ctx.db
      .query('agentNeeds')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();

    let updatedAgents = 0;
    for (const needs of needsDocs) {
      const nextNeeds = {
        hunger: clamp(needs.hunger + hungerDecay),
        energy: clamp(needs.energy - energyDecay),
        safety: clamp(needs.safety - safetyDecay),
      };

      await ctx.db.patch(needs._id, {
        ...nextNeeds,
        updatedAt: now,
      });

      const pendingTasks = await ctx.db
        .query('taskQueue')
        .withIndex('playerId', (q) => q.eq('worldId', args.worldId).eq('playerId', needs.playerId))
        .collect();

      for (const task of pendingTasks) {
        if (task.status === 'pending' || task.status === 'assigned') {
          await ctx.db.patch(task._id, {
            status: 'cancelled',
            updatedAt: now,
          });
        }
      }

      const type = chooseTask(nextNeeds);
      const priority =
        type === 'eat' ? 100 : type === 'rest' ? 90 : type === 'idle' ? 70 : 50;

      await ctx.db.insert('taskQueue', {
        worldId: args.worldId,
        playerId: needs.playerId,
        type,
        status: 'pending',
        priority,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert('settlementEvents', {
        worldId: args.worldId,
        tick: settlement.tick + 1,
        type: 'task_selected',
        summary: `Agent ${needs.playerId} selected task ${type}`,
        playerId: needs.playerId,
        createdAt: now,
      });

      updatedAgents += 1;
    }

    await ctx.db.patch(settlement._id, {
      tick: settlement.tick + 1,
    });

    await ctx.db.insert('settlementEvents', {
      worldId: args.worldId,
      tick: settlement.tick + 1,
      type: 'settlement_tick',
      summary: `Processed settlement tick ${settlement.tick + 1} for ${updatedAgents} agents`,
      createdAt: now,
    });

    return {
      ok: true,
      tick: settlement.tick + 1,
      updatedAgents,
    };
  },
});
