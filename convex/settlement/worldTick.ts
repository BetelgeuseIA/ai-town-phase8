import { mutation } from '../_generated/server';
import { v } from 'convex/values';

// TODO: Importar tipos correctos de Convex cuando estén disponibles
// import { MutationCtx } from '../_generated/server';

// Tipos temporales para estabilización
type WorldId = string;
type TickNumber = number;
type Timestamp = number;

// Helpers
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// === FASE 6: SALUD ===
export function calculateHealthStatus(agent: any) {
  const health = agent.health || 100;
  const sickness = agent.sickness || 0;
  const injury = agent.injury || 0;
  const exhaustion = agent.exhaustion || 0;

  // Prioridad: critical > injured > sick > tired > healthy
  if (health <= 25) return 'critical';
  if (injury >= 50) return 'injured';
  if (sickness >= 50) return 'sick';
  if (exhaustion >= 60) return 'tired';
  return 'healthy';
}

export function calculateHealthMultiplier(healthStatus: string) {
  switch (healthStatus) {
    case 'healthy': return 1.0;
    case 'tired': return 0.85;
    case 'sick': return 0.7;
    case 'injured': return 0.65;
    case 'critical': return 0.4;
    default: return 1.0;
  }
}

export function calculateMoraleModifier(morale: number = 50) {
  if (morale >= 80) return { multiplier: 1.15, label: 'high' };
  if (morale >= 50) return { multiplier: 1.0, label: 'normal' };
  if (morale >= 30) return { multiplier: 0.9, label: 'low' };
  if (morale >= 10) return { multiplier: 0.75, label: 'very_low' };
  return { multiplier: 0.5, label: 'critical' };
}

export function calculateAgentModifier(morale: number = 50, healthStatus: string = 'healthy') {
  const moraleMod = calculateMoraleModifier(morale).multiplier;
  const healthMod = calculateHealthMultiplier(healthStatus);
  return { multiplier: moraleMod * healthMod };
}
export async function advanceTime(ctx: any, worldId: any) {
  const settlement = await ctx.db
    .query('settlements')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .first();

  if (!settlement) throw new Error(`No settlement found for world ${worldId}`);

  await ctx.db.patch(settlement._id, {
    tick: settlement.tick + 1,
  });

  return settlement.tick + 1;
}

// Duraciones y failure chance por tipo de tarea
const TASK_CONFIG: Record<string, { durationTicks: number; failureChance: number }> = {
  eat: { durationTicks: 1, failureChance: 0 },
  rest: { durationTicks: 2, failureChance: 0 },
  idle: { durationTicks: 1, failureChance: 0 },
  gather_food: { durationTicks: 2, failureChance: 0.1 },
  gather_wood: { durationTicks: 3, failureChance: 0.08 },
  gather_stone: { durationTicks: 3, failureChance: 0.08 },
};
// BUILDING_CONFIG — costos, duración y efectos
const BUILDING_CONFIG: Record<string, { cost: { wood: number; stone: number; food: number }; durationTicks: number; durability: number }> = {
  shelter: { cost: { wood: 10, stone: 2, food: 0 }, durationTicks: 4, durability: 100 },
  storage: { cost: { wood: 12, stone: 2, food: 0 }, durationTicks: 5, durability: 100 },
  watchtower: { cost: { wood: 15, stone: 5, food: 0 }, durationTicks: 6, durability: 100 },
  farm: { cost: { wood: 8, stone: 3, food: 2 }, durationTicks: 6, durability: 100 },
};

export async function applyEnvironmentEffects(ctx: any, worldId: any) {
  // Stub simple - en una implementación completa, esto aplicaría efectos ambientales
  console.log(`Applying environment effects for world ${worldId}`);
  return { applied: true };
}

// Aplicar decaimiento de necesidades de los agentes
export async function decayAgentNeeds(ctx: any, worldId: any, decayRates: any = {}, now: number = Date.now()) {
  const hungerDecay = decayRates.hungerDecay ?? 6;
  const energyDecay = decayRates.energyDecay ?? 4;
  const safetyDecay = decayRates.safetyDecay ?? 1;

  const needsDocs = await ctx.db
    .query('agentNeeds')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  let updatedCount = 0;
  for (const needs of needsDocs) {
    const nextNeeds = {
      hunger: Math.max(0, Math.min(100, needs.hunger + hungerDecay)),
      energy: Math.max(0, Math.min(100, needs.energy - energyDecay)),
      safety: Math.max(0, Math.min(100, needs.safety - safetyDecay)),
    };

    await ctx.db.patch(needs._id, {
      ...nextNeeds,
      updatedAt: now,
    });

    updatedCount++;
  }

  return { updatedCount };
}

// Calcular estado de los hogares
export async function computeHouseholdState(ctx: any, worldId: any) {
  const households = await ctx.db
    .query('households')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  let totalFood = 0;
  let totalWood = 0;
  let totalStone = 0;

  for (const household of households) {
    totalFood += household.food || 0;
    totalWood += household.wood || 0;
    totalStone += household.stone || 0;
  }

  return { totalFood, totalWood, totalStone };
}

// Calcular estado general del asentamiento
export async function computeSettlementState(ctx: any, worldId: any) {
  const households = await ctx.db
    .query('households')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  const agents = await ctx.db
    .query('agentNeeds')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  const population = agents.length;
  const avgHunger = agents.reduce((sum: number, a: any) => sum + (a.hunger || 0), 0) / (population || 1);
  const avgEnergy = agents.reduce((sum: number, a: any) => sum + (a.energy || 0), 0) / (population || 1);
  const avgSafety = agents.reduce((sum: number, a: any) => sum + (a.safety || 0), 0) / (population || 1);

  return { population, avgHunger, avgEnergy, avgSafety };
}

// === FASE 4: CRISIS LEVELS ===

export async function calculateCrisisLevel(ctx: any, worldId: any) {
  const households = await ctx.db
    .query('households')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  const agents = await ctx.db
    .query('agentNeeds')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  const buildings = await ctx.db
    .query('buildings')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId).eq('status', 'active'))
    .collect();

  const population = agents.length;
  const totalFood = households.reduce((sum: number, h: any) => sum + (h.food || 0), 0);

  const avgHunger = population > 0
    ? agents.reduce((sum: number, a: any) => sum + (a.hunger || 0), 0) / population
    : 0;
  const avgEnergy = population > 0
    ? agents.reduce((sum: number, a: any) => sum + (a.energy || 0), 0) / population
    : 0;
  const avgSafety = population > 0
    ? agents.reduce((sum: number, a: any) => sum + (a.safety || 0), 0) / population
    : 0;
  const avgMorale = population > 0
    ? agents.reduce((sum: number, a: any) => sum + (a.morale || 50), 0) / population
    : 0;

  // Collapse
  if (population <= 0 || (avgHunger >= 95 && totalFood <= 0) || (avgMorale <= 5 && avgSafety <= 10)) {
    return {
      level: 'collapse',
      reason: population <= 0 ? 'No population' : avgHunger >= 95 && totalFood <= 0 ? 'Starvation' : 'Despair',
      metrics: { avgHunger, avgEnergy, avgSafety, avgMorale, totalFood, population, activeBuildings: buildings.length },
    };
  }

  // Critical
  if (avgHunger >= 80 || avgEnergy <= 15 || avgSafety <= 15 || totalFood <= population * 0.5 || avgMorale <= 20) {
    return {
      level: 'critical',
      reason: avgHunger >= 80 ? 'Severe hunger' : avgEnergy <= 15 ? 'Exhaustion' : avgSafety <= 15 ? 'Unsafe' : totalFood <= population * 0.5 ? 'Food shortage' : 'Low morale',
      metrics: { avgHunger, avgEnergy, avgSafety, avgMorale, totalFood, population, activeBuildings: buildings.length },
    };
  }

  // Strained
  if (totalFood <= population || avgHunger >= 65 || avgEnergy <= 30 || avgSafety <= 30 || avgMorale <= 35) {
    return {
      level: 'strained',
      reason: totalFood <= population ? 'Low food reserves' : avgHunger >= 65 ? 'High hunger' : avgEnergy <= 30 ? 'Low energy' : avgSafety <= 30 ? 'Low safety' : 'Strained morale',
      metrics: { avgHunger, avgEnergy, avgSafety, avgMorale, totalFood, population, activeBuildings: buildings.length },
    };
  }

  // Watch
  if (totalFood <= population * 2 || avgHunger >= 45 || avgEnergy <= 45 || avgSafety <= 45) {
    return {
      level: 'watch',
      reason: totalFood <= population * 2 ? 'Food watch' : avgHunger >= 45 ? 'Moderate hunger' : avgEnergy <= 45 ? 'Moderate exhaustion' : 'Moderate safety concerns',
      metrics: { avgHunger, avgEnergy, avgSafety, avgMorale, totalFood, population, activeBuildings: buildings.length },
    };
  }

  // Stable
  return {
    level: 'stable',
    reason: 'Settlement stable',
    metrics: { avgHunger, avgEnergy, avgSafety, avgMorale, totalFood, population, activeBuildings: buildings.length },
  };
}

export async function detectCrisisLevel(ctx: any, worldId: any, now: number = Date.now()) {
  const settlement = await ctx.db
    .query('settlements')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .first();

  if (!settlement) throw new Error(`No settlement found for world ${worldId}`);

  const crisis = await calculateCrisisLevel(ctx, worldId);

  // Actualizar crisisLevel y emergencyMode
  const isCritical = crisis.level === 'critical' || crisis.level === 'collapse';

  await ctx.db.patch(settlement._id, {
    crisisLevel: crisis.level,
    crisisReason: crisis.reason,
    lastCrisisAt: now,
    emergencyMode: isCritical,
    emergencyReason: isCritical ? crisis.reason : settlement.emergencyReason,
  });

  return { crisisLevel: crisis.level, crisisReason: crisis.reason, emergencyMode: isCritical };
}

export async function updatePolicies(ctx: any, worldId: any, crisisLevel: string = 'stable') {
  // Políticas básicas según nivel de crisis
  const policies: Record<string, string> = {
    stable: 'Normal operations',
    watch: 'Prioritize food gathering',
    strained: 'Subsidize rest and eat',
    critical: 'Restrict non-essential tasks',
    collapse: 'Emergency only: eat, rest, food',
  };

  console.log(`Crisis level: ${crisisLevel} | Policy: ${policies[crisisLevel] || 'Unknown'}`);
  return { crisisLevel, policy: policies[crisisLevel] || 'Unknown' };
}

// === FASE 3: BUILDINGS ===

export async function planBuildingIfNeeded(ctx: any, worldId: any, now: number = Date.now()) {
  const buildings = await ctx.db
    .query('buildings')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  const existingTypes = new Set(buildings.map((b: any) => b.type));
  let plannedCount = 0;

  // Lógica de prioridad simple
  const priority: string[] = [];
  if (!existingTypes.has('shelter')) priority.push('shelter');
  else if (!existingTypes.has('storage')) priority.push('storage');
  else if (!existingTypes.has('farm')) priority.push('farm');
  else if (!existingTypes.has('watchtower')) priority.push('watchtower');

  for (const type of priority) {
    // Verificar que no haya uno del mismo tipo en planned/under_construction/active
    const dupe = await ctx.db
      .query('buildings')
      .withIndex('worldId_type', (q: any) => q.eq('worldId', worldId).eq('type', type))
      .filter((q: any) => q.neq(q.field('status'), 'damaged'))
      .first();

    if (!dupe) {
      await ctx.db.insert('buildings', {
        worldId,
        type,
        status: 'planned',
        durability: BUILDING_CONFIG[type].durability,
        createdAt: now,
        updatedAt: now,
      });
      plannedCount++;
    }
  }

  return { plannedCount };
}

export async function startBuildingConstruction(ctx: any, worldId: any, now: number = Date.now()) {
  const plannedBuildings = await ctx.db
    .query('buildings')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId).eq('status', 'planned'))
    .collect();

  let startedCount = 0;

  for (const building of plannedBuildings) {
    const config = BUILDING_CONFIG[building.type];
    if (!config) continue;

    // Buscar un household con recursos suficientes
    const households = await ctx.db
      .query('households')
      .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
      .collect();

    const household = households.find((h: any) =>
      h.wood >= config.cost.wood && h.stone >= config.cost.stone && h.food >= config.cost.food
    );

    if (!household) continue;

    // Descontar recursos
    await ctx.db.patch(household._id, {
      wood: household.wood - config.cost.wood,
      stone: household.stone - config.cost.stone,
      food: household.food - config.cost.food,
    });

    // Iniciar construcción
    await ctx.db.patch(building._id, {
      status: 'under_construction',
      progress: 0,
      durationTicks: config.durationTicks,
      householdId: household._id,
      updatedAt: now,
    });

    startedCount++;
  }

  return { startedCount };
}

export async function advanceBuildingConstruction(ctx: any, worldId: any, now: number = Date.now()) {
  const activeConstruction = await ctx.db
    .query('buildings')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId).eq('status', 'under_construction'))
    .collect();

  let completedCount = 0;
  let progressedCount = 0;

  for (const building of activeConstruction) {
    const duration = building.durationTicks || 1;
    const currentProgress = (building.progress || 0) + 1;

    if (currentProgress >= duration) {
      await ctx.db.patch(building._id, {
        status: 'active',
        progress: currentProgress,
        builtAtTick: building.tick || 0,
        updatedAt: now,
      });
      completedCount++;
    } else {
      await ctx.db.patch(building._id, {
        progress: currentProgress,
        updatedAt: now,
      });
      progressedCount++;
    }
  }

  return { completedCount, progressedCount };
}

export async function applyBuildingEffects(ctx: any, worldId: any, now: number = Date.now()) {
  const activeBuildings = await ctx.db
    .query('buildings')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId).eq('status', 'active'))
    .collect();

  let shelterBonus = 0;
  let watchtowerBonus = 0;
  let farmFood = 0;
  let storageCount = 0;

  for (const building of activeBuildings) {
    switch (building.type) {
      case 'shelter':
        shelterBonus += 1; // Mejora recuperación de energía
        break;
      case 'watchtower':
        watchtowerBonus += 1; // Mejora safety
        break;
      case 'farm':
        farmFood += 1; // Produce 1 food por tick
        break;
      case 'storage':
        storageCount += 1; // Capacidad futura (TODO)
        break;
    }
  }

  // Aplicar efectos
  if (watchtowerBonus > 0) {
    const agents = await ctx.db
      .query('agentNeeds')
      .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
      .collect();

    for (const agent of agents) {
      await ctx.db.patch(agent._id, {
        safety: Math.min(100, agent.safety + watchtowerBonus),
        updatedAt: now,
      });
    }
  }

  if (farmFood > 0) {
    // Buscar un household para depositar comida
    const households = await ctx.db
      .query('households')
      .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
      .collect();

    if (households.length > 0) {
      const target = households[0]; // Distribuir al primero por simplicidad
      await ctx.db.patch(target._id, {
        food: target.food + farmFood,
      });
    }
  }

  return { shelterBonus, watchtowerBonus, farmFood, storageCount };
}

// Elegir intenciones de los agentes basadas en sus necesidades
export async function chooseAgentIntentions(ctx: any, worldId: any) {
  function chooseTask(needs: { hunger: number; energy: number; safety: number }) {
    if (needs.hunger >= 70) return 'eat';
    if (needs.energy <= 30) return 'rest';
    if (needs.safety <= 30) return 'idle';
    if (needs.hunger >= 45) return 'gather_food';
    if (needs.energy >= 60) return 'gather_wood';
    return 'gather_stone';
  }

  const needsDocs = await ctx.db
    .query('agentNeeds')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  const intentions = [];
  for (const needs of needsDocs) {
    const taskType = chooseTask(needs);
    intentions.push({ playerId: needs.playerId, taskType });
  }

  return { intentions };
}

// Crear o actualizar tareas en la cola
export async function createOrUpdateTasks(ctx: any, worldId: any, now: number = Date.now(), crisisLevel: string = 'stable') {
  const intentions = await chooseAgentIntentions(ctx, worldId);
  let createdTasks = 0;

  for (const intention of intentions.intentions) {
    // Verificar si el agente ya tiene una tarea activa (pending, assigned, o in_progress)
    const existingTask = await ctx.db
      .query('taskQueue')
      .withIndex('worldId', (q: any) => q.eq('worldId', worldId).eq('playerId', intention.playerId))
      .filter((q: any) => q.or(
        q.eq(q.field('status'), 'pending'),
        q.eq(q.field('status'), 'assigned'),
        q.eq(q.field('status'), 'in_progress')
      ))
      .first();

    if (existingTask) {
      continue; // Saltar si ya tiene tarea activa
    }

    // Obtener agente para moral
    const agentNeeds = await ctx.db
      .query('agentNeeds')
      .withIndex('playerId', (q: any) => q.eq('worldId', worldId).eq('playerId', intention.playerId))
      .first();

    const morale = agentNeeds?.morale || 50;

    const healthStatus = agentNeeds?.healthStatus || 'healthy';
    const exhaustion = agentNeeds?.exhaustion || 0;

    // FASE 6: Reglas de salud
    if (healthStatus === 'critical') {
      // Solo eat/rest
      if (intention.taskType !== 'eat' && intention.taskType !== 'rest') {
        intention.taskType = 'rest';
      }
    } else if ((healthStatus === 'sick' || healthStatus === 'injured') && agentNeeds && agentNeeds.energy < 60) {
      // Preferir rest
      if (intention.taskType !== 'eat' && intention.taskType !== 'rest') {
        intention.taskType = 'rest';
      }
    }

    if (exhaustion > 70 && intention.taskType !== 'eat' && intention.taskType !== 'rest') {
      intention.taskType = 'rest';
    }

    // FASE 5: Reglas deterministas de moral baja
    if (morale < 10 && intention.taskType !== 'eat' && intention.taskType !== 'rest') {
      // Muy desmoralizado: solo idle si no es crítico
      if (agentNeeds && agentNeeds.hunger < 70 && agentNeeds.energy > 20) {
        intention.taskType = 'idle';
      }
    } else if (morale < 20 && intention.taskType !== 'eat' && intention.taskType !== 'rest') {
      // Desmoralizado: rest si tiene energía baja
      if (agentNeeds && agentNeeds.energy < 50) {
        intention.taskType = 'rest';
      }
    }

    // FASE 4: Filtrar tareas según crisisLevel
    if (crisisLevel === 'critical' || crisisLevel === 'collapse') {
      const allowedTasks = ['eat', 'rest', 'gather_food', 'idle'];
      if (!allowedTasks.includes(intention.taskType)) {
        intention.taskType = 'gather_food'; // Forzar recolección de comida
      }
    }

    const config = TASK_CONFIG[intention.taskType] || { durationTicks: 1, failureChance: 0 };

    // Prioridad ajustada por crisis
    let priority =
      intention.taskType === 'eat' ? 100 :
      intention.taskType === 'rest' ? 90 :
      intention.taskType === 'idle' ? 70 : 50;

    if (crisisLevel === 'critical' || crisisLevel === 'collapse') {
      if (intention.taskType === 'eat') priority = 120;
      if (intention.taskType === 'gather_food') priority = 110;
    } else if (crisisLevel === 'strained') {
      if (intention.taskType === 'rest') priority = 95;
    }

    await ctx.db.insert('taskQueue', {
      worldId,
      playerId: intention.playerId,
      type: intention.taskType,
      status: 'pending',
      priority,
      createdAt: now,
      updatedAt: now,
      // FASE 2: Campos progresivos
      durationTicks: config.durationTicks,
      progress: 0,
      startedAt: now,
      failureChance: config.failureChance,
    });

    createdTasks++;
  }

  return { createdTasks };
}

// Resolver progreso de tareas (FASE 2: progresivo por tick)
export async function resolveTaskProgress(ctx: any, worldId: any, now: number = Date.now()) {
  // Buscar tareas activas: pending, assigned, in_progress
  const activeTasks = await ctx.db
    .query('taskQueue')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .filter((q: any) => q.or(
      q.eq(q.field('status'), 'pending'),
      q.eq(q.field('status'), 'assigned'),
      q.eq(q.field('status'), 'in_progress')
    ))
    .collect();

  let completedTasks = 0;
  let progressedTasks = 0;

  for (const task of activeTasks) {
    // Si no tiene durationTicks, asignar default seguro
    const duration = task.durationTicks || 1;
    const currentProgress = (task.progress || 0) + 1;

    if (currentProgress >= duration) {
      // Tarea completada
      await ctx.db.patch(task._id, {
        status: 'done',
        progress: currentProgress,
        completedAt: now,
        updatedAt: now,
      });
      completedTasks++;
    } else {
      // Tarea en progreso
      await ctx.db.patch(task._id, {
        status: 'in_progress',
        progress: currentProgress,
        updatedAt: now,
      });
      progressedTasks++;
    }
  }

  return { completedTasks, progressedTasks };
}

// Aplicar resultados de tareas completadas (FASE 2.1: producción real de recursos)
export async function applyTaskResults(ctx: any, worldId: any, now: number = Date.now()) {
  const completedTasks = await ctx.db
    .query('taskQueue')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId).eq('status', 'done'))
    .collect();

  let appliedResults = 0;
  let totalFoodProduced = 0;
  let totalWoodProduced = 0;
  let totalStoneProduced = 0;

  for (const task of completedTasks) {
    // Si no tiene playerId, no podemos aplicar resultados
    if (!task.playerId) {
      await ctx.db.patch(task._id, {
        status: 'resolved',
        resolvedAt: now,
        updatedAt: now,
      });
      appliedResults++;
      continue;
    }

    // Obtener agente para conocer su rol
    const agentNeeds = await ctx.db
      .query('agentNeeds')
      .withIndex('playerId', (q: any) => q.eq('worldId', worldId).eq('playerId', task.playerId))
      .first();

    const role = agentNeeds?.role || 'laborer';

    // Buscar household del agente
    const household = await ctx.db
      .query('households')
      .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
      .filter((q: any) => q.includes(q.field('memberIds'), task.playerId))
      .first();

    // Aplicar efectos según tipo de tarea
    switch (task.type) {
      case 'gather_food': {
        const baseFood = 2;
        const bonus = role === 'forager' ? 2 : 0;
        const agentMod = calculateAgentModifier(agentNeeds?.morale || 50, agentNeeds?.healthStatus || 'healthy');
        const total = Math.max(1, Math.floor((baseFood + bonus) * agentMod.multiplier));

        if (household) {
          await ctx.db.patch(household._id, {
            food: household.food + total,
          });
        }
        totalFoodProduced += total;
        break;
      }
      case 'gather_wood': {
        const baseWood = 2;
        const bonus = role === 'builder' ? 1 : 0;
        const agentMod = calculateAgentModifier(agentNeeds?.morale || 50, agentNeeds?.healthStatus || 'healthy');
        const total = Math.max(1, Math.floor((baseWood + bonus) * agentMod.multiplier));

        if (household) {
          await ctx.db.patch(household._id, {
            wood: household.wood + total,
          });
        }
        totalWoodProduced += total;
        break;
      }
      case 'gather_stone': {
        const baseStone = 1;
        const bonus = role === 'builder' ? 1 : 0;
        const agentMod = calculateAgentModifier(agentNeeds?.morale || 50, agentNeeds?.healthStatus || 'healthy');
        const total = Math.max(1, Math.floor((baseStone + bonus) * agentMod.multiplier));

        if (household) {
          await ctx.db.patch(household._id, {
            stone: household.stone + total,
          });
        }
        totalStoneProduced += total;
        break;
      }
      case 'eat': {
        // Reducir hambre del agente y ayudar salud
        const needs = await ctx.db
          .query('agentNeeds')
          .withIndex('playerId', (q: any) => q.eq('worldId', worldId).eq('playerId', task.playerId))
          .first();

        if (needs) {
          await ctx.db.patch(needs._id, {
            hunger: Math.max(0, needs.hunger - 30),
            health: clamp((needs.health || 100) + 1, 0, 100),
            updatedAt: now,
          });
        }
        break;
      }
      case 'rest': {
        // Aumentar energía del agente y reducir exhaustion
        const needs = await ctx.db
          .query('agentNeeds')
          .withIndex('playerId', (q: any) => q.eq('worldId', worldId).eq('playerId', task.playerId))
          .first();

        if (needs) {
          await ctx.db.patch(needs._id, {
            energy: Math.min(100, needs.energy + 40),
            exhaustion: clamp((needs.exhaustion || 0) - 10, 0, 100),
            updatedAt: now,
          });
        }
        break;
      }
      case 'idle':
        // No cambia recursos ni necesidades
        break;
    }

    // Marcar tarea como resolved para no re-aplicar en el futuro
    await ctx.db.patch(task._id, {
      status: 'resolved',
      resolvedAt: now,
      updatedAt: now,
    });

    appliedResults++;
  }

  return {
    appliedResults,
    foodProduced: totalFoodProduced,
    woodProduced: totalWoodProduced,
    stoneProduced: totalStoneProduced,
  };
}


export async function updateSocialState(ctx: any, worldId: any, now: number = Date.now(), crisisLevel: string = 'stable') {
  const agents = await ctx.db
    .query('agentNeeds')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  const buildings = await ctx.db
    .query('buildings')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId).eq('status', 'active'))
    .collect();

  const households = await ctx.db
    .query('households')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  const totalFood = households.reduce((sum: number, h: any) => sum + (h.food || 0), 0);

  const activeShelter = buildings.find((b: any) => b.type === 'shelter');
  const activeWatchtower = buildings.find((b: any) => b.type === 'watchtower');

  let lowMoraleCount = 0;

  for (const agent of agents) {
    let moraleDelta = 0;
    const currentMorale = agent.morale || 50;

    // Penalizaciones
    if (agent.hunger > 80) moraleDelta -= 4;
    if (agent.energy < 20) moraleDelta -= 3;
    if (agent.safety < 30) moraleDelta -= 3;
    if (crisisLevel === 'critical') moraleDelta -= 4;
    if (crisisLevel === 'collapse') moraleDelta -= 8;

    // Bonificaciones
    if (activeShelter) moraleDelta += 1;
    if (activeWatchtower) moraleDelta += 1;
    if (crisisLevel === 'stable' && totalFood >= agents.length * 2) moraleDelta += 1;

    // Clamp
    const newMorale = Math.max(0, Math.min(100, currentMorale + moraleDelta));

    await ctx.db.patch(agent._id, {
      morale: newMorale,
      updatedAt: now,
    });

    if (newMorale < 30) lowMoraleCount++;
  }

  // Calcular socialRisk
  let socialRisk = 'none';
  if (lowMoraleCount >= 4) socialRisk = 'high';
  else if (lowMoraleCount >= 2) socialRisk = 'medium';
  else if (lowMoraleCount >= 1) socialRisk = 'low';

  return { lowMoraleCount, socialRisk };
}

// FASE 6: Salud funcional
export async function updateHealthState(ctx: any, worldId: any, now: number = Date.now(), crisisLevel: string = 'stable') {
  const agents = await ctx.db
    .query('agentNeeds')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  const buildings = await ctx.db
    .query('buildings')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId).eq('status', 'active'))
    .collect();

  const households = await ctx.db
    .query('households')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId))
    .collect();

  const totalFood = households.reduce((sum: number, h: any) => sum + (h.food || 0), 0);
  const activeShelter = buildings.find((b: any) => b.type === 'shelter');
  const activeFarm = buildings.find((b: any) => b.type === 'farm');
  const activeWatchtower = buildings.find((b: any) => b.type === 'watchtower');

  let sickCount = 0;
  let injuredCount = 0;
  let criticalCount = 0;
  let totalHealth = 0;

  for (const agent of agents) {
    let health = agent.health || 100;
    let sickness = agent.sickness || 0;
    let injury = agent.injury || 0;
    let exhaustion = agent.exhaustion || 0;

    // Penalizaciones
    if (agent.hunger > 85) health = clamp(health - 4, 0, 100);
    else if (agent.hunger > 70) health = clamp(health - 2, 0, 100);

    if (agent.energy < 15) exhaustion = clamp(exhaustion + 5, 0, 100);
    else if (agent.energy < 30) exhaustion = clamp(exhaustion + 2, 0, 100);

    if (agent.safety < 20) injury = clamp(injury + 1, 0, 100);

    if (crisisLevel === 'critical') health = clamp(health - 2, 0, 100);
    if (crisisLevel === 'collapse') health = clamp(health - 5, 0, 100);

    // Recuperación
    if (activeShelter) exhaustion = clamp(exhaustion - 2, 0, 100);
    if (activeFarm && totalFood >= agents.length * 2) health = clamp(health + 1, 0, 100);
    if (activeWatchtower) injury = clamp(injury - 1, 0, 100);

    if (crisisLevel === 'stable' && agent.hunger < 50) health = clamp(health + 1, 0, 100);
    if (agent.energy > 60) exhaustion = clamp(exhaustion - 2, 0, 100);

    // Calcular status
    const healthStatus = calculateHealthStatus({ health, sickness, injury, exhaustion });

    await ctx.db.patch(agent._id, {
      health,
      sickness,
      injury,
      exhaustion,
      healthStatus,
      updatedAt: now,
    });

    if (healthStatus === 'sick') sickCount++;
    if (healthStatus === 'injured') injuredCount++;
    if (healthStatus === 'critical') criticalCount++;
    totalHealth += health;
  }

  const avgHealth = agents.length > 0 ? Math.round(totalHealth / agents.length) : 0;

  return { sickCount, injuredCount, criticalCount, avgHealth };
}

// Generar eventos del asentamiento
export async function generateSettlementEvents(ctx: any, worldId: any, tick: number, state: any, now: number = Date.now()) {
  // Generar solo 1 evento por tick para evitar spam
  const productionSummary = state.foodProduced || state.woodProduced || state.stoneProduced
    ? ` | Food: +${state.foodProduced || 0} Wood: +${state.woodProduced || 0} Stone: +${state.stoneProduced || 0}`
    : '';

  const crisisSummary = state.crisisLevel
    ? ` | Crisis: ${state.crisisLevel}`
    : '';

  const socialSummary = state.socialRisk
    ? ` | Social: ${state.socialRisk}`
    : '';

  const healthSummary = state.avgHealth !== undefined
    ? ` | Health: ${state.avgHealth}%${state.sickCount ? ` Sick:${state.sickCount}` : ''}${state.injuredCount ? ` Inj:${state.injuredCount}` : ''}${state.criticalCount ? ` Crit:${state.criticalCount}` : ''}`
    : '';

  const summary = `Tick ${tick} completed | Population: ${state.population} | Tasks: ${state.tasksCount}${productionSummary}${crisisSummary}${socialSummary}${healthSummary}`;

  await ctx.db.insert('settlementEvents', {
    worldId,
    tick,
    type: 'world_tick_complete',
    summary,
    createdAt: now,
  });

  return { eventsGenerated: 1 };
}

// Guardar snapshot del mundo (stub)
export async function saveWorldSnapshot(ctx: any, worldId: any) {
  // Stub simple - en una implementación completa, esto guardaría un snapshot del mundo
  console.log(`Saving world snapshot for world ${worldId}`);
  return { saved: true };
}

// Mutación principal
export const runWorldTick = mutation({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    try {
      // Timestamp único para todo el ciclo
      const now = Date.now();

      // Ejecutar las funciones en orden
      const tick = await advanceTime(ctx, args.worldId);
      await applyEnvironmentEffects(ctx, args.worldId);
      await decayAgentNeeds(ctx, args.worldId, {}, now);
      await computeHouseholdState(ctx, args.worldId);
      const settlementState = await computeSettlementState(ctx, args.worldId);
      const crisisResult = await detectCrisisLevel(ctx, args.worldId, now);
      await updatePolicies(ctx, args.worldId, crisisResult.crisisLevel);

      // FASE 3: Buildings
      await planBuildingIfNeeded(ctx, args.worldId, now);
      await startBuildingConstruction(ctx, args.worldId, now);
      await advanceBuildingConstruction(ctx, args.worldId, now);
      const buildingEffects = await applyBuildingEffects(ctx, args.worldId, now);

      await chooseAgentIntentions(ctx, args.worldId);
      const taskResult = await createOrUpdateTasks(ctx, args.worldId, now, crisisResult.crisisLevel);
      await resolveTaskProgress(ctx, args.worldId, now);
      const taskResults = await applyTaskResults(ctx, args.worldId, now);
      const socialState = await updateSocialState(ctx, args.worldId, now, crisisResult.crisisLevel);
      const healthState = await updateHealthState(ctx, args.worldId, now, crisisResult.crisisLevel);
      
      // Generar eventos requeridos
      const eventsResult = await generateSettlementEvents(ctx, args.worldId, tick, {
        population: settlementState.population,
        tasksCount: taskResult.createdTasks,
        foodProduced: taskResults.foodProduced,
        woodProduced: taskResults.woodProduced,
        stoneProduced: taskResults.stoneProduced,
        crisisLevel: crisisResult.crisisLevel,
        socialRisk: socialState.socialRisk,
        avgHealth: healthState.avgHealth,
        sickCount: healthState.sickCount,
        injuredCount: healthState.injuredCount,
        criticalCount: healthState.criticalCount,
      }, now);

      await saveWorldSnapshot(ctx, args.worldId);

      return {
        ok: true,
        tick,
        eventsGenerated: eventsResult.eventsGenerated
      };
    } catch (error) {
      console.error('Error in runWorldTick:', error);
      throw error;
    }
  },
});