import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";

const Character = () => {
  const { scene } = useGLTF("models/character/character_1.glb");

  return (
    <RigidBody type="dynamic" colliders="cuboid" position={[7, 2, 0]}>
      <primitive object={scene} scale={0.3} />
    </RigidBody>
  );
};

useGLTF.preload("models/character/character_1.glb");

export default Character;
