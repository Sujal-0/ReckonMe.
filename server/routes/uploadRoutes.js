import { Router } from "express";
import { uploadMiddleware, parseQuestionsFile } from "../controllers/uploadController.js";

const uploadRoutes = Router();

// This is a stateless utility route that parses files. It does not modify the DB.
// We remove verifyToken so Admins can use it from the dashboard.
uploadRoutes.post("/parse", uploadMiddleware, parseQuestionsFile);

export default uploadRoutes;
