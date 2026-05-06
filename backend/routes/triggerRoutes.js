import { Router } from "express";
import {
  getTriggers,
  postTrigger,
  putTrigger,
  removeTrigger,
} from "../controllers/triggerController.js";

const router = Router();

router.get("/", getTriggers);
router.post("/", postTrigger);
router.patch("/:id", putTrigger);
router.delete("/:id", removeTrigger);

export default router;
