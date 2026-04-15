import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";

const RUN_MODEL = "models/character/character_1.glb";
const IDLE_MODEL = "models/character/character_1_idle.glb";

const AnimatedModel = ({ url, animationName, visible }) => {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (!visible) return;
    const action = actions[animationName];
    if (action) {
      action.reset().fadeIn(0.2).play();
      return () => action.fadeOut(0.2);
    }
  }, [visible, animationName, actions]);

  return (
    <group ref={group} visible={visible}>
      <primitive object={scene} scale={0.3} castShadow />
    </group>
  );
};

const Character = ({ animation = "wait" }) => {
  const isRunning = animation === "run";

  return (
    <group>
      <AnimatedModel
        url={IDLE_MODEL}
        animationName="wait"
        visible={!isRunning}
      />
      <AnimatedModel
        url={RUN_MODEL}
        animationName="run"
        visible={isRunning}
      />
    </group>
  );
};

useGLTF.preload(RUN_MODEL);
useGLTF.preload(IDLE_MODEL);

export default Character;
