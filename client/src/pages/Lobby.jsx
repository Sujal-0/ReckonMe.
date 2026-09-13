import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useRoomStore from "@/store/roomStore";
import socket from "@/lib/socket";
import { toast } from "sonner";
import { Highlighter } from "@/components/magicui/highlighter";
import { AnimatePresence, motion } from "framer-motion";
import { CircleOff, X } from "lucide-react";
import { ReckonLoader } from "@/components/ui/ReckonLoader";
import Lottie from "lottie-react";
import timerAnimation from "@/assets/Lotties/Timer.json";
import { useAppStore } from "@/store";
import useUserStore from "@/store/userStore";
import { apiClient } from "@/lib/api-client";
import { UPDATE_AVATAR_ROUTE } from "@/utils/constants";

// Modular Components
import { PlayerList } from "@/components/lobby/PlayerList";
import { GameSetup, RoomInvite, ChangeNameUI } from "@/components/lobby/GameSetup";
import { SmartChat } from "@/components/lobby/SmartChat";

const Lobby = () => {
  const { code: roomId } = useParams();
  const navigate = useNavigate();

  // Local state
  const [playerName, setPlayerName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Dynamic panels state
  const [openPanels, setOpenPanels] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`lobby_panels_${roomId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse panels from sessionStorage", e);
    }
    return [];
  });
  
  useEffect(() => {
    if (roomId) {
      sessionStorage.setItem(`lobby_panels_${roomId}`, JSON.stringify(openPanels));
    }
  }, [openPanels, roomId]);

  const togglePanel = (panel) => {
    setOpenPanels((prev) => {
      if (prev.includes(panel)) {
        return [];
      }
      return [panel];
    });
  };

  const getPanelPositionClass = (panelId) => {
    const index = openPanels.indexOf(panelId);
    if (index === 0) return "right-[90px]";
    if (index === 1) return "right-[460px]";
    if (index === 2) return "right-[830px]";
    return "right-[90px]";
  };

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  

  const { userInfo, setUserInfo } = useAppStore();
  const { setGlobalName, setGlobalAvatarSeed } = useUserStore();

  const {
    room,
    player,
    timer,
    setRoom,
    setPlayer,
    setTimer,
    resetRoom,
    getRoomId,
    getPlayers,
  } = useRoomStore();

  const players = getPlayers();
  const currentRoomId = getRoomId();

  useEffect(() => {
    if (player) {
      const hasExistingName = player.name && player.name.trim() !== "";
      setPlayerName(player.name || "");
      setIsEditingName(!hasExistingName);
    }
  }, [player]);

  useEffect(() => {
    if (!room?.expiresAt) return;

    const interval = setInterval(() => {
      const endTime = new Date(room.expiresAt).getTime();
      const timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimer(timeLeft);
      if (timeLeft <= 0) clearInterval(interval);
    }, 1000);

    // Initial set to avoid 1-second delay
    const initialEndTime = new Date(room.expiresAt).getTime();
    setTimer(Math.max(0, Math.floor((initialEndTime - Date.now()) / 1000)));

    return () => clearInterval(interval);
  }, [room?.expiresAt, setTimer]);

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    setNameError("");
    const trimmedName = playerName.trim();

    if (!trimmedName) return setNameError("Please enter a valid name");
    if (trimmedName.length > 20) return setNameError("Name too long (max 20 characters)");
    if (trimmedName.length < 2) return setNameError("Name too short (min 2 characters)");

    const isDuplicate = players.some(
      (p) => p.id !== player.id && p.name && p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) return setNameError("This name is already taken");

    setIsSubmittingName(true);
    socket.emit("update-player-name", {
      roomId: currentRoomId,
      playerId: player.id,
      name: trimmedName,
    });
    
    if (!userInfo) {
      setGlobalName(trimmedName);
    }
  };

  const handleReadyToggle = () => {
    const currentPlayerData = players.find((p) => p.id === player?.id);
    const hasValidName = currentPlayerData?.name && currentPlayerData.name.trim() !== "";

    if (!hasValidName) {
      toast.error("Please set your name first!");
      setIsEditingName(true);
      return;
    }

    socket.emit("player-ready", {
      roomId: currentRoomId,
      playerId: player.id,
      ready: !currentPlayerData.ready,
    });
  };

  const handleStartGame = () => {
    socket.emit("start-game", {
      roomId: currentRoomId,
      hostId: player.id,
    });
  };

  const confirmLeaveRoom = () => {
    setShowLeaveModal(false);
    socket.emit("leave-room", { roomId: currentRoomId, playerId: player.id });
    resetRoom();
    navigate("/");
  };

  const handleSendMessage = (msgText, type = "chat") => {
    socket.emit("send-message", {
      roomId: currentRoomId,
      playerId: player.id,
      message: msgText,
      type,
    });
  };

  const handleKickPlayer = (targetPlayerId) => {
    socket.emit("kick-player", {
      roomId: currentRoomId,
      hostId: player.id,
      targetPlayerId,
    });
  };

  const handleRequestAccess = () => {
    handleSendMessage("I would like to request access to the Game Settings.", "request_access");
    toast.success("Request sent to host!");
    togglePanel("chat");
  };

  const handleApproveAccess = () => {
    if (!player?.isHost) return;
    socket.emit("update-room-settings", {
      roomId: currentRoomId,
      playerId: player.id,
      settings: { sharedSettingsAccess: true }
    });
    handleSendMessage("I have granted you access to the Game Settings!", "chat");
  };

  const handleShuffleAvatar = async () => {
    const newSeed = Math.random().toString(36).substring(7);
    // Optimistic update locally
    setPlayer({ ...player, avatarSeed: newSeed });
    // Tell server
    socket.emit("update-player-avatar", {
      roomId: currentRoomId,
      playerId: player.id,
      avatarSeed: newSeed
    });

    if (userInfo) {
      try {
        setUserInfo({ ...userInfo, avatarSeed: newSeed });
        await apiClient.post(UPDATE_AVATAR_ROUTE, { avatarSeed: newSeed }, { withCredentials: true });
      } catch (err) {
        console.error("Failed to update avatar on server:", err);
      }
    } else {
      setGlobalAvatarSeed(newSeed);
    }
  };

  const currentPlayerData = players.find((p) => p.id === player?.id);
  const hasName = currentPlayerData?.name && currentPlayerData.name.trim() !== "";
  const allPlayersHaveNames = players.length === 2 && players.every((p) => p.name && p.name.trim() !== "");
  const allPlayersReady = players.length === 2 && players.every((p) => p.ready);
  const canStartGame = player?.isHost && allPlayersHaveNames && allPlayersReady;

  useEffect(() => {
    const handleRoomUpdated = (updatedRoom) => {
      if (!updatedRoom || !player) return;
      const updatedPlayer = updatedRoom.players.find((p) => p.id === player.id);
      if (updatedPlayer && updatedPlayer.isHost !== player.isHost) {
        setPlayer(updatedPlayer);
      }
      setRoom(updatedRoom);
      setConnectionError("");
    };

    const handleNameUpdated = ({ success, name }) => {
      setIsSubmittingName(false);
      if (success) {
        setIsEditingName(false);
        setNameError("");
        setPlayerName(name);
        setPlayer({ ...player, name });
      }
    };

    const handleAvatarUpdated = (updatedRoom) => {
       setRoom(updatedRoom);
    };

    const handleRoomExpired = ({ message }) => {
      toast.error(message || "Room has expired");
      resetRoom();
      navigate("/");
    };

    const handleError = (message) => {
      setIsSubmittingName(false);
      if (message.toLowerCase().includes("name")) setNameError(message);
      else toast.error(message);
    };

    const handleGameStarted = () => navigate(`/game/${currentRoomId}`);
    
    const handleHostChanged = ({ newHostId, message }) => {
      if (player && newHostId === player.id) {
        setPlayer({ ...player, isHost: true });
        toast.success(message);
      }
    };

    const handleChatMessage = (chatMessage) => {
      setChatMessages((prev) => [
        ...prev,
        { ...chatMessage, timestamp: new Date(chatMessage.timestamp).toLocaleTimeString() },
      ]);
    };

    const handleKickedFromRoom = ({ message }) => {
      toast.error(message || "You have been kicked by the host.");
      resetRoom();
      navigate("/");
    };



    socket.on("receive-message", handleChatMessage);
    socket.on("host-changed", handleHostChanged);
    socket.on("room-updated", handleRoomUpdated);
    socket.on("name-updated", handleNameUpdated);
    socket.on("avatar-updated", handleAvatarUpdated);
    socket.on("room-expired", handleRoomExpired);
    socket.on("error-message", handleError);
    socket.on("game-started", handleGameStarted);
    socket.on("player-left", handleRoomUpdated);
    socket.on("kicked-from-room", handleKickedFromRoom);

    return () => {
      socket.off("receive-message", handleChatMessage);
      socket.off("host-changed", handleHostChanged);
      socket.off("room-updated", handleRoomUpdated);
      socket.off("name-updated", handleNameUpdated);
      socket.off("avatar-updated", handleAvatarUpdated);
      socket.off("room-expired", handleRoomExpired);
      socket.off("error-message", handleError);
      socket.off("game-started", handleGameStarted);
      socket.off("player-left", handleRoomUpdated);
      socket.off("kicked-from-room", handleKickedFromRoom);
    };
  }, [player, setPlayer, setRoom, setTimer, resetRoom, navigate, currentRoomId]);

  // Route Guard: If game is in-progress, force them back to game
  useEffect(() => {
    if (room && room.status !== "lobby" && room.status !== "finished") {
      navigate(`/game/${currentRoomId}`);
    }
  }, [room, currentRoomId, navigate]);

  if (!room || !player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-white bg-[#0A0A0A]">
        <ReckonLoader text="Loading Lobby..." />
        {connectionError && (
          <div className="mt-8 text-center text-red-400">
            <p>{connectionError}</p>
            <button onClick={() => navigate("/")} className="px-6 py-2 mt-4 transition-colors bg-red-600 rounded-lg hover:bg-red-700">
              Go Home
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen p-6 pb-40 md:pb-24 lg:pb-12 text-white bg-transparent overflow-x-hidden lg:overflow-y-auto relative">
      {/* Header and Top Actions */}
      <div className="relative flex flex-col items-center mb-6 mt-4 max-w-6xl mx-auto w-full">
        <h1 className="mb-2 text-4xl font-bold lg:text-6xl font-['IndieSellout'] tracking-widest text-center">
          Welcome to <Highlighter action="highlight" color="#4D4C7D">ReckonMe!</Highlighter>
        </h1>
        <p className="text-xl text-white/70 font-cabana tracking-wider text-center max-w-lg px-4">
          Configure your game, set your avatar, and get ready!
        </p>

        {/* Actions (Timer + Leave Room) */}
        <div className="mt-6 md:mt-0 md:absolute md:top-0 md:right-0 flex flex-row md:flex-col items-center md:items-end justify-center gap-6 md:gap-2 w-full md:w-auto">
          {/* Countdown Timer */}
          <div className={`flex items-center font-bold font-['IndieSellout'] text-4xl md:text-5xl h-14 overflow-hidden relative min-w-[80px] justify-center tabular-nums ${timer <= 10 ? 'text-red-600 animate-pulse' : 'text-rose-400'}`}>
            {timer.toString().split('').map((digit, i) => (
              <div key={`${timer.toString().length}-${i}`} className="relative inline-flex justify-center">
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
          {/* Leave Room Button */}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="text-lg font-bold text-white/50 hover:text-rose-500 transition-colors uppercase font-['IndieSellout'] tracking-widest md:mt-2"
          >
            Leave Room
          </button>
        </div>
      </div>



      <div className="flex flex-col lg:flex-row gap-8 mx-auto max-w-6xl mt-8 relative z-10 w-full px-2 md:px-0">
        {/* Click-away overlay for panels */}
        {openPanels.length > 0 && (
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" 
            onClick={() => setOpenPanels([])}
          />
        )}
        
        {/* LEFT PANEL */}
        <div className="w-full lg:w-1/2 order-2 lg:order-1 space-y-6">
          <div className="hidden lg:block">
            <RoomInvite />
          </div>
          
          <div className="block lg:hidden space-y-6">
            <PlayerList 
              players={players} 
              currentPlayer={player} 
              onShuffleAvatar={handleShuffleAvatar}
              onKickPlayer={handleKickPlayer}
            />
            
            {/* Mobile Only: Ready & Start Game Buttons */}
            {hasName && (
              <div className="flex items-center gap-3 pt-2">
                {/* Ready Toggle */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReadyToggle}
                  className={`flex-1 px-6 py-3 text-xl font-extrabold rounded-none transition-all font-['IndieSellout'] tracking-wider ${
                    currentPlayerData?.ready
                      ? "text-[#0A0A0A] bg-white shadow-[3px_3px_0px_#4D4C7D] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                      : "bg-[#0A0A0A] text-white shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] border-b-2 border-white"
                  }`}
                >
                  {currentPlayerData?.ready ? "NOT READY" : "READY!"}
                </motion.button>

                {/* Start Game Button (Host only) */}
                {canStartGame && (
                  <button
                    onClick={handleStartGame}
                    className="group flex-1 px-6 py-3 flex items-center justify-center gap-2 font-extrabold bg-[#0E1934] text-white text-xl rounded-none transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-['IndieSellout'] tracking-wider"
                  >
                    START GAME
                    <img
                      src="/right-arrow.png"
                      alt="→"
                      className="w-6 h-6 object-contain filter brightness-0 invert transition-transform duration-300 group-hover:translate-x-2"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full lg:w-1/2 order-1 lg:order-2 relative space-y-6">
          <div className="block lg:hidden space-y-6">
            <RoomInvite />
            <ChangeNameUI 
              hasName={hasName}
              isEditingName={isEditingName}
              playerName={playerName}
              setPlayerName={setPlayerName}
              handleNameSubmit={handleNameSubmit}
              setIsEditingName={setIsEditingName}
              isSubmittingName={isSubmittingName}
              nameError={nameError}
            />
          </div>

          <div className="hidden lg:block space-y-6">
            <PlayerList 
              players={players} 
              currentPlayer={player} 
              onShuffleAvatar={handleShuffleAvatar}
              onKickPlayer={handleKickPlayer}
            />
            <ChangeNameUI 
              hasName={hasName}
              isEditingName={isEditingName}
              playerName={playerName}
              setPlayerName={setPlayerName}
              handleNameSubmit={handleNameSubmit}
              setIsEditingName={setIsEditingName}
              isSubmittingName={isSubmittingName}
              nameError={nameError}
            />
          </div>

          <GameSetup 
            player={player}
            hasName={hasName}
            isEditingName={isEditingName}
            playerName={playerName}
            setPlayerName={setPlayerName}
            handleNameSubmit={handleNameSubmit}
            setIsEditingName={setIsEditingName}
            isSubmittingName={isSubmittingName}
            nameError={nameError}
            currentPlayerData={currentPlayerData}
            handleReadyToggle={handleReadyToggle}
            canStartGame={canStartGame}
            handleStartGame={handleStartGame}
            room={room}
            isOpen={openPanels.includes("settings")}
            onToggle={() => togglePanel("settings")}
            positionClass={getPanelPositionClass("settings")}
            onRequestAccess={handleRequestAccess}
            isAnyPanelOpen={openPanels.length > 0}
          />

          {/* Desktop Only: Ready & Start Game Buttons */}
          <div className="hidden lg:block mt-6">
            {hasName && !isEditingName && (
              <div className="flex items-center gap-3 pt-2">
                {/* Ready Toggle */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReadyToggle}
                  className={`flex-1 px-6 py-3 text-xl font-extrabold rounded-none transition-all font-['IndieSellout'] tracking-wider ${
                    currentPlayerData?.ready
                      ? "text-[#0A0A0A] bg-white shadow-[3px_3px_0px_#4D4C7D] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                      : "bg-[#0A0A0A] text-white shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] border-b-2 border-white"
                  }`}
                >
                  {currentPlayerData?.ready ? "NOT READY" : "READY!"}
                </motion.button>

                {/* Start Game Button (Host only) */}
                {canStartGame && (
                  <button
                    onClick={handleStartGame}
                    className="group flex-1 px-6 py-3 flex items-center justify-center gap-2 font-extrabold bg-[#0E1934] text-white text-xl rounded-none transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-['IndieSellout'] tracking-wider"
                  >
                    START GAME
                    <img
                      src="/right-arrow.png"
                      alt="→"
                      className="w-6 h-6 object-contain filter brightness-0 invert transition-transform duration-300 group-hover:translate-x-2"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How2Play Floating Button and Panel */}
      <div className="z-40">
        {!openPanels.includes("how2play") && (
          <motion.button
            initial={false}
            animate={{ right: openPanels.length > 0 ? 432 : 32 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => togglePanel("how2play")}
            className="hidden md:flex fixed bottom-[132px] z-50 p-2 bg-white border-2 border-[#0A0A0A] rounded-none transition-all shadow-[4px_4px_0px_white] hover:-translate-x-[4px] hover:-translate-y-[4px] hover:shadow-none"
          >
            <img src="/question.png" alt="How To Play" className="w-8 h-8 object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <div className="hidden w-8 h-8 bg-gray-200" />
          </motion.button>
        )}
        <AnimatePresence>
          {openPanels.includes("how2play") && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-[#0A0A0A] border-l-4 border-white/20 sketchy-shape shadow-[-8px_0px_0px_rgba(255,255,255,0.1)] flex flex-col z-50 overflow-hidden"
              >
              {/* Header */}
              <div className="flex items-center justify-between p-4 cartoon-dashed-border-b shrink-0">
                <h3 className="text-2xl font-bold text-center text-[#87CEFA] font-['IndieSellout'] tracking-widest w-full uppercase">
                  How2Play
                </h3>
                <button
                  onClick={() => togglePanel("how2play")}
                  className="p-1 text-white/50 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 pb-24 flex-1 overflow-y-auto">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-[#E48F45] text-black font-bold flex items-center justify-center text-3xl border-2 border-white shadow-[2px_2px_0px_white]">1</div>
                    <p className="text-lg font-cabana text-white/90">Answer the quirky questions honestly.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-[#00E5FF] text-black font-bold flex items-center justify-center text-3xl border-2 border-white shadow-[2px_2px_0px_white]">2</div>
                    <p className="text-lg font-cabana text-white/90">Guess what the other players answered.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-[#87CEFA] text-black font-bold flex items-center justify-center text-3xl border-2 border-white shadow-[2px_2px_0px_white]">3</div>
                    <p className="text-lg font-cabana text-white/90">Earn points for correct guesses & win!</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MOBILE BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] flex justify-around items-center bg-[#0A0A0A] border-t-4 border-white p-2 md:hidden">
         <button onClick={() => togglePanel("how2play")} className="p-2 border-2 border-white shadow-[2px_2px_0px_white] bg-[#E48F45] text-black">
           <img src="/question.png" className="w-8 h-8" onError={(e) => { e.target.style.display = 'none'; }} />
         </button>
         <button onClick={() => togglePanel("settings")} className="p-2 border-2 border-white shadow-[2px_2px_0px_white] bg-[#00E5FF] text-black">
           <img src="/configuration.png" className="w-8 h-8" onError={(e) => { e.target.style.display = 'none'; }} />
         </button>
         <button onClick={() => togglePanel("chat")} className="p-2 border-2 border-white shadow-[2px_2px_0px_white] bg-[#87CEFA] text-black relative">
           <img src="/chat.png" className="w-8 h-8" onError={(e) => { e.target.style.display = 'none'; }} />
         </button>
      </div>

      {/* Smart Chat */}
      <SmartChat 
        messages={chatMessages} 
        onSendMessage={handleSendMessage} 
        isOpen={openPanels.includes("chat")}
        onToggle={() => togglePanel("chat")}
        positionClass={getPanelPositionClass("chat")}
        player={player}
        onApproveAccess={handleApproveAccess}
        room={room}
        isAnyPanelOpen={openPanels.length > 0}
      />

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
              className="relative w-full max-w-sm p-8 overflow-hidden text-white shadow-xl cursor-default bg-[#0A0A0A] sketchy-shape border-4 border-rose-500"
            >
              <div className="relative z-10 space-y-6 text-center">
                <h3 className="text-4xl font-bold font-['IndieSellout'] text-rose-500">Leaving?</h3>
                <p className="text-xl font-cabana text-white/70">Are you sure you want to leave this awesome room?</p>
                <div className="flex justify-center gap-4 pt-4">
                  <button
                    onClick={() => setShowLeaveModal(false)}
                    className="px-6 py-2 bg-transparent border-2 border-white text-white rounded-none font-bold font-['IndieSellout'] shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  >
                    Stay
                  </button>
                  <button
                    onClick={confirmLeaveRoom}
                    className="px-6 py-2 bg-rose-600 text-white rounded-none font-bold font-['IndieSellout'] shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  >
                    Leave
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

export default Lobby;
