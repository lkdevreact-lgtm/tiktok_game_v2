import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  CameraControls,
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Physics, RigidBody, interactionGroups } from "@react-three/rapier";
import MapStreet from "./ui/MapStreet";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import CharacterController from "./CharacterController";
import { gameState, fullRestartAtom } from "../stores/gameStore";
import { useAtom } from "jotai";
import NPCMonster from "./NPCMonster";

const NPC_SPAWN_INTERVAL = 15000;
const NPC_SPAWN_MIN_DIST = 30;
const NPC_SPAWN_MAX_DIST = 60;

const randomSpawnNearUserHero = () => {
  const sp = gameState.userhero.position;
  const angle = Math.random() * Math.PI * 2;
  const dist =
    NPC_SPAWN_MIN_DIST +
    Math.random() * (NPC_SPAWN_MAX_DIST - NPC_SPAWN_MIN_DIST);
  return {
    x: sp.x + Math.cos(angle) * dist,
    y: 20,
    z: sp.z + Math.sin(angle) * dist,
  };
};

const GameSence = ({ onReady }) => {
  const controlsRef = useRef();
  const viewport = useThree((state) => state.viewport);
  const cameraRefernceRef = useRef();
  const npcIdRef = useRef(0);
  const [npc, setNPC] = useState([]);
  const [fullRestart, setFullRestart] = useAtom(fullRestartAtom);

  // Khi component mount = models đã load xong (Suspense đã resolve)
  useEffect(() => {
    onReady?.();
  }, []);

  const spawnNPC = useCallback(() => {
    setNPC((list) => {
      const id = npcIdRef.current++;
      return [...list, { id, spawnPosition: randomSpawnNearUserHero() }];
    });
  }, []);

  const handleDespawn = useCallback((id) => {
    setNPC((list) => list.filter((n) => n.id !== id));
  }, []);

  // Handle full restart — clear all NPC Monsters and reset spawn timer
  useEffect(() => {
    if (fullRestart) {
      queueMicrotask(() => {
        setNPC([]);
        npcIdRef.current = 0;
        setFullRestart(false);
      });
    }
  }, [fullRestart, setFullRestart]);

  useEffect(() => {
    const firstSpawn = setTimeout(spawnNPC, 500);
    const interval = setInterval(spawnNPC, NPC_SPAWN_INTERVAL);
    return () => {
      clearTimeout(firstSpawn);
      clearInterval(interval);
    };
  }, [spawnNPC]);

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
      10,
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
      <Environment preset="city" />
      <ambientLight intensity={1.2} />
      {/* <hemisphereLight args={["#bde0ff", "#3a3a3a", 1]} />
      <directionalLight position={[100, 200, 100]} intensity={1.5} /> */}
      <PerspectiveCamera
        ref={cameraRefernceRef}
        position={[0, 1, 10]}
        near={0.5}
        far={5000}
      />
      <CameraControls ref={controlsRef} />
      <Physics gravity={[0,-55,0]}>
        <CharacterController cameraControlsRef={controlsRef} />
        {/* {npc.map((n) => (
          <NPCMonster
            key={n.id}
            id={n.id}
            spawnPosition={n.spawnPosition}
            onDespawn={handleDespawn}
          />
        ))}  */}
        <RigidBody
          type="fixed"
          colliders="trimesh"
          position={[17, -10, 0]}
          scale={4}
          collisionGroups={interactionGroups([1], [0])}
        >
          <MapStreet />
        </RigidBody>
      </Physics>
    </group>
  );
};

export default GameSence;
