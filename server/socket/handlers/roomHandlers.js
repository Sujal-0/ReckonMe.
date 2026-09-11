import Room from "../../models/RoomModel.js";
import MatchHistory from "../../models/MatchHistoryModel.js";
import { sessionStore } from "../store/SessionStore.js";

export const registerRoomHandlers = (io, socket, roomTimers) => {
  const ROOM_LIFETIME = 10 * 60 * 1000;

  const startRoomTimer = (roomId) => {
    // We keep timers in memory for this Node instance managing the room creation
    // In a fully scaled setup, this would be managed by Redis expiry events
    if (roomTimers.has(roomId)) {
      clearTimeout(roomTimers.get(roomId).timeout);
    }
    const endTime = Date.now() + ROOM_LIFETIME;
    
    // We only send the initial expiry time once, the client handles the tick
    io.to(roomId).emit("room-timer-sync", endTime);

    const timeout = setTimeout(async () => {
      try {
        const room = await Room.findOne({ roomId });
        if (room && room.gameState.phase === 'lobby') {
          await Room.findOneAndDelete({ roomId });
          io.to(roomId).emit("room-expired", { message: "Room has expired - game did not start within 10 minutes" });
          io.in(roomId).socketsLeave(roomId);
          if (roomTimers.has(roomId)) {
             roomTimers.delete(roomId);
          }
        }
      } catch (err) {
        console.error("Error deleting expired room:", err);
      }
    }, ROOM_LIFETIME);

    roomTimers.set(roomId, { timeout });
  };

  const handlePlayerLeave = async (socket, roomId, playerId) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      const leavingPlayer = room.players.find(p => p.id === playerId);
      if (!leavingPlayer) return;

      const wasHost = leavingPlayer.isHost;
      if (room.status !== 'lobby') {
        // Mid-game disconnect
        leavingPlayer.disconnectedAt = new Date();
        
        const activePlayers = room.players.filter(p => !p.disconnectedAt);
        if (activePlayers.length === 0) {
          // Both disconnected, delete room
          await Room.findOneAndDelete({ roomId });
          if (roomTimers.has(roomId)) {
            clearTimeout(roomTimers.get(roomId).timeout);
            roomTimers.delete(roomId);
          }
        } else {
          // Notify room that player disconnected, but continue the game until the round ends
          await room.save();
          io.to(roomId).emit("room-updated", room);
          io.to(roomId).emit("player-disconnected", { 
              message: `${leavingPlayer.name} has abandoned the match. The game will end after this round.` 
          });
        }
      } else {
        // Lobby disconnect
        room.players = room.players.filter(p => p.id !== playerId);

        if (room.players.length === 0) {
          await Room.findOneAndDelete({ roomId });
          if (roomTimers.has(roomId)) {
            clearTimeout(roomTimers.get(roomId).timeout);
            roomTimers.delete(roomId);
          }
          io.to(roomId).emit("room-deleted", { message: "Room closed - all players left" });
        } else {
          if (wasHost) {
            const newHost = room.players[0];
            newHost.isHost = true;
            room.hostHistory.push({ playerId: newHost.id, timestamp: new Date() });
            room.isLocked = false;
            await room.save();
            io.to(roomId).emit("host-changed", { newHostId: newHost.id, message: "Previous host left. You are now the host!" });
            io.to(roomId).emit("room-updated", room);
          } else {
            room.isLocked = room.players.length >= room.maxPlayers;
            await room.save();
            io.to(roomId).emit("room-updated", room);
          }
        }
      }

      socket.leave(roomId);
      await sessionStore.deleteSession(socket.id);
    } catch (error) {
      console.error("Error handling player leave:", error);
    }
  };

  // Socket Events
  socket.on("create-room", async ({ roomId, player }, callback) => {
    const cb = typeof callback === 'function' ? callback : (res) => {
      if (res.error) socket.emit("error-message", res.error);
      else if (res.success && res.room) socket.emit("room-updated", res.room);
    };

    try {
      if (!roomId || !player || !player.id) {
        return cb({ error: "Invalid room creation data" });
      }

      const existing = await Room.findOne({ roomId });
      if (existing) {
        return cb({ error: "Room code already exists. Please try again." });
      }

      const now = new Date();
      const expiryTime = new Date(now.getTime() + ROOM_LIFETIME);

      const newRoom = await Room.create({
        roomId,
        status: "lobby",
        players: [{ ...player, isHost: true, ready: false }],
        isLocked: false,
        maxPlayers: 2,
        expiresAt: expiryTime,
        lastActivity: now,
        gameState: { phase: 'lobby' },
        timers: { lobbyExpiry: expiryTime, lastTick: now },
        settings: { lobbyTimeout: 600, gameTimeout: 600, questionsPerGame: 5, timePerQuestion: 120 }
      });

      socket.join(roomId);
      await sessionStore.setSession(socket.id, { roomId, playerId: player.id });
      startRoomTimer(roomId);

      cb({ success: true, room: newRoom });
    } catch (error) {
      console.error("Error creating room:", error);
      cb({ error: "Failed to create room. Please try again." });
    }
  });

  socket.on("join-room", async ({ roomId, player }, callback) => {
    const cb = typeof callback === 'function' ? callback : (res) => {
      if (res.error) socket.emit("error-message", res.error);
      else if (res.success && res.room) {
        socket.emit("room-updated", res.room);
        io.to(res.room.roomId).emit("room-updated", res.room);
      }
    };

    try {
      if (!roomId || !player || !player.id) {
        return cb({ error: "Invalid join data" });
      }

      const room = await Room.findOne({ roomId });
      if (!room) return cb({ error: "Room not found" });
      if (room.status !== "lobby") return cb({ error: "Game already in progress" });

      const existingPlayerIndex = room.players.findIndex(p => p.id === player.id);
      if (existingPlayerIndex !== -1) {
        socket.join(roomId);
        await sessionStore.setSession(socket.id, { roomId, playerId: player.id });
        socket.to(roomId).emit("room-updated", room);
        return cb({ success: true, room });
      }

      if (room.players.length >= room.maxPlayers) {
        return cb({ error: "Room is full" });
      }

      const newPlayer = { ...player, isHost: false, ready: false };
      room.players.push(newPlayer);

      if (room.players.length >= room.maxPlayers) {
        room.isLocked = true;
      }

      await room.save();
      
      socket.join(roomId);
      await sessionStore.setSession(socket.id, { roomId, playerId: newPlayer.id });

      io.to(roomId).emit("room-updated", room);
      cb({ success: true, room });
    } catch (error) {
      console.error("Error joining room:", error);
      cb({ error: "Failed to join room. Please try again." });
    }
  });

  socket.on("rejoin-room", async ({ roomId, player }, callback) => {
    const cb = typeof callback === 'function' ? callback : (res) => {
      if (res.error) socket.emit("error-message", res.error);
      else if (res.success && res.room) socket.emit("room-updated", res.room);
    };

    try {
      const room = await Room.findOne({ roomId });
      if (!room) return cb({ error: "Room no longer exists" });

      const existingPlayer = room.players.find(p => p.id === player.id);
      if (!existingPlayer) return cb({ error: "You are not a member of this room" });

      if (existingPlayer.disconnectedAt) {
          existingPlayer.disconnectedAt = null;
          await room.save();
      }

      socket.join(roomId);
      await sessionStore.setSession(socket.id, { roomId, playerId: player.id });

      socket.to(roomId).emit("player-reconnected", { playerId: player.id, playerName: existingPlayer.name });
      cb({ success: true, room });
    } catch (error) {
      console.error("Error rejoining room:", error);
      cb({ error: "Failed to rejoin room" });
    }
  });

  socket.on("update-player-name", async ({ roomId, playerId, name }, callback) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return callback ? callback({ error: "Room not found" }) : socket.emit("error-message", "Room not found");

      const player = room.players.find(p => p.id === playerId);
      if (!player) return callback ? callback({ error: "Player not found in room" }) : socket.emit("error-message", "Player not found");

      const trimmedName = name?.trim();
      if (!trimmedName || trimmedName.length < 2) return callback ? callback({ error: "Name must be at least 2 characters" }) : socket.emit("error-message", "Name too short");
      if (trimmedName.length > 20) return callback ? callback({ error: "Name too long (max 20 characters)" }) : socket.emit("error-message", "Name too long");

      const nameExists = room.players.some(p => p.id !== playerId && p.name && p.name.toLowerCase() === trimmedName.toLowerCase());
      if (nameExists) return callback ? callback({ error: "This name is already taken" }) : socket.emit("error-message", "Name already taken");

      player.name = trimmedName;
      await room.save();

      io.to(roomId).emit("room-updated", room);
      if (callback) {
        callback({ success: true, name: trimmedName });
      } else {
        socket.emit("name-updated", { success: true, name: trimmedName });
      }
    } catch (error) {
      console.error("Error updating player name:", error);
      if (callback) callback({ error: "Failed to update name" });
      else socket.emit("error-message", "Failed to update name");
    }
  });

  socket.on("update-player-avatar", async ({ roomId, playerId, avatarSeed }, callback) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (!player) return;

      player.avatarSeed = avatarSeed;
      await room.save();

      io.to(roomId).emit("avatar-updated", room);
      if (typeof callback === 'function') callback({ success: true });
    } catch (error) {
      console.error("Error updating player avatar:", error);
      if (typeof callback === 'function') callback({ error: "Failed to update avatar" });
    }
  });

  socket.on("player-ready", async ({ roomId, playerId, ready }, callback) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (!player) return;

      player.ready = ready;
      await room.save();

      io.to(roomId).emit("room-updated", room);
      if (typeof callback === 'function') callback({ success: true, ready: player.ready });
    } catch (error) {
      console.error("Error toggling ready state:", error);
      if (typeof callback === 'function') callback({ error: "Failed to toggle ready state" });
    }
  });

  socket.on("update-room-settings", async ({ roomId, playerId, settings }, callback) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      const requester = room.players.find(p => p.id === playerId);
      if (!requester) return;

      const canEdit = requester.isHost || room.settings.sharedSettingsAccess;
      if (!canEdit) return; // Permission denied

      room.settings = { ...room.settings, ...settings };
      await room.save();

      io.to(roomId).emit("room-updated", room);
      if (typeof callback === 'function') callback({ success: true });
    } catch (error) {
      console.error("Error updating room settings:", error);
      if (typeof callback === 'function') callback({ error: "Failed to update settings" });
    }
  });

  socket.on("kick-player", async ({ roomId, hostId, targetPlayerId }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return socket.emit("error-message", "Room not found");

      const host = room.players.find(p => p.id === hostId && p.isHost);
      if (!host) return socket.emit("error-message", "Only the host can kick players");

      const targetPlayer = room.players.find(p => p.id === targetPlayerId);
      if (!targetPlayer) return socket.emit("error-message", "Player not found");
      if (targetPlayer.isHost) return socket.emit("error-message", "Cannot kick the host");

      room.players = room.players.filter(p => p.id !== targetPlayerId);
      room.isLocked = false;
      await room.save();

      const targetSocketId = await sessionStore.getSocketId(targetPlayerId);
      if (targetSocketId) {
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.emit("kicked-from-room", { message: "You have been removed from the room by the host" });
          targetSocket.leave(roomId);
        }
        await sessionStore.deletePlayerSession(targetPlayerId);
      }

      io.to(roomId).emit("room-updated", room);
    } catch (error) {
      console.error("Error kicking player:", error);
      socket.emit("error-message", "Failed to kick player");
    }
  });

  socket.on("leave-room", async ({ roomId, playerId }) => {
    await handlePlayerLeave(socket, roomId, playerId);
  });

  socket.on("play-again", async ({ roomId, playerId }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (player) {
         player.wantsToPlayAgain = true;
      }

      // Check if all active players want to play again
      const activePlayers = room.players.filter(p => !p.disconnectedAt);
      const allReady = activePlayers.length > 0 && activePlayers.every(p => p.wantsToPlayAgain);

      if (allReady && room.status !== 'lobby') {
        room.status = 'lobby';
        room.gameState = { phase: 'lobby' };
        room.rounds = [];
        room.preGameInputs = []; // Wipe preGameInputs to prevent game starting early on next round
        room.messages = []; // Wipe chat history for fresh start
        
        // Reset lobby timer explicitly
        const now = new Date();
        const expiryTime = new Date(now.getTime() + 10 * 60 * 1000);
        room.expiresAt = expiryTime;
        room.timers = { lobbyExpiry: expiryTime, lastTick: now };

        // Clean up any players who disconnected during the game or at results
        room.players = activePlayers;

        room.players.forEach(p => {
           p.score = 0;
           p.ready = false;
           p.wantsToPlayAgain = false;
        });
        
        room.isLocked = room.players.length >= room.maxPlayers;
        await room.save();
        
        io.to(roomId).emit("room-updated", room);
        io.to(roomId).emit("room-restarted", { message: "The room has been reset for a new game!" });
        
        startRoomTimer(roomId);
      } else {
        await room.save();
        io.to(roomId).emit("room-updated", room);
      }
    } catch (error) {
      console.error("Error handling play-again:", error);
    }
  });
  
  // Make the handlePlayerLeave available to the disconnect handler
  return { handlePlayerLeave };
};
