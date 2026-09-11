import Room from '../../models/RoomModel.js';
import { GameService } from '../../services/GameService.js';

// Simple in-memory timer storage to prevent memory leaks or overlapping timers
const activeGameTimers = new Map();

class PhaseTimerManager {
  constructor() {
    this.io = null;
    this.timers = new Map();
  }

  init(io) {
    this.io = io;
  }

  startTimer(roomId, durationSec, onExpire) {
    this.clearTimer(roomId);
    
    let timeLeft = durationSec;
    if (this.io) {
      this.io.to(roomId).emit("phase-timer", { timeLeft, duration: durationSec });
    }

    const intervalId = setInterval(() => {
      timeLeft--;
      if (timeLeft >= 0 && this.io) {
        this.io.to(roomId).emit("phase-timer", { timeLeft, duration: durationSec });
      }
    }, 1000);

    const timeoutId = setTimeout(() => {
      this.clearTimer(roomId);
      if (onExpire) onExpire();
    }, durationSec * 1000);

    this.timers.set(roomId, { intervalId, timeoutId, timeLeft, onExpire, duration: durationSec, nextVotes: new Set() });
  }

  skipTo(roomId, seconds) {
    const timer = this.timers.get(roomId);
    if (timer && timer.timeLeft > seconds) {
       this.clearTimer(roomId);
       this.startTimer(roomId, seconds, timer.onExpire);
    }
  }

  addNextVote(roomId, playerId) {
    const timer = this.timers.get(roomId);
    if (timer) {
        timer.nextVotes.add(playerId);
        return timer.nextVotes.size;
    }
    return 0;
  }

  clearTimer(roomId) {
    const timer = this.timers.get(roomId);
    if (timer) {
      clearInterval(timer.intervalId);
      clearTimeout(timer.timeoutId);
      this.timers.delete(roomId);
    }
  }
}

const phaseTimers = new PhaseTimerManager();

export const registerGameHandlers = (io, socket, gameTimers) => {
  phaseTimers.init(io);

  const startGameTimer = (roomId, durationInSeconds) => {
    if (activeGameTimers.has(roomId)) {
      clearTimeout(activeGameTimers.get(roomId));
    }
    const timer = setTimeout(async () => {
      try {
        const room = await GameService.endGame(roomId);
        io.to(roomId).emit('game-ended', { reason: 'timeout' });
        activeGameTimers.delete(roomId);
        phaseTimers.clearTimer(roomId);
      } catch (err) {
        console.error('Failed to end game on timeout:', err);
      }
    }, durationInSeconds * 1000);
    activeGameTimers.set(roomId, timer);
  };

  const advancePhase = async (roomId) => {
    try {
        const nextRoom = await GameService.advancePhase(roomId);
        if (nextRoom) {
          io.to(roomId).emit("room-updated", nextRoom);
          
          const time = nextRoom.settings?.timePerQuestion || 120;
          
          if (nextRoom.gameState.phase === 'category-reveal') {
            phaseTimers.startTimer(roomId, 4, () => advancePhase(roomId)); // 4s cinematic fall
          } else if (nextRoom.gameState.phase === 'input') {
            phaseTimers.startTimer(roomId, time, () => advancePhase(roomId)); // Dynamic max
          } else if (nextRoom.gameState.phase === 'revealing') {
            phaseTimers.startTimer(roomId, time, () => advancePhase(roomId)); // Dynamic max for revealing
          } else if (nextRoom.gameState.phase === 'finished' || nextRoom.gameState.phase === 'ended') {
             if (activeGameTimers.has(roomId)) {
                 clearTimeout(activeGameTimers.get(roomId));
                 activeGameTimers.delete(roomId);
             }
             phaseTimers.clearTimer(roomId);
          }
        }
    } catch (err) {
        console.error('Failed to advance phase automatically:', err);
    }
  };

  const forceStartCoreGame = async (roomId) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room || room.status !== 'pre-game') return;

      const gameRoom = await GameService.startCoreGame(roomId);
      io.to(roomId).emit("room-updated", gameRoom);
      
      const time = gameRoom.settings?.timePerQuestion || 120;
      if (gameRoom.gameState.phase === 'category-reveal') {
         phaseTimers.startTimer(roomId, 4, () => advancePhase(roomId));
      } else {
         phaseTimers.startTimer(roomId, time, () => advancePhase(roomId));
      }
    } catch (err) {
      console.error('Failed to force start core game:', err);
    }
  };

  socket.on('start-game', async ({ roomId }, callback) => {
    const cb = typeof callback === 'function' ? callback : (res) => {
        if (res.error) socket.emit('error-message', res.error);
    };
    try {
      const room = await Room.startGame(roomId);
      startGameTimer(roomId, 3600); // Override any existing room settings with generous 1 hour limit
      
      if (room.status === 'pre-game') {
          io.to(roomId).emit('game-started', { status: room.gameState, settings: room.settings });
          io.to(roomId).emit("room-updated", room);
          phaseTimers.startTimer(roomId, 120, () => forceStartCoreGame(roomId));
          cb({ success: true });
      } else {
          // Start Core Game directly
          const gameRoom = await GameService.startCoreGame(roomId);
          io.to(roomId).emit('game-started', { status: gameRoom.gameState, settings: gameRoom.settings });
          io.to(roomId).emit("room-updated", gameRoom);
          
          const time = gameRoom.settings?.timePerQuestion || 120;
          if (gameRoom.gameState.phase === 'category-reveal') {
             phaseTimers.startTimer(roomId, 4, () => advancePhase(roomId));
          } else {
             phaseTimers.startTimer(roomId, time, () => advancePhase(roomId));
          }
          cb({ success: true });
      }
    } catch (error) {
      socket.emit('error-message', error.message);
      cb({ error: error.message });
    }
  });

  socket.on("submit-pregame-input", async ({ roomId, playerId, input }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return socket.emit("error-message", "Room not found");

      const existing = room.preGameInputs.find(p => p.playerId === playerId);
      if (existing) {
        existing.statements = input;
      } else {
        room.preGameInputs.push({ playerId, statements: input });
      }

      if (room.preGameInputs.length >= room.players.length) {
          await room.save();
          phaseTimers.clearTimer(roomId);
          const gameRoom = await GameService.startCoreGame(room.roomId);
          io.to(roomId).emit("room-updated", gameRoom);
          
          const time = gameRoom.settings?.timePerQuestion || 120;
          if (gameRoom.gameState.phase === 'category-reveal') {
             phaseTimers.startTimer(roomId, 4, () => advancePhase(roomId));
          } else {
             phaseTimers.startTimer(roomId, time, () => advancePhase(roomId));
          }
      } else {
          await room.save();
          io.to(roomId).emit("room-updated", room);
      }
    } catch (error) {
      console.error(error);
      socket.emit("error-message", "Failed to submit pre-game input");
    }
  });

  socket.on('submit-input', async ({ roomId, playerId, answer, guesses }, callback) => {
    const cb = typeof callback === 'function' ? callback : (res) => {
        if (res.error) socket.emit('error-message', res.error);
    };
    try {
      const room = await GameService.submitInput(roomId, playerId, answer, guesses);
      io.to(roomId).emit("room-updated", room);
      io.to(roomId).emit('input-submitted', { playerId });

      const currentRoundIdx = room.gameState.currentQuestion;
      const round = room.rounds[currentRoundIdx];
      
      const activePlayers = room.players.filter(p => !p.disconnectedAt).length;
      let expectedGuesses = activePlayers;
      if (round.category === 'THE HOT SEAT') {
          expectedGuesses = activePlayers - 1; 
      }

      // SMART TIMER SKIP
      if (round.guesses.size >= expectedGuesses) {
        phaseTimers.skipTo(roomId, 5); // jump to 5 seconds remaining before reveal
      }

      cb({ success: true });
    } catch (error) {
      socket.emit('error-message', error.message);
      cb({ error: error.message });
    }
  });

  socket.on('player-next-round', async ({ roomId, playerId }, callback) => {
    const cb = typeof callback === 'function' ? callback : (res) => {};
    try {
       const votes = phaseTimers.addNextVote(roomId, playerId);
       const room = await Room.findOne({ roomId });
       if (!room) return cb({ error: 'Room not found' });
       
       const activePlayers = room.players.filter(p => !p.disconnectedAt).length;
       if (votes >= activePlayers) {
           phaseTimers.skipTo(roomId, 5);
       }
       cb({ success: true });
    } catch (error) {
       console.error(error);
       cb({ error: error.message });
    }
  });
};
