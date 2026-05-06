import { Router } from "express";
import { getGifts, patchGiftActive } from "../controllers/giftController.js";

const router = Router();

router.get("/", getGifts);
router.patch("/:giftId/active", patchGiftActive);

export default router;
