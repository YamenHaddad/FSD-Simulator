import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LANES } from './constants';

interface PlayerCarProps {
  lane: number;
  laneChangeActive: boolean;
}

export function PlayerCar({ lane, laneChangeActive }: PlayerCarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetX = LANES[lane];
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const current = groupRef.current.position.x;
    groupRef.current.position.x = THREE.MathUtils.lerp(current, targetX, delta * 5);

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(Date.now() * 0.005) * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={[LANES[lane], 0, 0]}>
      {/* Car body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.8, 0.6, 4]} />
        <meshStandardMaterial color="#cc44ff" roughness={0.1} metalness={0.8} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.0, -0.3]} castShadow>
        <boxGeometry args={[1.6, 0.7, 2.2]} />
        <meshStandardMaterial color="#aa22ee" roughness={0.15} metalness={0.7} />
      </mesh>
      {/* Hood */}
      <mesh position={[0, 0.55, 1.5]} castShadow>
        <boxGeometry args={[1.8, 0.5, 1.0]} />
        <meshStandardMaterial color="#cc44ff" roughness={0.1} metalness={0.8} />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 1.05, -0.1]}>
        <boxGeometry args={[1.5, 0.55, 2.0]} />
        <meshStandardMaterial color="#220033" roughness={0} metalness={0.9} transparent opacity={0.85} />
      </mesh>
      {/* Wheels */}
      {[[-0.95, 0.25, 1.3], [0.95, 0.25, 1.3], [-0.95, 0.25, -1.3], [0.95, 0.25, -1.3]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color="#111111" roughness={0.9} />
        </mesh>
      ))}
      {/* Headlights glow */}
      <mesh ref={glowRef} position={[0, 0.5, 2.1]}>
        <boxGeometry args={[1.6, 0.15, 0.05]} />
        <meshStandardMaterial color="#ff8844" emissive="#ff4400" emissiveIntensity={2} />
      </mesh>
      {/* Rear lights */}
      <mesh position={[0, 0.5, -2.05]}>
        <boxGeometry args={[1.6, 0.15, 0.05]} />
        <meshStandardMaterial color="#ff2200" emissive="#ff0000" emissiveIntensity={1.5} />
      </mesh>
      {/* Car glow */}
      <pointLight position={[0, 0.5, 0]} color="#cc44ff" intensity={0.8} distance={4} />
      {laneChangeActive && (
        <pointLight position={[0, 1, 0]} color="#4488ff" intensity={1.5} distance={6} />
      )}
    </group>
  );
}
