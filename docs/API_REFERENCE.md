# API Reference — AI Town

> Referencia completa de todas las clases, métodos, eventos y configuración.

---

## Tabla de Contenidos

1. [Clases del Backend](#1-clases-del-backend)
   - [Game](#game)
   - [World](#world)
   - [Player](#player)
   - [Agent](#agent)
   - [Conversation](#conversation)
   - [WorldMap](#worldmap)
   - [Location](#location)
   - [AbstractGame](#abstractgame)
   - [HistoricalObject](#historicalobject)
2. [Inputs del Juego](#2-inputs-del-juego)
3. [Hooks del Frontend](#3-hooks-del-frontend)
4. [Tablas de la Base de Datos](#4-tablas-de-la-base-de-datos)
5. [Eventos del Juego](#5-eventos-del-juego)
6. [Configuración](#6-configuración)

---

## 1. Clases del Backend

### Game

**Archivo:** `convex/aiTown/game.ts`

La clase principal que maneja toda la lógica del juego AI Town.

```typescript
export class Game extends AbstractGame {
  tickDuration = 16;           // ms por tick (60 fps)
  stepDuration = 1000;        // ms por step
  maxTicksPerStep = 600;      // máximo ticks por step
  maxInputsPerStep = 32;     // máximo inputs por step

  world: World;
  historicalLocations: Map<GameId<'players'>, HistoricalObject<Location>>;
  descriptionsModified: boolean;
  worldMap: WorldMap;
  playerDescriptions: Map<GameId<'players'>, PlayerDescription>;
  agentDescriptions: Map<GameId<'agents'>, AgentDescription>;
  pendingOperations: Array<{ name: string; args: any }>;
  numPathfinds: number;
}
```

#### Métodos Públicos

| Método | Descripción |
|--------|-------------|
| `constructor(engine, worldId, state)` | Crea una instancia del juego cargando el estado |
| `static async load(db, worldId, generationNumber)` | Carga el estado del juego desde la DB |
| `allocId<T extends IdTypes>(idType: T)` | Genera un nuevo GameId único |
| `scheduleOperation(name: string, args: any)` | Agenda una operación asíncrona para después del step |
| `handleInput(now: number, name: Name, args: InputArgs<Name>)` | Procesa un input del juego |
| `beginStep(now: number)` | Inicializa el paso (crea HistoricalObjects) |
| `tick(now: number)` | Avanza la simulación un tick |
| `async saveStep(ctx, engineUpdate)` | Persiste el estado al final del step |
| `takeDiff(): GameStateDiff` | Calcula el diff del estado desde el último step |

#### Uso

```typescript
// Cargar estado
const { engine, gameState } = await Game.load(ctx.db, worldId, generationNumber);
const game = new Game(engine, worldId, gameState);

// Loop principal
game.beginStep(now);
while (numTicks < maxTicksPerStep) {
  game.tick(currentTs);
  currentTs += tickDuration;
}
await game.saveStep(ctx, engineUpdate);
```

---

### World

**Archivo:** `convex/aiTown/world.ts`

Contiene todos los objetos del mundo (players, agents, conversations).

```typescript
export class World {
  nextId: number;
  conversations: Map<GameId<'conversations'>, Conversation>;
  players: Map<GameId<'players'>, Player>;
  agents: Map<GameId<'agents'>, Agent>;
  historicalLocations?: Map<GameId<'players'>, ArrayBuffer>;
}
```

#### Métodos Públicos

| Método | Descripción |
|--------|-------------|
| `constructor(serialized: SerializedWorld)` | Parsea el estado serializado |
| `playerConversation(player: Player)` | Retorna la conversación activa del player o undefined |
| `serialize(): SerializedWorld` | Serializa el estado a objeto |

---

### Player

**Archivo:** `convex/aiTown/player.ts`

Representa un jugador/entidad en el mundo.

```typescript
export class Player {
  id: GameId<'players'>;
  descriptionId: GameId<'playerDescriptions'>;
  worldId: GameId<'worlds'>;
  location: Location;
  pathfinding: Pathfinding | null;
  conversationMembership: ConversationMembership | null;
  facing: number;  // radians
  speed: number;
  created: number;
}
```

#### Métodos Públicos

| Método | Descripción |
|--------|-------------|
| `constructor(worldId, id, ...)` | Crea un player |
| `tick(game: Game, now: number)` | Tick principal del player |
| `tickPathfinding(game: Game, now: number)` | Actualiza pathfinding y navegación |
| `tickPosition(game: Game, now: number)` | Actualiza posición basado en pathfinding |
| `serialize(): SerializedPlayer` | Serializa el player |

#### Propiedades del Player

```typescript
interface Location {
  x: number;      // Coordenada X
  y: number;      // Coordenada Y
}

interface Pathfinding {
  path: Array<{ x: number; y: number }>;
  currentIndex: number;
  destination: { x: number; y: number };
}

interface ConversationMembership {
  conversationId: GameId<'conversations'>;
  state: 'invited' | 'walkingOver' | 'participating';
}
```

---

### Agent

**Archivo:** `convex/aiTown/agent.ts`

Representa un agente autónomo controlado por IA.

```typescript
export class Agent {
  id: GameId<'agents'>;
  agentId: GameId<'agentDescriptions'>;
  worldId: GameId<'worlds'>;
  playerId: GameId<'players'>;
  status: 'idle' | 'thinking' | 'waitingForOperation';
  pendingOperation: string | null;
  lastConversationEnded: number | null;
  lastConversationNumMessages: number | null;
  created: number;
}
```

#### Métodos Públicos

| Método | Descripción |
|--------|-------------|
| `constructor(worldId, agentId, ...)` | Crea un agente |
| `tick(game: Game, now: number)` | Tick del agente (decide qué hacer) |
| `scheduleOperation(operation: string, args: any)` | Agenda una operación asíncrona |
| `serialize(): SerializedAgent` | Serializa el agente |

---

### Conversation

**Archivo:** `convex/aiTown/conversation.ts`

Maneja conversaciones entre jugadores.

```typescript
export class Conversation {
  id: GameId<'conversations'>;
  creator: GameId<'players'>;
  created: number;
  participants: Map<GameId<'players'>, ConversationMembership>;
  lastMessage: string | null;
  numMessages: number;
}
```

#### Estados de Participación

```typescript
type MembershipState = 'invited' | 'walkingOver' | 'participating';

// Transiciones:
// invited → walkingOver (cuando el player acepta ir a conversar)
// walkingOver → participating (cuando llega cerca del otro)
// participating → (se sale, conversación termina)
```

#### Métodos Públicos

| Método | Descripción |
|--------|-------------|
| `tick(game: Game, now: number)` | Procesa mensajes, detecta fin de conversación |
| `serialize(): SerializedConversation` | Serializa la conversación |

---

### WorldMap

**Archivo:** `convex/aiTown/worldMap.ts`

Define el mapa del mundo (tiles).

```typescript
export class WorldMap {
  width: number;      // Ancho en tiles
  height: number;    // Alto en tiles
  tiles: Uint8Array;  // Datos de tiles (tileId por posición)
}
```

#### Métodos

| Método | Descripción |
|--------|-------------|
| `constructor(serialized: SerializedWorldMap)` | Crea el mapa desde estado serializado |
| `tileAt(x: number, y: number): number` | Retorna el tile ID en (x, y) |
| `isWalkable(x: number, y: number): boolean` | Verifica si se puede caminar |
| `serialize(): SerializedWorldMap` | Serializa el mapa |

---

### Location

**Archivo:** `convex/aiTown/location.ts`

Estructuras de ubicación y movimiento.

```typescript
export interface Location {
  x: number;
  y: number;
}

export interface LocationWithFacing extends Location {
  facing: number;  // radians
}

export interface MovingEntity extends LocationWithFacing {
  speed: number;   // pixels per second
}
```

#### Funciones Helpers

```typescript
// Obtener player location desde un player
playerLocation(player: Player): LocationWithFacing

// Constantes
const TILE_SIZE = 32;  // pixels per tile
const MOVEMENT_SPEED = 80;  // pixels per second
```

---

### AbstractGame

**Archivo:** `convex/engine/abstractGame.ts`

Clase base del game engine. No instanciar directamente.

```typescript
export abstract class AbstractGame {
  abstract tickDuration: number;
  abstract stepDuration: number;
  abstract maxTicksPerStep: number;
  abstract maxInputsPerStep: number;

  constructor(public engine: Doc<'engines'>) {}

  abstract handleInput(now: number, name: string, args: object): Value;
  abstract tick(now: number): void;
  abstract saveStep(ctx: ActionCtx, engineUpdate: EngineUpdate): Promise<void>;

  beginStep(now: number) {}  // Optional
  async runStep(ctx: ActionCtx, now: number): Promise<void>
}
```

---

### HistoricalObject

**Archivo:** `convex/engine/historicalObject.ts`

Sistema de tracking histórico para movimiento suave.

```typescript
export class HistoricalObject<Fields extends Record<string, ValueType>> {
  constructor(
    public fields: Fields,           // Definición de campos a trackear
    initialValue: Record<string, any> // Valor inicial
  );

  update(timestamp: number, value: Record<string, any>): void;
  pack(): ArrayBuffer | null;         // Comprime a buffer
  static unpack<Fields>(
    buffer: ArrayBuffer,
    fields: Fields
  ): Array<{ timestamp: number; value: Fields }>;
}
```

#### Uso

```typescript
// Crear para trackear posición
const locationFields = {
  x: v.number(),
  y: v.number(),
  facing: v.number(),
};

const historicalLocation = new HistoricalObject(
  locationFields,
  { x: 100, y: 200, facing: 0 }
);

// Actualizar cada tick
historicalLocation.update(now, { x: 105, y: 202, facing: 0.1 });

// Al final del step, guardar
const buffer = historicalLocation.pack();
```

---

## 2. Inputs del Juego

**Archivo:** `convex/aiTown/inputs.ts`

Los inputs son acciones que los jugadores o agentes pueden enviar al juego.

```typescript
export const inputs = {
  ...playerInputs,
  ...conversationInputs,
  ...agentInputs,
};
```

### Inputs de Jugador (`playerInputs`)

```typescript
// Mover a un jugador a una ubicación
join: inputHandler('join', v.object({ playerId: playerId }), (game, now, args) => { ... });
moveTo: inputHandler('moveTo', v.object({ playerId, destination: locationFields }), ...);
```

### Inputs de Conversación (`conversationInputs`)

```typescript
startConversation: inputHandler('startConversation', v.object({ 
  playerId, 
  invitedPlayerId 
}), ...);

acceptInvite: inputHandler('acceptInvite', v.object({ playerId }), ...);
rejectInvite: inputHandler('rejectInvite', v.object({ playerId }), ...);
leaveConversation: inputHandler('leaveConversation', v.object({ playerId }), ...);
startTyping: inputHandler('startTyping', v.object({ playerId }), ...);
finishSendingMessage: inputHandler('finishSendingMessage', v.object({ 
  playerId, 
  message: v.string() 
}), ...);
```

### Inputs de Agente (`agentInputs`)

```typescript
//记忆 inputs
rememberConversation: inputHandler('rememberConversation', v.object({ ... }), ...);
```

### Cómo Enviar un Input

```typescript
// Desde el frontend
const { useSendInput } from './hooks/sendInput';

function MyComponent() {
  const sendInput = useSendInput();
  
  function handleMoveTo(x: number, y: number) {
    sendInput(engineId, 'moveTo', {
      playerId: 'abc123',
      destination: { x, y }
    });
  }
}
```

---

## 3. Hooks del Frontend

**Carpeta:** `src/hooks/`

### useServerGame

**Archivo:** `src/hooks/serverGame.ts`

Carga y parsea el estado del juego desde Convex.

```typescript
function useServerGame(worldId: Id<'worlds'>): ServerGame | null;

// Retorna:
interface ServerGame {
  world: World;            // Mundo actual
  playerDescriptions: Map<GameId<'players'>, PlayerDescription>;
  agentDescriptions: Map<GameId<'agents'>, AgentDescription>;
  worldMap: WorldMap;      // Mapa del mundo
  engine: Doc<'engines'>;  // Engine actual
}
```

### useSendInput

**Archivo:** `src/hooks/sendInput.ts`

Envía inputs al servidor y espera respuesta.

```typescript
function useSendInput(): <Name extends InputNames>(
  engineId: Id<'engines'>,
  name: Name,
  args: InputArgs<Name>
) => Promise<InputReturnValue<Name>>;
```

### useHistoricalTime

**Archivo:** `src/hooks/useHistoricalTime.ts`

Maneja el tiempo para el replay histórico.

```typescript
function useHistoricalTime(engine: Doc<'engines'>): {
  currentTime: number;    // Tiempo actual de replay
  setTime: (t: number) => void;
  isReplaying: boolean;
};
```

### useHistoricalValue

**Archivo:** `src/hooks/useHistoricalValue.ts`

Obtiene valores históricos para replay suave.

```typescript
function useHistoricalValue<Fields>(
  fields: Fields,
  historicalTime: number,
  currentValue: Record<string, any>,
  historicalBuffer?: ArrayBuffer
): Record<string, any>;
```

### useWorldHeartbeat

**Archivo:** `src/hooks/useWorldHeartbeat.ts`

Mantiene el mundo vivo con heartbeats.

```typescript
function useWorldHeartbeat(worldId: Id<'worlds'>): void;
```

---

## 4. Tablas de la Base de Datos

### Tablas del Engine (`convex/engine/schema.ts`)

```typescript
engines: defineTable({
  currentTime: v.number(),
  lastStepTs: v.number(),
  generationNumber: v.number(),
  running: v.boolean(),
  processedInputNumber: v.number(),
});

inputs: defineTable({
  engineId: v.id('engines'),
  number: v.number(),
  name: v.string(),
  args: v.any(),
  received: v.number(),
  returnValue: v.optional(v.any()),
}).index('byInputNumber', ['engineId', 'number']);
```

### Tablas de AI Town (`convex/aiTown/schema.ts`)

```typescript
worlds: defineTable({
  // serializedWorld: players, conversations, agents, historicalLocations
});

worldStatus: defineTable({
  worldId: v.id('worlds'),
  isDefault: v.boolean(),
  engineId: v.id('engines'),
  lastViewed: v.number(),
  status: v.union(v.literal('running'), v.literal('stoppedByDeveloper'), v.literal('inactive')),
}).index('worldId', ['worldId']);

maps: defineTable({
  worldId: v.id('worlds'),
  // serializedWorldMap: width, height, tiles
}).index('worldId', ['worldId']);

playerDescriptions: defineTable({
  worldId: v.id('worlds'),
  playerId: v.id('players'),
  name: v.string(),
  description: v.string(),
  avatar: v.string(),
});

archivedPlayers: defineTable({ ... });
archivedConversations: defineTable({ ... });
archivedAgents: defineTable({ ... });

participatedTogether: defineTable({
  worldId: v.id('worlds'),
  conversationId: conversationId,
  player1: playerId,
  player2: playerId,
  ended: v.number(),
});
```

### Tablas de Agente (`convex/agent/schema.ts`)

```typescript
memories: defineTable({
  worldId: v.id('worlds'),
  playerId: playerId,
  created: v.number(),
  embeddingId: v.id('embeddings'),
  summary: v.string(),
});

embeddings: defineTable({
  // Cache de embeddings
  textHash: v.string(),
  embedding: v.array(v.float64()),
});

conversationsMemory: defineTable({
  // Resúmenes de conversaciones pasadas
});
```

---

## 5. Eventos del Juego

### Ciclo de Vida del Engine

```
engine creado
    │
    ▼
engine.running = true
    │
    ▼
runStep() entra en loop ────────────────────► (mientras running)
    │
    ▼
step completa
    │
    ▼
schedule next runStep()
    │
    ▼
stopEngine() → engine.running = false
```

### Estados del Engine

```typescript
type EngineStatus = {
  running: boolean;
  currentTime: number;       // Tiempo actual de simulación (ms)
  generationNumber: number;   // Para cancelar runs
  processedInputNumber: number;
};
```

### Estados de WorldStatus

```typescript
type WorldStatusStatus = 'running' | 'stoppedByDeveloper' | 'inactive';
```

### Estados de Agente

```typescript
type AgentStatus = 'idle' | 'thinking' | 'waitingForOperation';
```

### Estados de Conversación

```typescript
type MembershipState = 'invited' | 'walkingOver' | 'participating';
```

---

## 6. Configuración

### Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Host de Ollama |
| `OLLAMA_MODEL` | `llama3` | Modelo de chat |
| `OLLAMA_EMBEDDING_MODEL` | `mxbai-embed-large` | Modelo de embeddings |
| `OLLAMA_EMBEDDING_DIMENSION` | `1024` | Dimensión de embeddings |
| `NUM_MEMORIES_TO_SEARCH` | `3` | Memories a buscar por conversación |
| `OPENAI_API_KEY` | — | API key para OpenAI (alternativa a Ollama) |
| `TOGETHER_API_KEY` | — | API key para Together.ai |
| `REPLICATE_API_KEY` | — | API key para Replicate (music generation) |
| `VITE_SHOW_DEBUG_UI` | `false` | Mostrar UI de debug |

### Constantes del Juego

**Archivo:** `convex/constants.ts`

```typescript
export const TICK_DURATION = 16;                    // ms por tick
export const STEP_DURATION = 1000;                 // ms por step
export const MAX_TICKS_PER_STEP = 600;             // 60 ticks/sec × 10 sec
export const MAX_INPUTS_PER_STEP = 32;             // máx inputs por step
export const ENGINE_ACTION_DURATION = 50;          // ms que corre el action
export const NUM_MEMORIES_TO_SEARCH = 3;           // memories a incluir
export const MOVEMENT_SPEED = 80;                   // pixels/second
export const PLAYER_RADIUS = 12;                    // pixels
export const CONVERSATION_RADIUS = 3;              // tiles para unirse
```

### Configuración del Juego (`Game`)

```typescript
// En convex/aiTown/game.ts
tickDuration = 16;           // Override para ticks más suaves
stepDuration = 1000;        // Override para steps más frecuentes
maxTicksPerStep = 600;      // Máximo ticks por step
maxInputsPerStep = 32;      // Máximo inputs por step
```

---

## Ejemplos de Uso

### Enviar un Input de Movimiento

```typescript
import { useSendInput } from './hooks/sendInput';

const sendInput = useSendInput();

// Mover jugador a posición (10, 15)
await sendInput(engineId, 'moveTo', {
  playerId: 'abc123',
  destination: { x: 10, y: 15 }
});
```

### Crear una Conversación

```typescript
await sendInput(engineId, 'startConversation', {
  playerId: 'player1',
  invitedPlayerId: 'player2'
});
```

### Leer Estado del Juego

```typescript
import { useServerGame } from './hooks/serverGame';

const game = useServerGame(worldId);

if (game) {
  const players = [...game.world.players.values()];
  const myPlayer = players.find(p => p.id === myPlayerId);
  
  console.log('Mi posición:', myPlayer.location);
  console.log('Mapa:', game.worldMap.width, 'x', game.worldMap.height);
}
```

### Usar HistoricalObject para Posición Suave

```typescript
import { useHistoricalTime } from './hooks/useHistoricalTime';
import { useHistoricalValue } from './hooks/useHistoricalValue';
import { locationFields } from '../convex/aiTown/location';

function PlayerSprite({ player }) {
  const { currentTime } = useHistoricalTime(engine);
  
  const location = useHistoricalValue(
    locationFields,
    currentTime,
    playerLocation(player),
    player.historicalBuffer
  );
  
  return (
    <Sprite 
      x={location.x * TILE_SIZE} 
      y={location.y * TILE_SIZE} 
    />
  );
}
```

### Agendar Operación de Agente

```typescript
// En el agent tick:
if (shouldStartConversation) {
  game.scheduleOperation('startConversation', {
    playerId: agent.playerId,
    invitedPlayerId: targetPlayer.id,
  });
}
```

---

## Tipos Principales

```typescript
// GameId: ID tipado para cada entidad
type GameId<T extends IdTypes> = string & { __gameId: T };

// IdTypes posibles:
type IdTypes = 'players' | 'agents' | 'conversations' | 'worlds';

// Location
interface Location { x: number; y: number; }

// SerializedWorld (lo que se guarda en DB)
interface SerializedWorld {
  nextId: number;
  conversations: SerializedConversation[];
  players: SerializedPlayer[];
  agents: SerializedAgent[];
  historicalLocations?: Array<{ playerId: GameId<'players'>; location: ArrayBuffer }>;
}
```
