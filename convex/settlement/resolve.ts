import { mutation } from '../_generated/server';
import { v } from 'convex/values';

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export const resolveSettlementTasks = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const settlement = await ctx.db
      .query('settlements')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!settlement) throw new Error(`No settlement found for world ${args.worldId}`);

    const now = Date.now();
    const households = await ctx.db
      .query('households')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const needsDocs = await ctx.db
      .query('agentNeeds')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const pendingTasks = await ctx.db
      .query('taskQueue')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('status', 'pending'))
      .collect();

    const householdByPlayer = new Map<string, any>();
    for (const household of households) {
      for (const memberId of household.memberIds) {
        householdByPlayer.set(memberId, household);
      }
    }

    const needByPlayer = new Map<string, any>();
    for (const needs of needsDocs) {
      needByPlayer.set(needs.playerId, needs);
    }

    let resolved = 0;
    for (const task of pendingTasks.sort((a, b) => b.priority - a.priority)) {
      if (!task.playerId) continue;
      const household = householdByPlayer.get(task.playerId);
      const needs = needByPlayer.get(task.playerId);
      if (!household || !needs) continue;

      let summary = '';
      let householdPatch: any = {};
      let needsPatch: any = {};

      switch (task.type) {
        case 'eat':
          if (household.food > 0) {
            householdPatch.food = household.food - 1;
            needsPatch.hunger = clamp(needs.hunger - 35);
            needsPatch.energy = clamp(needs.energy + 5);
            summary = `Agent ${task.playerId} ate food from household ${household._id}`;
          } else {
            needsPatch.safety = clamp(needs.safety - 5);
            summary = `Agent ${task.playerId} tried to eat but household ${household._id} had no food`;
          }
          break;
        case 'rest':
          needsPatch.energy = clamp(needs.energy + 25);
          needsPatch.hunger = clamp(needs.hunger + 4);
          summary = `Agent ${task.playerId} rested`;
          break;
        case 'gather_food':
          householdPatch.food = household.food + 2;
          needsPatch.energy = clamp(needs.energy - 10);
          needsPatch.hunger = clamp(needs.hunger + 6);
          summary = `Agent ${task.playerId} gathered food for household ${household._id}`;
          break;
        case 'gather_wood':
          householdPatch.wood = household.wood + 2;
          needsPatch.energy = clamp(needs.energy - 8);
          needsPatch.hunger = clamp(needs.hunger + 5);
          summary = `Agent ${task.playerId} gathered wood for household ${household._id}`;
          break;
        case 'gather_stone':
          householdPatch.stone = household.stone + 1;
          needsPatch.energy = clamp(needs.energy - 9);
          needsPatch.hunger = clamp(needs.hunger + 5);
          summary = `Agent ${task.playerId} gathered stone for household ${household._id}`;
          break;
        case 'idle':
        default:
          needsPatch.energy = clamp(needs.energy + 2);
          needsPatch.hunger = clamp(needs.hunger + 2);
          summary = `Agent ${task.playerId} idled`;
          break;
      }

      if (Object.keys(householdPatch).length > 0) {
        await ctx.db.patch(household._id, householdPatch);
        Object.assign(household, householdPatch);
      }
      if (Object.keys(needsPatch).length > 0) {
        await ctx.db.patch(needs._id, {
          ...needsPatch,
          updatedAt: now,
        });
        Object.assign(needs, needsPatch);
      }

      await ctx.db.patch(task._id, {
        status: 'done',
        updatedAt: now,
      });

      await ctx.db.insert('settlementEvents', {
        worldId: args.worldId,
        tick: settlement.tick,
        type: 'task_resolved',
        summary,
        playerId: task.playerId,
        householdId: household._id,
        createdAt: now,
      });

      resolved += 1;
    }

    return {
      ok: true,
      tick: settlement.tick,
      resolved,
    };
  },
});
