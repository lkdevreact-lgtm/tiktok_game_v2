import { Server } from "socket.io";

/** @type {Server | null} */
let io = null;

/**
 * Khởi tạo Socket.IO server, gắn vào HTTP server.
 * Gọi 1 lần duy nhất trong index.js.
 */
export function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Lấy instance Socket.IO đã khởi tạo.
 * Trả về null nếu chưa gọi initSocketIO.
 */
export function getIO() {
  return io;
}
