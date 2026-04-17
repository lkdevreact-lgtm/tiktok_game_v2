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
import { useAtomValue, useSetAtom } from "jotai";
import { gameState, gameOverAtom, venomHpAtom } from "../stores/gameStore";


const VENOM_MODEL = "models/character/Venom.glb";
const MOVE_SPEED = 30;
const ATTACK_RANGE = 18;
const PUNCH_DURATION = 900; // ms
const PUNCH_COOLDOWN = 1500; // ms between punches
const RESPAWN_DELAY = 5000; // ms after death
const RESPAWN_MIN_DIST = 40;
const RESPAWN_MAX_DIST = 70;

const VENOM_ONE_SHOTS = ["Punch", "Die"];

const randomSpawnNearSpiderman = () => {
  const sp = gameState.spiderman.position;
  const angle = Math.random() * Math.PI * 2;
  const dist =
    RESPAWN_MIN_DIST + Math.random() * (RESPAWN_MAX_DIST - RESPAWN_MIN_DIST);
  return {
    x: sp.x + Math.cos(angle) * dist,
    y: 20,
    z: sp.z + Math.sin(angle) * dist,
  };
};

const VenomController = () => {
  const rigidBodyRef = useRef();
  const characterRef = useRef();
  const [animation, setAnimation] = useState("Idle");

  const punchLock = useRef(false);
  const punchTimer = useRef(null);
  const respawnTimer = useRef(null);
  const isDead = useRef(false);
  const hasInitialized = useRef(false);
  const gameOver = useAtomValue(gameOverAtom);
  const setVenomHp = useSetAtom(venomHpAtom);
  const prevGameOver = useRef(false);

  useFrame(() => {
    if (!rigidBodyRef.current) return;

    // Spawn near Spiderman on first frame (after shared position is populated)
    if (!hasInitialized.current) {
      const sp = gameState.spiderman.position;
      if (sp.x !== 0 || sp.z !== -1) {
        hasInitialized.current = true;
        const spawn = randomSpawnNearSpiderman();
        rigidBodyRef.current.setTranslation(spawn, true);
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }

    // Reset khi Play Again
    if (prevGameOver.current && !gameOver) {
      isDead.current = false;
      punchLock.current = false;
      clearTimeout(punchTimer.current);
      clearTimeout(respawnTimer.current);
      const spawn = randomSpawnNearSpiderman();
      rigidBodyRef.current.setTranslation(spawn, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      gameState.venom.hp = 100;
      setVenomHp(100);
      setAnimation("Idle");
      prevGameOver.current = false;
    }
    prevGameOver.current = gameOver;

    // Check if dead — start respawn timer and stay idle
    const venomHp = gameState.venom.hp ?? 100;
    if (venomHp <= 0 && !isDead.current) {
      isDead.current = true;
      setAnimation("Die");
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      gameState.venom.isAttacking = false;
      gameState.venom.attackType = null;
      punchLock.current = false;
      clearTimeout(punchTimer.current);

      clearTimeout(respawnTimer.current);
      respawnTimer.current = setTimeout(() => {
        const spawn = randomSpawnNearSpiderman();
        rigidBodyRef.current?.setTranslation(spawn, true);
        rigidBodyRef.current?.setLinvel({ x: 0, y: 0, z: 0 }, true);
        gameState.venom.hp = 100;
        setVenomHp(100);
        isDead.current = false;
        setAnimation("Idle");
      }, RESPAWN_DELAY);
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

    // Clamp Y velocity: không cho bị đẩy lên quá cao khi va bậc thềm
    const clampedY = Math.min(velocity.y, 15);

    // AI behavior
    if (dist > ATTACK_RANGE && !punchLock.current) {
      // Run toward Spiderman
      const nx = (dx / dist) * MOVE_SPEED;
      const nz = (dz / dist) * MOVE_SPEED;
      rigidBodyRef.current.setLinvel({ x: nx, y: clampedY, z: nz }, true);
      setAnimation("Run");
      gameState.venom.isAttacking = false;
      gameState.venom.attackType = null;
    } else if (dist <= ATTACK_RANGE && !punchLock.current) {
      // Punch!
      rigidBodyRef.current.setLinvel({ x: 0, y: clampedY, z: 0 }, true);
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
      rigidBodyRef.current.setLinvel({ x: 0, y: clampedY, z: 0 }, true);
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      lockRotations
      position={[-20, -10, 50]}
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
