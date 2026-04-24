import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { runSettlementTick } from './loop';
import { resolveSettlementTasks } from './resolve';
import { computeSettlementMetrics } from './metrics';
import { runEmergencyPolicy } from './policy';
import { updateSocialSignals } from './social';
import { resolveRoleProductivity } from './productivity';

export const runSettlementCycle = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const tickResult = await runSettlementTick(ctx, { worldId: args.worldId });
    const resolveResult = await resolveSettlementTasks(ctx, { worldId: args.worldId });
    const metrics = await computeSettlementMetrics(ctx, { worldId: args.worldId });
    const emergency = await runEmergencyPolicy(ctx, { worldId: args.worldId });
    const social = await updateSocialSignals(ctx, { worldId: args.worldId });
    const productivity = await resolveRoleProductivity(ctx, { worldId: args.worldId });

    return {
      ok: true,
      tick: tickResult.tick,
      resolved: resolveResult.resolved,
      metrics,
      emergency,
      social,
      productivity,
    };
  },
});
