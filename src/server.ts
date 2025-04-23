import "dotenv/config";
import next from "next";
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { ChatMessage } from "@/type/chat-message";
import {
  storeUserConnection,
  sendBroadcastHistory,
  sendDirectMessageHistory,
  joinUserToGroups,
  handleBroadcastMessage,
  handleGroupMessage,
  handleDirectMessage,
  createGroup,
  handleJoinGroup,
  sendRequestedChatHistory,
  handleDisconnection,
  broadcastClients,
  broadcastGroups,
} from "./lib/functions";
import { LoginRequest } from "./type/login";
import {
  CHAT_HISTORY,
  CONNECTED_USERTAG,
  DIRECT_MESSAGE_HISTORY,
  GROUPS,
  SOCKET_BY_USERTAG,
} from "./lib/database";

const app = next({ dev: process.env.NODE_ENV !== "production" });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer(handle);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    // Handle user joining
    socket.on(
      "join",
      ({ username, password, browserId }: LoginRequest, callback) => {
        // Store user connection
        const ack = storeUserConnection(
          socket.id,
          username,
          password,
          browserId,
        );

        if (!ack.success) {
          callback({ success: false, error: ack.error });
          return;
        }
        console.log(
          `${username}#${ack.tag} joined with socket ID ${socket.id}`,
        );

        // Join socket rooms for groups this user is a member of
        callback({ success: true, tag: ack.tag });

        // Send broadcast chat history
        sendBroadcastHistory(socket, CHAT_HISTORY);

        // Send direct message history for this user
        sendDirectMessageHistory(
          socket,
          username,

          DIRECT_MESSAGE_HISTORY,
        );

        joinUserToGroups(socket, username, GROUPS, CHAT_HISTORY);
        broadcastClients(io);
        broadcastGroups(io);
      },
    );

    socket.on("clients", (_, callback) => {
      const clientList = Array.from(CONNECTED_USERTAG.values());
      callback(clientList);
    });

    socket.on("send_message", (message: ChatMessage) => {
      const senderUsername = CONNECTED_USERTAG.get(socket.id);
      if (!senderUsername) return;

      message.timestamp = Date.now(); // Add server timestamp
      console.log("Message received:", message);

      if (!message.to) {
        // Broadcast message to all users except sender
        handleBroadcastMessage(socket, message, CHAT_HISTORY);
      } else if (GROUPS.has(message.to)) {
        // Group message
        handleGroupMessage(
          socket,
          message,
          senderUsername,
          GROUPS,
          CHAT_HISTORY,
        );
      } else {
        // Direct message to a specific user
        handleDirectMessage(
          io,
          message,
          senderUsername,
          SOCKET_BY_USERTAG,
          DIRECT_MESSAGE_HISTORY,
        );
      }
    });

    // Handle group creation
    socket.on(
      "create_group",
      (groupData: { groupName: string; members: string[] }) => {
        const creatorUsername = CONNECTED_USERTAG.get(socket.id);
        if (!creatorUsername) return;

        console.log("Creating group:", groupData);
        createGroup(
          io,
          socket,
          creatorUsername,
          groupData,
          GROUPS,
          SOCKET_BY_USERTAG,
        );
      },
    );

    // Handle user joining a group
    socket.on("join_group", (groupName: string) => {
      const username = CONNECTED_USERTAG.get(socket.id);
      if (!username) return;

      handleJoinGroup(io, socket, username, groupName, GROUPS);
    });

    // Add a new event handler for requesting chat history
    socket.on("request_chat_history", ({ channel }) => {
      const username = CONNECTED_USERTAG.get(socket.id);
      if (!username) return;

      sendRequestedChatHistory(
        socket,
        username,
        channel,
        GROUPS,
        CHAT_HISTORY,
        DIRECT_MESSAGE_HISTORY,
      );
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      const username = CONNECTED_USERTAG.get(socket.id);
      if (username) {
        handleDisconnection(io, socket.id, username);
      }
    });
  });

  io.on("error", (error) => {
    console.error("Socket error:", error);
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(
      `> Ready on http://localhost:${PORT} - ${process.env.NODE_ENV}`,
    );
  });
});
