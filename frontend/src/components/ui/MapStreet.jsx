import { useGLTF } from "@react-three/drei";

const MapStreet = () => {
  const { scene } = useGLTF("models/imaginary_city_i.glb");

  return <primitive object={scene} />;
};

useGLTF.preload("models/imaginary_city_i.glb");

export default MapStreet;
