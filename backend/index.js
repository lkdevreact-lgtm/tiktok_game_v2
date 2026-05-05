import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import routes from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8888;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", routes);

app.use((err, _req, res, _next) => {
  console.error("[server] unhandled error:", err);
  res.status(500).json({ success: false, reason: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
