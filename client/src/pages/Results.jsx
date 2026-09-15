import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useRoomStore from "@/store/roomStore";
import socket from "@/lib/socket";
import { ReckonLoader } from "@/components/ui/ReckonLoader";
import { Confetti } from "@/components/ui/confetti";

const Results = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { room, player, resetRoom } = useRoomStore();
  const [step, setStep] = useState(0); // 0 = Winner Reveal, 1 = Summary
  const [isWaiting, setIsWaiting] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);

  useEffect(() => {
    if (!room || !player) {
      navigate("/");
    }
  }, [room, player, navigate]);

  if (!room || !player) return null;

  const hasClickedPlayAgain = isWaiting || player?.wantsToPlayAgain;

  const players = Object.values(room?.players || {}).sort((a, b) => b.score - a.score);
  const p1 = players[0];
  const p2 = players[1] || p1; // Fallback for single player testing
  const isTie = players.length > 1 && p1.score === p2.score;

  const confettiRef = useRef(null);

  useEffect(() => {
    if (step === 0 && isTie) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confettiRef.current?.fire({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#00E5FF', '#FF99CC', '#E48F45', '#ffffff']
        });
        confettiRef.current?.fire({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#00E5FF', '#FF99CC', '#E48F45', '#ffffff']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [step, isTie]);

  const tieTexts = [
    "IT'S A DEADLOCK. YOU TWO ARE PRACTICALLY THE SAME PERSON...",
    "TWO MINDS, ONE DESTINY. WE HAVE A TIE!",
    "A PERFECT STALEMATE. NOBODY WINS, OR EVERYBODY WINS?",
    "IT'S A DRAW! GREAT MINDS REALLY DO THINK ALIKE..."
  ];
  
  const winTexts = [
    "THE CROWN GOES TO THE ULTIMATE MASTERMIND...",
    "FLAWLESS VICTORY. BOW DOWN TO YOUR CHAMPION...",
    "VICTORY SECURED. THEY READ YOU LIKE A BOOK...",
    "THE DUST HAS SETTLED, AND THE WINNER IS..."
  ];

  // Randomize text consistently based on roomId length
  const getDynamicText = (arr) => arr[room.roomId.length % arr.length];

  const parsePlaceholders = (text) => {
    if (!text || typeof text !== "string") return text;
    return text
      .replace(/{PLAYER_1}/g, room.players[0]?.name || "Player 1")
      .replace(/{PLAYER_2}/g, room.players[1]?.name || "Player 2");
  };

  const handlePlayAgain = () => {
     setIsWaiting(true);
     socket.emit("play-again", { roomId: room.roomId, playerId: player.id });
  };

  useEffect(() => {
     const handleRestart = () => {
        setIsRestarting(true);
        setTimeout(() => {
          navigate(`/lobby/${room.roomId}`);
        }, 1800);
     };
     
     const handleDisconnect = () => {
       setOpponentLeft(true);
       setIsWaiting(false);
       toast.error("Your opponent has left the match.");
     };

     socket.on("room-restarted", handleRestart);
     socket.on("player-disconnected", handleDisconnect);
     
     return () => {
       socket.off("room-restarted", handleRestart);
       socket.off("player-disconnected", handleDisconnect);
     };
  }, [navigate, room.roomId]);

  const handleLeaveHome = () => {
    socket.emit("leave-room", { roomId: room.roomId, playerId: player.id });
    resetRoom();
    navigate("/");
  };

  useEffect(() => {
    let timeoutId;
    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLeaveHome();
      }, 5 * 60 * 1000); // 5 minutes inactivity
    };

    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('keypress', resetTimeout);
    window.addEventListener('click', resetTimeout);
    window.addEventListener('scroll', resetTimeout);
    
    resetTimeout(); // Initialize

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keypress', resetTimeout);
      window.removeEventListener('click', resetTimeout);
      window.removeEventListener('scroll', resetTimeout);
    };
  }, []);

  const trollTexts = [
    "SKILL ISSUE DETECTED",
    "ABSOLUTELY CLUELESS",
    "TRY HARDER PLS",
    "MIND READ FAILED",
    "BETTER LUCK NEXT TIME",
    "WAKE UP BRO",
    "INTERNET EXPLORER PING"
  ];
  
  const winnerAuraTexts = [
    "ABSOLUTE LEGEND",
    "THE GOAT REVEALED",
    "UNSTOPPABLE MASTERMIND",
    "GALAXY BRAIN ENERGY",
    "FLAWLESS VICTORY",
    "READ LIKE A BOOK",
    "BUILT DIFFERENT"
  ];
  
  const tieAuraTexts = [
    "PERFECTLY BALANCED",
    "EQUAL INTELLECTS",
    "COPYCAT SYNDROME",
    "TWIN TELEPATHY",
    "CLONE DETECTED",
    "SAME WAVELENGTH"
  ];

  const PlayerCard = ({ p, isWinner, isTie }) => {
    const isChamp = isWinner && !isTie;
    
    let subTextArr = trollTexts;
    if (isTie) subTextArr = tieAuraTexts;
    else if (isWinner) subTextArr = winnerAuraTexts;
    
    const seed = room.roomId.length + p.name.length + p.score;
    const subText = subTextArr[seed % subTextArr.length];

    return (
      <div className={`relative flex flex-col items-center bg-black/40 border-4 border-white px-4 pb-6 pt-16 md:px-6 md:pb-8 md:pt-24 w-[160px] md:w-72 h-[240px] md:h-[340px] mt-16 md:mt-24 shrink-0 sketchy-shape ${isChamp ? 'shadow-[6px_6px_0px_white]' : ''}`}>
        
        {isChamp && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-[inherit]">
             <Confetti className="absolute inset-0 w-full h-full" options={{ particleCount: 150, spread: 80, origin: { y: 1 } }} />
          </div>
        )}        
        {/* Avatar Container popping out exactly half */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* Inner container for alignment */}
          <div className="relative flex flex-col items-center">
            {isChamp && (
              <img 
                src="/crown.png" 
                className="w-16 h-16 md:w-24 md:h-24 object-contain z-20 drop-shadow-[0_0_10px_gold] absolute -top-8 md:-top-12 wobble-hor-bottom"
              />
            )}
            
            {/* SVG Blob Background - Static Shadow */}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 50 50"
              className={`absolute z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black opacity-60 ${isChamp ? 'w-[124px] h-[124px] md:w-[212px] md:h-[212px]' : 'w-[105px] h-[105px] md:w-[158px] md:h-[158px]'}`}
            >
              <path fill="currentColor" d="M 49.80 26.89 C 48.30 31.46 38.94 30.92 36.18 33.67 C 33.46 36.38 37.25 41.15 33.69 42.92 C 30.54 44.49 28.12 39.71 24.44 39.51 C 21.39 39.35 18.78 43.23 15.73 41.98 C 13.18 40.93 14.46 37.26 11.68 34.26 C 8.21 30.53 1.94 30.70 1.72 26.89 C 1.48 22.72 8.65 22.92 10.81 19.02 C 12.65 15.70 9.63 9.84 12.85 6.82 C 15.73 4.12 19.52 6.59 24.44 6.24 C 29.65 5.87 33.61 2.99 37.02 5.10 C 40.48 7.25 39.04 12.45 41.67 16.94 C 43.70 20.40 51.27 22.42 49.80 26.89 Z"></path>
            </svg>
            
            <img 
              src={`https://api.dicebear.com/7.x/croodles/svg?seed=${p.avatarSeed || p.name}&backgroundColor=transparent`} 
              className={`${isChamp ? 'w-[118px] h-[118px] md:w-[202px] md:h-[202px] drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'w-[100px] h-[100px] md:w-[150px] md:h-[150px] grayscale drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]'} object-contain relative z-10 transition-all wobble-hor-bottom`} 
            />
          </div>
        </div>
        
        {/* Content Wrapper for internal scaling & spacing */}
        <div className={`flex-1 flex flex-col items-center justify-end w-full space-y-2 md:space-y-4 ${isChamp ? 'scale-[1.05]' : 'scale-100'} transition-all`}>
            
            <div className="flex flex-col items-center w-full">
              <div className={`${isChamp ? 'text-3xl md:text-5xl text-[#00E5FF] drop-shadow-[2px_2px_0px_white]' : 'text-2xl md:text-3xl text-white opacity-80'} font-black font-cabana text-center truncate w-full`}>
                {p.name}
              </div>
              <div className={`text-[9px] md:text-xs ${isChamp ? 'text-[#E48F45]' : 'text-white/50'} tracking-widest uppercase font-bold text-center mt-1 w-full truncate px-2`}>
                {subText}
              </div>
            </div>
            
            <div className="w-full h-1 bg-white/20 my-2 md:my-4 border-b border-black/50"></div>
            
            <div className="flex flex-col items-center w-full">
              <div className="text-[10px] md:text-sm tracking-widest text-white/50 mb-1">SCORE</div>
              <div className={`${isChamp ? 'text-5xl md:text-7xl text-[#E48F45] drop-shadow-[2px_2px_0px_white]' : 'text-3xl md:text-5xl text-white/80'} font-black font-cabana leading-none`}>
                {p.score}
              </div>
            </div>

        </div>
      </div>
    );
  };

  const renderWinnerReveal = () => (
    <motion.div 
      key="winner"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50 }}
      className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-4 text-center"
    >
       {/* Global Confetti for Tie (Side Cannons) */}
       {isTie && (
         <Confetti 
           ref={confettiRef} 
           className="fixed inset-0 z-[100] w-full h-full pointer-events-none" 
           manualstart={true} 
         />
       )}
       
       <div className="text-sm md:text-xl text-white/50 tracking-[0.2em] uppercase font-cabana mb-6 md:mb-12 shrink-0">
          {isTie ? getDynamicText(tieTexts) : getDynamicText(winTexts)}
       </div>

       <div className="flex flex-row items-end justify-center gap-6 md:gap-16 w-full shrink-0">
          <PlayerCard p={p1} isWinner={true} isTie={isTie} />
          <PlayerCard p={p2} isWinner={false} isTie={isTie} />
       </div>

       <div className="flex flex-col sm:flex-row gap-4 mt-12 md:mt-16 shrink-0">
           <motion.button 
             onClick={() => setStep(1)}
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="px-6 py-3 bg-white text-black text-sm md:text-lg font-bold tracking-[0.1em] border-2 border-white shadow-[4px_4px_0px_rgba(255,255,255,0.3)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all uppercase"
           >
             VIEW SUMMARY
           </motion.button>
           
           <motion.button 
             onClick={handleLeaveHome}
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="px-6 py-3 bg-[#FF99CC] text-white text-sm md:text-lg font-bold tracking-[0.1em] border-2 border-white shadow-[4px_4px_0px_white] uppercase hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all"
           >
             HOME
           </motion.button>
           
           {!opponentLeft && (
             <motion.button 
               onClick={handlePlayAgain}
               disabled={hasClickedPlayAgain}
               whileHover={!hasClickedPlayAgain ? { scale: 1.05 } : {}}
               whileTap={!hasClickedPlayAgain ? { scale: 0.95 } : {}}
               className={`px-6 py-3 text-sm md:text-lg font-bold tracking-[0.1em] border-2 border-white uppercase transition-all ${
                 hasClickedPlayAgain
                   ? "bg-white text-black opacity-75 cursor-not-allowed shadow-none translate-x-[4px] translate-y-[4px]"
                   : "bg-[#E48F45] text-black shadow-[4px_4px_0px_white] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
               }`}
             >
               {hasClickedPlayAgain ? "WAITING..." : "PLAY AGAIN"}
             </motion.button>
           )}
       </div>
    </motion.div>
  );

  const renderSummary = () => {
    return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full w-full max-w-5xl mx-auto px-6 py-12"
    >
      <div className="flex items-center justify-between border-b-4 border-white/20 pb-6 mb-8 mt-12 md:mt-0">
         <h2 className="text-4xl md:text-6xl font-['IndieSellout'] font-bold text-white tracking-widest drop-shadow-[0_0_15px_white]">
            GAME SUMMARY
          </h2>
         <button 
           onClick={() => setStep(0)}
           className="px-6 py-2 bg-transparent text-white border-2 border-white text-sm md:text-lg font-bold tracking-widest hover:bg-white hover:text-black transition-colors"
         >
           BACK
         </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 space-y-8 pb-20 custom-scrollbar">
         {room.rounds.map((r, i) => {
            const isHotSeat = r.spotlightPlayerId;
            const p1Guess = r.guesses?.[p1.id];
            const p2Guess = r.guesses?.[p2.id];
            
            return (
              <div key={i} className="bg-black/30 border-2 border-white/20 p-6 flex flex-col gap-4 shadow-[4px_4px_0px_rgba(255,255,255,0.1)]">
                 <div className="text-[#E48F45] tracking-widest font-bold text-sm uppercase">ROUND {i + 1} - {r.category}</div>
                 <div className="text-2xl md:text-3xl font-cabana font-bold leading-relaxed text-white">
                    {parsePlaceholders(r.question)}
                 </div>
                 
                 <div className="flex flex-col md:flex-row gap-6 mt-4">
                    {/* P1 Result */}
                    <div className="flex-1 bg-black/50 p-4 border-l-4 border-[#00E5FF]">
                       <div className="text-sm text-white/50 tracking-widest mb-2">{p1.name}'s Guess</div>
                       <div className={`text-xl font-bold font-cabana ${p1Guess?.correct ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'text-rose-500 line-through'}`}>
                          {parsePlaceholders(p1Guess?.value) || "[NO ANSWER]"}
                       </div>
                    </div>
                    {/* P2 Result */}
                    <div className="flex-1 bg-black/50 p-4 border-l-4 border-white">
                       <div className="text-sm text-white/50 tracking-widest mb-2">{p2.name}'s Guess</div>
                       <div className={`text-xl font-bold font-cabana ${p2Guess?.correct ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'text-rose-500 line-through'}`}>
                          {parsePlaceholders(p2Guess?.value) || "[NO ANSWER]"}
                       </div>
                    </div>
                 </div>
                 
                 <div className="mt-2 text-white/50 text-sm tracking-widest bg-white/5 p-3 border border-white/10">
                    <span className="text-[#87CEFA] font-bold">ACTUAL ANSWER:</span> {isHotSeat ? parsePlaceholders(r.correctAnswer) : "Varies per player (Self-Evaluation)"}
                 </div>
              </div>
            )
         })}
      </div>
      
      <div className="pt-8 flex justify-center pb-8 shrink-0">
         <button 
           onClick={handleLeaveHome}
           className="px-8 py-3 bg-[#FF99CC] text-white text-lg font-bold tracking-[0.1em] border-2 border-white shadow-[4px_4px_0px_white] uppercase hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all mr-4"
         >
           HOME
         </button>
        <button
          onClick={handlePlayAgain}
          disabled={hasClickedPlayAgain}
          className={`w-full md:w-auto px-6 py-4 md:px-12 md:py-4 text-xl md:text-3xl font-bold font-['IndieSellout'] uppercase tracking-widest border-4 transition-all shadow-[6px_6px_0px_white] ${
            hasClickedPlayAgain 
              ? "bg-white text-black shadow-none translate-x-[4px] translate-y-[4px] opacity-75 cursor-not-allowed border-white"
              : "bg-[#0A0A0A] text-white border-white hover:bg-white hover:text-black hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
          }`}
        >
          {hasClickedPlayAgain ? "WAITING FOR OTHERS..." : "PLAY AGAIN"}
        </button>
      </div>
    </motion.div>
  );
  };



  return (
    <div className="w-full min-h-screen bg-transparent flex flex-col items-center py-6 px-4 relative overflow-hidden font-cabana">
      
      {isRestarting && (
        <ReckonLoader 
          isOverlay={true} 
          texts={["RESETTING ROOM...", "CLEANING UP MESSES...", "PREPARING LOBBY..."]} 
          speed={600} 
        />
      )}

      {/* Confetti (only on winner reveal) */}
       <div className="absolute inset-0 z-0 flex items-center justify-center opacity-30 pointer-events-none">
          <div className="w-[800px] h-[800px] bg-gradient-to-tr from-[#00E5FF]/20 to-[#E48F45]/20 blur-3xl rounded-full mix-blend-screen" />
       </div>

       <div className="relative z-10 flex-1 w-full h-full">
         <AnimatePresence mode="wait">
            {step === 0 ? (
               <motion.div key="winner" className="w-full h-full">
                 {renderWinnerReveal()}
               </motion.div>
            ) : (
               <motion.div key="summary" className="w-full h-full">
                 {renderSummary()}
               </motion.div>
            )}
         </AnimatePresence>
       </div>
    </div>
  );
};

export default Results;
