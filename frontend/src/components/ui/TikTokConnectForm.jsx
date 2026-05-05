import { useState } from "react";
import { connectTikTok } from "../../api/tiktok";

const STATUS = {
  IDLE: "idle",
  CONNECTING: "connecting",
  SUCCESS: "success",
  ERROR: "error",
};

const TikTokConnectForm = ({ onConnected }) => {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState(STATUS.IDLE);
  const [reason, setReason] = useState("");
  const [info, setInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === STATUS.CONNECTING) return;

    setStatus(STATUS.CONNECTING);
    setReason("");
    setInfo(null);

    try {
      const data = await connectTikTok(username);
      setStatus(STATUS.SUCCESS);
      setInfo(data);
      // Đợi 600ms cho user thấy trạng thái success rồi mới vào game.
      setTimeout(() => onConnected?.(data), 600);
    } catch (err) {
      setStatus(STATUS.ERROR);
      setReason(err.message || "Không thể kết nối tới TikTok Live.");
    }
  };

  const isConnecting = status === STATUS.CONNECTING;
  const isSuccess = status === STATUS.SUCCESS;

  return (
    <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <div className="w-[92%] max-w-md rounded-2xl border border-white/10 bg-linear-to-b from-slate-900/90 to-slate-950/90 p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h2
            className="text-3xl font-black tracking-wider"
            style={{
              background:
                "linear-gradient(135deg, #ef4444 0%, #dc2626 40%, #3b82f6 60%, #2563eb 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            CONNECT TIKTOK LIVE
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Nhập username TikTok đang livestream để bắt đầu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 focus-within:border-red-500/60">
            <span className="text-slate-500">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username_tiktok"
              autoFocus
              disabled={isConnecting || isSuccess}
              className="flex-1 bg-transparent text-white placeholder:text-slate-600 focus:outline-none disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isConnecting || isSuccess || !username.trim()}
            className="w-full rounded-lg bg-linear-to-r from-red-600 to-blue-600 px-4 py-2.5 font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConnecting ? "Đang kết nối..." : isSuccess ? "Đã kết nối ✓" : "Connect"}
          </button>

          <StatusBlock
            status={status}
            reason={reason}
            info={info}
            username={username.trim().replace(/^@+/, "")}
          />
        </form>
      </div>
    </div>
  );
};

const StatusBlock = ({ status, reason, info, username }) => {
  if (status === STATUS.IDLE) return null;

  if (status === STATUS.CONNECTING) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
        <Spinner />
        <span>Đang kiểm tra phiên live của @{username}…</span>
      </div>
    );
  }

  if (status === STATUS.SUCCESS) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
        <div className="font-medium">Kết nối thành công ✓</div>
        {info?.roomId && (
          <div className="mt-1 text-xs text-emerald-300/80">Room ID: {info.roomId}</div>
        )}
      </div>
    );
  }

  if (status === STATUS.ERROR) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        <div className="font-medium">Kết nối thất bại</div>
        <div className="mt-1 text-xs text-red-300/90">Lý do: {reason}</div>
      </div>
    );
  }

  return null;
};

const Spinner = () => (
  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-300/40 border-t-blue-300" />
);

export default TikTokConnectForm;
