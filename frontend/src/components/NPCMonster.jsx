import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  interactionGroups,
  useRapier,
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
import { getNpcById, getDefaultNpc } from "../config/npcRegistry";

const PUNCH_DURATION = 900;
const PUNCH_COOLDOWN = 1500;
const DIE_ANIM_HOLD = 1500; // giữ animation Die trước khi fade
const FADE_DURATION = 2000; // thời gian fade opacity

// Stuck detection
const STUCK_SPEED_THRESHOLD = 0.5;
const STUCK_FRAME_THRESHOLD = 20; // ~0.33s @ 60fps

// Wall-avoidance raycasting
const WALL_RAY_DIST = 14;            // how far ahead to detect walls
const WALL_STEER_ANGLE = Math.PI / 3; // max steering angle (~60°)
const ESCAPE_RAY_COUNT = 12;          // directions to scan when stuck
const ESCAPE_RAY_DIST = 30;           // max scan distance for escape
const WANDER_ARRIVE_DIST = 5;         // close enough to wander target
const WANDER_TIMEOUT_FRAMES = 180;    // ~3s @ 60fps — give up on wander

const NPCMonster = ({ id, spawnPosition, onDespawn, npcId }) => {
  // Lấy config từ NPC Registry theo npcId, fallback về NPC mặc định
  const npcConfig = getNpcById(npcId) || getDefaultNpc();

  const rigidBodyRef = useRef();
  const characterRef = useRef();
  const [animation, setAnimation] = useState(npcConfig.animations.idle);

  const punchLock = useRef(false);
  const punchTimer = useRef(null);
  const isDead = useRef(false);
  const isFalling = useRef(true);
  const fallStarted = useRef(false);
  const fallStartTime = useRef(0);
  const landedFrames = useRef(0);
  const gameOver = useAtomValue(gameOverAtom);
  const prevGameOverRef = useRef(false);
  const entryRef = useRef(null);
  const dieStartRef = useRef(0);
  const [opacity, setOpacity] = useState(1);
  const [isTargeted, setIsTargeted] = useState(false);
  const stuckFramesRef = useRef(0);
  const wanderTargetRef = useRef(null); // {x, z} escape waypoint
  const wanderFramesRef = useRef(0);

  const { world, rapier } = useRapier();

  // Destructure config values for easy access
  const {
    modelPath,
    hp: initialHp,
    scale,
    damage,
    moveSpeed,
    attackRange,
    capsuleHalfHeight,
    capsuleRadius,
    capsuleOffsetY,
    animations: animNames,
    oneShotAnims,
    spawnSound,
  } = npcConfig;

  // Play spawn sound khi NPC monster xuất hiện
  useEffect(() => {
    if (spawnSound) {
      const audio = new Audio(spawnSound);
      audio.volume = 0.5;
      audio.play().catch(() => { });
    }
  }, []);

  useEffect(() => {
    const entry = {
      id,
      position: { x: spawnPosition.x, y: spawnPosition.y, z: spawnPosition.z },
      isAttacking: false,
      attackType: null,
      hitDealt: false,
      hp: initialHp,
      damage,
    };
    gameState.NPC.push(entry);
    entryRef.current = entry;
    fallStartTime.current = performance.now();
    return () => {
      const idx = gameState.NPC.indexOf(entry);
      if (idx >= 0) gameState.NPC.splice(idx, 1);
      if (gameState.targetedNPCId === id) gameState.targetedNPCId = null;
      clearTimeout(punchTimer.current);
    };
  }, [id, spawnPosition.x, spawnPosition.y, spawnPosition.z]);

  useFrame(() => {
    if (!rigidBodyRef.current || !entryRef.current) return;

    // Sync target flag mỗi frame
    const shouldBeTargeted =
      gameState.targetedNPCId === id && !isDead.current;
    if (shouldBeTargeted !== isTargeted) {
      setIsTargeted(shouldBeTargeted);
    }

    // Play Again: gameOver chuyển true → false → reset combat state, giữ vị trí
    if (prevGameOverRef.current && !gameOver) {
      const entry = entryRef.current;
      isDead.current = false;
      punchLock.current = false;
      // Không reset isFalling — NPC monster đã trên mặt đất thì tiếp tục tấn công
      // Chỉ reset falling nếu NPC monster đang thực sự rơi
      if (!isFalling.current) {
        // NPC monster đã hạ cánh → sẵn sàng tấn công ngay
        fallStarted.current = false;
        landedFrames.current = 0;
      }
      clearTimeout(punchTimer.current);
      entry.hp = initialHp;
      entry.isAttacking = false;
      entry.attackType = null;
      entry.hitDealt = false;
      stuckFramesRef.current = 0;
      wanderTargetRef.current = null;
      wanderFramesRef.current = 0;
      setOpacity(1);
      setAnimation(animNames.idle);
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
      setAnimation(animNames.idle);
      return;
    }

    const entry = entryRef.current;

    // Death handling — play Die anim, hold, then fade opacity → despawn
    if (entry.hp <= 0 && !isDead.current) {
      isDead.current = true;
      dieStartRef.current = performance.now();
      setAnimation(animNames.die);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      entry.isAttacking = false;
      entry.attackType = null;
      punchLock.current = false;
      clearTimeout(punchTimer.current);
      if (gameState.targetedNPCId === id) gameState.targetedNPCId = null;
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
    const NPCPos = rigidBodyRef.current.translation();
    const userheroPos = gameState.userhero.position;

    const dx = userheroPos.x - NPCPos.x;
    const dz = userheroPos.z - NPCPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    entry.position.x = NPCPos.x;
    entry.position.y = NPCPos.y;
    entry.position.z = NPCPos.z;

    if (characterRef.current && dist > 0.1) {
      characterRef.current.rotation.y = Math.atan2(dx, dz);
    }

    const clampedY = Math.min(velocity.y, 15);

    if (isFalling.current) {
      // Lock horizontal movement — only allow gravity (vertical)
      rigidBodyRef.current.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
      setAnimation(animNames.idle);
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

    if (dist > attackRange && !punchLock.current) {
      // ── Helper: cast horizontal ray from NPC center ──
      const rayY = NPCPos.y + capsuleOffsetY;
      const castRay = (angle, maxDist) => {
        if (!world || !rapier) return maxDist;
        const ray = new rapier.Ray(
          { x: NPCPos.x, y: rayY, z: NPCPos.z },
          { x: Math.sin(angle), y: 0, z: Math.cos(angle) },
        );
        const hit = world.castRay(
          ray, maxDist, true, undefined,
          interactionGroups([2], [1]),
          rigidBodyRef.current?.collider(0),
          rigidBodyRef.current,
        );
        return hit ? hit.timeOfImpact : maxDist;
      };

      // ── Stuck detection ──
      const horizontalSpeed = Math.sqrt(
        velocity.x * velocity.x + velocity.z * velocity.z,
      );
      if (horizontalSpeed < STUCK_SPEED_THRESHOLD) {
        stuckFramesRef.current++;
      } else if (!wanderTargetRef.current) {
        stuckFramesRef.current = 0;
      }

      // ── Wander mode: navigate to escape waypoint ──
      if (wanderTargetRef.current) {
        wanderFramesRef.current++;
        const wdx = wanderTargetRef.current.x - NPCPos.x;
        const wdz = wanderTargetRef.current.z - NPCPos.z;
        const wDist = Math.sqrt(wdx * wdx + wdz * wdz);

        if (wDist < WANDER_ARRIVE_DIST || wanderFramesRef.current > WANDER_TIMEOUT_FRAMES) {
          // Arrived or timeout → resume pursuit
          wanderTargetRef.current = null;
          wanderFramesRef.current = 0;
          stuckFramesRef.current = 0;
        } else {
          // Still stuck during wander → pick new escape
          if (stuckFramesRef.current > STUCK_FRAME_THRESHOLD) {
            wanderTargetRef.current = null;
            wanderFramesRef.current = 0;
            // stuckFramesRef stays high → will trigger escape below
          } else {
            let wnx = (wdx / wDist) * moveSpeed;
            let wnz = (wdz / wDist) * moveSpeed;
            [wnx, wnz] = blockIfTooClose(
              NPCPos.x, NPCPos.z, wnx, wnz,
              userheroPos.x, userheroPos.z, CHAR_BLOCK_RADIUS,
            );
            if (characterRef.current) {
              characterRef.current.rotation.y = Math.atan2(wdx, wdz);
            }
            rigidBodyRef.current.setLinvel({ x: wnx, y: clampedY, z: wnz }, true);
            setAnimation(animNames.run);
            entry.isAttacking = false;
            entry.attackType = null;
            return;
          }
        }
      }

      // ── Escape: cast rays in 12 directions to find best open path ──
      if (stuckFramesRef.current > STUCK_FRAME_THRESHOLD) {
        const pursuitAngle = Math.atan2(dx, dz);
        let bestAngle = pursuitAngle;
        let bestScore = -1;

        for (let i = 0; i < ESCAPE_RAY_COUNT; i++) {
          const angle = (i / ESCAPE_RAY_COUNT) * Math.PI * 2;
          const hitDist = castRay(angle, ESCAPE_RAY_DIST);
          // Prefer directions toward player + most open space
          const toPlayerDot = Math.cos(angle - pursuitAngle);
          const score = hitDist * (1 + Math.max(0, toPlayerDot) * 0.3);
          if (score > bestScore) {
            bestScore = score;
            bestAngle = angle;
          }
        }

        const wanderDist = Math.min(bestScore * 0.6, 20);
        if (wanderDist > 3) {
          wanderTargetRef.current = {
            x: NPCPos.x + Math.sin(bestAngle) * wanderDist,
            z: NPCPos.z + Math.cos(bestAngle) * wanderDist,
          };
          wanderFramesRef.current = 0;
        }
        stuckFramesRef.current = 0;
        return;
      }

      // ── Proactive wall steering with raycasts ──
      const pursuitAngle = Math.atan2(dx, dz);
      const fwdDist = castRay(pursuitAngle, WALL_RAY_DIST);

      let pursuitX, pursuitZ;
      if (fwdDist < WALL_RAY_DIST * 0.6) {
        // Wall ahead — check left vs right to choose best steer direction
        const leftDist = castRay(pursuitAngle + Math.PI / 5, WALL_RAY_DIST);
        const rightDist = castRay(pursuitAngle - Math.PI / 5, WALL_RAY_DIST);
        const leftDist2 = castRay(pursuitAngle + Math.PI / 3, WALL_RAY_DIST);
        const rightDist2 = castRay(pursuitAngle - Math.PI / 3, WALL_RAY_DIST);

        const leftOpen = leftDist + leftDist2;
        const rightOpen = rightDist + rightDist2;
        const steerSign = leftOpen >= rightOpen ? 1 : -1;
        // Stronger steer when wall is closer
        const closeness = 1 - fwdDist / (WALL_RAY_DIST * 0.6);
        const steerAngle = pursuitAngle + steerSign * WALL_STEER_ANGLE * (0.5 + closeness);
        pursuitX = Math.sin(steerAngle) * moveSpeed;
        pursuitZ = Math.cos(steerAngle) * moveSpeed;
      } else {
        // No wall — direct pursuit
        pursuitX = (dx / dist) * moveSpeed;
        pursuitZ = (dz / dist) * moveSpeed;
      }

      // ── Separation steering (tránh NPC khác) ──
      const SEPARATION_RADIUS = 15;
      const SEPARATION_STRENGTH = 1.5;
      let sepX = 0;
      let sepZ = 0;
      let sepCount = 0;

      for (const other of gameState.NPC) {
        if (other === entry || other.hp <= 0) continue;
        const ox = NPCPos.x - other.position.x;
        const oz = NPCPos.z - other.position.z;
        const oDist = Math.sqrt(ox * ox + oz * oz);
        if (oDist > 0.01 && oDist < SEPARATION_RADIUS) {
          const weight = (1 - oDist / SEPARATION_RADIUS);
          const w2 = weight * weight;
          sepX += (ox / oDist) * w2;
          sepZ += (oz / oDist) * w2;
          sepCount++;
        }
      }

      if (sepCount > 0) {
        const sepLen = Math.sqrt(sepX * sepX + sepZ * sepZ);
        if (sepLen > 0.01) {
          sepX = (sepX / sepLen) * moveSpeed * SEPARATION_STRENGTH;
          sepZ = (sepZ / sepLen) * moveSpeed * SEPARATION_STRENGTH;
        }
      }

      // Blend pursuit + separation
      let nx = pursuitX + sepX;
      let nz = pursuitZ + sepZ;

      // Normalize — không chạy nhanh hơn moveSpeed
      const blendLen = Math.sqrt(nx * nx + nz * nz);
      if (blendLen > moveSpeed) {
        nx = (nx / blendLen) * moveSpeed;
        nz = (nz / blendLen) * moveSpeed;
      }

      // Anti-overlap: chặn với User hero
      [nx, nz] = blockIfTooClose(
        NPCPos.x, NPCPos.z, nx, nz,
        userheroPos.x, userheroPos.z, CHAR_BLOCK_RADIUS,
      );
      rigidBodyRef.current.setLinvel({ x: nx, y: clampedY, z: nz }, true);
      setAnimation(animNames.run);
      entry.isAttacking = false;
      entry.attackType = null;
    } else if (dist <= attackRange && !punchLock.current) {
      rigidBodyRef.current.setLinvel({ x: 0, y: clampedY, z: 0 }, true);
      punchLock.current = true;
      stuckFramesRef.current = 0;
      wanderTargetRef.current = null;
      wanderFramesRef.current = 0;
      setAnimation(animNames.attack);
      entry.isAttacking = true;
      entry.attackType = animNames.attack;
      entry.hitDealt = false;

      clearTimeout(punchTimer.current);
      punchTimer.current = setTimeout(() => {
        entry.isAttacking = false;
        entry.attackType = null;
        setAnimation(animNames.idle);
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
        args={[capsuleHalfHeight, capsuleRadius]}
        position={[0, capsuleOffsetY, 0]}
        collisionGroups={interactionGroups([2], [0, 1])}
      />
      <group ref={characterRef}>
        <Character
          modelPath={modelPath}
          animation={animation}
          scale={scale}
          oneShotList={oneShotAnims}
          opacity={opacity}
        />
      </group>
      {isTargeted && <TargetArrow />}
    </RigidBody>
  );
};

export default NPCMonster;
