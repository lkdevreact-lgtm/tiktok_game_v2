import React, { useEffect, useRef } from "react";
import {
  CameraControls,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import Character from "./ui/Character";
import MapStreet from "./ui/MapStreet";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";

const GameSence = () => {
  const controlsRef = useRef();
  const viewport = useThree((state) => state.viewport);
  const cameraRefernceRef = useRef();

  const adjustCamera = () => {
    const distFactor =
      1 /
      viewport.getCurrentViewport(
        cameraRefernceRef.current,
        new Vector3(0, 0, 0),
      ).width;
    controlsRef.current.setLookAt(
      -0.09 * distFactor,
      0.1 * distFactor,
      2.8 * distFactor,
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
      <ambientLight intensity={0.5} />
      <PerspectiveCamera ref={cameraRefernceRef} position={[0, 1, 10]} />
      <CameraControls ref={controlsRef} />
      <Physics debug gravity={[0, -9.81, 10]}>
        <Character />
        <RigidBody type="fixed" colliders="trimesh" position={[7, -0.3, 0]}>
          <MapStreet />
        </RigidBody>
        <RigidBody type="fixed" sensor colliders={false} name="void">
          <CuboidCollider args={[35, 0.1, 20]} position={[0,-1,-10]} />
        </RigidBody>
      </Physics>
    </group>
  );
};

export default GameSence;
