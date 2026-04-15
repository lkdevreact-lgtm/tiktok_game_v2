import { useGLTF } from "@react-three/drei";

const MapStreet = () => {
  const { scene } = useGLTF("models/light_cycle_arena.glb");

  return <primitive object={scene} />;
};

useGLTF.preload("models/map_city.glb");

export default MapStreet;
