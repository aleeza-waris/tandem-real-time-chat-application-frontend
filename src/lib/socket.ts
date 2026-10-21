"use client";

import { io, type Socket } from "socket.io-client";
import { getSessionToken } from "./session";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || apiUrl.replace(/\/api\/?$/, "");
    socket = io(socketUrl, {
      auth: (callback) => callback({ token: getSessionToken() }),
      autoConnect: false
    });
  }
  return socket;
}
