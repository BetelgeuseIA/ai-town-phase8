import React, { useEffect, useRef } from 'react';
import { GameEngine } from './GameEngine';

interface GameViewProps {
  worldId?: string;
  width?: number;
  height?: number;
}

const GameView: React.FC<GameViewProps> = ({ width = 800, height = 600 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const initGame = async () => {
      if (canvasRef.current) {
        gameEngineRef.current = new GameEngine();
        await gameEngineRef.current.initialize(canvasRef.current);
      }
    };

    initGame();

    // Cleanup function
    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-black/20 p-4">
      <h2 className="mb-3 text-lg font-semibold">🎮 Game View Experiment</h2>
      <div className="relative">
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height}
          className="rounded-lg border border-white/10"
        />
        <div className="absolute top-2 left-2 text-white font-bold text-lg bg-black/50 px-2 py-1 rounded">
          GAME VIEW 2.0 POC
        </div>
      </div>
    </div>
  );
};

export default GameView;