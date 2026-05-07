import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 24;
const RING_DURATION = 0.6;   // giây
const PARTICLE_DURATION = 0.8;
const PARTICLE_SPEED = 40;
const RING_MAX_SCALE = 8;

/**
 * Hiệu ứng teleport 3D: vòng sáng mở rộng + particles bắn ra.
 * Tự huỷ sau khi animation kết thúc.
 *
 * @param {{ position: {x,y,z}, onComplete: () => void }} props
 */
const TeleportEffect = ({ position, onComplete }) => {
  const groupRef = useRef();
  const ringRef = useRef();
  const elapsed = useRef(0);
  const done = useRef(false);

  // Tạo random directions cho particles 1 lần
  const particleDirs = useMemo(() => {
    const dirs = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * 2;
      dirs.push({
        x: Math.cos(angle),
        y: elevation,
        z: Math.sin(angle),
      });
    }
    return dirs;
  }, []);

  // Ring geometry + material
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.2, 0.8, 1),
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  const particleMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.4, 0.9, 1),
        transparent: true,
        opacity: 1,
        depthWrite: false,
      }),
    [],
  );

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = elapsed.current;

    // Ring animation
    if (ringRef.current) {
      const ringT = Math.min(1, t / RING_DURATION);
      const scale = ringT * RING_MAX_SCALE;
      ringRef.current.scale.set(scale, scale, 1);
      ringMat.opacity = 0.8 * (1 - ringT);
    }

    // Particles animation
    if (groupRef.current) {
      const pT = Math.min(1, t / PARTICLE_DURATION);
      groupRef.current.children.forEach((child, i) => {
        if (i === 0) return; // skip ring
        const dir = particleDirs[i - 1];
        if (!dir) return;
        const dist = pT * PARTICLE_SPEED;
        child.position.set(dir.x * dist, dir.y * dist + 2, dir.z * dist);
        const pScale = (1 - pT) * 0.6;
        child.scale.set(pScale, pScale, pScale);
        child.material.opacity = 1 - pT;
      });
    }

    // Complete
    if (t > PARTICLE_DURATION) {
      done.current = true;
      onComplete?.();
    }
  });

  return (
    <group ref={groupRef} position={[position.x, position.y + 2, position.z]}>
      {/* Ring xoay ngang */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <ringGeometry args={[0.8, 1, 32]} />
      </mesh>

      {/* Particles */}
      {particleDirs.map((_, i) => (
        <mesh key={i} material={particleMat.clone()}>
          <sphereGeometry args={[0.3, 8, 8]} />
        </mesh>
      ))}
    </group>
  );
};

export default TeleportEffect;
