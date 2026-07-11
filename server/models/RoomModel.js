// server/models/Room.js
import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, default: "" }, // name set in lobby
  score: { type: Number, default: 0 },
  isHost: { type: Boolean, default: false },
  ready: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now }, // For disconnect tracking
  disconnectedAt: { type: Date, default: null }, // Track disconnection time
  answers: [{ 
    questionId: String,
    answer: String,
    timestamp: Date
  }],
  guesses: [{ 
    questionId: String,
    targetPlayerId: String,
    guess: String,
    isCorrect: Boolean,
    timestamp: Date
  }]
});

const roundSchema = new mongoose.Schema({
  roundNumber: Number,
  question: String,
  answers: { type: Map, of: String }, // playerId -> answer
  guesses: { type: Map, of: Object }, // playerId -> { guess, correct }
});

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 5,
      maxlength: 5,
    },

    status: {
      type: String,
      enum: ["lobby", "answering", "guessing", "revealing", "ended"],
      default: "lobby",
    },

    players: {
      type: [playerSchema],
      default: [],
    },

    maxPlayers: {
      type: Number,
      default: 2,
    },

     isLocked: {
      type: Boolean,
      default: false, // becomes true once 2 players join
    },

    timers: {
      lobbyExpiry: { type: Date, required: true }, // 5-10 min from creation
      gameExpiry: { type: Date }, // Set when game starts
      lastTick: { type: Date, default: Date.now }
    },
    
    gameState: {
      phase: {
        type: String,
        enum: ['waiting', 'lobby', 'answering', 'guessing', 'revealing', 'ended'],
        default: 'lobby'
      },
      currentQuestion: { type: Number, default: 0 },
      totalQuestions: { type: Number, default: 5 },
      startedAt: Date,
      endedAt: Date
    },

    settings: {
      lobbyTimeout: { type: Number, default: 300 }, // 5 minutes
      gameTimeout: { type: Number, default: 600 }, // 10 minutes
      questionsPerGame: { type: Number, default: 5 },
      timePerQuestion: { type: Number, default: 60 }
    },

    rounds: [roundSchema],

    currentRound: { type: Number, default: 0 },

    winnerId: { type: String, default: null },

    leaderboard: [
      {
        playerId: String,
        name: String,
        score: { type: Number, default: 0 },
      },
    ],

    questionBankId: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionBank" },

    // Add new fields
    lastActivity: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }, // Room expiration time
    minPlayers: { type: Number, default: 2 },
    hostHistory: [{ // Track host changes
      playerId: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

roomSchema.methods.cleanupDisconnectedPlayers = async function() {
  // Remove any disconnected players (implement your disconnect detection logic)
  // Update isLocked status if needed
  if (this.players.length < this.maxPlayers) {
    this.isLocked = false;
  }
  return this.save();
};

// Add cleanup methods
roomSchema.methods.cleanup = async function() {
  const STALE_TIMEOUT = 30000; // 30 seconds
  const now = new Date();
  
  // Remove stale disconnected players
  this.players = this.players.filter(player => {
    if (!player.disconnectedAt) return true;
    return (now - player.disconnectedAt) < STALE_TIMEOUT;
  });

  // Update lock status based on active players
  const activePlayers = this.players.filter(p => !p.disconnectedAt);
  this.isLocked = activePlayers.length >= this.maxPlayers;

  return this.save();
};

// Add static methods
roomSchema.statics.cleanupInactive = async function() {
  const ROOM_TIMEOUT = 60 * 60 * 1000; // 1 hour
  const now = new Date();
  
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: now } },
      { 
        lastActivity: { $lt: new Date(now - ROOM_TIMEOUT) },
        'gameState.phase': { $in: ['waiting', 'lobby'] }
      }
    ]
  });
};

// Add static method to handle host leaving
roomSchema.statics.handleHostLeave = async function(roomId) {
  return this.findOneAndDelete({ roomId });
};

// Add new static methods for game lifecycle
roomSchema.statics.startGame = async function(roomId) {
  const room = await this.findOne({ roomId });
  if (!room) throw new Error('Room not found');

  room.gameState.phase = 'answering';
  room.gameState.startedAt = new Date();
  room.timers.gameExpiry = new Date(Date.now() + (room.settings.gameTimeout * 1000));
  
  return room.save();
};

roomSchema.statics.endGame = async function(roomId) {
  const room = await this.findOne({ roomId });
  if (!room) return null;

  room.gameState.phase = 'ended';
  room.gameState.endedAt = new Date();
  
  return room.save();
};

export default mongoose.model("Room", roomSchema);
