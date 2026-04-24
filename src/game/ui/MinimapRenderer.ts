/**
 * MinimapRenderer.ts
 * 
 * Renderiza una versión mini del mundo con:
 * - Puntos para agentes (colores por tipo)
 * - Rectángulos para edificios
 * - Marco mostrando viewport actual
 * - Actualización en tiempo real
 */

import * as PIXI from 'pixi.js';

// ============================================================================
// TIPOS
// ============================================================================

export interface MinimapAgent {
  id: string;
  x: number;
  y: number;
  color: number;
  name: string;
}

export interface MinimapBuilding {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'shelter' | 'storage' | 'watchtower' | 'farm';
  color: number;
}

export interface MinimapViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface MinimapOptions {
  worldWidth: number;
  worldHeight: number;
  width: number;
  height: number;
  backgroundColor: number;
  gridColor: number;
  viewportBorderColor: number;
  agentRadius: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_OPTIONS: MinimapOptions = {
  worldWidth: 800,
  worldHeight: 600,
  width: 150,
  height: 100,
  backgroundColor: 0x1a4d2e,
  gridColor: 0x2a5a3e,
  viewportBorderColor: 0x00ff88,
  agentRadius: 3,
};

// Colores por tipo de edificio
const BUILDING_COLORS: Record<string, number> = {
  shelter: 0x8b4513,
  storage: 0xcd853f,
  watchtower: 0x696969,
  farm: 0x228b22,
};

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================

export class MinimapRenderer {
  private app: PIXI.Application;
  private worldContainer: PIXI.Container;
  private agentsContainer: PIXI.Container;
  private buildingsContainer: PIXI.Container;
  private viewportRect: PIXI.Graphics;
  private options: MinimapOptions;
  
  // Escalado de mundo a minimap
  private scaleX: number;
  private scaleY: number;

  constructor(canvas: HTMLCanvasElement, options: Partial<MinimapOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Calcular escalado
    this.scaleX = this.options.width / this.options.worldWidth;
    this.scaleY = this.options.height / this.options.worldHeight;

    // Crear aplicación PIXI para el minimap
    this.app = new PIXI.Application({
      view: canvas,
      width: this.options.width,
      height: this.options.height,
      backgroundColor: this.options.backgroundColor,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Contenedor principal
    this.worldContainer = new PIXI.Container();
    this.app.stage.addChild(this.worldContainer);

    // Sub-contenedores para organización
    this.buildingsContainer = new PIXI.Container();
    this.agentsContainer = new PIXI.Container();
    this.worldContainer.addChild(this.buildingsContainer);
    this.worldContainer.addChild(this.agentsContainer);

    // Rectángulo del viewport
    this.viewportRect = new PIXI.Graphics();
    this.worldContainer.addChild(this.viewportRect);

    // Renderizar fondo inicial
    this.renderBackground();
  }

  /**
   * Renderiza el fondo del minimap (grid simplificado)
   */
  private renderBackground() {
    const bg = new PIXI.Graphics();
    
    // Fondo sólido
    bg.beginFill(this.options.backgroundColor);
    bg.drawRect(0, 0, this.options.width, this.options.height);
    bg.endFill();

    // Grid simplificado (cada 50 pixels del mundo = 1 línea)
    bg.lineStyle(0.5, this.options.gridColor, 0.3);
    
    const gridStep = 50;
    for (let x = 0; x <= this.options.worldWidth; x += gridStep) {
      const screenX = x * this.scaleX;
      bg.moveTo(screenX, 0);
      bg.lineTo(screenX, this.options.height);
    }
    
    for (let y = 0; y <= this.options.worldHeight; y += gridStep) {
      const screenY = y * this.scaleY;
      bg.moveTo(0, screenY);
      bg.lineTo(this.options.width, screenY);
    }

    this.worldContainer.addChildAt(bg, 0);
  }

  /**
   * Convierte coordenadas del mundo a coordenadas del minimap
   */
  worldToMinimap(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.scaleX,
      y: worldY * this.scaleY,
    };
  }

  /**
   * Convierte coordenadas del minimap a coordenadas del mundo
   */
  minimapToWorld(minimapX: number, minimapY: number): { x: number; y: number } {
    return {
      x: minimapX / this.scaleX,
      y: minimapY / this.scaleY,
    };
  }

  /**
   * Actualiza la posición de un agente en el minimap
   */
  updateAgent(agent: MinimapAgent): void {
    // Buscar sprite existente o crear nuevo
    let sprite = this.agentsContainer.getChildByName(agent.id) as PIXI.Graphics;
    
    const pos = this.worldToMinimap(agent.x, agent.y);
    
    if (!sprite) {
      // Crear nuevo sprite
      sprite = new PIXI.Graphics();
      sprite.name = agent.id;
      
      // Punto del agente (círculo)
      sprite.beginFill(agent.color);
      sprite.drawCircle(0, 0, this.options.agentRadius);
      sprite.endFill();
      
      // Borde blanco
      sprite.lineStyle(1, 0xffffff, 0.8);
      sprite.drawCircle(0, 0, this.options.agentRadius);
      
      this.agentsContainer.addChild(sprite);
    }
    
    sprite.x = pos.x;
    sprite.y = pos.y;
  }

  /**
   * Elimina un agente del minimap
   */
  removeAgent(agentId: string): void {
    const sprite = this.agentsContainer.getChildByName(agentId);
    if (sprite) {
      this.agentsContainer.removeChild(sprite);
    }
  }

  /**
   * Actualiza un edificio en el minimap
   */
  updateBuilding(building: MinimapBuilding): void {
    let sprite = this.buildingsContainer.getChildByName(building.id) as PIXI.Graphics;
    
    if (!sprite) {
      // Crear nuevo sprite
      sprite = new PIXI.Graphics();
      sprite.name = building.id;
      this.buildingsContainer.addChild(sprite);
    }

    // Limpiar sprite existente
    sprite.clear();

    const pos = this.worldToMinimap(building.x - building.width / 2, building.y - building.height / 2);
    const w = building.width * this.scaleX;
    const h = building.height * this.scaleY;

    // Rectángulo del edificio
    sprite.beginFill(building.color);
    sprite.drawRect(pos.x, pos.y, Math.max(w, 2), Math.max(h, 2));
    sprite.endFill();

    // Borde más claro
    sprite.lineStyle(1, 0xffffff, 0.5);
    sprite.drawRect(pos.x, pos.y, Math.max(w, 2), Math.max(h, 2));
  }

  /**
   * Elimina un edificio del minimap
   */
  removeBuilding(buildingId: string): void {
    const sprite = this.buildingsContainer.getChildByName(buildingId);
    if (sprite) {
      this.buildingsContainer.removeChild(sprite);
    }
  }

  /**
   * Actualiza el rectángulo del viewport
   */
  updateViewport(viewport: MinimapViewport): void {
    this.viewportRect.clear();

    // Calcular rectángulo del viewport en coordenadas de minimap
    const topLeft = this.worldToMinimap(viewport.x, viewport.y);
    const vWidth = (viewport.width / viewport.scale) * this.scaleX;
    const vHeight = (viewport.height / viewport.scale) * this.scaleY;

    // Marco punteado del viewport
    this.viewportRect.lineStyle(1.5, this.options.viewportBorderColor, 0.9);
    this.viewportRect.drawRect(topLeft.x, topLeft.y, vWidth, vHeight);

    // Esquinas destacadas para mayor claridad
    const cornerSize = 4;
    this.viewportRect.lineStyle(2, this.options.viewportBorderColor, 1);
    
    // Esquina superior izquierda
    this.viewportRect.moveTo(topLeft.x, topLeft.y + cornerSize);
    this.viewportRect.lineTo(topLeft.x, topLeft.y);
    this.viewportRect.lineTo(topLeft.x + cornerSize, topLeft.y);
    
    // Esquina superior derecha
    this.viewportRect.moveTo(topLeft.x + vWidth - cornerSize, topLeft.y);
    this.viewportRect.lineTo(topLeft.x + vWidth, topLeft.y);
    this.viewportRect.lineTo(topLeft.x + vWidth, topLeft.y + cornerSize);
    
    // Esquina inferior izquierda
    this.viewportRect.moveTo(topLeft.x, topLeft.y + vHeight - cornerSize);
    this.viewportRect.lineTo(topLeft.x, topLeft.y + vHeight);
    this.viewportRect.lineTo(topLeft.x + cornerSize, topLeft.y + vHeight);
    
    // Esquina inferior derecha
    this.viewportRect.moveTo(topLeft.x + vWidth - cornerSize, topLeft.y + vHeight);
    this.viewportRect.lineTo(topLeft.x + vWidth, topLeft.y + vHeight);
    this.viewportRect.lineTo(topLeft.x + vWidth, topLeft.y + vHeight - cornerSize);
  }

  /**
   * Actualiza todos los agentes de golpe
   */
  updateAgents(agents: MinimapAgent[]): void {
    // Remover agentes que ya no existen
    const currentIds = new Set(agents.map(a => a.id));
    this.agentsContainer.children.forEach(child => {
      if (child.name && !currentIds.has(child.name)) {
        this.agentsContainer.removeChild(child);
      }
    });
    
    // Actualizar o añadir agentes
    agents.forEach(agent => this.updateAgent(agent));
  }

  /**
   * Actualiza todos los edificios de golpe
   */
  updateBuildings(buildings: MinimapBuilding[]): void {
    // Remover edificios que ya no existen
    const currentIds = new Set(buildings.map(b => b.id));
    this.buildingsContainer.children.forEach(child => {
      if (child.name && !currentIds.has(child.name)) {
        this.buildingsContainer.removeChild(child);
      }
    });
    
    // Actualizar o añadir edificios
    buildings.forEach(building => this.updateBuilding(building));
  }

  /**
   * Realiza un sync completo
   */
  fullSync(agents: MinimapAgent[], buildings: MinimapBuilding[], viewport: MinimapViewport): void {
    this.updateAgents(agents);
    this.updateBuildings(buildings);
    this.updateViewport(viewport);
  }

  /**
   * Destruye el minimap y libera recursos
   */
  destroy(): void {
    this.app.destroy(true);
  }
}
