import { CameraControls, useGLTF } from "@react-three/drei";
import React from "react";

const MapStreet = () => {
  const { scene } = useGLTF("models/map_street.glb");
  return (
    <>
      <CameraControls />
      <ambientLight intensity={0.5} />
      <primitive object={scene} />
    </>
  );
};
useGLTF.preload("models/map_street.glb");

export default MapStreet;
