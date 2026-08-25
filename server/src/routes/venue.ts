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
router.post("/", createVenueHandler);
router.put("/:id", updateVenueHandler);
router.delete("/:id", deleteVenueHandler);

export default router;