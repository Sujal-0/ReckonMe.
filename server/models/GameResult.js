import mongoose from "mongoose";

const gameResultSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  
  players: [{
    id: String,
    name: String,
    isHost: Boolean,
    score: Number,
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
  }],

  questions: [{
    id: String,
    text: String,
    answers: [{ 
      playerId: String,
      answer: String 
    }],
    guesses: [{
      playerId: String,
      targetPlayerId: String,
      guess: String,
      isCorrect: Boolean
    }]
  }],

  winner: {
    playerId: String,
    name: String,
    score: Number
  },

  stats: {
    startedAt: Date,
    endedAt: Date,
    duration: Number,
    totalQuestions: Number,
    questionsAnswered: Number
  }
}, {
  timestamps: true
});

// Add TTL index for cleanup after 30 days
gameResultSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model("GameResult", gameResultSchema);