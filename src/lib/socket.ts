"use client";
// This file is responsible for creating and managing the WebSocket connection to the server using Socket.IO. It exports a function getSocket that returns a singleton instance of the Socket.IO client. The socket is initialized with the server URL and some options, such as withCredentials and autoConnect. The socket instance can be used throughout the application to emit and listen for events related to real-time communication, such as joining conversations, sending messages, and updating presence status.
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
      withCredentials: true,
      autoConnect: false
    });
  }
  return socket;
}
