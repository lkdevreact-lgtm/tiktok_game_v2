import { useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { spawnRequestAtom } from "../stores/gameStore";
import { fetchTriggers } from "../api/triggers";

/**
 * useTriggerEngine — Lắng nghe TikTok events qua Socket.IO,
 * kiểm tra trigger rules từ DB, tích lũy counter theo threshold,
 * và push spawn requests khi đủ ngưỡng.
 *
 * @param {import('socket.io-client').Socket | null} socket
 */
export function useTriggerEngine(socket) {
  const setSpawnRequests = useSetAtom(spawnRequestAtom);
  const triggersRef = useRef([]);
  const loadedRef = useRef(false);

  // Counter tích lũy cho mỗi trigger: { [triggerId]: currentCount }
  const countersRef = useRef({});

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
          // Reset counters
          countersRef.current = {};
          console.log(
            `[TriggerEngine] Loaded ${triggersRef.current.length} active triggers:`,
            triggersRef.current.map((t) => `${t.name} (${t.event_type}, threshold=${t.threshold})`),
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
     * Tìm tất cả triggers match với event, tích lũy counter,
     * và spawn NPC khi counter đạt threshold.
     */
    const processEvent = (eventType, data) => {
      if (!loadedRef.current) return;

      // console.log(`[TriggerEngine] Received event: ${eventType}`, {
      //   comment: data.comment,
      //   giftId: data.giftId,
      //   giftName: data.giftName,
      //   username: data.username,
      // });

      // Tìm triggers match event type + điều kiện
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

      if (matching.length === 0) {
        console.log(`[TriggerEngine] No trigger matched for ${eventType}`);
        return;
      }

      // Xử lý threshold cho từng trigger match
      const spawnList = [];

      for (const t of matching) {
        const triggerId = t.id;
        const threshold = t.threshold || 1;

        // Tăng counter
        if (!countersRef.current[triggerId]) {
          countersRef.current[triggerId] = 0;
        }

        // Like events có thể gửi `likeCount` (số like trong batch)
        const increment = (eventType === "like" && data.likeCount)
          ? data.likeCount
          : 1;

        countersRef.current[triggerId] += increment;

        // console.log(
        //   `[TriggerEngine] Trigger "${t.name}" counter: ${countersRef.current[triggerId]}/${threshold}`,
        // );

        // Kiểm tra đạt ngưỡng chưa
        if (countersRef.current[triggerId] >= threshold) {
          // Reset counter (giữ phần dư nếu vượt threshold)
          countersRef.current[triggerId] -= threshold;

          spawnList.push({
            npcId: t.npc_type,
            count: t.npc_count || 1,
          });

          // console.log(
          //   `[TriggerEngine] ✅ Trigger "${t.name}" FIRED! Spawning ${t.npc_count}× ${t.npc_type}`,
          // );
        }
      }

      if (spawnList.length > 0) {
        setSpawnRequests((prev) => [...prev, ...spawnList]);
      }
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

    // console.log("[TriggerEngine] Socket listeners attached");

    return () => {
      socket.off("tiktok:chat", onChat);
      socket.off("tiktok:gift", onGift);
      socket.off("tiktok:like", onLike);
      socket.off("tiktok:share", onShare);
      socket.off("tiktok:follow", onFollow);
      // console.log("[TriggerEngine] Socket listeners removed");
    };
  }, [socket, setSpawnRequests]);
}
