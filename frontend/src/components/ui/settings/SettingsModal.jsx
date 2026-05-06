import { useState } from "react";
import { IoClose } from "react-icons/io5";
import { FaGift } from "react-icons/fa";
import GiftsTab from "./GiftsTab";

const TABS = [
  { id: "gifts", label: "Gifts", icon: FaGift, Component: GiftsTab },
];

const SettingsModal = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  if (!open) return null;

  const ActiveComponent =
    TABS.find((t) => t.id === activeTab)?.Component || (() => null);

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] max-h-[640px] w-[92%] max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-slate-900/95 to-slate-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 className="text-lg font-bold tracking-wide text-white">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close settings"
          >
            <IoClose size={22} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav className="flex w-44 shrink-0 flex-col gap-1 border-r border-white/10 bg-black/30 p-3">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = id === activeTab;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600/20 text-blue-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon /> {label}
                </button>
              );
            })}
          </nav>

          <section className="min-h-0 flex-1 overflow-hidden p-4">
            <ActiveComponent />
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
