"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  Dispatch,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { io, Socket } from "socket.io-client";
import { LoginRequest, LoginResponse } from "@/type/login";
import { ChatMessage } from "@/type/chat-message";
import { Group } from "@/type/group";

interface AppContextType {
  tag: string | null;
  username: string | null;
  onlineUsers: string[];
  userGroups: Group[];
  typingUsers: Record<string, boolean>;
  browserId: string;
  chatHistory: Record<string, ChatMessage[]>;
  setChatHistory: Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  socket: Socket | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tag, setTagState] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [browserId, setBrowserId] = useState<string>("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>(
    {
      "": [
        {
          id: "1",
          from: "system",
          to: "",
          text: "Welcome to the chat! Select a user to start chatting or use broadcast to message everyone.",
          timestamp: Date.now(),
          type: "text",
        },
      ],
    },
  );

  useEffect(() => {
    // Initialize state from localStorage in useEffect to avoid SSR issues
    if (typeof window !== "undefined") {
      setTagState(localStorage.getItem("user_tag"));
      setUsernameState(localStorage.getItem("user_username"));

      const storedBrowserId = localStorage.getItem("app_browser_id");
      if (storedBrowserId) {
        setBrowserId(storedBrowserId);
      } else {
        // Generate a new browser ID if none exists
        const newBrowserId = uuidv4();
        localStorage.setItem("app_browser_id", newBrowserId);
        setBrowserId(newBrowserId);
      }
    }
  }, []);

  useEffect(() => {
    // Initialize Socket.io connection
    const socketInstance = io();
    socketInstance.on("connect", () => {
      console.log("Socket connected");
    });
    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
    });
    socketInstance.on("error", (error) => {
      console.error("Socket error:", error);
    });

    socketInstance.on("groups", (groups: Group[]) => {
      setUserGroups(groups);
    });

    socketInstance.on("clients", (users: string[]) => {
      setOnlineUsers(users);
    });

    socketInstance.on("typing", ({ username }: { username: string }) => {
      setTypingUsers((prev) => ({ ...prev, [username]: true }));
    });

    socketInstance.on("stop_typing", ({ username }: { username: string }) => {
      setTypingUsers((prev) => ({ ...prev, [username]: false }));
    });

    socketInstance.on("message", (data: ChatMessage) => {
      setChatHistory((prev) => ({
        ...prev,
        [data.to]: [...(prev[data.to] || []), data],
      }));
    });

    socketInstance.on(
      "chat_history",
      (data: { channel: string; messages: ChatMessage[] }) => {
        setChatHistory((prev) => ({
          ...prev,
          [data.channel]: data.messages,
        }));
      },
    );

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    // Ensure browser ID persists
    if (
      typeof window !== "undefined" &&
      browserId &&
      !localStorage.getItem("app_browser_id")
    ) {
      localStorage.setItem("app_browser_id", browserId);
    }
  }, [browserId]);

  const setTag = (newToken: string | null) => {
    setTagState(newToken);
    if (typeof window !== "undefined") {
      if (newToken) {
        localStorage.setItem("user_tag", newToken);
      } else {
        localStorage.removeItem("user_tag");
      }
    }
  };

  const setUsername = (newUsername: string | null) => {
    setUsernameState(newUsername);
    if (typeof window !== "undefined") {
      if (newUsername) {
        localStorage.setItem("user_username", newUsername);
      } else {
        localStorage.removeItem("user_username");
      }
    }
  };

  const login = async (username: string, password: string) => {
    const payload: LoginRequest = { username, password, browserId };
    return new Promise<LoginResponse>((resolve) => {
      if (socket) {
        socket.emit("join", payload, (ack: LoginResponse) => {
          if (ack.success) {
            setUsername(username);
            if (ack.tag) {
              setTag(ack.tag);
            }
          }
          resolve({ tag: ack.tag, success: ack.success, error: ack.error });
        });
      } else {
        resolve({ success: false, error: "Socket not initialized" });
      }
    });
  };

  const logout = () => {
    setTag(null);
    setUsername(null);
  };

  const value = {
    tag,
    username,
    browserId,
    onlineUsers,
    userGroups,
    chatHistory,
    setChatHistory,
    typingUsers,
    login,
    logout,
    socket,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export const useSocket = (): Socket | null => {
  const context = useApp();
  return context.socket;
};
