import Room from "../../models/RoomModel.js";

export const registerChatHandlers = (io, socket) => {
  socket.on("send-message", async ({ roomId, playerId, message, type }, callback) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return socket.emit("error-message", "Room not found");

      const player = room.players.find(p => p.id === playerId);
      if (!player) return socket.emit("error-message", "Player not found in room");

      const chatMessage = {
        id: Date.now().toString(),
        playerId: player.id,
        playerName: player.name || "Unknown",
        message: message.trim(),
        type: type || "chat", // support for system messages
        timestamp: new Date().toISOString(),
      };

      room.messages.push(chatMessage);
      await room.save();

      io.to(roomId).emit("receive-message", chatMessage);
      if (callback) callback({ success: true });
    } catch (error) {
      console.error("Error sending chat message:", error);
      socket.emit("error-message", "Failed to send message");
      if (callback) callback({ error: "Failed to send message" });
    }
  });
};
