import Room from '../models/RoomModel.js';
import Question from '../models/QuestionModel.js';
import GameResult from '../models/GameResult.js';
import MatchHistory from '../models/MatchHistoryModel.js';

export class GameService {
  static async startGame(roomId) {
    const room = await Room.startGame(roomId);
    if (!room) throw new Error('Room not found');
    return room;
  }

  static async startCoreGame(roomId) {
    const room = await Room.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    const questionsNeeded = room.settings.questionsPerGame || 5;
    let baseRounds = [];

    if (room.settings.questionMode === 'custom' && room.settings.customQuestions?.length > 0) {
       // Shuffle custom questions and slice
       const customQ = [...room.settings.customQuestions].sort(() => Math.random() - 0.5).slice(0, questionsNeeded);
       baseRounds = customQ.map((q, idx) => ({
           roundNumber: idx + 1,
           question: q.text,
           options: q.options,
           category: "CUSTOM",
           heatLevel: 3,
           answers: new Map(),
           guesses: new Map()
       }));
    } else {
       let query = { isCustom: false };
       if (room.settings.questionMode === 'categories' && room.settings.categories?.length > 0) {
           query.category = { $in: room.settings.categories };
       }

       const dbQuestions = await Question.aggregate([
          { $match: query },
          { $sample: { size: questionsNeeded } }
       ]);
       
       baseRounds = dbQuestions.map((q, idx) => ({
           roundNumber: idx + 1,
           question: q.text,
           options: q.options,
           category: q.category || 'RANDOM',
           heatLevel: q.heatLevel || 1,
           answers: new Map(),
           guesses: new Map()
       }));
    }

    if (room.settings.includeHotSeat) {
       // Create a large, shuffled pool of fallback statements so they don't repeat
       const fallbackPool = [
         "I WAS TOO SLOW TO TYPE ANYTHING",
         "MY BRAIN COMPLETELY STOPPED WORKING",
         "I LET THE TIMER RUN OUT ON PURPOSE",
         "I PANICKED AND TYPED NOTHING",
         "I AM LITERALLY JUST A POTATO",
         "I FELL ASLEEP AT MY KEYBOARD",
         "I COULDN'T THINK OF A THIRD THING",
         "I FORGOT HOW TO SPELL",
         "I BLAME MY INTERNET CONNECTION",
         "I WAS DISTRACTED BY A CUTE DOG",
         "I HAVE NO IDEA WHAT IS HAPPENING",
         "I AM JUST HAPPY TO BE HERE",
         "I AM SECRETLY THREE KIDS IN A TRENCH COAT",
         "I TYPED THIS WITH MY EYES CLOSED",
         "I AM WAITING FOR INSPIRATION TO STRIKE",
         "I LOST A FIGHT WITH MY AUTOCORRECT",
         "I'M NOT IGNORING YOU, I'M JUST SLOW",
         "I SPILLED COFFEE ON MY KEYBOARD",
         "I WAS ABDUCTED BY ALIENS BRIEFLY",
         "I FORGOT IT WAS MY TURN"
       ].sort(() => Math.random() - 0.5);

       const hotSeatRounds = room.players.map((player, idx) => {
         let input = room.preGameInputs?.find(p => p.playerId === player.id);
         
         // Ensure input structure exists
         if (!input) {
            input = { playerId: player.id, statements: [{}, {}, {}] };
         }
         
         // Ensure exactly 3 statements
         while (input.statements.length < 3) input.statements.push({});
         
         // Replace empty or missing texts with fallbacks from the pool
         input.statements = input.statements.map(s => {
             const text = (s.text || "").trim();
             if (!text) {
                 return { text: fallbackPool.pop() || "I AM OUT OF EXCUSES", isLie: s.isLie || false };
             }
             return { text, isLie: s.isLie || false };
         });
         
         // Ensure exactly ONE lie is marked
         let lieStatements = input.statements.filter(s => s.isLie);
         if (lieStatements.length !== 1) {
             // Reset all to truth
             input.statements.forEach(s => s.isLie = false);
             // Randomly assign one lie
             const lieIndex = Math.floor(Math.random() * 3);
             input.statements[lieIndex].isLie = true;
         }

         const lieStatement = input.statements.find(s => s.isLie);
         
         return {
           roundNumber: baseRounds.length + idx + 1,
           question: "Which of these statements is the Lie?",
           options: input.statements.map(s => s.text),
           category: "THE HOT SEAT",
           heatLevel: 5,
           spotlightPlayerId: input.playerId,
           correctAnswer: lieStatement?.text,
           answers: new Map(),
           guesses: new Map()
         };
       });
       baseRounds = [...baseRounds, ...hotSeatRounds];
    }

    room.rounds = baseRounds;
    room.status = 'playing';
    room.gameState.currentQuestion = 0; 
    
    if (baseRounds[0] && baseRounds[0].category === 'THE HOT SEAT') {
        room.gameState.phase = 'category-reveal';
    } else {
        room.gameState.phase = 'input';
    }
    
    await room.save();
    return room;
  }

  static async submitInput(roomId, playerId, answer, guesses) {
    // guesses is an array: [{targetId, guess}]
    const room = await Room.findOne({ roomId });
    if (!room || room.gameState.phase !== 'input') throw new Error('Invalid phase');

    const currentRoundIdx = room.gameState.currentQuestion;
    const round = room.rounds[currentRoundIdx];

    if (answer !== undefined && answer !== null) {
       round.answers.set(playerId, answer);
    }
    
    if (guesses && Array.isArray(guesses)) {
       for (const g of guesses) {
          // Let's store the guess without 'correct' flag, we'll evaluate it before entering 'revealing' phase.
          round.guesses.set(playerId, { targetId: g.targetId, value: g.guess });
       }
    }

    room.markModified('rounds');
    room.markModified(`rounds.${currentRoundIdx}.answers`);
    room.markModified(`rounds.${currentRoundIdx}.guesses`);
    await room.save();
    return room;
  }

  static evaluateRound(room) {
     const currentRoundIdx = room.gameState.currentQuestion;
     const round = room.rounds[currentRoundIdx];
     
     // 1. Fill missing answers and guesses for AFK players
     room.players.forEach(p => {
         if (!round.answers.has(p.id)) {
             round.answers.set(p.id, "[NO ANSWER]");
         }
         if (!round.guesses.has(p.id)) {
             const targetPlayer = room.players.find(other => other.id !== p.id);
             round.guesses.set(p.id, { targetId: targetPlayer?.id, value: "[NO ANSWER]" });
         }
     });

     // 2. Evaluate all guesses now that all answers are in
     for (const [playerId, guessObj] of round.guesses.entries()) {
        let isCorrect = false;
        
        let actualAnswer;
        if (round.category === 'THE HOT SEAT') {
           actualAnswer = round.correctAnswer;
        } else {
           actualAnswer = round.answers.get(guessObj.targetId);
        }

        if (guessObj.value === "[NO ANSWER]" || actualAnswer === "[NO ANSWER]") {
           isCorrect = false;
        } else {
           isCorrect = (guessObj.value === actualAnswer);
        }
        
        guessObj.correct = isCorrect;
        
        if (isCorrect) {
           const p = room.players.find(p => p.id === playerId);
           if (p) p.score += 1;
        }
        
        // Mongoose maps need explicit setting to mark as modified for nested object updates sometimes
        round.guesses.set(playerId, guessObj);
     }
     
     room.markModified(`rounds.${currentRoundIdx}.guesses`);
     room.markModified('players'); // score updated
  }

  static async advancePhase(roomId) {
     const room = await Room.findOne({ roomId });
     if (!room) return null;

     const currentPhase = room.gameState.phase;
     const currentRoundIdx = room.gameState.currentQuestion;
     const round = room.rounds[currentRoundIdx];
     
     if (currentPhase === 'category-reveal') {
        room.gameState.phase = 'input';
     } else if (currentPhase === 'input') {
        // Evaluate the round before revealing
        this.evaluateRound(room);
        room.gameState.phase = 'revealing';
     } else if (currentPhase === 'revealing') {
        const activePlayers = room.players.filter(p => !p.disconnectedAt);
        if (activePlayers.length < 2) {
            // End the game early because someone disconnected
            room.status = 'finished';
            room.gameState.phase = 'finished';
            
            // Save to MatchHistory if any player is authenticated
            const hasAuthPlayer = room.players.some(p => p.userId);
            if (hasAuthPlayer) {
               try {
                   // Calculate winner
                   const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
                   const isTie = sortedPlayers.length > 1 && sortedPlayers[0].score === sortedPlayers[1].score;
                   const winnerId = isTie ? 'tie' : sortedPlayers[0].id;

                   await MatchHistory.create({
                      roomId: room.roomId,
                      players: room.players.map(p => ({
                         id: p.id,
                         name: p.name,
                         score: p.score,
                         avatarSeed: p.avatarSeed,
                         userId: p.userId || null
                      })),
                      winnerId,
                      roundsPlayed: room.rounds.length
                   });
               } catch (err) {
                   console.error("Failed to save MatchHistory:", err);
               }
            }
        } else if (room.gameState.currentQuestion + 1 < room.rounds.length) {
            room.gameState.currentQuestion++;
            const nextRound = room.rounds[room.gameState.currentQuestion];
            if (nextRound.category === 'THE HOT SEAT') {
                room.gameState.phase = 'category-reveal';
            } else {
                room.gameState.phase = 'input';
            }
        } else {
            room.status = 'finished';
            room.gameState.phase = 'finished';
            
            // Save to MatchHistory if any player is authenticated
            const hasAuthPlayer = room.players.some(p => p.userId);
            if (hasAuthPlayer) {
               try {
                   // Calculate winner
                   const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
                   const highestScore = sortedPlayers[0]?.score || 0;
                   const isTie = sortedPlayers.length > 1 && sortedPlayers[0].score === sortedPlayers[1].score;
                   const winnerId = isTie ? 'tie' : sortedPlayers[0].id;

                   await MatchHistory.create({
                      roomId: room.roomId,
                      players: room.players.map(p => ({
                         id: p.id,
                         name: p.name,
                         score: p.score,
                         avatarSeed: p.avatarSeed,
                         userId: p.userId || null
                      })),
                      winnerId,
                      roundsPlayed: room.rounds.length
                   });
               } catch (err) {
                   console.error("Failed to save MatchHistory:", err);
               }
            }
        }
     }
     
     await room.save();
     return room;
  }

  static async endGame(roomId) {
    return { success: true };
  }
}