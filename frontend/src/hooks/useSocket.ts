import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../stores/authStore";

const SOCKET_URL = "";

let globalSocket: Socket | null = null;

export function useSocket(event: string, handler: (data: any) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const companyId = useAuthStore((s) => s.user?.company?.id);

  useEffect(() => {
    if (!companyId) return;

    if (!globalSocket) {
      globalSocket = io(SOCKET_URL, {
        query: { companyId },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });
    }

    return () => {};
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !globalSocket) return;

    const fullEvent = `company:${companyId}:${event}`;

    const listener = (data: any) => handlerRef.current(data);
    globalSocket.on(fullEvent, listener);

    return () => {
      globalSocket?.off(fullEvent, listener);
    };
  }, [companyId, event]);
}
