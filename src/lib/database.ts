import { ChatMessage } from "@/type/chat-message";
import { Group } from "@/type/group";
import { User } from "@/type/login";

export const USERS = new Map<string, User>();
export const MESSAGES = new Map();
export const ACTIVE_USERS = new Map();

// JWT secret (should be in environment variables)
export const JWT_SECRET = process.env.JWT_SECRET || "secret-key";

// Track connected users and their socket IDs
export const CONNECTED_BROWSER = new Map<string, string>(); // socketId -> username
export const SOCKET_BY_BROWSER = new Map<string, string>(); // username -> socketId

// Global chat history storage
export const CHAT_HISTORY = new Map<string, ChatMessage[]>(); // channelId -> messages
export const DIRECT_MESSAGE_HISTORY = new Map<string, ChatMessage[]>(); // userId_userId -> messages

// Store groups
export const GROUPS = new Map<string, Group>();
