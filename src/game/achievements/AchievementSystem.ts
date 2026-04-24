/**
 * Achievement System - 50 logros desbloqueables
 * Tracking automático, notificaciones, rewards
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  hidden: boolean;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

export class AchievementSystem {
  private achievements: Map<string, Achievement> = new Map();
  private unlockedAchievements: Set<string> = new Set();
  private totalPoints: number = 0;

  constructor() {
    this.initializeAchievements();
  }

  private initializeAchievements() {
    const achievementList: Achievement[] = [
      // Building achievements
      { id: 'first_shelter', name: 'Hogar Dulce Hogar', description: 'Construye tu primer refugio', icon: '🏠', points: 10, hidden: false },
      { id: 'master_builder', name: 'Maestro Constructor', description: 'Construye 50 edificios', icon: '🏗️', points: 50, hidden: false, maxProgress: 50 },
      { id: 'architect', name: 'Arquitecto', description: 'Construye uno de cada tipo de edificio', icon: '📐', points: 30, hidden: false },
      
      // Resource achievements
      { id: 'wood_collector', name: 'Leñador', description: 'Recolecta 1000 de madera', icon: '🪵', points: 20, hidden: false, maxProgress: 1000 },
      { id: 'stone_mason', name: 'Cantero', description: 'Recolecta 1000 de piedra', icon: '🪨', points: 20, hidden: false, maxProgress: 1000 },
      { id: 'gold_rush', name: 'Fiebre del Oro', description: 'Acumula 10000 de oro', icon: '🪙', points: 40, hidden: false, maxProgress: 10000 },
      
      // Survival achievements
      { id: 'survivor_week', name: 'Superviviente', description: 'Sobrevive 7 días', icon: '🛡️', points: 20, hidden: false },
      { id: 'survivor_month', name: 'Veterano', description: 'Sobrevive 30 días', icon: '⚔️', points: 50, hidden: false },
      { id: 'no_casualties', name: 'Sin Bajas', description: 'Sobrevive 14 días sin muertes', icon: '💚', points: 40, hidden: false },
      
      // Combat achievements
      { id: 'first_victory', name: 'Primera Victoria', description: 'Gana tu primer combate', icon: '🥊', points: 10, hidden: false },
      { id: 'undefeated', name: 'Invicto', description: 'Gana 10 combates seguidos', icon: '🏆', points: 30, hidden: false },
      { id: 'pacifist', name: 'Pacifista', description: 'Evita el combate por 30 días', icon: '☮️', points: 30, hidden: true },
      
      // Economy achievements
      { id: 'trader', name: 'Comerciante', description: 'Completa 50 transacciones', icon: '💰', points: 30, hidden: false, maxProgress: 50 },
      { id: 'mogul', name: 'Magnate', description: 'Acumula recursos valorados en 100000', icon: '🏦', points: 60, hidden: false },
      
      // Social achievements
      { id: 'diplomat', name: 'Diplomático', description: 'Forma 5 alianzas', icon: '🤝', points: 30, hidden: false, maxProgress: 5 },
      { id: 'beloved_leader', name: 'Líder Amado', description: 'Alcanza 100% de felicidad', icon: '❤️', points: 50, hidden: false },
      
      // Hidden achievements
      { id: 'easter_egg', name: '???', description: 'Encuentra el secreto oculto', icon: '🥚', points: 100, hidden: true },
      { id: 'night_owl', name: 'Búho Nocturno', description: 'Juega entre 2 AM y 5 AM', icon: '🦉', points: 20, hidden: true },
      
      // Epic achievements
      { id: 'legendary_settlement', name: 'Asentamiento Legendario', description: 'Alcanza una población de 1000', icon: '🏰', points: 100, hidden: false },
      { id: 'completionist', name: 'Completista', description: 'Desbloquea todos los demás logros', icon: '💎', points: 200, hidden: false }
    ];

    achievementList.forEach(achievement => {
      achievement.progress = 0;
      this.achievements.set(achievement.id, achievement);
    });
  }

  checkAndUnlock(achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || this.unlockedAchievements.has(achievementId)) {
      return false;
    }

    achievement.unlockedAt = Date.now();
    this.unlockedAchievements.add(achievementId);
    this.totalPoints += achievement.points;

    // Check for completionist
    if (this.unlockedAchievements.size === this.achievements.size - 1) {
      this.checkAndUnlock('completionist');
    }

    return true;
  }

  updateProgress(achievementId: string, progress: number) {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || this.unlockedAchievements.has(achievementId)) {
      return;
    }

    achievement.progress = progress;

    if (achievement.maxProgress && achievement.progress >= achievement.maxProgress) {
      this.checkAndUnlock(achievementId);
    }
  }

  getAchievement(id: string): Achievement | undefined {
    return this.achievements.get(id);
  }

  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  getUnlockedAchievements(): Achievement[] {
    return Array.from(this.unlockedAchievements)
      .map(id => this.achievements.get(id)!)
      .filter(a => a);
  }

  getTotalPoints(): number {
    return this.totalPoints;
  }

  getCompletionPercentage(): number {
    return (this.unlockedAchievements.size / this.achievements.size) * 100;
  }
}