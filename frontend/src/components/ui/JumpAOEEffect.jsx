import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Config ──
const TOTAL_DURATION = 1.8;       // tổng thời gian hiệu ứng (giây)
const RING_COUNT = 3;             // số vòng shockwave
const RING_MAX_RADIUS = 30;       // bán kính tối đa mỗi ring
const CRACK_COUNT = 12;           // số vệt nứt đất
const CRACK_LENGTH = 18;          // chiều dài vệt nứt tối đa
const PARTICLE_COUNT = 32;        // số hạt năng lượng
const PARTICLE_SPEED = 35;        // tốc độ bắn ra
const PILLAR_MAX_HEIGHT = 25;     // chiều cao cột năng lượng
const PILLAR_MAX_RADIUS = 4;
const DEBRIS_COUNT = 16;          // mảnh đất bay lên
const DEBRIS_MAX_HEIGHT = 12;

/**
 * Hiệu ứng JumpAOE: động đất + sóng năng lượng toả ra khi đập xuống đất.
 *
 * @param {{ position: {x,y,z}, onComplete: () => void }} props
 */
const JumpAOEEffect = ({ position, onComplete }) => {
  const groupRef = useRef();
  const elapsed = useRef(0);
  const done = useRef(false);

  // ── Shockwave rings ──
  const ringRefs = useRef([]);
  const ringMats = useMemo(() =>
    Array.from({ length: RING_COUNT }, (_, i) =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.08 + i * 0.02, 1, 0.55),
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    ), []);

  // ── Ground crack lines ──
  const crackData = useMemo(() =>
    Array.from({ length: CRACK_COUNT }, (_, i) => {
      const angle = (i / CRACK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      return { angle, length: CRACK_LENGTH * (0.6 + Math.random() * 0.4) };
    }), []);

  const crackRefs = useRef([]);
  const crackMat = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0.6, 0.1),
      transparent: true,
      opacity: 1,
      depthWrite: false,
    }), []);

  // ── Energy particles ──
  const particleDirs = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const elev = Math.random() * 0.6 + 0.1;
      return {
        x: Math.cos(angle),
        y: elev,
        z: Math.sin(angle),
      };
    }), []);

  const particleRefs = useRef([]);
  const particleMat = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0.85, 0.3),
      transparent: true,
      opacity: 1,
      depthWrite: false,
    }), []);

  // ── Energy pillar ──
  const pillarRef = useRef();
  const pillarMat = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0.7, 0.2),
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    }), []);

  // ── Debris (mảnh đất) ──
  const debrisData = useMemo(() =>
    Array.from({ length: DEBRIS_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 8;
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        height: DEBRIS_MAX_HEIGHT * (0.4 + Math.random() * 0.6),
        size: 0.3 + Math.random() * 0.5,
        rotSpeed: (Math.random() - 0.5) * 10,
      };
    }), []);

  const debrisRefs = useRef([]);
  const debrisMat = useMemo(() =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.4, 0.3, 0.2),
      transparent: true,
      opacity: 1,
      roughness: 1,
    }), []);

  // ── Ground flash disc ──
  const flashRef = useRef();
  const flashMat = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 0.95, 0.7),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    }), []);

  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = elapsed.current;
    const progress = Math.min(1, t / TOTAL_DURATION);

    // ── Group shake (earthquake) ──
    if (groupRef.current) {
      const shakeIntensity = Math.max(0, 1 - progress * 1.5) * 0.5;
      groupRef.current.position.x = position.x + (Math.random() - 0.5) * shakeIntensity;
      groupRef.current.position.z = position.z + (Math.random() - 0.5) * shakeIntensity;
    }

    // ── Ground flash ──
    if (flashRef.current) {
      const flashT = Math.min(1, t / 0.3);
      const flashScale = flashT * 12;
      flashRef.current.scale.set(flashScale, flashScale, 1);
      flashMat.opacity = 0.8 * Math.max(0, 1 - flashT);
    }

    // ── Shockwave rings (staggered) ──
    ringRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const delay = i * 0.15;
      const ringT = Math.max(0, Math.min(1, (t - delay) / 0.8));
      const ease = 1 - Math.pow(1 - ringT, 3); // easeOutCubic
      const scale = ease * RING_MAX_RADIUS;
      ref.scale.set(scale, scale, 1);
      ringMats[i].opacity = 0.9 * Math.max(0, 1 - ringT);
    });

    // ── Crack lines ──
    crackRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const crackT = Math.min(1, t / 0.5);
      const data = crackData[i];
      const len = data.length * crackT;
      ref.scale.set(1, len, 1);
      ref.position.set(
        Math.cos(data.angle) * len * 0.5,
        0.15,
        Math.sin(data.angle) * len * 0.5,
      );
      ref.rotation.y = -data.angle + Math.PI / 2;
      // Fade out
      if (ref.material) {
        ref.material.opacity = Math.max(0, 1 - progress * 0.8);
      }
    });

    // ── Particles ──
    particleRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const pT = Math.min(1, t / 1.2);
      const dir = particleDirs[i];
      const dist = pT * PARTICLE_SPEED;
      ref.position.set(
        dir.x * dist,
        dir.y * dist * 3 * (1 - pT * 0.5),
        dir.z * dist,
      );
      const pScale = Math.max(0, (1 - pT)) * 0.5;
      ref.scale.set(pScale, pScale, pScale);
      if (ref.material) {
        ref.material.opacity = Math.max(0, 1 - pT);
      }
    });

    // ── Energy pillar ──
    if (pillarRef.current) {
      const pillarT = Math.min(1, t / 0.4);
      const fadeT = Math.max(0, (t - 0.4) / 0.6);
      const height = pillarT * PILLAR_MAX_HEIGHT;
      const radius = PILLAR_MAX_RADIUS * (1 - fadeT * 0.5);
      pillarRef.current.scale.set(radius, height, radius);
      pillarRef.current.position.y = height * 0.5;
      pillarMat.opacity = 0.7 * Math.max(0, 1 - fadeT);
    }

    // ── Debris ──
    debrisRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const data = debrisData[i];
      const debrisT = Math.min(1, t / 1.0);
      // Parabolic arc: y = height * (1 - (2t-1)^2)
      const normalized = debrisT * 2 - 1;
      const y = data.height * (1 - normalized * normalized);
      ref.position.set(data.x * debrisT, Math.max(0, y), data.z * debrisT);
      ref.rotation.x += data.rotSpeed * delta;
      ref.rotation.z += data.rotSpeed * delta * 0.7;
      if (ref.material) {
        ref.material.opacity = Math.max(0, 1 - debrisT);
      }
    });

    // ── Complete ──
    if (t > TOTAL_DURATION) {
      done.current = true;
      onComplete?.();
    }
  });

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      {/* Ground flash */}
      <mesh ref={flashRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} material={flashMat}>
        <circleGeometry args={[1, 32]} />
      </mesh>

      {/* Shockwave rings */}
      {Array.from({ length: RING_COUNT }, (_, i) => (
        <mesh
          key={`ring-${i}`}
          ref={(el) => (ringRefs.current[i] = el)}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.2 + i * 0.1, 0]}
          material={ringMats[i]}
        >
          <ringGeometry args={[0.8, 1.2, 48]} />
        </mesh>
      ))}

      {/* Ground crack lines */}
      {crackData.map((_, i) => (
        <mesh
          key={`crack-${i}`}
          ref={(el) => (crackRefs.current[i] = el)}
          material={crackMat.clone()}
        >
          <planeGeometry args={[0.15, 1]} />
        </mesh>
      ))}

      {/* Energy pillar */}
      <mesh ref={pillarRef} material={pillarMat}>
        <cylinderGeometry args={[1, 1, 1, 16, 1, true]} />
      </mesh>

      {/* Energy particles */}
      {particleDirs.map((_, i) => (
        <mesh
          key={`particle-${i}`}
          ref={(el) => (particleRefs.current[i] = el)}
          material={particleMat.clone()}
        >
          <dodecahedronGeometry args={[0.35, 0]} />
        </mesh>
      ))}

      {/* Debris chunks */}
      {debrisData.map((data, i) => (
        <mesh
          key={`debris-${i}`}
          ref={(el) => (debrisRefs.current[i] = el)}
          material={debrisMat.clone()}
        >
          <boxGeometry args={[data.size, data.size, data.size]} />
        </mesh>
      ))}
    </group>
  );
};

export default JumpAOEEffect;
