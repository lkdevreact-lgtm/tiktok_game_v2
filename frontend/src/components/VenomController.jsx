import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  interactionGroups,
} from "@react-three/rapier";
import Character from "./ui/Character";
import { useAtomValue } from "jotai";
import {
  gameState,
  gameOverAtom,
  blockIfTooClose,
  CHAR_BLOCK_RADIUS,
} from "../stores/gameStore";

const VENOM_MODEL = "models/character/Venom.glb";
const VENOM_SPAWN_SOUND = "sound/sound_venom.mp3";
const MOVE_SPEED = 10;
const ATTACK_RANGE = 5;
const PUNCH_DURATION = 900;
const PUNCH_COOLDOWN = 1500;
const DIE_ANIM_HOLD = 1500; // giữ animation Die trước khi fade
const FADE_DURATION = 2000; // thời gian fade opacity

const VENOM_ONE_SHOTS = ["Punch", "Die"];

const VenomController = ({ id, spawnPosition, onDespawn }) => {
  const rigidBodyRef = useRef();
  const characterRef = useRef();
  const [animation, setAnimation] = useState("Idle");

  const punchLock = useRef(false);
  const punchTimer = useRef(null);
  const isDead = useRef(false);
  const isFalling = useRef(true);
  const fallStarted = useRef(false);
  const gameOver = useAtomValue(gameOverAtom);
  const entryRef = useRef(null);
  const dieStartRef = useRef(0);
  const [opacity, setOpacity] = useState(1);

  // Play spawn sound khi Venom xuất hiện
  useEffect(() => {
    const audio = new Audio(VENOM_SPAWN_SOUND);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }, []);

  useEffect(() => {
    const entry = {
      id,
      position: { x: spawnPosition.x, y: spawnPosition.y, z: spawnPosition.z },
      isAttacking: false,
      attackType: null,
      hitDealt: false,
      hp: 15,
    };
    gameState.venoms.push(entry);
    entryRef.current = entry;
    return () => {
      const idx = gameState.venoms.indexOf(entry);
      if (idx >= 0) gameState.venoms.splice(idx, 1);
      clearTimeout(punchTimer.current);
    };
  }, [id, spawnPosition.x, spawnPosition.y, spawnPosition.z]);

  useFrame(() => {
    if (!rigidBodyRef.current || !entryRef.current) return;
    if (gameOver) {
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    const entry = entryRef.current;

    // Death handling — play Die anim, hold, then fade opacity → despawn
    if (entry.hp <= 0 && !isDead.current) {
      isDead.current = true;
      dieStartRef.current = performance.now();
      setAnimation("Die");
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      entry.isAttacking = false;
      entry.attackType = null;
      punchLock.current = false;
      clearTimeout(punchTimer.current);
      return;
    }
    if (isDead.current) {
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      const elapsed = performance.now() - dieStartRef.current;
      if (elapsed > DIE_ANIM_HOLD) {
        const fadeT = Math.min(1, (elapsed - DIE_ANIM_HOLD) / FADE_DURATION);
        const newOpacity = 1 - fadeT;
        setOpacity(newOpacity);
        if (fadeT >= 1) {
          onDespawn?.(id);
        }
      }
      return;
    }

    const velocity = rigidBodyRef.current.linvel();
    const venomPos = rigidBodyRef.current.translation();
    const spiderPos = gameState.spiderman.position;

    const dx = spiderPos.x - venomPos.x;
    const dz = spiderPos.z - venomPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    entry.position.x = venomPos.x;
    entry.position.y = venomPos.y;
    entry.position.z = venomPos.z;

    if (characterRef.current && dist > 0.1) {
      characterRef.current.rotation.y = Math.atan2(dx, dz);
    }

    const clampedY = Math.min(velocity.y, 15);

    if (isFalling.current) {
      rigidBodyRef.current.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
      setAnimation("Idle");
      entry.isAttacking = false;
      entry.attackType = null;
      if (velocity.y < -1) fallStarted.current = true;
      if (fallStarted.current && Math.abs(velocity.y) < 0.5) {
        isFalling.current = false;
        fallStarted.current = false;
      }
      return;
    }

    if (dist > ATTACK_RANGE && !punchLock.current) {
      let nx = (dx / dist) * MOVE_SPEED;
      let nz = (dz / dist) * MOVE_SPEED;
      // Anti-overlap: chặn với Spiderman + các venom khác
      [nx, nz] = blockIfTooClose(
        venomPos.x,
        venomPos.z,
        nx,
        nz,
        spiderPos.x,
        spiderPos.z,
        CHAR_BLOCK_RADIUS,
      );
      for (const other of gameState.venoms) {
        if (other === entry || other.hp <= 0) continue;
        [nx, nz] = blockIfTooClose(
          venomPos.x,
          venomPos.z,
          nx,
          nz,
          other.position.x,
          other.position.z,
          CHAR_BLOCK_RADIUS,
        );
      }
      rigidBodyRef.current.setLinvel({ x: nx, y: clampedY, z: nz }, true);
      setAnimation("Run");
      entry.isAttacking = false;
      entry.attackType = null;
    } else if (dist <= ATTACK_RANGE && !punchLock.current) {
      rigidBodyRef.current.setLinvel({ x: 0, y: clampedY, z: 0 }, true);
      punchLock.current = true;
      setAnimation("Punch");
      entry.isAttacking = true;
      entry.attackType = "Punch";
      entry.hitDealt = false;

      clearTimeout(punchTimer.current);
      punchTimer.current = setTimeout(() => {
        entry.isAttacking = false;
        entry.attackType = null;
        setAnimation("Idle");
        setTimeout(() => {
          punchLock.current = false;
        }, PUNCH_COOLDOWN - PUNCH_DURATION);
      }, PUNCH_DURATION);
    } else if (punchLock.current) {
      rigidBodyRef.current.setLinvel({ x: 0, y: clampedY, z: 0 }, true);
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      lockRotations
      position={[spawnPosition.x, spawnPosition.y, spawnPosition.z]}
    >
      <CapsuleCollider
        args={[1.3, 2.8]}
        position={[0, 4.02, 0]}
        collisionGroups={interactionGroups([0], [1])}
      />
      <group ref={characterRef}>
        <Character
          modelPath={VENOM_MODEL}
          animation={animation}
          scale={3}
          oneShotList={VENOM_ONE_SHOTS}
          opacity={opacity}
        />
      </group>
    </RigidBody>
  );
};

export default VenomController;
