/**
 * Hero Registry — Thông số mặc định của User Hero.
 * Tương tự npcRegistry.js nhưng cho nhân vật chính.
 *
 * ⚡ Runtime value được quản lý qua Jotai atom (characterStore.js)
 *    và persist vào localStorage.
 */

export const HERO_DEFAULTS = {
  moveSpeed: 30,
  jumpForce: 25,
  attackRange: 12,
  damage: {
    Punch: 1,
    Kick: 1,
    KickUp: 3,
    HookPunch: 3,
  },
};
