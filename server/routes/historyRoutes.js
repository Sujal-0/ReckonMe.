import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import { getUserHistory } from "../controllers/historyController.js";

const historyRoutes = Router();

historyRoutes.get("/", verifyToken, getUserHistory);

export default historyRoutes;
