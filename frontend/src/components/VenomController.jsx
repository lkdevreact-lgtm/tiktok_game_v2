import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  CuboidCollider,
  RigidBody,
  interactionGroups,
} from "@react-three/rapier";
import Character from "./ui/Character";
import { Vector3 } from "three";
import { gameState } from "../stores/gameStore";

const VENOM_MODEL = "models/character/Venom.glb";
const MOVE_SPEED = 30;
const ATTACK_RANGE = 20;
const PUNCH_DURATION = 900; // ms
const PUNCH_COOLDOWN = 1500; // ms between punches

const VENOM_ONE_SHOTS = ["Punch", "Die"];

const VenomController = () => {
  const rigidBodyRef = useRef();
  const characterRef = useRef();
  const [animation, setAnimation] = useState("Idle");

  const punchLock = useRef(false);
  const punchTimer = useRef(null);
  const isDead = useRef(false);

  useFrame(() => {
    if (!rigidBodyRef.current) return;

    // Check if dead
    const venomHp = gameState.venom.hp ?? 100;
    if (venomHp <= 0 && !isDead.current) {
      isDead.current = true;
      setAnimation("Die");
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      gameState.venom.isAttacking = false;
      gameState.venom.attackType = null;
      return;
    }
    if (isDead.current) {
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    const velocity = rigidBodyRef.current.linvel();
    const venomPos = rigidBodyRef.current.translation();
    const spiderPos = gameState.spiderman.position;

    // Direction toward Spiderman
    const dx = spiderPos.x - venomPos.x;
    const dz = spiderPos.z - venomPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Update shared position
    gameState.venom.position.x = venomPos.x;
    gameState.venom.position.y = venomPos.y;
    gameState.venom.position.z = venomPos.z;

    // Face Spiderman
    if (characterRef.current && dist > 0.1) {
      const angle = Math.atan2(dx, dz);
      characterRef.current.rotation.y = angle;
    }

    // AI behavior
    if (dist > ATTACK_RANGE && !punchLock.current) {
      // Run toward Spiderman
      const nx = (dx / dist) * MOVE_SPEED;
      const nz = (dz / dist) * MOVE_SPEED;
      rigidBodyRef.current.setLinvel({ x: nx, y: velocity.y, z: nz }, true);
      setAnimation("Run");
      gameState.venom.isAttacking = false;
      gameState.venom.attackType = null;
    } else if (dist <= ATTACK_RANGE && !punchLock.current) {
      // Punch!
      rigidBodyRef.current.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
      punchLock.current = true;
      setAnimation("Punch");
      gameState.venom.isAttacking = true;
      gameState.venom.attackType = "Punch";
      gameState.venom.hitDealt = false;

      clearTimeout(punchTimer.current);
      punchTimer.current = setTimeout(() => {
        gameState.venom.isAttacking = false;
        gameState.venom.attackType = null;
        setAnimation("Idle");
        // Cooldown before next punch
        setTimeout(() => {
          punchLock.current = false;
        }, PUNCH_COOLDOWN - PUNCH_DURATION);
      }, PUNCH_DURATION);
    } else if (punchLock.current) {
      // Stay still while punching/cooldown
      rigidBodyRef.current.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      lockRotations
      position={[-20, 5, 50]}
    >
      <CapsuleCollider args={[8.9, 10]} position={[0, 18, 0]} collisionGroups={interactionGroups([0], [1])} />
      <group ref={characterRef}>
        <Character
          modelPath={VENOM_MODEL}
          animation={animation}
          scale={12}
          oneShotList={VENOM_ONE_SHOTS}
        />
      </group>
    </RigidBody>
  );
};

export default VenomController;
