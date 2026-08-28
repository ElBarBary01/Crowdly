import express from "express";
import {
  getEventsHandler,
  getLatestEventsHandler,
  getEventByIdHandler,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
} from "../controllers/event";

const router = express.Router();

router.get("/", getEventsHandler);
router.get("/latest", getLatestEventsHandler);
router.get("/:id", getEventByIdHandler);
router.post("/", createEventHandler);
router.put("/:id", updateEventHandler);
router.delete("/:id", deleteEventHandler);

export default router;