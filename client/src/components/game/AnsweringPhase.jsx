import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import socket from "@/lib/socket";
import FoldText from "@/components/FoldText";
import SplitText from "@/components/SplitText";

export const AnsweringPhase = ({ round, room, player }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowText(true), 400);
    return () => clearTimeout(t);
  }, []);

  // If the player already answered via state recovery or previously locked in
  const hasAnswered = isLocked || (round.answers && round.answers[player.id]);

  const handleLockIn = () => {
    if (!selectedOption) return;
    setIsLocked(true);
    socket.emit("submit-answer", {
      roomId: room.roomId,
      playerId: player.id,
      answer: selectedOption
    });
  };

  return (
    <motion.div layout transition={{ type: "spring", stiffness: 100, damping: 20 }} className="w-full h-full max-w-4xl mx-auto flex flex-col gap-6 md:gap-8 items-center text-center p-4 md:p-6">
      
      {/* Header Info */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-2"
      >
        <span className="px-3 md:px-4 py-1 bg-[#E48F45]/20 border border-[#E48F45] text-[#E48F45] text-sm md:text-xl uppercase tracking-widest font-bold shadow-[2px_2px_0px_rgba(228,143,69,0.5)]">
          {round.category}
        </span>
        <h2 className="text-lg md:text-2xl text-white/50 tracking-widest uppercase mt-2">
          ANSWER HONESTLY
        </h2>
      </motion.div>

      {/* Question Text */}
      <motion.div layout className="w-full min-h-[80px] md:min-h-[140px] bg-black/40 border-2 md:border-4 border-white/20 p-4 md:p-10 shadow-[4px_4px_0px_rgba(255,255,255,0.1)] md:shadow-[8px_8px_0px_rgba(255,255,255,0.1)] relative flex items-center justify-center max-w-full break-words break-all whitespace-normal">
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
            className="text-lg md:text-3xl lg:text-4xl text-white tracking-wider leading-relaxed"
          />
        )}
        {/* Decorative corner pieces */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#00E5FF] -mt-1 -ml-1"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#00E5FF] -mb-1 -mr-1"></div>
      </motion.div>

      {/* Options */}
      <motion.div layout className="w-full flex flex-wrap justify-center gap-2 md:gap-3 lg:gap-4 mt-2 md:mt-4">
        {showText && round.options?.map((opt, idx) => {
          const isSelected = selectedOption === opt;
          return (
            <motion.button
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + (idx * 0.1) }}
              onClick={() => !hasAnswered && setSelectedOption(opt)}
              disabled={hasAnswered}
              layout
              className={`relative max-w-full px-3 py-2 md:px-5 md:py-3 border-2 md:border-4 text-xs sm:text-sm md:text-lg lg:text-xl font-bold tracking-widest text-left transition-all overflow-hidden break-words break-all whitespace-normal flex items-center ${
                isSelected 
                  ? "border-[#00E5FF] bg-[#00E5FF]/20 text-white shadow-[2px_2px_0px_rgba(0,229,255,0.5)] md:shadow-[6px_6px_0px_rgba(0,229,255,0.5)] translate-x-[1px] translate-y-[1px] md:translate-x-[4px] md:translate-y-[4px]" 
                  : "border-white/20 bg-black/40 text-white/70 hover:border-white/50 hover:bg-white/5 hover:text-white"
              } ${hasAnswered && !isSelected ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <span className="opacity-50 mr-2 shrink-0 text-[#00E5FF]">{idx + 1}.</span>
              <SplitText
                text={opt}
                delay={20}
                duration={0.8}
                splitType="words"
                className="inline-block"
                tag="span"
              />
              
              {isSelected && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#00E5FF]">
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
          {selectedOption && !hasAnswered && (
            <motion.button
              key="lockin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleLockIn}
              className="px-8 md:px-12 py-3 md:py-6 bg-[#00E5FF] text-black border-2 md:border-4 border-[#00E5FF] text-xl md:text-3xl lg:text-4xl font-bold tracking-[0.2em] shadow-[4px_4px_0px_white] md:shadow-[8px_8px_0px_white] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] md:hover:translate-x-[8px] md:hover:translate-y-[8px] transition-all uppercase"
            >
              LOCK IN
            </motion.button>
          )}

          {hasAnswered && (
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
               className="text-xl md:text-2xl text-[#87CEFA] animate-pulse tracking-widest uppercase font-bold text-center"
             >
               WAITING FOR OTHERS...
             </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
};
