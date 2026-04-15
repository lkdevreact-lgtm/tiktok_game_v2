import React from "react";
import { OrbitControls } from "@react-three/drei";
import MapStreet from "./ui/MapStreet";

const GameSence = () => {
  return (
    <>
      <OrbitControls />
      <MapStreet />
    </>
  );
};

export default GameSence;
