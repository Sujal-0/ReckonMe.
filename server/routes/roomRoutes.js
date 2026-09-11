// server/routes/roomRoutes.js
import express from "express";
import { 
  createRoom, 
  getRoom, 
  joinRoom, 
  deleteRoom, 
  listRooms,
  getAvailableCategories
} from "../controllers/roomController.js";

const router = express.Router();

// POST /api/rooms - Generate room ID (actual creation via socket)
router.post("/", createRoom);

// POST /api/rooms/join-room - Validate room join (actual join via socket)
router.post("/join-room", joinRoom);

// GET /api/rooms/categories - Fetch all available global question categories
router.get("/categories", getAvailableCategories);

// GET /api/rooms/:roomId - Get room data
router.get("/:roomId", getRoom);

// DELETE /api/rooms/:roomId - Delete room (admin/cleanup)
router.delete("/:roomId", deleteRoom);

// GET /api/rooms - List all rooms (admin/debug)
router.get("/", listRooms);

export default router;