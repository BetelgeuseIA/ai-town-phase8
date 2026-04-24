/**
 * DiplomacyManager.ts
 * Gestión central de facciones, relaciones y decaimiento temporal.
 */

import { FactionRelations, RelationState, FactionReputation } from './FactionRelations';
import { DiplomaticActions } from './DiplomaticActions';

export interface FactionInfo {
  id: string;
  name: string;
  color: number;
  territory: number;
}

export interface DiplomaticEvent {
  type: 'warDeclared' | 'peaceProposed' | 'allianceFormed' | 'tradeSigned' | 'giftSent' | 'relationDecayed';
  from?: string;
  to?: string;
  data?: any;
  timestamp: number;
}

export class DiplomacyManager {
  private relations: FactionRelations;
  private actions: DiplomaticActions;

  // Info de facciones registradas
  private factions: Map<string, FactionInfo> = new Map();

  // Cola de eventos para UI/subscribers
  private eventLog: DiplomaticEvent[] = [];

  // Tick actual para decaimiento
  private currentTick: number = 0;
  private readonly DECAY_INTERVAL = 100; // Cada 100 ticks aplica decaimiento

  constructor() {
    this.relations = new FactionRelations();
    this.actions = new DiplomaticActions(this);
  }

  /**
   * Inicializa con facciones base.
   */
  initialize(factionConfigs: FactionInfo[]) {
    factionConfigs.forEach(f => {
      this.factions.set(f.id, f);
    });
  }

  /**
   * Obtiene el estado de relación entre dos facciones.
   */
  getRelation(faction1: string, faction2: string) {
    return this.relations.getRelation(faction1, faction2);
  }

  /**
   * Obtiene el estado de relación como string amigable para IA.
   */
  getRelationDescription(faction1: string, faction2: string): string {
    const rel = this.getRelation(faction1, faction2);
    const stateLabels = {
      [RelationState.ALLIED]: 'aliado',
      [RelationState.FRIENDLY]: 'amistoso',
      [RelationState.NEUTRAL]: 'neutral',
      [RelationState.HOSTILE]: 'hostil',
      [RelationState.WAR]: 'en guerra',
    };
    return stateLabels[rel.state];
  }

  /**
   * Obtiene todas las relaciones de una facción.
   */
  getAllRelationsFor(faction: string): Array<{ faction: string; relation: ReturnType<FactionRelations['getRelation']> }> {
    const allFactions = this.relations.getAllFactions();
    return allFactions
      .filter(f => f !== faction)
      .map(f => ({
        faction: f,
        relation: this.getRelation(faction, f),
      }));
  }

  /**
   * Actualiza relación directamente (para uso interno).
   */
  updateRelation(faction1: string, faction2: string, change: number) {
    this.relations.modifyRelation(faction1, faction2, change);
    this.emitEvent({
      type: 'relationDecayed',
      from: faction1,
      to: faction2,
      data: { change },
      timestamp: Date.now(),
    });
  }

  /**
   * Registra una facción nueva.
   */
  registerFaction(id: string, name: string, color: number, territory: number) {
    this.factions.set(id, { id, name, color, territory });
  }

  /**
   * Obtiene info de facción.
   */
  getFactionInfo(id: string): FactionInfo | undefined {
    return this.factions.get(id);
  }

  /**
   * Tick del juego - aplica decaimiento periódicamente.
   */
  tick() {
    this.currentTick++;
    if (this.currentTick % this.DECAY_INTERVAL === 0) {
      this.relations.applyDecay();
    }
  }

  /**
   * Obtiene instancia de DiplomaticActions.
   */
  getActions(): DiplomaticActions {
    return this.actions;
  }

  /**
   * Obtiene instancia de FactionRelations (para acceso interno).
   */
  getRelations(): FactionRelations {
    return this.relations;
  }

  /**
   * Registra un evento diplomático.
   */
  emitEvent(event: DiplomaticEvent) {
    this.eventLog.unshift(event); // Más reciente primero
    if (this.eventLog.length > 100) {
      this.eventLog.pop();
    }
  }

  /**
   * Obtiene historial de eventos.
   */
  getEventLog(limit: number = 20): DiplomaticEvent[] {
    return this.eventLog.slice(0, limit);
  }

  /**
   * Verifica si dos facciones pueden interactuar diplomáticamente.
   */
  canInteract(faction1: string, faction2: string): boolean {
    const rel = this.getRelation(faction1, faction2);
    // En guerra no pueden hacer acciones diplomáticas (excepto proponer paz)
    return rel.state !== RelationState.WAR;
  }

  /**
   * Obtiene score de relación numérico (útil para IA).
   * Rango: -100 (enemigo total) a +100 (aliado total)
   */
  getRelationScore(faction1: string, faction2: string): number {
    return this.getRelation(faction1, faction2).score;
  }

  /**
   * Obtiene todas las facciones en guerra con una dada.
   */
  getAtWarWith(faction: string): string[] {
    const relations = this.getAllRelationsFor(faction);
    return relations
      .filter(r => r.relation.state === RelationState.WAR)
      .map(r => r.faction);
  }

  /**
   * Obtiene aliados de una facción.
   */
  getAlliesOf(faction: string): string[] {
    const relations = this.getAllRelationsFor(faction);
    return relations
      .filter(r => r.relation.state === RelationState.ALLIED)
      .map(r => r.faction);
  }

  /**
   * Sugiere acciones diplomáticas para una facción (para IA).
   */
  suggestDiplomaticActions(faction: string): Array<{
    action: string;
    target: string;
    priority: number;
    reason: string;
  }> {
    const suggestions: Array<{
      action: string;
      target: string;
      priority: number;
      reason: string;
    }> = [];

    const relations = this.getAllRelationsFor(faction);

    // Enemigos en guerra → sugerir propuesta de paz
    const atWar = relations.filter(r => r.relation.state === RelationState.WAR);
    atWar.forEach(r => {
      suggestions.push({
        action: 'proposePeace',
        target: r.faction,
        priority: 80,
        reason: 'Guerra costosa, proponer paz',
      });
    });

    // Neutrales → sugerir regalo o comercio
    const neutral = relations.filter(r => r.relation.state === RelationState.NEUTRAL);
    neutral.forEach(r => {
      suggestions.push({
        action: 'sendGift',
        target: r.faction,
        priority: 40,
        reason: 'Mejorar relaciones neutrales',
      });
      suggestions.push({
        action: 'proposeTrade',
        target: r.faction,
        priority: 35,
        reason: 'Establecer comercio',
      });
    });

    // Hostiles → evitar o preparar guerra
    const hostile = relations.filter(r => r.relation.state === RelationState.HOSTILE);
    hostile.forEach(r => {
      suggestions.push({
        action: 'sendGift',
        target: r.faction,
        priority: 60,
        reason: 'Reducir hostilidad',
      });
    });

    // Friendlies → proponer alianza
    const friendly = relations.filter(r => r.relation.state === RelationState.FRIENDLY);
    friendly.forEach(r => {
      suggestions.push({
        action: 'formAlliance',
        target: r.faction,
        priority: 70,
        reason: 'Formalizar alianza',
      });
    });

    // Ordenar por prioridad
    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Serializa estado para guardado.
   */
  serialize(): object {
    return {
      currentTick: this.currentTick,
      eventLog: this.eventLog,
      relations: this.relations.serialize(),
    };
  }

  /**
   * Carga estado guardado.
   */
  deserialize(data: any) {
    if (data.currentTick) this.currentTick = data.currentTick;
    if (data.eventLog) this.eventLog = data.eventLog;
    if (data.relations) this.relations.deserialize(data.relations);
  }
}
