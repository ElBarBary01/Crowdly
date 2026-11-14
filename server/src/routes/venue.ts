import { requireAuth, requireAdmin } from "../middleware/auth.middleware";
import express from "express";
import {
  getVenuesHandler,
  getVenueByIdHandler,
  createVenueHandler,
  updateVenueHandler,
  deleteVenueHandler,
} from "../controllers/venue";

const router = express.Router();

router.get("/", getVenuesHandler);
router.get("/:id", getVenueByIdHandler);
router.post("/", requireAuth, requireAdmin, createVenueHandler);
router.put("/:id", requireAuth, requireAdmin, updateVenueHandler);
router.delete("/:id", requireAuth, requireAdmin, deleteVenueHandler);

export default router;
