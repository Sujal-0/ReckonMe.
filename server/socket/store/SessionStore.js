import { createClient } from 'redis';

// Determine if we should use Redis based on environment
const USE_REDIS = process.env.REDIS_URL || process.env.USE_REDIS === 'true';

class SessionStore {
  constructor() {
    this.useRedis = USE_REDIS;
    
    // In-memory fallbacks
    this.socketPlayerMap = new Map();
    this.playerSocketMap = new Map();

    if (this.useRedis) {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err) => console.log('Redis Client Error', err));
      
      this.redisClient.connect().then(() => {
        console.log('✅ Connected to Redis Session Store');
      }).catch(err => {
        console.error('❌ Failed to connect to Redis. Falling back to in-memory.', err);
        this.useRedis = false;
      });
    } else {
      console.log('⚠️ Using In-Memory Session Store (Not for production)');
    }
  }

  async setSession(socketId, sessionData) {
    if (this.useRedis) {
      await this.redisClient.hSet(`socket:${socketId}`, sessionData);
      await this.redisClient.set(`playerSocket:${sessionData.playerId}`, socketId);
    } else {
      this.socketPlayerMap.set(socketId, sessionData);
      this.playerSocketMap.set(sessionData.playerId, socketId);
    }
  }

  async getSession(socketId) {
    if (this.useRedis) {
      const data = await this.redisClient.hGetAll(`socket:${socketId}`);
      return Object.keys(data).length === 0 ? undefined : data;
    } else {
      return this.socketPlayerMap.get(socketId);
    }
  }

  async getSocketId(playerId) {
    if (this.useRedis) {
      return await this.redisClient.get(`playerSocket:${playerId}`);
    } else {
      return this.playerSocketMap.get(playerId);
    }
  }

  async deleteSession(socketId) {
    if (this.useRedis) {
      const session = await this.getSession(socketId);
      if (session && session.playerId) {
        await this.redisClient.del(`playerSocket:${session.playerId}`);
      }
      await this.redisClient.del(`socket:${socketId}`);
    } else {
      const session = this.socketPlayerMap.get(socketId);
      if (session) {
        this.playerSocketMap.delete(session.playerId);
      }
      this.socketPlayerMap.delete(socketId);
    }
  }

  async deletePlayerSession(playerId) {
    if (this.useRedis) {
      const socketId = await this.getSocketId(playerId);
      if (socketId) {
        await this.redisClient.del(`socket:${socketId}`);
        await this.redisClient.del(`playerSocket:${playerId}`);
      }
    } else {
      const socketId = this.playerSocketMap.get(playerId);
      if (socketId) {
        this.socketPlayerMap.delete(socketId);
      }
      this.playerSocketMap.delete(playerId);
    }
  }

  // Graceful shutdown
  async close() {
    if (this.useRedis) {
      await this.redisClient.quit();
    } else {
      this.socketPlayerMap.clear();
      this.playerSocketMap.clear();
    }
  }
}

export const sessionStore = new SessionStore();
