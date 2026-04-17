import { useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BallCollider,
  CapsuleCollider,
  CuboidCollider,
  RigidBody,
  interactionGroups,
} from "@react-three/rapier";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import Character from "./ui/Character";
import { Vector3 } from "three";
import { useSetAtom, useAtomValue } from "jotai";
import {
  spidermanHpAtom,
  venomHpAtom,
  gameOverAtom,
  winnerAtom,
  gameState,
} from "../stores/gameStore";

const MOVE_SPEED = 13;
const CAMERA_OFFSET = { x: 20, y: 5, z: -10 };
const SPIDERMAN_MODEL = "models/character/Spiderman.glb";
const ATTACK_RANGE = 20;
const SPIDERMAN_ONE_SHOTS = [
  "Punch",
  "Kick",
  "KickMMA",
  "ComboPunch",
  "Jump",
  "Die",
];
const SPIDERMAN_DAMAGE = { Punch: 1, Kick: 1, KickMMA: 3, ComboPunch: 3 };

const CharacterController = ({ cameraControlsRef }) => {
  const rigidBodyRef = useRef();
  const characterRef = useRef();
  const [animation, setAnimation] = useState("Idle");
  const keys = useKeyboardControls();
  const camera = useThree((state) => state.camera);

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
  const prevKeys = useRef({
    punch: false,
    kick: false,
    kickMMA: false,
    comboPunch: false,
    jump: false,
  });
  const hpRef = useRef(100);
  const isDead = useRef(false);

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
    (amount) => {
      const venomState = gameState.venom;
      const currentHp = venomState.hp ?? 100;
      const newHp = Math.max(0, currentHp - amount);
      venomState.hp = newHp;
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
      rigidBodyRef.current.setTranslation({ x: -30, y: 10, z: 400 }, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      prevGameOver.current = false;
    }
    prevGameOver.current = gameOver;

    // Dead state
    if (isDead.current) {
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      setAnimation("Die");
      return;
    }

    const velocity = rigidBodyRef.current.linvel();

    const camForward = new Vector3();
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    camForward.normalize();

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

    // Clamp Y velocity: không cho bị đẩy lên quá cao khi va bậc thềm
    let finalY = velocity.y;
    if (finalY > 0) {
      // Đang đi lên → giữ clamp thấp để không bay cao khi va bậc thang
      finalY = Math.min(finalY, 1);
    } else {
      // Đang rơi xuống → cho phép rơi nhanh (không để chậm nữa)
      finalY = Math.max(finalY, -102); // -52 là giá trị tốt để thử đầu tiên
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

    // --- Spiderman hits Venom ---
    if (gameState.spiderman.isAttacking && !gameState.spiderman.hitDealt) {
      const vp = gameState.venom.position;
      const dx = pos.x - vp.x;
      const dz = pos.z - vp.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < ATTACK_RANGE) {
        gameState.spiderman.hitDealt = true;
        // const dmg = gameState.spiderman.attackType === "Kick" ? 5 : 3;
        const dmg = SPIDERMAN_DAMAGE[gameState.spiderman.attackType] ?? 1;
        dealDamageToVenom(dmg);
      }
    }

    // --- Venom hits Spiderman ---
    if (gameState.venom.isAttacking && !gameState.venom.hitDealt) {
      const vp = gameState.venom.position;
      const dx = pos.x - vp.x;
      const dz = pos.z - vp.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < ATTACK_RANGE) {
        gameState.venom.hitDealt = true;
        // const dmg = gameState.venom.attackType === "Kick" ? 5 : 3;
        takeDamage(1);
      }
    }

    // Camera follow
    if (cameraControlsRef?.current) {
      cameraControlsRef.current.setLookAt(
        pos.x + CAMERA_OFFSET.x,
        pos.y + CAMERA_OFFSET.y,
        pos.z + CAMERA_OFFSET.z,
        pos.x,
        pos.y,
        pos.z,
        true,
      );
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      lockRotations
      type="dynamic"
      position={[-241.48, -2.26, 311.29]}
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
          scale={3}
          oneShotList={SPIDERMAN_ONE_SHOTS}
        />
      </group>
    </RigidBody>
  );
};

export default CharacterController;