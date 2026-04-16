import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import Character from "./ui/Character";
import { Vector3 } from "three";

const MOVE_SPEED = 5;
const CAMERA_OFFSET = { x: -15, y: 10, z: -5 };

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

  useFrame(() => {
    if (!rigidBodyRef.current) return;

    const velocity = rigidBodyRef.current.linvel();

    const camForward = new Vector3();
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    camForward.normalize();

    const camRight = new Vector3();
    camRight.crossVectors(camForward, new Vector3(0, 1, 0)).normalize();

    let moveX = 0;
    let moveZ = 0;

    if (keys.current.forward) { moveX += camForward.x; moveZ += camForward.z; }
    if (keys.current.backward) { moveX -= camForward.x; moveZ -= camForward.z; }
    if (keys.current.left) { moveX -= camRight.x; moveZ -= camRight.z; }
    if (keys.current.right) { moveX += camRight.x; moveZ += camRight.z; }

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

    // Handle Jump (Space) - one-shot, highest priority
    if (keys.current.jump && !jumpLock.current) {
      jumpLock.current = true;
      setAnimation("Jump");
      clearTimeout(jumpTimer.current);
      jumpTimer.current = setTimeout(() => {
        jumpLock.current = false;
      }, 1200);
    }
    // Handle Punch (Q) - one-shot, only when not moving
    else if (keys.current.punch && !isMoving && !punchLock.current && !jumpLock.current && !kickLock.current) {
      punchLock.current = true;
      setAnimation("Punch");
      clearTimeout(punchTimer.current);
      punchTimer.current = setTimeout(() => {
        punchLock.current = false;
      }, 800);
    }
    // Handle Kick (R) - one-shot, only when not moving
    else if (keys.current.kick && !isMoving && !kickLock.current && !jumpLock.current && !punchLock.current) {
      kickLock.current = true;
      setAnimation("Kick");
      clearTimeout(kickTimer.current);
      kickTimer.current = setTimeout(() => {
        kickLock.current = false;
      }, 1000);
    }
    // Movement or Idle
    else if (!jumpLock.current && !punchLock.current && !kickLock.current) {
      setAnimation(isMoving ? "Run" : "Idle");
    }

    // Camera follow character
    if (cameraControlsRef?.current) {
      const pos = rigidBodyRef.current.translation();
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
      position={[0, 0, -1]}
    >
      <CuboidCollider args={[0.7, 2.8, 0.5]} position={[0, 2.8, 0]} />
      <group ref={characterRef}>
        <Character animation={animation} />
      </group>
    </RigidBody>
  );
};

export default CharacterController;
