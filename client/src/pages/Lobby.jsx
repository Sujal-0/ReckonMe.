// client/src/pages/Lobby.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useRoomStore from "@/store/roomStore";
import socket from "@/lib/socket";
import { toast } from "sonner";
import { Highlighter } from "@/components/magicui/highlighter";
import { AnimatePresence, motion } from "framer-motion";
import Lottie from "lottie-react";
import timerAnimation from "@/assets/Lotties/Timer.json";
import loadingAnimation from "@/assets/Lotties/Loading.json";
import {
  Check,
  CircleOff,
  Crown,
  Gamepad,
  Goal,
  Rocket,
  Send,
} from "lucide-react";
import { RoomShareCopyBtn } from "@/components/ui/RoomShareCopyBtn";

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

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

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

  // Initialize player name and editing state
  useEffect(() => {
    if (player) {
      const hasExistingName = player.name && player.name.trim() !== "";
      setPlayerName(player.name || "");
      setIsEditingName(!hasExistingName);
    }
  }, [player]);

  // Handle name submission
  const handleNameSubmit = async (e) => {
    e.preventDefault();
    setNameError("");

    const trimmedName = playerName.trim();

    if (!trimmedName) {
      setNameError("Please enter a valid name");
      return;
    }

    if (trimmedName.length > 20) {
      setNameError("Name too long (max 20 characters)");
      return;
    }

    if (trimmedName.length < 2) {
      setNameError("Name too short (min 2 characters)");
      return;
    }

    const isDuplicate = players.some(
      (p) =>
        p.id !== player.id &&
        p.name &&
        p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      setNameError("This name is already taken");
      return;
    }

    setIsSubmittingName(true);

    socket.emit("update-player-name", {
      roomId: currentRoomId,
      playerId: player.id,
      name: trimmedName,
    });
  };

  // Handle ready toggle
  const handleReadyToggle = () => {
    const currentPlayerData = players.find((p) => p.id === player?.id);
    const hasValidName =
      currentPlayerData?.name && currentPlayerData.name.trim() !== "";

    if (!hasValidName) {
      alert("Please set your name first!");
      setIsEditingName(true);
      return;
    }

    socket.emit("player-ready", {
      roomId: currentRoomId,
      playerId: player.id,
      ready: !currentPlayerData.ready,
    });
  };

  // Handle game start (host only)
  const handleStartGame = () => {
    console.log("Starting game...");
    socket.emit("start-game", {
      roomId: currentRoomId,
      hostId: player.id,
    });
  };

  // Handle leave room
  const handleLeaveRoom = () => {
    setShowLeaveModal(true);
  };

  const confirmLeaveRoom = () => {
    setShowLeaveModal(false);
    // Emit leave event to socket
    socket.emit("leave-room", {
      roomId: currentRoomId,
      playerId: player.id,
    });
    // Reset room state and navigate
    resetRoom();
    navigate("/");
  };

  // Handle chat message send
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      playerId: player.id,
      playerName: players.find((p) => p.id === player.id)?.name || "Unknown",
      message: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setChatMessages((prev) => [...prev, message]);
    // setNewMessage("");

    // Here you would emit to socket for real chat functionality
    // socket.emit("chat-message", { roomId: currentRoomId, message });
    socket.emit("chat-message", {
      roomId: currentRoomId,
      playerId: player.id,
      message: newMessage.trim(),
    });

    setNewMessage("");
  };

  // Computed values
  const currentPlayerData = players.find((p) => p.id === player?.id);
  const hasName =
    currentPlayerData?.name && currentPlayerData.name.trim() !== "";
  const allPlayersHaveNames =
    players.length === 2 &&
    players.every((p) => p.name && p.name.trim() !== "");
  const allPlayersReady = players.length === 2 && players.every((p) => p.ready);
  const canStartGame = player?.isHost && allPlayersHaveNames && allPlayersReady;

  // Socket event handlers
  useEffect(() => {
    const handleRoomUpdated = (updatedRoom) => {
      console.log("Room updated:", updatedRoom);
      setRoom(updatedRoom);
      setConnectionError("");

      // Update local player data if it changed on server
      const serverPlayer = updatedRoom.players.find((p) => p.id === player?.id);
      if (serverPlayer && serverPlayer.name !== player.name) {
        setPlayer(serverPlayer);
        setPlayerName(serverPlayer.name || "");
      }
    };

    const handleNameUpdated = ({ success, name }) => {
      setIsSubmittingName(false);
      if (success) {
        setIsEditingName(false);
        setNameError("");
        setPlayerName(name);

        const updatedPlayer = { ...player, name };
        setPlayer(updatedPlayer);
      }
    };

    const handleTimer = (seconds) => {
      setTimer(seconds);
    };

    const handleRoomExpired = ({ message }) => {
      console.log("Room expired:", message);
      toast.error("Room has expired - game did not start within 10 minutes"); // More informative toast message
      resetRoom();
      navigate("/");
    };

    const handleError = (message) => {
      console.error("Socket error in lobby:", message);
      setIsSubmittingName(false);

      if (message.toLowerCase().includes("name")) {
        setNameError(message);
      } else {
        setConnectionError(message);
      }
    };

    const handleGameStarted = (gameData) => {
      console.log("Game started:", gameData);
      navigate(`/game/${currentRoomId}`);
    };

    const handlePlayerLeft = (updatedRoom) => {
      console.log("Player left room:", updatedRoom);
      setRoom(updatedRoom);
      // Clear any connection errors since we successfully got room update
      setConnectionError("");
    };

    const handleHostChanged = ({ newHostId, message }) => {
      console.log(`Host changed to ${newHostId}`, message);

      // Update local player if they're the new host
      if (player && newHostId === player.id) {
        setPlayer({ ...player, isHost: true });
        toast.success(message); // Show notification to new host
      }
    };

    // NEW: Handle incoming chat messages
    const handleChatMessage = (chatMessage) => {
      console.log("💬 Received chat message:", chatMessage);
      console.log("Current messages before:", chatMessages.length);

      setChatMessages((prev) => {
        const newMessages = [
          ...prev,
          {
            ...chatMessage,
            timestamp: new Date(chatMessage.timestamp).toLocaleTimeString(),
          },
        ];
        console.log("Updated messages count:", newMessages.length);
        return newMessages;
      });
    };

    // Add socket listeners
    socket.on("chat-message-received", handleChatMessage);
    socket.on("host-changed", handleHostChanged);
    socket.on("room-updated", handleRoomUpdated);
    socket.on("name-updated", handleNameUpdated);
    socket.on("room-timer", handleTimer);
    socket.on("room-expired", handleRoomExpired);
    socket.on("error-message", handleError);
    socket.on("game-started", handleGameStarted);
    socket.on("player-left", handlePlayerLeft);

    return () => {
      socket.off("chat-message-received", handleChatMessage);
      socket.off("host-changed", handleHostChanged);
      socket.off("room-updated", handleRoomUpdated);
      socket.off("name-updated", handleNameUpdated);
      socket.off("room-timer", handleTimer);
      socket.off("room-expired", handleRoomExpired);
      socket.off("error-message", handleError);
      socket.off("game-started", handleGameStarted);
      socket.off("player-left", handlePlayerLeft);
    };
  }, [
    player,
    setPlayer,
    setRoom,
    setTimer,
    resetRoom,
    navigate,
    currentRoomId,
  ]);

  // Update the handleRoomUpdated function
  const handleRoomUpdated = (updatedRoom) => {
    console.log("Room updated:", updatedRoom);

    if (!updatedRoom || !player) return;

    // Find current player in updated room data
    const updatedPlayer = updatedRoom.players.find((p) => p.id === player.id);
    if (updatedPlayer) {
      // Check if host status changed
      if (updatedPlayer.isHost !== player.isHost) {
        setPlayer(updatedPlayer);
      }
    }

    setRoom(updatedRoom);
    setConnectionError("");
  };

  // Update the timer format function
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  const timerOptions = {
    loop: true,
    autoplay: true,
    animationData: timerAnimation,
  };

  const loadingOptions = {
    loop: true,
    autoplay: true,
    animationData: loadingAnimation,
  };

  // Add timer warning when time is low
  const getTimerDisplay = (seconds) => {
    const isLow = seconds <= 60; // Last minute
    return (
      <div
        className={`px-4 py-2 rounded-lg bg-transparent font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white] ${
          isLow ? "animate-pulse text-red-400" : ""
        }`}
      >
        <div className="flex items-center justify-center text-2xl font-bold font-['IndieSellout']">
          <div className="w-20 h-20">
            {" "}
            {/* Adjust size as needed */}
            <Lottie
              animationData={timerAnimation}
              autoplay={true}
              options={timerOptions}
            />
          </div>
          {formatTime(timer)}
        </div>
        <p className="mt-2 text-lg text-center text-gray-400">
          {isLow
            ? "Room will expire soon!"
            : "Room expires when timer reaches 0:00"}
        </p>
      </div>
    );
  };

  // Loading state
  if (!room || !player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-white">
        <div className="mb-4 text-2xl animate-pulse">Loading lobby...</div>
        {connectionError && (
          <div className="text-center text-red-400">
            <p>{connectionError}</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 mt-4 transition-colors bg-red-600 rounded-lg hover:bg-red-700"
            >
              Go Home
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 text-white">
      <div className="grid grid-cols-1 gap-6 mx-auto lg:grid-cols-3 max-w-7xl">
        {/* LEFT SIDE - Instructions and Players */}
        <div className="order-2 space-y-6 md:order-1">
          {/* Instructions */}
          <div className="px-4 py-2 rounded-lg bg-transparent font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white]">
            <div className="max-w-3xl text-center">
              <Highlighter action="highlight" color="#4D4C7D">
                <h1 className="px-6 text-2xl font-semibold leading-tight tracking-widest sm:text-xl md:text-2xl lg:text-3xl">
                  How2Play
                </h1>
              </Highlighter>
              <p className="mt-4 text-lg leading-tight tracking-widest text-start sm:text-sm md:text-lg lg:text-xl">
                - Answer to each question
              </p>
              <p className="mt-2 text-lg leading-tight tracking-widest text-start sm:text-sm md:text-lg lg:text-xl">
                - Guess what your friends answered!
              </p>
              <p className="mt-2 text-lg leading-tight tracking-widest text-start sm:text-sm md:text-lg lg:text-xl">
                - Who has most right guesses wins!
              </p>
            </div>
          </div>

          {/* Players List */}
          <div className="px-4 py-2 rounded-lg bg-transparent font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white]">
            <h2 className="mb-4 text-2xl font-semibold text-center text-white/40">
              Players ({players.length}/2)
            </h2>
            <div className="space-y-3">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                    p.isHost
                      ? "bg-[#0A0A0A] text-[#ffffff] shadow-[3px_3px_0px_white]"
                      : "bg-[#ffffff] text-[#0A0A0A] shadow-[3px_3px_0px_white]"
                  } ${p.id === player.id ? "ring-2 ring-white/50" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {p.isHost ? <Crown /> : <Gamepad />}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-lg font-bold">
                        {p.isHost ? "Host" : "Player"}
                        {p.id === player.id && " (You)"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">
                      {p.name || "Set name..."}
                    </span>
                    {p.ready && (
                      <span className="text-xl">
                        <Check />
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty slot */}
              {players.length < 2 && (
                <div className="flex items-center justify-center px-4 py-3 bg-transparent border-2 border-gray-600 border-dashed rounded-lg text-white/40">
                  <span className="text-lg duration-300 animate-pulse">
                    Waiting for another player...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Game Status */}
          <div className="text-center">
            {players.length < 2 ? (
              <div className="px-4 py-2 rounded-lg bg-transparent font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white]">
                <span className="text-lg">
                  <Highlighter action="highlight" color="#E48F45">
                    Waiting for another player to join...{" "}
                  </Highlighter>
                </span>
              </div>
            ) : !allPlayersHaveNames ? (
              <div className="px-4 py-2 rounded-lg bg-transparent font-bold placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white]">
                <span className="text-lg">
                  <Highlighter action="highlight" color="#5F6F52">
                    Waiting for all players to set their names...
                  </Highlighter>
                </span>
              </div>
            ) : !allPlayersReady ? (
              <div className="px-4 py-2 rounded-lg bg-transparent font-bold placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white]">
                <span className="text-lg">
                  <Highlighter action="highlight" color="#213555">
                    Waiting for all players to be ready...
                  </Highlighter>
                </span>
              </div>
            ) : player?.isHost ? (
              <div className="px-4 py-2 rounded-lg bg-transparent font-bold placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white]">
                <span className="flex items-center justify-center gap-4 text-lg">
                  <Lottie
                    animationData={loadingAnimation}
                    autoplay={true}
                    options={loadingOptions}
                    className="w-10 h-10"
                  />{" "}
                  <Highlighter action="underline" color="#19376D">
                    All players ready! You can start the game.
                  </Highlighter>
                </span>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-lg bg-transparent font-bold placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white]">
                <span className="flex items-center justify-center gap-4 text-lg">
                  <Lottie
                    animationData={loadingAnimation}
                    autoplay={true}
                    options={loadingOptions}
                    className="w-10 h-10 bg-transparent"
                  />{" "}
                  <Highlighter action="underline" color="#19376D">
                    All players ready! Waiting for host to start.
                  </Highlighter>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE SIDE - Main Content */}
        <div className="order-1 space-y-3 md:order-2">
          {/* Welcome Header */}
          <div className="text-center">
            <h1 className="mb-6 text-3xl font-bold lg:text-5xl">
              Hi! Welcome to{" "}
              <Highlighter action="highlight" color="#4D4C7D">
                ReckonMe!
              </Highlighter>
            </h1>
            <p className="mb-6 text-lg lg:text-xl">
              First, you will need to enter your name so your friends can know
              who you are! You can always change everything later :P
            </p>
          </div>

          {/* Connection Error */}
          {connectionError && (
            <div className="p-4 mb-6 text-red-300 border border-red-500 rounded-lg bg-red-900/30">
              <p>
                <CircleOff /> {connectionError}
              </p>
            </div>
          )}

          {/* Room Code Display */}
          <div className="p-6 text-center border-4 border-dashed border-[#4D4C7D] rounded-lg">
            <p className="text-xl text-gray-300">
              You can invite your friends to this room with this link or by
              using this code:
            </p>
            <RoomShareCopyBtn />
            {player?.isHost && (
              <p className="mt-3 text-lg text-gray-400">
                Share this code with your friend to join!
              </p>
            )}
          </div>

          {/* Name Setting Section */}
          {(!hasName || isEditingName) && (
            <div className="w-full max-w-md p-6 mx-auto">
              <h2 className="mb-4 text-2xl font-semibold text-center text-white/40">
                {hasName ? "Change Your Name" : "Set Your Name"}
              </h2>
              <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    setNameError("");
                  }}
                  placeholder="Enter your name..."
                  maxLength={20}
                  className="flex-1 px-4 py-2 rounded-lg bg-transparent text-2xl font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  autoFocus
                  disabled={isSubmittingName}
                />

                {nameError && (
                  <p className="text-sm text-center text-red-400">
                    {nameError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!playerName.trim() || isSubmittingName}
                    className="flex-1 px-4 py-2 rounded-lg bg-transparent uppercase text-xl font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-['IndieSellout']"
                  >
                    {isSubmittingName ? "Setting..." : "Set Name"}
                  </button>
                  {hasName && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingName(false);
                        setPlayerName(currentPlayerData.name);
                        setNameError("");
                      }}
                      disabled={isSubmittingName}
                      className="flex-1 px-4 py-2 font-medium bg-[#0A0A0A] text-[#ffffff] text-xl transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Current Name Display */}
          {hasName && !isEditingName && (
            <div className="mb-6 text-center">
              <Highlighter action="highlight" color="#4D4C7D">
                <p className="text-lg text-gray-300">Your name:</p>
              </Highlighter>
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="text-4xl font-bold text-white/40 font-['IndieSellout']">
                  {currentPlayerData.name}
                </span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="ml-2 px-4 py-2 font-medium bg-[#0A0A0A] text-[#ffffff] text-2xl w-fit transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Ready Button */}
          {hasName && (
            <div className="text-center">
              <button
                onClick={handleReadyToggle}
                className={`px-10 py-2 text-2xl font-extrabold rounded-xl transition-all transform hover:scale-105 ${
                  currentPlayerData?.ready
                    ? "text-[#0A0A0A] bg-[#ffffff] shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                    : "bg-[#0A0A0A] text-[#ffffff] shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                }`}
              >
                {currentPlayerData?.ready ? "NOT READY" : "READY TO PLAY!"}
              </button>
            </div>
          )}

          {/* Start Game Button (Host only) */}
          {canStartGame && (
            <div className="text-center">
              <button
                onClick={handleStartGame}
                className="px-8 py-2 flex items-center justify-center gap-2 font-medium bg-[#0A0A0A] text-[#ffffff] text-2xl w-full transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50"
              >
                <Rocket /> START GAME
              </button>
            </div>
          )}

          {/* Leave Room Button */}
          <div className="text-center">
            <button
              onClick={handleLeaveRoom}
              className="px-8 py-2 font-semibold bg-[#0A0A0A] text-rose-800 text-2xl transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50"
            >
              Leave Room
            </button>
            {/* Leave Room Popup */}
            <AnimatePresence>
              {showLeaveModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowLeaveModal(false)}
                  className="fixed inset-0 z-50 grid p-8 cursor-pointer bg-slate-900/40 backdrop-blur place-items-center"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: "12.5deg" }}
                    animate={{ scale: 1, rotate: "0deg" }}
                    exit={{ scale: 0, rotate: "0deg" }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md p-8 overflow-hidden text-white shadow-xl cursor-default bg-gradient-to-br from-black/80 to-black rounded-2xl"
                  >
                    <div className="relative z-10 space-y-6">
                      <h3 className="text-3xl font-medium text-center font-['IndieSellout']">
                        Leave Room?
                      </h3>
                      <p className="text-center text-lg text-white/70 font-['IndieSellout']">
                        Are you sure you want to leave the room? You'll be
                        disconnected from the game.
                      </p>

                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => setShowLeaveModal(false)}
                          className="px-6 py-2 font-medium bg-white/40 text-white text-xl transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] rounded-lg font-['IndieSellout']"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmLeaveRoom}
                          className="px-6 py-2 font-medium bg-rose-600 text-white text-xl transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] rounded-lg font-['IndieSellout']"
                        >
                          Leave
                        </button>
                      </div>

                      <button
                        onClick={() => setShowLeaveModal(false)}
                        className="block mx-auto mt-4 text-lg text-white/70 hover:text-white"
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT SIDE - Debug Info */}
        <div className="order-3 space-y-4 md:order-3">
          {/* Timer */}
          {getTimerDisplay(timer)} {/* Chat Area */}
          <div className="px-4 py-2 rounded-lg bg-transparent font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white]">
            {/* Chat Messages */}
            <div className="h-40 p-4 mb-4 space-y-2 overflow-y-auto bg-transparent rounded-lg transition-all shadow-[3px_3px_0px_white]">
              {chatMessages.length === 0 ? (
                <p className="text-center text-white/40">
                  No messages yet. Start chatting!
                </p>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <span className="font-bold text-[#4D4C7D]">
                      {msg.playerName}
                    </span>
                    <span className="ml-2 text-sm text-gray-400">
                      {msg.timestamp}
                    </span>
                    <p className="text-4xl font-medium text-white">
                      {msg.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-lg bg-transparent text-xl font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white]"
                maxLength={200}
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-4 py-2 rounded-lg bg-transparent text-xl text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
