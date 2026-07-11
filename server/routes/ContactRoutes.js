import express from "express";
import { submitMessage } from "../controllers/contactController.js";

const contactRoutes = express.Router();

contactRoutes.post("/contact", submitMessage);

export default contactRoutes;
