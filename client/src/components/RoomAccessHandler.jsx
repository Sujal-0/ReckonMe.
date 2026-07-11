// client/src/components/RoomAccessHandler.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import useRoomStore from "@/store/roomStore";
import { apiClient } from "@/lib/api-client";
import { ROOM_ROUTE, ROOM_JOIN_ROUTE } from "@/utils/constants";
import socket from "@/lib/socket";

const RoomAccessHandler = ({ children }) => {
  const { code: roomId } = useParams();
  const navigate = useNavigate();
  const { player, room, setRoom, setPlayer, getRoomId, resetRoom } =
    useRoomStore();
  const currentRoomId = getRoomId();
  const [isJoining, setIsJoining] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const processedRef = useRef(false);

  // Handle browser back/refresh
  const handleBeforeUnload = useCallback(
    (e) => {
      if (room && player) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to leave the room?";
        return e.returnValue;
      }
    },
    [room, player]
  );

  // Setup browser navigation interceptors
  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handlePopState = (e) => {
      if (room && player) {
        const currentUrl = window.location.href;
        window.history.pushState(null, "", currentUrl);

        const confirmLeave = window.confirm(
          "Are you sure you want to leave the room?"
        );

        if (confirmLeave) {
          socket.emit("leave-room", {
            roomId: currentRoomId,
            playerId: player.id,
          });
          resetRoom();
          window.history.back();
        }
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [room, player, currentRoomId, handleBeforeUnload, resetRoom]);

  // Setup socket listeners - separate from room access logic
  useEffect(() => {
    const handleRoomDeleted = ({ message }) => {
      console.log("Room deleted:", message);
      resetRoom();
      navigate("/");
    };

    const handlePlayerLeft = (updatedRoom) => {
      console.log("Player left - room updated:", updatedRoom);
      if (updatedRoom && player) {
        const stillInRoom = updatedRoom.players.some((p) => p.id === player.id);
        if (stillInRoom) {
          setRoom(updatedRoom);
        } else {
          resetRoom();
          navigate("/");
        }
      } else {
        setRoom(updatedRoom);
      }
    };

    const handleHostLeft = ({ message }) => {
      console.log("Host left:", message);
      alert(message);
      resetRoom();
      navigate("/");
    };

    const handleRoomUpdated = (updatedRoom) => {
      console.log("Room updated via socket:", updatedRoom);
      if (updatedRoom && updatedRoom.players) {
        setRoom(updatedRoom);

        // Update player data from server if we have a player
        if (player) {
          const serverPlayer = updatedRoom.players.find(
            (p) => p.id === player.id
          );
          if (serverPlayer) {
            setPlayer(serverPlayer);
          }
        }
      }
    };

    const handleRejoinSuccess = (roomData) => {
      console.log("Rejoin successful:", roomData);
      if (roomData && roomData.players) {
        setRoom(roomData);
        if (player) {
          const serverPlayer = roomData.players.find((p) => p.id === player.id);
          if (serverPlayer) {
            setPlayer(serverPlayer);
          }
        }
        setIsReady(true);
      }
    };

    const handleErrorMessage = (message) => {
      console.error("Socket error:", message);
      if (message.includes("Room not found") && isJoining) {
        resetRoom();
        navigate("/");
      } else if (!message.includes("Player already exists")) {
        // Don't show certain errors that are expected during normal operation
        console.warn("Socket warning:", message);
      }
    };

    const handleRoomExpired = ({ message }) => {
      console.log("Room expired:", message);
      alert(message);
      resetRoom();
      navigate("/");
    };

    socket.on("room-deleted", handleRoomDeleted);
    socket.on("player-left", handlePlayerLeft);
    socket.on("host-left", handleHostLeft);
    socket.on("room-updated", handleRoomUpdated);
    socket.on("rejoin-success", handleRejoinSuccess);
    socket.on("error-message", handleErrorMessage);
    socket.on("room-expired", handleRoomExpired);

    return () => {
      socket.off("room-deleted", handleRoomDeleted);
      socket.off("player-left", handlePlayerLeft);
      socket.off("host-left", handleHostLeft);
      socket.off("room-updated", handleRoomUpdated);
      socket.off("rejoin-success", handleRejoinSuccess);
      socket.off("error-message", handleErrorMessage);
      socket.off("room-expired", handleRoomExpired);
    };
  }, [navigate, resetRoom, setRoom, setPlayer, player?.id, isJoining]);

  // Room access logic - runs once per room change
  useEffect(() => {
    const handleRoomAccess = async () => {
      // Prevent multiple executions
      if (processedRef.current || isJoining) {
        return;
      }

      if (!roomId) {
        navigate("/");
        return;
      }

      // If already in correct room and ready, nothing to do
      if (player && room && currentRoomId === roomId && isReady) {
        console.log("Already in correct room and ready");
        return;
      }

      processedRef.current = true;
      setIsJoining(true);

      try {
        // Fetch current room state
        console.log(`Fetching room data for ${roomId}`);
        const roomResponse = await apiClient.get(`${ROOM_ROUTE}/${roomId}`);
        const roomData = roomResponse.data;

        if (!roomData) {
          throw new Error("Room not found");
        }

        // Check if we have a player and they're still in the room
        if (player) {
          const playerInRoom = roomData.players.find((p) => p.id === player.id);

          if (playerInRoom) {
            // Rejoin existing player
            console.log(
              `Rejoining room ${roomId} as existing player ${player.id}`
            );
            setRoom(roomData);
            setPlayer(playerInRoom);
            socket.emit("rejoin-room", {
              roomId: roomId.toUpperCase(),
              player: playerInRoom,
            });
            setIsJoining(false);
            return;
          } else {
            // Player was removed, reset and continue as new player
            console.log("Player no longer in room, joining as new player");
            resetRoom();
          }
        }

        // New player join
        console.log(`Joining room ${roomId} as new player`);

        if (
          roomData.isLocked &&
          roomData.players.length >= roomData.maxPlayers
        ) {
          throw new Error("Room is full");
        }

        // Generate new player
        const playerId = nanoid(8);
        const newPlayer = {
          id: playerId,
          name: "",
          isHost: false,
          ready: false,
        };

        // Validate with backend
        await apiClient.post(ROOM_JOIN_ROUTE, {
          roomId: roomId.toUpperCase(),
          playerId: playerId,
        });

        // Set player and emit join
        setPlayer(newPlayer);
        socket.emit("join-room", {
          roomId: roomId.toUpperCase(),
          player: newPlayer,
        });

        // Wait for room update to set ready state
        console.log(`Join initiated for player ${playerId}`);
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message;
        console.error("Failed to access room:", errorMessage);
        alert(`Cannot join room: ${errorMessage}`);
        resetRoom();
        navigate("/");
      } finally {
        setIsJoining(false);
      }
    };

    handleRoomAccess();
  }, [roomId]); // Only depend on roomId to prevent re-execution

  // Reset processed flag when room changes
  useEffect(() => {
    processedRef.current = false;
    setIsReady(false);
  }, [roomId]);

  // Set ready when we have both player and room for the correct room
  useEffect(() => {
    if (player && room && currentRoomId === roomId && !isReady) {
      const playerInRoom = room.players.find((p) => p.id === player.id);
      if (playerInRoom) {
        setIsReady(true);
      }
    }
  }, [player, room, currentRoomId, roomId, isReady]);

  if (!isReady || !player || !room || currentRoomId !== roomId) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 text-white">
        <div className="w-full max-w-md text-center">
          {/* Main Loading Animation */}
          <div className="mb-8">
            <div className="relative">
              {/* Animated Logo/Title */}
              <h1 className="text-4xl font-bold mb-4 font-['IndieSellout']">
                <span className="inline-block animate-pulse">R</span>
                <span
                  className="inline-block animate-pulse"
                  style={{ animationDelay: "0.1s" }}
                >
                  e
                </span>
                <span
                  className="inline-block animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                >
                  c
                </span>
                <span
                  className="inline-block animate-pulse"
                  style={{ animationDelay: "0.3s" }}
                >
                  k
                </span>
                <span
                  className="inline-block animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                >
                  o
                </span>
                <span
                  className="inline-block animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                >
                  n
                </span>
                <span
                  className="inline-block animate-pulse"
                  style={{ animationDelay: "0.6s" }}
                >
                  M
                </span>
                <span
                  className="inline-block animate-pulse"
                  style={{ animationDelay: "0.7s" }}
                >
                  e
                </span>
              </h1>

              {/* Loading Spinner with Theme */}
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-4 rounded-full border-white/20"></div>
                <div className="absolute inset-0 border-4 border-transparent rounded-full border-t-white animate-spin"></div>
                <div
                  className="absolute inset-2 border-2 border-transparent border-r-[#4D4C7D] rounded-full animate-spin"
                  style={{
                    animationDirection: "reverse",
                    animationDuration: "1.5s",
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Status Message with Theme Styling */}
          <div className="px-6 py-4 rounded-lg bg-transparent font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white] mb-6">
            <div className="text-2xl font-bold mb-2 font-['IndieSellout']">
              {isJoining ? "🚪 Joining Room" : "⚡ Setting Up"}
            </div>
            <div className="text-lg text-white/80">
              {isJoining
                ? "Getting you connected..."
                : "Preparing your experience..."}
            </div>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center mb-8 space-x-2">
            <div className="w-3 h-3 rounded-full bg-white/60 animate-bounce"></div>
            <div
              className="w-3 h-3 rounded-full bg-white/60 animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-3 h-3 rounded-full bg-white/60 animate-bounce"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>

          {/* Debug Info in Theme Style */}
          <div className="space-y-3">
            <div className="px-4 py-2 rounded-lg bg-transparent text-sm font-bold text-white/60 border-0 border-b transition-all shadow-[2px_2px_0px_rgba(255,255,255,0.3)]">
              <span className="text-[#4D4C7D]">Room:</span>{" "}
              {roomId || "Loading..."}
            </div>

            <div className="px-4 py-2 rounded-lg bg-transparent text-sm font-bold text-white/60 border-0 border-b transition-all shadow-[2px_2px_0px_rgba(255,255,255,0.3)]">
              <span className="text-[#4D4C7D]">Player:</span>{" "}
              {player ? player.id.slice(0, 8) + "..." : "Creating..."}
            </div>

            <div className="px-4 py-2 rounded-lg bg-transparent text-sm font-bold text-white/60 border-0 border-b transition-all shadow-[2px_2px_0px_rgba(255,255,255,0.3)]">
              <span className="text-[#4D4C7D]">Status:</span>{" "}
              {room
                ? `Connected (${room.players?.length || 0} players)`
                : "Connecting..."}
            </div>
          </div>

          {/* Fun Loading Messages */}
          <div className="mt-8 text-white/50 text-sm font-['IndieSellout']">
            <div className="animate-pulse">
              {isJoining
                ? "Knock knock... who's there? You!"
                : "Almost ready to guess some answers!"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default RoomAccessHandler;
