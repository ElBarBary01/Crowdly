import { requireAuth, requireAdmin } from "../middleware/auth.middleware";
import express from "express";
import {
  getArtistsHandler,
  getArtistByIdHandler,
  createArtistHandler,
  updateArtistHandler,
  deleteArtistHandler,
} from "../controllers/artist";

const router = express.Router();

router.get("/", getArtistsHandler);
router.get("/:id", getArtistByIdHandler);
router.post("/", requireAuth, requireAdmin, createArtistHandler);
router.put("/:id", requireAuth, requireAdmin, updateArtistHandler);
router.delete("/:id", requireAuth, requireAdmin, deleteArtistHandler);

export default router;
