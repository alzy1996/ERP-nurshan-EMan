"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, Lightformer, useTexture } from "@react-three/drei";
import { NoColorSpace, RepeatWrapping, type Group } from "three";

function Earth() {
  const ref = useRef<Group>(null);
  const [normal, spec] = useTexture([
    "/textures/earth-normal.jpg",
    "/textures/earth-specular.jpg",
  ]);
  // Normal/relief maps must be sampled linearly, and wrap around the sphere seam.
  normal.colorSpace = NoColorSpace;
  spec.colorSpace = NoColorSpace;
  normal.wrapS = normal.wrapT = RepeatWrapping;
  spec.wrapS = spec.wrapT = RepeatWrapping;

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.1;
  });

  return (
    <group ref={ref} rotation={[0.32, 0, 0.05]}>
      <mesh>
        <sphereGeometry args={[1.6, 128, 128]} />
        <meshPhysicalMaterial
          color="#eef2fc"
          roughness={0.62}
          metalness={0}
          clearcoat={0.5}
          clearcoatRoughness={0.45}
          emissive="#2f55ad"
          emissiveMap={spec}
          emissiveIntensity={0.18}
          sheen={1}
          sheenColor="#dfe9ff"
          sheenRoughness={0.5}
          envMapIntensity={1.1}
          normalMap={normal}
          normalScale={[2, 2]}
        />
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
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.5} />
      <directionalLight position={[-4, -2, -3]} intensity={0.45} color="#aac4ff" />

      <Suspense fallback={null}>
        <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.85}>
          <Earth />
        </Float>
        {/* Procedural studio environment (no network HDR) so the glass reflects light. */}
        <Environment resolution={256}>
          <Lightformer intensity={2.2} position={[0, 3, 4]} scale={[6, 6, 1]} color="#ffffff" />
          <Lightformer intensity={1.1} position={[-4, -1, 3]} scale={[3, 3, 1]} color="#c7d8ff" />
          <Lightformer intensity={0.9} position={[4, 1, -2]} scale={[3, 3, 1]} color="#ffe9f3" />
        </Environment>
      </Suspense>
    </Canvas>
  );
}
