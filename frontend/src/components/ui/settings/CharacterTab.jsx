import { useState } from "react";
import { useAtom } from "jotai";
import { FaUser, FaRobot } from "react-icons/fa";
import {
  userHeroConfigAtom,
  npcRegistryAtom,
} from "../../../stores/characterStore";

const SUB_TABS = [
  { id: "hero", label: "User Hero", icon: FaUser },
  { id: "npc", label: "NPC", icon: FaRobot },
];

const NumberField = ({ label, value, onChange, step = 1, min = 0 }) => (
  <label className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition hover:bg-white/5">
    <span className="text-sm text-slate-300">{label}</span>
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-24 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-right text-sm tabular-nums text-white focus:border-blue-500/50 focus:outline-none"
    />
  </label>
);

const HeroSettings = () => {
  const [cfg, setCfg] = useAtom(userHeroConfigAtom);

  const set = (key, v) => setCfg((p) => ({ ...p, [key]: v }));
  const setDmg = (key, v) =>
    setCfg((p) => ({ ...p, damage: { ...p.damage, [key]: v } }));

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        Movement
      </div>
      <NumberField label="Move Speed" value={cfg.moveSpeed} step={1} onChange={(v) => set("moveSpeed", v)} />
      <NumberField label="Jump Force" value={cfg.jumpForce} step={1} onChange={(v) => set("jumpForce", v)} />
      <NumberField label="Attack Range" value={cfg.attackRange} step={1} onChange={(v) => set("attackRange", v)} />

      <div className="mb-1 mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        Damage per skill
      </div>
      <NumberField label="Punch" value={cfg.damage.Punch} step={0.1} onChange={(v) => setDmg("Punch", v)} />
      <NumberField label="Kick" value={cfg.damage.Kick} step={0.1} onChange={(v) => setDmg("Kick", v)} />
      <NumberField label="KickUp" value={cfg.damage.KickUp} step={0.1} onChange={(v) => setDmg("KickUp", v)} />
      <NumberField label="HookPunch" value={cfg.damage.HookPunch} step={0.1} onChange={(v) => setDmg("HookPunch", v)} />
    </div>
  );
};

const NpcCard = ({ npc, onChange }) => {
  const [open, setOpen] = useState(false);
  const up = (k, v) => onChange({ ...npc, [k]: v });

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/5"
      >
        <div>
          <span className="font-semibold text-white">{npc.label}</span>
          <span className="ml-2 text-xs text-slate-500">({npc.id})</span>
        </div>
        <span
          className="text-slate-500 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-1 border-t border-white/5 px-1 py-2">
          <div className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            General
          </div>
          <NumberField label="HP" value={npc.hp} step={1} onChange={(v) => up("hp", v)} />
          <NumberField label="Scale" value={npc.scale} step={0.5} onChange={(v) => up("scale", v)} />
          <NumberField label="Damage" value={npc.damage} step={0.1} onChange={(v) => up("damage", v)} />
          <NumberField label="Move Speed" value={npc.moveSpeed} step={1} onChange={(v) => up("moveSpeed", v)} />
          <NumberField label="Attack Range" value={npc.attackRange} step={1} onChange={(v) => up("attackRange", v)} />

          <div className="mb-1 mt-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Collider
          </div>
          <NumberField label="Half-Height" value={npc.capsuleHalfHeight} step={0.1} onChange={(v) => up("capsuleHalfHeight", v)} />
          <NumberField label="Radius" value={npc.capsuleRadius} step={0.1} onChange={(v) => up("capsuleRadius", v)} />
          <NumberField label="Offset Y" value={npc.capsuleOffsetY} step={0.1} onChange={(v) => up("capsuleOffsetY", v)} />
        </div>
      )}
    </div>
  );
};

const NpcSettings = () => {
  const [registry, setRegistry] = useAtom(npcRegistryAtom);

  const handleChange = (idx, updated) =>
    setRegistry((prev) => prev.map((n, i) => (i === idx ? updated : n)));

  return (
    <div className="flex flex-col gap-3">
      {registry.map((npc, idx) => (
        <NpcCard key={npc.id} npc={npc} onChange={(v) => handleChange(idx, v)} />
      ))}
    </div>
  );
};

const CharacterTab = () => {
  const [subTab, setSubTab] = useState("hero");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex gap-1 rounded-lg bg-black/30 p-1">
        {SUB_TABS.map(({ id, label, icon: Icon }) => {
          const active = id === subTab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-blue-600/25 text-blue-200 shadow-sm"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {subTab === "hero" ? <HeroSettings /> : <NpcSettings />}
      </div>
    </div>
  );
};

export default CharacterTab;
