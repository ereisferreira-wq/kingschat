import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import logger from "../shared/utils/logger";

let io: SocketIOServer;

export function initSocket(httpServer: HttpServer) {
  const frontendUrl = process.env.FRONTEND_URL || "";
  const corsOrigins = frontendUrl
    ? frontendUrl.split(",").map(s => s.trim())
    : ["http://localhost:5173", "http://localhost:8080"];

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const { companyId, userId } = socket.handshake.query;

    if (companyId) {
      socket.join(`company:${companyId}`);
    }

    socket.on("joinCompany", (cid: string | number) => {
      socket.join(`company:${cid}`);
    });

    socket.on("disconnect", () => {
      // cleanup if needed
    });
  });

  logger.info("Socket.IO initialized");
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
}

export function emitToCompany(companyId: number, event: string, data: any) {
  if (io) {
    io.to(`company:${companyId}`).emit(event, data);
  }
}
