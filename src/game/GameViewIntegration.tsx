/**
 * GameViewIntegration.tsx
 * 
 * Ejemplo de integración completa del motor de juego.
 * Este archivo conecta todas las piezas del sistema:
 * - GameEngine (motor principal de PIXI)
 * - WorldRenderer (renderizado del mundo)
 * - Camera (sistema de cámara con pan/zoom)
 * - InputHandler (manejo de teclado/ratón)
 * - EventSystem (sistema de eventos entre agentes)
 * - Sprites (renderizado de agentes y edificios)
 * - HUD (interface de usuario superpuesta)
 * 
 * DATOS HARDCODADOS (por ahora):
 * - 3 agentes con posiciones, colores y nombres
 * - 2 edificios con tipos y estados
 * 
 * Este archivo es la prueba de que todas las piezas funcionan juntas.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';

// ============================================================================
// TIPOS DEL JUEGO (definidos localmente para esta integración)
// ============================================================================

interface AgentData {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
  activity: string;
  health: number;
}

interface BuildingData {
  id: string;
  type: 'shelter' | 'storage' | 'watchtower' | 'farm';
  status: 'planned' | 'under_construction' | 'active' | 'damaged';
  x: number;
  y: number;
  durability: number;
}

interface InputState {
  keys: Set<string>;
  mouse: { x: number; y: number; down: boolean };
  dragging: boolean;
  lastDragPos: { x: number; y: number };
}

// ============================================================================
// DATOS HARDCODADOS - 3 AGENTES Y 2 EDIFICIOS
// ============================================================================

const HARDCODED_AGENTS: AgentData[] = [
  {
    id: 'agent-1',
    name: 'Alfonso',
    x: 100,
    y: 300,
    color: 0xff6b35, // Naranja
    activity: 'Explorando',
    health: 100,
  },
  {
    id: 'agent-2',
    name: 'Luna',
    x: 400,
    y: 200,
    color: 0x00ff88, // Verde esmeralda
    activity: 'Construyendo',
    health: 85,
  },
  {
    id: 'agent-3',
    name: 'Marcus',
    x: 600,
    y: 400,
    color: 0x4ecdc4, // Cyan
    activity: 'Vigilando',
    health: 92,
  },
];

const HARDCODED_BUILDINGS: BuildingData[] = [
  {
    id: 'building-1',
    type: 'shelter',
    status: 'active',
    x: 300,
    y: 250,
    durability: 100,
  },
  {
    id: 'building-2',
    type: 'storage',
    status: 'under_construction',
    x: 500,
    y: 350,
    durability: 60,
  },
];

// ============================================================================
// INPUT HANDLER - Manejo de teclado y ratón
// ============================================================================

class InputHandler {
  keys: Set<string> = new Set();
  mouse: { x: number; y: number; down: boolean } = { x: 0, y: 0, down: false };
  dragging: boolean = false;
  lastDragPos: { x: number; y: number } = { x: 0, y: 0 };

  // Callbacks para eventos
  onKeyDown?: (key: string) => void;
  onKeyUp?: (key: string) => void;
  onMouseDown?: (x: number, y: number) => void;
  onMouseUp?: (x: number, y: number) => void;
  onMouseMove?: (x: number, y: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      this.onKeyDown?.(e.key);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
      this.onKeyUp?.(e.key);
    });

    // Mouse events sobre el canvas
    canvas.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      this.lastDragPos = { x: e.offsetX, y: e.offsetY };
      this.onMouseDown?.(e.offsetX, e.offsetY);
    });

    canvas.addEventListener('mouseup', () => {
      this.mouse.down = false;
      this.dragging = false;
      this.onMouseUp?.(this.mouse.x, this.mouse.y);
    });

    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.offsetX;
      this.mouse.y = e.offsetY;
      
      if (this.mouse.down && !this.dragging) {
        this.dragging = true;
      }
      
      this.onMouseMove?.(e.offsetX, e.offsetY);
    });

    // Prevenir context menu
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  destroy() {
    this.keys.clear();
  }
}

// ============================================================================
// CAMERA - Sistema de cámara con pan y zoom
// ============================================================================

class GameCamera {
  x: number = 0;
  y: number = 0;
  scale: number = 1;
  private minScale: number = 0.5;
  private maxScale: number = 3;
  
  // Referencia al contenedor que se mueve
  private container: PIXI.Container;

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  /**
   * Mueve la cámara a una posición específica
   */
  moveTo(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.updateContainer();
  }

  /**
   * Aplica zoom
   */
  zoom(delta: number, centerX?: number, centerY?: number) {
    const oldScale = this.scale;
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta));
    
    // Zoom hacia el centro del ratón si se especifica
    if (centerX !== undefined && centerY !== undefined && this.scale !== oldScale) {
      const scaleFactor = this.scale / oldScale;
      this.x = centerX - (centerX - this.x) * scaleFactor;
      this.y = centerY - (centerY - this.y) * scaleFactor;
    }
    
    this.updateContainer();
  }

  /**
   * Pan con el ratón (dragging)
   */
  pan(deltaX: number, deltaY: number) {
    this.x += deltaX;
    this.y += deltaY;
    this.updateContainer();
  }

  /**
   * Centra la cámara en un punto
   */
  centerOn(x: number, y: number, screenWidth: number, screenHeight: number) {
    this.x = x - screenWidth / 2;
    this.y = y - screenHeight / 2;
    this.updateContainer();
  }

  private updateContainer() {
    this.container.x = -this.x * this.scale;
    this.container.y = -this.y * this.scale;
    this.container.scale.set(this.scale);
  }
}

// ============================================================================
// SPRITE RENDERER - Renderizado de agentes y edificios
// ============================================================================

class SpriteRenderer {
  private container: PIXI.Container;
  
  // Sprites de agentes
  private agentSprites: Map<string, PIXI.Graphics> = new Map();
  
  // Sprites de edificios
  private buildingSprites: Map<string, PIXI.Graphics> = new Map();

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  /**
   * Crea el sprite de un agente
   */
  createAgentSprite(agent: AgentData): PIXI.Graphics {
    const sprite = new PIXI.Graphics();
    
    // Cuerpo del agente (círculo)
    sprite.beginFill(agent.color);
    sprite.drawCircle(0, 0, 15);
    sprite.endFill();
    
    // Borde blanco
    sprite.lineStyle(2, 0xffffff, 1);
    sprite.drawCircle(0, 0, 15);
    
    // Indicador de actividad (línea superior)
    sprite.lineStyle(3, 0xffff00);
    sprite.moveTo(0, -15);
    sprite.lineTo(0, -22);
    
    sprite.x = agent.x;
    sprite.y = agent.y;
    // @ts-ignore - PIXI.Graphics.name no está en types pero existe en runtime
    sprite.name = agent.id;
    
    return sprite;
  }

  /**
   * Crea el sprite de un edificio
   */
  createBuildingSprite(building: BuildingData): PIXI.Graphics {
    const sprite = new PIXI.Graphics();
    
    // Colores según tipo y estado
    const colors: Record<string, number> = {
      shelter: 0x8b4513,
      storage: 0xcd853f,
      watchtower: 0x696969,
      farm: 0x228b22,
    };
    
    const baseColor = colors[building.type] || 0x888888;
    
    // Base del edificio (rectángulo)
    sprite.beginFill(baseColor);
    sprite.drawRect(-25, -25, 50, 50);
    sprite.endFill();
    
    // Borde según estado
    const borderColors: Record<string, number> = {
      active: 0x00ff00,
      under_construction: 0xffaa00,
      planned: 0xaaaaaa,
      damaged: 0xff0000,
    };
    
    sprite.lineStyle(2, borderColors[building.status] || 0xffffff);
    sprite.drawRect(-25, -25, 50, 50);
    
    // Icono según tipo
    sprite.lineStyle(2, 0xffffff);
    if (building.type === 'shelter') {
      // Triángulo (techo)
      sprite.moveTo(0, -20);
      sprite.lineTo(-20, 0);
      sprite.lineTo(20, 0);
      sprite.closePath();
    } else if (building.type === 'storage') {
      // Cubo
      sprite.drawRect(-10, -10, 20, 20);
    } else if (building.type === 'watchtower') {
      // Torre
      sprite.moveTo(-8, 0);
      sprite.lineTo(0, -25);
      sprite.lineTo(8, 0);
    } else if (building.type === 'farm') {
      // Espiga
      sprite.moveTo(0, -15);
      sprite.lineTo(0, 15);
      sprite.moveTo(-10, -10);
      sprite.lineTo(0, -15);
      sprite.lineTo(10, -10);
    }
    
    sprite.x = building.x;
    sprite.y = building.y;
    // @ts-ignore - PIXI.Graphics.name no está en types pero existe en runtime
    sprite.name = building.id;
    
    return sprite;
  }

  /**
   * Añade un agente al mundo
   */
  addAgent(agent: AgentData): PIXI.Graphics {
    const sprite = this.createAgentSprite(agent);
    this.container.addChild(sprite);
    this.agentSprites.set(agent.id, sprite);
    return sprite;
  }

  /**
   * Añade un edificio al mundo
   */
  addBuilding(building: BuildingData): PIXI.Graphics {
    const sprite = this.createBuildingSprite(building);
    this.container.addChild(sprite);
    this.buildingSprites.set(building.id, sprite);
    return sprite;
  }

  /**
   * Actualiza la posición de un agente
   */
  updateAgentPosition(agentId: string, x: number, y: number) {
    const sprite = this.agentSprites.get(agentId);
    if (sprite) {
      sprite.x = x;
      sprite.y = y;
    }
  }

  /**
   * Elimina un agente
   */
  removeAgent(agentId: string) {
    const sprite = this.agentSprites.get(agentId);
    if (sprite) {
      this.container.removeChild(sprite);
      this.agentSprites.delete(agentId);
    }
  }

  /**
   * Elimina un edificio
   */
  removeBuilding(buildingId: string) {
    const sprite = this.buildingSprites.get(buildingId);
    if (sprite) {
      this.container.removeChild(sprite);
      this.buildingSprites.delete(buildingId);
    }
  }

  /**
   * Anima a un agente (breathing effect)
   */
  animateAgentBreathing(agentId: string, time: number) {
    const sprite = this.agentSprites.get(agentId);
    if (sprite) {
      const scale = 1 + Math.sin(time * 0.003) * 0.05;
      sprite.scale.set(scale);
    }
  }

  /**
   * Resalta un agente (selección)
   */
  highlightAgent(agentId: string, highlight: boolean) {
    const sprite = this.agentSprites.get(agentId);
    if (sprite) {
      sprite.alpha = highlight ? 1 : 0.8;
    }
  }
}

// ============================================================================
// EVENT SYSTEM - Sistema de eventos entre agentes
// ============================================================================

type GameEventType = 'agent_moved' | 'building_clicked' | 'agent_clicked' | 'camera_changed';

interface GameEvent {
  type: GameEventType;
  data: any;
  timestamp: number;
}

class EventSystem {
  private listeners: Map<GameEventType, ((event: GameEvent) => void)[]> = new Map();
  private eventLog: GameEvent[] = [];
  private maxLogSize: number = 50;

  /**
   * Suscribe a un tipo de evento
   */
  on(type: GameEventType, callback: (event: GameEvent) => void): () => void {
    const listeners = this.listeners.get(type) || [];
    listeners.push(callback);
    this.listeners.set(type, listeners);

    // Retorna función de unsubscribe
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  /**
   * Emite un evento
   */
  emit(type: GameEventType, data: any) {
    const event: GameEvent = { type, data, timestamp: Date.now() };
    
    // Guardar en log
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }
    
    // Notificar listeners
    const listeners = this.listeners.get(type) || [];
    listeners.forEach(cb => cb(event));
  }

  /**
   * Obtener log de eventos
   */
  getEventLog(): GameEvent[] {
    return [...this.eventLog];
  }
}

// ============================================================================
// WORLD RENDERER - Renderizado del mundo (suelo, tiles, etc.)
// ============================================================================

class WorldRenderer {
  private container: PIXI.Container;

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  /**
   * Crea el fondo del mundo (grid de tiles)
   */
  createWorldBackground(width: number, height: number, tileSize: number = 50): PIXI.Graphics {
    const bg = new PIXI.Graphics();
    
    // Color base del terreno
    bg.beginFill(0x1a4d2e);
    bg.drawRect(0, 0, width, height);
    bg.endFill();
    
    // Grid de tiles
    bg.lineStyle(1, 0x2a5a3e, 0.3);
    
    for (let x = 0; x <= width; x += tileSize) {
      bg.moveTo(x, 0);
      bg.lineTo(x, height);
    }
    
    for (let y = 0; y <= height; y += tileSize) {
      bg.moveTo(0, y);
      bg.lineTo(width, y);
    }
    
    return bg;
  }

  /**
   * Crea un punto de referencia en el mapa
   */
  createMarker(x: number, y: number, label: string, color: number = 0xffaa00): PIXI.Graphics {
    const marker = new PIXI.Graphics();
    
    marker.lineStyle(2, color);
    marker.drawCircle(0, 0, 8);
    
    marker.lineStyle(1, color, 0.5);
    marker.drawCircle(0, 0, 15);
    
    // Texto del marker
    const text = new PIXI.Text(label, {
      fontSize: 12,
      fill: color,
      fontFamily: 'Arial',
    });
    text.x = 10;
    text.y = -20;
    marker.addChild(text);
    
    marker.x = x;
    marker.y = y;
    
    return marker;
  }

  /**
   * Crea las paredes del mundo (bordes)
   */
  createWorldBorders(width: number, height: number, borderWidth: number = 20): PIXI.Graphics {
    const borders = new PIXI.Graphics();
    
    borders.beginFill(0x0d2818);
    // Top
    borders.drawRect(0, -borderWidth, width, borderWidth);
    // Bottom
    borders.drawRect(0, height, width, borderWidth);
    // Left
    borders.drawRect(-borderWidth, 0, borderWidth, height);
    // Right
    borders.drawRect(width, 0, borderWidth, height);
    borders.endFill();
    
    return borders;
  }
}

// ============================================================================
// HUD - Interface de usuario superpuesta
// ============================================================================

interface HUDProps {
  agents: AgentData[];
  buildings: BuildingData[];
  selectedAgent: string | null;
  cameraInfo: { x: number; y: number; scale: number };
  inputInfo: { keys: string[]; mouse: { x: number; y: number } };
  onAgentSelect: (agentId: string | null) => void;
  onBuildingSelect: (buildingId: string | null) => void;
}

function HUD({
  agents,
  buildings,
  selectedAgent,
  cameraInfo,
  inputInfo,
  onAgentSelect,
  onBuildingSelect,
}: HUDProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
      {/* Panel de información superior */}
      <div className="absolute top-0 left-0 right-0 p-3 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-white font-bold text-sm">🎮 GAME VIEW 2.0 - INTEGRATION POC</h3>
              <p className="text-white/60 text-xs mt-1">
                {agents.length} agentes | {buildings.length} edificios
              </p>
            </div>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-xs"
            >
              {showHelp ? 'Ocultar' : '?'} Ayuda
            </button>
          </div>
        </div>
      </div>

      {/* Panel izquierdo - Agentes */}
      <div className="absolute top-20 left-3 w-48 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-3">
          <h4 className="text-white font-semibold text-xs mb-2">👥 AGENTES</h4>
          <div className="space-y-2">
            {agents.map(agent => (
              <div
                key={agent.id}
                onClick={() => onAgentSelect(selectedAgent === agent.id ? null : agent.id)}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  selectedAgent === agent.id
                    ? 'bg-white/30 border border-white/50'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#' + agent.color.toString(16).padStart(6, '0') }}
                  />
                  <span className="text-white text-xs">{agent.name}</span>
                </div>
                <div className="text-white/60 text-xs mt-1">
                  📍 {agent.x.toFixed(0)}, {agent.y.toFixed(0)}
                </div>
                <div className="text-yellow-400 text-xs">
                  {agent.activity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho - Edificios */}
      <div className="absolute top-20 right-3 w-44 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-3">
          <h4 className="text-white font-semibold text-xs mb-2">🏢 EDIFICIOS</h4>
          <div className="space-y-2">
            {buildings.map(building => {
              const typeIcons: Record<string, string> = {
                shelter: '🏠',
                storage: '📦',
                watchtower: '🗼',
                farm: '🌾',
              };
              const statusColors: Record<string, string> = {
                active: 'text-green-400',
                under_construction: 'text-yellow-400',
                planned: 'text-gray-400',
                damaged: 'text-red-400',
              };
              
              return (
                <div
                  key={building.id}
                  onClick={() => onBuildingSelect(building.id)}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{typeIcons[building.type]}</span>
                    <span className="text-white text-xs capitalize">{building.type}</span>
                  </div>
                  <div className={`text-xs mt-1 ${statusColors[building.status]}`}>
                    {building.status.replace('_', ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Panel inferior - Debug/Controles */}
      <div className="absolute bottom-3 left-3 right-3 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-3">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-white/60">Cámara:</span>
              <span className="text-white ml-2">
                x={cameraInfo.x.toFixed(0)} y={cameraInfo.y.toFixed(0)} z={cameraInfo.scale.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-white/60">Ratón:</span>
              <span className="text-white ml-2">
                x={inputInfo.mouse.x.toFixed(0)} y={inputInfo.mouse.y.toFixed(0)}
              </span>
            </div>
            <div>
              <span className="text-white/60">Teclas:</span>
              <span className="text-white ml-2">
                {inputInfo.keys.length > 0 ? inputInfo.keys.join(', ') : 'ninguna'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de ayuda */}
      {showHelp && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto">
          <div className="bg-gray-900 rounded-lg border border-white/20 p-6 max-w-md">
            <h3 className="text-white font-bold text-lg mb-4">⌨️ CONTROLES</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-4">
                <kbd className="bg-white/20 px-2 py-1 rounded text-white">W/A/S/D</kbd>
                <span className="text-white/80">Mover agente seleccionado</span>
              </div>
              <div className="flex gap-4">
                <kbd className="bg-white/20 px-2 py-1 rounded text-white">Ratón</kbd>
                <span className="text-white/80">Arrastrar para mover cámara</span>
              </div>
              <div className="flex gap-4">
                <kbd className="bg-white/20 px-2 py-1 rounded text-white">Scroll</kbd>
                <span className="text-white/80">Zoom in/out</span>
              </div>
              <div className="flex gap-4">
                <kbd className="bg-white/20 px-2 py-1 rounded text-white">C</kbd>
                <span className="text-white/80">Centrar en agente</span>
              </div>
              <div className="flex gap-4">
                <kbd className="bg-white/20 px-2 py-1 rounded text-white">R</kbd>
                <span className="text-white/80">Resetear cámara</span>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL DE INTEGRACIÓN
// ============================================================================

interface GameViewIntegrationProps {
  width?: number;
  height?: number;
}

/**
 * GameViewIntegration
 * 
 * Componente React que integra TODAS las piezas del motor de juego:
 * - GameEngine:Motor PIXI principal
 * - WorldRenderer: Renderizado del mundo (suelo, grid, markers)
 * - SpriteRenderer: Sprites de agentes y edificios
 * - GameCamera: Sistema de cámara con pan/zoom
 * - InputHandler: Manejo de teclado y ratón
 * - EventSystem: Sistema de eventos
 * - HUD: Interface de usuario
 * 
 * Este componente es la prueba de que todas las piezas funcionan juntas.
 */
export function GameViewIntegration({
  width = 800,
  height = 600,
}: GameViewIntegrationProps) {
  // Refs para el canvas y los sistemas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldContainerRef = useRef<PIXI.Container | null>(null);
  const inputHandlerRef = useRef<InputHandler | null>(null);
  const cameraRef = useRef<GameCamera | null>(null);
  const spriteRendererRef = useRef<SpriteRenderer | null>(null);
  const eventSystemRef = useRef<EventSystem | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Estado de React
  const [agents, setAgents] = useState<AgentData[]>(HARDCODED_AGENTS);
  const [buildings] = useState<BuildingData[]>(HARDCODED_BUILDINGS);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [cameraInfo, setCameraInfo] = useState({ x: 0, y: 0, scale: 1 });
  const [inputKeys, setInputKeys] = useState<string[]>([]);

  // ============================================================================
  // INICIALIZACIÓN DEL MOTOR
  // ============================================================================
  useEffect(() => {
    if (!canvasRef.current) return;

    const initEngine = async () => {
      // 1. Crear aplicación PIXI
      const app = new PIXI.Application({
        view: canvasRef.current!,
        width,
        height,
        backgroundColor: 0x1a4d2e,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      appRef.current = app;

      // 2. Crear contenedor del mundo (este se transforma con la cámara)
      const worldContainer = new PIXI.Container();
      worldContainerRef.current = worldContainer;
      app.stage.addChild(worldContainer);

      // 3. Inicializar sistemas
      const eventSystem = new EventSystem();
      eventSystemRef.current = eventSystem;

      const camera = new GameCamera(worldContainer);
      cameraRef.current = camera;
      camera.centerOn(400, 300, width, height);

      const inputHandler = new InputHandler(canvasRef.current!);
      inputHandlerRef.current = inputHandler;

      const worldRenderer = new WorldRenderer(worldContainer);
      const spriteRenderer = new SpriteRenderer(worldContainer);
      spriteRendererRef.current = spriteRenderer;

      // 4. Renderizar el mundo base
      const bg = worldRenderer.createWorldBackground(800, 600, 50);
      worldContainer.addChild(bg);

      const borders = worldRenderer.createWorldBorders(800, 600, 20);
      worldContainer.addChild(borders);

      // 5. Crear marcadores de referencia
      const marker1 = worldRenderer.createMarker(400, 300, 'Centro', 0x00ff88);
      worldContainer.addChild(marker1);

      // 6. Crear sprites de agentes y edificios
      HARDCODED_AGENTS.forEach(agent => spriteRenderer.addAgent(agent));
      HARDCODED_BUILDINGS.forEach(building => spriteRenderer.addBuilding(building));

      // 7. Configurar eventos del input
      inputHandler.onKeyDown = (key) => {
        setInputKeys(prev => [...prev.slice(-4), key]);
        eventSystem.emit('agent_moved', { key });
      };

      inputHandler.onMouseMove = (x, y) => {
        if (inputHandler.dragging) {
          const deltaX = x - inputHandler.lastDragPos.x;
          const deltaY = y - inputHandler.lastDragPos.y;
          camera.pan(deltaX, deltaY);
          inputHandler.lastDragPos = { x, y };
        }
      };

      // 8. Configurar zoom con scroll
      canvasRef.current!.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        camera.zoom(delta, e.offsetX, e.offsetY);
      });

      // 9. Loop de animación
      let time = 0;
      const gameLoop = () => {
        time += 16.67; // ~60fps
        
        // Animar breathing de agentes
        agents.forEach(agent => {
          spriteRenderer.animateAgentBreathing(agent.id, time);
        });

        // Mover agente seleccionado con teclado
        const selectedAgentData = agents.find(a => a.id === selectedAgent);
        if (selectedAgentData) {
          let moved = false;
          let dx = 0, dy = 0;
          const speed = 3;

          if (inputHandler.isKeyPressed('w') || inputHandler.isKeyPressed('W')) { dy = -speed; moved = true; }
          if (inputHandler.isKeyPressed('s') || inputHandler.isKeyPressed('S')) { dy = speed; moved = true; }
          if (inputHandler.isKeyPressed('a') || inputHandler.isKeyPressed('A')) { dx = -speed; moved = true; }
          if (inputHandler.isKeyPressed('d') || inputHandler.isKeyPressed('D')) { dx = speed; moved = true; }

          if (moved) {
            const newX = Math.max(20, Math.min(780, selectedAgentData.x + dx));
            const newY = Math.max(20, Math.min(580, selectedAgentData.y + dy));
            spriteRenderer.updateAgentPosition(selectedAgentData.id, newX, newY);
            
            // Actualizar estado local
            setAgents(prev => prev.map(a => 
              a.id === selectedAgent ? { ...a, x: newX, y: newY } : a
            ));
          }
        }

        // Centrar cámara con C
        if (inputHandler.isKeyPressed('c') || inputHandler.isKeyPressed('C')) {
          if (selectedAgentData) {
            camera.centerOn(selectedAgentData.x, selectedAgentData.y, width, height);
          }
        }

        // Resetear cámara con R
        if (inputHandler.isKeyPressed('r') || inputHandler.isKeyPressed('R')) {
          camera.moveTo(0, 0);
          cameraRef.current!.scale = 1;
          // Use moveTo to trigger updateContainer
          camera.moveTo(camera.x, camera.y);
        }

        // Actualizar estado de cámara
        setCameraInfo({ x: camera.x, y: camera.y, scale: camera.scale });

        animationFrameRef.current = requestAnimationFrame(gameLoop);
      };

      gameLoop();

      // Cleanup
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        inputHandler.destroy();
        app.destroy(true);
      };
    };

    initEngine();
  }, []); // Empty deps = solo se ejecuta una vez

  // ============================================================================
  // HANDLERS DE SELECCIÓN
  // ============================================================================
  const handleAgentSelect = useCallback((agentId: string | null) => {
    setSelectedAgent(agentId);
    
    // Highlight en sprite
    agents.forEach(agent => {
      spriteRendererRef.current?.highlightAgent(agent.id, agent.id === agentId);
    });
    
    // Notificar al event system
    if (agentId) {
      eventSystemRef.current?.emit('agent_clicked', { agentId });
    }
  }, [agents]);

  const handleBuildingSelect = useCallback((buildingId: string | null) => {
    eventSystemRef.current?.emit('building_clicked', { buildingId });
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="relative rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
      {/* Canvas del juego */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
        style={{ cursor: 'grab' }}
      />

      {/* HUD superpuesto */}
      <HUD
        agents={agents}
        buildings={buildings}
        selectedAgent={selectedAgent}
        cameraInfo={cameraInfo}
        inputInfo={{
          keys: inputKeys,
          mouse: {
            x: inputHandlerRef.current?.mouse.x || 0,
            y: inputHandlerRef.current?.mouse.y || 0,
          },
        }}
        onAgentSelect={handleAgentSelect}
        onBuildingSelect={handleBuildingSelect}
      />

      {/* Instrucciones de uso */}
      {selectedAgent && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-600/80 text-white text-xs px-3 py-1 rounded-full">
          Moviendo: {agents.find(a => a.id === selectedAgent)?.name}
        </div>
      )}
    </div>
  );
}

export default GameViewIntegration;
