import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import Character from "./ui/Character";

const MOVE_SPEED = 3;
const CAMERA_OFFSET = { x: 0, y: 3, z: 5 };

const CharacterController = ({ cameraControlsRef }) => {
  const rigidBodyRef = useRef();
  const characterRef = useRef();
  const [animation, setAnimation] = useState("wait");
  const keys = useKeyboardControls();

  useFrame(() => {
    if (!rigidBodyRef.current) return;

    const velocity = rigidBodyRef.current.linvel();
    let moveX = 0;
    let moveZ = 0;

    if (keys.current.forward) moveZ -= MOVE_SPEED;
    if (keys.current.backward) moveZ += MOVE_SPEED;
    if (keys.current.left) moveX -= MOVE_SPEED;
    if (keys.current.right) moveX += MOVE_SPEED;

    const isMoving = moveX !== 0 || moveZ !== 0;

    rigidBodyRef.current.setLinvel({ x: moveX, y: velocity.y, z: moveZ }, true);

    // Rotate character to face movement direction
    if (isMoving && characterRef.current) {
      const angle = Math.atan2(moveX, moveZ);
      characterRef.current.rotation.y = angle;
    }

    setAnimation(isMoving ? "run" : "wait");

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
      <CuboidCollider args={[1, 4, 0.9]} position={[0, 0.25, 0]} />
      <group ref={characterRef}>
        <Character animation={animation} />
      </group>
    </RigidBody>
  );
};

export default CharacterController;
