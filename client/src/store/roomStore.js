// src/store/roomStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useRoomStore = create(
  persist(
    (set, get) => ({
      // Room data
      room: null, // Full room object from server
      player: null, // Current player { id, name, isHost, ready }
      timer: 300, // 5 minutes in seconds
      error: null,

      // Actions
      setRoom: (room) =>
        set((state) => {
          if (!room || !state.player) return { room, error: null };

          const updatedPlayer = room.players?.find(
            (p) => p.id === state.player.id
          );
          if (updatedPlayer) {
            // If host status changed, update player
            if (updatedPlayer.isHost !== state.player.isHost) {
              return {
                room,
                player: updatedPlayer,
                error: null,
              };
            }
          }

          return { room, error: null };
        }),

      setPlayer: (player) =>
        set((state) => ({
          player,
          // Don't automatically update room players - let socket events handle that
          error: null,
        })),

      setTimer: (timer) => set({ timer }),
      setError: (error) => set({ error }),

      // Update player in both local state and room
      updatePlayer: (updatedPlayer) =>
        set((state) => {
          const newRoom = state.room
            ? {
                ...state.room,
                players: state.room.players.map((p) =>
                  p.id === updatedPlayer.id ? { ...p, ...updatedPlayer } : p
                ),
              }
            : null;

          return {
            player: updatedPlayer,
            room: newRoom,
          };
        }),

      // Update room and sync player data
      updateRoom: (updatedRoom) =>
        set((state) => {
          let updatedPlayer = state.player;

          // If we have a player and the room has players, sync the player data
          if (state.player && updatedRoom?.players) {
            const serverPlayer = updatedRoom.players.find(
              (p) => p.id === state.player.id
            );
            if (serverPlayer) {
              updatedPlayer = serverPlayer;
            }
          }

          return {
            room: updatedRoom,
            player: updatedPlayer,
          };
        }),

      // Computed getters (derive from room)
      getRoomId: () => {
        const state = get();
        return state.room?.roomId || null;
      },

      getPlayers: () => {
        const state = get();
        return state.room?.players || [];
      },

      // Check if current player is host
      isCurrentPlayerHost: () => {
        const state = get();
        return state.player?.isHost || false;
      },

      // Get current player data from room
      getCurrentPlayerFromRoom: () => {
        const state = get();
        if (!state.player || !state.room?.players) return null;
        return state.room.players.find((p) => p.id === state.player.id) || null;
      },

      // Reset all room data
      resetRoom: () =>
        set({
          room: null,
          player: null,
          timer: 300,
          error: null,
        }),

      // Clear errors
      clearError: () => set({ error: null }),

      // Initialize or update player with better validation
      initializePlayer: (playerData) =>
        set((state) => {
          // Validate required player fields
          if (!playerData || !playerData.id) {
            console.error("Invalid player data provided to initializePlayer");
            return state;
          }

          const validatedPlayer = {
            id: playerData.id,
            name: playerData.name || "",
            isHost: playerData.isHost || false,
            ready: playerData.ready || false,
            ...playerData, // Allow other fields
          };

          return { player: validatedPlayer };
        }),

      // Safe room update that preserves player consistency
      safeUpdateRoom: (roomData) =>
        set((state) => {
          if (!roomData) return state;

          let updatedPlayer = state.player;

          // If we have a current player, make sure they still exist in the room
          if (state.player && roomData.players) {
            const playerInRoom = roomData.players.find(
              (p) => p.id === state.player.id
            );

            if (playerInRoom) {
              // Player exists in room, use server version
              updatedPlayer = playerInRoom;
            } else if (state.player) {
              // Player was removed from room - this shouldn't happen in normal flow
              console.warn(
                "Player no longer in room during update:",
                state.player.id
              );
              updatedPlayer = null;
            }
          }

          return {
            room: roomData,
            player: updatedPlayer,
            error: null, // Clear any errors on successful room update
          };
        }),

      // Add specific action for host promotion
      promoteToHost: () =>
        set((state) => ({
          player: state.player ? { ...state.player, isHost: true } : null,
          room: state.room
            ? {
                ...state.room,
                players: state.room.players.map((p) =>
                  p.id === state.player?.id
                    ? { ...p, isHost: true }
                    : { ...p, isHost: false }
                ),
              }
            : null,
        })),
    }),
    {
      name: "room-store", // unique name for localStorage key
      partialize: (state) => ({
        // Only persist essential data that should survive page refresh
        player: state.player,
        room: state.room,
      }),
      version: 1, // for migration if needed later
    }
  )
);

export default useRoomStore;