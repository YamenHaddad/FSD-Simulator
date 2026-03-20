import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CarData } from './types';

interface NpcCarProps {
  car: CarData;
}

function getCarDimensions(type: CarData['type']): [number, number, number] {
  switch (type) {
    case 'truck': return [2.2, 1.8, 7.0];
    case 'suv': return [2.0, 0.85, 4.5];
    default: return [1.8, 0.6, 4.0];
  }
}

function getCabinDimensions(type: CarData['type']): [number, number, number] {
  switch (type) {
    case 'truck': return [2.0, 1.2, 3.5];
    case 'suv': return [1.85, 0.9, 3.0];
    default: return [1.6, 0.7, 2.2];
  }
}

export function NpcCar({ car }: NpcCarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [bW, bH, bL] = getCarDimensions(car.type);
  const [cW, cH, cL] = getCabinDimensions(car.type);
  const bodyColor = car.type === 'truck' ? '#444444' : '#888888';
  const detectedColor = '#3388ff';

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.z += car.speed * delta * 0.01;
  });

  return (
    <group ref={groupRef} position={[car.x, 0, car.z]}>
      {/* Body */}
      <mesh position={[0, bH / 2, 0]} castShadow>
        <boxGeometry args={[bW, bH, bL]} />
        <meshStandardMaterial
          color={car.detected ? detectedColor : bodyColor}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>
      {/* Cabin (not for trucks) */}
      {car.type !== 'truck' && (
        <mesh position={[0, bH + cH / 2, -0.3]} castShadow>
          <boxGeometry args={[cW, cH, cL]} />
          <meshStandardMaterial
            color={car.detected ? '#2266cc' : '#666666'}
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>
      )}
      {/* Truck cabin */}
      {car.type === 'truck' && (
        <mesh position={[0, bH + 0.9, 2.2]} castShadow>
          <boxGeometry args={[2.0, 1.8, 2.5]} />
          <meshStandardMaterial color={car.detected ? '#2266cc' : '#555555'} roughness={0.4} metalness={0.5} />
        </mesh>
      )}
      {/* Wheels */}
      {[[-bW / 2 - 0.05, 0.3, bL / 3], [bW / 2 + 0.05, 0.3, bL / 3], [-bW / 2 - 0.05, 0.3, -bL / 3], [bW / 2 + 0.05, 0.3, -bL / 3]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.22, 12]} />
          <meshStandardMaterial color="#111111" roughness={0.9} />
        </mesh>
      ))}
      {/* Rear lights */}
      <mesh position={[0, bH / 2, -bL / 2 - 0.01]}>
        <boxGeometry args={[bW * 0.7, 0.15, 0.05]} />
        <meshStandardMaterial color="#ff1100" emissive="#ff0000" emissiveIntensity={1.2} />
      </mesh>
      {/* Detection ring */}
      {car.detected && (
        <mesh position={[0, bH + cH + 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.5, 32]} />
          <meshBasicMaterial color="#3388ff" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
