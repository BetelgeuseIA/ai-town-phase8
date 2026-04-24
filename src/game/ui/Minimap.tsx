/**
 * Minimap.tsx
 * 
 * Componente React overlay para el minimapa.
 * Posición: top-right corner
 * Tamaño: 150x100px
 * Borde estilo game UI
 * Click para saltar a esa zona
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { MinimapRenderer, MinimapAgent, MinimapBuilding, MinimapViewport, MinimapOptions } from './MinimapRenderer';

// ============================================================================
// TIPOS
// ============================================================================

interface MinimapProps {
  /** Ancho del mundo en pixels */
  worldWidth?: number;
  /** Alto del mundo en pixels */
  worldHeight?: number;
  /** Ancho del minimap en pixels */
  width?: number;
  /** Alto del minimap en pixels */
  height?: number;
  /** Agentes a mostrar */
  agents: MinimapAgent[];
  /** Edificios a mostrar */
  buildings: MinimapBuilding[];
  /** Viewport actual de la cámara */
  viewport: MinimapViewport;
  /** Callback cuando se hace click en una posición del minimap */
  onMinimapClick?: (worldX: number, worldY: number) => void;
  /** Si está deshabilitado */
  disabled?: boolean;
  /** Posición personalizada (por defecto top-right) */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Offset desde el borde */
  offset?: { x: number; y: number };
  /** Clase CSS adicional */
  className?: string;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export const Minimap: React.FC<MinimapProps> = ({
  worldWidth = 800,
  worldHeight = 600,
  width = 150,
  height = 100,
  agents,
  buildings,
  viewport,
  onMinimapClick,
  disabled = false,
  position = 'top-right',
  offset = { x: 16, y: 16 },
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MinimapRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // INICIALIZACIÓN DEL RENDERER
  // ============================================================================
  useEffect(() => {
    if (!canvasRef.current || disabled) return;

    const options: Partial<MinimapOptions> = {
      worldWidth,
      worldHeight,
      width,
      height,
    };

    rendererRef.current = new MinimapRenderer(canvasRef.current, options);

    // Cleanup al desmontar
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, [worldWidth, worldHeight, width, height, disabled]);

  // ============================================================================
  // ACTUALIZACIÓN EN TIEMPO REAL
  // ============================================================================
  useEffect(() => {
    if (!rendererRef.current || disabled) return;

    // Realizar sync completo (agentes + edificios + viewport)
    rendererRef.current.fullSync(agents, buildings, viewport);
  }, [agents, buildings, viewport, disabled]);

  // ============================================================================
  // CLICK PARA SALTAR A ZONA
  // ============================================================================
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || disabled || !onMinimapClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Obtener posición relativa al canvas
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    
    const minimapX = (e.clientX - rect.left) * scaleX;
    const minimapY = (e.clientY - rect.top) * scaleY;

    // Convertir a coordenadas del mundo
    const world = rendererRef.current.minimapToWorld(minimapX, minimapY);

    onMinimapClick(world.x, world.y);
  }, [onMinimapClick, disabled, width, height]);

  // ============================================================================
  // CÁLCULO DE POSICIÓN
  // ============================================================================
  const getPositionStyle = useCallback((): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 50,
    };

    switch (position) {
      case 'top-right':
        return { ...base, top: offset.y, right: offset.x };
      case 'top-left':
        return { ...base, top: offset.y, left: offset.x };
      case 'bottom-right':
        return { ...base, bottom: offset.y, right: offset.x };
      case 'bottom-left':
        return { ...base, bottom: offset.y, left: offset.x };
      default:
        return { ...base, top: offset.y, right: offset.x };
    }
  }, [position, offset]);

  // ============================================================================
  // RENDER
  // ============================================================================
  if (disabled) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`minimap-container ${className}`}
      style={getPositionStyle()}
    >
      {/* Marco del minimap estilo game UI */}
      <div 
        className="relative rounded-lg border-2 border-white/30 bg-black/60 backdrop-blur-sm overflow-hidden shadow-lg"
        style={{
          width: width + 4, // +4 for border
          height: height + 4,
        }}
      >
        {/* Borde interior sutil */}
        <div 
          className="absolute inset-0 rounded-lg border border-white/10 pointer-events-none"
        />

        {/* Canvas del minimap */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleClick}
          className="block cursor-pointer"
          style={{
            width: width,
            height: height,
          }}
        />

        {/* Label "MAP" */}
        <div 
          className="absolute top-1 left-2 text-white/60 font-bold text-[8px] tracking-wider pointer-events-none"
        >
          MAP
        </div>

        {/* Indicador de zoom/escala si hay zoom activo */}
        {viewport.scale !== 1 && (
          <div 
            className="absolute bottom-1 right-2 text-white/50 font-bold text-[8px] pointer-events-none"
          >
            {viewport.scale.toFixed(1)}x
          </div>
        )}
      </div>

      {/* Tooltip de ayuda */}
      <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-white/40 text-[9px] whitespace-nowrap pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
        Click to navigate
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export type { MinimapAgent, MinimapBuilding, MinimapViewport } from './MinimapRenderer';

export default Minimap;
