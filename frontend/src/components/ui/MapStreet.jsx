import { CameraControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import { Vector3 } from "three";

const MapStreet = () => {
  const { scene } = useGLTF("models/map_city.glb");
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
    <>
      <PerspectiveCamera ref={cameraRefernceRef} position={[0, 1, 10]} />
      <CameraControls ref={controlsRef} />
      <ambientLight intensity={0.5} />
      <primitive object={scene} scale={0.001} position={[7, -0.3, 0]} />
    </>
  );
};
useGLTF.preload("models/map_city.glb");

export default MapStreet;
