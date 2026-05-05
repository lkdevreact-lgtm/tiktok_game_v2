import { Router } from "express";
import tiktokRoutes from "./tiktokRoutes.js";

const router = Router();

router.use("/tiktok", tiktokRoutes);

export default router;
