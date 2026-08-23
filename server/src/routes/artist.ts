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
router.post("/", createArtistHandler);
router.put("/:id", updateArtistHandler);
router.delete("/:id", deleteArtistHandler);

export default router;