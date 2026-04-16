import { atom } from "jotai";

// Health atoms - reactive for HUD
export const spidermanHpAtom = atom(100);
export const venomHpAtom = atom(100);
export const gameOverAtom = atom(false);
export const winnerAtom = atom(null); // "Spiderman" | "Venom" | null

// Mutable shared state for the game loop (read/write every frame, no re-renders)
export const gameState = {
  spiderman: {
    position: { x: 0, y: 0, z: -1 },
    isAttacking: false,
    attackType: null, // "Punch" | "Kick" | null
    hitDealt: false, // flag to prevent multi-frame damage
  },
  venom: {
    position: { x: 8, y: 0, z: -1 },
    isAttacking: false,
    attackType: null,
    hitDealt: false,
  },
};
