import { Router } from "express";
import { getUserInfo, login, signup, updateProfile, updateAvatar, logout, deleteAccount } from "../controllers/AuthController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const authRoutes = Router();

authRoutes.post("/signup", signup);
authRoutes.post("/login", login);
authRoutes.get("/user-info", verifyToken, getUserInfo);
authRoutes.post("/update-profile", verifyToken, updateProfile);
authRoutes.post("/update-avatar", verifyToken, updateAvatar);
authRoutes.post("/logout", logout);
authRoutes.delete("/delete-account", verifyToken, deleteAccount);

export default authRoutes;