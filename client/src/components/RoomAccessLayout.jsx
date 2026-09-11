// client/src/components/RoomAccessLayout.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Outlet } from "react-router-dom";
import { nanoid } from "nanoid";
import useRoomStore from "@/store/roomStore";
import { useAppStore } from "@/store";
import { apiClient } from "@/lib/api-client";
import { ROOM_ROUTE, ROOM_JOIN_ROUTE } from "@/utils/constants";
import socket from "@/lib/socket";
import { toast } from "sonner";
import { ReckonLoader } from "@/components/ui/ReckonLoader";

const RoomAccessLayout = () => {
  const { code: roomId } = useParams();
  const navigate = useNavigate();
  const { player, room, setRoom, setPlayer, getRoomId, resetRoom } = useRoomStore();
  const { userInfo } = useAppStore();
  const currentRoomId = getRoomId();
  const [isJoining, setIsJoining] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const processedRef = useRef(false);

  // Removed browser navigation interceptors to allow seamless reload

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
      toast.error(message);
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
      toast.error(message);
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
          name: userInfo?.username || "",
          userId: userInfo?.id || null,
          avatarSeed: userInfo?.avatarSeed || playerId,
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
        toast.error(`Cannot join room: ${errorMessage}`);
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
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-white bg-transparent">
        <ReckonLoader text={isJoining ? "Joining Room..." : "Setting Up..."} />
      </div>
    );
  }

  return <Outlet />;
};

export default RoomAccessLayout;
