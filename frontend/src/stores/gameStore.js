import { atom } from "jotai";

// Health atoms - reactive for HUD
export const spidermanHpAtom = atom(100);
export const venomHpAtom = atom(100);
export const gameOverAtom = atom(false);
export const winnerAtom = atom(null); // "Spiderman" | "Venom" | null

// Tổng bán kính "cấm overlap" giữa 2 nhân vật (capsule radius ~1.3 mỗi bên)
export const CHAR_BLOCK_RADIUS = 3;

// Chặn component velocity hướng về 1 điểm nếu khoảng cách < radius.
// Trả về [newVx, newVz].
export const blockIfTooClose = (px, pz, vx, vz, ox, oz, radius) => {
  const dx = ox - px;
  const dz = oz - pz;
  const d2 = dx * dx + dz * dz;
  if (d2 === 0 || d2 >= radius * radius) return [vx, vz];
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const nz = dz / d;
  const intoOther = vx * nx + vz * nz; // velocity component hướng về target
  if (intoOther <= 0) return [vx, vz];
  return [vx - intoOther * nx, vz - intoOther * nz];
};

// Mutable shared state for the game loop (read/write every frame, no re-renders)
export const gameState = {
  spiderman: {
    position: { x: 0, y: 0, z: -1 },
    isAttacking: false,
    attackType: null, // "Punch" | "Kick" | null
    hitDealt: false, // flag to prevent multi-frame damage
  },
  // Each entry: { id, position: {x,y,z}, isAttacking, attackType, hitDealt, hp }
  venoms: [],
};
