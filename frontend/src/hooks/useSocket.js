import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../utils/const";

// Module-level singleton — chỉ tạo 1 socket duy nhất cho toàn app
let _socket = null;

function getSocket() {
  if (!_socket) {
    _socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return _socket;
}

/**
 * Hook quản lý kết nối Socket.IO tới backend.
 * Dùng module-level singleton → luôn trả về cùng 1 socket instance.
 *
 * @returns {{ socket: import('socket.io-client').Socket | null, connected: boolean }}
 */
export function useSocket() {
  const socket = getSocket();
  const [connected, setConnected] = useState(() => socket?.connected ?? false);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  return { socket, connected };
}
