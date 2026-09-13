import { useEffect, useState } from "react";
import { Highlighter } from "@/components/magicui/highlighter";
import { RoomShareCopyBtn } from "@/components/ui/RoomShareCopyBtn";
import { Settings, CheckCircle2, Circle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CustomQuestionsForm } from "./CustomQuestionsForm";
import { useAppStore } from "@/store";
import socket from "@/lib/socket";
import { apiClient } from "@/lib/api-client";

export const RoomInvite = () => (
  <div className="p-6 text-center bg-black/40 relative mt-4 border-4 border-white/20 sketchy-shape shadow-[4px_4px_0px_rgba(255,255,255,0.1)]">
    <div className="absolute -top-5 -left-2 transform -rotate-6">
      <Highlighter action="highlight" color="#E48F45">
        <span className="text-2xl text-[#0A0A0A] font-bold px-2 font-['IndieSellout']">#1</span>
      </Highlighter>
    </div>
    <h3 className="mb-2 text-3xl font-bold text-white/80 font-['IndieSellout'] uppercase">Room Invite</h3>
    <RoomShareCopyBtn />
  </div>
);

export const ChangeNameUI = ({
  hasName,
  isEditingName,
  playerName,
  setPlayerName,
  handleNameSubmit,
  setIsEditingName,
  isSubmittingName,
  nameError,
}) => (
  <div className="space-y-4">
    <AnimatePresence>
      {(!hasName || isEditingName) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="p-6 border-4 border-white/20 sketchy-shape bg-black/40 relative mt-4 shadow-[4px_4px_0px_rgba(255,255,255,0.1)]">
            <div className="absolute -top-5 -left-2 transform rotate-6">
              <Highlighter action="highlight" color="#00E5FF">
                <span className="text-2xl text-[#0A0A0A] font-bold px-2 font-['IndieSellout']">#2</span>
              </Highlighter>
            </div>
            <h2 className="mb-4 text-2xl font-semibold text-center text-white/80 font-['IndieSellout'] uppercase">
              {hasName ? "Change Your Name" : "Set Your Name"}
            </h2>
            <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                placeholder="Enter your name..."
                maxLength={12}
                className="flex-1 px-4 py-2 rounded-none bg-transparent text-2xl font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-colors uppercase font-['IndieSellout'] tracking-widest"
                disabled={isSubmittingName}
              />
              {nameError && <p className="text-sm text-center text-red-400 font-cabana tracking-widest">{nameError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!playerName.trim() || isSubmittingName}
                  className="flex-1 px-4 py-2 rounded-none bg-transparent uppercase text-xl font-bold text-white focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-['IndieSellout']"
                >
                  {isSubmittingName ? "Setting..." : "Set Name"}
                </button>
                {hasName && (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    disabled={isSubmittingName}
                    className="flex-1 px-4 py-2 font-medium bg-[#0A0A0A] text-[#ffffff] text-xl transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50 uppercase"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {hasName && !isEditingName && (
      <div className="flex items-center justify-between p-4 border-4 border-white/20 sketchy-shape bg-black/40 mt-4 shadow-[4px_4px_0px_rgba(255,255,255,0.1)]">
        <span className="text-white font-['IndieSellout'] text-xl uppercase tracking-widest">Player: {playerName}</span>
        <button 
          onClick={() => setIsEditingName(true)}
          className="px-4 py-2 font-bold bg-[#87CEFA] text-[#0A0A0A] text-sm uppercase rounded-none shadow-[2px_2px_0px_white] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-['IndieSellout'] tracking-widest"
        >
          Edit
        </button>
      </div>
    )}
  </div>
);

export const GameSetup = ({
  player,
  hasName,
  isEditingName,
  playerName,
  setPlayerName,
  handleNameSubmit,
  setIsEditingName,
  isSubmittingName,
  nameError,
  currentPlayerData,
  handleReadyToggle,
  canStartGame,
  handleStartGame,
  room,
  isOpen,
  onToggle,
  positionClass,
  onRequestAccess,
  isAnyPanelOpen,
}) => {
  const [showQuestionModal, setShowQuestionModal] = useState(() => {
    try {
      if (room?.roomId) {
        const saved = sessionStorage.getItem(`cq_modal_${room.roomId}`);
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  });
  
  useEffect(() => {
    if (room?.roomId) {
      sessionStorage.setItem(`cq_modal_${room.roomId}`, JSON.stringify(showQuestionModal));
    }
  }, [showQuestionModal, room?.roomId]);

  const [questionMode, setQuestionMode] = useState(room?.settings?.questionMode || "random");
  const [customBank, setCustomBank] = useState(room?.settings?.customQuestions || []);
  const [categories, setCategories] = useState(room?.settings?.categories || []);
  const [localSharedAccess, setLocalSharedAccess] = useState(room?.settings?.sharedSettingsAccess || false);
  const [includeHotSeat, setIncludeHotSeat] = useState(room?.settings?.includeHotSeat || false);
  const [questionsPerGame, setQuestionsPerGame] = useState(room?.settings?.questionsPerGame || 5);
  const [timePerQuestion, setTimePerQuestion] = useState(room?.settings?.timePerQuestion || 120);
  
  const { userInfo } = useAppStore();
  const [availableCategories, setAvailableCategories] = useState(["RANDOM"]);
  const ROUND_OPTIONS = [5, 8, 10, 12, 15];
  const TIME_OPTIONS = [60, 90, 120];
  const canEdit = player?.isHost || room?.settings?.sharedSettingsAccess;

  useEffect(() => {
    setLocalSharedAccess(room?.settings?.sharedSettingsAccess || false);
    setQuestionMode(room?.settings?.questionMode || "random");
    setCategories(room?.settings?.categories || []);
    setIncludeHotSeat(room?.settings?.includeHotSeat || false);
    setQuestionsPerGame(room?.settings?.questionsPerGame || 5);
    setTimePerQuestion(room?.settings?.timePerQuestion || 120);
    setCustomBank(room?.settings?.customQuestions || []);
  }, [room?.settings]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await apiClient.get('/api/rooms/categories');
        if (data.categories && data.categories.length > 0) {
          setAvailableCategories(data.categories);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const updateServerSettings = (newSettings) => {
    if (!canEdit) return;
    socket.emit("update-room-settings", {
      roomId: room.roomId,
      playerId: player.id,
      settings: newSettings
    });
  };

  const handleSaveQuestions = (questions) => {
    setCustomBank(questions);
    setShowQuestionModal(false);
    updateServerSettings({ customQuestions: questions });
  };

  const handleModeChange = (mode) => {
    if (!canEdit) return;
    setQuestionMode(mode);
    updateServerSettings({ questionMode: mode });
  };

  const handleToggleCategory = (cat) => {
    if (!canEdit) return;
    const newCats = categories.includes(cat) ? categories.filter(c => c !== cat) : [...categories, cat];
    setCategories(newCats);
    updateServerSettings({ categories: newCats });
  };

  const handleToggleSharedAccess = () => {
    if (!player?.isHost) return;
    const newAccess = !localSharedAccess;
    setLocalSharedAccess(newAccess);
    socket.emit("update-room-settings", {
      roomId: room.roomId,
      playerId: player.id,
      settings: { sharedSettingsAccess: newAccess }
    });
  };

  const handleToggleHotSeat = () => {
    if (!canEdit) return;
    const newSetting = !includeHotSeat;
    setIncludeHotSeat(newSetting);
    updateServerSettings({ includeHotSeat: newSetting });
  };

  const handleRoundsChange = (amount) => {
    if (!canEdit) return;
    setQuestionsPerGame(amount);
    updateServerSettings({ questionsPerGame: amount });
  };

  const handleTimeChange = (amount) => {
    if (!canEdit) return;
    setTimePerQuestion(amount);
    updateServerSettings({ timePerQuestion: amount });
  };

  return (
    <>
      <div className="z-40">
          {!isOpen && (
            <motion.button
              initial={false}
              animate={{ right: isAnyPanelOpen ? 432 : 32 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggle}
              className="hidden md:flex fixed bottom-[80px] z-50 p-2 bg-white border-2 border-[#0A0A0A] rounded-none transition-all shadow-[4px_4px_0px_white] hover:-translate-x-[4px] hover:-translate-y-[4px] hover:shadow-none"
            >
              <img src="/configuration.png" alt="Settings" className="w-8 h-8 object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
              <Settings className="hidden w-8 h-8 text-black" />
            </motion.button>
          )}
          
          <AnimatePresence>
            {isOpen && (
              <>
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-[#0A0A0A] border-l-4 border-white/20 sketchy-shape shadow-[-8px_0px_0px_rgba(255,255,255,0.1)] flex flex-col z-50 overflow-hidden"
                >
                <div className="flex items-center justify-between p-4 border-b-4 border-white/20 sketchy-shape bg-[#0A0A0A] z-10 sticky top-0">
                  <div className="flex items-center gap-2">
                    <Settings className="text-[#87CEFA]" />
                    <h3 className="text-2xl font-bold text-white font-['IndieSellout'] tracking-widest uppercase">
                      Game Settings
                    </h3>
                  </div>
                  <button
                    onClick={onToggle}
                    className="p-1 text-white/50 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 pb-24 flex-1 overflow-y-auto">
                  {!canEdit && (
                    <div className="mb-4 flex items-center justify-between bg-white/5 border border-white/20 p-3 rounded-lg sketchy-shape">
                      <p className="text-[#E48F45] font-bold text-xs font-cabana tracking-widest uppercase">Only Host can change settings</p>
                      <button 
                        onClick={onRequestAccess}
                        className="px-3 py-1 font-bold bg-[#E48F45] text-black text-xs font-cabana tracking-widest rounded shadow-[2px_2px_0px_white] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                      >
                        Request Access
                      </button>
                    </div>
                  )}

                  <div className={`space-y-6 ${!canEdit ? 'opacity-50 pointer-events-none' : ''}`}>
                    
                    {/* Shared Settings Access */}
                    {player?.isHost && (
                      <div className="pb-6 border-b-4 border-white/20 border-dotted">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold font-cabana uppercase text-2xl tracking-widest">Shared Settings Access</span>
                          <button
                            onClick={handleToggleSharedAccess}
                            className={`w-14 h-8 rounded-full transition-all relative ${
                              localSharedAccess ? "bg-[#00E5FF]" : "bg-white/20"
                            }`}
                          >
                            <motion.div
                              layout
                              className="w-6 h-6 bg-white rounded-full absolute top-1 shadow-md"
                              animate={{ left: localSharedAccess ? "30px" : "4px" }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                        <p className="text-white/50 text-[10px] mt-2 font-cabana tracking-widest uppercase">Allow the other player to edit game settings.</p>
                      </div>
                    )}

                    {/* Rounds Selection */}
                    <div>
                       <h4 className="text-white font-bold font-['IndieSellout'] mb-3 tracking-widest uppercase">Questions Per Game</h4>
                       <div className="flex flex-wrap gap-3">
                         {ROUND_OPTIONS.map(num => (
                           <button
                             key={num}
                             onClick={() => handleRoundsChange(num)}
                             className={`w-14 h-14 rounded-none border-2 font-bold font-['IndieSellout'] text-2xl transition-all uppercase tracking-widest ${
                               questionsPerGame === num
                                 ? "bg-[#00E5FF] text-black border-[#00E5FF] shadow-[4px_4px_0px_white] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
                                 : "bg-[#0A0A0A] text-white border-white/20 hover:border-white/50 shadow-[4px_4px_0px_rgba(255,255,255,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(255,255,255,0.2)]"
                             }`}
                           >
                             {num}
                           </button>
                         ))}
                       </div>
                    </div>

                    {/* Time Selection */}
                    <div>
                       <h4 className="text-white font-bold font-['IndieSellout'] mb-3 tracking-widest uppercase">Time Per Round</h4>
                       <div className="flex flex-wrap gap-3">
                         {TIME_OPTIONS.map(num => (
                           <button
                             key={num}
                             onClick={() => handleTimeChange(num)}
                             className={`px-4 h-14 rounded-none border-2 font-bold font-['IndieSellout'] text-xl transition-all uppercase tracking-widest flex items-center justify-center ${
                               timePerQuestion === num
                                 ? "bg-[#E48F45] text-black border-[#E48F45] shadow-[4px_4px_0px_white] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
                                 : "bg-[#0A0A0A] text-white border-white/20 hover:border-white/50 shadow-[4px_4px_0px_rgba(255,255,255,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(255,255,255,0.2)]"
                             }`}
                           >
                             {num}s
                           </button>
                         ))}
                       </div>
                    </div>

                    {/* Base Game Mode */}
                    <div className="flex flex-col gap-4 pt-4 border-t-2 border-dashed border-white/20">
                      <h4 className="text-white font-bold font-cabana uppercase text-2xl tracking-widest">Base Question Bank</h4>
                      <button
                        onClick={() => handleModeChange("random")}
                        className={`flex items-center justify-between p-4 rounded-none border-2 transition-all font-['IndieSellout'] text-xl ${
                          questionMode === "random"
                            ? "bg-white/10 border-[#00E5FF] text-white shadow-[2px_2px_0px_#00E5FF]" 
                            : "bg-transparent border-white/20 text-white/40"
                        }`}
                      >
                        <span>Default Questions</span>
                        {questionMode === "random" ? <CheckCircle2 className="text-[#00E5FF]" size={28} /> : <Circle size={28} />}
                      </button>
                      
                      <button
                        onClick={() => handleModeChange("categories")}
                        className={`flex items-center justify-between p-4 rounded-none border-2 transition-all font-['IndieSellout'] text-xl ${
                          questionMode === "categories"
                            ? "bg-white/10 border-[#00E5FF] text-white shadow-[2px_2px_0px_#00E5FF]" 
                            : "bg-transparent border-white/20 text-white/40"
                        }`}
                      >
                        <span>Categories Filter</span>
                        {questionMode === "categories" ? <CheckCircle2 className="text-[#00E5FF]" size={28} /> : <Circle size={28} />}
                      </button>

                      <button
                        onClick={() => handleModeChange("custom")}
                        className={`flex items-center justify-between p-4 rounded-none border-2 transition-all font-['IndieSellout'] text-xl ${
                          questionMode === "custom"
                            ? "bg-white/10 border-[#00E5FF] text-white shadow-[2px_2px_0px_#00E5FF]" 
                            : "bg-transparent border-white/20 text-white/40"
                        }`}
                      >
                        <span className="tracking-widest">CUSTOM BANK</span>
                        {questionMode === "custom" && <CheckCircle2 className="text-[#00E5FF]" size={20} />}
                      </button>
                    </div>

                    {questionMode === "categories" && (
                      <div className={`mt-2 p-4 border-2 border-white/20 rounded-xl bg-black/40`}>
                        <h4 className="text-white font-bold font-cabana uppercase text-2xl tracking-widest mb-3">Select Categories:</h4>
                        <div className="flex flex-wrap gap-2">
                          {availableCategories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => handleToggleCategory(cat)}
                              className={`px-3 py-1.5 rounded-none border-2 font-bold font-['IndieSellout'] transition-all ${
                                categories.includes(cat)
                                  ? "bg-[#87CEFA]/20 border-[#87CEFA] text-[#87CEFA] shadow-[2px_2px_0px_#87CEFA]"
                                  : "bg-transparent border-white/20 text-white/50"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {questionMode === "custom" && (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            onToggle();
                            setShowQuestionModal(true);
                          }}
                          className="w-full px-4 py-4 font-bold bg-[#87CEFA] text-[#0A0A0A] text-2xl transition-all rounded-none uppercase tracking-wider font-['IndieSellout'] shadow-[4px_4px_0px_white] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
                        >
                          {customBank.length > 0 ? `Edit Bank (${customBank.length})` : "Create Question Bank"}
                        </button>
                      </div>
                    )}

                    {/* Hot Seat Toggle (Moved to bottom) */}
                    <div className="pt-6 border-t-2 border-dashed border-white/20 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-bold font-['IndieSellout'] text-2xl uppercase tracking-wider">
                            Hot Seat Finale
                          </span>
                          <button
                            onClick={handleToggleHotSeat}
                            className={`w-14 h-8 rounded-full transition-all relative ${
                              includeHotSeat ? "bg-[#E48F45]" : "bg-white/20"
                            }`}
                          >
                            <motion.div
                              layout
                              className="w-6 h-6 bg-white rounded-full absolute top-1 shadow-md"
                              animate={{ left: includeHotSeat ? "30px" : "4px" }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                        <p className="text-white/50 text-sm font-cabana tracking-widest mt-4">
                          Append the "Two Truths & A Lie" bonus rounds to the end of the game!
                        </p>
                    </div>

                  </div>
                </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
      </div>

      {/* Custom Questions Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 p-4 pb-32 md:p-8 md:pb-8 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-start">
          <div className="relative w-full max-w-3xl p-6 mb-32 md:mb-0 bg-[#0A0A0A] cartoon-dashed-border rounded-2xl mt-10 shadow-2xl">
            <CustomQuestionsForm initialQuestions={customBank} onSave={handleSaveQuestions} roomId={room?.roomId} />
            <button
              onClick={() => setShowQuestionModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
