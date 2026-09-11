import { Router } from "express";
import { signup, login, logout, getUserInfo, updateAvatar } from "../controllers/AuthController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const authRoutes = Router();

authRoutes.post("/signup", signup);
authRoutes.post("/login", login);
authRoutes.get("/user-info",verifyToken, getUserInfo);
authRoutes.post("/update-avatar", verifyToken, updateAvatar);

authRoutes.post("/logout", logout);

export default authRoutes;