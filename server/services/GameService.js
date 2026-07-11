import Room from '../models/RoomModel.js';
import GameResult from '../models/GameResult.js';

export class GameService {
  static async startGame(roomId) {
    const room = await Room.startGame(roomId);
    if (!room) throw new Error('Room not found');
    
    return room;
  }

  static async endGame(roomId) {
    const room = await Room.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    // Calculate scores and determine winner
    const scores = room.players.map(player => ({
      playerId: player.id,
      name: player.name,
      score: player.guesses.filter(g => g.isCorrect).length
    }));

    const winner = scores.reduce((prev, curr) => 
      prev.score > curr.score ? prev : curr
    );

    // Create game result
    const gameResult = await GameResult.create({
      roomId: room.roomId,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        score: scores.find(s => s.playerId === p.id).score,
        answers: p.answers,
        guesses: p.guesses
      })),
      questions: room.rounds.map(r => ({
        id: r._id,
        text: r.question,
        answers: Array.from(r.answers.entries()).map(([playerId, answer]) => ({
          playerId,
          answer
        })),
        guesses: Array.from(r.guesses.entries()).map(([playerId, guess]) => ({
          playerId,
          targetPlayerId: guess.targetId,
          guess: guess.value,
          isCorrect: guess.correct
        }))
      })),
      winner: {
        playerId: winner.playerId,
        name: winner.name,
        score: winner.score
      },
      stats: {
        startedAt: room.gameState.startedAt,
        endedAt: new Date(),
        duration: (new Date() - room.gameState.startedAt) / 1000,
        totalQuestions: room.settings.questionsPerGame,
        questionsAnswered: room.currentRound
      }
    });

    // Delete the room immediately after game ends
    await Room.findOneAndDelete({ roomId });

    return { gameResult };
  }

  static async handleAnswer(roomId, playerId, questionId, answer) {
    const room = await Room.findOne({ roomId });
    if (!room || room.gameState.phase !== 'answering') {
      throw new Error('Invalid room state');
    }

    // Record answer
    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    player.answers.push({
      questionId,
      answer,
      timestamp: new Date()
    });

    // Check if all players answered
    const currentQuestion = room.gameState.currentQuestion;
    const allAnswered = room.players.every(p => 
      p.answers.some(a => a.questionId === questionId)
    );

    if (allAnswered) {
      room.gameState.phase = 'guessing';
    }

    return room.save();
  }
}