import express from "express";
import {
  getEventsHandler,
  getEventByIdHandler,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
  getRelatedEventsHandler,
} from "../controllers/event";

const router = express.Router();

router.get("/", getEventsHandler);
router.get("/:id", getEventByIdHandler);
router.post("/", createEventHandler);
router.put("/:id", updateEventHandler);
router.get("/:id/related", getRelatedEventsHandler);
router.delete("/:id", deleteEventHandler);

export default router;
