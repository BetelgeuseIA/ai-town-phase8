import { mutation } from '../_generated/server';
import { v } from 'convex/values';

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

const roleYield = {
  forager: { food: 3, wood: 1, stone: 0 },
  builder: { food: 0, wood: 1, stone: 2 },
  guard: { food: 0, wood: 0, stone: 0 },
  laborer: { food: 1, wood: 1, stone: 1 },
} as const;

export const resolveRoleProductivity = mutation({
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
    const doneTasks = await ctx.db
      .query('taskQueue')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('status', 'done'))
      .collect();

    const householdByPlayer = new Map<string, any>();
    for (const household of households) {
      for (const memberId of household.memberIds) {
        householdByPlayer.set(memberId, household);
      }
    }

    const needsByPlayer = new Map<string, any>();
    for (const needs of needsDocs) {
      needsByPlayer.set(needs.playerId, needs);
    }

    const now = Date.now();
    let boostedAgents = 0;

    for (const task of doneTasks) {
      if (!task.playerId) continue;
      const needs = needsByPlayer.get(task.playerId);
      const household = householdByPlayer.get(task.playerId);
      if (!needs || !household) continue;
      const role = (needs.role ?? 'laborer') as keyof typeof roleYield;
      const yieldBonus = roleYield[role];

      let patch: any = {};
      let summary = '';
      if (task.type === 'gather_food' && yieldBonus.food > 0) {
        patch.food = household.food + (yieldBonus.food - 1);
        summary = `Role bonus: ${role} improved food yield for household ${household._id}`;
      } else if (task.type === 'gather_wood' && yieldBonus.wood > 0) {
        patch.wood = household.wood + (yieldBonus.wood - 1);
        summary = `Role bonus: ${role} improved wood yield for household ${household._id}`;
      } else if (task.type === 'gather_stone' && yieldBonus.stone > 0) {
        patch.stone = household.stone + (yieldBonus.stone - 1);
        summary = `Role bonus: ${role} improved stone yield for household ${household._id}`;
      }

      if (summary) {
        await ctx.db.patch(household._id, patch);
        Object.assign(household, patch);
        await ctx.db.patch(needs._id, {
          morale: clamp((needs.morale ?? 60) + 2),
          updatedAt: now,
        });
        await ctx.db.insert('settlementEvents', {
          worldId: args.worldId,
          tick: settlement.tick,
          type: 'role_productivity_bonus',
          summary,
          playerId: task.playerId,
          householdId: household._id,
          createdAt: now,
        });
        boostedAgents += 1;
      }
    }

    for (const household of households) {
      const productivityScore = household.food + household.wood + household.stone;
      const strainScore = Math.max(0, 20 - household.food) + Math.max(0, 10 - household.wood);
      await ctx.db.patch(household._id, {
        productivityScore,
        strainScore,
      });

      await ctx.db.insert('settlementEvents', {
        worldId: args.worldId,
        tick: settlement.tick,
        type: 'household_profile',
        summary: `Household ${household._id} profile: productivity=${productivityScore}, strain=${strainScore}`,
        householdId: household._id,
        createdAt: now,
      });
    }

    return {
      ok: true,
      boostedAgents,
      householdsProfiled: households.length,
    };
  },
});
