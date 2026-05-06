import { Router } from "express";
import tiktokRoutes from "./tiktokRoutes.js";
import giftRoutes from "./giftRoutes.js";
import triggerRoutes from "./triggerRoutes.js";

const router = Router();

router.use("/tiktok", tiktokRoutes);
router.use("/gifts", giftRoutes);
router.use("/triggers", triggerRoutes);

export default router;
