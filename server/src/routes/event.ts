import { requireAuth, requireAdmin } from "../middleware/auth.middleware";
import express from "express";
import {
  getEventsHandler,
  getLatestEventsHandler,
  getEventByIdHandler,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
  getRelatedEventsHandler,
  getTrendingEventsHandler,
} from "../controllers/event";

const router = express.Router();

router.get("/", getEventsHandler);
router.get("/latest", getLatestEventsHandler);
router.get("/trending", getTrendingEventsHandler);
router.get("/:id", getEventByIdHandler);
router.post("/", requireAuth, requireAdmin, createEventHandler);
router.put("/:id", requireAuth, requireAdmin, updateEventHandler);
router.get("/:id/related", getRelatedEventsHandler);
router.delete("/:id", requireAuth, requireAdmin, deleteEventHandler);

export default router;
