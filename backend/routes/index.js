import { Router } from "express";
import tiktokRoutes from "./tiktokRoutes.js";
import giftRoutes from "./giftRoutes.js";

const router = Router();

router.use("/tiktok", tiktokRoutes);
router.use("/gifts", giftRoutes);

export default router;
