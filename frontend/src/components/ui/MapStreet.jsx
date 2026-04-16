import { useGLTF } from "@react-three/drei";

const MapStreet = () => {
  const { scene } = useGLTF("models/modern_city_block.glb");

  return <primitive object={scene} />;
};

useGLTF.preload("models/modern_city_block.glb");

export default MapStreet;
