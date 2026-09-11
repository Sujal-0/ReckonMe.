import mongoose from "mongoose";

const matchHistorySchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
  },
  players: [
    {
      id: { type: String, required: true },
      name: { type: String, required: true },
      score: { type: Number, default: 0 },
      avatarSeed: { type: String },
      userId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        default: null
      } // Links to authenticated user if they were logged in
    }
  ],
  winnerId: {
    type: String, // 'tie', or player id
    default: null
  },
  playedAt: {
    type: Date,
    default: Date.now,
  },
  roundsPlayed: {
    type: Number,
    default: 0
  }
});

// Index to quickly find matches for a specific user
matchHistorySchema.index({ "players.userId": 1, playedAt: -1 });

const MatchHistory = mongoose.model("MatchHistory", matchHistorySchema);

export default MatchHistory;
