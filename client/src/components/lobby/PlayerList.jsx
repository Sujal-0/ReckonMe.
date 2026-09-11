import { useState } from "react";
import { Crown, Gamepad, Dices, ChevronDown, ChevronUp } from "lucide-react";
import Lottie from "lottie-react";
import loadingAnimation from "@/assets/Lotties/Loading.json";
import { Highlighter } from "@/components/magicui/highlighter";
import { motion, AnimatePresence } from "framer-motion";

export const PlayerList = ({ players, currentPlayer, onShuffleAvatar, onKickPlayer }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="px-4 py-6 sketchy-shape bg-transparent font-bold text-white border-4 border-white transition-all shadow-[4px_4px_0px_white]">
      <div 
        className="flex justify-between items-center mb-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-3xl font-semibold text-center text-white/40 font-['IndieSellout'] tracking-widest w-full uppercase">
          Players [{players.length}/2]
        </h2>
        <div className="text-white/40 hover:text-white transition-colors">
          {isExpanded ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 mt-4">
              {players.map((p) => {
                const isMe = p.id === currentPlayer.id;
                // Use avatarSeed if it exists, fallback to name or ID
                const seed = p.avatarSeed || p.name || p.id;
                const avatarUrl = `https://api.dicebear.com/7.x/croodles/svg?seed=${seed}&backgroundColor=transparent`;

                return (
                  <div
                    key={p.id}
                    className={`p-4 pt-8 sketchy-shape border-4 transition-all flex items-center justify-between bg-transparent relative ${
                      isMe ? "border-cyan-400 shadow-[4px_4px_0px_cyan]" : "border-white/20 shadow-[4px_4px_0px_rgba(255,255,255,0.2)]"
                    }`}
                  >
                    {/* Role badge at top-left */}
                    <div className="absolute top-2 left-4 text-[10px] font-bold text-white/50 tracking-widest font-cabana flex items-center gap-1 uppercase">
                      {p.isHost ? (
                        <>
                          <Crown size={14} className="text-yellow-500 font-cabana" /> HOST
                        </>
                      ) : (
                        <>
                          <Gamepad size={14} className="text-white/40 font-cabana" /> PLAYER
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 mr-2">
                      <div className="relative group shrink-0">
                        <div className="w-16 h-16 flex items-center justify-center">
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-contain" />
                        </div>
                        {isMe && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onShuffleAvatar(); }}
                            title="Randomize Avatar"
                            className="absolute -bottom-2 -right-2 p-1.5 bg-[#4D4C7D] text-white rounded-full shadow-[2px_2px_0px_black] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                          >
                            <Dices size={16} />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`text-[18px] md:text-xl font-['IndieSellout'] uppercase tracking-widest truncate block ${isMe ? "text-white" : "text-white/80"}`}>
                          {p.name || "Set Name..."} {isMe && "[You]"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentPlayer.isHost && !isMe && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onKickPlayer(p.id); }}
                          className="px-3 py-1 bg-transparent border-2 border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white transition-all font-['IndieSellout'] tracking-widest text-sm shadow-[2px_2px_0px_#e11d48] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                          title="Kick Player"
                        >
                          [KICK]
                        </button>
                      )}
                      <div className="flex items-center justify-center w-12 h-12 shrink-0">
                        {p.ready ? (
                          <div className="w-10 h-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                            <img src="/check.png" alt="Ready" className="w-full h-full object-contain filter brightness-0 invert" onError={(e) => { e.target.style.display = 'none'; }} />
                          </div>
                        ) : (
                          <div className="w-12 h-12 opacity-70 flex items-center justify-center transform scale-[2.0]" title="Not ready">
                            <Lottie animationData={loadingAnimation} loop={true} autoplay={true} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty slot */}
              {players.length < 2 && (
                <div className="flex flex-col items-center justify-center p-6 bg-transparent sketchy-shape border-4 border-white/20 text-white/40 shadow-[4px_4px_0px_rgba(255,255,255,0.1)]">
                  <span className="text-xl tracking-widest duration-300 animate-pulse text-center">
                    Waiting for another player...
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
