export class RoomService {
  static async validateRoomJoin(roomId, playerId) {
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.isLocked) {
      throw new Error("Room is locked");
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error("Room is full");
    }

    const existingPlayer = room.players.find(p => p.id === playerId);
    if (existingPlayer) {
      throw new Error("Player already in room");
    }

    return room;
  }

  static async handleReconnect(room, playerId, socket) {
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    // Clear disconnect status
    player.disconnectedAt = null;
    player.lastActive = new Date();
    await room.save();

    return true;
  }

  // Add more shared room logic...
}