import { useState } from "react";

/**
 * Avatar tròn có fallback khi ảnh lỗi.
 */
const ChatAvatar = ({ src, alt, size = "md" }) => {
  const [error, setError] = useState(false);

  const sizeClass = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const textSize = size === "sm" ? "text-[8px]" : "text-[10px]";

  if (!src || error) {
    return (
      <div
        className={`${sizeClass} shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-700 ${textSize} font-bold text-white/60`}
      >
        {alt ? alt.charAt(0).toUpperCase() : "?"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeClass} shrink-0 rounded-full border border-white/10 object-cover`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
    />
  );
};

export default ChatAvatar;
