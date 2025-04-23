import { ChatMessage } from "@/type/chat-message";
import { Group } from "@/type/group";
import { Socket, Server } from "socket.io";
import jwt from "jsonwebtoken";
import {
  CONNECTED_BROWSER,
  JWT_SECRET,
  SOCKET_BY_BROWSER,
  USERS,
} from "./database";

// Function to generate a JWT token
export const generateToken = (
  userId: string,
  username: string,
  tag: string,
): string => {
  return jwt.sign({ userId, username, tag }, JWT_SECRET, { expiresIn: "24h" });
};

// Function to find user by username and tag
export function findUserByUsernameAndTag(username: string, tag: string) {
  for (const [userId, user] of USERS.entries()) {
    if (user.username === username && user.tag === tag) {
      return { ...user, id: userId };
    }
  }
  return null;
}

// Helper function to get DM key
export function getDirectMessageKey(sender: string, recipient: string): string {
  // Creates a consistent key regardless of who's sending to whom
  return [sender, recipient].sort().join("_");
}

// Function to store user connection
export function storeUserConnection(
  socketId: string,
  username: string,
  password: string,
  browserId: string,
) {
  let tag;
  if (!USERS.has(browserId)) {
    tag = Math.random().toString(36).substring(2, 6).toUpperCase();
    USERS.set(browserId, {
      username,
      password,
      tag,
    });
  } else {
    const user = USERS.get(browserId);
    if (user && user.password === password) {
      tag = user.tag;
    }
  }

  CONNECTED_BROWSER.set(socketId, username);
  SOCKET_BY_BROWSER.set(username, socketId);

  return { tag, success: tag && true };
}

// Function to send chat history to user
export function sendChatHistory(
  socket: Socket,
  channel: string,
  messages: ChatMessage[],
) {
  socket.emit("chat_history", { channel, messages });
}

// Function to send broadcast history
export function sendBroadcastHistory(
  socket: Socket,
  chatHistory: Map<string, ChatMessage[]>,
) {
  const broadcastHistory = chatHistory.get("broadcast") || [];
  if (broadcastHistory.length > 0) {
    sendChatHistory(socket, "", broadcastHistory);
  }
}

// Function to send direct message history
export function sendDirectMessageHistory(
  socket: Socket,
  username: string,
  clients: string[],
  directMessageHistory: Map<string, ChatMessage[]>,
) {
  clients.forEach((client) => {
    if (client === username) return; // Skip self

    const dmKey = getDirectMessageKey(username, client);
    const dmHistory = directMessageHistory.get(dmKey) || [];
    if (dmHistory.length > 0) {
      sendChatHistory(socket, client, dmHistory);
    }
  });
}

// Function to join user to their groups
export function joinUserToGroups(
  socket: Socket,
  username: string,
  groups: Map<string, Group>,
  chatHistory: Map<string, ChatMessage[]>,
) {
  groups.forEach((group, groupName) => {
    if (group.members.includes(username)) {
      socket.join(groupName);

      // Send chat history for this group
      const groupHistory = chatHistory.get(groupName) || [];
      if (groupHistory.length > 0) {
        sendChatHistory(socket, groupName, groupHistory);
      }

      // Send updated member list to the newly joined user
      socket.emit("group_members", {
        groupName,
        members: group.members,
      });
    }
  });
}

// Function to handle broadcast messages
export function handleBroadcastMessage(
  socket: Socket,
  message: ChatMessage,
  chatHistory: Map<string, ChatMessage[]>,
) {
  socket.broadcast.emit("message", message);

  // Store in global chat history
  const broadcastMessages = chatHistory.get("broadcast") || [];
  broadcastMessages.push(message);
  chatHistory.set("broadcast", broadcastMessages);
}

// Function to handle group messages
export function handleGroupMessage(
  socket: Socket,
  message: ChatMessage,
  senderUsername: string,
  groups: Map<string, Group>,
  chatHistory: Map<string, ChatMessage[]>,
) {
  const group = groups.get(message.to)!;

  // Check if the sender is a member
  if (!group.members.includes(senderUsername)) {
    socket.emit("error", "You are not a member of this group");
    return false;
  }

  // Store message in group chat history
  const groupMessages = chatHistory.get(message.to) || [];
  groupMessages.push(message);
  chatHistory.set(message.to, groupMessages);

  // Send to all group members except sender
  socket.to(message.to).emit("message", message);
  return true;
}

// Function to handle direct messages
export function handleDirectMessage(
  io: Server,
  message: ChatMessage,
  senderUsername: string,
  socketsByUsername: Map<string, string>,
  directMessageHistory: Map<string, ChatMessage[]>,
) {
  const recipientSocketId = socketsByUsername.get(message.to);

  // Store message in direct message history
  const dmKey = getDirectMessageKey(senderUsername, message.to);
  const dmMessages = directMessageHistory.get(dmKey) || [];
  dmMessages.push(message);
  directMessageHistory.set(dmKey, dmMessages);

  if (recipientSocketId) {
    io.to(recipientSocketId).emit("message", message);
  }
}

// Function to create a group
export function createGroup(
  io: Server,
  socket: Socket,
  creatorUsername: string,
  groupData: { groupName: string; members: string[] },
  groups: Map<string, Group>,
  socketsByUsername: Map<string, string>,
) {
  // Ensure group name doesn't exist
  if (groups.has(groupData.groupName)) {
    socket.emit("error", "A group with this name already exists");
    return false;
  }

  // Ensure creator is a member
  if (!groupData.members.includes(creatorUsername)) {
    groupData.members.push(creatorUsername);
  }

  // Create the group
  const group = {
    name: groupData.groupName,
    members: groupData.members,
  };

  groups.set(groupData.groupName, group);

  // Add all group members to the socket.io room
  addMembersToGroupRoom(
    io,
    groupData.groupName,
    groupData.members,
    socketsByUsername,
  );

  // Notify all clients about the new group with complete group info
  io.emit("group_created", group);

  // Send member list to group members
  io.to(groupData.groupName).emit("group_members", {
    groupName: groupData.groupName,
    members: groupData.members,
  });

  return true;
}

// Function to add members to a group room
function addMembersToGroupRoom(
  io: Server,
  groupName: string,
  members: string[],
  socketsByUsername: Map<string, string>,
) {
  members.forEach((member: string) => {
    const memberSocketId = socketsByUsername.get(member);
    if (memberSocketId) {
      const memberSocket = io.sockets.sockets.get(memberSocketId);
      if (memberSocket) {
        memberSocket.join(groupName);
      }
    }
  });
}

// Function to handle a user joining a group
export function handleJoinGroup(
  io: Server,
  socket: Socket,
  username: string,
  groupName: string,
  groups: Map<string, Group>,
) {
  const group = groups.get(groupName);
  if (!group) {
    socket.emit("error", "Group does not exist");
    return false;
  }

  // Add user to members if not already a member
  if (!group.members.includes(username)) {
    group.members.push(username);
    groups.set(groupName, group);
  }

  // Join the socket room
  socket.join(groupName);

  // Notify all members about the updated member list
  io.to(groupName).emit("group_members", {
    groupName,
    members: group.members,
  });

  return true;
}

// Function to retrieve and send requested chat history
export function sendRequestedChatHistory(
  socket: Socket,
  username: string,
  channel: string,
  groups: Map<string, Group>,
  chatHistory: Map<string, ChatMessage[]>,
  directMessageHistory: Map<string, ChatMessage[]>,
) {
  if (!channel) {
    // Broadcast history
    const history = chatHistory.get("broadcast") || [];
    socket.emit("chat_history", { channel: "", messages: history });
  } else if (groups.has(channel)) {
    // Group history
    const group = groups.get(channel)!;
    if (!group.members.includes(username)) {
      socket.emit("error", "You are not a member of this group");
      return false;
    }

    const history = chatHistory.get(channel) || [];
    socket.emit("chat_history", { channel, messages: history });
  } else {
    // Direct message history
    const dmKey = getDirectMessageKey(username, channel);
    const history = directMessageHistory.get(dmKey) || [];
    socket.emit("chat_history", { channel, messages: history });
  }

  return true;
}

// Function to handle user disconnection
export function handleDisconnection(
  io: Server,
  socketId: string,
  username: string,
) {
  console.log(`User ${username} disconnected:`, socketId);
  SOCKET_BY_BROWSER.delete(username);
  CONNECTED_BROWSER.delete(socketId);

  // Send updated client list to everyone
  io.emit("clients", Array.from(CONNECTED_BROWSER.values()));
}
