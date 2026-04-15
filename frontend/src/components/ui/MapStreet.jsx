import { useGLTF } from "@react-three/drei";

const MapStreet = () => {
  const { scene } = useGLTF("models/map_city.glb");

  return <primitive object={scene} scale={0.001} />;
};

useGLTF.preload("models/map_city.glb");

export default MapStreet;
