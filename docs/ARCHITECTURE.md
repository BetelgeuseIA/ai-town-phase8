# Architecture — AI Town

> Guía técnica de arquitectura para desarrolladores que quieren entender, modificar o extender AI Town.

---

## 1. Diagrama de Arquitectura General

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                              │
│                                                                          │
│   ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────┐  │
│   │   App.tsx    │───►│    Game.tsx      │───►│   PixiGame.tsx      │  │
│   └──────────────┘    └──────────────────┘    │  (PixiJS Renderer)  │  │
│                                                  └──────────────────────┘  │
│                                │                         │                │
│                          ┌─────▼──────┐           ┌──────▼───────┐        │
│                          │useServerGame│           │useSendInput │        │
│                          │ (hooks/)   │           │ (hooks/)    │        │
│                          └─────┬──────┘           └──────┬───────┘        │
└────────────────────────────────┼────────────────────────┼────────────────┘
                                 │                         │
                    ┌────────────▼────────────┐ ┌────────▼────────────┐
                    │      Convex Queries     │ │   Convex Mutations  │
                    └────────────┬────────────┘ └────────┬────────────┘
                                 │                         │
┌────────────────────────────────┼────────────────────────┼────────────────┐
│                          SERVER (Convex)                │                │
│                                                              │             │
│   ┌───────────────────────────▼────────────────────────────────────────▼─┤
│   │                      Convex Database                               │   │
│   │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  ┌──────────┐ │   │
│   │  │  worlds     │  │  worldStatus │  │  playerDesc..  │  │   maps   │ │   │
│   │  │  (state)    │  │  (engine)    │  │                │  │          │ │   │
│   │  └─────────────┘  └──────────────┘  └────────────────┘  └──────────┘ │   │
│   │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  ┌──────────┐ │   │
│   │  │   agents    │  │   inputs     │  │ agentDesc...    │  │ messages │ │   │
│   │  │             │  │             │  │                │  │          │ │   │
│   │  └─────────────┘  └──────────────┘  └────────────────┘  └──────────┘ │   │
│   └───────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│   ┌────────────────────────────────┼─────────────────────────────────────▼─┤
│   │                    Game Loop (runStep)                                │   │
│   │                                                                          │   │
│   │  ┌────────────────────────────────────────────────────────────────────┐    │   │
│   │  │ convex/aiTown/main.ts:runStep                                   │    │   │
│   │  │   ├── loadWorld (Game.load)                                      │    │   │
│   │  │   ├── game.runStep() → tick × N                                 │    │   │
│   │  │   │     ├── Player.tick()                                        │    │   │
│   │  │  │     ├── Player.tickPathfinding()                              │    │   │
│   │  │   │     ├── Player.tickPosition()                                │    │   │
│   │  │   │     ├── Conversation.tick()                                  │    │   │
│   │  │   │     └── Agent.tick()                                         │    │   │
│   │  │   └── saveWorld (Game.saveDiff)                                   │    │   │
│   │  └────────────────────────────────────────────────────────────────────┘    │   │
│   │                                                                          │   │
│   │  ┌────────────────────────────────┐  ┌────────────────────────────────────┐   │   │
│   │  │ convex/aiTown/game.ts:Game    │  │ convex/engine/abstractGame.ts     │   │   │
│   │  │ (AI Town game logic)          │  │ (Base engine class)               │   │   │
│   │  └────────────────────────────────┘  └────────────────────────────────────┘   │   │
│   │                                                                          │   │
│   │  ┌────────────────────────────────────────────────────────────────────────┐       │   │
│   │  │                      convex/agent/ (LLM Integration)                │       │   │
│   │  │   conversations.ts  memory.ts  embeddingsCache.ts                  │       │   │
│   │  └────────────────────────────────────────────────────────────────────────┘       │   │
│   └───────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cómo se Conectan Todos los Sistemas

### Capas del Sistema

AI Town se divide en **4 capas principales**:

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| **Game Logic** | `convex/aiTown/` | Estado del juego, reglas, agentes |
| **Game Engine** | `convex/engine/` | Loop de simulación, persistence |
| **Agent Layer** | `convex/agent/` | Integración LLM, memoria, conversaciones |
| **Client UI** | `src/` | Renderizado PixiJS, interacción usuario |

### Flujo de Datos

```
User Click
    │
    ▼
useSendInput(engineId, 'moveTo', { x, y })
    │
    ▼
convex.mutation(api.world.sendInput)
    │
    ▼
insertInput() → inputs table
    │
    ▼
runStep() loop:
    │
    ├── loadInputs() ← inputs table
    │
    ├── handleInput('moveTo', {...})
    │     │
    │     ▼
    │     Player.handleMoveTo()
    │
    ├── tick() × 60 veces/segundo
    │     │
    │     ├── Player.tickPathfinding() — recalcula path
    │     ├── Player.tickPosition()    — avanza posición
    │     ├── Conversation.tick()       — manejachat
    │     └── Agent.tick()             — decide acciones
    │
    └── saveWorld() → database
              │
              ▼
         Frontend receives
         updated world state
```

---

## 3. Flujo de Datos

### Estado del Mundo

```
┌─────────────────────────────────────────────────┐
│                   worlds table                  │
│  (serializedWorld: players, conversations,      │
│   agents, historicalLocations)                 │
├─────────────────────────────────────────────────┤
│  players: Array<SerializedPlayer>               │
│    └── id, name, description, location,         │
│        pathfinding, facing, ...                 │
│                                                 │
│  conversations: Array<SerializedConversation>   │
│    └── id, participants, created, lastMessage  │
│                                                 │
│  agents: Array<SerializedAgent>                 │
│    └── id, agentId, status, pendingOperation    │
└─────────────────────────────────────────────────┘
```

### Tablas Separadas (fuera del engine)

| Tabla | Ubicación | Propósito |
|-------|-----------|-----------|
| `messages` | `convex/schema.ts` | Chat messages (alta frecuencia, no van por engine) |
| `playerDescriptions` | `convex/aiTown/schema.ts` | Nombres, descripciones, avatares |
| `agentDescriptions` | `convex/aiTown/schema.ts` | Info de agentes |
| `maps` | `convex/aiTown/schema.ts` | Tile map del mundo |
| `participatedTogether` | `convex/aiTown/schema.ts` | Grafo de relaciones |

### Sistema de Historial (para replay suave)

```
Cada step (1 segundo):
  │
  ▼
beginStep(now)
  │
  ├── Crea HistoricalObject para cada player
  │     con locationFields
  │
  ▼
tick() × 60 veces
  │
  ├── Al final de cada tick:
  │     historicalObject.update(now, playerLocation)
  │
  ▼
saveWorld()
  │
  ├── Pack buffers → historicalLocations[]
  │     (pack() compression)
  │
  └── saveDiff() → database
        │
        ▼
   Frontend recibe:
     - world.state (posiciones actuales)
     - historicalLocations[] (historial del último segundo)
```

El frontend usa `useHistoricalValue()` para "replay"ear el historial y hacer el movimiento suave.

---

## 4. Decisiones Técnicas Clave

### a) Convex como Backend

**Por qué:** AI Town usa Convex para database + engine + vector search en un solo lugar. Permite:
- Estado compartido en tiempo real (subscriptions)
- Transacciones ACID
- Game engine integrado
- Vector search para memorias

**Trade-off:** Todo se carga en memoria cada step. No es bueno para juegos con miles de objetos.

### b) Game Engine Batched

```
Problema: 60 ticks/segundo × data writes = MUY CARO

Solución: Steps (1 por segundo)
  │
  ├── 1 step = 60 ticks en memoria
  │
  └── 1 write por segundo al DB
        │
        + historical buffers para smoothness
```

### c) Inputs como Cola

```
Problema: Concurrencia entre jugadores

Solución: Cola de inputs en tabla `inputs`
  │
  ├── Cada input tiene número único monotonico
  │
  ├── engine.processedInputNumber = última procesada
  │
  └── Solo el engine modifica estado del juego
        (otros escriben via inputs)
```

### d) Generación Number para Cancelación

```
Problema: Race condition al cancelar engine

Solución: generationNumber en engine
  │
  ├── bump generationNumber → cancela runs pendientes
  │
  └── run actual verifica que coincide
        (si no coincide, falla rápido)
```

### e) Mensajes Fuera del Engine

```
engine no conoce messages

Porque:
  - messages cambian muy seguido (streaming)
  - latency sensible
  - engine mantiene estado pequeño
```

---

## 5. Patrones Utilizados

### 5.1 Input Handler Pattern

```typescript
// convex/aiTown/inputs.ts
export const inputs = {
  ...playerInputs,
  ...conversationInputs,
  ...agentInputs,
};

// convex/aiTown/inputHandler.ts
export function inputHandler<Args extends ValueType>(
  name: string,
  argsValidator: Validator<Args>,
  handler: (game: Game, now: number, args: Args) => Value,
): InputDefinition {
  return { name, args: argsValidator, handler };
}

// Uso:
moveTo: inputHandler(
  'moveTo',
  v.object({ playerId, destination: locationFields }),
  (game, now, args) => { ... }
)
```

### 5.2 Historical Object Pattern

```typescript
// Para tracking suave de posición
const locationFields = {
  x: v.number(),
  y: v.number(),
  facing: v.number(),
  speed: v.number(),
};

const historicalObject = new HistoricalObject(locationFields, currentLocation);
historicalObject.update(now, newLocation);
const buffer = historicalObject.pack(); // → ArrayBuffer para storage
```

### 5.3 Agent Operation Pattern

```typescript
// Agent decide que necesita LLM
game.scheduleOperation('decideWhatToDo', { agentId });

// En saveDiff:
for (const operation of diff.agentOperations) {
  await runAgentOperation(ctx, operation.name, operation.args);
}

// En agent/conversations.ts, etc:
export async function runAgentOperation(ctx: ActionCtx, name: string, args: any) {
  switch (name) {
    case 'decideWhatToDo':
      // llama LLM, crea conversación, etc
    case 'continueConversation':
      // continua chat
  }
}
```

### 5.4 World State Classes

```typescript
// Clases que cargan/serializan estado
class World {
  players: Map<GameId<'players'>, Player>
  conversations: Map<GameId<'conversations'>, Conversation>
  agents: Map<GameId<'agents'>, Agent>
  
  constructor(serialized: SerializedWorld) { ... }
  serialize(): SerializedWorld { ... }
}

class Player {
  id: GameId<'players'>
  location: Location
  pathfinding: Pathfinding | null
  
  tick(game: Game, now: number) { ... }
  tickPathfinding(game: Game, now: number) { ... }
  tickPosition(game: Game, now: number) { ... }
}
```

### 5.5 Description Tables Pattern

```typescript
// Información "grande" fuera del world state
// Se actualizan independientemente

// playerDescriptions: nombre, avatar, bio
// agentDescriptions: system prompt, personality
// maps: tile data

// En game.takeDiff():
if (this.descriptionsModified) {
  result.playerDescriptions = serializeMap(this.playerDescriptions)
  result.agentDescriptions = serializeMap(this.agentDescriptions)
  result.worldMap = this.worldMap.serialize()
}
```

---

## 6. Estructura de Archivos

```
tmp-ai-town/
├── convex/
│   ├── _generated/           # Generado por Convex
│   │   ├── api.ts            # Queries/mutations runtime
│   │   ├── dataModel.ts      # Tipos de tablas
│   │   └── server.ts         # Contextos (QueryCtx, MutationCtx, etc)
│   │
│   ├── aiTown/
│   │   ├── game.ts           # Clase Game (AI Town logic)
│   │   ├── world.ts          # Clase World
│   │   ├── player.ts         # Clase Player
│   │   ├── agent.ts          # Clase Agent
│   │   ├── conversation.ts   # Clase Conversation
│   │   ├── location.ts       # Structs de ubicación
│   │   ├── worldMap.ts       # Clase WorldMap
│   │   ├── inputs.ts         # Definición de inputs
│   │   ├── insertInput.ts    # Función para insertar input
│   │   ├── main.ts           # runStep, sendInput, startEngine
│   │   ├── schema.ts         # Tablas AI Town
│   │   ├── ids.ts            # GameId<T> type utilities
│   │   └── *.ts              # Otros modelos/utilities
│   │
│   ├── engine/
│   │   ├── abstractGame.ts   # Clase AbstractGame (base)
│   │   ├── historicalObject.ts # Sistema de replay
│   │   └── schema.ts         # Tablas del engine
│   │
│   ├── agent/
│   │   ├── conversation.ts   # LLM conversation logic
│   │   ├── memory.ts         # Vector memory
│   │   ├── embeddingsCache.ts # Cache de embeddings
│   │   └── schema.ts        # Tablas de agente
│   │
│   ├── util/
│   │   └── llm.ts           # Cliente OpenAI/Ollama
│   │
│   ├── schema.ts            # Schema principal (tablas合并)
│   ├── init.ts              # Bootstrap del mundo
│   ├── constants.ts         # Constantes (NUM_MEMORIES_TO_SEARCH, etc)
│   └── crons.ts            # Jobs programmables
│
├── src/
│   ├── components/
│   │   ├── Game.tsx         # Orchestrator principal
│   │   ├── PixiGame.tsx     # PixiJS renderer
│   │   ├── PixiViewport.tsx  # Viewport con pan/zoom
│   │   ├── PixiStaticMap.tsx # Tile layer
│   │   ├── Player.tsx       # Sprite de jugador
│   │   ├── Character.tsx    # Visual del personaje
│   │   ├── PlayerDetails.tsx # Panel de stats
│   │   ├── DebugPath.tsx    # Debug path line
│   │   └── *.tsx            # Otros componentes
│   │
│   ├── hooks/
│   │   ├── serverGame.ts    # useServerGame(worldId)
│   │   ├── sendInput.ts     # useSendInput()
│   │   ├── useWorldHeartbeat.ts # Keep-alive
│   │   └── useHistoricalTime.ts # Replay time
│   │
│   ├── game/
│   │   ├── GameView.tsx     # POC standalone canvas
│   │   └── GameEngine.ts    # PixiJS app básico
│   │
│   └── styles/
│
├── docs/
│   ├── ARCHITECTURE.md       # Este archivo
│   ├── API_REFERENCE.md      # Referencia de API
│   └── GETTING_STARTED.md   # Guía para empezar
│
├── data/
│   └── characters.ts        # Definiciones de personajes
│
└── package.json
```

---

## 7. Game Loop Detallado

```
┌─────────────────────────────────────────────────────────────────┐
│                     runStep (Action)                            │
│  Se ejecuta cada ENGINE_ACTION_DURATION (~50ms)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Load State                                                  │
│     ctx.runQuery(loadWorld, { worldId, generationNumber })    │
│     → new Game(engine, worldId, gameState)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Loop de ticks (hasta maxDuration)                          │
│                                                                 │
│     while (now < deadline) {                                   │
│       await game.runStep(ctx, now)  ← tick × 60 + inputs       │
│       await sleep(stepDuration - elapsed)                      │
│       now = Date.now()                                          │
│     }                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Schedule Next Step                                          │
│     ctx.scheduler.runAfter(0, runStep, { worldId, genNum })    │
└─────────────────────────────────────────────────────────────────┘

Dentro de game.runStep():
  
  1. beginStep(now)
     → Crea HistoricalObject para cada player
  
  2. Loop de ticks (maxTicksPerStep = 600)
     → Para cada tick:
       ├── Lee inputs pendientes (loadInputs)
       ├── handleInput() para cada uno
       ├── tick() → actualiza todo
  
  3. saveStep()
     → takeDiff() → pack historical buffers
     → ctx.runMutation(saveWorld, { worldDiff })
```

---

## 8. Extender el Proyecto

### Agregar Nuevo Input

```typescript
// convex/aiTown/inputs.ts
import { myNewInput } from './myNewInput';

export const inputs = {
  ...playerInputs,
  ...conversationInputs,
  ...agentInputs,
  ...myNewInput,  // ← agregar aquí
};

// convex/aiTown/myNewInput.ts
import { inputHandler } from './inputHandler';
import { v } from 'convex/values';

export const myNewInput = {
  myAction: inputHandler(
    'myAction',
    v.object({ playerId, someData: v.number() }),
    (game, now, args) => {
      const player = game.world.players.get(args.playerId);
      if (!player) throw new Error("Player not found");
      // hacer algo...
      return { success: true };
    }
  ),
};
```

### Agregar Nuevo Sistema (tick)

```typescript
// En convex/aiTown/game.ts, método tick():
tick(now: number) {
  // ... sistemas existentes ...
  
  // Agregar nuevo sistema:
  this.tickNewSystem(now);
}

// Agregar nuevo método:
tickNewSystem(now: number) {
  for (const settlement of this.world.settlements.values()) {
    settlement.tick(this, now);
  }
}
```

### Agregar Nuevo Tipo de Agente

```typescript
// convex/aiTown/agent.ts
export class Agent {
  // ... existente ...
  
  // Nuevo tipo de decisión:
  async tickNewBehavior(game: Game, now: number) {
    if (this.status === 'idle' && Math.random() < 0.01) {
      this.scheduleOperation('newBehavior', { agentId: this.id });
    }
  }
}
```
