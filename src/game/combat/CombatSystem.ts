/**
 * Combat System - Sistema de combate no-letal por turnos
 * Los derrotados huyen o se rinden, nadie muere
 * Afectado por moral y fatiga
 */

export interface CombatStats {
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  morale: number;
  fatigue: number;
}

export interface Combatant {
  id: string;
  name: string;
  stats: CombatStats;
  isDefeated: boolean;
  combatType: 'melee' | 'ranged';
}

export interface CombatResult {
  winner: Combatant | null;
  loser: Combatant | null;
  rounds: number;
  endType: 'surrender' | 'flee' | 'knockout';
  log: string[];
}

export class CombatSystem {
  private turnDuration: number = 1000; // 1 second per turn
  private critChance: number = 0.08; // 8% base crit chance
  
  initiateCombat(attacker: Combatant, defender: Combatant): CombatResult {
    const log: string[] = [];
    let rounds = 0;
    
    log.push(`¡${attacker.name} desafía a ${defender.name}!`);
    
    // Make copies to avoid modifying originals
    const combatantA = { ...attacker, stats: { ...attacker.stats } };
    const combatantB = { ...defender, stats: { ...defender.stats } };
    
    while (!combatantA.isDefeated && !combatantB.isDefeated && rounds < 50) {
      rounds++;
      
      // Determine turn order by speed
      const aGoesFirst = combatantA.stats.speed >= combatantB.stats.speed;
      
      if (aGoesFirst) {
        this.executeAttack(combatantA, combatantB, log);
        if (!combatantB.isDefeated) {
          this.executeAttack(combatantB, combatantA, log);
        }
      } else {
        this.executeAttack(combatantB, combatantA, log);
        if (!combatantA.isDefeated) {
          this.executeAttack(combatantA, combatantB, log);
        }
      }
      
      // Check for surrender/flee conditions
      this.checkDefeatConditions(combatantA, log);
      this.checkDefeatConditions(combatantB, log);
    }
    
    // Determine result
    let endType: 'surrender' | 'flee' | 'knockout' = 'knockout';
    if (combatantA.isDefeated && combatantA.stats.morale < 15) {
      endType = 'surrender';
    } else if (combatantA.isDefeated && combatantA.stats.health < combatantA.stats.maxHealth * 0.3) {
      endType = 'flee';
    } else if (combatantB.isDefeated && combatantB.stats.morale < 15) {
      endType = 'surrender';
    } else if (combatantB.isDefeated && combatantB.stats.health < combatantB.stats.maxHealth * 0.3) {
      endType = 'flee';
    }
    
    const result: CombatResult = {
      winner: combatantA.isDefeated ? combatantB : combatantA,
      loser: combatantA.isDefeated ? combatantA : combatantB,
      rounds,
      endType,
      log
    };
    
    if (result.winner && result.loser) {
      switch (endType) {
        case 'surrender':
          log.push(`${result.loser.name} se rinde ante ${result.winner.name}.`);
          break;
        case 'flee':
          log.push(`${result.loser.name} huye del combate.`);
          break;
        case 'knockout':
          log.push(`${result.loser.name} queda fuera de combate.`);
          break;
      }
    }
    
    return result;
  }
  
  private executeAttack(attacker: Combatant, defender: Combatant, log: string[]) {
    // Calculate damage
    const damage = this.calculateDamage(attacker, defender);
    
    // Apply damage
    defender.stats.health = Math.max(0, defender.stats.health - damage.total);
    
    // Log the attack
    if (damage.isCrit) {
      log.push(`¡${attacker.name} hace un ataque crítico! ${damage.total} de daño.`);
    } else {
      log.push(`${attacker.name} ataca y causa ${damage.total} de daño.`);
    }
    
    // Update morale and fatigue
    defender.stats.morale -= damage.total * 0.2;
    attacker.stats.fatigue += 5;
    defender.stats.fatigue += 3;
  }
  
  private calculateDamage(attacker: Combatant, defender: Combatant): { total: number, isCrit: boolean } {
    // Base damage calculation
    const attackPower = attacker.stats.attack * 
                       (attacker.stats.morale / 100) * 
                       (1 - attacker.stats.fatigue / 200);
    
    const defensePower = defender.stats.defense * 
                        (defender.stats.morale / 100) * 
                        (1 - defender.stats.fatigue / 200);
    
    // Range modifier
    const rangeModifier = attacker.combatType === 'ranged' ? 1.2 : 1.0;
    
    // Calculate raw damage
    let damage = Math.max(1, (attackPower * rangeModifier) - (defensePower * 0.5));
    
    // Critical hit check
    const isCrit = Math.random() < this.critChance;
    if (isCrit) {
      damage *= attacker.combatType === 'melee' ? 1.5 : 2.0;
    }
    
    return {
      total: Math.round(damage),
      isCrit
    };
  }
  
  private checkDefeatConditions(combatant: Combatant, log: string[]) {
    // Check health
    if (combatant.stats.health <= 0) {
      combatant.isDefeated = true;
      return;
    }
    
    // Check morale (surrender)
    if (combatant.stats.morale < 10) {
      combatant.isDefeated = true;
      log.push(`${combatant.name} pierde la voluntad de luchar.`);
      return;
    }
    
    // Check fatigue + low health (flee)
    if (combatant.stats.fatigue > 80 && combatant.stats.health < combatant.stats.maxHealth * 0.3) {
      combatant.isDefeated = true;
      log.push(`${combatant.name} está demasiado cansado para continuar.`);
      return;
    }
  }
  
  // Quick combat resolution for auto-battles
  resolveCombat(attacker: Combatant, defender: Combatant): CombatResult {
    // Simplified instant resolution
    const attackerPower = attacker.stats.attack + attacker.stats.speed + attacker.stats.health;
    const defenderPower = defender.stats.defense + defender.stats.speed + defender.stats.health;
    
    const attackerWins = (attackerPower * (1 + Math.random() * 0.3)) > 
                        (defenderPower * (1 + Math.random() * 0.3));
    
    return {
      winner: attackerWins ? attacker : defender,
      loser: attackerWins ? defender : attacker,
      rounds: Math.floor(Math.random() * 10) + 5,
      endType: Math.random() < 0.3 ? 'surrender' : Math.random() < 0.6 ? 'flee' : 'knockout',
      log: [`Combate rápido resuelto entre ${attacker.name} y ${defender.name}`]
    };
  }
  
  // Create a test combatant
  createTestCombatant(name: string, type: 'melee' | 'ranged' = 'melee'): Combatant {
    return {
      id: `combatant_${Math.random().toString(36).substr(2, 9)}`,
      name,
      stats: {
        health: 100,
        maxHealth: 100,
        attack: 20 + Math.floor(Math.random() * 10),
        defense: 15 + Math.floor(Math.random() * 10),
        speed: 10 + Math.floor(Math.random() * 10),
        morale: 100,
        fatigue: 0
      },
      isDefeated: false,
      combatType: type
    };
  }
}