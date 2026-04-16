import React, { useEffect, useRef } from "react";
import {
  CameraControls,
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { CuboidCollider, MeshCollider, Physics, RigidBody } from "@react-three/rapier";
import MapStreet from "./ui/MapStreet";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import CharacterController from "./CharacterController";
import VenomController from "./VenomController";

const GameSence = () => {
  const controlsRef = useRef();
  const viewport = useThree((state) => state.viewport);
  const cameraRefernceRef = useRef();

  const adjustCamera = () => {
    const distFactor =
      10 /
      viewport.getCurrentViewport(
        cameraRefernceRef.current,
        new Vector3(0, 0, 0),
      ).width;
    controlsRef.current.setLookAt(
      -70 * distFactor,
      4.65 * distFactor,
      9 * distFactor,
      0,
      0,
      0,
      true,
    );
  };

  useEffect(() => {
    const onResize = () => {
      adjustCamera();
    };
    adjustCamera();
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <group>
      <ambientLight intensity={2} />
      <Environment preset="city" />
      <PerspectiveCamera ref={cameraRefernceRef} position={[0, 1, 10]} near={0.5} far={5000} />
      <CameraControls ref={controlsRef} />
      <Physics debug gravity={[0,-9.81,0]}>
        <CharacterController />
        {/* cameraControlsRef={controlsRef} */}
        {/* <VenomController /> */}
        <RigidBody type="fixed" colliders="trimesh" position={[7, -0.3, 10]} scale={0.05}>
          <MapStreet />
        </RigidBody>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[350, 0.1, 20]} position={[7, -5.5, 0]} />
        </RigidBody>
      </Physics>
    </group>
  );
};

export default GameSence;
