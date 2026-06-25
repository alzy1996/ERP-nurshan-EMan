"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, Lightformer } from "@react-three/drei";
import type { Group } from "three";

function Orb() {
  const ref = useRef<Group>(null);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={ref}>
      {/* Frosted liquid-glass core */}
      <mesh>
        <sphereGeometry args={[1.6, 96, 96]} />
        <meshPhysicalMaterial
          color="#e9effb"
          roughness={0.42}
          metalness={0}
          transmission={0.6}
          thickness={2.2}
          ior={1.3}
          clearcoat={0.7}
          clearcoatRoughness={0.42}
          attenuationColor="#cfe0ff"
          attenuationDistance={3}
          sheen={1}
          sheenColor="#ffffff"
          envMapIntensity={1.25}
        />
      </mesh>
      {/* Faint globe wireframe to read as a planet */}
      <mesh scale={1.004}>
        <sphereGeometry args={[1.6, 38, 38]} />
        <meshBasicMaterial color="#9fb6e0" wireframe transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

export default function GlobeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.2], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <directionalLight position={[-4, -2, -3]} intensity={0.45} color="#aac4ff" />

      <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.9}>
        <Orb />
      </Float>

      {/* Procedural studio environment (no network HDR) so the glass reflects something. */}
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 3, 4]} scale={[6, 6, 1]} color="#ffffff" />
        <Lightformer intensity={1.1} position={[-4, -1, 3]} scale={[3, 3, 1]} color="#c7d8ff" />
        <Lightformer intensity={0.9} position={[4, 1, -2]} scale={[3, 3, 1]} color="#ffe9f3" />
      </Environment>
    </Canvas>
  );
}
