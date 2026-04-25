/**
 * Weather System - Sistema de clima dinámico con efectos visuales
 * 4 estados: sunny, cloudy, rainy, stormy
 * Afecta visibilidad y mood de los agentes
 */

// Simple EventEmitter replacement for browser
class EventEmitter {
  private events: Record<string, Function[]> = {};
  
  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  
  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy';

export interface WeatherState {
  type: WeatherType;
  intensity: number;
  visibility: number;
  moodModifier: number;
  windStrength: number;
  precipitation: number;
}

export class WeatherSystem extends EventEmitter {
  private currentWeather: WeatherState;
  private targetWeather: WeatherState;
  private transitionProgress: number = 0;
  private transitionDuration: number = 60000; // 60 seconds
  private autoChangeEnabled: boolean = true;
  private changeInterval: number = 300000; // 5 minutes

  private weatherConfigs = {
    sunny: {
      visibility: 1.0,
      moodModifier: 1.15,
      windStrength: 0.2,
      precipitation: 0
    },
    cloudy: {
      visibility: 0.85,
      moodModifier: 0.95,
      windStrength: 0.4,
      precipitation: 0
    },
    rainy: {
      visibility: 0.7,
      moodModifier: 0.8,
      windStrength: 0.6,
      precipitation: 0.7
    },
    stormy: {
      visibility: 0.5,
      moodModifier: 0.65,
      windStrength: 1.0,
      precipitation: 1.0
    }
  };

  constructor() {
    super();
    this.currentWeather = this.createWeatherState('sunny');
    this.targetWeather = this.currentWeather;
    
    if (this.autoChangeEnabled) {
      this.scheduleNextChange();
    }
  }

  private createWeatherState(type: WeatherType): WeatherState {
    const config = this.weatherConfigs[type];
    return {
      type,
      intensity: 1.0,
      ...config
    };
  }

  getCurrentWeather(): WeatherState {
    return { ...this.currentWeather };
  }

  setWeather(type: WeatherType, duration: number = this.transitionDuration) {
    this.targetWeather = this.createWeatherState(type);
    this.transitionProgress = 0;
    this.transitionDuration = duration;
    this.emit('weatherChanging', { from: this.currentWeather.type, to: type });
  }

  update(deltaTime: number) {
    if (this.currentWeather.type !== this.targetWeather.type) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      
      if (this.transitionProgress >= 1) {
        this.currentWeather = { ...this.targetWeather };
        this.transitionProgress = 0;
        this.emit('weatherChanged', this.currentWeather);
      } else {
        // Smooth transition
        const t = this.easeInOutCubic(this.transitionProgress);
        this.currentWeather.visibility = this.lerp(
          this.currentWeather.visibility,
          this.targetWeather.visibility,
          t
        );
        this.currentWeather.moodModifier = this.lerp(
          this.currentWeather.moodModifier,
          this.targetWeather.moodModifier,
          t
        );
        this.currentWeather.windStrength = this.lerp(
          this.currentWeather.windStrength,
          this.targetWeather.windStrength,
          t
        );
        this.currentWeather.precipitation = this.lerp(
          this.currentWeather.precipitation,
          this.targetWeather.precipitation,
          t
        );
      }
    }
  }

  private scheduleNextChange() {
    setTimeout(() => {
      this.randomWeatherChange();
      this.scheduleNextChange();
    }, this.changeInterval);
  }

  private randomWeatherChange() {
    const types: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'stormy'];
    const weights = this.getSeasonalWeights();
    const newType = this.weightedRandom(types, weights);
    this.setWeather(newType);
  }

  private getSeasonalWeights(): number[] {
    // Simulate seasonal patterns
    const month = new Date().getMonth();
    if (month >= 3 && month <= 5) { // Spring
      return [0.4, 0.3, 0.25, 0.05];
    } else if (month >= 6 && month <= 8) { // Summer
      return [0.6, 0.25, 0.1, 0.05];
    } else if (month >= 9 && month <= 11) { // Fall
      return [0.3, 0.35, 0.25, 0.1];
    } else { // Winter
      return [0.2, 0.4, 0.3, 0.1];
    }
  }

  private weightedRandom(items: WeatherType[], weights: number[]): WeatherType {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[0];
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}