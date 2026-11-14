import { requireAdmin, requireOwnUser } from "../middleware/auth.middleware";
import express from "express";
import {
  getUsersHandler,
  getUserByIdHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from "../controllers/user";

const router = express.Router();

router.get("/", requireAdmin, getUsersHandler);
router.get("/:id", requireOwnUser, getUserByIdHandler);
router.post("/", requireAdmin, createUserHandler);
router.put("/:id", requireOwnUser, updateUserHandler);
router.delete("/:id", requireOwnUser, deleteUserHandler);

export default router;
