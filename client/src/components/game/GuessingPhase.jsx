import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import socket from "@/lib/socket";
import FoldText from "@/components/FoldText";
import SplitText from "@/components/SplitText";

export const GuessingPhase = ({ round, room, player }) => {
  const [selectedGuess, setSelectedGuess] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowText(true), 400);
    return () => clearTimeout(t);
  }, []);

  // For 2 players, the target is simply the other player
  const targetPlayer = room.players.find(p => p.id !== player.id);
  const isHotSeat = round.category === "THE HOT SEAT";
  const isSpotlight = isHotSeat && round.spotlightPlayerId === player.id;

  const hasGuessed = isLocked || (round.guesses && round.guesses[player.id]);

  const handleLockIn = () => {
    if (!selectedGuess || !targetPlayer) return;
    setIsLocked(true);
    socket.emit("submit-guess", {
      roomId: room.roomId,
      playerId: player.id,
      targetPlayerId: isHotSeat ? round.spotlightPlayerId : targetPlayer.id,
      guess: selectedGuess
    });
  };

  if (isSpotlight) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
        <motion.h1 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold text-[#FF99CC] tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,153,204,0.5)]"
        >
          YOU ARE IN THE HOT SEAT!
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-3xl text-white/70 mt-8"
        >
          The other player is trying to guess your lie right now...
        </motion.p>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
          className="mt-12"
        >
           <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} 
              className="w-48 h-48 mx-auto border-4 border-rose-500 bg-black shadow-[8px_8px_0px_rgba(244,63,94,0.5)] animate-bounce"
              alt="You"
           />
        </motion.div>
      </div>
    );
  }

  // The text to show
  const headerText = isHotSeat 
     ? `GUESS THE LIE FOR ${targetPlayer?.name}`
     : `WHAT DID ${targetPlayer?.name} CHOOSE?`;

  return (
    <motion.div layout transition={{ type: "spring", stiffness: 100, damping: 20 }} className="w-full h-full max-w-4xl mx-auto flex flex-col gap-6 md:gap-8 items-center text-center p-4 md:p-6">
      
      {/* Target Info */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-4"
      >
         <div className="relative">
             <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${targetPlayer?.name}`} 
                className="w-32 h-32 border-4 border-[#00E5FF] bg-black shadow-[4px_4px_0px_rgba(0,229,255,0.5)]"
                alt="Target"
             />
             <div className="absolute -bottom-4 -right-4 text-4xl">🤔</div>
         </div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#87CEFA] tracking-widest uppercase mt-4">
          {headerText}
        </h2>
      </motion.div>

      {/* Question Text */}
      <motion.div layout className="w-full min-h-[80px] md:min-h-[140px] bg-black/40 border-2 md:border-4 border-white/20 p-4 md:p-8 shadow-[4px_4px_0px_rgba(255,255,255,0.1)] md:shadow-[8px_8px_0px_rgba(255,255,255,0.1)] relative mt-2 md:mt-4 flex items-center justify-center max-w-full break-words break-all whitespace-normal">
        {showText && (
          <FoldText
            text={round.question}
            splitBy="word"
            hinge="top"
            trigger="mount"
            duration={0.8}
            stagger={0.06}
            ease="power3.out"
            fontSize="inherit"
            fontWeight={800}
            className="text-lg md:text-3xl lg:text-4xl font-bold text-white tracking-wider leading-relaxed"
          />
        )}
      </motion.div>

      {/* Options */}
      <motion.div layout className="w-full flex flex-wrap justify-center gap-2 md:gap-3 lg:gap-4 mt-2 md:mt-4">
        {showText && round.options?.map((opt, idx) => {
          const isSelected = selectedGuess === opt;
          return (
            <motion.button
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + (idx * 0.1) }}
              onClick={() => !hasGuessed && setSelectedGuess(opt)}
              disabled={hasGuessed}
              layout
              className={`relative max-w-full px-3 py-2 md:px-5 md:py-3 border-2 md:border-4 text-xs sm:text-sm md:text-lg lg:text-xl font-bold tracking-widest text-left transition-all overflow-hidden break-words break-all whitespace-normal flex items-center ${
                isSelected 
                  ? "border-rose-500 bg-rose-500/20 text-white shadow-[2px_2px_0px_rgba(244,63,94,0.5)] md:shadow-[6px_6px_0px_rgba(244,63,94,0.5)] translate-x-[1px] translate-y-[1px] md:translate-x-[4px] md:translate-y-[4px]" 
                  : "border-white/20 bg-black/40 text-white/70 hover:border-white/50 hover:bg-white/5 hover:text-white"
              } ${hasGuessed && !isSelected ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <span className="opacity-50 mr-2 shrink-0 text-rose-500">{idx + 1}.</span>
              <SplitText
                text={opt}
                delay={20}
                duration={0.8}
                splitType="words"
                className="inline-block"
                tag="span"
              />
              
              {isSelected && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-rose-500">
                  <Check size={32} strokeWidth={4} />
                </div>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Lock In Button & Status */}
      <div className="h-[100px] mt-4 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {selectedGuess && !hasGuessed && (
            <motion.button
              key="submit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleLockIn}
              className="px-6 md:px-12 py-3 md:py-6 bg-rose-500 text-white border-2 md:border-4 border-rose-500 text-xl md:text-3xl lg:text-4xl font-bold tracking-[0.2em] shadow-[4px_4px_0px_white] md:shadow-[8px_8px_0px_white] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] md:hover:translate-x-[8px] md:hover:translate-y-[8px] transition-all uppercase"
            >
              SUBMIT GUESS
            </motion.button>
          )}

          {hasGuessed && (
             <motion.div 
               key="waiting"
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               onAnimationComplete={(definition) => {
                 if (definition.opacity === 1) {
                   setTimeout(() => {
                     window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                   }, 300);
                 }
               }}
               className="text-xl md:text-2xl text-rose-400 animate-pulse tracking-widest uppercase font-bold text-center"
             >
               WAITING FOR RESULTS...
             </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
};
