import { query } from '../_generated/server';
import { v } from 'convex/values';

export const getDashboard = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const settlement = await ctx.db
      .query('settlements')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!settlement) {
      return null;
    }

    const households = await ctx.db
      .query('households')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const agentNeeds = await ctx.db
      .query('agentNeeds')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const events = await ctx.db
      .query('settlementEvents')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .order('desc')
      .take(25);
    const tasks = await ctx.db
      .query('taskQueue')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .take(25);
    const buildings = await ctx.db
      .query('buildings')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();

    const population = agentNeeds.length;
    const totalFood = households.reduce((sum, h) => sum + h.food, 0);
    const totalWood = households.reduce((sum, h) => sum + h.wood, 0);
    const totalStone = households.reduce((sum, h) => sum + h.stone, 0);
    
    const avgHunger = population ? agentNeeds.reduce((sum, n) => sum + n.hunger, 0) / population : 0;
    const avgEnergy = population ? agentNeeds.reduce((sum, n) => sum + n.energy, 0) / population : 0;
    const avgSafety = population ? agentNeeds.reduce((sum, n) => sum + n.safety, 0) / population : 0;
    const avgMorale = population ? agentNeeds.reduce((sum, n) => sum + (n.morale ?? 60), 0) / population : 0;
    const avgHealth = population ? agentNeeds.reduce((sum, n) => sum + (n.health ?? 100), 0) / population : 0;

    const criticalAgents = agentNeeds.filter(
      (n) => n.hunger >= 75 || n.energy <= 20 || n.safety <= 25 || (n.morale ?? 60) <= 30,
    ).length;

    const sickAgents = agentNeeds.filter((n) => (n.healthStatus ?? 'healthy') === 'sick').length;
    const injuredAgents = agentNeeds.filter((n) => (n.healthStatus ?? 'healthy') === 'injured').length;
    const criticalHealthAgents = agentNeeds.filter((n) => (n.healthStatus ?? 'healthy') === 'critical').length;
    const lowMoraleAgents = agentNeeds.filter((n) => (n.morale ?? 60) < 30).length;

    return {
      settlement,
      summary: {
        population,
        totalFood,
        totalWood,
        totalStone,
        avgHunger,
        avgEnergy,
        avgSafety,
        avgMorale,
        avgHealth,
        pendingTasks: tasks.filter((t) => t.status === 'pending').length,
        inProgressTasks: tasks.filter((t) => t.status === 'in_progress').length,
        doneTasks: tasks.filter((t) => t.status === 'done').length,
        resolvedTasks: tasks.filter((t) => t.status === 'resolved').length,
        criticalAgents,
        sickAgents,
        injuredAgents,
        criticalHealthAgents,
        lowMoraleAgents,
        socialRisk: lowMoraleAgents >= 4 ? 'high' : lowMoraleAgents >= 2 ? 'medium' : lowMoraleAgents >= 1 ? 'low' : 'none',
      },
      households: households.sort((a, b) => (b.productivityScore ?? 0) - (a.productivityScore ?? 0)),
      agents: agentNeeds.sort((a, b) => (a.hunger - b.hunger) || ((b.morale ?? 60) - (a.morale ?? 60))),
      events,
      tasks,
      buildings,
    };
  },
});