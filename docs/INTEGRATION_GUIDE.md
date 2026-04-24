# Integration Guide — AI Town Game Components

## Resumen del Proyecto

AI Town es un simulador de asentamiento con agentes autónomos corriendo en **Convex** (backend) y renderizado visual en **PixiJS** (frontend).

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND (Vite + React)            │
├─────────────────────────────────────────────────────────┤
│  Game.tsx                                               │
│    └── PixiGame.tsx (Stage → PixiViewport → Players)    │
│          └── Player.tsx → Character.tsx (sprite)         │
│          └── PixiStaticMap.tsx (tiles)                   │
│                                                         │
│  GameView.tsx (standalone POC, separate canvas)         │
│    └── GameEngine.ts (basic PixiJS app)                 │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│              BACKEND (Convex Functions)                 │
├─────────────────────────────────────────────────────────┤
│  convex/aiTown/game.ts  ──► Game extends AbstractGame   │
│  convex/aiTown/world.ts ──► World state + historical    │
│  convex/aiTown/player.ts, agent.ts, location.ts          │
│  convex/engine/abstractGame.ts ──► Engine loop base      │
│  hooks/serverGame.ts ──► useServerGame() hook            │
│    └── useQuery(api.world.worldState)                   │
│    └── useQuery(api.world.gameDescriptions)              │
└─────────────────────────────────────────────────────────┘
```

---

## Componentes Principales

### Backend (Convex)

| Archivo | Rol |
|---|---|
| `convex/aiTown/game.ts` | Clase `Game` — lógica principal del juego, loop de ticks |
| `convex/aiTown/world.ts` | Clase `World` — estado del mundo (players, agents, conversations) |
| `convex/aiTown/worldMap.ts` | Clase `WorldMap` — definición del mapa (tiles, dimensiones) |
| `convex/aiTown/player.ts` | Modelo `Player` en el mundo |
| `convex/aiTown/agent.ts` | Modelo `Agent` con operaciones y memoria |
| `convex/aiTown/location.ts` | Estructuras de ubicación, movimiento, facing |
| `convex/aiTown/inputs.ts` | Tipos de input (`moveTo`, `textInput`, etc.) |
| `convex/aiTown/schema.ts` | Schema de la base de datos Convex |
| `convex/engine/abstractGame.ts` | Clase base `AbstractGame` — engine loop, applyEngineUpdate |
| `convex/engine/historicalObject.ts` | Sistema de buffer histórico para replay |
| `convex/_generated/api.ts` | API generada por Convex (queries, mutations) |

### Frontend (React + PixiJS)

| Archivo | Rol |
|---|---|
| `src/components/Game.tsx` | **Componente principal** — mounting point, Orchestrates everything |
| `src/components/PixiGame.tsx` | Renderer PixiJS dentro del Stage |
| `src/components/PixiViewport.tsx` | Viewport con pan/zoom (pixi-viewport) |
| `src/components/PixiStaticMap.tsx` | Capa de tiles estáticos |
| `src/components/Player.tsx` | Sprite de jugador (dibujado via `Character`) |
| `src/components/Character.tsx` | Componente visual del personaje (textura, animación) |
| `src/components/PlayerDetails.tsx` | Panel derecho con stats del jugador seleccionado |
| `src/components/DebugPath.tsx` | Línea de debug mostrando path del jugador |
| `src/components/PositionIndicator.tsx` | Indicador de destino al hacer click |
| `src/components/DebugTimeManager.tsx` | Controles de tiempo (replay histórico) |
| `src/hooks/serverGame.ts` | Hook `useServerGame(worldId)` — parsea estado del backend |
| `src/hooks/sendInput.ts` | Hook `useSendInput()` — envía inputs al juego |
| `src/hooks/useWorldHeartbeat.ts` | Keep-alive heartbeat al world |
| `src/hooks/useHistoricalTime.ts` | Sistema de replay histórico |

### GameView POC (Canvas Standalone)

| Archivo | Rol |
|---|---|
| `src/game/GameView.tsx` | Componente React wrapper |
| `src/game/GameEngine.ts` | PixiJS Application con agentes animados |

---

## Orden de Inicialización

### 1. Convex Backend (al iniciar el dev server)

```
npx convex dev
  → init.ts corre el bootstrap
  → engine/loop.ts empieza el game loop (tick each 16ms)
  → crons.ts scheduler activo
```

El engine persistido en Convex ejecuta `runAgentOperation` en cada step.

### 2. Frontend React (al cargar la página)

```
App.tsx
  └── Game.tsx
        ├── useQuery(api.world.defaultWorldStatus)
        │     → obtiene worldId + engineId
        │
        ├── useServerGame(worldId)
        │     ├── useQuery(api.world.worldState)
        │     │     → estado actual del mundo
        │     └── useQuery(api.world.gameDescriptions)
        │           → playerDescriptions, agentDescriptions, worldMap
        │
        ├── useWorldHeartbeat()
        │     → mutation cada 30s para mantener el world vivo
        │
        └── <Stage>
              └── <PixiGame>
                    ├── <PixiViewport>
                    │     ├── <PixiStaticMap>
                    │     ├── <DebugPath> (si SHOW_DEBUG_UI)
                    │     ├── <PositionIndicator>
                    │     └── <Player> × N
                    └── useSendInput() → api.world.sendInput
```

---

## Dependencias Entre Componentes

```
Game.tsx (root)
  ├── useServerGame() → serverGame.ts (depende de convex/api)
  │     └── necesita: worldId de defaultWorldStatus
  │
  ├── useWorldHeartbeat() → necesita worldId
  │
  ├── useHistoricalTime() → necesita worldState?.engine
  │
  ├── PixiGame
  │     ├── necesita: game (ServerGame), worldId, engineId, width, height
  │     ├── useSendInput() → necesita engineId
  │     ├── useQuery(api.world.userStatus) → necesita worldId
  │     └── PixiViewport + PixiStaticMap + Player
  │           ├── Player.tsx → Character.tsx
  │           └── Player.tsx necesita: game, player, playerDescriptions
  │
  └── PlayerDetails → necesita game, playerId, worldId, engineId
```

---

## Flujo de Datos

### Query Game State

```
Frontend                          Convex Backend
   │                                    │
   │── useServerGame(worldId) ─────────►│
   │                                    ├── worldState query
   │                                    │     ← World + historicalLocations
   │◄── return ServerGame ─────────────│
   │                                    │
   │── game.world.players              │
   │── game.playerDescriptions          │
   │── game.worldMap                   │
   │   (tiles, dimensions)             │
```

### Enviar Input (Movement)

```
User clicks on map
  → onMapPointerUp (PixiGame.tsx)
    → viewport.toWorld(e.screenX, e.screenY) // convert screen → world coords
      → tile = floor(worldPx / tileDim)
        → moveTo({ playerId, destination: {x, y} })
          → useSendInput(engineId, 'moveTo')
            → convex.mutation(api.world.sendInput)
              → Game.handleInput() en backend
                → agentOperations.push({ name: 'moveTo', args })
```

### Animation Loop

```
PixiGame se re-renderiza cuando:
  → useQuery(api.world.worldState) cambia (nuevo world state)
  → game descriptions cambian (agent se mueve)
  → historicalTime cambia (debug replay mode)

Player.tsx
  → useHistoricalValue(Location, historicalTime, playerLocation(player))
  → pasa x,y a Character.tsx
  → Character dibuja sprite en posición (x * tileDim, y * tileDim)
```

---

## Ejemplo Completo: GameView.tsx Integrado con GameEngine

```tsx
import React, { useEffect, useRef } from 'react';
import { GameEngine } from './GameEngine';

interface GameViewProps {
  /** Ancho del canvas. Default: 800 */
  width?: number;
  /** Alto del canvas. Default: 600 */
  height?: number;
  /** World ID de Convex para sincronizar estado */
  worldId?: string;
}

const GameView: React.FC<GameViewProps> = ({ 
  width = 800, 
  height = 600,
  worldId 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Inicializar GameEngine
    const engine = new GameEngine();
    gameEngineRef.current = engine;

    engine.initialize(canvasRef.current).then(() => {
      console.log('[GameView] GameEngine initialized');
      
      // 2. Si hay worldId, sincronizar con Convex
      if (worldId) {
        engine.connectToConvex(worldId);
      }
    });

    // 3. Cleanup al desmontar
    return () => {
      engine.destroy();
      gameEngineRef.current = null;
    };
  }, [worldId]);

  return (
    <div 
      className="relative rounded-2xl border border-white/10 
                 bg-black/20 p-4"
    >
      <h2 className="mb-3 text-lg font-semibold">
        🎮 Game View
      </h2>
      <div className="relative">
        <canvas 
          ref={canvasRef}
          width={width}
          height={height}
          className="rounded-lg border border-white/10"
        />
        {/* Overlay de debug info */}
        {gameEngineRef.current && (
          <div className="absolute top-2 left-2 
                          text-white font-bold text-sm 
                          bg-black/50 px-2 py-1 rounded">
            GAME VIEW POC
          </div>
        )}
      </div>
    </div>
  );
};

export default GameView;
```

### GameEngine.ts actualizado

```typescript
// src/game/GameEngine.ts
import * as PIXI from 'pixi.js';

export class GameEngine {
  private app: PIXI.Application | null = null;
  private agents: PIXI.Graphics[] = [];
  private worldId: string | null = null;

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.app = new PIXI.Application({
      view: canvas,
      width: 800,
      height: 600,
      backgroundColor: 0x7ab5ff, // Sky blue para asentamiento
      antialias: true,
    });

    this.createAgents();
    this.setupAnimation();
  }

  /** Conectar con Convex para sincronizar estado del mundo */
  connectToConvex(worldId: string): void {
    this.worldId = worldId;
    // TODO: Subscribe a queries de Convex para actualizar agentes
    console.log(`[GameEngine] Connected to world: ${worldId}`);
  }

  private createAgents(): void {
    if (!this.app) return;
    const colors = [0xff6b6b, 0x51cf66, 0x339af0];
    const positions = [
      { x: 100, y: 300 },
      { x: 400, y: 200 },
      { x: 600, y: 400 },
    ];

    for (let i = 0; i < 3; i++) {
      const agent = new PIXI.Graphics();
      agent.beginFill(colors[i]);
      agent.drawCircle(0, 0, 15);
      agent.endFill();
      agent.x = positions[i].x;
      agent.y = positions[i].y;
      this.app.stage.addChild(agent);
      this.agents.push(agent);
    }
  }

  private setupAnimation(): void {
    if (!this.app) return;
    this.app.ticker.add(() => {
      // Animation logic here
    });
  }

  destroy(): void {
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
    this.agents = [];
    this.worldId = null;
  }
}
```

---

## Troubleshooting Común

### Error: "Cannot read properties of null (reading 'stage')"

**Causa:** PixiJS no inicializado antes de agregar children.
**Solución:** Asegurarse que `await initialize()` completó antes de usar el canvas.

### Error: "useQuery() called outside ConvexProvider"

**Causa:** Componente `PixiGame` renderizado fuera del provider de Convex.
**Solución:** Envolver `PixiGame` en `ConvexProvider`:

```tsx
<ConvexProvider client={convex}>
  <PixiGame {...props} />
</ConvexProvider>
```

### Canvas negro / sin render

**Causa:** PixiViewport no recibe `screenWidth` o `screenHeight` correctamente.
**Solución:** Verificar que `useElementSize` retorna valores > 0. Agregar fallback:

```tsx
const width = gameWrapperRef.current?.clientWidth ?? 800;
const height = gameWrapperRef.current?.clientHeight ?? 600;
```

### Agentes no aparecen

**Causa:** `playerDescriptions` vacío o `worldId` null.
**Solución:** Verificar que `api.world.defaultWorldStatus` retorna datos. Revisar dashboard para confirmar que el world está activo.

### Error: "Unknown character {name}"

**Causa:** Nombre de character no existe en `data/characters.ts`.
**Solución:** Agregar el character al archivo `data/characters.ts` con `textureUrl` y `spritesheetData`.

### build.tsc falla con errores de tipos

**Causa:** Tipos de Convex no generados (el `_generated/` folder).
**Solución:** Correr `npx convex dev` al menos una vez para generar los tipos. Si persisten: `npx convex codegen`.

### PixiGame no recibe worldId

**Causa:** `worldStatus` es null porque no hay default world activo.
**Solución:** Verificar en el dashboard de Convex que hay un world corriendo. El dashboard puede crearse si no existe.

---

## Checklist de Integración

### Pre-build

- [ ] `npx convex codegen` ejecutó sin errores
- [ ] `_generated/api.d.ts` existe
- [ ] `npm run build` pasa con zero errores

### Backend

- [ ] Convex backend corriendo (`npx convex dev`)
- [ ] World activo visible en dashboard
- [ ] Engine loop tickeando (ver logs de `convex/aiTown/game.ts`)

### Frontend - Dashboard (`/`)

- [ ] Dashboard carga sin crash
- [ ] Metric cards muestran valores
- [ ] Agent list renders
- [ ] Crisis banner visible

### Frontend - Game View (`/` cuando world activo)

- [ ] Canvas presente en DOM
- [ ] Background color `0x7ab5ff`
- [ ] Map tiles renderizan
- [ ] Player sprites visibles
- [ ] Click en mapa envía `moveTo`
- [ ] Pan/zoom funcionan (mouse wheel + drag)
- [ ] Zero console errors

### GameView POC (canvas standalone)

- [ ] `GameView.tsx` renderiza en la página
- [ ] `GameEngine` inicializa sin errores
- [ ] Agentes animados visibles
- [ ] Canvas limpio al hacer cleanup (destroy)

### Conexión Convex → Frontend

- [ ] `useServerGame` parsea estado correctamente
- [ ] `useSendInput` envía inputs correctamente
- [ ] Heartbeat mantiene world vivo
- [ ] No memory leaks en subscriptions

### Mobile

- [ ] Responsive en viewport 375px
- [ ] Touch pan funciona
- [ ] Tap-to-move funciona
- [ ] No scroll jank

### Deployment

- [ ] Build pasa en Vercel/Fly.io
- [ ] Environment variables configuradas (`VITE_SHOW_DEBUG_UI`)
- [ ] Assets cargan correctamente

---

## Variables de Entorno

| Variable | Default | Uso |
|---|---|---|
| `VITE_SHOW_DEBUG_UI` | `false` | Muestra debug path y time controls |
| `CONVEX_DEPLOYMENT` | auto | Deployment de Convex |
| `VITE_CONVEX_URL` | auto | URL del backend Convex |

---

## Files relevantes para debug

```
tmp-ai-town/
├── src/components/Game.tsx         ← orchestrator principal
├── src/components/PixiGame.tsx      ← renderer PixiJS
├── src/hooks/serverGame.ts          ← fetch game state
├── convex/aiTown/game.ts            ← engine principal
├── convex/aiTown/world.ts           ← world state
└── docs/GAME_VIEW_CHECKLIST.md      ← testing checklist
```