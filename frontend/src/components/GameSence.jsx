import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  CameraControls,
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { CuboidCollider, MeshCollider, Physics, RigidBody, interactionGroups } from "@react-three/rapier";
import MapStreet from "./ui/MapStreet";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import CharacterController from "./CharacterController";
import VenomController from "./VenomController";
import { gameState } from "../stores/gameStore";

const VENOM_SPAWN_INTERVAL = 15000;
const VENOM_SPAWN_MIN_DIST = 30;
const VENOM_SPAWN_MAX_DIST = 60;

const randomSpawnNearSpiderman = () => {
  const sp = gameState.spiderman.position;
  const angle = Math.random() * Math.PI * 2;
  const dist =
    VENOM_SPAWN_MIN_DIST +
    Math.random() * (VENOM_SPAWN_MAX_DIST - VENOM_SPAWN_MIN_DIST);
  return {
    x: sp.x + Math.cos(angle) * dist,
    y: 20,
    z: sp.z + Math.sin(angle) * dist,
  };
};

const GameSence = () => {
  const controlsRef = useRef();
  const viewport = useThree((state) => state.viewport);
  const cameraRefernceRef = useRef();
  const venomIdRef = useRef(0);
  const [venoms, setVenoms] = useState([]);

  const spawnVenom = useCallback(() => {
    setVenoms((list) => {
      const id = venomIdRef.current++;
      return [...list, { id, spawnPosition: randomSpawnNearSpiderman() }];
    });
  }, []);

  const handleDespawn = useCallback((id) => {
    setVenoms((list) => list.filter((v) => v.id !== id));
  }, []);

  useEffect(() => {
    const firstSpawn = setTimeout(spawnVenom, 500);
    const interval = setInterval(spawnVenom, VENOM_SPAWN_INTERVAL);
    return () => {
      clearTimeout(firstSpawn);
      clearInterval(interval);
    };
  }, [spawnVenom]);

  const adjustCamera = () => {
    const distFactor =
      10 /
      viewport.getCurrentViewport(
        cameraRefernceRef.current,
        new Vector3(0, 0, 0),
      ).width;

    controlsRef.current.setLookAt(
      -590 * distFactor,
      445 * distFactor,
      680 * distFactor,
      0,
      0,
      100,
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
      <Physics >
        <CharacterController cameraControlsRef={controlsRef}/>
        {venoms.map((v) => (
          <VenomController
            key={v.id}
            id={v.id}
            spawnPosition={v.spawnPosition}
            onDespawn={handleDespawn}
          />
        ))}
        <RigidBody type="fixed" colliders="trimesh" position={[17, -10, 0]} scale={10} collisionGroups={interactionGroups([1], [0])}>
          <MapStreet />
        </RigidBody>
        <RigidBody type="fixed" colliders={false} collisionGroups={interactionGroups([1], [0])}>
          <CuboidCollider args={[350, 0.1, 20]} position={[7, -5.5, 0]} />
        </RigidBody>
      </Physics>
    </group>
  );
};

export default GameSence;
