"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { io, Socket } from "socket.io-client";
import { LoginRequest, LoginResponse } from "@/type/login";

interface AppContextType {
  token: string | null;
  browserId: string;
  setTag: (token: string | null) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  socket: Socket | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tag, setTagState] = useState<string | null>(null);
  const [browserId, setBrowserId] = useState<string>("");
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize state from localStorage in useEffect to avoid SSR issues
    if (typeof window !== "undefined") {
      setTagState(localStorage.getItem("app_token"));

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
        localStorage.setItem("app_token", newToken);
      } else {
        localStorage.removeItem("app_token");
      }
    }
  };

  const login = async (username: string, password: string) => {
    const payload: LoginRequest = { username, password, browserId };
    return new Promise<boolean>((resolve) => {
      if (socket) {
        socket.emit("join", payload, (ack: LoginResponse) => {
          if (ack.success) {
            if (ack.tag) setTag(ack.tag);
          }
          resolve(ack.success);
        });
      } else {
        resolve(false);
      }
    });
  };

  const logout = () => {
    setTag(null);
  };

  const value = {
    token: tag,
    browserId,
    setTag,
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
