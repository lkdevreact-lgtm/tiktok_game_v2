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
  Space: "jump",
};

export const useKeyboardControls = () => {
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    punch: false,
    jump: false,
  });

  useEffect(() => {
    const onKeyDown = (e) => {
      const action = KEY_MAP[e.code];
      if (action) keys.current[action] = true;
    };
    const onKeyUp = (e) => {
      const action = KEY_MAP[e.code];
      if (action) keys.current[action] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return keys;
};
