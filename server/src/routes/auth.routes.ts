import { Router } from "express";
import {
  register,
  login,
  logout,
  me,
  verifyEmail,
  verifyCode,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/verify-code", verifyCode);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
