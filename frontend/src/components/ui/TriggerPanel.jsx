import { useEffect, useState, useRef, useCallback } from "react";
import { fetchTriggers } from "../../api/triggers";
import { fetchGifts } from "../../api/gifts";
import { NPC_REGISTRY } from "../../config/npcRegistry";
import { EVENT_ICONS, EVENT_LABELS } from "../../utils/const";


const TriggerPanel = () => {
  const [triggers, setTriggers] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drag state
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Load data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [triggerData, giftData] = await Promise.all([
          fetchTriggers(),
          fetchGifts(),
        ]);
        if (!cancelled) {
          setTriggers((triggerData || []).filter((t) => t.active));
          setGifts(giftData || []);
        }
      } catch (err) {
        console.error("[TriggerPanel] Failed to load:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Set initial position (right center) after first render
  useEffect(() => {
    if (initialized || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setPos({
      x: window.innerWidth - rect.width - 16,
      y: Math.round((window.innerHeight - rect.height) / 2),
    });
    setInitialized(true);
  }, [loading, initialized]);

  // Drag handlers
  const onPointerDown = useCallback((e) => {
    if (!panelRef.current) return;
    dragging.current = true;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    setPos({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (loading || triggers.length === 0) return null;

  return (
    <div
      ref={panelRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9998,
        touchAction: "none",
        cursor: dragging.current ? "grabbing" : "grab",
      }}
      className="pointer-events-auto select-none"
    >
      <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/50 px-3 py-3 backdrop-blur-md">
        {/* Header — drag handle */}
        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-sm">⚡</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            Triệu hồi
          </span>
          <span className="ml-auto text-[10px] text-white/20">⠿</span>
        </div>

        {triggers.map((t) => (
          <TriggerEntry key={t.id} trigger={t} gifts={gifts} />
        ))}
      </div>
    </div>
  );
};

const TriggerEntry = ({ trigger, gifts }) => {
  const npc = NPC_REGISTRY.find((n) => n.id === trigger.npc_type);
  const npcLabel = npc?.label || trigger.npc_type;

  const giftInfo = trigger.event_type === "gift" && trigger.gift_id != null
    ? gifts.find((g) => g.gift_id === Number(trigger.gift_id))
    : null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
      {/* Left: Event condition */}
      <div className="flex items-center gap-1.5">
        {trigger.event_type === "gift" && giftInfo ? (
          <>
            {giftInfo.image ? (
              <img
                src={giftInfo.image}
                alt={giftInfo.gift_name}
                className="h-5 w-5 object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <span className="text-sm">{EVENT_ICONS.gift}</span>
            )}
            <span className="text-xs font-medium text-amber-300">
              {giftInfo.gift_name}
            </span>
          </>
        ) : (
          <>
            <span className="text-sm">{EVENT_ICONS[trigger.event_type] || "⚡"}</span>
            <span className="text-xs font-medium text-white/80">
              {EVENT_LABELS[trigger.event_type] || trigger.event_type}
            </span>
          </>
        )}

        {trigger.threshold > 1 && (
          <span className="text-[10px] font-bold text-blue-300">
            x{trigger.threshold}
          </span>
        )}

        {trigger.event_type === "comment" && trigger.match_value && (
          <span className="rounded bg-white/10 px-1 text-[10px] text-slate-300">
            "{trigger.match_value}"
          </span>
        )}
      </div>

      {/* Arrow */}
      <span className="text-[10px] text-white/30">→</span>

      {/* Right: NPC spawn info */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-emerald-400">
          x{trigger.npc_count}
        </span>
        <span className="text-xs font-semibold text-emerald-200">
          {npcLabel}
        </span>
      </div>
    </div>
  );
};

export default TriggerPanel;
