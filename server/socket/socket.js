// server/socket/socket.js
import { Server } from "socket.io";
import Room from "../models/RoomModel.js";
import { GameService } from "../services/GameService.js";

export default function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    }
  });

  // Track socket to player mapping for cleanup
  const socketPlayerMap = new Map();
  const playerSocketMap = new Map(); // Reverse mapping for reconnection detection
  
  // Room timers for cleanup
  const ROOM_LIFETIME = 10 * 60 * 1000; // 10 minutes instead of 60 minutes
  const roomTimers = new Map();

  // Game timer handling
  const gameTimers = new Map();

  // Helper function to clear room timer
  const clearRoomTimer = (roomId) => {
    const timer = roomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer.timeout);
      clearInterval(timer.interval);
      roomTimers.delete(roomId);
    }
  };

  // Helper function to start room timer
  const startRoomTimer = (roomId) => {
    clearRoomTimer(roomId);
    const endTime = Date.now() + ROOM_LIFETIME;
    
    const interval = setInterval(async () => {
      const timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      io.to(roomId).emit("room-timer", timeLeft);
      
      if (timeLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    const timeout = setTimeout(async () => {
      try {
        const room = await Room.findOne({ roomId });
        // Only delete if still in lobby phase
        if (room && room.gameState.phase === 'lobby') {
          await Room.findOneAndDelete({ roomId });
          io.to(roomId).emit("room-expired", { 
            message: "Room has expired - game did not start within 10 minutes" 
          });
          io.in(roomId).socketsLeave(roomId);
          clearRoomTimer(roomId);
          console.log(`⏰ Lobby ${roomId} expired and deleted`);
        }
      } catch (err) {
        console.error("Error deleting expired room:", err);
      }
    }, ROOM_LIFETIME);

    roomTimers.set(roomId, { timeout, interval });
  };

  // Helper function to start game timer
  const startGameTimer = (roomId, duration) => {
    clearTimeout(gameTimers.get(roomId));
    
    const timer = setTimeout(async () => {
      try {
        const { room, gameResult } = await GameService.endGame(roomId);
        io.to(roomId).emit('game-ended', { 
          reason: 'timeout',
          result: gameResult
        });
        
        // Give clients time to process result before cleanup
        setTimeout(async () => {
          await Room.findOneAndDelete({ roomId });
          io.in(roomId).socketsLeave(roomId);
        }, 5000);
        
      } catch (error) {
        console.error('Game timer cleanup error:', error);
      }
    }, duration * 1000);

    gameTimers.set(roomId, timer);
  };

  // Helper to promote new host when current host leaves
  const promoteNewHost = async (room) => {
    if (room.players.length === 0) return null;
    
    // Promote first non-host player
    const newHost = room.players.find(p => !p.isHost);
    if (newHost) {
      newHost.isHost = true;
      console.log(`👑 Player ${newHost.id} promoted to host in room ${room.roomId}`);
    }
    
    return room;
  };

  // Handle player leaving room
  const handlePlayerLeave = async (socket, roomId, playerId, isIntentional = false) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) {
        console.log(`Room ${roomId} not found during player leave`);
        return;
      }

      const leavingPlayer = room.players.find(p => p.id === playerId);
      if (!leavingPlayer) {
        console.log(`Player ${playerId} not found in room ${roomId}`);
        return;
      }

      const wasHost = leavingPlayer.isHost;
      console.log(`🚪 Player ${playerId} (${wasHost ? 'HOST' : 'PLAYER'}) leaving room ${roomId}`);

      // Remove player from room
      room.players = room.players.filter(p => p.id !== playerId);

      if (room.players.length === 0) {
        // No players left - delete room
        await Room.findOneAndDelete({ roomId });
        clearRoomTimer(roomId);
        io.to(roomId).emit("room-deleted", { message: "Room closed - all players left" });
        console.log(`🗑️ Room ${roomId} deleted - no players remaining`);
        
      } else if (wasHost) {
        // Host left but other players remain - promote new host
        const newHost = room.players[0]; // Promote first remaining player
        newHost.isHost = true;
        room.hostHistory.push({
          playerId: newHost.id,
          timestamp: new Date()
        });
        room.isLocked = false;
        await room.save();
        
        // Emit two events for better client handling
        io.to(roomId).emit("host-changed", {
          newHostId: newHost.id,
          message: "Previous host left. You are now the host!"
        });
        
        // Send updated room state immediately after
        io.to(roomId).emit("room-updated", room);
        
        console.log(`👑 New host promoted: ${newHost.id} in room ${roomId}`);
      } else {
        // Non-host left - just update room
        room.isLocked = room.players.length >= room.maxPlayers;
        await room.save();
        io.to(roomId).emit("room-updated", room);
      }

      // Clean up socket mappings
      socket.leave(roomId);
      socketPlayerMap.delete(socket.id);
      playerSocketMap.delete(playerId);
      
    } catch (error) {
      console.error("Error handling player leave:", error);
    }
  };

  // Socket connection handler
  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    // Create room (host only)
    socket.on("create-room", async ({ roomId, player }) => {
      try {
        console.log(`🏠 Creating room ${roomId} for host:`, player);

        // Validate input
        if (!roomId || !player || !player.id) {
          socket.emit("error-message", "Invalid room creation data");
          return;
        }

        // Check if room already exists
        const existing = await Room.findOne({ roomId });
        if (existing) {
          socket.emit("error-message", "Room code already exists. Please try again.");
          return;
        }

        // Calculate expiry times - update to 10 minutes
        const now = new Date();
        const lobbyExpiry = new Date(now.getTime() + (10 * 60 * 1000)); // 10 minutes
        const roomExpiry = new Date(now.getTime() + (10 * 60 * 1000)); // 10 minutes

        // Create room with updated timer fields
        const newRoom = await Room.create({
          roomId,
          status: "lobby",
          players: [{ ...player, isHost: true, ready: false }],
          isLocked: false,
          maxPlayers: 2,
          expiresAt: roomExpiry,
          lastActivity: now,
          gameState: { phase: 'lobby' },
          timers: {
            lobbyExpiry, // 10 minute expiry
            lastTick: now
          },
          settings: {
            lobbyTimeout: 600,    // 10 minutes
            gameTimeout: 600,     // 10 minutes for game
            questionsPerGame: 5,
            timePerQuestion: 60
          }
        });

        // Join socket room and track mapping
        socket.join(roomId);
        socketPlayerMap.set(socket.id, { roomId, playerId: player.id });
        playerSocketMap.set(player.id, socket.id);
        
        // Start room timer
        startRoomTimer(roomId);

        // Send room data to host
        socket.emit("room-updated", newRoom);
        
        console.log(`✅ Room ${roomId} created successfully with host ${player.id}`);
        
      } catch (error) {
        console.error("❌ Error creating room:", error);
        socket.emit("error-message", "Failed to create room. Please try again.");
      }
    });

    // Join room (non-host player)
    socket.on("join-room", async ({ roomId, player }) => {
      try {
        console.log(`👋 Player ${player.id} attempting to join room ${roomId}`);

        // Validate input
        if (!roomId || !player || !player.id) {
          socket.emit("error-message", "Invalid join data");
          return;
        }

        const room = await Room.findOne({ roomId });
        if (!room) {
          socket.emit("error-message", "Room not found");
          return;
        }

        if (room.status !== "lobby") {
          socket.emit("error-message", "Game already in progress");
          return;
        }

        if (room.players.length >= room.maxPlayers) {
          socket.emit("error-message", "Room is full");
          return;
        }

        // Check if player already in room (handle reconnection)
        const existingPlayerIndex = room.players.findIndex(p => p.id === player.id);
        if (existingPlayerIndex !== -1) {
          // Player reconnecting
          console.log(`🔄 Player ${player.id} reconnecting to room ${roomId}`);
          
          socket.join(roomId);
          socketPlayerMap.set(socket.id, { roomId, playerId: player.id });
          playerSocketMap.set(player.id, socket.id);
          
          socket.emit("room-updated", room);
          socket.to(roomId).emit("room-updated", room);
          return;
        }

        // Add new player to room
        const newPlayer = { ...player, isHost: false, ready: false };
        room.players.push(newPlayer);

        // Lock room if full
        if (room.players.length >= room.maxPlayers) {
          room.isLocked = true;
          console.log(`🔒 Room ${roomId} is now full and locked`);
        }

        await room.save();
        
        // Join socket room and track mapping
        socket.join(roomId);
        socketPlayerMap.set(socket.id, { roomId, playerId: newPlayer.id });
        playerSocketMap.set(newPlayer.id, socket.id);

        // Notify all players in room
        io.to(roomId).emit("room-updated", room);
        
        console.log(`✅ Player ${player.id} joined room ${roomId}. Room now has ${room.players.length}/${room.maxPlayers} players`);
        
      } catch (error) {
        console.error("❌ Error joining room:", error);
        socket.emit("error-message", "Failed to join room. Please try again.");
      }
    });

    // Handle player rejoining after page refresh
    socket.on("rejoin-room", async ({ roomId, player }) => {
      try {
        console.log(`🔄 Player ${player.id} rejoining room ${roomId}`);

        const room = await Room.findOne({ roomId });
        if (!room) {
          socket.emit("error-message", "Room no longer exists");
          return;
        }

        // Verify player is in room
        const existingPlayer = room.players.find(p => p.id === player.id);
        if (!existingPlayer) {
          socket.emit("error-message", "You are not a member of this room");
          return;
        }

        // Update socket mappings
        socket.join(roomId);
        socketPlayerMap.set(socket.id, { roomId, playerId: player.id });
        playerSocketMap.set(player.id, socket.id);

        // Send current room state
        socket.emit("room-updated", room);
        
        // Notify others of reconnection
        socket.to(roomId).emit("player-reconnected", {
          playerId: player.id,
          playerName: existingPlayer.name
        });
        
        console.log(`✅ Player ${player.id} successfully rejoined room ${roomId}`);
        
      } catch (error) {
        console.error("❌ Error rejoining room:", error);
        socket.emit("error-message", "Failed to rejoin room");
      }
    });

    // Update player ready status
    socket.on("player-ready", async ({ roomId, playerId, ready }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room) {
          socket.emit("error-message", "Room not found");
          return;
        }

        const player = room.players.find(p => p.id === playerId);
        if (!player) {
          socket.emit("error-message", "Player not found in room");
          return;
        }

        player.ready = ready;
        await room.save();

        io.to(roomId).emit("room-updated", room);
        console.log(`🎯 Player ${playerId} ready status: ${ready}`);
        
      } catch (error) {
        console.error("❌ Error updating ready status:", error);
        socket.emit("error-message", "Failed to update ready status");
      }
    });

    // Update player name
    socket.on("update-player-name", async ({ roomId, playerId, name }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room) {
          socket.emit("error-message", "Room not found");
          return;
        }

        const player = room.players.find(p => p.id === playerId);
        if (!player) {
          socket.emit("error-message", "Player not found in room");
          return;
        }

        // Validate name
        const trimmedName = name?.trim();
        if (!trimmedName || trimmedName.length < 2) {
          socket.emit("error-message", "Name must be at least 2 characters");
          return;
        }

        if (trimmedName.length > 20) {
          socket.emit("error-message", "Name too long (max 20 characters)");
          return;
        }

        // Check for duplicate names
        const nameExists = room.players.some(p => 
          p.id !== playerId && 
          p.name && 
          p.name.toLowerCase() === trimmedName.toLowerCase()
        );
        
        if (nameExists) {
          socket.emit("error-message", "This name is already taken");
          return;
        }

        player.name = trimmedName;
        await room.save();

        // Notify all players and confirm to sender
        io.to(roomId).emit("room-updated", room);
        socket.emit("name-updated", { success: true, name: trimmedName });
        
        console.log(`📝 Player ${playerId} updated name to: ${trimmedName}`);
        
      } catch (error) {
        console.error("❌ Error updating player name:", error);
        socket.emit("error-message", "Failed to update name");
      }
    });

    // Host kicks player
    socket.on("kick-player", async ({ roomId, hostId, targetPlayerId }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room) {
          socket.emit("error-message", "Room not found");
          return;
        }

        const host = room.players.find(p => p.id === hostId && p.isHost);
        if (!host) {
          socket.emit("error-message", "Only the host can kick players");
          return;
        }

        const targetPlayer = room.players.find(p => p.id === targetPlayerId);
        if (!targetPlayer) {
          socket.emit("error-message", "Player not found");
          return;
        }

        if (targetPlayer.isHost) {
          socket.emit("error-message", "Cannot kick the host");
          return;
        }

        // Remove player from room
        room.players = room.players.filter(p => p.id !== targetPlayerId);
        room.isLocked = false; // Unlock for new players
        await room.save();

        // Notify kicked player and remove from socket room
        const targetSocketId = playerSocketMap.get(targetPlayerId);
        if (targetSocketId) {
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            targetSocket.emit("kicked-from-room", { 
              message: "You have been removed from the room by the host" 
            });
            targetSocket.leave(roomId);
          }
          playerSocketMap.delete(targetPlayerId);
        }

        // Notify remaining players
        socket.to(roomId).emit("room-updated", room);
        
        console.log(`👢 Host ${hostId} kicked player ${targetPlayerId} from room ${roomId}`);
        
      } catch (error) {
        console.error("❌ Error kicking player:", error);
        socket.emit("error-message", "Failed to kick player");
      }
    });

    // Start game (host only)
    socket.on("start-game", async ({ roomId, hostId }) => {
      try {
        const room = await GameService.startGame(roomId);
        
        // Clear lobby expiry timer
        clearRoomTimer(roomId);
        
        // Start game timer
        startGameTimer(roomId, room.settings.gameTimeout);
        
        // Update room status
        room.gameState.phase = 'answering';
        room.gameState.startedAt = new Date();
        await room.save();
        
        // Notify clients
        io.to(roomId).emit('game-started', {
          status: room.gameState,
          settings: room.settings
        });
        
        console.log(`🚀 Game started in room ${roomId} by host ${hostId}`);
        
      } catch (error) {
        socket.emit('error-message', error.message);
      }
    });

    // Player submits answer
    socket.on('submit-answer', async ({ roomId, playerId, questionId, answer }) => {
      try {
        const room = await GameService.handleAnswer(roomId, playerId, questionId, answer);
        
        io.to(roomId).emit('answer-submitted', {
          questionId,
          playerId,
          allAnswered: room.gameState.phase === 'guessing'
        });
        
      } catch (error) {
        socket.emit('error-message', error.message);
      }
    });

    // Player leaves room intentionally
    socket.on("leave-room", async ({ roomId, playerId }) => {
      console.log(`🚪 Player ${playerId} intentionally leaving room ${roomId}`);
      await handlePlayerLeave(socket, roomId, playerId, true);
    });

    // Handle unexpected disconnection
    socket.on("disconnect", async (reason) => {
      console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
      
      const playerInfo = socketPlayerMap.get(socket.id);
      if (!playerInfo) return;

      const { roomId, playerId } = playerInfo;
      console.log(`🔌 Player ${playerId} disconnected from room ${roomId}`);

      // Clean up mappings immediately
      socketPlayerMap.delete(socket.id);
      
      // Set timeout for reconnection grace period
      setTimeout(async () => {
        // Check if player has reconnected
        const hasReconnected = playerSocketMap.has(playerId);
        
        if (!hasReconnected) {
          console.log(`⏰ Player ${playerId} didn't reconnect, removing from room ${roomId}`);
          await handlePlayerLeave(socket, roomId, playerId, false);
        }
      }, 30000); // 30 second grace period
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    // Add this with your other socket event handlers
socket.on("chat-message", async ({ roomId, playerId, message }) => {
  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      socket.emit("error-message", "Room not found");
      return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      socket.emit("error-message", "Player not found in room");
      return;
    }

    const chatMessage = {
      id: Date.now(),
      playerId: player.id,
      playerName: player.name || "Unknown",
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    // Broadcast message to all players in the room
    io.to(roomId).emit("chat-message-received", chatMessage);
    
    console.log(`💬 Chat message in room ${roomId} from ${player.name}: ${message}`);
    
  } catch (error) {
    console.error("❌ Error sending chat message:", error);
    socket.emit("error-message", "Failed to send message");
  }
});
  });

  // Cleanup on server shutdown
  process.on("SIGTERM", () => {
    console.log("🛑 Server shutting down, clearing timers and mappings");
    for (const roomId of roomTimers.keys()) {
      clearRoomTimer(roomId);
    }
    socketPlayerMap.clear();
    playerSocketMap.clear();
    gameTimers.forEach(timer => clearTimeout(timer));
    gameTimers.clear();
  });

  process.on("SIGINT", () => {
    console.log("🛑 Server interrupted, clearing timers and mappings");
    for (const roomId of roomTimers.keys()) {
      clearRoomTimer(roomId);
    }
    socketPlayerMap.clear();
    playerSocketMap.clear();
    gameTimers.forEach(timer => clearTimeout(timer));
    gameTimers.clear();
    process.exit(0);
  });

  

  return io;
}