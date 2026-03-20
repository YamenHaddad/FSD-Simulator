import { useEffect, useCallback } from 'react';
import { Scene } from '../game/Scene';
import { HUD } from '../game/HUD';
import { useGameState } from '../game/useGameState';
import { GameState } from '../game/types';

export default function Game() {
  const {
    gameState,
    npcCars,
    playerLane,
    changePlayerLane,
    setProfile,
    toggleFsd,
    tick,
    restart,
  } = useGameState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.gameOver) {
        if (e.code === 'Space' || e.code === 'Enter') restart();
        return;
      }
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          changePlayerLane(-1);
          break;
        case 'ArrowRight':
        case 'KeyD':
          changePlayerLane(1);
          break;
        case 'KeyF':
          toggleFsd();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changePlayerLane, toggleFsd, gameState.gameOver, restart]);

  const handleLaneLeft = useCallback(() => changePlayerLane(-1), [changePlayerLane]);
  const handleLaneRight = useCallback(() => changePlayerLane(1), [changePlayerLane]);
  const handleProfileChange = useCallback((p: GameState['profile']) => setProfile(p), [setProfile]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100">
      <Scene
        gameState={gameState}
        npcCars={npcCars}
        playerLane={playerLane}
        onTick={tick}
      />
      {!gameState.gameOver && (
        <HUD
          gameState={gameState}
          onToggleFsd={toggleFsd}
          onProfileChange={handleProfileChange}
          onLaneLeft={handleLaneLeft}
          onLaneRight={handleLaneRight}
        />
      )}

      {gameState.gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl px-12 py-10 flex flex-col items-center gap-5 border border-gray-200">
            <div className="text-6xl">💥</div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Autopilot Disengaged</h2>
            <p className="text-gray-500 text-sm">A collision was detected. FSD has been disabled.</p>
            <div className="flex flex-col items-center gap-1">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Final Score</span>
              <span className="text-5xl font-bold text-blue-500">{gameState.score}</span>
            </div>
            <div className="text-gray-400 text-sm">
              Distance: {(gameState.distance / 1000).toFixed(2)} km
            </div>
            <button
              onClick={restart}
              className="mt-2 px-10 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-2xl text-lg transition-colors shadow-lg"
            >
              Restart Drive
            </button>
            <p className="text-gray-400 text-xs">Press Space or Enter to restart</p>
          </div>
        </div>
      )}
    </div>
  );
}
