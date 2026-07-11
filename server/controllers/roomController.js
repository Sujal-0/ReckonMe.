// server/controllers/roomController.js
import Room from "../models/RoomModel.js";
import { nanoid } from "nanoid";

// ✅ Create Room (mainly for REST API, socket handles actual creation)
export const createRoom = async (req, res) => {
  try {
    let roomId;
    let tries = 0;
    const MAX_TRIES = 6;

    // Ensure uniqueness
    while (!roomId && tries < MAX_TRIES) {
      const candidate = nanoid(5).toUpperCase();
      const exists = await Room.findOne({ roomId: candidate });
      if (!exists) {
        roomId = candidate;
      } else {
        tries++;
      }
    }

    if (!roomId) {
      return res.status(500).json({ error: "Could not generate unique room id" });
    }

    // Just return the roomId - let socket handle actual room creation
    // This ensures we don't create duplicate rooms
    return res.status(201).json({ roomId });
    
  } catch (err) {
    console.error("❌ createRoom error:", err);
    return res.status(500).json({ error: "Failed to create room" });
  }
};

// ✅ Join Room validation (socket handles actual joining)
export const joinRoom = async (req, res) => {
  try {
    const { roomId, playerId } = req.body;

    if (!roomId || !playerId) {
      return res.status(400).json({ error: "Room ID and Player ID are required" });
    }

    const room = await Room.findOne({ roomId: roomId.toUpperCase() });
    
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Don't check isLocked here - it might change between validation and socket join
    // Only check absolute maximum
    if (room.players.length >= room.maxPlayers) {
      const activePlayers = room.players.filter(p => !p.disconnectedAt);
      if (activePlayers.length >= room.maxPlayers) {
        return res.status(400).json({ error: "Room is full" });
      }
    }

    // Check if player already in room - allow rejoin
    const existingPlayer = room.players.find(p => p.id === playerId);
    if (existingPlayer) {
      return res.json({ 
        canJoin: true,
        isRejoin: true,
        roomId: room.roomId,
        playersCount: room.players.length,
        maxPlayers: room.maxPlayers
      });
    }

    // Return success with room info
    res.json({ 
      canJoin: true,
      isRejoin: false,
      roomId: room.roomId,
      playersCount: room.players.length,
      maxPlayers: room.maxPlayers
    });
    
  } catch (err) {
    console.error("❌ joinRoom error:", err);
    res.status(500).json({ error: "Failed to validate room join" });
  }
};

// ✅ Get Room (for page refreshes, reconnection)
export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      return res.status(400).json({ error: "Room ID is required" });
    }

    const room = await Room.findOne({ roomId: roomId.toUpperCase() });
    
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json(room);
    
  } catch (err) {
    console.error("❌ getRoom error:", err);
    res.status(500).json({ error: "Failed to fetch room" });
  }
};

// ✅ Delete Room (for cleanup, admin purposes)
export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      return res.status(400).json({ error: "Room ID is required" });
    }

    const deleted = await Room.findOneAndDelete({ roomId: roomId.toUpperCase() });
    
    if (!deleted) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json({ message: "Room deleted successfully" });
    
  } catch (err) {
    console.error("❌ deleteRoom error:", err);
    res.status(500).json({ error: "Failed to delete room" });
  }
};

// ✅ List all rooms (for debugging/admin)
export const listRooms = async (req, res) => {
  try {
    const rooms = await Room.find({})
      .select('roomId status players.length maxPlayers isLocked createdAt')
      .sort({ createdAt: -1 });
      
    res.json(rooms);
    
  } catch (err) {
    console.error("❌ listRooms error:", err);
    res.status(500).json({ error: "Failed to list rooms" });
  }
};

