import { Router } from "express";
import {
  connectTikTok,
  disconnectTikTok,
  getTikTokStatus,
} from "../controllers/tiktokController.js";

const router = Router();

router.post("/connect", connectTikTok);
router.post("/disconnect", disconnectTikTok);
router.get("/status", getTikTokStatus);

export default router;
