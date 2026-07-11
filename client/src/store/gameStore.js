import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  gameState: null,
  currentQuestion: null,
  playerAnswers: new Map(),
  playerGuesses: new Map(),
  gameResult: null,
  
  setGameState: (state) => set({ gameState: state }),
  
  handleGameStart: (data) => set({
    gameState: data.status,
    currentQuestion: data.settings.questions[0]
  }),
  
  handleGameEnd: (result) => set({
    gameState: 'ended',
    gameResult: result
  }),
  
  submitAnswer: async (answer) => {
    const { gameState, socket } = get();
    if (!gameState || gameState.phase !== 'answering') return;
    
    socket.emit('submit-answer', {
      questionId: gameState.currentQuestion.id,
      answer
    });
  }
}));

export default useGameStore;