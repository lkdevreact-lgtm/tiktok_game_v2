import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

const BASE_Y = 20;
const BOB_AMPLITUDE = 0.4;
const BOB_SPEED = 4;
const SPIN_SPEED = 2;

const TargetArrow = () => {
  const groupRef = useRef();
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    elapsed.current += delta;
    groupRef.current.position.y =
      BASE_Y + Math.sin(elapsed.current * BOB_SPEED) * BOB_AMPLITUDE;
    groupRef.current.rotation.y += delta * SPIN_SPEED;
  });

  return (
    <group ref={groupRef} position={[0, BASE_Y, 0]}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.7, 1.6, 4]} />
        <meshStandardMaterial
          color="#ff2a2a"
          emissive="#ff2a2a"
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

export default TargetArrow;
