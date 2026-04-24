/**
 * DiplomaticActions.ts
 * Acciones diplomáticas: regalos, declaraciones de guerra, paz, alianzas, comercio.
 * Cada acción afecta las relaciones y el comportamiento de la IA.
 */

import { DiplomacyManager } from './DiplomacyManager';
import { FactionRelations, RelationState } from './FactionRelations';

export interface TradeTerms {
  from: string;
  to: string;
  resource: string;
  amount: number;
  duration: number; // ticks
  accepted: boolean;
}

export interface PeaceProposal {
  from: string;
  to: string;
  offeredResources?: Record<string, number>;
  proposedTerms?: string;
  turnsUntilExpiry: number;
}

export class DiplomaticActions {
  private diplomacy: DiplomacyManager;

  // Propuestas de paz activas
  private peaceProposals: PeaceProposal[] = [];

  // Acuerdos comerciales activos
  private activeTradeDeals: TradeTerms[] = [];

  constructor(diplomacy: DiplomacyManager) {
    this.diplomacy = diplomacy;
  }

  /**
   * Envía un regalo de una facción a otra.
   * Mejora la relación proporcional al valor.
   */
  sendGift(from: string, to: string, resource: string, amount: number): {
    success: boolean;
    relationChange: number;
    message: string;
  } {
    const relations = this.diplomacy.getRelations();

    // Verificar que no estén en guerra
    const currentRelation = this.diplomacy.getRelation(from, to);
    if (currentRelation.state === RelationState.WAR) {
      return {
        success: false,
        relationChange: 0,
        message: 'No se pueden enviar regalos a facciones en guerra',
      };
    }

    // Calcular mejora de relación basada en valor
    const relationChange = Math.min(15, Math.floor(amount / 10) + 5);

    // Aplicar mejora
    relations.modifyRelation(from, to, relationChange);
    relations.modifyRelation(to, from, Math.floor(relationChange / 2)); // Réciproca menor

    // Registrar regalo
    relations.registerGift(from, to, amount);

    // Emitir evento
    this.diplomacy.emitEvent({
      type: 'giftSent',
      from,
      to,
      data: { resource, amount, relationChange },
      timestamp: Date.now(),
    });

    return {
      success: true,
      relationChange,
      message: `${from} envía ${amount} ${resource} a ${to}. Relación +${relationChange}`,
    };
  }

  /**
   * Declara guerra de una facción a otra.
   * Puede generar enemigos en cadena.
   */
  declareWar(
    aggressor: string,
    target: string,
    options?: { automaticResponses?: boolean }
  ): {
    success: boolean;
    affectedFactions: string[];
    message: string;
  } {
    const relations = this.diplomacy.getRelations();
    const affectedFactions: string[] = [target];

    // Obtener aliados del agresor (que podrían unirse a la guerra)
    const aggressorAllies = this.diplomacy.getAlliesOf(aggressor);

    // Obtener aliados del objetivo
    const targetAllies = this.diplomacy.getAlliesOf(target);

    // Establecer relación de guerra directa
    relations.modifyRelation(aggressor, target, -100);
    relations.modifyRelation(target, aggressor, -100);

    // Propagar guerra a aliados del objetivo (enemigos del enemigo)
    if (options?.automaticResponses !== false) {
      targetAllies.forEach(ally => {
        // Si el aliado tiene mala relación con el agresor, también entra en guerra
        const relWithAggressor = this.diplomacy.getRelationScore(ally, aggressor);
        if (relWithAggressor < -30) {
          relations.modifyRelation(ally, aggressor, -50);
          relations.modifyRelation(aggressor, ally, -30);
          affectedFactions.push(ally);
        }
      });
    }

    // Emitir evento
    this.diplomacy.emitEvent({
      type: 'warDeclared',
      from: aggressor,
      to: target,
      data: { affectedFactions },
      timestamp: Date.now(),
    });

    return {
      success: true,
      affectedFactions,
      message: `${aggressor} declara guerra a ${target}. ${affectedFactions.length > 1 ? `Guerra extendida a: ${affectedFactions.join(', ')}` : ''}`,
    };
  }

  /**
   * Propone paz entre dos facciones.
   * El objetivo puede aceptar o rechazar.
   */
  proposePeace(
    from: string,
    to: string,
    terms?: { offeredResources?: Record<string, number> }
  ): {
    success: boolean;
    proposalId: string;
    message: string;
  } {
    // Solo puede proponer paz si están en guerra
    const currentRelation = this.diplomacy.getRelation(from, to);
    if (currentRelation.state !== RelationState.WAR) {
      return {
        success: false,
        proposalId: '',
        message: 'Las facciones no están en guerra',
      };
    }

    const proposal: PeaceProposal = {
      from,
      to,
      offeredResources: terms?.offeredResources,
      turnsUntilExpiry: 10, // 10 turnos para responder
    };

    this.peaceProposals.push(proposal);

    this.diplomacy.emitEvent({
      type: 'peaceProposed',
      from,
      to,
      data: { proposalId: proposal.from + '_' + proposal.to },
      timestamp: Date.now(),
    });

    return {
      success: true,
      proposalId: `${from}_${to}`,
      message: `${from} propone paz a ${to}. Esperando respuesta...`,
    };
  }

  /**
   * Responde a una propuesta de paz.
   */
  respondToPeaceProposal(
    responder: string,
    proposalId: string,
    accept: boolean
  ): { success: boolean; message: string } {
    const [from, to] = proposalId.split('_');
    const proposal = this.peaceProposals.find(p => p.from === from && p.to === to);

    if (!proposal) {
      return { success: false, message: 'Propuesta no encontrada' };
    }

    if (responder !== to) {
      return { success: false, message: 'Solo el destinatario puede responder' };
    }

    if (accept) {
      const relations = this.diplomacy.getRelations();
      relations.modifyRelation(from, to, 30);
      relations.modifyRelation(to, from, 30);

      // Si hay recursos ofrecidos, aplicarlos
      if (proposal.offeredResources) {
        Object.entries(proposal.offeredResources).forEach(([resource, amount]) => {
          relations.modifyRelation(from, to, Math.min(10, amount as number / 20));
        });
      }

      this.diplomacy.emitEvent({
        type: 'peaceProposed',
        from,
        to,
        data: { accepted: true },
        timestamp: Date.now(),
      });

      this.peaceProposals = this.peaceProposals.filter(p => p !== proposal);

      return { success: true, message: `${to} acepta la paz. Alto el fuego establecido.` };
    } else {
      this.diplomacy.emitEvent({
        type: 'peaceProposed',
        from,
        to,
        data: { accepted: false },
        timestamp: Date.now(),
      });

      this.peaceProposals = this.peaceProposals.filter(p => p !== proposal);

      return { success: false, message: `${to} rechaza la propuesta de paz.` };
    }
  }

  /**
   * Forma una alianza entre dos facciones.
   */
  formAlliance(faction1: string, faction2: string): {
    success: boolean;
    allianceId: string;
    message: string;
  } {
    const relations = this.diplomacy.getRelations();
    const currentRelation = this.diplomacy.getRelation(faction1, faction2);

    // Verificar que no estén en guerra
    if (currentRelation.state === RelationState.WAR) {
      return {
        success: false,
        allianceId: '',
        message: 'No se puede aliadas mientras estén en guerra',
      };
    }

    // Verificar que no sean hostiles
    if (currentRelation.state === RelationState.HOSTILE) {
      return {
        success: false,
        allianceId: '',
        message: 'Relación demasiado hostil para crear alianza',
      };
    }

    // Crear alianza (+50 a relación)
    const allianceId = relations.formAlliance(faction1, faction2);

    this.diplomacy.emitEvent({
      type: 'allianceFormed',
      from: faction1,
      to: faction2,
      data: { allianceId },
      timestamp: Date.now(),
    });

    return {
      success: true,
      allianceId,
      message: `Alianza formada entre ${faction1} y ${faction2}`,
    };
  }

  /**
   * Propone un acuerdo comercial.
   */
  proposeTradeDeal(terms: TradeTerms): {
    success: boolean;
    dealId: string;
    message: string;
  } {
    const currentRelation = this.diplomacy.getRelation(terms.from, terms.to);

    // No se puede comerciar en guerra
    if (currentRelation.state === RelationState.WAR) {
      return {
        success: false,
        dealId: '',
        message: 'No se puede comerciar durante la guerra',
      };
    }

    // Verificar que las facciones sean neutrales o mejores
    if (currentRelation.state === RelationState.HOSTILE) {
      return {
        success: false,
        dealId: '',
        message: 'Relación demasiado hostil para comercio',
      };
    }

    // Auto-aceptar si la relación es aliada o friendly
    const autoAccept = [RelationState.ALLIED, RelationState.FRIENDLY].includes(currentRelation.state);

    const dealId = `deal_${Date.now()}`;
    const deal: TradeTerms = {
      ...terms,
      accepted: autoAccept,
    };

    this.activeTradeDeals.push(deal);

    if (autoAccept) {
      // Ejecutar comercio inmediatamente
      this.executeTradeDeal(deal);
    }

    this.diplomacy.emitEvent({
      type: 'tradeSigned',
      from: terms.from,
      to: terms.to,
      data: { dealId, autoAccepted: autoAccept },
      timestamp: Date.now(),
    });

    return {
      success: true,
      dealId,
      message: autoAccept
        ? `Acuerdo comercial auto-aceptado entre ${terms.from} y ${terms.to}`
        : `Propuesta comercial enviada a ${terms.to}. Esperando respuesta...`,
    };
  }

  /**
   * Ejecuta un acuerdo comercial.
   */
  private executeTradeDeal(deal: TradeTerms): boolean {
    const relations = this.diplomacy.getRelations();
    relations.registerTrade(deal.from, deal.to, true);

    // Registrar acuerdo en FactionRelations
    relations.addTradeAgreement(deal.from, deal.to, deal.resource, deal.amount, deal.duration);

    return true;
  }

  /**
   * Responde a propuesta comercial.
   */
  respondToTradeDeal(dealId: string, responder: string, accept: boolean): {
    success: boolean;
    message: string;
  } {
    const deal = this.activeTradeDeals.find(d => `deal_${d.from}_${d.to}` === dealId);

    if (!deal) {
      return { success: false, message: 'Acuerdo no encontrado' };
    }

    if (responder !== deal.to) {
      return { success: false, message: 'Solo el receptor puede responder' };
    }

    if (accept) {
      this.executeTradeDeal(deal);
      return { success: true, message: `${responder} acepta el comercio.` };
    } else {
      const relations = this.diplomacy.getRelations();
      relations.modifyRelation(deal.from, deal.to, -5);
      return { success: true, message: `${responder} rechaza el comercio.` };
    }
  }

  /**
   * Procesa propuestas de paz pendientes (llamado por tick del juego).
   */
  processPendingProposals() {
    // Reducir tiempo de propuestas
    this.peaceProposals.forEach(p => {
      p.turnsUntilExpiry--;
    });

    // Eliminar propuestas expiradas
    const expired = this.peaceProposals.filter(p => p.turnsUntilExpiry <= 0);
    expired.forEach(p => {
      this.diplomacy.emitEvent({
        type: 'peaceProposed',
        from: p.from,
        to: p.to,
        data: { expired: true },
        timestamp: Date.now(),
      });
    });

    this.peaceProposals = this.peaceProposals.filter(p => p.turnsUntilExpiry > 0);

    // Reducir duración de acuerdos comerciales activos
    this.activeTradeDeals.forEach(d => {
      d.duration--;
    });

    this.activeTradeDeals = this.activeTradeDeals.filter(d => d.duration > 0);
  }

  /**
   * Obtiene propuestas de paz activas para una facción.
   */
  getPendingPeaceProposals(faction: string): PeaceProposal[] {
    return this.peaceProposals.filter(p => p.to === faction);
  }

  /**
   * Obtiene tratos comerciales activos.
   */
  getActiveTradeDeals(): TradeTerms[] {
    return this.activeTradeDeals;
  }

  /**
   * Calcula el "peligro" de una facción hacia otra (para IA).
   * Considera: score de relación, alianzas, guerras activas.
   */
  calculateThreatLevel(from: string, toward: string): number {
    const relation = this.diplomacy.getRelation(from, toward);
    let threat = 0;

    // Base: relación inversa al score
    threat += Math.max(0, -relation.score);

    // Bonus por aliados en guerra con ambos
    const fromAllies = this.diplomacy.getAlliesOf(from);
    const towardAllies = this.diplomacy.getAlliesOf(toward);
    const sharedEnemies = fromAllies.filter(a => {
      const rel = this.diplomacy.getRelation(a, toward);
      return rel.state === RelationState.WAR;
    });
    threat += sharedEnemies.length * 10;

    // Bonus si están en guerra
    if (relation.state === RelationState.WAR) {
      threat += 50;
    }

    return Math.min(100, threat);
  }
}
