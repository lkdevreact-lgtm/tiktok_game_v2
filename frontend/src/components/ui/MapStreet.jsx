import { useGLTF } from "@react-three/drei";
import { CuboidCollider } from "@react-three/rapier";
import { useMemo } from "react";
import { Box3, Vector3 } from "three";

const MapStreet = () => {
  const { scene } = useGLTF("models/map2.glb");

  const floor = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    return {
      halfX: size.x / 2,
      halfZ: size.z / 2,
      centerX: center.x,
      centerZ: center.z,
      minY: box.min.y,
    };
  }, [scene]);

  return (
    <>
      <primitive object={scene} />
      <CuboidCollider
        args={[floor.halfX, 0.05, floor.halfZ]}
        position={[floor.centerX, floor.minY, floor.centerZ]}
      />
    </>
  );
};

export default MapStreet;
