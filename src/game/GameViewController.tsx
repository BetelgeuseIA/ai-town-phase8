/**
 * GameViewController.tsx
 * 
 * Controlador principal del juego que integra todos los sistemas:
 * - GameView con PixiJS
 * - HUD con controles
 * - Minimap
 * - Sistema de notificaciones
 * - Weather system overlay
 * 
 * Este componente actúa como el coordinador central que conecta
 * todos los subsistemas del juego.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GameViewIntegration } from './GameViewIntegration';
import { Minimap, MinimapAgent, MinimapBuilding, MinimapViewport } from './ui/Minimap';
import { NotificationSystem, useNotificationQueue, NotificationType } from './ui/NotificationSystem';
import { notificationQueue } from './ui/NotificationQueue';

// ============================================================================
// TIPOS
// ============================================================================

export interface GameViewControllerProps {
  worldId?: string;
}

export interface GameState {
  /** Agente seleccionado actualmente */
  selectedAgent: string | null;
  /** Posición de la cámara */
  cameraPosition: { x: number; y: number };
  /** Escala de la cámara */
  cameraScale: number;
  /** Dimensiones del mundo */
  worldDimensions: { width: number; height: number };
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const GameViewController: React.FC<GameViewControllerProps> = ({ worldId = 'demo' }) => {
  // Estado del juego
  const [gameState, setGameState] = useState<GameState>({
    selectedAgent: null,
    cameraPosition: { x: 0, y: 0 },
    cameraScale: 1,
    worldDimensions: { width: 800, height: 600 },
  });

  // Sistema de notificaciones
  const { notifications, push: pushNotification, remove: removeNotification } = useNotificationQueue();

  // ============================================================================
  // EFECTOS
  // ============================================================================

  // Inicialización
  useEffect(() => {
    // Mostrar notificación de bienvenida
    pushNotification("🎮 Bienvenido al AI Town", "info", 3000);
    
    // Simular carga de datos
    const loadTimer = setTimeout(() => {
      pushNotification("✅ Mundo cargado correctamente", "success", 2000);
    }, 1000);

    return () => {
      clearTimeout(loadTimer);
    };
  }, [pushNotification]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Maneja cambios en la selección de agente
   */
  const handleAgentSelect = useCallback((agentId: string | null) => {
    setGameState(prev => ({
      ...prev,
      selectedAgent: agentId,
    }));

    if (agentId) {
      pushNotification(`👤 Agente seleccionado`, "info", 1500);
    }
  }, [pushNotification]);

  /**
   * Maneja cambios en la cámara
   */
  const handleCameraChange = useCallback((
    x: number, 
    y: number, 
    scale: number
  ) => {
    setGameState(prev => ({
      ...prev,
      cameraPosition: { x, y },
      cameraScale: scale,
    }));
  }, []);

  /**
   * Maneja clicks en el minimapa
   */
  const handleMinimapClick = useCallback((
    worldX: number, 
    worldY: number
  ) => {
    // Enviar evento al sistema de cámara para centrarse
    handleCameraChange(
      worldX - gameState.worldDimensions.width / 2,
      worldY - gameState.worldDimensions.height / 2,
      gameState.cameraScale
    );
    
    pushNotification(`📍 Saltando a (${Math.round(worldX)}, ${Math.round(worldY)})`, "info", 1500);
  }, [gameState, handleCameraChange, pushNotification]);

  /**
   * Maneja errores del sistema
   */
  const handleError = useCallback((error: string) => {
    pushNotification(`❌ Error: ${error}`, "error", 4000);
  }, [pushNotification]);

  // ============================================================================
  // DATOS PARA COMPONENTES
  // ============================================================================

  // Datos para el minimapa (simulados)
  const minimapAgents: MinimapAgent[] = [
    { id: 'agent-1', x: 100, y: 300, color: 0xff6b35, name: 'Alfonso' },
    { id: 'agent-2', x: 400, y: 200, color: 0x00ff88, name: 'Luna' },
    { id: 'agent-3', x: 600, y: 400, color: 0x4ecdc4, name: 'Marcus' },
  ];

  const minimapBuildings: MinimapBuilding[] = [
    { id: 'building-1', x: 300, y: 250, width: 50, height: 50, type: 'shelter', color: 0x8b4513 },
    { id: 'building-2', x: 500, y: 350, width: 50, height: 50, type: 'storage', color: 0xcd853f },
  ];

  const minimapViewport: MinimapViewport = {
    x: gameState.cameraPosition.x,
    y: gameState.cameraPosition.y,
    width: gameState.worldDimensions.width / gameState.cameraScale,
    height: gameState.worldDimensions.height / gameState.cameraScale,
    scale: gameState.cameraScale,
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Vista principal del juego */}
      <div className="absolute inset-0">
        <GameViewIntegration 
          width={gameState.worldDimensions.width}
          height={gameState.worldDimensions.height}
        />
      </div>

      {/* Minimapa en la esquina superior derecha */}
      <Minimap
        worldWidth={gameState.worldDimensions.width}
        worldHeight={gameState.worldDimensions.height}
        agents={minimapAgents}
        buildings={minimapBuildings}
        viewport={minimapViewport}
        onMinimapClick={handleMinimapClick}
      />

      {/* Sistema de notificaciones */}
      <NotificationSystem
        notifications={notifications}
        onRemove={removeNotification}
      />

      {/* Overlay del sistema de clima (simulado) */}
      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-blue-500/80 text-white px-3 py-1 rounded-full text-sm font-medium">
        ☀️ Soleado - 24°C
      </div>

      {/* Controles rápidos */}
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-2">
        <div className="flex gap-2">
          <button 
            className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-sm"
            onClick={() => pushNotification("ℹ️ Comando ejecutado", "info")}
          >
            Info
          </button>
          <button 
            className="bg-green-500/80 hover:bg-green-500 text-white px-3 py-1 rounded text-sm"
            onClick={() => pushNotification("✅ Acción completada", "success")}
          >
            OK
          </button>
          <button 
            className="bg-red-500/80 hover:bg-red-500 text-white px-3 py-1 rounded text-sm"
            onClick={() => pushNotification("❌ Error simulado", "error")}
          >
            Error
          </button>
        </div>
      </div>
    </div>
  );
};

