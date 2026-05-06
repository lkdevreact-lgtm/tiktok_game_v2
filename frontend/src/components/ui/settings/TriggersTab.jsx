import { useEffect, useState } from "react";
import { fetchGifts } from "../../../api/gifts";
import TriggersList from "./TriggersList";

const TriggersTab = () => {
  const [gifts, setGifts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchGifts();
        if (!cancelled) setGifts(data);
      } catch {
        // gifts are optional context for TriggersList — swallow errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 text-sm font-semibold text-slate-200">
        Triggers (NPC spawn rules)
      </div>
      <div className="min-h-0 flex-1">
        <TriggersList gifts={gifts} />
      </div>
    </div>
  );
};

export default TriggersTab;
