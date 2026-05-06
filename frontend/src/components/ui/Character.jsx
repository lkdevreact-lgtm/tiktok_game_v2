import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AnimationMixer, FrontSide, LoopOnce } from "three";
import { SkeletonUtils } from "three-stdlib";

const DEFAULT_ONE_SHOTS = new Set(["Punch", "Kick", "Jump"]);
const COMBAT_ANIMS = new Set(["Punch", "Kick", "KickUp", "HookPunch"]);
// Combat transitions blend faster for snappy feel; others blend smoothly
const COMBAT_BLEND = 0.15;
const NORMAL_BLEND = 0.25;
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
    const wasCombat = COMBAT_ANIMS.has(prevAnimation.current);
    // Unified blend duration — crossFadeFrom keeps total weight = 1 throughout,
    // so there is no moment where the skeleton falls back to bind pose (T-pose).
    const fadeDuration = isCombat || wasCombat ? COMBAT_BLEND : NORMAL_BLEND;

    const action = mixer.clipAction(clip);

    if (oneShots.has(animation)) {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    }

    action.timeScale = ANIM_TIME_SCALE[animation] ?? 1;

    const prevName = prevAnimation.current;
    if (prevName && prevName !== animation && clipMap[prevName]) {
      const prevAction = mixer.clipAction(clipMap[prevName]);
      // crossFadeFrom: ramp prevAction weight 1→0 and this action weight 0→1
      // simultaneously over fadeDuration — total weight stays 1, no T-pose.
      action.reset().crossFadeFrom(prevAction, fadeDuration, true).play();
    } else {
      action.reset().fadeIn(fadeDuration).play();
    }

    prevAnimation.current = animation;
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

useGLTF.preload("models/character/HeroGirl.glb");
useGLTF.preload("models/character/NPC1.glb");

export default Character;
