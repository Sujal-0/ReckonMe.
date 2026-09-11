import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import { apiClient } from "@/lib/api-client";
import useRoomStore from "@/store/roomStore";
import { useAppStore } from "@/store";
import useUserStore from "@/store/userStore";
import socket from "@/lib/socket";
import { ROOM_JOIN_ROUTE } from "@/utils/constants";
import { ReckonLoader } from "@/components/ui/ReckonLoader";

const SpringModal = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const { setRoom, setPlayer, setError: setGlobalError } = useRoomStore();
  const { userInfo } = useAppStore();
  const { globalName, globalAvatarSeed, initializeAvatar } = useUserStore();

  useEffect(() => {
    // Ensure anonymous users have an avatar seed
    if (!userInfo) {
      initializeAvatar();
    }
  }, [userInfo, initializeAvatar]);

  const handleError = (message) => {
    console.error("Socket error:", message);
    setError(message);
    setCreating(false);
    setJoining(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    socket.on("error-message", handleError);
    return () => {
      socket.off("error-message", handleError);
    };
  }, [isOpen]);

  // ✅ Create Room with Acknowledgements
  const handleCreateRoom = () => {
    setCreating(true);
    setError("");

    const roomId = nanoid(5).toUpperCase();
    const playerId = nanoid(8);
    const effectiveName = userInfo ? userInfo.username : globalName;
    const effectiveAvatarSeed = userInfo ? (userInfo.avatarSeed || userInfo.username) : globalAvatarSeed;

    const player = {
      id: playerId,
      name: effectiveName || "",
      avatarSeed: effectiveAvatarSeed || playerId,
      userId: userInfo ? userInfo.id : null,
      isHost: true,
      ready: false,
    };

    setPlayer(player);

    socket.emit("create-room", { roomId, player }, (response) => {
      setTimeout(() => {
        if (response?.error) {
          setError(response.error);
          setCreating(false);
        } else if (response?.success && response.room) {
          setRoom(response.room);
          navigate(`/lobby/${response.room.roomId}`);
        }
      }, 1800);
    });
  };

  // ✅ Join Room with Acknowledgements
  const handleJoinGame = async (optionalCode) => {
    const code = typeof optionalCode === 'string' ? optionalCode : roomCode;

    if (!code || code.length !== 5) {
      setError("Please enter a valid 5-digit code");
      return;
    }

    try {
      setJoining(true);
      setError("");

      const playerId = nanoid(8);
      const effectiveName = userInfo ? userInfo.username : globalName;
      const effectiveAvatarSeed = userInfo ? (userInfo.avatarSeed || userInfo.username) : globalAvatarSeed;

      const player = {
        id: playerId,
        name: effectiveName || "",
        avatarSeed: effectiveAvatarSeed || playerId,
        userId: userInfo ? userInfo.id : null,
        isHost: false,
        ready: false,
      };

      setPlayer(player);

      // Optional: validate via REST first
      const resp = await apiClient.post(ROOM_JOIN_ROUTE, {
        roomId: code,
        playerId,
        playerName: "",
      });

      if (resp.data.error) {
        setError(resp.data.error);
        setJoining(false);
        return;
      }

      socket.emit("join-room", { roomId: code, player }, (response) => {
        setTimeout(() => {
          if (response?.error) {
            setError(response.error);
            setJoining(false);
          } else if (response?.success && response.room) {
            setRoom(response.room);
            navigate(`/lobby/${response.room.roomId}`);
          }
        }, 1800);
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to join room");
      setJoining(false);
    }
  };

  const handleCodeChange = (e) => {
    const val = e.target.value.toUpperCase();
    setRoomCode(val);
    if (val.length === 5) {
      handleJoinGame(val);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {creating && (
            <ReckonLoader 
              isOverlay={true} 
              texts={["CONNECTING TO SERVER...", "GENERATING ROOM CODE...", "PREPARING LOBBY..."]} 
              speed={600} 
            />
          )}
          {joining && (
            <ReckonLoader 
              isOverlay={true} 
              texts={["CONNECTING TO SERVER...", "FINDING LOBBY...", "JOINING ROOM..."]} 
              speed={600} 
            />
          )}
          {!(creating || joining) && (
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
            className="relative w-full max-w-md p-8 overflow-hidden text-white shadow-xl cursor-default bg-gradient-to-br from-black/80 to-black sketchy-shape border-4 border-white"
          >
            <div className="relative z-10 space-y-6">
              <h3 className="text-2xl font-medium text-center font-cabana">
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
              <form onSubmit={(e) => { e.preventDefault(); handleJoinGame(); }} className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={5}
                    autoComplete="off"
                    spellCheck="false"
                    value={roomCode}
                    onChange={handleCodeChange}
                    placeholder="CODE..."
                    className="flex-1 px-4 py-2 rounded-none bg-transparent uppercase text-2xl font-bold text-white placeholder-white/50 focus:outline-none border-2 border-white transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-cabana"
                    disabled={creating || joining}
                  />
                  <button
                    type="submit"
                    disabled={joining || creating || roomCode.length !== 5}
                    className="px-6 py-2 font-medium bg-[#0A0A0A] text-[#ffffff] text-xl w-fit transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] font-['IndieSellout'] disabled:opacity-50"
                  >
                    {joining ? "JOINING..." : "JOIN GAME"}
                  </button>
                </div>

                {error && <p className="text-center text-red-400">{error}</p>}
              </form>

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
        </>
      )}
    </AnimatePresence>
  );
};

export default SpringModal;
