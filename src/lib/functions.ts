import { ChatMessage } from "@/type/chat-message";
import { Group } from "@/type/group";
import { Socket, Server } from "socket.io";
import {
  CONNECTED_USERTAG,
  GROUPS,
  SOCKET_BY_USERTAG,
  USERS,
} from "./database";

// Function to find user by username and tag
export function findUserByUsernameAndTag(username: string, tag: string) {
  for (const [userId, user] of USERS.entries()) {
    if (user.username === username && user.tag === tag) {
      return { ...user, browserId: userId };
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

    let retryCount = 0;
    while (findUserByUsernameAndTag(username, tag) && retryCount < 3) {
      tag = Math.random().toString(36).substring(2, 6).toUpperCase();
      retryCount++;
    }
    if (retryCount === 3 && findUserByUsernameAndTag(username, tag)) {
      return { tag: null, success: false, error: "Too many username existed" };
    }

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
  if (username && tag) {
    CONNECTED_USERTAG.set(socketId, `${username}#${tag}`);
    SOCKET_BY_USERTAG.set(`${username}#${tag}`, socketId);
  }
  return {
    tag,
    success: tag && true,
    error: !tag && "Invalid username or password",
  };
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
  directMessageHistory: Map<string, ChatMessage[]>,
) {
  CONNECTED_USERTAG.forEach((client) => {
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
  socket.emit("message", message);

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
  socket: Socket,
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
    socket.emit("message", message);
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
  usertag: string,
) {
  console.log(`${usertag} disconnected:`, socketId);
  SOCKET_BY_USERTAG.delete(usertag);
  CONNECTED_USERTAG.delete(socketId);

  broadcastClients(io);
}

export function broadcastClients(io: Server) {
  const clientList = Array.from(CONNECTED_USERTAG.values());
  io.emit("clients", clientList);
}

export function broadcastGroups(io: Server) {
  const groupList = Array.from(GROUPS.values()).map((group) => ({
    name: group.name,
    members: group.members,
  }));
  io.emit("groups", groupList);
}
