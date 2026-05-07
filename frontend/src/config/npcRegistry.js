/**
 * NPC Registry — Danh sách NPC có thể tùy chỉnh.
 *
 * Mỗi entry định nghĩa 1 loại NPC với đầy đủ thông số:
 *  - id / label: định danh + tên hiển thị
 *  - modelPath: đường dẫn tới file .glb
 *  - hp, scale, damage, moveSpeed, attackRange: thông số gameplay
 *  - capsule*: collider shape (CapsuleCollider args)
 *  - animations: mapping tên hành động → tên clip trong GLB
 *  - oneShotAnims: danh sách animation chỉ phát 1 lần (không loop)
 *  - spawnSound: âm thanh khi NPC xuất hiện
 *
 * ⚡ Chỉ cần sửa file này để thêm NPC mới hoặc thay đổi thông số.
 */

export const NPC_REGISTRY = [
  {
    id: "npc1",
    label: "John",
    modelPath: "models/character/NPC1.glb",
    hp: 15,
    scale: 10,
    damage: 0.5,
    moveSpeed: 20,
    attackRange: 5,
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
    hp: 25,
    scale: 10,
    damage: 0.8,
    moveSpeed: 18,
    attackRange: 5,
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
