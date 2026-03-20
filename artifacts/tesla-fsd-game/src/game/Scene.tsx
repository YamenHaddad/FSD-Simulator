import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Road } from './Road';
import { PlayerCar } from './PlayerCar';
import { NpcCar } from './NpcCar';
import { Environment } from './Environment';
import { Canvas2DScene } from './Canvas2DScene';
import { GameState, CarData } from './types';

interface SceneProps {
  gameState: GameState;
  npcCars: CarData[];
  playerLane: number;
  onTick: (delta: number) => void;
}

function GameLoop({ onTick }: { onTick: (delta: number) => void }) {
  useFrame((_, delta) => {
    onTick(Math.min(delta, 0.05));
  });
  return null;
}

function SceneCamera() {
  useFrame(({ camera }) => {
    camera.position.set(0, 8, 14);
    camera.lookAt(0, 0, -10);
  });
  return null;
}

function ThreeDContent({ gameState, npcCars, playerLane, onTick }: SceneProps) {
  return (
    <>
      <GameLoop onTick={onTick} />
      <SceneCamera />
      <ambientLight intensity={1.4} color="#ffffff" />
      <directionalLight position={[10, 20, 5]} intensity={1.5} color="#ffffff" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 10, -5]} intensity={0.5} color="#e8eeff" />
      <hemisphereLight args={['#f0f0ff', '#e0e0e0', 0.6]} />
      <fog attach="fog" args={['#f5f5f5', 80, 200]} />
      <color attach="background" args={['#f5f5f5']} />
      <Road speed={gameState.speed} playerLane={playerLane} fsdEnabled={gameState.fsdEnabled} />
      <PlayerCar lane={playerLane} laneChangeActive={gameState.laneChangeActive} />
      {npcCars.map(car => <NpcCar key={car.id} car={car} />)}
      <Environment />
    </>
  );
}

export function Scene({ gameState, npcCars, playerLane, onTick }: SceneProps) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebglAvailable(!!gl);
      if (gl) {
        (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  if (webglAvailable === null) {
    return <div style={{ width: '100%', height: '100%', background: '#f5f5f5' }} />;
  }

  if (!webglAvailable) {
    return (
      <Canvas2DScene
        gameState={gameState}
        npcCars={npcCars}
        playerLane={playerLane}
        onTick={onTick}
      />
    );
  }

  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 14], fov: 55 }}
      style={{ width: '100%', height: '100%', background: '#f5f5f5' }}
      gl={{ antialias: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false }}
      onCreated={({ gl }) => gl.setClearColor('#f5f5f5')}
    >
      <Suspense fallback={null}>
        <ThreeDContent gameState={gameState} npcCars={npcCars} playerLane={playerLane} onTick={onTick} />
      </Suspense>
    </Canvas>
  );
}
