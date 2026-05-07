import { useEffect, useState } from "react";
import { FaPlus, FaPen, FaTrash } from "react-icons/fa";
import {
  fetchTriggers,
  createTrigger,
  updateTrigger,
  deleteTrigger,
} from "../../../api/triggers";
import { NPC_REGISTRY } from "../../../config/npcRegistry";

const EVENT_TYPES = [
  { value: "comment", label: "Comment" },
  { value: "like", label: "Like" },
  { value: "share", label: "Share" },
  { value: "gift", label: "Gift" },
  { value: "follow", label: "Follow" },
];

const EMPTY_FORM = {
  name: "",
  event_type: "comment",
  match_value: "",
  threshold: 1,
  gift_id: "",
  npc_type: NPC_REGISTRY[0]?.id || "npc1",
  npc_count: 1,
  active: true,
};

const TriggersList = ({ gifts = [] }) => {
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTriggers();
        if (!cancelled) setTriggers(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Không thể tải trigger.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = () => setEditing({ mode: "create", form: { ...EMPTY_FORM } });

  const openEdit = (t) =>
    setEditing({
      mode: "edit",
      id: t.id,
      form: {
        name: t.name || "",
        event_type: t.event_type,
        match_value: t.match_value || "",
        threshold: t.threshold,
        gift_id: t.gift_id ?? "",
        npc_type: t.npc_type || NPC_REGISTRY[0]?.id || "npc1",
        npc_count: t.npc_count,
        active: !!t.active,
      },
    });

  const closeEditor = () => setEditing(null);

  const handleSubmit = async (form) => {
    setError("");
    const payload = {
      name: form.name,
      event_type: form.event_type,
      match_value: form.match_value || null,
      threshold: Number(form.threshold) || 1,
      gift_id: form.event_type === "gift" && form.gift_id !== "" ? Number(form.gift_id) : null,
      npc_type: form.npc_type,
      npc_count: Number(form.npc_count) || 1,
      active: !!form.active,
    };

    try {
      if (editing.mode === "create") {
        const created = await createTrigger(payload);
        if (created) setTriggers((list) => [created, ...list]);
      } else {
        const updated = await updateTrigger(editing.id, payload);
        if (updated) {
          setTriggers((list) =>
            list.map((t) => (t.id === updated.id ? updated : t)),
          );
        }
      }
      setEditing(null);
    } catch (err) {
      setError(err.message || "Lưu trigger thất bại.");
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Xoá trigger "${t.name}"?`)) return;
    setBusyId(t.id);
    try {
      await deleteTrigger(t.id);
      setTriggers((list) => list.filter((x) => x.id !== t.id));
    } catch (err) {
      setError(err.message || "Xoá trigger thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (t) => {
    setBusyId(t.id);
    setTriggers((list) =>
      list.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x)),
    );
    try {
      const updated = await updateTrigger(t.id, { active: !t.active });
      if (updated) {
        setTriggers((list) =>
          list.map((x) => (x.id === updated.id ? updated : x)),
        );
      }
    } catch (err) {
      setTriggers((list) =>
        list.map((x) => (x.id === t.id ? { ...x, active: t.active } : x)),
      );
      setError(err.message || "Cập nhật thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          {loading ? "Đang tải..." : `${triggers.length} trigger`}
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
        >
          <FaPlus size={11} /> Thêm trigger
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/10 bg-black/30">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-slate-400">
            Đang tải trigger...
          </div>
        ) : triggers.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-slate-500">
            Chưa có trigger nào. Bấm "Thêm trigger" để tạo mới.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {triggers.map((t) => (
              <TriggerRow
                key={t.id}
                trigger={t}
                gifts={gifts}
                disabled={busyId === t.id}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggle={toggleActive}
              />
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <TriggerEditor
          gifts={gifts}
          mode={editing.mode}
          initialForm={editing.form}
          onCancel={closeEditor}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

const TriggerRow = ({ trigger, gifts, disabled, onEdit, onDelete, onToggle }) => {
  const giftName =
    trigger.event_type === "gift" && trigger.gift_id != null
      ? gifts.find((g) => g.gift_id === trigger.gift_id)?.gift_name ||
        `#${trigger.gift_id}`
      : null;

  // Tìm label NPC từ registry
  const npcEntry = NPC_REGISTRY.find((n) => n.id === trigger.npc_type);
  const npcLabel = npcEntry
    ? `${npcEntry.label} (${npcEntry.id})`
    : trigger.npc_type;

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-white/5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-white">
            {trigger.name}
          </span>
          <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-200 uppercase">
            {trigger.event_type}
          </span>
          {!trigger.active && (
            <span className="rounded bg-slate-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
              OFF
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
          {giftName && <span>Gift: {giftName}</span>}
          {trigger.match_value && <span>Khớp: "{trigger.match_value}"</span>}
          <span>Ngưỡng: {trigger.threshold}</span>
          <span className="text-slate-600">•</span>
          <span>
            Spawn: {trigger.npc_count}× {npcLabel}
          </span>
        </div>
      </div>

      <ToggleSwitch
        checked={!!trigger.active}
        disabled={disabled}
        onChange={() => onToggle(trigger)}
      />
      <button
        type="button"
        onClick={() => onEdit(trigger)}
        disabled={disabled}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        aria-label="Edit trigger"
      >
        <FaPen size={12} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(trigger)}
        disabled={disabled}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
        aria-label="Delete trigger"
      >
        <FaTrash size={12} />
      </button>
    </li>
  );
};

const TriggerEditor = ({ gifts, mode, initialForm, onCancel, onSubmit }) => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isGift = form.event_type === "gift";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.npc_type.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[10010] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl"
      >
        <h3 className="mb-4 text-base font-semibold text-white">
          {mode === "create" ? "Thêm trigger" : "Sửa trigger"}
        </h3>

        <div className="space-y-3">
          <Field label="Tên trigger">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              placeholder="VD: Comment 111 → spawn NPC"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Loại event">
              <select
                value={form.event_type}
                onChange={(e) => setField("event_type", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              >
                {EVENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ngưỡng kích hoạt">
              <input
                type="number"
                min={1}
                value={form.threshold}
                onChange={(e) => setField("threshold", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              />
            </Field>
          </div>

          {isGift && (
            <Field label="Gift">
              <select
                value={form.gift_id}
                onChange={(e) => setField("gift_id", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              >
                <option value="">— Mọi gift —</option>
                {gifts.map((g) => (
                  <option key={g.gift_id} value={g.gift_id}>
                    {g.gift_name} (#{g.gift_id})
                  </option>
                ))}
              </select>
            </Field>
          )}

          {form.event_type === "comment" && (
            <Field label="Khớp comment (tùy chọn)">
              <input
                type="text"
                value={form.match_value}
                onChange={(e) => setField("match_value", e.target.value)}
                placeholder="VD: 111"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Loại NPC">
              <select
                value={form.npc_type}
                onChange={(e) => setField("npc_type", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              >
                {NPC_REGISTRY.map((npc) => (
                  <option key={npc.id} value={npc.id}>
                    {npc.label} ({npc.id})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Số lượng NPC">
              <input
                type="number"
                min={1}
                value={form.npc_count}
                onChange={(e) => setField("npc_count", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setField("active", e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Kích hoạt trigger
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? "Đang lưu..." : mode === "create" ? "Tạo" : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-slate-400">
      {label}
    </span>
    {children}
  </label>
);

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

export default TriggersList;
