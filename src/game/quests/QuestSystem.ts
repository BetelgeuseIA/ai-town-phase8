/**
 * Quest System - Sistema de misiones con auto-tracking
 * 15 quests iniciales, rewards escalables, speed bonus
 */

export type QuestType = 'build' | 'gather' | 'survive' | 'explore' | 'trade';
export type QuestDifficulty = 'tutorial' | 'easy' | 'medium' | 'hard' | 'epic';
export type QuestCategory = 'main' | 'side' | 'daily' | 'event';

export interface QuestObjective {
  id: string;
  description: string;
  type: string;
  target: number;
  current: number;
  completed: boolean;
}

export interface QuestReward {
  type: 'resources' | 'items' | 'experience' | 'reputation';
  data: any;
  amount: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  difficulty: QuestDifficulty;
  category: QuestCategory;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites: string[];
  timeLimit?: number;
  startedAt?: number;
  completedAt?: number;
  isActive: boolean;
  isCompleted: boolean;
}

export class QuestSystem {
  private quests: Map<string, Quest> = new Map();
  private activeQuests: Set<string> = new Set();
  private completedQuests: Set<string> = new Set();

  constructor() {
    this.initializeQuests();
  }

  private initializeQuests() {
    const initialQuests: Quest[] = [
      {
        id: 'tutorial_1',
        name: 'Primeros Pasos',
        description: 'Aprende los conceptos básicos del asentamiento',
        type: 'gather',
        difficulty: 'tutorial',
        category: 'main',
        objectives: [
          { id: 'gather_wood', description: 'Recolecta 10 de madera', type: 'gather_wood', target: 10, current: 0, completed: false },
          { id: 'gather_food', description: 'Recolecta 5 de comida', type: 'gather_food', target: 5, current: 0, completed: false }
        ],
        rewards: [
          { type: 'resources', data: { wood: 20, food: 10 }, amount: 1 },
          { type: 'experience', data: null, amount: 100 }
        ],
        prerequisites: [],
        isActive: false,
        isCompleted: false
      },
      {
        id: 'build_shelter',
        name: 'Un Techo Sobre Tu Cabeza',
        description: 'Construye tu primer refugio',
        type: 'build',
        difficulty: 'easy',
        category: 'main',
        objectives: [
          { id: 'build_hut', description: 'Construye una choza', type: 'build_hut', target: 1, current: 0, completed: false }
        ],
        rewards: [
          { type: 'resources', data: { stone: 10 }, amount: 1 },
          { type: 'reputation', data: 'builder', amount: 50 }
        ],
        prerequisites: ['tutorial_1'],
        isActive: false,
        isCompleted: false
      },
      {
        id: 'survive_week',
        name: 'Superviviente',
        description: 'Sobrevive 7 días sin que nadie muera',
        type: 'survive',
        difficulty: 'medium',
        category: 'main',
        objectives: [
          { id: 'days_survived', description: 'Sobrevive 7 días', type: 'survive_days', target: 7, current: 0, completed: false }
        ],
        rewards: [
          { type: 'resources', data: { food: 50, water: 30 }, amount: 1 },
          { type: 'experience', data: null, amount: 500 }
        ],
        prerequisites: ['build_shelter'],
        isActive: false,
        isCompleted: false
      },
      {
        id: 'trade_caravan',
        name: 'Comerciante Novato',
        description: 'Completa tu primera transacción comercial',
        type: 'trade',
        difficulty: 'easy',
        category: 'side',
        objectives: [
          { id: 'complete_trade', description: 'Completa una transacción', type: 'trade', target: 1, current: 0, completed: false }
        ],
        rewards: [
          { type: 'resources', data: { gold: 50 }, amount: 1 }
        ],
        prerequisites: [],
        isActive: false,
        isCompleted: false
      },
      {
        id: 'explore_map',
        name: 'Explorador',
        description: 'Explora el 50% del mapa',
        type: 'explore',
        difficulty: 'medium',
        category: 'side',
        objectives: [
          { id: 'explore_percent', description: 'Explora el mapa', type: 'explore', target: 50, current: 0, completed: false }
        ],
        rewards: [
          { type: 'items', data: { map_fragment: 1 }, amount: 1 },
          { type: 'experience', data: null, amount: 300 }
        ],
        prerequisites: [],
        isActive: false,
        isCompleted: false
      },
      {
        id: 'epic_fortress',
        name: 'Fortaleza Inexpugnable',
        description: 'Construye una fortaleza completa con todas las defensas',
        type: 'build',
        difficulty: 'epic',
        category: 'main',
        objectives: [
          { id: 'build_walls', description: 'Construye murallas', type: 'build_wall', target: 4, current: 0, completed: false },
          { id: 'build_towers', description: 'Construye torres', type: 'build_tower', target: 4, current: 0, completed: false },
          { id: 'build_gate', description: 'Construye puerta fortificada', type: 'build_gate', target: 1, current: 0, completed: false }
        ],
        rewards: [
          { type: 'reputation', data: 'legendary_builder', amount: 1000 },
          { type: 'items', data: { legendary_blueprint: 1 }, amount: 1 }
        ],
        prerequisites: ['survive_week'],
        isActive: false,
        isCompleted: false
      }
    ];

    initialQuests.forEach(quest => {
      this.quests.set(quest.id, quest);
    });
  }

  startQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.isActive || quest.isCompleted) {
      return false;
    }

    // Check prerequisites
    for (const prereq of quest.prerequisites) {
      if (!this.completedQuests.has(prereq)) {
        return false;
      }
    }

    quest.isActive = true;
    quest.startedAt = Date.now();
    this.activeQuests.add(questId);
    
    return true;
  }

  updateProgress(questId: string, objectiveId: string, amount: number = 1) {
    const quest = this.quests.get(questId);
    if (!quest || !quest.isActive) {
      return;
    }

    const objective = quest.objectives.find(obj => obj.id === objectiveId);
    if (!objective || objective.completed) {
      return;
    }

    objective.current = Math.min(objective.current + amount, objective.target);
    
    if (objective.current >= objective.target) {
      objective.completed = true;
    }

    // Check if all objectives completed
    if (quest.objectives.every(obj => obj.completed)) {
      this.completeQuest(questId);
    }
  }

  completeQuest(questId: string): QuestReward[] {
    const quest = this.quests.get(questId);
    if (!quest || !quest.isActive || quest.isCompleted) {
      return [];
    }

    quest.isCompleted = true;
    quest.isActive = false;
    quest.completedAt = Date.now();
    
    this.activeQuests.delete(questId);
    this.completedQuests.add(questId);

    // Calculate speed bonus
    let speedBonus = 1.0;
    if (quest.timeLimit && quest.startedAt) {
      const timeTaken = quest.completedAt - quest.startedAt;
      const timeLimit = quest.timeLimit;
      
      if (timeTaken < timeLimit * 0.25) {
        speedBonus = 1.5; // 50% bonus
      } else if (timeTaken < timeLimit * 0.5) {
        speedBonus = 1.25; // 25% bonus
      } else if (timeTaken < timeLimit * 0.75) {
        speedBonus = 1.1; // 10% bonus
      }
    }

    // Apply speed bonus to rewards
    const finalRewards = quest.rewards.map(reward => ({
      ...reward,
      amount: Math.floor(reward.amount * speedBonus)
    }));

    return finalRewards;
  }

  getActiveQuests(): Quest[] {
    return Array.from(this.activeQuests).map(id => this.quests.get(id)!);
  }

  getAvailableQuests(): Quest[] {
    return Array.from(this.quests.values()).filter(quest => {
      if (quest.isActive || quest.isCompleted) return false;
      
      // Check prerequisites
      for (const prereq of quest.prerequisites) {
        if (!this.completedQuests.has(prereq)) {
          return false;
        }
      }
      
      return true;
    });
  }

  getQuestProgress(questId: string): number {
    const quest = this.quests.get(questId);
    if (!quest) return 0;

    const totalObjectives = quest.objectives.length;
    const completedObjectives = quest.objectives.filter(obj => obj.completed).length;
    
    return completedObjectives / totalObjectives;
  }

  // Auto-tracking for common events
  trackEvent(eventType: string, data: any) {
    for (const questId of this.activeQuests) {
      const quest = this.quests.get(questId);
      if (!quest) continue;

      for (const objective of quest.objectives) {
        if (objective.type === eventType && !objective.completed) {
          this.updateProgress(questId, objective.id, data.amount || 1);
        }
      }
    }
  }
}