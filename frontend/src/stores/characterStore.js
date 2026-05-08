import { atom } from "jotai";
import { HERO_DEFAULTS } from "../config/heroRegistry";
import { NPC_REGISTRY } from "../config/npcRegistry";

// ── localStorage keys ──
const LS_HERO = "character_hero_config";
const LS_NPC = "character_npc_config";

// ── helpers ──
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return fallback;
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ── NPC defaults (chỉ editable fields) ──
const NPC_DEFAULTS = NPC_REGISTRY.map((n) => ({
  id: n.id,
  label: n.label,
  hp: n.hp,
  scale: n.scale,
  damage: n.damage,
  moveSpeed: n.moveSpeed,
  attackRange: n.attackRange,
  capsuleHalfHeight: n.capsuleHalfHeight,
  capsuleRadius: n.capsuleRadius,
  capsuleOffsetY: n.capsuleOffsetY,
}));

// ── Base atoms (private) ──
const _heroAtom = atom(loadJSON(LS_HERO, HERO_DEFAULTS));
const _npcAtom = atom(loadJSON(LS_NPC, NPC_DEFAULTS));

// ── Public read/write atoms with auto-persist ──
export const userHeroConfigAtom = atom(
  (get) => get(_heroAtom),
  (_get, set, update) => {
    const next = typeof update === "function" ? update(_get(_heroAtom)) : update;
    set(_heroAtom, next);
    saveJSON(LS_HERO, next);
  },
);

export const npcRegistryAtom = atom(
  (get) => get(_npcAtom),
  (_get, set, update) => {
    const next = typeof update === "function" ? update(_get(_npcAtom)) : update;
    set(_npcAtom, next);
    saveJSON(LS_NPC, next);
  },
);
