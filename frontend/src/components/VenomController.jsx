import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  interactionGroups,
} from "@react-three/rapier";
import Character from "./ui/Character";
import TargetArrow from "./ui/TargetArrow";
import { useAtomValue } from "jotai";
import {
  gameState,
  gameOverAtom,
  blockIfTooClose,
  CHAR_BLOCK_RADIUS,
} from "../stores/gameStore";

const VENOM_MODEL = "models/character/Venom.glb";
const VENOM_SPAWN_SOUND = "sound/sound_venom.mp3";
const MOVE_SPEED = 20;
const ATTACK_RANGE = 5;
const PUNCH_DURATION = 900;
const PUNCH_COOLDOWN = 1500;
const DIE_ANIM_HOLD = 1500; // giữ animation Die trước khi fade
const FADE_DURATION = 2000; // thời gian fade opacity

const VENOM_ONE_SHOTS = ["Punch", "Die"];

// Stuck detection: nếu Venom định di chuyển nhưng vận tốc gần 0 → đang đâm tường
const STUCK_SPEED_THRESHOLD = 0.5;
const STUCK_FRAME_THRESHOLD = 20; // ~0.33s @ 60fps
const SIDESTEP_FRAMES = 45; // né 90° trong ~0.75s rồi thử lại

const VenomController = ({ id, spawnPosition, onDespawn }) => {
  const rigidBodyRef = useRef();
  const characterRef = useRef();
  const [animation, setAnimation] = useState("Idle");

  const punchLock = useRef(false);
  const punchTimer = useRef(null);
  const isDead = useRef(false);
  const isFalling = useRef(true);
  const fallStarted = useRef(false);
  const fallStartTime = useRef(performance.now());
  const landedFrames = useRef(0);
  const gameOver = useAtomValue(gameOverAtom);
  const prevGameOverRef = useRef(false);
  const entryRef = useRef(null);
  const dieStartRef = useRef(0);
  const [opacity, setOpacity] = useState(1);
  const [isTargeted, setIsTargeted] = useState(false);
  const stuckFramesRef = useRef(0);
  const sidestepDirRef = useRef(0); // 0 = off, +1/-1 = hướng né
  const sidestepFramesRef = useRef(0);

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
      if (gameState.targetedVenomId === id) gameState.targetedVenomId = null;
      clearTimeout(punchTimer.current);
    };
  }, [id, spawnPosition.x, spawnPosition.y, spawnPosition.z]);

  useFrame(() => {
    if (!rigidBodyRef.current || !entryRef.current) return;

    // Sync target flag mỗi frame
    const shouldBeTargeted =
      gameState.targetedVenomId === id && !isDead.current;
    if (shouldBeTargeted !== isTargeted) {
      setIsTargeted(shouldBeTargeted);
    }

    // Play Again: gameOver chuyển true → false → reset combat state, giữ vị trí
    if (prevGameOverRef.current && !gameOver) {
      const entry = entryRef.current;
      isDead.current = false;
      punchLock.current = false;
      // Không reset isFalling — Venom đã trên mặt đất thì tiếp tục tấn công
      // Chỉ reset falling nếu Venom đang thực sự rơi
      if (!isFalling.current) {
        // Venom đã hạ cánh → sẵn sàng tấn công ngay
        fallStarted.current = false;
        landedFrames.current = 0;
      }
      clearTimeout(punchTimer.current);
      entry.hp = 15;
      entry.isAttacking = false;
      entry.attackType = null;
      entry.hitDealt = false;
      stuckFramesRef.current = 0;
      sidestepDirRef.current = 0;
      sidestepFramesRef.current = 0;
      setOpacity(1);
      setAnimation("Idle");
      prevGameOverRef.current = false;
    }
    prevGameOverRef.current = gameOver;

    // Game Over: dừng mọi hành động, chỉ hiển thị Idle
    if (gameOver) {
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      punchLock.current = false;
      clearTimeout(punchTimer.current);
      const entry = entryRef.current;
      entry.isAttacking = false;
      entry.attackType = null;
      setAnimation("Idle");
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
      if (gameState.targetedVenomId === id) gameState.targetedVenomId = null;
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
      // Lock horizontal movement — only allow gravity (vertical)
      rigidBodyRef.current.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
      setAnimation("Idle");
      entry.isAttacking = false;
      entry.attackType = null;
      // Track that fall has begun (velocity going down)
      if (velocity.y < -1) fallStarted.current = true;
      // Minimum fall time: at least 800ms before allowing landing
      const fallElapsed = performance.now() - fallStartTime.current;
      const minFallTimeMet = fallElapsed > 800;
      // Check if grounded: very small vertical velocity
      if (fallStarted.current && minFallTimeMet && Math.abs(velocity.y) < 0.1) {
        landedFrames.current++;
        // Require 5 consecutive grounded frames to confirm landing
        if (landedFrames.current >= 5) {
          isFalling.current = false;
          fallStarted.current = false;
          landedFrames.current = 0;
        }
      } else {
        landedFrames.current = 0;
      }
      return;
    }

    if (dist > ATTACK_RANGE && !punchLock.current) {
      // Stuck detection: setLinvel set velocity trực tiếp, nhưng khi va tường
      // physics engine xoá component theo normal → linvel().xz sẽ ~0.
      const horizontalSpeed = Math.sqrt(
        velocity.x * velocity.x + velocity.z * velocity.z,
      );
      if (horizontalSpeed < STUCK_SPEED_THRESHOLD) {
        stuckFramesRef.current++;
      } else if (sidestepFramesRef.current === 0) {
        stuckFramesRef.current = 0;
      }

      // Kích hoạt sidestep khi stuck đủ lâu
      if (
        sidestepDirRef.current === 0 &&
        stuckFramesRef.current > STUCK_FRAME_THRESHOLD
      ) {
        sidestepDirRef.current = Math.random() > 0.5 ? 1 : -1;
        sidestepFramesRef.current = SIDESTEP_FRAMES;
      }

      let nx = (dx / dist) * MOVE_SPEED;
      let nz = (dz / dist) * MOVE_SPEED;

      // Đang sidestep → xoay hướng di chuyển 90° để đi dọc tường
      if (sidestepFramesRef.current > 0) {
        const angle = sidestepDirRef.current * (Math.PI / 2);
        const cs = Math.cos(angle);
        const sn = Math.sin(angle);
        const rx = nx * cs - nz * sn;
        const rz = nx * sn + nz * cs;
        nx = rx;
        nz = rz;
        sidestepFramesRef.current--;
        if (sidestepFramesRef.current <= 0) {
          sidestepDirRef.current = 0;
          stuckFramesRef.current = 0;
        }
      }

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
      stuckFramesRef.current = 0;
      sidestepDirRef.current = 0;
      sidestepFramesRef.current = 0;
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
        args={[8.3, 5.5]}
        position={[0, 13.7, 0]}
        collisionGroups={interactionGroups([0], [1])}
      />
      <group ref={characterRef}>
        <Character
          modelPath={VENOM_MODEL}
          animation={animation}
          scale={10}
          oneShotList={VENOM_ONE_SHOTS}
          opacity={opacity}
        />
      </group>
      {isTargeted && <TargetArrow />}
    </RigidBody>
  );
};

export default VenomController;
