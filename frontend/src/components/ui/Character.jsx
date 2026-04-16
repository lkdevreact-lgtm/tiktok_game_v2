import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { AnimationMixer, FrontSide, LoopOnce } from "three";

const MODEL_PATH = "models/character/Spiderman.glb";

const ONE_SHOT_ANIMATIONS = new Set(["Punch", "Jump"]);

const Character = ({ animation = "Idle" }) => {
  const group = useRef();
  const { scene, animations } = useGLTF(MODEL_PATH);

  // Create our own mixer so we can freely configure actions
  const mixer = useMemo(() => new AnimationMixer(scene), [scene]);
  const clipMap = useMemo(() => {
    const map = {};
    for (const clip of animations) {
      map[clip.name] = clip;
    }
    return map;
  }, [animations]);

  const prevAnimation = useRef(null);

  // Drive the mixer each frame
  useEffect(() => {
    const id = setInterval(() => mixer.update(1 / 60), 1000 / 60);
    return () => clearInterval(id);
  }, [mixer]);

  useEffect(() => {
    const clip = clipMap[animation];
    if (!clip) return;

    const action = mixer.clipAction(clip);

    if (ONE_SHOT_ANIMATIONS.has(animation)) {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    }

    action.reset().fadeIn(0.2).play();

    // Fade out previous animation
    if (prevAnimation.current && prevAnimation.current !== animation) {
      const prevClip = clipMap[prevAnimation.current];
      if (prevClip) {
        mixer.clipAction(prevClip).fadeOut(0.2);
      }
    }

    prevAnimation.current = animation;

    return () => {
      action.fadeOut(0.2);
    };
  }, [animation, mixer, clipMap]);

  useEffect(() => {
  scene.traverse((child) => {
    if (child.isMesh) {
      const mat = child.material;

      if (!mat) return;

      // ✅ FIX XUYÊN THẤU
      mat.depthWrite = true;
      mat.depthTest = true;

      // ❌ nguyên nhân chính
      if (mat.transparent && mat.opacity === 1) {
        mat.transparent = false;
      }

      // 👉 ưu tiên dùng cái này (ổn định hơn)
      mat.side = FrontSide;

      // nếu bị mất mặt thì đổi lại:
      // mat.side = DoubleSide;

      // 🔥 chống z-fighting nếu model nhiều layer
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = 1;
      mat.polygonOffsetUnits = 1;
    }
  });
}, [scene]);

  return (
    <group ref={group}>
      <primitive object={scene} scale={0.6} castShadow />
    </group>
  );
};

useGLTF.preload(MODEL_PATH);

export default Character;
