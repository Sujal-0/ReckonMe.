import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import { uploadMiddleware, parseQuestionsFile } from "../controllers/uploadController.js";

const uploadRoutes = Router();

uploadRoutes.post("/parse", verifyToken, uploadMiddleware, parseQuestionsFile);

export default uploadRoutes;
