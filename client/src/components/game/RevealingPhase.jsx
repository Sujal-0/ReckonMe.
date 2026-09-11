import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import socket from "@/lib/socket";
import FoldText from "@/components/FoldText";

export const RevealingPhase = ({ round, room, player, phaseTimer }) => {
  const isHotSeat = round.category === "THE HOT SEAT";
  const targetPlayer = room.players.find(p => p.id !== player.id);
  const getGuessResult = (guesserId, targetId) => {
    if (!round.guesses || !round.guesses[guesserId]) return null;
    return round.guesses[guesserId];
  };

  const hasValidGuesses = isHotSeat 
    ? getGuessResult(player.id, targetPlayer.id) || getGuessResult(targetPlayer.id, player.id)
    : getGuessResult(targetPlayer.id, player.id) || getGuessResult(player.id, targetPlayer.id);

  const isLate = phaseTimer && (phaseTimer.duration - phaseTimer.timeLeft > 11);
  const [step, setStep] = useState((isLate || !hasValidGuesses) ? 7 : 0);
  const [hasVotedNext, setHasVotedNext] = useState(false);
  const [bursts, setBursts] = useState([]);
  const isLastRound = room.gameState?.currentQuestion === room.rounds?.length - 1;
  const reveal1Ref = useRef(null);
  const reveal2Ref = useRef(null);

  useEffect(() => {
    if (step === 1 && reveal1Ref.current) {
      setTimeout(() => reveal1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 1000);
    } else if (step === 4 && reveal2Ref.current) {
      setTimeout(() => reveal2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 1000);
    } else if (step === 3 && reveal1Ref.current) {
      setTimeout(() => reveal1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 1000);
    } else if (step === 6 && reveal2Ref.current) {
      setTimeout(() => reveal2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 1000);
    }
  }, [step]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1000), // Header 1
      setTimeout(() => setStep(2), 2500), // Option 1
      setTimeout(() => setStep(3), 4500), // Reveal 1
    ];
    
    if (isLate) return;

    if (!isHotSeat) {
      timers.push(
        setTimeout(() => setStep(4), 6000), // Header 2
        setTimeout(() => setStep(5), 7500), // Option 2
        setTimeout(() => setStep(6), 9500)  // Reveal 2
      );
    }
    
    timers.push(
      setTimeout(() => {
        setStep(7);
        if (isLastRound) {
           handleNextClick();
        }
      }, isHotSeat ? 6000 : 11000) // Next Button / Auto Advance
    );
    
    return () => timers.forEach(clearTimeout);
  }, [isHotSeat, isLastRound, isLate]);

  const parsePlaceholders = (text) => {
    if (!text || typeof text !== "string") return text;
    return text
      .replace(/{PLAYER_1}/g, room.players[0]?.name || "Player 1")
      .replace(/{PLAYER_2}/g, room.players[1]?.name || "Player 2");
  };

  const emptyMessages = [
    "OOPS, I THINK YOUR INTERNET IS MESSING WITH YOU...",
    "I THINK YOU'VE FALLEN ASLEEP!",
    "MISSED IT! TOO SLOW...",
    "WAKE UP! YOU MISSED THE TIMER...",
    "HELLO? ANYONE THERE?"
  ];
  const getEmptyMessage = (id) => emptyMessages[(id?.charCodeAt(0) || 0) % emptyMessages.length];

  const parsedQuestion = parsePlaceholders(round.question);



  const getActualAnswer = (targetId) => {
    if (isHotSeat) return round.correctAnswer;
    return round.answers && round.answers[targetId];
  };

  const handleNextClick = () => {
    if (hasVotedNext) return;
    setHasVotedNext(true);
    socket.emit("player-next-round", { roomId: room.roomId, playerId: player.id });
  };

  const renderRevealSection = (targetId, guesserId, targetName, guesserName, isMe, baseStep) => {
    const actual = getActualAnswer(targetId);
    const guessObj = getGuessResult(guesserId, targetId);
    
    if (!guessObj) return null; // If no guess object at all, skip.
    const isCorrect = guessObj.correct;
    const parsedGuessValue = parsePlaceholders(guessObj.value);
    const options = round.options ? round.options.map(parsePlaceholders) : [];

    const headerMsg = isMe
      ? `You guessed ${targetName} would pick:`
      : `${guesserName} guessed for you:`;
      
    let resultMsg = "";
    if (parsedGuessValue !== "[NO ANSWER]") {
      resultMsg = isMe
        ? (isCorrect ? "You guessed correctly! :D" : "Oops, you guessed wrong :(")
        : (isCorrect ? `They guessed correctly!` : `They guessed wrong :(`);
    }

    const isHeaderShown = step >= baseStep;
    const isOptionShown = step >= baseStep + 1;
    const isRevealed = step >= baseStep + 2;
    const ref = baseStep === 1 ? reveal1Ref : reveal2Ref;

    return (
      <div ref={ref} className="relative w-full flex flex-col items-center mb-16 min-h-[160px] scroll-mt-[150px] md:scroll-mt-[200px] pt-8 md:pt-12" key={`${guesserId}-reveal`}>
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isHeaderShown ? 1 : 0, y: isHeaderShown ? 0 : 10 }}
          className="text-lg md:text-2xl text-white/50 font-cabana tracking-widest uppercase min-h-8 flex items-center justify-center text-center px-4"
        >
          {headerMsg}
        </motion.div>
        
        {/* Option */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 lg:gap-4 mt-2 md:mt-4 w-full relative min-h-[60px]">
          {parsedGuessValue === "[NO ANSWER]" ? (
             <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: isOptionShown ? 1 : 0, scale: isOptionShown ? (isRevealed ? 1.1 : 1) : 0.8 }}
               className="px-3 py-2 md:px-5 md:py-3 text-rose-500 text-xs sm:text-sm md:text-lg lg:text-xl font-bold tracking-widest font-cabana z-10 text-center uppercase absolute max-w-full break-words break-all whitespace-normal"
             >
               {getEmptyMessage(guesserId)}
             </motion.div>
          ) : (
             options.map((opt, i) => {
               const isChosen = opt === parsedGuessValue;
               const isActualAnswer = opt === actual;
               
               let borderClass = 'border-white/50 bg-[#0A0A0A] text-white/80';
               let scaleOpt = 0.9;
               let opacityOpt = 0.4;
               
               if (!isRevealed) {
                   if (isChosen) {
                       borderClass = 'border-[#E48F45] bg-[#E48F45] text-black shadow-[4px_4px_0px_white] z-10';
                       scaleOpt = 1.05;
                       opacityOpt = 1;
                   }
               } else {
                   if (isChosen) {
                       if (isCorrect) {
                           borderClass = 'border-[#00E5FF] bg-[#00E5FF] text-black shadow-[4px_4px_0px_white] z-10';
                           scaleOpt = 1.1;
                           opacityOpt = 1;
                       } else {
                           borderClass = 'border-rose-500 bg-rose-500 text-white line-through opacity-80 z-10';
                           scaleOpt = 1.0;
                           opacityOpt = 1;
                       }
                   } else if (isActualAnswer) {
                       borderClass = 'border-[#00E5FF] bg-black/50 text-[#00E5FF] shadow-[0_0_15px_#00E5FF] z-10';
                       scaleOpt = 1.1;
                       opacityOpt = 1;
                   } else {
                       borderClass = 'border-white/20 bg-transparent text-white/30';
                       scaleOpt = 0.9;
                       opacityOpt = 0.4;
                   }
               }

               return (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ 
                     opacity: isOptionShown ? opacityOpt : 0, 
                     scale: isOptionShown ? scaleOpt : 0.8 
                   }}
                   transition={{ type: "spring", delay: isOptionShown && !isLate ? i * 0.1 : 0 }}
                   className={`relative max-w-[95%] md:max-w-full px-3 py-2 md:px-5 md:py-3 border-2 md:border-4 text-xs sm:text-sm md:text-lg lg:text-xl font-bold tracking-widest font-cabana transition-all duration-500 break-words break-all whitespace-normal text-center flex items-center justify-center ${borderClass}`}
                 >
                   {opt}
                   {isRevealed && isActualAnswer && isHotSeat && (
                       <motion.div 
                         initial={{ scale: 0, rotate: 0 }}
                         animate={{ scale: 1, rotate: 12 }}
                         transition={{ type: "spring", bounce: 0.6, delay: 0.3 }}
                         className="absolute -top-4 -right-2 md:-top-5 md:-right-4 bg-[#FF99CC] text-white text-[8px] md:text-xs font-black px-1.5 py-0.5 md:px-2 md:py-1 shadow-[2px_2px_0px_white] border-2 border-white pointer-events-none z-20 whitespace-nowrap"
                       >
                         ACTUAL LIE
                       </motion.div>
                   )}
                 </motion.div>
               );
             })
          )}
        </div>

        {/* Result Message */}
        <div className="h-10 mt-4 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isRevealed ? 1 : 0, scale: isRevealed ? 1 : 0.8 }}
            className={`text-xl md:text-2xl font-bold font-cabana max-w-full break-words break-all whitespace-normal text-center px-4 ${isCorrect ? 'text-[#00E5FF]' : 'text-rose-500'}`}
          >
            {resultMsg}
          </motion.div>
        </div>

        {/* The +1 Point Animation */}
        {isRevealed && isCorrect && isMe && !isLate && (
           <motion.div
             initial={{ opacity: 0, y: -20, x: 0, scale: 0.5 }}
             animate={{ 
                opacity: [0, 1, 1, 0], 
                y: [-20, -40, -60, -80],
                scale: [0.5, 1.2, 1.2, 0.8] 
             }}
             transition={{ duration: 1.2, ease: "easeInOut", times: [0, 0.2, 0.8, 1] }}
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 flex items-center justify-center"
           >
             <div className="text-6xl md:text-8xl font-black font-cabana tracking-normal text-white drop-shadow-[4px_4px_0px_black] wobble-hor-bottom">
               + 1
             </div>
           </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full max-w-4xl mx-auto flex flex-col items-center text-center p-6 relative">
      
      {/* Title */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full relative flex items-center justify-center border-b border-white/20 mb-8 pb-4 mt-16 md:mt-24"
      >
         <div className="absolute px-4 py-2 md:px-6 md:py-2 bg-black text-white text-lg md:text-2xl font-bold tracking-[0.2em] uppercase border-2 md:border-4 border-white shadow-[4px_4px_0px_black]">
           {isHotSeat ? "THE TRUTH REVEALED" : "ALL ANSWERS"}
         </div>
      </motion.div>

      {/* Question */}
      <div className="text-xl md:text-4xl lg:text-5xl text-white tracking-wider leading-relaxed font-cabana font-bold w-full text-center mt-4 mb-12 max-w-full px-2 md:px-4 break-words break-all whitespace-normal">
        <FoldText
          text={isHotSeat ? "LET'S SEE IF YOU SPOTTED THE LIE!" : parsedQuestion}
          splitBy="word"
          hinge="top"
          trigger="mount"
          duration={0.8}
          stagger={0.06}
          ease="power3.out"
          fontSize="inherit"
          fontWeight={800}
        />
      </div>
      
      <div className="w-full flex-1 flex flex-col items-center justify-center mt-4 pb-32 md:pb-0">
        {isHotSeat ? (
           <div className="w-full max-w-2xl mx-auto">
             {round.spotlightPlayerId === player.id 
                ? renderRevealSection(player.id, targetPlayer.id, player.name, targetPlayer.name, false, 1)
                : renderRevealSection(targetPlayer.id, player.id, targetPlayer.name, player.name, true, 1)}
           </div>
        ) : (
          <>
             {/* My guess on them */}
             {renderRevealSection(targetPlayer.id, player.id, targetPlayer.name, player.name, true, 1)}
             
             {/* Their guess on me */}
             <div className="w-full max-w-md border-t border-white/10 my-4"></div>
             {renderRevealSection(player.id, targetPlayer.id, player.name, targetPlayer.name, false, 4)}
          </>
        )}
      </div>

      {/* Next Button */}
      <AnimatePresence>
        {step >= 7 && !isLastRound && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 md:bottom-12 md:left-auto md:translate-x-0 md:right-12 z-[45]"
          >
            {!hasVotedNext ? (
              <button 
                onClick={handleNextClick}
                className="px-4 py-2 md:px-8 md:py-4 bg-white text-black border-2 md:border-4 border-white text-sm md:text-2xl font-bold tracking-[0.1em] shadow-[4px_4px_0px_rgba(255,255,255,0.3)] md:shadow-[6px_6px_0px_rgba(255,255,255,0.3)] hover:shadow-none hover:translate-x-[4px] md:hover:translate-x-[6px] hover:translate-y-[4px] md:hover:translate-y-[6px] transition-all uppercase"
              >
                NEXT!
              </button>
            ) : (
              <div className="text-xl text-[#87CEFA] animate-pulse tracking-widest font-bold font-cabana">
                WAITING...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      
    </div>
  );
};
