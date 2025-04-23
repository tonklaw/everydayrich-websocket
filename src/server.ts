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
  CHAT_THEME,
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
        sendBroadcastHistory(socket);

        // Send direct message history for this user
        sendDirectMessageHistory(socket, username);

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
        handleBroadcastMessage(io, message);
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
          socket,
          message,
          senderUsername,
          SOCKET_BY_USERTAG,
          DIRECT_MESSAGE_HISTORY,
        );
      }
    });

    socket.on("groups", (_, callback) => {
      const groupList = Array.from(GROUPS.values());
      callback(groupList);
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

    socket.on("theme", ({ channel, idx }: { channel: string; idx: number }) => {
      const username = CONNECTED_USERTAG.get(socket.id);
      if (!username) return;

      if (channel === "") {
        // Handle broadcast theme change
        CHAT_THEME.set("", idx);
        io.emit("theme", { channel, idx });
      } else if (GROUPS.has(channel)) {
        // Handle group theme change
        CHAT_THEME.set(channel, idx);
        GROUPS.get(channel)!.theme = idx;
        io.to(channel).emit("theme", { channel, idx });
      } else {
        CHAT_THEME.set(channel, idx);
        io.emit("theme", { channel, idx });
      }
    });
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

    socket.on("typing", ({ channel }: { channel: string }) => {
      const username = CONNECTED_USERTAG.get(socket.id);
      if (!username) return;
      console.log(username, "is typing");
      socket.broadcast.emit("typing", { username, channel });
    });

    socket.on("stop_typing", ({ channel }: { channel: string }) => {
      const username = CONNECTED_USERTAG.get(socket.id);
      if (!username) return;
      console.log(username, "is not typing");
      socket.broadcast.emit("stop_typing", { username, channel });
    });

    socket.on(
      "edit_message",
      (data: { channel: string; message: ChatMessage }) => {
        const username = CONNECTED_USERTAG.get(socket.id);
        if (!username) return;

        const { channel, message } = data;
        console.log("Edit message", message, channel);
        const chatHistory =
          channel === ""
            ? CHAT_HISTORY.get("broadcast")
            : CHAT_HISTORY.get(channel);
        if (!chatHistory) return;
        const messageIndex = chatHistory.findIndex(
          (msg) => msg.id === message.id,
        );
        if (messageIndex !== -1) {
          chatHistory[messageIndex].edited = true;
          chatHistory[messageIndex].text = message.text;
          CHAT_HISTORY.set(channel, chatHistory);
          socket.emit("chat_history", { channel, message: chatHistory });
          socket.broadcast.emit("chat_history", {
            channel,
            messages: chatHistory,
          });
        }
      },
    );

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
