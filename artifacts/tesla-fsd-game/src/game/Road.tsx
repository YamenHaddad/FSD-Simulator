import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LANES, ROAD_WIDTH, ROAD_SEGMENT_LENGTH, NUM_ROAD_SEGMENTS } from './constants';

interface RoadProps {
  speed: number;
  playerLane: number;
  fsdEnabled: boolean;
}

function RoadSegment({ z, playerLane, fsdEnabled }: { z: number; playerLane: number; fsdEnabled: boolean }) {
  const laneX = LANES[playerLane];
  return (
    <group position={[0, 0, z]}>
      {/* Main road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_SEGMENT_LENGTH]} />
        <meshStandardMaterial color="#e2e2e2" roughness={0.9} />
      </mesh>

      {/* Lane markings - dashed center lines */}
      {LANES.slice(0, -1).map((lx, i) => {
        const midX = (lx + LANES[i + 1]) / 2;
        return Array.from({ length: 8 }).map((_, j) => (
          <mesh key={`${i}-${j}`} position={[midX, 0.01, -ROAD_SEGMENT_LENGTH / 2 + j * 5 + 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.12, 2.5]} />
            <meshStandardMaterial color="#bbbbbb" />
          </mesh>
        ));
      })}

      {/* Road edges */}
      <mesh position={[-ROAD_WIDTH / 2 - 0.1, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.25, ROAD_SEGMENT_LENGTH]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
      <mesh position={[ROAD_WIDTH / 2 + 0.1, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.25, ROAD_SEGMENT_LENGTH]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>

      {/* FSD path highlight - blue lane highlight */}
      {fsdEnabled && (
        <mesh position={[laneX, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.5, ROAD_SEGMENT_LENGTH]} />
          <meshStandardMaterial color="#4488ff" transparent opacity={0.12} />
        </mesh>
      )}
    </group>
  );
}

function Chevrons({ playerLane, fsdEnabled }: { playerLane: number; fsdEnabled: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const laneX = LANES[playerLane];

  useFrame((_, delta) => {
    timeRef.current += delta * 2;
  });

  if (!fsdEnabled) return null;

  return (
    <group>
      {[0, 1, 2, 3, 4].map(i => {
        const baseZ = -5 - i * 5;
        return (
          <group key={i} position={[laneX, 0.02, baseZ]}>
            {/* Chevron shape made from two planes */}
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
              <planeGeometry args={[0.3, 2.2]} />
              <meshBasicMaterial
                color="#2277ee"
                transparent
                opacity={0.6 - i * 0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 4]}>
              <planeGeometry args={[0.3, 2.2]} />
              <meshBasicMaterial
                color="#2277ee"
                transparent
                opacity={0.6 - i * 0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Road({ speed, playerLane, fsdEnabled }: RoadProps) {
  const groupRef = useRef<THREE.Group>(null);
  const offsetRef = useRef(0);

  const segments = useMemo(
    () => Array.from({ length: NUM_ROAD_SEGMENTS }, (_, i) => i),
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    offsetRef.current += (speed / 3.6) * delta * 0.6;
    if (offsetRef.current >= ROAD_SEGMENT_LENGTH) {
      offsetRef.current -= ROAD_SEGMENT_LENGTH;
    }
    groupRef.current.position.z = offsetRef.current;
  });

  return (
    <group ref={groupRef}>
      {segments.map(i => (
        <RoadSegment
          key={i}
          z={-i * ROAD_SEGMENT_LENGTH}
          playerLane={playerLane}
          fsdEnabled={fsdEnabled}
        />
      ))}
      <Chevrons playerLane={playerLane} fsdEnabled={fsdEnabled} />
    </group>
  );
}
