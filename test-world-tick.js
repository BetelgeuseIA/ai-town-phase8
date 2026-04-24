// Script para probar la nueva mutación runWorldTick
// Este script asume que ya tienes un mundo creado y su ID

import { convex } from './convex/_generated/client';

// Reemplaza con un worldId válido de tu base de datos
const WORLD_ID = 'YOUR_WORLD_ID_HERE';

async function testWorldTick() {
  try {
    console.log('Ejecutando runWorldTick...');
    const result = await convex.mutation('settlement/worldTick:runWorldTick', {
      worldId: WORLD_ID
    });
    console.log('Resultado:', result);
  } catch (error) {
    console.error('Error al ejecutar runWorldTick:', error);
  }
}

testWorldTick();