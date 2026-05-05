import { useEffect, useRef } from "react";

const KEY_MAP = {
  KeyW: "forward",
  KeyS: "backward",
  KeyA: "left",
  KeyD: "right",
  ArrowUp: "forward",
  ArrowDown: "backward",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyQ: "punch",
  KeyR: "kick",
  KeyF: "kickUp",
  KeyE: "hookPunch",
  Space: "jump",
};

export const useKeyboardControls = () => {
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    punch: false,
    kick: false,
    kickUp: false,
    hookPunch: false,
    jump: false,
  });

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return; // Chặn auto-repeat khi giữ phím
      const action = KEY_MAP[e.code];
      if (action) keys.current[action] = true;
    };
    const onKeyUp = (e) => {
      const action = KEY_MAP[e.code];
      if (action) keys.current[action] = false;
    };

    // Reset tất cả key khi mất focus — tránh key bị stuck
    const resetAll = () => {
      for (const key in keys.current) {
        keys.current[key] = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", resetAll);
    document.addEventListener("visibilitychange", resetAll);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", resetAll);
      document.removeEventListener("visibilitychange", resetAll);
    };
  }, []);

  return keys;
};
