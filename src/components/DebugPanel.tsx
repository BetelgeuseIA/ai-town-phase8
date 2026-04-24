import { useState, useEffect } from 'react';

interface DebugInfo {
  worldStatus?: any;
  worldId?: string;
  isLoading: boolean;
  hasError: boolean;
  errorMsg: string;
  activeWorld: boolean;
  gameMounted: boolean;
  dashboardMounted: boolean;
  convexUrl: string;
}

export function useDebugInfo(): DebugInfo {
  const [info, setInfo] = useState<DebugInfo>({
    isLoading: true,
    hasError: false,
    errorMsg: '',
    activeWorld: false,
    gameMounted: false,
    dashboardMounted: false,
    convexUrl: import.meta.env.VITE_CONVEX_URL || 'NOT SET',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setInfo(prev => ({
        ...prev,
        // Estos valores se actualizarán desde App.tsx
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return info;
}

export default function DebugPanel({ info }: { info: DebugInfo }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        top: 50,
        right: 10,
        zIndex: 99998,
        background: 'rgba(0,0,0,0.9)',
        color: '#00ff88',
        padding: 12,
        borderRadius: 8,
        fontFamily: 'monospace',
        fontSize: 12,
        maxWidth: 350,
        border: '1px solid #00ff88',
        maxHeight: collapsed ? 40 : 400,
        overflow: 'auto',
      }}
    >
      <div
        style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: collapsed ? 0 : 8 }}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? '▶ Debug' : '▼ Debug Panel'}
      </div>
      {!collapsed && (
        <div style={{ display: 'grid', gap: 4 }}>
          <div>🌐 Convex URL: {info.convexUrl ? 'SET' : 'NOT SET'}</div>
          <div>🌍 World Status: {info.worldStatus === undefined ? 'LOADING' : info.worldStatus ? 'OK' : 'NULL'}</div>
          <div>🆔 World ID: {info.worldId || 'NONE'}</div>
          <div>⏳ Loading: {info.isLoading ? 'YES' : 'NO'}</div>
          <div>❌ Error: {info.hasError ? info.errorMsg : 'NONE'}</div>
          <div>✅ Active World: {info.activeWorld ? 'YES' : 'NO'}</div>
          <div>🎮 Game Mounted: {info.gameMounted ? 'YES' : 'NO'}</div>
          <div>📊 Dashboard: {info.dashboardMounted ? 'YES' : 'NO'}</div>
        </div>
      )}
    </div>
  );
}
