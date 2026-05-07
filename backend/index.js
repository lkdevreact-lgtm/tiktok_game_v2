import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "node:http";

import routes from "./routes/index.js";
import { initSocketIO } from "./socket/socketManager.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8888;

app.use(cors({
  origin: true,           // reflect request origin → cho phép mọi domain
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", routes);

app.use((err, _req, res, _next) => {
  console.error("[server] unhandled error:", err);
  res.status(500).json({ success: false, reason: "Internal server error" });
});

// Tạo HTTP server rồi gắn Socket.IO lên đó
const httpServer = createServer(app);
initSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
