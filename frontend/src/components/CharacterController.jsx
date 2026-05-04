import { useRef, useState, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  interactionGroups,
  useRapier,
} from "@react-three/rapier";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import Character from "./ui/Character";
import FloatingDamage from "./ui/FloatingDamage";
import { Vector3 } from "three";
import { useSetAtom, useAtomValue } from "jotai";
import {
  spidermanHpAtom,
  venomHpAtom,
  gameOverAtom,
  winnerAtom,
  gameState,
  blockIfTooClose,
  CHAR_BLOCK_RADIUS,
} from "../stores/gameStore";

const MOVE_SPEED = 13;
const CAMERA_OFFSET = { x: 10, y: 5, z: -20 };
const SPIDERMAN_MODEL = "models/character/Spiderman.glb";
const ATTACK_RANGE = 5;
const SPIDERMAN_ONE_SHOTS = [
  "Punch",
  "Kick",
  "KickMMA",
  "ComboPunch",
  "Jump",
  "Die",
];
const SPIDERMAN_DAMAGE = { Punch: 1, Kick: 1, KickMMA: 3, ComboPunch: 3 };
const PUNCH_SOUND_SRC = "/sound/sound_punch.mp3";
const RUN_SOUND_SRC = "/sound/sound_run.MP3";
const SPIDERMAN_SPAWN = { x: -51.48, y: -2.26, z: 311.29 };

const CharacterController = ({ cameraControlsRef }) => {
  const rigidBodyRef = useRef();
  const characterRef = useRef();
  const [animation, setAnimation] = useState("Idle");
  const [damagePopups, setDamagePopups] = useState([]);
  const damageIdRef = useRef(0);
  const keys = useKeyboardControls();
  const { world, rapier } = useRapier();

  const jumpLock = useRef(false);
  const punchLock = useRef(false);
  const kickLock = useRef(false);
  const kickMMALock = useRef(false);
  const comboPunchLock = useRef(false);
  const jumpTimer = useRef(null);
  const punchTimer = useRef(null);
  const kickTimer = useRef(null);
  const kickMMATimer = useRef(null);
  const comboPunchTimer = useRef(null);
  const punchSoundRef = useRef(null);
  const runSoundRef = useRef(null);
  const wasMovingRef = useRef(false);

  const playPunchSound = useCallback(() => {
    if (!punchSoundRef.current) {
      punchSoundRef.current = new Audio(PUNCH_SOUND_SRC);
      punchSoundRef.current.volume = 0.8;
    }
    try {
      punchSoundRef.current.currentTime = 0;
      punchSoundRef.current.play();
    } catch {
      // ignore autoplay errors
    }
  }, []);

  // Initialize run sound once
  useEffect(() => {
    const audio = new Audio(RUN_SOUND_SRC);
    audio.loop = true;
    audio.volume = 0.4;
    runSoundRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);
  const prevKeys = useRef({
    punch: false,
    kick: false,
    kickMMA: false,
    comboPunch: false,
    jump: false,
  });
  const hpRef = useRef(100);
  const isDead = useRef(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const onDown = () => {
      isDraggingRef.current = true;
    };
    const onUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onUp);
    };
  }, []);

  const setSpidermanHp = useSetAtom(spidermanHpAtom);
  const setVenomHp = useSetAtom(venomHpAtom);
  const setGameOver = useSetAtom(gameOverAtom);
  const setWinner = useSetAtom(winnerAtom);
  const gameOver = useAtomValue(gameOverAtom);
  const prevGameOver = useRef(false);

  const takeDamage = useCallback(
    (amount) => {
      if (isDead.current) return;
      hpRef.current = Math.max(0, hpRef.current - amount);
      setSpidermanHp(hpRef.current);
      if (hpRef.current <= 0) {
        isDead.current = true;
        setGameOver(true);
        setWinner("Venom");
      }
    },
    [setSpidermanHp, setGameOver, setWinner],
  );

  const dealDamageToVenom = useCallback(
    (entry, amount) => {
      const currentHp = entry.hp ?? 100;
      const newHp = Math.max(0, currentHp - amount);
      entry.hp = newHp;
      setVenomHp(newHp);
    },
    [setVenomHp],
  );

  useFrame(() => {
    if (!rigidBodyRef.current) return;

    // Reset khi Play Again (gameOver chuyển từ true -> false)
    if (prevGameOver.current && !gameOver) {
      isDead.current = false;
      hpRef.current = 100;
      jumpLock.current = false;
      punchLock.current = false;
      kickLock.current = false;
      kickMMALock.current = false;
      comboPunchLock.current = false;
      clearTimeout(jumpTimer.current);
      clearTimeout(punchTimer.current);
      clearTimeout(kickTimer.current);
      clearTimeout(kickMMATimer.current);
      clearTimeout(comboPunchTimer.current);
      rigidBodyRef.current.setTranslation(SPIDERMAN_SPAWN, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      gameState.targetedVenomId = null;
      prevGameOver.current = false;
    }
    prevGameOver.current = gameOver;

    // Dead state
    if (isDead.current) {
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      setAnimation("Die");
      // Dừng sound chạy khi chết
      if (runSoundRef.current) {
        runSoundRef.current.pause();
        wasMovingRef.current = false;
      }
      return;
    }

    const velocity = rigidBodyRef.current.linvel();

    // Hướng di chuyển cố định theo offset camera ban đầu (không phụ thuộc xoay camera)
    const camForward = new Vector3(
      -CAMERA_OFFSET.x,
      0,
      -CAMERA_OFFSET.z,
    ).normalize();
    const camRight = new Vector3();
    camRight.crossVectors(camForward, new Vector3(0, 1, 0)).normalize();

    let moveX = 0;
    let moveZ = 0;

    if (keys.current.forward) {
      moveX += camForward.x;
      moveZ += camForward.z;
    }
    if (keys.current.backward) {
      moveX -= camForward.x;
      moveZ -= camForward.z;
    }
    if (keys.current.left) {
      moveX -= camRight.x;
      moveZ -= camRight.z;
    }
    if (keys.current.right) {
      moveX += camRight.x;
      moveZ += camRight.z;
    }

    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
      moveX = (moveX / length) * MOVE_SPEED;
      moveZ = (moveZ / length) * MOVE_SPEED;
    }

    const isMoving = length > 0;

    // Run sound: phát khi di chuyển, dừng khi đứng yên
    if (isMoving && !wasMovingRef.current) {
      // Bắt đầu di chuyển → play sound
      if (runSoundRef.current) {
        runSoundRef.current.currentTime = 0;
        runSoundRef.current.play().catch(() => { });
      }
    } else if (!isMoving && wasMovingRef.current) {
      // Ngừng di chuyển → pause sound
      if (runSoundRef.current) {
        runSoundRef.current.pause();
      }
    }
    wasMovingRef.current = isMoving;

    // Clamp Y velocity: không cho bị đẩy lên quá cao khi va bậc thềm
    let finalY = velocity.y;
    if (finalY > 0) {
      // Đang đi lên → giữ clamp thấp để không bay cao khi va bậc thang
      finalY = Math.min(finalY, 1);
    } else {
      // Đang rơi xuống → cho phép rơi nhanh (không để chậm nữa)
      finalY = Math.max(finalY, -102); // -52 là giá trị tốt để thử đầu tiên
    }
    // Anti-overlap: chặn component velocity hướng về venom đang ở quá gần
    const curPos = rigidBodyRef.current.translation();
    for (const entry of gameState.venoms) {
      if (entry.hp <= 0) continue;
      [moveX, moveZ] = blockIfTooClose(
        curPos.x,
        curPos.z,
        moveX,
        moveZ,
        entry.position.x,
        entry.position.z,
        CHAR_BLOCK_RADIUS,
      );
    }
    rigidBodyRef.current.setLinvel({ x: moveX, y: finalY, z: moveZ }, true);

    if (isMoving && characterRef.current) {
      const angle = Math.atan2(moveX, moveZ);
      characterRef.current.rotation.y = angle;
    }

    // Update shared position
    const pos = rigidBodyRef.current.translation();
    gameState.spiderman.position.x = pos.x;
    gameState.spiderman.position.y = pos.y;
    gameState.spiderman.position.z = pos.z;

    // Khi đứng yên và có Venom đang bị nhắm → quay mặt Spiderman về phía Venom đó.
    // Nếu target đã chết / không còn → clear targetedVenomId.
    if (gameState.targetedVenomId != null) {
      const target = gameState.venoms.find(
        (v) => v.id === gameState.targetedVenomId && v.hp > 0,
      );
      if (!target) {
        gameState.targetedVenomId = null;
      } else if (!isMoving && characterRef.current) {
        const dxt = target.position.x - pos.x;
        const dzt = target.position.z - pos.z;
        if (Math.abs(dxt) + Math.abs(dzt) > 0.01) {
          characterRef.current.rotation.y = Math.atan2(dxt, dzt);
        }
      }
    }

    // --- Edge detection: chỉ trigger khi nhấn lần đầu ---
    const justPressedJump = keys.current.jump && !prevKeys.current.jump;
    const justPressedPunch = keys.current.punch && !prevKeys.current.punch;
    const justPressedKick = keys.current.kick && !prevKeys.current.kick;
    const justPressedKickMMA =
      keys.current.kickMMA && !prevKeys.current.kickMMA;
    const justPressedComboPunch =
      keys.current.comboPunch && !prevKeys.current.comboPunch;
    prevKeys.current.jump = keys.current.jump;
    prevKeys.current.punch = keys.current.punch;
    prevKeys.current.kick = keys.current.kick;
    prevKeys.current.kickMMA = keys.current.kickMMA;
    prevKeys.current.comboPunch = keys.current.comboPunch;

    const anyAttackLock =
      punchLock.current ||
      kickLock.current ||
      kickMMALock.current ||
      comboPunchLock.current;

    // --- Animation priority ---
    if (justPressedJump && !jumpLock.current) {
      jumpLock.current = true;
      setAnimation("Jump");
      gameState.spiderman.isAttacking = false;
      gameState.spiderman.attackType = null;
      clearTimeout(jumpTimer.current);
      jumpTimer.current = setTimeout(() => {
        jumpLock.current = false;
      }, 1200);
    } else if (
      justPressedPunch &&
      !isMoving &&
      !anyAttackLock &&
      !jumpLock.current
    ) {
      punchLock.current = true;
      setAnimation("Punch");
      playPunchSound();
      gameState.spiderman.isAttacking = true;
      gameState.spiderman.attackType = "Punch";
      gameState.spiderman.hitDealt = false;
      clearTimeout(punchTimer.current);
      punchTimer.current = setTimeout(() => {
        punchLock.current = false;
        gameState.spiderman.isAttacking = false;
        gameState.spiderman.attackType = null;
      }, 800);
    } else if (
      justPressedKick &&
      !isMoving &&
      !anyAttackLock &&
      !jumpLock.current
    ) {
      kickLock.current = true;
      setAnimation("Kick");
      playPunchSound();
      gameState.spiderman.isAttacking = true;
      gameState.spiderman.attackType = "Kick";
      gameState.spiderman.hitDealt = false;
      clearTimeout(kickTimer.current);
      kickTimer.current = setTimeout(() => {
        kickLock.current = false;
        gameState.spiderman.isAttacking = false;
        gameState.spiderman.attackType = null;
      }, 1000);
    } else if (
      justPressedKickMMA &&
      !isMoving &&
      !anyAttackLock &&
      !jumpLock.current
    ) {
      kickMMALock.current = true;
      setAnimation("KickMMA");
      playPunchSound();
      gameState.spiderman.isAttacking = true;
      gameState.spiderman.attackType = "KickMMA";
      gameState.spiderman.hitDealt = false;
      clearTimeout(kickMMATimer.current);
      kickMMATimer.current = setTimeout(() => {
        kickMMALock.current = false;
        gameState.spiderman.isAttacking = false;
        gameState.spiderman.attackType = null;
      }, 1400);
    } else if (
      justPressedComboPunch &&
      !isMoving &&
      !anyAttackLock &&
      !jumpLock.current
    ) {
      comboPunchLock.current = true;
      setAnimation("ComboPunch");
      playPunchSound();
      gameState.spiderman.isAttacking = true;
      gameState.spiderman.attackType = "ComboPunch";
      gameState.spiderman.hitDealt = false;
      clearTimeout(comboPunchTimer.current);
      comboPunchTimer.current = setTimeout(() => {
        comboPunchLock.current = false;
        gameState.spiderman.isAttacking = false;
        gameState.spiderman.attackType = null;
      }, 1400);
    } else if (!jumpLock.current && !anyAttackLock) {
      setAnimation(isMoving ? "Run" : "Idle");
    }

    // --- Spiderman hits closest Venom in range ---
    if (gameState.spiderman.isAttacking && !gameState.spiderman.hitDealt) {
      const dmg = SPIDERMAN_DAMAGE[gameState.spiderman.attackType] ?? 1;
      let closestEntry = null;
      let closestDist = ATTACK_RANGE;
      for (const entry of gameState.venoms) {
        if (entry.hp <= 0) continue;
        const dx = pos.x - entry.position.x;
        const dz = pos.z - entry.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < closestDist) {
          closestDist = d;
          closestEntry = entry;
        }
      }
      if (closestEntry) {
        dealDamageToVenom(closestEntry, dmg);
        gameState.spiderman.hitDealt = true;
        gameState.targetedVenomId = closestEntry.id;
        // Floating damage popup
        const popupId = damageIdRef.current++;
        setDamagePopups((prev) => [
          ...prev,
          {
            id: popupId,
            damage: dmg,
            position: {
              x: closestEntry.position.x,
              y: closestEntry.position.y,
              z: closestEntry.position.z,
            },
          },
        ]);
      }
    }

    // --- Any Venom hits Spiderman ---
    for (const entry of gameState.venoms) {
      if (!entry.isAttacking || entry.hitDealt) continue;
      const dx = pos.x - entry.position.x;
      const dz = pos.z - entry.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < ATTACK_RANGE) {
        entry.hitDealt = true;
        takeDamage(0.5);
      }
    }

    // Camera follow (với raycast tránh toà nhà che)
    // Khi đang kéo chuột → để user tự xoay, thả ra thì follow lại (smooth).
    if (cameraControlsRef?.current && !isDraggingRef.current) {
      const targetY = pos.y + 3;
      const desiredX = pos.x + CAMERA_OFFSET.x;
      const desiredY = pos.y + CAMERA_OFFSET.y;
      const desiredZ = pos.z + CAMERA_OFFSET.z;

      let camX = desiredX;
      let camY = desiredY;
      let camZ = desiredZ;

      const dirX = desiredX - pos.x;
      const dirY = desiredY - targetY;
      const dirZ = desiredZ - pos.z;
      const dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

      if (dirLen > 0.0001 && world) {
        const nx = dirX / dirLen;
        const ny = dirY / dirLen;
        const nz = dirZ / dirLen;
        const ray = new rapier.Ray(
          { x: pos.x, y: targetY, z: pos.z },
          { x: nx, y: ny, z: nz },
        );
        const hit = world.castRay(
          ray,
          dirLen,
          true,
          undefined,
          interactionGroups([0], [1]),
          rigidBodyRef.current?.collider(0),
          rigidBodyRef.current,
        );
        if (hit) {
          const bias = 1.5;
          const safe = Math.max(0, hit.timeOfImpact - bias);
          camX = pos.x + nx * safe;
          camY = targetY + ny * safe;
          camZ = pos.z + nz * safe;
        }
      }

      cameraControlsRef.current.setLookAt(
        camX,
        camY,
        camZ,
        pos.x,
        pos.y,
        pos.z,
        true,
      );
    }
  });

  const handleDamageComplete = useCallback((popupId) => {
    setDamagePopups((prev) => prev.filter((p) => p.id !== popupId));
  }, []);

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        colliders={false}
        lockRotations
        type="dynamic"
        position={[SPIDERMAN_SPAWN.x, SPIDERMAN_SPAWN.y, SPIDERMAN_SPAWN.z]}
        restitution={0}
        friction={1}
      >
        <CapsuleCollider
          args={[1.3, 2.5]}
          position={[0, 3.811, 0]}
          collisionGroups={interactionGroups([0], [1])}
        />

        <group ref={characterRef}>
          <Character
            modelPath={SPIDERMAN_MODEL}
            animation={animation}
            scale={10}
            oneShotList={SPIDERMAN_ONE_SHOTS}
          />
        </group>
      </RigidBody>

      {/* Floating damage popups */}
      {damagePopups.map((popup) => (
        <FloatingDamage
          key={popup.id}
          id={popup.id}
          damage={popup.damage}
          position={popup.position}
          onComplete={handleDamageComplete}
        />
      ))}
    </>
  );
};

export default CharacterController;