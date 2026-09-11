import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { sessionStore } from "./store/SessionStore.js";
import { registerRoomHandlers } from "./handlers/roomHandlers.js";
import { registerGameHandlers } from "./handlers/gameHandlers.js";
import { registerChatHandlers } from "./handlers/chatHandlers.js";

export default function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    }
  });

  // Setup Redis Adapter if Redis is enabled
  if (sessionStore.useRedis && sessionStore.redisClient) {
    const pubClient = sessionStore.redisClient;
    const subClient = pubClient.duplicate();
    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.IO Redis Adapter initialized');
    }).catch(err => {
      console.error('❌ Failed to initialize Redis Adapter', err);
    });
  }

  // Timer stores for this specific Node instance
  const roomTimers = new Map();
  const gameTimers = new Map();

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    // Register modular handlers
    const { handlePlayerLeave } = registerRoomHandlers(io, socket, roomTimers);
    registerGameHandlers(io, socket, gameTimers);
    registerChatHandlers(io, socket);

    socket.on("disconnect", async (reason) => {
      console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
      
      const session = await sessionStore.getSession(socket.id);
      if (!session) return;

      const { roomId, playerId } = session;
      console.log(`🔌 Player ${playerId} disconnected from room ${roomId}`);

      setTimeout(async () => {
        const currentSocketId = await sessionStore.getSocketId(playerId);
        if (!currentSocketId) {
          console.log(`⏰ Player ${playerId} didn't reconnect, removing from room ${roomId}`);
          await handlePlayerLeave(socket, roomId, playerId);
        }
      }, 30000);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  const cleanup = async () => {
    console.log("🛑 Server shutting down, clearing timers and session store");
    for (const { timeout, interval } of roomTimers.values()) {
      clearTimeout(timeout);
      clearInterval(interval);
    }
    for (const timer of gameTimers.values()) {
      clearTimeout(timer);
    }
    await sessionStore.close();
  };

  process.on("SIGTERM", cleanup);
  process.on("SIGINT", () => {
    cleanup().then(() => process.exit(0));
  });

  return io;
}