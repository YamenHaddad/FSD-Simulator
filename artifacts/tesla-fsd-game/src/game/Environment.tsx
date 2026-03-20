import { useMemo } from 'react';
import * as THREE from 'three';

const buildingPositions = [
  [-22, 0, -30], [-22, 0, -60], [-22, 0, -90], [-22, 0, -120],
  [22, 0, -25], [22, 0, -55], [22, 0, -85], [22, 0, -115],
  [-18, 0, -45], [18, 0, -40], [-20, 0, -75], [20, 0, -70],
];

const buildingSizes: [number, number, number][] = [
  [4, 8, 5], [6, 5, 4], [3, 10, 4], [5, 6, 5],
  [4, 7, 4], [6, 9, 5], [3, 5, 3], [5, 8, 4],
  [4, 6, 4], [5, 7, 5], [4, 9, 3], [6, 5, 4],
];

function StaticBuilding({ position, size }: { position: number[]; size: [number, number, number] }) {
  return (
    <mesh position={[position[0], size[1] / 2, position[2]]} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#d0d0d0" roughness={0.8} metalness={0.1} />
    </mesh>
  );
}

function TrafficLight({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 5, 8]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      <mesh position={[0, 5.3, 0]}>
        <boxGeometry args={[0.4, 1.0, 0.2]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[0, 5.55, 0.11]}>
        <circleGeometry args={[0.12, 12]} />
        <meshBasicMaterial color="#ff2200" />
      </mesh>
      <mesh position={[0, 5.3, 0.11]}>
        <circleGeometry args={[0.12, 12]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>
      <mesh position={[0, 5.05, 0.11]}>
        <circleGeometry args={[0.12, 12]} />
        <meshBasicMaterial color="#44ff44" />
      </mesh>
    </group>
  );
}

export function Environment() {
  return (
    <group>
      {/* Ground plane beyond road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -80]}>
        <planeGeometry args={[200, 400]} />
        <meshStandardMaterial color="#f0f0f0" roughness={1} />
      </mesh>

      {/* Buildings */}
      {buildingPositions.map((pos, i) => (
        <StaticBuilding key={i} position={pos} size={buildingSizes[i % buildingSizes.length]} />
      ))}

      {/* Traffic lights */}
      <TrafficLight x={-10} z={-40} />
      <TrafficLight x={10} z={-40} />
      <TrafficLight x={-10} z={-80} />
      <TrafficLight x={10} z={-80} />

      {/* Horizon fog */}
      <fog attach="fog" args={['#f5f5f5', 60, 200]} />
    </group>
  );
}
