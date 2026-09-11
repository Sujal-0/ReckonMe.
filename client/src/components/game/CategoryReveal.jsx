import { motion } from "framer-motion";

export const CategoryReveal = ({ round, room }) => {
  const isHotSeat = round?.category === "THE HOT SEAT";
  const spotlightPlayerName = isHotSeat && room ? room.players.find(p => p.id === round?.spotlightPlayerId)?.name : null;

  const dropVariants = {
    hidden: { y: "-100vh", opacity: 0, scale: 0.5 },
    visible: { 
      y: 0, 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "spring", 
        damping: 10, 
        stiffness: 100, 
        duration: 0.8 
      }
    },
    exit: { 
      y: "100vh", 
      opacity: 0, 
      scale: 0.8,
      rotate: 15,
      transition: { 
        duration: 0.6,
        ease: "backIn" 
      }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={dropVariants}
      className="fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center font-['IndieSellout']"
    >
        <h2 className="text-3xl text-white/50 tracking-[0.5em] mb-4 uppercase">
          ROUND {round?.roundNumber || 1}
        </h2>
        
        <h2 className={`text-4xl md:text-6xl lg:text-8xl font-black uppercase tracking-[0.15em] mb-4 
          ${isHotSeat ? "text-[#FF99CC] drop-shadow-[0_0_20px_rgba(255,153,204,0.8)]" : "text-[#00E5FF] drop-shadow-[0_0_20px_rgba(0,229,255,0.8)]"}
        `}>
          {round?.category || "RANDOM"}
        </h2>

        {isHotSeat && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 px-6 py-2 bg-[#00E5FF]/20 border-2 border-[#00E5FF] text-[#00E5FF] text-3xl inline-block shadow-[4px_4px_0px_rgba(0,229,255,0.5)] uppercase tracking-widest font-cabana"
          >
            {spotlightPlayerName}'S TURN!
          </motion.div>
        )}
        {!isHotSeat && round?.heatLevel > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 px-6 py-2 bg-[#E48F45]/20 border-2 border-[#E48F45] text-[#E48F45] text-3xl inline-block shadow-[4px_4px_0px_rgba(228,143,69,0.5)] uppercase tracking-widest"
          >
            HEAT LEVEL: {round.heatLevel}
          </motion.div>
        )}

      {/* Cinematic Glitch/Noise Overlay */}
      <motion.div 
        animate={{ opacity: [0.03, 0.08, 0.03] }}
        transition={{ repeat: Infinity, duration: 0.2 }}
        className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay"
      />
    </motion.div>
  );
};
