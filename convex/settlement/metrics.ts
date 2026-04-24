import { mutation } from '../_generated/server';
import { v } from 'convex/values';

export const computeSettlementMetrics = mutation({
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

    const population = needsDocs.length;
    const avgHunger = population
      ? needsDocs.reduce((sum, n) => sum + n.hunger, 0) / population
      : 0;
    const avgEnergy = population
      ? needsDocs.reduce((sum, n) => sum + n.energy, 0) / population
      : 0;
    const avgSafety = population
      ? needsDocs.reduce((sum, n) => sum + n.safety, 0) / population
      : 0;

    const totalFood = households.reduce((sum, h) => sum + h.food, 0);
    const totalWood = households.reduce((sum, h) => sum + h.wood, 0);
    const totalStone = households.reduce((sum, h) => sum + h.stone, 0);

    let status: 'stable' | 'strained' | 'critical' = 'stable';
    if (avgHunger >= 75 || avgEnergy <= 20 || totalFood <= population) {
      status = 'critical';
    } else if (avgHunger >= 50 || avgEnergy <= 40 || totalFood <= population * 2) {
      status = 'strained';
    }

    const summary = `Settlement tick ${settlement.tick}: pop=${population}, food=${totalFood}, wood=${totalWood}, stone=${totalStone}, avgHunger=${avgHunger.toFixed(1)}, avgEnergy=${avgEnergy.toFixed(1)}, status=${status}`;

    await ctx.db.insert('settlementEvents', {
      worldId: args.worldId,
      tick: settlement.tick,
      type: 'settlement_metrics',
      summary,
      createdAt: Date.now(),
    });

    return {
      ok: true,
      tick: settlement.tick,
      population,
      totalFood,
      totalWood,
      totalStone,
      avgHunger,
      avgEnergy,
      avgSafety,
      status,
      summary,
    };
  },
});
