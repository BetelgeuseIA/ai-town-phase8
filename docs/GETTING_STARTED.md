# Getting Started — AI Town

> Guía para desarrolladores que quieren poner a correr AI Town y crear su propio mundo.

---

## Tabla de Contenidos

1. [Instalación](#1-instalación)
2. [Primeros Pasos](#2-primeros-pasos)
3. [Crear un Mundo Nuevo](#3-crear-un-mundo-nuevo)
4. [Conceptos Básicos del Juego](#4-conceptos-básicos-del-juego)
5. [Troubleshooting Común](#5-troubleshooting-común)

---

## 1. Instalación

### Requisitos Previos

- **Node.js** 18+ 
- **npm** o **yarn**
- **Cuenta de Convex** (gratis en [convex.dev](https://convex.dev))
- **Ollama** (para inferencia local) o API key de OpenAI/Together.ai

### Instalación Estándar (Cloud)

```bash
# 1. Clonar el repositorio
git clone https://github.com/a16z-infra/ai-town.git
cd ai-town

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tu API key o configurar Ollama

# 4. Inicializar Convex
npx convex dev

# 5. Correr el proyecto
npm run dev
```

Visita http://localhost:5173

### Instalación con Ollama (Local)

```bash
# 1. Instalar Ollama
# https://ollama.com/download

# 2. Descargar modelo
ollama pull llama3

# 3. Asegurarse que Ollama está corriendo
ollama serve

# 4. Correr AI Town
npm run dev
```

### Instalación con Docker

```bash
# 1. Copiar archivo de entorno
cp .env.example .env.local

# 2. Editar .env.local:
# CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
# CONVEX_SELF_HOSTED_ADMIN_KEY="(generar después)"

# 3. Generar admin key
docker compose exec backend ./generate_admin_key.sh

# 4. Agregar la key生成的 key a .env.local

# 5. Correr todo
docker compose up --build -d

# 6. Inicializar backend
npm run predev

# 7. Abrir http://localhost:5173
```

---

## 2. Primeros Pasos

### Estructura del Proyecto

```
tmp-ai-town/
├── convex/              # Backend (Convex functions)
│   ├── aiTown/          # Lógica del juego
│   ├── agent/           # Integración LLM
│   ├── engine/          # Game engine base
│   └── util/            # Helpers (LLM, etc)
│
├── src/                 # Frontend (React + PixiJS)
│   ├── components/       # Componentes React
│   ├── hooks/           # Custom hooks
│   └── game/            # GameView POC
│
├── data/                # Assets (characters, tiles)
├── docs/                # Documentación
└── public/              # Archivos estáticos
```

### Iniciar el Servidor de Desarrollo

```bash
# Backend + Frontend juntos
npm run dev

# O separados:
npm run dev:backend   # Convex (con logs)
npm run dev:frontend # Vite (hot reload)
```

### Ver el Dashboard de Convex

```bash
npm run dashboard
# Abre http://localhost:6791
```

Desde el dashboard puedes:
- Ver el estado de worlds activos
- Monitorear queries y mutations
- Ver logs del engine
- Inspect database tables

### Conectar un LLM

#### Opción A: Ollama (Local)

```bash
# Variables de entorno (en .env.local)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large
OLLAMA_EMBEDDING_DIMENSION=1024
```

#### Opción B: OpenAI

```bash
npx convex env set OPENAI_API_KEY=sk-...
```

#### Opción C: Together.ai

```bash
npx convex env set TOGETHER_API_KEY=...
```

### Verificar que Funciona

1. Abre http://localhost:5173
2. Deberías ver el mapa con personajes
3. Los agentes deberían empezar a caminar y conversar
4. Revisa la consola del navegador — sin errores
5. Revisa `npm run dev:backend` — sin errores rojos

---

## 3. Crear un Mundo Nuevo

### Paso 1: Editar el Archivo de Inicialización

**Archivo:** `convex/init.ts`

```typescript
// Agregar más jugadores
const players = [
  {
    playerId: 'player1',
    name: 'Alice',
    description: 'A curious explorer who loves nature.',
    avatar: 'https://...',
    location: { x: 5, y: 5 },
  },
  {
    playerId: 'player2', 
    name: 'Bob',
    description: 'A friendly merchant from the capital.',
    avatar: 'https://...',
    location: { x: 10, y: 10 },
  },
  // Agregar más...
];
```

### Paso 2: Personalizar Personajes

**Archivo:** `data/characters.ts`

```typescript
export const characters = [
  {
    name: 'Alice',
    textureUrl: '/characters/alice.png',
    spritesheetData: {
      frameWidth: 32,
      frameHeight: 32,
      animations: {
        idle: [[0, 0]],
        walk: [[0, 0], [1, 0], [2, 0], [3, 0]],
      },
    },
  },
  // Agregar más personajes...
];
```

### Paso 3: Crear un Mapa Personalizado

**Archivo:** `convex/aiTown/worldMap.ts`

```typescript
// Generar un mapa procedural
export function generateMap(width: number, height: number): WorldMap {
  const tiles = new Uint8Array(width * height);
  
  // Llenar con grass
  tiles.fill(TILE_GRASS);
  
  // Agregar algunos trees
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    tiles[y * width + x] = TILE_TREE;
  }
  
  return new WorldMap({ width, height, tiles });
}
```

### Paso 4: Configurar Agentes

**Archivo:** `convex/aiTown/agent.ts` o `convex/agent/conversations.ts`

```typescript
// Personalizar el prompt del agente
const SYSTEM_PROMPT = `Eres Alice, una exploradora curiosa.
Te gusta la naturaleza y siempre estás buscando nuevos lugares.
Eres amigable pero un poco timida al principio.`;
```

### Paso 5: Reiniciar el Mundo

```bash
# En el dashboard de Convex:
# 1. Ve a "worldStatus"
# 2. Encuentra tu world
# 3. Click en "Stop"
# 4. Ve a "init.ts" y haz un cambio menor (para forzar redeploy)
# 5. O corre: npx convex run init --until-success
```

---

## 4. Conceptos Básicos del Juego

### 4.1 Worlds (Mundos)

Un **World** es un mapa donde múltiples jugadores interactúan.

```typescript
// El estado del mundo se guarda en una sola tabla
worlds: {
  nextId: number,
  players: SerializedPlayer[],
  conversations: SerializedConversation[],
  agents: SerializedAgent[],
  historicalLocations: ArrayBuffer[]
}
```

### 4.2 Players vs Agents

| Concepto | Descripción |
|----------|-------------|
| **Player** | Cualquier entidad en el mundo (humano o AI) |
| **Agent** | Player controlado por IA (LLM) |
| **Human** | Player controlado por un humano real |

### 4.3 El Game Loop

```
1. User/Agent envía input (moveTo, startConversation, etc)
       ↓
2. Input se inserta en tabla `inputs`
       ↓
3. Engine corre cada ~50ms:
   a. Carga inputs pendientes
   b. Procesa cada input (handleInput)
   c. Hace tick() × 60 (60 fps de simulación)
   d. Guarda estado (saveWorld)
       ↓
4. Frontend recibe actualización via useQuery
       ↓
5. PixiJS re-renderiza
```

### 4.4 Inputs (Acciones)

Los jugadores envían **inputs** para interactuar:

```typescript
// Tipos de inputs disponibles:
inputs = {
  // Movimiento
  moveTo: { playerId, destination: {x, y} },
  
  // Conversación
  startConversation: { playerId, invitedPlayerId },
  acceptInvite: { playerId },
  rejectInvite: { playerId },
  leaveConversation: { playerId },
  startTyping: { playerId },
  finishSendingMessage: { playerId, message: string },
}
```

### 4.5 Sistema de Pathfinding

El movimiento funciona como un RTS:

1. Jugador especifica **destino** (x, y)
2. Engine calcula **path** usando A* en el mapa
3. Cada tick, jugador avanza por el path
4. Si colisiona, recalcula path (evasión de obstáculos)

```typescript
// El pathfinding se guarda en el player:
player.pathfinding = {
  path: [{x:5, y:5}, {x:6, y:5}, {x:7, y:5}],
  currentIndex: 0,
  destination: {x: 10, y: 5}
};
```

### 4.6 Conversaciones

```
Jugador A inicia conversación con B
    │
    ▼
B recibe invite (estado: 'invited')
    │
    ▼
B acepta → estado 'walkingOver'
    │
    ▼
B llega cerca de A → estado 'participating'
    │
    ▼
Ambos pueden enviar mensajes
    │
    ▼
Uno se va o timeout → conversación termina
```

### 4.7 Memoria de Agentes

Los agentes tienen memoria a largo plazo:

1. Después de cada conversación, GPT resume lo discutido
2. Se calcula embedding del resumen
3. Se guarda en vector DB (Convex)
4. En siguientes conversaciones, se buscan memories similares
5. Se injecta en el prompt para contexto

---

## 5. Troubleshooting Común

### Error: "Cannot read properties of null (reading 'stage')"

**Problema:** PixiJS no inicializado correctamente.

**Solución:**
```typescript
// Asegúrate que initialize() completó
const engine = new GameEngine();
await engine.initialize(canvas);
console.log('Initialized');
```

---

### Error: "useQuery() called outside ConvexProvider"

**Problema:** Componente renderizado fuera del provider.

**Solución:**
```tsx
import { ConvexProvider } from 'convex/react';

<ConvexProvider client={convex}>
  <Game />
</ConvexProvider>
```

---

### Error: "Ollama is not running"

**Problema:** Ollama no está corriendo.

**Solución:**
```bash
# Verificar que Ollama corre
curl http://localhost:11434

# Si no está corriendo:
ollama serve

# Descargar modelo si es necesario
ollama pull llama3
```

---

### Error: "No world found"

**Problema:** No hay world activo en la base de datos.

**Solución:**
```bash
# En el dashboard, verificar que existe un world con status 'running'

# Si no existe, correr init:
npx convex run init --until-success

# O desde el dashboard de Convex, ejecutar init.ts
```

---

### Error: "Generation number mismatch"

**Problema:** El engine se reinició mientras había un run pendiente.

**Solución:**
- Es normal en algunos casos
- Si persiste, puede indicar un bug en el engine loop
- Ver logs del dashboard para más detalles

---

### Canvas negro / sin render

**Problema:** PixiViewport no recibe dimensions correctos.

**Solución:**
```tsx
// Verificar que useElementSize funciona
const width = containerRef.current?.clientWidth ?? 800;
const height = containerRef.current?.clientHeight ?? 600;
```

---

### Agentes no se mueven

**Problema:** Puede ser el LLM no responde o está caído.

**Solución:**
```bash
# Verificar conexión a LLM
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "Hello"
}'

# Revisar logs del backend
npm run dev:backend
```

---

### Error de tipos en `_generated/`

**Problema:** Tipos de Convex no generados.

**Solución:**
```bash
# Regenerar tipos
npx convex codegen

# O iniciar dev server
npx convex dev
```

---

### BUILD FALLA

**Problema:** Errores de TypeScript en build.

**Solución:**
```bash
# Ver errores específicos
npx tsc --noEmit

# Asegurarse que _generated/ existe
ls convex/_generated/

# Si no existe, correr:
npx convex codegen
```

---

### Performance lenta

**Problema:** El juego va lento o con lag.

**Solución:**
1. Reducir número de jugadores/agentes
2. Reducir `STEP_DURATION` en `convex/constants.ts`
3. Verificar que solo hay un world activo
4. Reducir `NUM_MEMORIES_TO_SEARCH` en constants.ts

---

### Variables de entorno no reconocidas

**Problema:** Cambiaste variables pero no se aplican.

**Solución:**
```bash
# Ver variables actuales
npx convex env list

# Configurar variable
npx convex env set OLLAMA_MODEL=llama3

# Restart dev server
```

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev              # Todo junto
npm run dev:backend      # Solo backend con logs
npm run dev:frontend     # Solo frontend

# Build
npm run build            # Production build
npx convex codegen       # Regenerar tipos

# Dashboard
npm run dashboard        # Abrir dashboard de Convex

# Testing
npm test                 # Correr tests

# Init (reset world)
npx convex run init --until-success
```

---

## Próximos Pasos

Una vez que tienes AI Town corriendo:

1. **Explora el código** — lee `docs/ARCHITECTURE.md` para entender la estructura
2. **Modifica personajes** — cambia nombres, descripciones en `data/characters.ts`
3. **Agrega nueva funcionalidad** — sigue los patrones en `docs/API_REFERENCE.md`
4. **Deploya** — sigue las instrucciones en `README.md` para deploy a Vercel/Fly.io
5. **Contribuye** — open issues, PRs en el repositorio original

---

## Recursos

- [Documentación de Convex](https://docs.convex.dev)
- [Repositorio de AI Town](https://github.com/a16z-infra/ai-town)
- [Paper: Generative Agents](https://arxiv.org/pdf/2304.03442.pdf)
- [Discord community](https://discord.gg/PQUmTBTGmT)
