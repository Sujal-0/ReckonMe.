import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import {
  getQuestionBooks,
  createQuestionBook,
  updateQuestionBook,
  deleteQuestionBook
} from "../controllers/questionBookController.js";

const questionBookRoutes = Router();

questionBookRoutes.get("/", verifyToken, getQuestionBooks);
questionBookRoutes.post("/", verifyToken, createQuestionBook);
questionBookRoutes.put("/:id", verifyToken, updateQuestionBook);
questionBookRoutes.delete("/:id", verifyToken, deleteQuestionBook);

export default questionBookRoutes;
