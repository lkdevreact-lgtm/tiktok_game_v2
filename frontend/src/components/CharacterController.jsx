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
  userHeroHpAtom,
  gameOverAtom,
  winnerAtom,
  gameState,
  blockIfTooClose,
  CHAR_BLOCK_RADIUS,
  NPCHpAtom,
} from "../stores/gameStore";

const MOVE_SPEED = 30;
// --- Third-person camera (offset cố định theo HƯỚNG nhân vật, không theo world) ---
const CAMERA_DISTANCE = 50;        // Khoảng cách camera phía sau lưng nhân vật
const CAMERA_HEIGHT = 18;          // Camera cao hơn nhân vật bao nhiêu
const CAMERA_LOOK_HEIGHT = 8;      // Điểm look-at (cao hơn gốc nhân vật)
const CAMERA_POS_LERP = 0.12;      // Hệ số lerp vị trí camera (0..1) — nhỏ = mượt hơn
const CAMERA_COLLISION_BIAS = 1.5; // Đệm tránh xuyên tường khi raycast
const CAMERA_MIN_DISTANCE = 5;     // Khoảng cách tối thiểu khi va chạm
// --- Steering controls (A/D quay, W/S tiến/lật-180-tiến) ---
const TURN_SPEED = 3.0;            // Tốc độ quay khi nhấn A/D (radian/giây)
const HEADING_LERP = 0.18;         // Hệ số lerp giữa heading hiện tại và target — nhỏ = quay mượt hơn
const JUMP_FORCE = 25;
const ATTACK_LUNGE_SPEED = 6;
const USER_HERO_MODEL = "models/character/Yaski.glb";
const ATTACK_RANGE = 5;
const USER_HERO_ONE_SHOTS = [
  "Punch",
  "Kick",
  "KickUp",
  "HookPunch",
  "Jump",
  "Die",
];
const USER_HERO_DAMAGE = { Punch: 1, Kick: 1, KickUp: 3, HookPunch: 3 };
const PUNCH_SOUND_SRC = "/sound/sound_punch.mp3";
const RUN_SOUND_SRC = "/sound/sound_run.MP3";
const USER_HERO_SPAWN = { x: -51.48, y: -2.26, z: 311.29 };

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
  const kickUpLock = useRef(false);
  const hookPunchLock = useRef(false);
  const jumpTimer = useRef(null);
  const jumpImpulseTimer = useRef(null);
  const jumpImpulseApplied = useRef(false);
  const punchTimer = useRef(null);
  const kickTimer = useRef(null);
  const kickUpTimer = useRef(null);
  const hookPunchTimer = useRef(null);
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
    kickUp: false,
    hookPunch: false,
    jump: false,
  });
  const hpRef = useRef(100);
  const isDead = useRef(false);

  // === HEADING (rotation) state ===
  // headingRef    : góc xoay hiện tại (đã lerp, áp lên character.rotation.y)
  // targetHeading : góc đích — A/D cộng/trừ liên tục, S cộng PI một lần
  const headingRef = useRef(0);
  const targetHeadingRef = useRef(0);

  // === Camera state ===
  // - cameraPosRef    : vị trí camera đã smooth để render mượt giữa các frame
  // - cameraInitRef   : lần đầu thì snap (không lerp từ origin)
  // - isDraggingRef   : khi user đang kéo chuột → tạm dừng follow để
  //                     CameraControls tự orbit (xem xung quanh / phía sau)
  // - wasDraggingRef  : flag để ngay khi vừa thả chuột → sync cameraPosRef
  //                     từ vị trí camera hiện tại, tránh nhảy giật về vị trí cũ
  const cameraPosRef = useRef(new Vector3());
  const cameraInitRef = useRef(false);
  const isDraggingRef = useRef(false);
  const wasDraggingRef = useRef(false);

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

  const userHeroHP = useSetAtom(userHeroHpAtom);
  const setNPCHp = useSetAtom(NPCHpAtom);
  const setGameOver = useSetAtom(gameOverAtom);
  const setWinner = useSetAtom(winnerAtom);
  const gameOver = useAtomValue(gameOverAtom);
  const prevGameOver = useRef(false);

  const takeDamage = useCallback(
    (amount) => {
      if (isDead.current) return;
      hpRef.current = Math.max(0, hpRef.current - amount);
      userHeroHP(hpRef.current);
      if (hpRef.current <= 0) {
        isDead.current = true;
        setGameOver(true);
        setWinner("NPC Monster");
      }
    },
    [userHeroHP, setGameOver, setWinner],
  );

  const dealDamageToNPC = useCallback(
    (entry, amount) => {
      const currentHp = entry.hp ?? 100;
      const newHp = Math.max(0, currentHp - amount);
      entry.hp = newHp;
      setNPCHp(newHp);
    },
    [setNPCHp],
  );

  useFrame((_, delta) => {
    if (!rigidBodyRef.current) return;

    // Reset khi Play Again (gameOver chuyển từ true -> false)
    if (prevGameOver.current && !gameOver) {
      isDead.current = false;
      hpRef.current = 100;
      jumpLock.current = false;
      punchLock.current = false;
      kickLock.current = false;
      kickUpLock.current = false;
      hookPunchLock.current = false;
      clearTimeout(jumpTimer.current);
      clearTimeout(jumpImpulseTimer.current);
      clearTimeout(punchTimer.current);
      clearTimeout(kickTimer.current);
      clearTimeout(kickUpTimer.current);
      clearTimeout(hookPunchTimer.current);
      rigidBodyRef.current.setTranslation(USER_HERO_SPAWN, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      gameState.targetedNPCId = null;
      // Reset heading + camera để không bị giật khi respawn
      headingRef.current = 0;
      targetHeadingRef.current = 0;
      cameraInitRef.current = false;
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
    const pos = rigidBodyRef.current.translation();

    // ============================================================
    // STEERING / HEADING UPDATE
    // ------------------------------------------------------------
    // - A/D: cộng/trừ targetHeading liên tục theo TURN_SPEED * delta
    //        → quay nhân vật mượt khi giữ phím.
    // - W  : đi tới (forward theo heading).
    // - S  : đi lùi (backward = -forward), KHÔNG lật hướng nhân vật.
    //        → camera vẫn ở sau lưng (vẫn theo heading), nhân vật đi giật lùi.
    // ============================================================
    // A/D đảo chiều theo yêu cầu: A → quay phải, D → quay trái
    if (keys.current.left) targetHeadingRef.current += TURN_SPEED * delta;
    if (keys.current.right) targetHeadingRef.current -= TURN_SPEED * delta;

    // Lerp current heading → target theo đường ngắn nhất (bọc -PI..PI)
    let yawDiff = targetHeadingRef.current - headingRef.current;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    headingRef.current += yawDiff * HEADING_LERP;

    // Áp heading lên model nhân vật
    if (characterRef.current) {
      characterRef.current.rotation.y = headingRef.current;
    }

    // ============================================================
    // MOVEMENT — W tiến, S lùi (dấu ngược) theo heading hiện tại
    // ============================================================
    const heading = headingRef.current;
    let moveDir = 0;
    if (keys.current.forward) moveDir += 1;
    if (keys.current.backward) moveDir -= 1;
    let moveX = 0;
    let moveZ = 0;
    if (moveDir !== 0) {
      moveX = Math.sin(heading) * MOVE_SPEED * moveDir;
      moveZ = Math.cos(heading) * MOVE_SPEED * moveDir;
    }

    const isMoving = moveDir !== 0;

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
    if (jumpLock.current) {
      // Đang nhảy → cho phép bay lên/rơi tự nhiên theo physics gravity
      finalY = Math.max(finalY, -102);
    } else if (finalY > 0) {
      // Đang đi lên (không nhảy) → giữ clamp thấp để không bay cao khi va bậc thang
      finalY = Math.min(finalY, 1);
    } else {
      // Đang rơi xuống → cho phép rơi nhanh
      finalY = Math.max(finalY, -102);
    }
    // Anti-overlap: chặn component velocity hướng về NPC Monster đang ở quá gần
    const curPos = rigidBodyRef.current.translation();
    for (const entry of gameState.NPC) {
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

    // Update shared position (pos đã được khai báo ở trên cùng useFrame)
    gameState.userhero.position.x = pos.x;
    gameState.userhero.position.y = pos.y;
    gameState.userhero.position.z = pos.z;

    // Khi đứng yên (không di chuyển và không quay tay) và đang nhắm NPC Monster
    // → set targetHeading về phía NPC Monster; heading sẽ tự lerp mượt sang đó
    // ở frame sau, camera follow theo nên không giật.
    const isTurningManually = keys.current.left || keys.current.right;
    if (gameState.targetedNPCId != null) {
      const target = gameState.NPC.find(
        (v) => v.id === gameState.targetedNPCId && v.hp > 0,
      );
      if (!target) {
        gameState.targetedNPCId = null;
      } else if (!isMoving && !isTurningManually) {
        const dxt = target.position.x - pos.x;
        const dzt = target.position.z - pos.z;
        if (Math.abs(dxt) + Math.abs(dzt) > 0.01) {
          targetHeadingRef.current = Math.atan2(dxt, dzt);
        }
      }
    }

    // --- Edge detection: chỉ trigger khi nhấn lần đầu ---
    const justPressedJump = keys.current.jump && !prevKeys.current.jump;
    const justPressedPunch = keys.current.punch && !prevKeys.current.punch;
    const justPressedKick = keys.current.kick && !prevKeys.current.kick;
    const justPressedKickUp =
      keys.current.kickUp && !prevKeys.current.kickUp;
    const justPressedHookPunch =
      keys.current.hookPunch && !prevKeys.current.hookPunch;
    prevKeys.current.jump = keys.current.jump;
    prevKeys.current.punch = keys.current.punch;
    prevKeys.current.kick = keys.current.kick;
    prevKeys.current.kickUp = keys.current.kickUp;
    prevKeys.current.hookPunch = keys.current.hookPunch;

    const anyAttackLock =
      punchLock.current ||
      kickLock.current ||
      kickUpLock.current ||
      hookPunchLock.current;

    // Helper: tìm closest NPC Monster và tính lunge velocity hướng về phía nó
    const calcLungeVelocity = () => {
      let closestEntry = null;
      let closestDist = ATTACK_RANGE * 2;
      for (const entry of gameState.NPC) {
        if (entry.hp <= 0) continue;
        const dx = pos.x - entry.position.x;
        const dz = pos.z - entry.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < closestDist) {
          closestDist = d;
          closestEntry = entry;
        }
      }
      if (closestEntry && closestDist > 1.5) {
        const dx = closestEntry.position.x - pos.x;
        const dz = closestEntry.position.z - pos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        return { x: (dx / d) * ATTACK_LUNGE_SPEED, z: (dz / d) * ATTACK_LUNGE_SPEED };
      }
      // Nếu không có target → lunge theo hướng nhân vật đang quay
      if (characterRef.current) {
        const angle = characterRef.current.rotation.y;
        return { x: Math.sin(angle) * ATTACK_LUNGE_SPEED * 0.5, z: Math.cos(angle) * ATTACK_LUNGE_SPEED * 0.5 };
      }
      return { x: 0, z: 0 };
    };

    // --- Animation priority ---
    if (justPressedJump && !jumpLock.current) {
      jumpLock.current = true;
      jumpImpulseApplied.current = false;
      setAnimation("Jump");
      gameState.userhero.isAttacking = false;
      gameState.userhero.attackType = null;
      // Delay lực nhảy 300ms để đồng bộ với animation (nhân vật cúi xuống trước rồi mới bật lên)
      clearTimeout(jumpImpulseTimer.current);
      jumpImpulseTimer.current = setTimeout(() => {
        if (rigidBodyRef.current && !jumpImpulseApplied.current) {
          jumpImpulseApplied.current = true;
          const curVel = rigidBodyRef.current.linvel();
          rigidBodyRef.current.setLinvel({ x: curVel.x, y: JUMP_FORCE, z: curVel.z }, true);
        }
      }, 300);
      clearTimeout(jumpTimer.current);
      jumpTimer.current = setTimeout(() => {
        jumpLock.current = false;
      }, 1200);
    } else if (
      justPressedPunch &&
      !anyAttackLock &&
      !jumpLock.current
    ) {
      punchLock.current = true;
      setAnimation("Punch");
      playPunchSound();
      gameState.userhero.isAttacking = true;
      gameState.userhero.attackType = "Punch";
      gameState.userhero.hitDealt = false;
      // Lunge nhẹ về phía target
      const lunge = calcLungeVelocity();
      rigidBodyRef.current.setLinvel({ x: lunge.x, y: finalY, z: lunge.z }, true);
      clearTimeout(punchTimer.current);
      punchTimer.current = setTimeout(() => {
        punchLock.current = false;
        gameState.userhero.isAttacking = false;
        gameState.userhero.attackType = null;
      }, 800);
    } else if (
      justPressedKick &&
      !anyAttackLock &&
      !jumpLock.current
    ) {
      kickLock.current = true;
      setAnimation("Kick");
      playPunchSound();
      gameState.userhero.isAttacking = true;
      gameState.userhero.attackType = "Kick";
      gameState.userhero.hitDealt = false;
      const lunge = calcLungeVelocity();
      rigidBodyRef.current.setLinvel({ x: lunge.x, y: finalY, z: lunge.z }, true);
      clearTimeout(kickTimer.current);
      kickTimer.current = setTimeout(() => {
        kickLock.current = false;
        gameState.userhero.isAttacking = false;
        gameState.userhero.attackType = null;
      }, 1000);
    } else if (
      justPressedKickUp &&
      !anyAttackLock &&
      !jumpLock.current
    ) {
      kickUpLock.current = true;
      setAnimation("KickUp");
      playPunchSound();
      gameState.userhero.isAttacking = true;
      gameState.userhero.attackType = "KickUp";
      gameState.userhero.hitDealt = false;
      const lunge = calcLungeVelocity();
      rigidBodyRef.current.setLinvel({ x: lunge.x, y: finalY, z: lunge.z }, true);
      clearTimeout(kickUpTimer.current);
      kickUpTimer.current = setTimeout(() => {
        kickUpLock.current = false;
        gameState.userhero.isAttacking = false;
        gameState.userhero.attackType = null;
      }, 1400);
    } else if (
      justPressedHookPunch &&
      !anyAttackLock &&
      !jumpLock.current
    ) {
      hookPunchLock.current = true;
      setAnimation("HookPunch");
      playPunchSound();
      gameState.userhero.isAttacking = true;
      gameState.userhero.attackType = "HookPunch";
      gameState.userhero.hitDealt = false;
      const lunge = calcLungeVelocity();
      rigidBodyRef.current.setLinvel({ x: lunge.x, y: finalY, z: lunge.z }, true);
      clearTimeout(hookPunchTimer.current);
      hookPunchTimer.current = setTimeout(() => {
        hookPunchLock.current = false;
        gameState.userhero.isAttacking = false;
        gameState.userhero.attackType = null;
      }, 1400);
    } else if (!jumpLock.current && !anyAttackLock) {
      if (!isMoving) setAnimation("Idle");
      else if (moveDir < 0) setAnimation("RunBackward");
      else setAnimation("Run");
    }

    // Khi đang attack (lock) → dừng di chuyển, chỉ giữ lunge + gravity
    if (anyAttackLock) {
      const curVel = rigidBodyRef.current.linvel();
      // Giảm dần lunge velocity (damping)
      rigidBodyRef.current.setLinvel({ x: curVel.x * 0.9, y: curVel.y, z: curVel.z * 0.9 }, true);
    }

    // --- User hero hits closest NPC Monster in range ---
    if (gameState.userhero.isAttacking && !gameState.userhero.hitDealt) {
      const dmg = USER_HERO_DAMAGE[gameState.userhero.attackType] ?? 1;
      let closestEntry = null;
      let closestDist = ATTACK_RANGE;
      for (const entry of gameState.NPC) {
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
        dealDamageToNPC(closestEntry, dmg);
        gameState.userhero.hitDealt = true;
        gameState.targetedNPCId = closestEntry.id;
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

    // --- Any NPC Monster hits User hero ---
    for (const entry of gameState.NPC) {
      if (!entry.isAttacking || entry.hitDealt) continue;
      const dx = pos.x - entry.position.x;
      const dz = pos.z - entry.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < ATTACK_RANGE) {
        entry.hitDealt = true;
        takeDamage(0.5);
      }
    }

    // ============================================================
    // THIRD-PERSON CAMERA FOLLOW
    // ------------------------------------------------------------
    // - Camera luôn nằm SAU LƯNG nhân vật (offset rotate theo heading).
    // - LookAt nhân vật.
    // - Lerp vị trí mượt → không giật khi đổi hướng đột ngột.
    // - Raycast → kéo vào nếu trúng tường/toà nhà.
    // - Khi user kéo chuột → tạm dừng follow để CameraControls tự
    //   orbit (xem phía sau / xung quanh). Thả ra thì sync vị trí
    //   thực tế vào cameraPosRef rồi lerp mượt về sau lưng (không giật).
    // ============================================================
    if (cameraControlsRef?.current && isDraggingRef.current) {
      // User đang điều khiển camera → bỏ qua follow, đánh dấu để sync sau.
      wasDraggingRef.current = true;
    } else if (cameraControlsRef?.current) {
      // Vừa thả chuột → đọc vị trí camera hiện tại để khởi điểm lerp
      // từ đúng chỗ user đã orbit tới (tránh nhảy về vị trí smooth cũ).
      if (wasDraggingRef.current) {
        cameraControlsRef.current.getPosition(cameraPosRef.current);
        wasDraggingRef.current = false;
      }

      const yaw = headingRef.current;

      // 1. Điểm look-at = vị trí nhân vật (cao thêm để ngắm vào ngực/đầu)
      const targetX = pos.x;
      const targetY = pos.y + CAMERA_LOOK_HEIGHT;
      const targetZ = pos.z;

      // 2. Vị trí MONG MUỐN của camera = sau lưng theo heading.
      //    forward của character = (sin yaw, 0, cos yaw)
      //    → behind = pos - forward * DISTANCE
      let desiredX = pos.x - Math.sin(yaw) * CAMERA_DISTANCE;
      let desiredY = pos.y + CAMERA_HEIGHT;
      let desiredZ = pos.z - Math.cos(yaw) * CAMERA_DISTANCE;

      // 3. Raycast từ look-at → camera; trúng vật cản thì pull-in
      const dirX = desiredX - targetX;
      const dirY = desiredY - targetY;
      const dirZ = desiredZ - targetZ;
      const dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

      if (dirLen > 0.0001 && world) {
        const nx = dirX / dirLen;
        const ny = dirY / dirLen;
        const nz = dirZ / dirLen;
        const ray = new rapier.Ray(
          { x: targetX, y: targetY, z: targetZ },
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
          const safe = Math.max(
            CAMERA_MIN_DISTANCE,
            hit.timeOfImpact - CAMERA_COLLISION_BIAS,
          );
          desiredX = targetX + nx * safe;
          desiredY = targetY + ny * safe;
          desiredZ = targetZ + nz * safe;
        }
      }

      // 4. Smooth vị trí camera bằng lerp.
      //    Lần đầu (sau spawn/respawn) thì SNAP để không bay từ origin.
      if (!cameraInitRef.current) {
        cameraPosRef.current.set(desiredX, desiredY, desiredZ);
        cameraInitRef.current = true;
      } else {
        cameraPosRef.current.x +=
          (desiredX - cameraPosRef.current.x) * CAMERA_POS_LERP;
        cameraPosRef.current.y +=
          (desiredY - cameraPosRef.current.y) * CAMERA_POS_LERP;
        cameraPosRef.current.z +=
          (desiredZ - cameraPosRef.current.z) * CAMERA_POS_LERP;
      }

      // enableTransition = false vì đã smooth thủ công, để CameraControls
      // không double-smooth (sẽ gây cảm giác trễ + rung).
      cameraControlsRef.current.setLookAt(
        cameraPosRef.current.x,
        cameraPosRef.current.y,
        cameraPosRef.current.z,
        targetX,
        targetY,
        targetZ,
        false,
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
        position={[USER_HERO_SPAWN.x, USER_HERO_SPAWN.y, USER_HERO_SPAWN.z]}
        restitution={0}
        friction={1}
      >
        <CapsuleCollider
          args={[1.3, 2.5]}
          position={[0, 3.311, 0]}
          collisionGroups={interactionGroups([0], [1])}
        />

        <group ref={characterRef}>
          <Character
            modelPath={USER_HERO_MODEL}
            animation={animation}
            scale={10}
            oneShotList={USER_HERO_ONE_SHOTS}
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