import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useRoomStore from "@/store/roomStore";
import { PreGameInput } from "@/components/game/PreGameInput";
import { CategoryReveal } from "@/components/game/CategoryReveal";
import { InputPhase } from "@/components/game/InputPhase";
import { RevealingPhase } from "@/components/game/RevealingPhase";
import { SmartChat } from "@/components/lobby/SmartChat";
import { ReckonLoader } from "@/components/ui/ReckonLoader";
import socket from "@/lib/socket";

const Game = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { room, player } = useRoomStore();
  const [isSubmittingPreGame, setIsSubmittingPreGame] = useState(false);
  const [waitingForOthers, setWaitingForOthers] = useState(
    () => room?.preGameInputs?.some((p) => p.playerId === player?.id) || false
  );
  const [phaseTimer, setPhaseTimer] = useState(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState(
    room?.messages ? room.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp).toLocaleTimeString() })) : []
  );
  const [openPanels, setOpenPanels] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const handleScroll = (e) => {
    setIsScrolled(e.target.scrollTop > 20);
  };
  useEffect(() => {
    const handlePhaseTimer = (data) => setPhaseTimer(data);
    const handleReceiveMessage = (msg) => {
      setChatMessages((prev) => [...prev, { ...msg, timestamp: new Date(msg.timestamp).toLocaleTimeString() }]);
    };
    const handlePlayerDisconnected = (data) => {
      toast.error(`Opponent disconnected! Waiting for them to return...`);
    };
    
    socket.on("phase-timer", handlePhaseTimer);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("player-disconnected", handlePlayerDisconnected);
    
    return () => {
      socket.off("phase-timer", handlePhaseTimer);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("player-disconnected", handlePlayerDisconnected);
    };
  }, []);

  useEffect(() => {
    if (!room || !player) {
      navigate("/");
      return;
    }
    
    if (room.status === "lobby") {
      navigate(`/lobby/${code}`);
    }
  }, [room, player, code, navigate]);

  useEffect(() => {
    if (room?.gameState?.phase === "finished") {
      const timer = setTimeout(() => {
        navigate(`/results/${code}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [room?.gameState?.phase, navigate, code]);

  const handlePreGameSubmit = (statements) => {
    setIsSubmittingPreGame(true);
    socket.emit("submit-pregame-input", {
      roomId: room.roomId,
      playerId: player.id,
      input: statements
    });
    setWaitingForOthers(true);
  };

  const handleSendMessage = (text) => {
    socket.emit("send-message", {
      roomId: room.roomId,
      playerId: player.id,
      message: text,
    });
  };

  const confirmLeaveRoom = () => {
    setShowLeaveModal(false);
    socket.emit("leave-room", { roomId: room.roomId, playerId: player.id });
    navigate("/");
  };

  const togglePanel = (panelName) => {
    setOpenPanels((prev) =>
      prev.includes(panelName) ? prev.filter((p) => p !== panelName) : [...prev, panelName]
    );
  };

  // Safe check
  if (!room || !player) return null;

  if (room.status === "pre-game") {
    if (waitingForOthers) {
      return (
        <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 text-white font-['IndieSellout']">
          <ReckonLoader text="WAITING FOR OTHERS TO LOCK IN..." />
        </div>
      );
    }
    return <PreGameInput onSubmit={handlePreGameSubmit} isSubmitting={isSubmittingPreGame} phaseTimer={phaseTimer} />;
  }

  // Get current round data
  const phase = room.gameState?.phase;
  const currentRoundIdx = room.gameState?.currentQuestion || 0;
  const currentRound = room.rounds?.[currentRoundIdx];

  const renderGamePhase = () => {
    let content;
    if (!currentRound) content = <ReckonLoader text="PREPARING ROUND..." />;
    else {
      switch (phase) {
        case "category-reveal":
          content = <CategoryReveal key={`category-reveal-${currentRoundIdx}`} round={currentRound} room={room} />;
          break;
        case "input":
          content = <InputPhase key={`input-${currentRoundIdx}`} round={currentRound} room={room} player={player} />;
          break;
        case "revealing":
          content = <RevealingPhase key={`revealing-${currentRoundIdx}`} round={currentRound} room={room} player={player} />;
          break;
        case "finished":
          content = (
            <div className="text-center">
              <h1 className="text-7xl text-[#00E5FF] font-bold tracking-widest drop-shadow-[0_0_15px_rgba(0,229,255,0.8)]">
                 GAME OVER!
              </h1>
              <p className="mt-4 text-2xl text-white/50 tracking-widest">
                 Calculating Final Results...
              </p>
            </div>
          );
          break;
        default:
          content = <ReckonLoader key="syncing" text="SYNCING..." />;
          break;
      }
    }

    return (
      <motion.div
        key={`${phase}-${currentRoundIdx}`}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full flex justify-center"
      >
        {content}
      </motion.div>
    );
  };

  const renderLeaderboardContent = () => (
    <div className="flex flex-col gap-6 hand-drawn-border p-6 bg-black/40 backdrop-blur-sm">
      <h2 className="text-3xl font-bold tracking-widest text-[#E48F45] uppercase mb-2 text-center">
        LEADERBOARD
      </h2>
      
      {[...room.players].sort((a, b) => b.score - a.score).map((p, idx) => (
          <div key={p.id} className="flex flex-col items-start gap-1 w-full">
            <div className={`flex items-center gap-4 px-4 py-2 w-full ${p.id === player.id ? 'hand-drawn-border-active' : 'border-4 border-transparent'}`}>
                {/* Real avatar, no background/border, wobble animation */}
                <img 
                  src={`https://api.dicebear.com/7.x/croodles/svg?seed=${p.avatarSeed || p.name}&backgroundColor=transparent`} 
                  className="w-16 h-16 object-contain wobble-hor-bottom"
                  style={{ animationDelay: `${idx * 1.5}s` }}
                />
                <div className="flex flex-col">
                  <div className="text-xl font-bold tracking-wider">{p.name} {p.id === player.id && <span className="text-[#E48F45]">[YOU]</span>}</div>
                  <div className="text-4xl font-bold text-white/60 tracking-tighter font-black drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                    {p.score || 0}
                  </div>
                </div>
            </div>
          </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent flex text-white font-['IndieSellout'] overflow-hidden relative">
      
      {/* Absolute Left Floating Leaderboard */}
      <AnimatePresence>
        {phase !== "finished" && (
          <motion.div 
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100, transition: { duration: 0.5 } }}
            className="hidden lg:flex absolute top-12 left-12 z-20 flex-col max-w-xs pointer-events-none"
          >
             <div className="pointer-events-auto">
               {renderLeaderboardContent()}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Leaderboard Button */}
      {phase !== "finished" && (
        <div className="lg:hidden fixed top-8 left-0 z-30">
          <button 
            onClick={() => setShowMobileLeaderboard(true)}
            className="p-2 md:p-3 bg-black/80 border-2 border-l-0 border-white shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all rounded-none"
          >
            <img 
              src="/ranking-podium.png" 
              alt="Leaderboard" 
              className="w-8 h-8 md:w-10 md:h-10 object-contain wobble-hor-bottom drop-shadow-[0_0_2px_white]" 
              style={{ animationIterationCount: 'infinite' }}
            />
          </button>
        </div>
      )}

      {/* Mobile Leaderboard Panel */}
      <AnimatePresence>
        {showMobileLeaderboard && phase !== "finished" && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileLeaderboard(false)}
              className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="lg:hidden fixed top-20 left-4 right-4 z-40 max-h-[80vh] overflow-y-auto overflow-x-hidden"
            >
              <div className="relative">
                 <button onClick={() => setShowMobileLeaderboard(false)} className="absolute top-2 right-2 text-white/50 hover:text-white z-50 p-2 font-bold font-['IndieSellout'] text-2xl">
                   X
                 </button>
                 {renderLeaderboardContent()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      {/* Fixed Phase Header UI */}
      {phase && phase !== "category-reveal" && phase !== "finished" && (
         <div className="absolute top-0 left-0 w-full z-50 pointer-events-none flex justify-between pl-16 pr-4 md:pl-24 lg:pl-[450px] lg:pr-12 pt-4 lg:pt-12 items-start h-[100px] lg:h-[140px]">
           {/* Round UI (Left) */}
           <div className={`pointer-events-none origin-top-left transition-all duration-300 ${isScrolled ? 'scale-[0.65] md:scale-75 lg:scale-75' : 'scale-[0.8] md:scale-100 lg:scale-100'}`}>
             <div className={`pointer-events-auto bg-black/60 backdrop-blur-md border-2 border-white shadow-[4px_4px_0px_white] rounded-none transition-all duration-300 ${isScrolled ? 'px-3 py-1.5' : 'px-6 py-3'}`}>
               <div className={`text-[#87CEFA] tracking-widest font-bold uppercase whitespace-nowrap transition-all duration-300 ${isScrolled ? 'text-xl' : 'text-2xl'}`}>
                 {!isScrolled && "ROUND "}{currentRound?.roundNumber} <span className="text-white/30">{isScrolled ? '/' : ' / '} {room.rounds?.length}</span>
               </div>
             </div>
           </div>

           {/* Timer UI (Right) */}
           {phaseTimer && (
             <div className="pointer-events-none flex flex-col items-end gap-1 lg:gap-2">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center font-bold font-['IndieSellout'] text-3xl lg:text-5xl h-10 lg:h-14 overflow-hidden relative min-w-[60px] lg:min-w-[80px] justify-center tabular-nums pointer-events-auto ${phaseTimer.timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-rose-400'}`}>
                    {phaseTimer.timeLeft.toString().split('').map((digit, i) => (
                      <div key={`${phaseTimer.timeLeft.toString().length}-${i}`} className="relative inline-flex justify-center">
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={digit}
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: "0%", opacity: 1 }}
                            exit={{ y: "-100%", opacity: 0 }}
                            transition={{ duration: 0.4, ease: "backOut" }}
                            className="inline-block"
                          >
                            {digit}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    ))}
                    <span className="inline-block ml-1">s</span>
                  </div>
                  
                  {/* Show close button here when scrolled */}
                  <AnimatePresence>
                    {isScrolled && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.5, width: 0 }}
                        animate={{ opacity: 1, scale: 1, width: "auto" }}
                        exit={{ opacity: 0, scale: 0.5, width: 0 }}
                        onClick={() => setShowLeaveModal(true)}
                        className="pointer-events-auto font-bold text-white/50 hover:text-rose-500 transition-colors bg-black/40 p-1.5 md:p-2 border-2 border-white/20 hover:border-white/50 flex items-center justify-center h-8 w-8 lg:h-10 lg:w-10 overflow-hidden shrink-0"
                      >
                        <img src="/close.png" alt="Leave" className="w-full h-full opacity-80 hover:opacity-100 object-contain invert" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

               <motion.div 
                 initial={false}
                 animate={{ opacity: isScrolled ? 0 : 1, height: isScrolled ? 0 : 'auto', marginTop: isScrolled ? 0 : undefined, scale: isScrolled ? 0.8 : 1 }}
                 className="pointer-events-auto px-2 lg:px-4 py-1 bg-[#4D4C7D] border-2 border-white text-white shadow-[2px_2px_0px_black] text-[10px] lg:text-sm uppercase font-bold tracking-widest font-['IndieSellout'] mt-1 lg:mt-2 whitespace-nowrap origin-top-right overflow-hidden"
               >
                  {phase === 'input' ? 'TIME TO LOCK IN' : 'REVEALING...'}
               </motion.div>
               
               {/* Show full Leave Game button below when NOT scrolled */}
               <AnimatePresence>
                 {!isScrolled && (
                   <motion.button
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     onClick={() => setShowLeaveModal(true)}
                     className="pointer-events-auto mt-1 lg:mt-2 text-xs lg:text-sm font-bold text-white/50 hover:text-rose-500 transition-colors uppercase font-['IndieSellout'] tracking-widest whitespace-nowrap bg-black/40 px-2 py-1 overflow-hidden shrink-0"
                   >
                     Leave Game
                   </motion.button>
                 )}
               </AnimatePresence>
             </div>
           )}
         </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative w-full h-screen overflow-hidden z-0">
          
          {/* Scrollable Container (Starts Below Header) */}
          <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto w-full px-4 pt-[100px] lg:pt-[100px] pb-20 lg:pl-[350px]" onScroll={handleScroll}>
             <AnimatePresence mode="wait">
               {renderGamePhase()}
             </AnimatePresence>
          </div>
      </div>
      
      {/* Floating Chat */}
      <div className="z-40">
        <SmartChat 
        messages={chatMessages} 
        onSendMessage={(msg) => socket.emit("send-message", { roomId: room.roomId, playerId: player.id, message: msg, type: "chat" })} 
        isOpen={openPanels.includes("chat")}
        onToggle={() => setOpenPanels(prev => prev.includes("chat") ? [] : ["chat"])}
        positionClass="right-0 lg:right-[90px]"
        player={player}
        onApproveAccess={() => {}}
        room={room}
        mobileFloating={true}
        isAnyPanelOpen={openPanels.length > 0}
      /></div>

      {/* Leave Room Modal */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLeaveModal(false)}
            className="fixed inset-0 z-[100] grid p-8 cursor-pointer bg-slate-900/40 backdrop-blur place-items-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: "12.5deg" }}
              animate={{ scale: 1, rotate: "0deg" }}
              exit={{ scale: 0, rotate: "0deg" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm p-8 overflow-hidden text-white shadow-xl cursor-default bg-[#0A0A0A] cartoon-dashed-border-red rounded-2xl"
            >
              <div className="relative z-10 space-y-6 text-center">
                <h3 className="text-4xl font-bold font-['IndieSellout'] text-rose-500">Leaving?</h3>
                <p className="text-xl font-['IndieSellout'] text-white/70">Are you sure you want to forfeit? The game will instantly end and your opponent will win!</p>
                <div className="flex justify-center gap-4 pt-4">
                  <button
                    onClick={() => setShowLeaveModal(false)}
                    className="px-6 py-2 bg-transparent border-2 border-white text-white rounded-lg font-bold font-['IndieSellout'] shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  >
                    Stay
                  </button>
                  <button
                    onClick={confirmLeaveRoom}
                    className="px-6 py-2 bg-rose-600 text-white rounded-lg font-bold font-['IndieSellout'] shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  >
                    Forfeit
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Game;
