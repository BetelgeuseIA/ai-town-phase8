import { mutation } from '../_generated/server';
import { v } from 'convex/values';

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export const updateSocialSignals = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const settlement = await ctx.db
      .query('settlements')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!settlement) throw new Error(`No settlement found for world ${args.worldId}`);

    const needsDocs = await ctx.db
      .query('agentNeeds')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();

    const now = Date.now();
    let strainedAgents = 0;

    for (const needs of needsDocs) {
      let morale = needs.morale ?? 60;
      if (needs.hunger >= 70) morale -= 12;
      if (needs.energy <= 25) morale -= 10;
      if (needs.safety <= 30) morale -= 8;
      if (settlement.emergencyMode) morale -= 6;
      if (needs.role === 'guard' && settlement.emergencyMode) morale += 3;
      if (needs.role === 'forager' && needs.hunger < 50) morale += 2;
      morale = clamp(morale);

      await ctx.db.patch(needs._id, {
        morale,
        updatedAt: now,
      });

      if (morale <= 35) {
        strainedAgents += 1;
        await ctx.db.insert('settlementEvents', {
          worldId: args.worldId,
          tick: settlement.tick,
          type: 'social_strain',
          summary: `Agent ${needs.playerId} is socially strained (role=${needs.role ?? 'unknown'}, morale=${morale})`,
          playerId: needs.playerId,
          createdAt: now,
        });
      }
    }

    return {
      ok: true,
      strainedAgents,
    };
  },
});
