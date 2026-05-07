import { atom } from "jotai";

// Health atoms - reactive for HUD
export const userHeroHpAtom = atom(100);
export const NPCHpAtom = atom(100);
export const gameOverAtom = atom(false);
export const winnerAtom = atom(null); // "User hero" | "NPC Monster" | null

// Play Again limit system
export const MAX_PLAYS = 5;
export const playCountAtom = atom(0); // how many rounds played (starts at 0)
export const fullRestartAtom = atom(false); // triggers full game restart

// Spawn request queue: trigger engine pushes { npcId, count } entries,
// GameSence consumes them and spawns NPCs accordingly.
// Each entry: { npcId: string, count: number }
export const spawnRequestAtom = atom([]);

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
  userhero: {
    position: { x: 0, y: 0, z: -1 },
    isAttacking: false,
    attackType: null, // "Punch" | "Kick" | null
    hitDealt: false, // flag to prevent multi-frame damage
  },
  // Each entry: { id, position: {x,y,z}, isAttacking, attackType, hitDealt, hp }
  NPC: [],
  // ID của NPC đang bị User hero nhắm (hiện mũi tên trên đầu, User hero quay mặt về)
  targetedNPCId: null,
};
