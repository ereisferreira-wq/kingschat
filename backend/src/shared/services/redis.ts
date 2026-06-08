import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        return new Error("Max Redis reconnection attempts reached");
      }
      return Math.min(retries * 100, 500);
    },
    connectTimeout: 2000,
  },
});

redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.on("connect", () => console.log("Connected to Redis"));

let connected = false;

export async function connectRedis() {
  if (!connected) {
    await redisClient.connect();
    connected = true;
  }
  return redisClient;
}

export function getRedis() {
  return redisClient;
}

export default redisClient;
