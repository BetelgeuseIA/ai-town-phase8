import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import SettlementDashboard from './components/dashboard/SettlementDashboard.tsx';
import { GameCore } from './game/GameCore';

export default function Home() {
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23' }}>
      {worldId ? (
        <GameCore />
      ) : worldStatus === undefined ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: '#aaa',
        }}>
          <h2>⏳ Loading simulation data...</h2>
          <p>Waiting for Convex to respond...</p>
        </div>
      ) : (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: '#ffaa00',
        }}>
          <h2>⚠️ No Active World Found</h2>
          <p>The simulation needs to be initialized.</p>
        </div>
      )}
    </div>
  );
}
