import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import { apiClient } from "@/lib/api-client";
import useRoomStore from "@/store/roomStore";
import socket from "@/lib/socket"; // ✅ use single shared socket
import { ROOM_JOIN_ROUTE } from "@/utils/constants";

const SpringModal = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const { setRoom, setPlayer, setError: setGlobalError } = useRoomStore();

  const handleError = (message) => {
    console.error("Socket error:", message);
    setError(message);
    setCreating(false); // Use setCreating instead of setLoading
    setJoining(false); // Also reset joining state
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleRoomUpdated = (updatedRoom) => {
      console.log("Room updated:", updatedRoom);
      setRoom(updatedRoom);
      setIsOpen(false);
      setCreating(false);
      setJoining(false);
      navigate(`/lobby/${updatedRoom.roomId}`);
    };

    socket.on("room-updated", handleRoomUpdated);
    socket.on("error-message", handleError);

    return () => {
      socket.off("room-updated", handleRoomUpdated);
      socket.off("error-message", handleError);
    };
  }, [isOpen, setRoom, setIsOpen, navigate]);

  // ✅ Create Room
  const handleCreateRoom = async () => {
    try {
      setCreating(true);
      setError("");

      // Generate IDs
      const roomId = nanoid(5).toUpperCase();
      const playerId = nanoid(8);
      const player = {
        id: playerId,
        name: "",
        isHost: true,
        ready: false,
      };

      // Set player in store immediately
      setPlayer(player);

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Room creation timed out")), 5000);
      });

      // Emit socket event and wait for response
      socket.emit("create-room", { roomId, player });

      // Wait for either room update or timeout
      const roomUpdatePromise = new Promise((resolve) => {
        const handleRoomCreated = (room) => {
          socket.off("error-message", handleError);
          resolve(room);
        };

        const handleError = (error) => {
          socket.off("room-updated", handleRoomCreated);
          throw new Error(error);
        };

        socket.once("room-updated", handleRoomCreated);
        socket.once("error-message", handleError);
      });

      await Promise.race([roomUpdatePromise, timeoutPromise]);
    } catch (err) {
      console.error("Create room failed:", err);
      setError(err.message || "Failed to create room. Try again.");
      setCreating(false);
    }
  };

  // ✅ Join Room
  const handleJoinGame = async () => {
    if (!roomCode || roomCode.length !== 5) {
      setError("Please enter a valid 5-digit code");
      return;
    }

    try {
      setJoining(true);
      setError("");

      const playerId = nanoid(8);
      const player = {
        id: playerId,
        name: "",
        isHost: false,
        ready: false,
      };

      // Set player in store immediately
      setPlayer(player);

      // Optional: validate via REST first
      const resp = await apiClient.post(ROOM_JOIN_ROUTE, {
        roomId: roomCode.toUpperCase(),
        playerId,
        playerName: "",
      });

      if (resp.data.error) {
        setError(resp.data.error);
        setLoading(false);
        return;
      }

      // Emit socket join event
      socket.emit("join-room", {
        roomId: roomCode.toUpperCase(),
        player,
      });

      console.log(
        `Joining room ${roomCode.toUpperCase()} with player:`,
        player
      );
    } catch (err) {
      console.error("Join failed:", err);
      setError("Invalid or full room. Try again.");
      setJoining(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 grid p-8 overflow-y-scroll cursor-pointer bg-slate-900/40 backdrop-blur place-items-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: "12.5deg" }}
            animate={{ scale: 1, rotate: "0deg" }}
            exit={{ scale: 0, rotate: "0deg" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md p-8 overflow-hidden text-white shadow-xl cursor-default bg-gradient-to-br from-black/80 to-black rounded-2xl"
          >
            <div className="relative z-10 space-y-6">
              <h3 className="text-4xl font-medium text-center">
                Create a game to play with your friends and guess their answers!
              </h3>

              {/* Create Game Button */}
              <button
                className="px-10 py-2 font-medium bg-[#0A0A0A] text-[#ffffff] text-2xl w-full transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-['IndieSellout']"
                onClick={handleCreateRoom}
                disabled={creating || joining}
              >
                {creating ? "CREATING..." : "CREATE GAME"}
              </button>

              {/* Join Game Section */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={5}
                    autoComplete="off"
                    spellCheck="false"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="CODE..."
                    className="flex-1 px-4 py-2 rounded-lg bg-transparent uppercase text-2xl font-bold text-white placeholder-white/50 focus:outline-none border-0 border-b-2 transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-['IndieSellout']"
                    disabled={creating || joining}
                  />
                  <button
                    onClick={handleJoinGame}
                    disabled={joining || creating || !roomCode}
                    className="px-8 py-2 font-medium bg-[#0A0A0A] text-[#ffffff] text-2xl w-fit transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-['IndieSellout'] disabled:opacity-50"
                  >
                    {joining ? "JOINING..." : "JOIN GAME"}
                  </button>
                </div>

                {error && <p className="text-center text-red-400">{error}</p>}
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="block mx-auto mt-4 text-2xl text-white/70 hover:text-white"
                disabled={creating || joining}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SpringModal;
