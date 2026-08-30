import express from "express";
import { getHomeData } from "../controllers/home";
const router = express.Router();

router.get("/", getHomeData);

export default router;
