import { useState, useEffect } from "react";

/**
 * Hiển thị 1 lần duy nhất khi vô game, ở giữa màn hình.
 * Hiện 2 giây rồi fade out từ từ.
 */
const GameHint = () => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Sau 2 giây bắt đầu fade
    const fadeTimer = setTimeout(() => setFading(true), 2000);
    // Sau 3.5 giây ẩn hẳn (1.5s fade)
    const hideTimer = setTimeout(() => setVisible(false), 3500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[9997] flex items-center justify-center transition-opacity duration-[1500ms] ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="rounded-2xl border border-white/10 bg-black/30 px-8 py-5 backdrop-blur-md">
        <p className="text-center text-base font-medium text-white/90 leading-relaxed">
          Bạn có thể xoay camera về phía trước
          <br />
          bằng cách <span className="font-bold text-amber-300">giữ chuột rồi xoay</span>,
          sẽ có điều bất ngờ ✨
        </p>
      </div>
    </div>
  );
};

export default GameHint;
