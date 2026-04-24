/**
 * Character Traits System - 16 traits únicos con modificadores
 * Afectan work_speed, social_need, stress_tolerance
 * Incluye sinergias y conflictos entre traits
 */

export type TraitRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface TraitModifiers {
  work_speed: number;
  social_need: number;
  stress_tolerance: number;
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  rarity: TraitRarity;
  modifiers: TraitModifiers;
  incompatibleWith: string[];
  synergiesWith: string[];
  flavorLines: string[];
}

export class CharacterTraits {
  private static traits: Map<string, Trait> = new Map([
    ['brave', {
      id: 'brave',
      name: 'Valiente',
      description: 'No teme al peligro y enfrenta los desafíos de frente',
      rarity: 'common',
      modifiers: { work_speed: 1.1, social_need: 0.9, stress_tolerance: 1.3 },
      incompatibleWith: ['coward'],
      synergiesWith: ['leader', 'hardworking'],
      flavorLines: [
        "¡No hay nada que temer!",
        "Alguien tiene que hacerlo",
        "El miedo es solo una ilusión"
      ]
    }],
    ['lazy', {
      id: 'lazy',
      name: 'Perezoso',
      description: 'Prefiere descansar a trabajar',
      rarity: 'common',
      modifiers: { work_speed: 0.7, social_need: 1.2, stress_tolerance: 1.1 },
      incompatibleWith: ['hardworking', 'ambitious'],
      synergiesWith: ['creative', 'dreamer'],
      flavorLines: [
        "¿Por qué hacer hoy lo que puedes hacer mañana?",
        "Necesito otro descanso",
        "Trabajar es sobrevalorado"
      ]
    }],
    ['hardworking', {
      id: 'hardworking',
      name: 'Trabajador',
      description: 'Siempre da el máximo en sus tareas',
      rarity: 'common',
      modifiers: { work_speed: 1.4, social_need: 0.8, stress_tolerance: 0.9 },
      incompatibleWith: ['lazy'],
      synergiesWith: ['ambitious', 'perfectionist'],
      flavorLines: [
        "El trabajo duro siempre da frutos",
        "No hay tiempo que perder",
        "Un trabajo bien hecho es mi recompensa"
      ]
    }],
    ['social', {
      id: 'social',
      name: 'Sociable',
      description: 'Le encanta estar rodeado de gente',
      rarity: 'common',
      modifiers: { work_speed: 1.0, social_need: 1.5, stress_tolerance: 1.2 },
      incompatibleWith: ['loner'],
      synergiesWith: ['charismatic', 'leader'],
      flavorLines: [
        "¡Hablemos un rato!",
        "Me encanta conocer gente nueva",
        "La vida es mejor en compañía"
      ]
    }],
    ['loner', {
      id: 'loner',
      name: 'Solitario',
      description: 'Prefiere trabajar solo',
      rarity: 'uncommon',
      modifiers: { work_speed: 1.2, social_need: 0.5, stress_tolerance: 1.1 },
      incompatibleWith: ['social', 'charismatic'],
      synergiesWith: ['focused', 'creative'],
      flavorLines: [
        "Trabajo mejor solo",
        "Demasiada gente me agobia",
        "El silencio es oro"
      ]
    }],
    ['creative', {
      id: 'creative',
      name: 'Creativo',
      description: 'Encuentra soluciones innovadoras',
      rarity: 'uncommon',
      modifiers: { work_speed: 1.1, social_need: 1.0, stress_tolerance: 0.8 },
      incompatibleWith: ['traditional'],
      synergiesWith: ['genius', 'visionary'],
      flavorLines: [
        "¿Y si lo hacemos diferente?",
        "Tengo una idea brillante",
        "La creatividad no tiene límites"
      ]
    }],
    ['ambitious', {
      id: 'ambitious',
      name: 'Ambicioso',
      description: 'Siempre busca superarse',
      rarity: 'uncommon',
      modifiers: { work_speed: 1.3, social_need: 0.9, stress_tolerance: 0.8 },
      incompatibleWith: ['lazy', 'content'],
      synergiesWith: ['hardworking', 'leader'],
      flavorLines: [
        "Puedo lograr más",
        "El cielo es el límite",
        "Siempre hay espacio para mejorar"
      ]
    }],
    ['genius', {
      id: 'genius',
      name: 'Genio',
      description: 'Inteligencia excepcional',
      rarity: 'rare',
      modifiers: { work_speed: 1.5, social_need: 0.7, stress_tolerance: 0.7 },
      incompatibleWith: ['simple'],
      synergiesWith: ['creative', 'visionary'],
      flavorLines: [
        "La solución es obvia",
        "Mi mente trabaja diferente",
        "Es simple matemática"
      ]
    }],
    ['leader', {
      id: 'leader',
      name: 'Líder',
      description: 'Natural para dirigir grupos',
      rarity: 'rare',
      modifiers: { work_speed: 1.2, social_need: 1.3, stress_tolerance: 1.2 },
      incompatibleWith: ['follower'],
      synergiesWith: ['charismatic', 'brave'],
      flavorLines: [
        "¡Síganme!",
        "Juntos somos más fuertes",
        "Tengo un plan"
      ]
    }],
    ['perfectionist', {
      id: 'perfectionist',
      name: 'Perfeccionista',
      description: 'Todo debe estar impecable',
      rarity: 'uncommon',
      modifiers: { work_speed: 0.9, social_need: 0.8, stress_tolerance: 0.6 },
      incompatibleWith: ['careless'],
      synergiesWith: ['hardworking', 'focused'],
      flavorLines: [
        "Casi perfecto no es suficiente",
        "Déjame revisarlo una vez más",
        "Los detalles importan"
      ]
    }],
    ['optimistic', {
      id: 'optimistic',
      name: 'Optimista',
      description: 'Siempre ve el lado positivo',
      rarity: 'common',
      modifiers: { work_speed: 1.1, social_need: 1.1, stress_tolerance: 1.4 },
      incompatibleWith: ['pessimistic'],
      synergiesWith: ['social', 'inspiring'],
      flavorLines: [
        "¡Todo saldrá bien!",
        "Mañana será un mejor día",
        "Hay que ver el vaso medio lleno"
      ]
    }],
    ['paranoid', {
      id: 'paranoid',
      name: 'Paranoico',
      description: 'Siempre espera lo peor',
      rarity: 'uncommon',
      modifiers: { work_speed: 0.9, social_need: 0.6, stress_tolerance: 0.5 },
      incompatibleWith: ['trusting', 'optimistic'],
      synergiesWith: ['cautious', 'prepared'],
      flavorLines: [
        "No confío en esto",
        "Algo malo va a pasar",
        "Están conspirando contra mí"
      ]
    }],
    ['lucky', {
      id: 'lucky',
      name: 'Afortunado',
      description: 'La suerte siempre está de su lado',
      rarity: 'legendary',
      modifiers: { work_speed: 1.2, social_need: 1.0, stress_tolerance: 1.3 },
      incompatibleWith: ['unlucky'],
      synergiesWith: ['optimistic', 'brave'],
      flavorLines: [
        "¡Otra vez gané!",
        "La fortuna me sonríe",
        "Todo me sale bien"
      ]
    }],
    ['strong', {
      id: 'strong',
      name: 'Fuerte',
      description: 'Fuerza física superior',
      rarity: 'common',
      modifiers: { work_speed: 1.3, social_need: 0.9, stress_tolerance: 1.2 },
      incompatibleWith: ['weak'],
      synergiesWith: ['brave', 'protector'],
      flavorLines: [
        "Yo cargo con eso",
        "La fuerza resuelve problemas",
        "Entreno todos los días"
      ]
    }],
    ['wise', {
      id: 'wise',
      name: 'Sabio',
      description: 'Experiencia y conocimiento profundo',
      rarity: 'rare',
      modifiers: { work_speed: 0.95, social_need: 1.1, stress_tolerance: 1.5 },
      incompatibleWith: ['reckless'],
      synergiesWith: ['patient', 'mentor'],
      flavorLines: [
        "La paciencia es una virtud",
        "He visto esto antes",
        "Escucha mi consejo"
      ]
    }],
    ['charismatic', {
      id: 'charismatic',
      name: 'Carismático',
      description: 'Atrae naturalmente a otros',
      rarity: 'rare',
      modifiers: { work_speed: 1.1, social_need: 1.4, stress_tolerance: 1.1 },
      incompatibleWith: ['loner', 'antisocial'],
      synergiesWith: ['leader', 'social'],
      flavorLines: [
        "Déjame contarte una historia",
        "La gente simplemente me sigue",
        "Tengo ese no sé qué"
      ]
    }]
  ]);

  static getTrait(id: string): Trait | undefined {
    return this.traits.get(id);
  }

  static getAllTraits(): Trait[] {
    return Array.from(this.traits.values());
  }

  static getTraitsByRarity(rarity: TraitRarity): Trait[] {
    return this.getAllTraits().filter(t => t.rarity === rarity);
  }

  static areCompatible(trait1: string, trait2: string): boolean {
    const t1 = this.getTrait(trait1);
    const t2 = this.getTrait(trait2);
    if (!t1 || !t2) return false;
    
    return !t1.incompatibleWith.includes(trait2) && 
           !t2.incompatibleWith.includes(trait1);
  }

  static haveSynergy(trait1: string, trait2: string): boolean {
    const t1 = this.getTrait(trait1);
    const t2 = this.getTrait(trait2);
    if (!t1 || !t2) return false;
    
    return t1.synergiesWith.includes(trait2) || 
           t2.synergiesWith.includes(trait1);
  }

  static calculateCombinedModifiers(traitIds: string[]): TraitModifiers {
    let combined: TraitModifiers = {
      work_speed: 1.0,
      social_need: 1.0,
      stress_tolerance: 1.0
    };

    for (const id of traitIds) {
      const trait = this.getTrait(id);
      if (trait) {
        combined.work_speed *= trait.modifiers.work_speed;
        combined.social_need *= trait.modifiers.social_need;
        combined.stress_tolerance *= trait.modifiers.stress_tolerance;
      }
    }

    // Apply synergy bonuses
    for (let i = 0; i < traitIds.length; i++) {
      for (let j = i + 1; j < traitIds.length; j++) {
        if (this.haveSynergy(traitIds[i], traitIds[j])) {
          combined.work_speed *= 1.1;
          combined.social_need *= 1.05;
          combined.stress_tolerance *= 1.1;
        }
      }
    }

    return combined;
  }
}