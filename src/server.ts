import 'dotenv/config';
import next from 'next';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';

interface ChatMessage {
  from: string;
  to: string;
  text: string;
  timestamp?: number;
}

interface GroupData {
  groupName: string;
  members: string[];
  type: 'public' | 'private';
}

interface Group {
  name: string;
  members: string[];
  type: 'public' | 'private';
}

const app = next({ dev: process.env.NODE_ENV !== 'production' });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);

  const io = new Server(httpServer, {
    path: '/api/ws',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Track connected users and their socket IDs
  const connectedUsers = new Map<string, string>(); // socketId -> username
  const socketsByUsername = new Map<string, string>(); // username -> socketId
  
  // Global chat history storage
  const chatHistory = new Map<string, ChatMessage[]>(); // channelId -> messages
  const directMessageHistory = new Map<string, ChatMessage[]>(); // userId_userId -> messages

  function getDirectMessageKey(sender: string, recipient: string): string {
    // Creates a consistent key regardless of who's sending to whom
    return [sender, recipient].sort().join('_');
  }

  // Store groups
  const groups = new Map<string, Group>();

  io.on('connection', (socket: Socket) => {
    console.log('A user connected:', socket.id);

    // Handle user joining
    socket.on('join', (username: string) => {
      console.log(`User ${username} joined with socket ID ${socket.id}`);
      
      // Handle existing connections for this username (log them out)
      const existingSocketId = socketsByUsername.get(username);
      if (existingSocketId) {
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          existingSocket.emit('forced_disconnect', 'Someone else logged in with your username');
          existingSocket.disconnect(true);
        }
        connectedUsers.delete(existingSocketId);
      }
      
      // Store user connection
      connectedUsers.set(socket.id, username);
      socketsByUsername.set(username, socket.id);
      
      // Send updated client list to everyone
      const clientList = Array.from(connectedUsers.values());
      io.emit('clients', clientList);
      
      // Send existing groups to the newly connected user
      socket.emit('groups', Array.from(groups.values()));
      
      // Send broadcast chat history
      const broadcastHistory = chatHistory.get('broadcast') || [];
      if (broadcastHistory.length > 0) {
        socket.emit('chat_history', { channel: '', messages: broadcastHistory });
      }
      
      // Send direct message history for this user
      clientList.forEach(client => {
        if (client === username) return; // Skip self
        
        const dmKey = getDirectMessageKey(username, client);
        const dmHistory = directMessageHistory.get(dmKey) || [];
        if (dmHistory.length > 0) {
          socket.emit('chat_history', { channel: client, messages: dmHistory });
        }
      });
      
      // Join socket rooms for groups this user is a member of
      groups.forEach((group, groupName) => {
        if (group.type === 'public' || group.members.includes(username)) {
          socket.join(groupName);
          
          // Send chat history for this group
          const groupHistory = chatHistory.get(groupName) || [];
          if (groupHistory.length > 0) {
            socket.emit('chat_history', { channel: groupName, messages: groupHistory });
          }
          
          // Send updated member list to the newly joined user
          socket.emit('group_members', {
            groupName,
            members: group.members,
          });
        }
      });
    });

    socket.on('send_message', (message: ChatMessage) => {
      const senderUsername = connectedUsers.get(socket.id);
      if (!senderUsername) return;
      
      message.timestamp = Date.now(); // Add server timestamp
      console.log('Message received:', message);
      
      if (!message.to) {
        // Broadcast message to all users except sender
        socket.broadcast.emit('message', message);
        
        // Store in global chat history
        const broadcastMessages = chatHistory.get('broadcast') || [];
        broadcastMessages.push(message);
        chatHistory.set('broadcast', broadcastMessages);
      } else if (groups.has(message.to)) {
        // Group message
        const group = groups.get(message.to)!;
        
        // Check if it's a private group and if the sender is a member
        if (group.type === 'private' && !group.members.includes(senderUsername)) {
          socket.emit('error', 'You are not a member of this private group');
          return;
        }
        
        // Store message in group chat history
        const groupMessages = chatHistory.get(message.to) || [];
        groupMessages.push(message);
        chatHistory.set(message.to, groupMessages);
        
        // Send to all group members except sender
        socket.to(message.to).emit('message', message);
      } else {
        // Direct message to a specific user
        const recipientSocketId = socketsByUsername.get(message.to);
        
        // Store message in direct message history
        const dmKey = getDirectMessageKey(senderUsername, message.to);
        const dmMessages = directMessageHistory.get(dmKey) || [];
        dmMessages.push(message);
        directMessageHistory.set(dmKey, dmMessages);
        
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('message', message);
        }
      }
    });

    // Handle group creation
    socket.on('create_group', (groupData: GroupData) => {
      const creatorUsername = connectedUsers.get(socket.id);
      if (!creatorUsername) return;
      
      console.log('Creating group:', groupData);
      
      // Ensure group name doesn't exist
      if (groups.has(groupData.groupName)) {
        socket.emit('error', 'A group with this name already exists');
        return;
      }
      
      // Ensure creator is a member
      if (!groupData.members.includes(creatorUsername)) {
        groupData.members.push(creatorUsername);
      }
      
      // Create the group
      const group = {
        name: groupData.groupName,
        members: groupData.members,
        type: groupData.type,
      };
      
      groups.set(groupData.groupName, group);
      
      // Add all group members to the socket.io room
      groupData.members.forEach(member => {
        const memberSocketId = socketsByUsername.get(member);
        if (memberSocketId) {
          const memberSocket = io.sockets.sockets.get(memberSocketId);
          if (memberSocket) {
            memberSocket.join(groupData.groupName);
          }
        }
      });
      
      // Notify all clients about the new group with complete group info
      io.emit('group_created', group);
      
      // Send member list to group members
      io.to(groupData.groupName).emit('group_members', {
        groupName: groupData.groupName,
        members: groupData.members,
      });
    });

    // Handle user joining a group
    socket.on('join_group', (groupName: string) => {
      const username = connectedUsers.get(socket.id);
      if (!username) return;
      
      const group = groups.get(groupName);
      if (!group) {
        socket.emit('error', 'Group does not exist');
        return;
      }
      
      // For public groups, add user to members. Private groups require invitation (not implemented here)
      if (group.type === 'public') {
        if (!group.members.includes(username)) {
          group.members.push(username);
          groups.set(groupName, group);
        }
        
        // Join the socket room
        socket.join(groupName);
        
        // Notify all members about the updated member list
        io.to(groupName).emit('group_members', {
          groupName,
          members: group.members,
        });
      } else {
        // For private groups, check if user is already a member
        if (group.members.includes(username)) {
          socket.join(groupName);
        } else {
          socket.emit('error', 'This is a private group');
        }
      }
    });

    // Add a new event handler for requesting chat history
    socket.on('request_chat_history', ({ channel }) => {
      const username = connectedUsers.get(socket.id);
      if (!username) return;
      
      if (!channel) {
        // Broadcast history
        const history = chatHistory.get('broadcast') || [];
        socket.emit('chat_history', { channel: '', messages: history });
      } else if (groups.has(channel)) {
        // Group history
        const group = groups.get(channel)!;
        if (group.type === 'private' && !group.members.includes(username)) {
          socket.emit('error', 'You are not a member of this private group');
          return;
        }
        
        const history = chatHistory.get(channel) || [];
        socket.emit('chat_history', { channel, messages: history });
      } else {
        // Direct message history
        const dmKey = getDirectMessageKey(username, channel);
        const history = directMessageHistory.get(dmKey) || [];
        socket.emit('chat_history', { channel, messages: history });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const username = connectedUsers.get(socket.id);
      if (username) {
        console.log(`User ${username} disconnected:`, socket.id);
        socketsByUsername.delete(username);
        connectedUsers.delete(socket.id);
        
        // Send updated client list to everyone
        io.emit('clients', Array.from(connectedUsers.values()));
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT} - ${process.env.NODE_ENV}`);
  });
});