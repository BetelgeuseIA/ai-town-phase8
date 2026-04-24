import { mutation } from '../_generated/server';
import { v } from 'convex/values';

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export const runEmergencyPolicy = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const settlement = await ctx.db
      .query('settlements')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!settlement) throw new Error(`No settlement found for world ${args.worldId}`);

    const households = await ctx.db
      .query('households')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const needsDocs = await ctx.db
      .query('agentNeeds')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();

    const population = needsDocs.length || 1;
    const totalFood = households.reduce((sum, h) => sum + h.food, 0);
    const avgHunger = needsDocs.reduce((sum, n) => sum + n.hunger, 0) / population;
    const avgEnergy = needsDocs.reduce((sum, n) => sum + n.energy, 0) / population;
    const now = Date.now();

    const critical = avgHunger >= 75 || totalFood <= population || avgEnergy <= 20;

    if (!critical) {
      if (settlement.emergencyMode) {
        await ctx.db.patch(settlement._id, {
          emergencyMode: false,
          emergencyReason: 'recovered',
        });
        await ctx.db.insert('settlementEvents', {
          worldId: args.worldId,
          tick: settlement.tick,
          type: 'emergency_cleared',
          summary: 'Settlement recovered from emergency mode',
          createdAt: now,
        });
      }
      return { ok: true, emergency: false, reason: 'stable_enough' };
    }

    await ctx.db.patch(settlement._id, {
      emergencyMode: true,
      emergencyReason: 'food_or_energy_crisis',
    });

    for (const needs of needsDocs) {
      const existingPending = await ctx.db
        .query('taskQueue')
        .withIndex('playerId', (q) => q.eq('worldId', args.worldId).eq('playerId', needs.playerId))
        .collect();

      for (const task of existingPending) {
        if (task.status === 'pending' || task.status === 'assigned') {
          await ctx.db.patch(task._id, {
            status: 'cancelled',
            updatedAt: now,
          });
        }
      }

      const forcedType = needs.hunger >= 60 ? 'gather_food' : needs.energy <= 25 ? 'rest' : 'gather_food';
      await ctx.db.insert('taskQueue', {
        worldId: args.worldId,
        playerId: needs.playerId,
        type: forcedType,
        status: 'pending',
        priority: 200,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(needs._id, {
        safety: clamp(needs.safety - 3),
        updatedAt: now,
      });
    }

    await ctx.db.insert('settlementEvents', {
      worldId: args.worldId,
      tick: settlement.tick,
      type: 'emergency_mode_triggered',
      summary: `Emergency mode triggered: avgHunger=${avgHunger.toFixed(1)}, avgEnergy=${avgEnergy.toFixed(1)}, totalFood=${totalFood}`,
      createdAt: now,
    });

    return {
      ok: true,
      emergency: true,
      reason: 'food_or_energy_crisis',
      totalFood,
      avgHunger,
      avgEnergy,
    };
  },
});
