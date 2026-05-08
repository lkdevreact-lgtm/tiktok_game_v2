

export const NPC_REGISTRY = [
  {
    id: "npc1",
    label: "John",
    modelPath: "models/character/NPC1.glb",
    hp: 10,
    scale: 10,
    damage: 0.3,
    moveSpeed: 20,
    attackRange: 10,
    // Collider
    capsuleHalfHeight: 8.3,
    capsuleRadius: 5.5,
    capsuleOffsetY: 13.7,
    // Animations
    animations: {
      idle: "Idle",
      run: "Run",
      attack: "Punch",
      die: "Die",
    },
    oneShotAnims: ["Punch", "Die"],
    spawnSound: "sound/vine_boom.mp3",
  },
  {
    id: "npc2",
    label: "Shadow",
    modelPath: "models/character/NPC2.glb",
    hp: 15,
    scale: 10,
    damage: 0.5,
    moveSpeed: 18,
    attackRange: 12,
    // Collider
    capsuleHalfHeight: 8.3,
    capsuleRadius: 5.5,
    capsuleOffsetY: 13.7,
    // Animations
    animations: {
      idle: "Idle",
      run: "Run",
      attack: "Punch",
      die: "Die",
    },
    oneShotAnims: ["Punch", "Die"],
    spawnSound: "sound/fahh.mp3",
  },
];

/**
 * Tìm NPC config theo id.
 * @param {string} npcId – VD: "npc1", "npc2"
 * @returns {object | undefined}
 */
export function getNpcById(npcId) {
  return NPC_REGISTRY.find((n) => n.id === npcId);
}

/**
 * Trả về NPC mặc định (entry đầu tiên).
 */
export function getDefaultNpc() {
  return NPC_REGISTRY[0];
}
