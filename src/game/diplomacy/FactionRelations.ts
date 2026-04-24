/**
 * FactionRelations.ts
 * Matriz de relaciones entre facciones + factores que afectan relaciones.
 * Alianzas transitivas y enemistades propagadas.
 */

export enum RelationState {
  ALLIED = 'allied',
  FRIENDLY = 'friendly',
  NEUTRAL = 'neutral',
  HOSTILE = 'hostile',
  WAR = 'war',
}

export interface FactionRelation {
  state: RelationState;
  score: number; // -100 (war) to +100 (allied)
  lastUpdate: number; // timestamp
  tradeAgreements: TradeAgreement[];
  allianceId?: string; // ID de alianza si están aliados
  activeWar: boolean;
}

export interface TradeAgreement {
  id: string;
  from: string;
  to: string;
  resource: string;
  amount: number;
  duration: number; // ticks restantes
  active: boolean;
}

export interface FactionReputation {
  factionId: string;
  globalReputation: number; // -100 a +100
  killsAgainst: Map<string, number>; // kills vs otra faccion
  giftsGiven: Map<string, number>; // regalos dados a cada faccion
  tradesCompleted: number;
}

export class FactionRelations {
  // Matriz de relaciones: [faction1][faction2] = relation
  private relations: Map<string, Map<string, FactionRelation>> = new Map();

  // Reputación global de cada facción
  private reputations: Map<string, FactionReputation> = new Map();

  // Registro de alianzas: allianceId -> Set<factionIds>
  private alliances: Map<string, Set<string>> = new Map();

  // Factor de decaimiento por tick (relaciones se acercan a neutral)
  private readonly DECAY_RATE = 0.5; // puntos por tick hacia neutral
  private readonly ALLIANCE_TRANSITIVE_BONUS = 20; // bonus por aliado transitivo
  private readonly ENEMY_PROPAGATION_PENALTY = 15; // penalización por enemigo de mi enemigo

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Inicializar 4 facciones base (ejemplo)
    const factions = ['wolves', 'bears', 'eagles', 'serpents'];

    factions.forEach(f => {
      this.reputations.set(f, {
        factionId: f,
        globalReputation: 0,
        killsAgainst: new Map(),
        giftsGiven: new Map(),
        tradesCompleted: 0,
      });
    });
  }

  /**
   * Obtiene la relación entre dos facciones.
   * Aplica alianzas transitivas y enemistades propagadas.
   */
  getRelation(faction1: string, faction2: string): FactionRelation {
    if (faction1 === faction2) {
      return {
        state: RelationState.ALLIED,
        score: 100,
        lastUpdate: Date.now(),
        tradeAgreements: [],
        activeWar: false,
      };
    }

    // Obtener relación base
    let relation = this.getDirectRelation(faction1, faction2);

    // Aplicar bonus de alianzas transitivas (amigo de mi amigo)
    const transitiveBonus = this.calculateTransitiveBonus(faction1, faction2);
    relation.score += transitiveBonus;

    // Aplicar penalización de enemistades propagadas
    const enemyPenalty = this.calculateEnemyPropagation(faction1, faction2);
    relation.score += enemyPenalty;

    // Normalizar score a rango válido
    relation.score = Math.max(-100, Math.min(100, relation.score));

    // Actualizar estado basado en score final
    relation.state = this.scoreToState(relation.score);

    return relation;
  }

  private getDirectRelation(faction1: string, faction2: string): FactionRelation {
    const f1Map = this.relations.get(faction1);
    if (f1Map && f1Map.has(faction2)) {
      return { ...f1Map.get(faction2)! };
    }

    // Relation not found → neutral
    return {
      state: RelationState.NEUTRAL,
      score: 0,
      lastUpdate: Date.now(),
      tradeAgreements: [],
      activeWar: false,
    };
  }

  /**
   * Calcula el bonus por alianzas transitivas.
   * Si A es aliado de B, y B es aliado de C, A recibe +20 con C.
   */
  private calculateTransitiveBonus(f1: string, f2: string): number {
    let bonus = 0;

    // Buscar alianzas de f1
    const f1Alliances = this.getFactionAlliances(f1);
    // Buscar aliados de f2
    const f2Allies = this.getFactionAlliances(f2);

    // Intersection = aliados compartidos (transitivos)
    const sharedAllies = f1Alliances.filter(a => f2Allies.includes(a));
    bonus += sharedAllies.length * this.ALLIANCE_TRANSITIVE_BONUS;

    return bonus;
  }

  /**
   * Calcula penalización por enemistades propagadas.
   * Si A es enemigo de B, y B es aliado de C, A recibe -15 con C.
   */
  private calculateEnemyPropagation(f1: string, f2: string): number {
    let penalty = 0;

    // Enemigos de f1
    const f1Enemies = this.getFactionEnemies(f1);
    // Aliados de f2
    const f2Allies = this.getFactionAlliances(f2);

    // Si algún enemigo de f1 es aliado de f2, penalizar
    const commonEnemies = f1Enemies.filter(e => f2Allies.includes(e));
    penalty -= commonEnemies.length * this.ENEMY_PROPAGATION_PENALTY;

    return penalty;
  }

  private getFactionAlliances(faction: string): string[] {
    const allies: string[] = [];
    this.alliances.forEach((members, allianceId) => {
      if (members.has(faction)) {
        members.forEach(m => {
          if (m !== faction) allies.push(m);
        });
      }
    });
    return allies;
  }

  private getFactionEnemies(faction: string): string[] {
    const enemies: string[] = [];
    this.relations.forEach((f2Map, f1) => {
      if (f1 === faction) {
        f2Map.forEach((rel, f2) => {
          if (rel.state === RelationState.WAR || rel.state === RelationState.HOSTILE) {
            enemies.push(f2);
          }
        });
      }
    });
    return enemies;
  }

  private scoreToState(score: number): RelationState {
    if (score >= 75) return RelationState.ALLIED;
    if (score >= 30) return RelationState.FRIENDLY;
    if (score >= -30) return RelationState.NEUTRAL;
    if (score >= -75) return RelationState.HOSTILE;
    return RelationState.WAR;
  }

  /**
   * Registra un combate entre facciones.
   */
  registerCombat(winner: string, loser: string, victimFaction: string) {
    // El ganador gana reputación con aliados del perdedor
    const loserAllies = this.getFactionAlliances(loser);
    loserAllies.forEach(ally => {
      this.modifyRelation(winner, ally, -10); // Hostil hacia el ganador
    });

    // El perdedor pierde reputación global
    const rep = this.reputations.get(loser);
    if (rep) {
      rep.globalReputation -= 5;
      const kills = rep.killsAgainst.get(victimFaction) || 0;
      rep.killsAgainst.set(victimFaction, kills);
    }

    // Registrar kill
    const winnerRep = this.reputations.get(winner);
    if (winnerRep) {
      const prev = winnerRep.killsAgainst.get(loser) || 0;
      winnerRep.killsAgainst.set(loser, prev + 1);
    }
  }

  /**
   * Registra comercio entre dos facciones.
   */
  registerTrade(faction1: string, faction2: string, success: boolean) {
    if (success) {
      this.modifyRelation(faction1, faction2, 5);
      this.modifyRelation(faction2, faction1, 5);

      const rep1 = this.reputations.get(faction1);
      const rep2 = this.reputations.get(faction2);
      if (rep1) rep1.tradesCompleted++;
      if (rep2) rep2.tradesCompleted++;
    } else {
      this.modifyRelation(faction1, faction2, -3);
    }
  }

  /**
   * Registra un regalo dado de una facción a otra.
   */
  registerGift(from: string, to: string, value: number) {
    // Quien regala gana reputación con el receptor
    this.modifyRelation(from, to, Math.min(15, value / 10));

    // Registro de regalos
    const rep = this.reputations.get(from);
    if (rep) {
      const prev = rep.giftsGiven.get(to) || 0;
      rep.giftsGiven.set(to, prev + value);
    }
  }

  /**
   * Modifica la relación directa entre dos facciones.
   */
  modifyRelation(faction1: string, faction2: string, change: number) {
    if (!this.relations.has(faction1)) {
      this.relations.set(faction1, new Map());
    }

    const f1Map = this.relations.get(faction1)!;
    const existing = f1Map.get(faction2);

    if (existing) {
      existing.score = Math.max(-100, Math.min(100, existing.score + change));
      existing.lastUpdate = Date.now();
      existing.state = this.scoreToState(existing.score);
    } else {
      const newScore = change;
      f1Map.set(faction2, {
        state: this.scoreToState(newScore),
        score: newScore,
        lastUpdate: Date.now(),
        tradeAgreements: [],
        activeWar: newScore <= -75,
      });
    }

    // Asegurar simetría
    this.ensureSymmetry(faction1, faction2);
  }

  /**
   * Asegura que la relación A→B sea consistente con B→A.
   */
  private ensureSymmetry(f1: string, f2: string) {
    const f1Map = this.relations.get(f1);
    const f2Map = this.relations.get(f2);

    if (f1Map && f2Map) {
      const r1 = f1Map.get(f2);
      const r2 = f2Map.get(f1);

      if (r1 && r2) {
        const avg = Math.round((r1.score + r2.score) / 2);
        r1.score = avg;
        r2.score = avg;
        r1.state = this.scoreToState(avg);
        r2.state = this.scoreToState(avg);
      }
    }
  }

  /**
   * Aplica decaimiento por tick (acerca relaciones a neutral).
   */
  applyDecay() {
    this.relations.forEach((f2Map, f1) => {
      f2Map.forEach((rel, f2) => {
        if (rel.score > 0) {
          rel.score = Math.max(0, rel.score - this.DECAY_RATE);
        } else if (rel.score < 0) {
          rel.score = Math.min(0, rel.score + this.DECAY_RATE);
        }
        rel.lastUpdate = Date.now();
        rel.state = this.scoreToState(rel.score);
      });
    });
  }

  /**
   * Crea una alianza entre dos facciones.
   */
  formAlliance(faction1: string, faction2: string): string {
    const allianceId = `alliance_${faction1}_${faction2}_${Date.now()}`;

    if (!this.alliances.has(allianceId)) {
      this.alliances.set(allianceId, new Set([faction1, faction2]));
    }

    // Aplicar bonus de alianza
    this.modifyRelation(faction1, faction2, 50);

    return allianceId;
  }

  /**
   * Agrega un acuerdo comercial.
   */
  addTradeAgreement(from: string, to: string, resource: string, amount: number, duration: number) {
    const agreement: TradeAgreement = {
      id: `trade_${Date.now()}`,
      from,
      to,
      resource,
      amount,
      duration,
      active: true,
    };

    const f1Map = this.relations.get(from);
    if (f1Map) {
      const rel = f1Map.get(to);
      if (rel) {
        rel.tradeAgreements.push(agreement);
      }
    }

    return agreement;
  }

  /**
   * Obtiene todas las facciones registradas.
   */
  getAllFactions(): string[] {
    return Array.from(this.reputations.keys());
  }

  /**
   * Obtiene reputación global de una facción.
   */
  getReputation(faction: string): FactionReputation | undefined {
    return this.reputations.get(faction);
  }

  /**
   * Serializa para guardado.
   */
  serialize(): object {
    const relationsObj: Record<string, Record<string, FactionRelation>> = {};
    this.relations.forEach((f2Map, f1) => {
      relationsObj[f1] = {};
      f2Map.forEach((rel, f2) => {
        relationsObj[f1][f2] = rel;
      });
    });

    const reputationsArr: FactionReputation[] = [];
    this.reputations.forEach(rep => {
      reputationsArr.push({
        ...rep,
        killsAgainst: Object.fromEntries(rep.killsAgainst) as any,
        giftsGiven: Object.fromEntries(rep.giftsGiven) as any,
      });
    });

    return {
      relations: relationsObj,
      reputations: reputationsArr,
      alliances: Array.from(this.alliances.entries()),
    };
  }

  /**
   * Carga desde estado guardado.
   */
  deserialize(data: any) {
    if (data.relations) {
      this.relations.clear();
      Object.entries(data.relations).forEach(([f1, f2Map]: [any, any]) => {
        this.relations.set(f1, new Map());
        Object.entries(f2Map).forEach(([f2, rel]: [any, any]) => {
          (this.relations.get(f1) as Map<string, FactionRelation>).set(f2, rel);
        });
      });
    }

    if (data.alliances) {
      this.alliances = new Map(data.alliances);
    }
  }
}
