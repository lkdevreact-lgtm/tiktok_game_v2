import { useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BallCollider,
  CapsuleCollider,
  CuboidCollider,
  RigidBody,
} from "@react-three/rapier";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import Character from "./ui/Character";
import { Vector3 } from "three";
import { useSetAtom } from "jotai";
import {
  spidermanHpAtom,
  venomHpAtom,
  gameOverAtom,
  winnerAtom,
  gameState,
} from "../stores/gameStore";

const MOVE_SPEED = 40;
const CAMERA_OFFSET = { x: 10, y: 15, z: -80 };
const SPIDERMAN_MODEL = "models/character/Spiderman.glb";
const ATTACK_RANGE = 2.5;

const CharacterController = ({ cameraControlsRef }) => {
  const rigidBodyRef = useRef();
  const characterRef = useRef();
  const [animation, setAnimation] = useState("Idle");
  const keys = useKeyboardControls();
  const camera = useThree((state) => state.camera);

  const jumpLock = useRef(false);
  const punchLock = useRef(false);
  const kickLock = useRef(false);
  const jumpTimer = useRef(null);
  const punchTimer = useRef(null);
  const kickTimer = useRef(null);
  const hpRef = useRef(100);
  const isDead = useRef(false);

  const setSpidermanHp = useSetAtom(spidermanHpAtom);
  const setVenomHp = useSetAtom(venomHpAtom);
  const setGameOver = useSetAtom(gameOverAtom);
  const setWinner = useSetAtom(winnerAtom);

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
      if (newHp <= 0) {
        setGameOver(true);
        setWinner("Spiderman");
      }
    },
    [setVenomHp, setGameOver, setWinner],
  );

  useFrame(() => {
    if (!rigidBodyRef.current) return;

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

    rigidBodyRef.current.setLinvel({ x: moveX, y: velocity.y, z: moveZ }, true);

    if (isMoving && characterRef.current) {
      const angle = Math.atan2(moveX, moveZ);
      characterRef.current.rotation.y = angle;
    }

    // Update shared position
    const pos = rigidBodyRef.current.translation();
    gameState.spiderman.position.x = pos.x;
    gameState.spiderman.position.y = pos.y;
    gameState.spiderman.position.z = pos.z;

    // --- Animation priority ---
    if (keys.current.jump && !jumpLock.current) {
      jumpLock.current = true;
      setAnimation("Jump");
      gameState.spiderman.isAttacking = false;
      gameState.spiderman.attackType = null;
      clearTimeout(jumpTimer.current);
      jumpTimer.current = setTimeout(() => {
        jumpLock.current = false;
      }, 1200);
    } else if (
      keys.current.punch &&
      !isMoving &&
      !punchLock.current &&
      !jumpLock.current &&
      !kickLock.current
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
      keys.current.kick &&
      !isMoving &&
      !kickLock.current &&
      !jumpLock.current &&
      !punchLock.current
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
    } else if (!jumpLock.current && !punchLock.current && !kickLock.current) {
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
        const dmg = gameState.spiderman.attackType === "Kick" ? 5 : 3;
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
        const dmg = gameState.venom.attackType === "Kick" ? 5 : 3;
        takeDamage(dmg);
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
      position={[0,0, -1]}
      restitution={0}
      friction={1}
    >
      <CapsuleCollider
        args={[8.4, 7]} 
        position={[0, 15.33, 0]}
      />

      <group ref={characterRef}>
        <Character
          modelPath={SPIDERMAN_MODEL}
          animation={animation}
          scale={3}
        />
      </group>
    </RigidBody>
  );
};

export default CharacterController;
