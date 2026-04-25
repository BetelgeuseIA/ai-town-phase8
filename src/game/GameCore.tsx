import React, { useState, useEffect } from 'react';
import { WeatherSystem } from './weather/WeatherSystem';
import { CharacterTraits } from './characters/CharacterTraits';
import { EconomyManager } from './economy/EconomyManager';
import { CombatSystem } from './combat/CombatSystem';
import { QuestSystem } from './quests/QuestSystem';
import { AchievementSystem } from './achievements/AchievementSystem';

export const GameCore: React.FC = () => {
  // TODOS LOS SISTEMAS INICIALIZADOS
  const [weather] = useState(() => new WeatherSystem());
  const [economy] = useState(() => new EconomyManager());
  const [combat] = useState(() => new CombatSystem());
  const [quests] = useState(() => new QuestSystem());
  const [achievements] = useState(() => new AchievementSystem());
  
  const [gameData, setGameData] = useState({
    weather: weather.getCurrentWeather(),
    resources: economy.getAllPrices(),
    activeQuests: quests.getActiveQuests(),
    unlockedAchievements: achievements.getUnlockedAchievements(),
    traits: CharacterTraits.getAllTraits()
  });

  // ACTUALIZAR CADA SEGUNDO
  useEffect(() => {
    const interval = setInterval(() => {
      weather.update(1000);
      
      setGameData({
        weather: weather.getCurrentWeather(),
        resources: economy.getAllPrices(),
        activeQuests: quests.getActiveQuests(),
        unlockedAchievements: achievements.getUnlockedAchievements(),
        traits: CharacterTraits.getAllTraits()
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [weather, economy, quests, achievements]);

  // FUNCIONES INTERACTIVAS
  const buyResource = (resource: any) => {
    const result = economy.buy(resource, 10, 'player');
    if (result) {
      console.log('Compra exitosa:', result);
      achievements.updateProgress('trader', 1);
    }
  };

  const startCombat = () => {
    const attacker = combat.createTestCombatant('Alfonso', 'melee');
    const defender = combat.createTestCombatant('Enemy', 'ranged');
    const result = combat.initiateCombat(attacker, defender);
    console.log('Resultado del combate:', result);
    
    if (result.winner?.name === 'Alfonso') {
      achievements.checkAndUnlock('first_victory');
    }
  };

  const startQuest = (questId: string) => {
    quests.startQuest(questId);
  };

  return (
    <div style={{ 
      padding: 20, 
      background: '#0a0a0a', 
      color: 'white',
      minHeight: '100vh',
      fontFamily: 'Arial'
    }}>
      <h1>🎮 AI TOWN - TODOS LOS SISTEMAS FUNCIONANDO</h1>
      
      {/* WEATHER SYSTEM */}
      <div style={{ background: '#1a1a1a', padding: 20, margin: '10px 0', borderRadius: 10 }}>
        <h2>☀️ Sistema de Clima</h2>
        <p>Estado: {gameData.weather.type}</p>
        <p>Visibilidad: {(gameData.weather.visibility * 100).toFixed(0)}%</p>
        <p>Modificador de ánimo: {(gameData.weather.moodModifier * 100).toFixed(0)}%</p>
        <button onClick={() => weather.setWeather('rainy')}>🌧️ Lluvia</button>
        <button onClick={() => weather.setWeather('sunny')}>☀️ Soleado</button>
        <button onClick={() => weather.setWeather('stormy')}>⛈️ Tormenta</button>
      </div>

      {/* ECONOMY SYSTEM */}
      <div style={{ background: '#1a1a1a', padding: 20, margin: '10px 0', borderRadius: 10 }}>
        <h2>💰 Sistema Económico</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {Array.from(gameData.resources.entries()).slice(0, 6).map(([resource, info]) => (
            <div key={resource} style={{ background: '#2a2a2a', padding: 10, borderRadius: 5 }}>
              <h3>{resource}</h3>
              <p>Precio: ${info.currentPrice.toFixed(2)}</p>
              <p>Stock: {info.supply}</p>
              <button onClick={() => buyResource(resource)}>Comprar 10</button>
            </div>
          ))}
        </div>
      </div>

      {/* COMBAT SYSTEM */}
      <div style={{ background: '#1a1a1a', padding: 20, margin: '10px 0', borderRadius: 10 }}>
        <h2>⚔️ Sistema de Combate</h2>
        <button onClick={startCombat} style={{ 
          background: '#ff4444', 
          color: 'white', 
          padding: '10px 20px',
          fontSize: 18,
          border: 'none',
          borderRadius: 5
        }}>
          ¡Iniciar Combate!
        </button>
      </div>

      {/* QUEST SYSTEM */}
      <div style={{ background: '#1a1a1a', padding: 20, margin: '10px 0', borderRadius: 10 }}>
        <h2>📜 Sistema de Misiones</h2>
        <p>Misiones activas: {gameData.activeQuests.length}</p>
        <button onClick={() => startQuest('tutorial_1')}>Comenzar Tutorial</button>
        {gameData.activeQuests.map(quest => (
          <div key={quest.id} style={{ margin: '10px 0', padding: 10, background: '#2a2a2a', borderRadius: 5 }}>
            <h4>{quest.name}</h4>
            <p>{quest.description}</p>
          </div>
        ))}
      </div>

      {/* ACHIEVEMENTS */}
      <div style={{ background: '#1a1a1a', padding: 20, margin: '10px 0', borderRadius: 10 }}>
        <h2>🏆 Logros</h2>
        <p>Desbloqueados: {gameData.unlockedAchievements.length}</p>
        <p>Puntos totales: {achievements.getTotalPoints()}</p>
      </div>

      {/* CHARACTER TRAITS */}
      <div style={{ background: '#1a1a1a', padding: 20, margin: '10px 0', borderRadius: 10 }}>
        <h2>👤 Traits de Personajes</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {gameData.traits.slice(0, 8).map(trait => (
            <div key={trait.id} style={{ 
              background: '#2a2a2a', 
              padding: 10, 
              borderRadius: 5,
              border: '1px solid #444'
            }}>
              <strong>{trait.name}</strong>
              <p style={{ fontSize: 12 }}>{trait.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};