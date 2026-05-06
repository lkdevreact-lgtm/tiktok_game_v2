import { useEffect, useState } from "react";
import { fetchGifts, setGiftActive } from "../../../api/gifts";
import { FaSearch } from "react-icons/fa";
import { IMAGES } from "../../../utils/const";

const GiftsTab = () => {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchGifts();
        if (!cancelled) setGifts(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Không thể tải gift.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (gift) => {
    const next = !gift.active;
    setUpdatingId(gift.gift_id);
    setGifts((list) =>
      list.map((g) =>
        g.gift_id === gift.gift_id ? { ...g, active: next } : g,
      ),
    );
    try {
      const updated = await setGiftActive(gift.gift_id, next);
      if (updated) {
        setGifts((list) =>
          list.map((g) => (g.gift_id === updated.gift_id ? updated : g)),
        );
      }
    } catch (err) {
      setGifts((list) =>
        list.map((g) =>
          g.gift_id === gift.gift_id ? { ...g, active: gift.active } : g,
        ),
      );
      setError(err.message || "Cập nhật thất bại.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = gifts.filter((g) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      g.gift_name?.toLowerCase().includes(q) || String(g.gift_id).includes(q)
    );
  });

  const activeCount = gifts.filter((g) => g.active).length;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-200">Gifts</div>
        <div className="text-xs text-slate-400">
          {loading
            ? "Đang tải..."
            : `${activeCount} / ${gifts.length} gift đang active`}
        </div>
      </div>
      <div className="mb-2 w-full relative">
        <FaSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc ID..."
          className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pr-3 pl-9 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/10 bg-black/30">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-slate-400">
            Đang tải gift...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-slate-500">
            Không tìm thấy gift nào.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((g) => (
              <GiftRow
                key={g.gift_id}
                gift={g}
                onToggle={handleToggle}
                disabled={updatingId === g.gift_id}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const GiftRow = ({ gift, onToggle, disabled }) => {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-white/5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40">
        {gift.image ? (
          <img
            src={gift.image}
            alt={gift.gift_name}
            className="h-full w-full object-contain"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span className="text-[10px] text-slate-600">no image</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">
          {gift.gift_name}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
          <span>ID: {gift.gift_id}</span>
          {gift.diamonds != null && (
            <>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1">
                <span className="text-amber-300">{gift.diamonds}</span>
                <img src={IMAGES.COIN} alt="Coin" className="w-3 h-3 object-contain"/>
              </div>
            </>
          )}
          {/* {gift.max_repeat_count != null && (
            <>
              <span className="text-slate-600">•</span>
              <span>x{gift.max_repeat_count}</span>
            </>
          )} */}
        </div>
      </div>

      <ToggleSwitch
        checked={!!gift.active}
        disabled={disabled}
        onChange={() => onToggle(gift)}
      />
    </li>
  );
};

const ToggleSwitch = ({ checked, disabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? "bg-emerald-500" : "bg-slate-600"
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
        checked ? "translate-x-5" : "translate-x-0.5"
      }`}
    />
  </button>
);

export default GiftsTab;
