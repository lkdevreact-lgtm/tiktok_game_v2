import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { AnimationMixer, FrontSide, LoopOnce } from "three";
import { SkeletonUtils } from "three-stdlib";

const DEFAULT_ONE_SHOTS = new Set(["Punch", "Kick", "Jump"]);

const Character = ({
  modelPath,
  animation = "Idle",
  scale = 0.6,
  oneShotList,
  opacity = 1,
}) => {
  const group = useRef();
  const { scene, animations } = useGLTF(modelPath);

  // Clone scene + materials per instance so multiple characters / opacity don't clash
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
      }
    });
    return clone;
  }, [scene]);

  const oneShots = useMemo(
    () => (oneShotList ? new Set(oneShotList) : DEFAULT_ONE_SHOTS),
    [oneShotList],
  );

  const mixer = useMemo(
    () => new AnimationMixer(clonedScene),
    [clonedScene],
  );
  const clipMap = useMemo(() => {
    const map = {};
    for (const clip of animations) {
      map[clip.name] = clip;
    }
    return map;
  }, [animations]);

  const prevAnimation = useRef(null);

  useEffect(() => {
    const id = setInterval(() => mixer.update(1 / 60), 1000 / 60);
    return () => clearInterval(id);
  }, [mixer]);

  useEffect(() => {
    const clip = clipMap[animation];
    if (!clip) return;

    const action = mixer.clipAction(clip);

    if (oneShots.has(animation)) {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    }

    action.reset().fadeIn(0.2).play();

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
  }, [animation, mixer, clipMap, oneShots]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        const mat = child.material;
        if (!mat) return;

        mat.depthWrite = true;
        mat.depthTest = true;
        mat.side = FrontSide;

        mat.polygonOffset = true;
        mat.polygonOffsetFactor = 1;
        mat.polygonOffsetUnits = 1;
      }
    });
  }, [clonedScene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.transparent = opacity < 1;
        child.material.opacity = opacity;
        child.material.depthWrite = opacity >= 1;
      }
    });
  }, [clonedScene, opacity]);

  return (
    <group ref={group}>
      <primitive object={clonedScene} scale={scale} castShadow />
    </group>
  );
};

export default Character;
