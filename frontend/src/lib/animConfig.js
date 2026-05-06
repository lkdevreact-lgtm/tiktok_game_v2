// Speed multipliers for more impactful combat animations.
// Used by Character (action.timeScale) and CharacterController (lock timer).
export const ANIM_TIME_SCALE = {
  Punch: 1.3,
  Kick: 1.2,
  KickUp: 1.15,
  HookPunch: 1.25,
};

// Grace period after the animation finishes, before releasing the action lock.
// Keeps the final pose visible briefly and avoids snapping straight into Idle/Run.
const LOCK_BUFFER_MS = 120;

// Compute how long to lock the controller for an animation,
// based on the clip's natural duration (seconds) and any timeScale override.
// Returns a value in milliseconds, ready to pass to setTimeout.
export const getAnimLockMs = (clipDurationSec, animName) => {
  if (!clipDurationSec || clipDurationSec <= 0) return 1000;
  const scale = ANIM_TIME_SCALE[animName] ?? 1;
  return Math.round((clipDurationSec / scale) * 1000) + LOCK_BUFFER_MS;
};
