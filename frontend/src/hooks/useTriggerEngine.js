import { useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { spawnRequestAtom } from "../stores/gameStore";
import { fetchTriggers } from "../api/triggers";

/**
 * useTriggerEngine — Lắng nghe TikTok events qua Socket.IO,
 * kiểm tra trigger rules từ DB, và push spawn requests khi match.
 *
 * @param {import('socket.io-client').Socket | null} socket
 */
export function useTriggerEngine(socket) {
  const setSpawnRequests = useSetAtom(spawnRequestAtom);
  const triggersRef = useRef([]);
  const loadedRef = useRef(false);

  // Load active triggers từ API khi mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTriggers();
        if (!cancelled) {
          // Chỉ giữ triggers đang active
          triggersRef.current = (data || []).filter((t) => t.active);
          loadedRef.current = true;
          console.log(
            `[TriggerEngine] Loaded ${triggersRef.current.length} active triggers`,
          );
        }
      } catch (err) {
        console.error("[TriggerEngine] Failed to load triggers:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Lắng nghe socket events
  useEffect(() => {
    if (!socket) return;

    /**
     * Tìm tất cả triggers match với event và thực thi spawn.
     */
    const processEvent = (eventType, data) => {
      if (!loadedRef.current) return;

      const matching = triggersRef.current.filter((t) => {
        if (t.event_type !== eventType) return false;

        // Comment: kiểm tra match_value (case-insensitive)
        if (eventType === "comment") {
          if (t.match_value) {
            const comment = (data.comment || "").trim().toLowerCase();
            const matchVal = t.match_value.trim().toLowerCase();
            if (comment !== matchVal) return false;
          }
          // Nếu không có match_value → match mọi comment
        }

        // Gift: kiểm tra gift_id
        if (eventType === "gift") {
          if (t.gift_id != null) {
            if (Number(data.giftId) !== Number(t.gift_id)) return false;
          }
          // Nếu không có gift_id → match mọi gift
        }

        // like, share, follow: luôn match (nếu event_type đúng)
        return true;
      });

      if (matching.length === 0) return;

      // Tạo spawn requests cho tất cả matching triggers
      const requests = matching.map((t) => ({
        npcId: t.npc_type, // npc_type trong DB = npcId trong registry (VD: "npc1", "npc2")
        count: t.npc_count || 1,
      }));

      console.log(
        `[TriggerEngine] ${eventType} event matched ${requests.length} trigger(s):`,
        requests,
      );

      setSpawnRequests((prev) => [...prev, ...requests]);
    };

    const onChat = (data) => processEvent("comment", data);
    const onGift = (data) => processEvent("gift", data);
    const onLike = (data) => processEvent("like", data);
    const onShare = (data) => processEvent("share", data);
    const onFollow = (data) => processEvent("follow", data);

    socket.on("tiktok:chat", onChat);
    socket.on("tiktok:gift", onGift);
    socket.on("tiktok:like", onLike);
    socket.on("tiktok:share", onShare);
    socket.on("tiktok:follow", onFollow);

    return () => {
      socket.off("tiktok:chat", onChat);
      socket.off("tiktok:gift", onGift);
      socket.off("tiktok:like", onLike);
      socket.off("tiktok:share", onShare);
      socket.off("tiktok:follow", onFollow);
    };
  }, [socket, setSpawnRequests]);
}
