import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AnimationMixer, FrontSide, LoopOnce } from "three";
import { SkeletonUtils } from "three-stdlib";

const DEFAULT_ONE_SHOTS = new Set(["Punch", "Kick", "Jump"]);
const COMBAT_ANIMS = new Set(["Punch", "Kick", "KickUp", "HookPunch"]);
// Combat animations blend faster for snappy feel; others blend smoothly
const COMBAT_FADE_IN = 0.08;
const COMBAT_FADE_OUT = 0.1;
const NORMAL_FADE_IN = 0.3;
const NORMAL_FADE_OUT = 0.3;
// Speed multipliers for more impactful combat animations
const ANIM_TIME_SCALE = {
  Punch: 1.3,
  Kick: 1.2,
  KickUp: 1.15,
  HookPunch: 1.25,
};

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

  useFrame((_, delta) => {
    mixer.update(delta);
  });

  useEffect(() => {
    const clip = clipMap[animation];
    if (!clip) return;

    const isCombat = COMBAT_ANIMS.has(animation);
    const fadeIn = isCombat ? COMBAT_FADE_IN : NORMAL_FADE_IN;
    const fadeOut = isCombat ? COMBAT_FADE_OUT : NORMAL_FADE_OUT;
    const wasCombat = COMBAT_ANIMS.has(prevAnimation.current);
    const prevFadeOut = wasCombat ? COMBAT_FADE_OUT : NORMAL_FADE_OUT;

    const action = mixer.clipAction(clip);

    if (oneShots.has(animation)) {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    }

    // Apply time scale for combat animations
    action.timeScale = ANIM_TIME_SCALE[animation] ?? 1;

    action.reset().fadeIn(fadeIn).play();

    if (prevAnimation.current && prevAnimation.current !== animation) {
      const prevClip = clipMap[prevAnimation.current];
      if (prevClip) {
        mixer.clipAction(prevClip).fadeOut(prevFadeOut);
      }
    }

    prevAnimation.current = animation;

    return () => {
      action.fadeOut(fadeOut);
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
