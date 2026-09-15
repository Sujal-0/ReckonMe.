import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import socket from "@/lib/socket";
import FoldText from "@/components/FoldText";
import { Highlighter } from "@/components/magicui/highlighter";

export const InputPhase = ({ round, room, player }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(round?.answers?.[player.id] || null);
  const [selectedGuess, setSelectedGuess] = useState(round?.guesses?.[player.id]?.value || null);
  const isLockedInitial = !!round?.guesses?.[player.id] || !!round?.answers?.[player.id];
  const [isLocked, setIsLocked] = useState(isLockedInitial);
  
  const [showQuestionText, setShowQuestionText] = useState(isLockedInitial);
  const [showOptions, setShowOptions] = useState(isLockedInitial);
  const [showGuessingPhase, setShowGuessingPhase] = useState(isLockedInitial);
  const guessPhaseRef = useRef(null);

  useEffect(() => {
    if (showGuessingPhase && guessPhaseRef.current) {
      setTimeout(() => {
        guessPhaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [showGuessingPhase]);

  // Calculate question animation duration (approx 2s) to show options after
  useEffect(() => {
    if (isLockedInitial) return;
    const t1 = setTimeout(() => setShowQuestionText(true), 400);
    const t2 = setTimeout(() => setShowOptions(true), 2500); 
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [round.roundNumber, isLockedInitial]);

  const targetPlayer = room.players.find(p => p.id !== player.id);
  const isHotSeat = round.category === "THE HOT SEAT";
  const isSpotlight = isHotSeat && round.spotlightPlayerId === player.id;
  const hasSubmitted = isLocked || !!round.guesses?.[player.id];

  useEffect(() => {
    if (selectedAnswer) {
      if (isLocked) {
        setShowGuessingPhase(true);
      } else {
        const t = setTimeout(() => setShowGuessingPhase(true), 1200);
        return () => clearTimeout(t);
      }
    } else if (isHotSeat && !isSpotlight && showOptions) {
      setShowGuessingPhase(true);
    }
  }, [selectedAnswer, isHotSeat, isSpotlight, isLocked, showOptions]);

  useEffect(() => {
    if (showGuessingPhase && guessPhaseRef.current) {
      setTimeout(() => {
        guessPhaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400); // Wait for the motion animation to run a bit
    }
  }, [showGuessingPhase]);

  const parsePlaceholders = (text) => {
    if (!text || typeof text !== "string") return text;
    return text
      .replace(/{PLAYER_1}/g, room.players[0]?.name || "Player 1")
      .replace(/{PLAYER_2}/g, room.players[1]?.name || "Player 2");
  };

  const parsedQuestion = parsePlaceholders(round.question);
  const parsedOptions = round.options?.map(parsePlaceholders) || [];

  const handleSubmit = (guessValue) => {
    setIsLocked(true);
    socket.emit("submit-input", {
      roomId: room.roomId,
      playerId: player.id,
      answer: isSpotlight ? round.correctAnswer : selectedAnswer,
      guesses: [{ targetId: isHotSeat ? round.spotlightPlayerId : targetPlayer.id, guess: guessValue }]
    });
  };

  const handleGuessSelect = (opt) => {
    if (hasSubmitted) return;
    setSelectedGuess(opt);
    handleSubmit(opt);
  };

  if (isSpotlight) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="bg-[#FF99CC] px-6 py-2 md:px-10 md:py-4 border-4 border-white shadow-[6px_6px_0px_white] mb-8 sketchy-shape"
        >
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-widest uppercase font-['IndieSellout']">
            THE HOT SEAT
          </h1>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-6xl font-bold text-white tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] mt-4 font-cabana"
        >
          <span className="bg-[#00E5FF] text-black px-2 py-1 font-bold">TRAP SET.</span> NOW WE WAIT.
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl md:text-3xl text-white/70 mt-6 font-cabana max-w-2xl leading-relaxed"
        >
          Watch closely. <span className="text-[#00E5FF] font-bold">{targetPlayer?.name}</span> is sweating right now trying to figure out which story is your lie. Don't blow your cover!
        </motion.p>
        
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
          className="mt-16 relative"
        >
           <div className="absolute inset-0 bg-[#FF99CC]/30 blur-[60px] rounded-full scale-150"></div>
           <div className="relative z-10 w-40 h-40 md:w-56 md:h-56 mx-auto bg-black/40 border-4 border-[#FF99CC] shadow-[8px_8px_0px_#FF99CC] rounded-none flex items-center justify-center sketchy-shape overflow-hidden">
             <img 
                src={`https://api.dicebear.com/7.x/croodles/svg?seed=${player.avatarSeed || player.name}&backgroundColor=transparent`} 
                className="w-32 h-32 md:w-44 md:h-44 wobble-hor-bottom drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                alt="You"
             />
           </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div layout transition={{ type: "spring", stiffness: 100, damping: 20 }} className="w-full h-full max-w-4xl mx-auto flex flex-col gap-6 md:gap-8 items-center text-center p-4 md:p-6">
      
      {/* Custom Question Container with Bookmark Category */}
      <motion.div layout className="relative w-full min-h-[80px] md:min-h-[140px] bg-[#0A0A0A] border-2 md:border-4 border-white p-4 md:p-10 shadow-[4px_4px_0px_white] md:shadow-[8px_8px_0px_white] flex items-center justify-center mt-2 md:mt-8 max-w-full break-words break-all whitespace-normal">
        
        {/* Bookmark Category Tag */}
        {round.category && round.category !== "RANDOM" && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute -top-5 -left-4 px-4 md:px-6 py-1 md:py-2 bg-[#E48F45] text-black text-sm md:text-xl uppercase tracking-widest font-bold shadow-[2px_2px_0px_white] md:shadow-[4px_4px_0px_white] border-2 border-white transform -rotate-3"
          >
            {round.category}
          </motion.div>
        )}

        {showQuestionText && (
          <div className="text-lg md:text-3xl lg:text-4xl text-white tracking-wider leading-relaxed font-cabana font-bold w-full text-center">
            <FoldText
              text={isHotSeat ? `${targetPlayer?.name || "THEY"} HAS PROVIDED 3 STATEMENTS. CAN YOU SPOT THE LIE?` : parsedQuestion}
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
        )}
      </motion.div>

      {/* Options for Answering */}
      {!isHotSeat && (
        <motion.div layout className="w-full flex flex-wrap justify-center gap-2 md:gap-3 lg:gap-4 mt-2 md:mt-4">
          <AnimatePresence>
            {showOptions && parsedOptions.map((opt, idx) => {
              const isSelected = selectedAnswer === opt;
              const opacityClass = (selectedAnswer && !isSelected) ? "opacity-30 grayscale" : "opacity-100";
              
              return (
                <motion.button
                  key={`ans-${idx}`}
                  initial={{ opacity: 0, y: 40, rotateX: 90 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: idx * 0.15, type: "spring", damping: 15 }}
                  onClick={() => {
                    if (!hasSubmitted && !selectedAnswer && !isHotSeat) {
                      setSelectedAnswer(opt);
                    }
                  }}
                  disabled={hasSubmitted || selectedAnswer !== null}
                  layout
                  className={`relative max-w-full px-3 py-2 md:px-5 md:py-3 border-2 md:border-4 text-xs sm:text-sm md:text-lg lg:text-xl font-bold tracking-widest text-left transition-all duration-300 overflow-hidden flex items-center break-words break-all whitespace-normal ${opacityClass} ${
                    isSelected 
                      ? "border-white bg-white text-black shadow-[2px_2px_0px_white] md:shadow-[6px_6px_0px_white] translate-x-[1px] translate-y-[1px] md:translate-x-[4px] md:translate-y-[4px]" 
                      : "border-white bg-[#0A0A0A] text-white shadow-[2px_2px_0px_white] md:shadow-[6px_6px_0px_white] hover:shadow-[1px_1px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] md:hover:translate-x-[4px] md:hover:translate-y-[4px]"
                  } ${hasSubmitted ? 'cursor-default' : ''}`}
                >
                  <span className="opacity-50 mr-2 shrink-0 text-white">{idx + 1}.</span>
                  <span className="font-cabana relative z-10">{opt}</span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Guessing Section */}
      <AnimatePresence>
        {showGuessingPhase && (
          <motion.div 
            ref={guessPhaseRef}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 40 }}
            className="w-full flex flex-col items-center gap-6"
          >
            {/* Divider with Tag */}
            <div className="w-full relative flex items-center justify-center border-t-2 border-white/20 border-dashed">
               <div className="absolute px-6 py-2 bg-[#4D4C7D] text-white text-lg font-bold tracking-widest uppercase rounded-none border-2 border-white shadow-[4px_4px_0px_white] flex items-center gap-2 transform rotate-1">
                 <span className="text-white/50">GUESS</span> {targetPlayer?.name}
               </div>
            </div>

            <div className="text-2xl md:text-3xl text-white mt-8 font-cabana font-bold max-w-full break-words break-all whitespace-normal px-2">
              {isHotSeat 
                ? <>Can you spot the lie among <span className="bg-[#FDE047] text-black px-2 py-0.5">{targetPlayer?.name}</span>'s stories?</> 
                : <>Can you guess which one <span className="bg-[#FDE047] text-black px-2 py-0.5">{targetPlayer?.name}</span> picked?</>}
            </div>

            {/* Options for Guessing */}
            <motion.div layout className="w-full flex flex-wrap justify-center gap-2 md:gap-3 lg:gap-4 mt-2 md:mt-4">
              {parsedOptions.map((opt, idx) => {
                const isSelected = selectedGuess === opt;
                
                return (
                  <motion.button
                    key={`guess-${idx}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1, type: "spring", damping: 15 }}
                    onClick={() => handleGuessSelect(opt)}
                    disabled={hasSubmitted}
                    layout
                    className={`relative max-w-full px-3 py-2 md:px-5 md:py-3 border-2 md:border-4 text-xs sm:text-sm md:text-lg lg:text-xl font-bold tracking-widest text-left transition-all duration-300 overflow-hidden flex items-center break-words break-all whitespace-normal ${
                      isSelected 
                        ? "border-[#00E5FF] bg-[#00E5FF] text-black shadow-[2px_2px_0px_white] md:shadow-[6px_6px_0px_white] translate-x-[1px] translate-y-[1px] md:translate-x-[4px] md:translate-y-[4px]" 
                        : "border-white bg-[#0A0A0A] text-white/70 shadow-[2px_2px_0px_white] md:shadow-[6px_6px_0px_white] hover:shadow-[1px_1px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] md:hover:translate-x-[4px] md:hover:translate-y-[4px] hover:text-white"
                    } ${hasSubmitted && !isSelected ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                  >
                    <span className="opacity-50 mr-2 shrink-0 text-white">{idx + 1}.</span>
                    <span className="font-cabana relative z-10">{opt}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting Status */}
      <AnimatePresence>
        {hasSubmitted && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             onAnimationComplete={(definition) => {
               if (definition.opacity === 1) {
                 setTimeout(() => {
                   window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                 }, 300);
               }
             }}
             className="mt-12 text-xl md:text-3xl text-[#87CEFA] animate-pulse tracking-widest uppercase font-bold drop-shadow-[0_0_10px_rgba(135,206,250,0.5)]"
           >
             {isHotSeat ? "WAITING FOR EVERYONE TO LOCK IN THEIR GUESSES..." : `WAITING FOR ${targetPlayer?.name.toUpperCase()}...`}
           </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};
