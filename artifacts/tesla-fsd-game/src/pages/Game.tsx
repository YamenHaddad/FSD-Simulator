import { useEffect, useCallback } from 'react';
import { Scene } from '../game/Scene';
import { HUD } from '../game/HUD';
import { useGameState } from '../game/useGameState';
import { GameState } from '../game/types';

const glass = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
};

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
    chooseDecision,
  } = useGameState();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Restart on game-over
      if (gameState.gameOver) {
        if (e.code === 'Space' || e.code === 'Enter') restart();
        return;
      }

      // Decision moment keyboard shortcuts
      if (gameState.decisionMoment?.active) {
        if (e.code === 'KeyY') { chooseDecision('yes'); return; }
        if (e.code === 'KeyN') { chooseDecision('no'); return; }
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changePlayerLane, toggleFsd, gameState.gameOver, gameState.decisionMoment, restart, chooseDecision]);

  const handleLaneLeft = useCallback(() => changePlayerLane(-1), [changePlayerLane]);
  const handleLaneRight = useCallback(() => changePlayerLane(1), [changePlayerLane]);
  const handleProfileChange = useCallback((p: GameState['profile']) => setProfile(p), [setProfile]);
  const handleDecision = useCallback((c: 'yes' | 'no') => chooseDecision(c), [chooseDecision]);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#f2f4f7' }}>
      {/* 3D / 2D scene */}
      <Scene
        gameState={gameState}
        npcCars={npcCars}
        playerLane={playerLane}
        onTick={tick}
      />

      {/* HUD overlay */}
      {!gameState.gameOver && (
        <HUD
          gameState={gameState}
          onToggleFsd={toggleFsd}
          onProfileChange={handleProfileChange}
          onLaneLeft={handleLaneLeft}
          onLaneRight={handleLaneRight}
          onDecision={handleDecision}
        />
      )}

      {/* ── Game-Over screen ─────────────────────────────────────────── */}
      {gameState.gameOver && (
        <div className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(240,242,245,0.65)', backdropFilter: 'blur(6px)' }}>
          <div className="rounded-3xl px-10 py-9 flex flex-col items-center gap-4 max-w-sm w-full mx-4"
            style={glass}>
            {/* Icon */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{ background: 'rgba(239,68,68,0.1)' }}>
              💥
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Autopilot Disengaged</h2>
              <p className="text-sm text-gray-400 mt-1">A collision was detected. Safety mode activated.</p>
            </div>

            {/* Stats grid */}
            <div className="w-full grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="text-[10px] text-gray-400 font-semibold tracking-widest mb-0.5">FINAL SCORE</div>
                <div className="text-2xl font-bold text-blue-500">{gameState.score.toLocaleString()}</div>
              </div>
              <div className="rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="text-[10px] text-gray-400 font-semibold tracking-widest mb-0.5">DISTANCE</div>
                <div className="text-2xl font-bold text-gray-700">{(gameState.distance / 1000).toFixed(2)}<span className="text-sm font-normal text-gray-400 ml-0.5">km</span></div>
              </div>
              <div className="rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="text-[10px] text-gray-400 font-semibold tracking-widest mb-0.5">TOP COMBO</div>
                <div className="text-2xl font-bold" style={{ color: '#a855f7' }}>×{Math.floor(gameState.combo)}</div>
              </div>
              <div className="rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="text-[10px] text-gray-400 font-semibold tracking-widest mb-0.5">CONFIDENCE</div>
                <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{Math.round(gameState.fsdConfidence)}%</div>
              </div>
            </div>

            <button
              onClick={restart}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#2563eb,#6366f1)' }}
            >
              Restart Drive
            </button>
            <p className="text-[11px] text-gray-300">Press Space or Enter to restart</p>
          </div>
        </div>
      )}
    </div>
  );
}
