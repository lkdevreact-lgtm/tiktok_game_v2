import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

const FLOAT_SPEED = 8;
const LIFETIME = 1.2;
const SCALE_START = 1.5;
const SCALE_END = 0.6;

const FloatingDamage = ({ id, damage, position, onComplete }) => {
  const groupRef = useRef();
  const elapsed = useRef(0);
  const [visible, setVisible] = useState(true);

  useFrame((_, delta) => {
    if (!groupRef.current || !visible) return;
    elapsed.current += delta;

    // Bay lên
    groupRef.current.position.y += FLOAT_SPEED * delta;

    // Tính progress 0→1
    const t = Math.min(1, elapsed.current / LIFETIME);

    // Scale: pop ra rồi thu nhỏ
    const scale = SCALE_START + (SCALE_END - SCALE_START) * t;
    groupRef.current.scale.set(scale, scale, scale);

    if (t >= 1) {
      setVisible(false);
      onComplete?.(id);
    }
  });

  if (!visible) return null;

  const t = Math.min(1, elapsed.current / LIFETIME);
  const opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;

  const color = damage >= 3 ? "#ff4444" : "#ffcc00";
  const isCrit = damage >= 3;

  return (
    <group ref={groupRef} position={[position.x, position.y + 6, position.z]}>
      <Html center distanceFactor={40} zIndexRange={[100, 0]}>
        <div
          style={{
            pointerEvents: "none",
            userSelect: "none",
            fontFamily: "'Inter', 'Arial Black', sans-serif",
            fontWeight: 900,
            fontSize: isCrit ? "22px" : "12px",
            color: color,
            textShadow: `
              0 0 8px ${color}88,
              0 0 16px ${color}44,
              2px 2px 0 #000,
              -1px -1px 0 #000,
              1px -1px 0 #000,
              -1px 1px 0 #000
            `,
            opacity: opacity,
            transform: `scale(${isCrit ? 1.2 : 1})`,
            whiteSpace: "nowrap",
            letterSpacing: "1px",
          }}
        >
          {isCrit ? ` -${damage}` : `-${damage}`}
        </div>
      </Html>
    </group>
  );
};

export default FloatingDamage;
