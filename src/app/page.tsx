// app/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/components/socketProvider";
import GroupList from "@/components/groupList";

interface ChatMessage {
  from: string;
  to: string;
  text: string;
  timestamp?: number;
}

interface Group {
  name: string;
  type: "public" | "private";
  members: string[];
}

const initialAccounts = [
  { username: "mim", password: "1234" },
  { username: "mew", password: "abcd" },
  { username: "min", password: "password" },
  { username: "moo", password: "secure" },
];

export default function Home() {
  const socket = useSocket();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>(
    { "": [] }
  );
  const [clients, setClients] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [message, setMessage] = useState("");

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupType, setGroupType] = useState<"public" | "private">("public");
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeChatMembers, setActiveChatMembers] = useState<string[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, selectedUser]);

  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages
    socket.on("message", (msg: ChatMessage) => {
      setChatHistory((prev) => {
        // For direct messages between users, we need to use a consistent key
        // regardless of whether you're the sender or receiver
        let key = msg.to;
        
        // If it's a direct message to me, store it under the sender's name for the chat history
        if (msg.to === username && msg.from !== username) {
          key = msg.from;
        }
        
        // If it's a broadcast message
        if (!msg.to) {
          key = "";
        }
        
        const existingMessages = prev[key] || [];
        return {
          ...prev,
          [key]: [...existingMessages, { ...msg, timestamp: Date.now() }],
        };
      });
    });

    // Handle client list updates
    socket.on("clients", (clientList: string[]) => {
      setClients(clientList);
    });

    // Handle groups list updates
    socket.on("groups", (groupsList: Group[]) => {
      setGroups(groupsList);
    });

    // Handle new group creation
    socket.on("group_created", (group: Group) => {
      setGroups((prev) => {
        // Check if the group already exists to prevent duplicates
        const exists = prev.some(g => g.name === group.name);
        if (exists) return prev;
        return [...prev, group];
      });
    });

    // Handle group member list updates
    socket.on("group_members", ({ groupName, members }: { groupName: string; members: string[] }) => {
      setGroups(prev => 
        prev.map(g => g.name === groupName ? { ...g, members } : g)
      );
      
      // Update active chat members if this is the currently selected group
      if (selectedUser === groupName) {
        setActiveChatMembers(members);
      }
    });

    // Handle chat history
    socket.on('chat_history', ({ channel, messages }: { channel: string, messages: ChatMessage[] }) => {
      setChatHistory(prev => {
        // For direct messages, make sure we use the correct key
        const key = channel;
        
        // Keep any existing messages to avoid duplicates
        const existingMessages = prev[key] || [];
        const existingIds = new Set(existingMessages.map(msg => msg.timestamp));
        
        // Filter out messages that already exist in our chat history
        const newMessages = messages.filter(msg => !existingIds.has(msg.timestamp));
        
        return {
          ...prev,
          [key]: [...existingMessages, ...newMessages]
        };
      });
    });

    // Handle forced disconnect (logged in elsewhere)
    socket.on("forced_disconnect", (message: string) => {
      alert(message);
      setIsLoggedIn(false);
    });

    // Handle error messages
    socket.on("error", (errorMsg: string) => {
      setError(errorMsg);
      setTimeout(() => setError(""), 3000);
    });

    return () => {
      socket.off("message");
      socket.off("clients");
      socket.off("groups");
      socket.off("group_created");
      socket.off("group_members");
      socket.off("forced_disconnect");
      socket.off("error");
    };
  }, [socket, username]);

  // Update active chat members when selected user changes
  useEffect(() => {
    if (selectedUser && selectedUser !== "") {
      const selectedGroup = groups.find(g => g.name === selectedUser);
      if (selectedGroup) {
        setActiveChatMembers(selectedGroup.members);
      } else {
        setActiveChatMembers([]);
      }
    } else {
      setActiveChatMembers([]);
    }
  }, [selectedUser, groups]);

  // Then add this effect to request chat history when selectedUser changes
  useEffect(() => {
    if (socket && isLoggedIn) {
      socket.emit('request_chat_history', { channel: selectedUser });
    }
  }, [socket, selectedUser, isLoggedIn]);

  const handleLogin = () => {
    const user = accounts.find(
      (acc) => acc.username === username && acc.password === password
    );
    if (user && socket) {
      socket.emit("join", username);
      setIsLoggedIn(true);
      setError("");
    } else {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }
  };

  const handleRegister = () => {
    const exists = accounts.some((acc) => acc.username === username);
    if (exists) {
      setError("ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว");
    } else if (socket) {
      const newAccount = { username, password };
      setAccounts((prev) => [...prev, newAccount]);
      socket.emit("join", username);
      setIsLoggedIn(true);
      setError("");
    }
  };

  const handleSend = () => {
    if (!message.trim() || !socket) return;
    const to = selectedUser;
    const newMessage: ChatMessage = { 
      from: username, 
      to, 
      text: message,
      timestamp: Date.now()
    };
    
    setChatHistory((prev) => {
      const key = to || "";
      const existingMessages = prev[key] || [];
      return {
        ...prev,
        [key]: [...existingMessages, newMessage],
      };
    });
    
    socket.emit("send_message", newMessage);
    setMessage("");
  };

  const handleToggleMember = (member: string) => {
    setSelectedMembers((prev) =>
      prev.includes(member)
        ? prev.filter((m) => m !== member)
        : [...prev, member]
    );
  };

  const handleCreateGroup = () => {
    if (!socket || !groupName.trim()) return;
    
    // Include the creator in the group members
    const members = [...selectedMembers];
    if (!members.includes(username)) {
      members.push(username);
    }
    
    const groupData = {
      groupName,
      members,
      type: groupType,
    };
    
    socket.emit("create_group", groupData);
    
    // Close the modal but don't manually add group - let server event handle it
    setShowCreateGroup(false);
    setGroupName("");
    setSelectedMembers([]);
    setGroupType("public");
  };

  const handleJoinGroup = (groupName: string) => {
    if (socket) {
      socket.emit("join_group", groupName);
    }
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl relative">
        {!isLoggedIn ? (
          <div className="max-w-md mx-auto flex flex-col gap-4 bg-gray-50 p-6 rounded-lg shadow">
            <h1 className="text-xl font-semibold text-center">
              {isRegistering ? "Create New Account" : "Login"}
            </h1>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={isRegistering ? handleRegister : handleLogin}
              className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
            >
              {isRegistering ? "Create Account" : "Login"}
            </button>
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              className="text-sm text-blue-500 hover:underline"
            >
              {isRegistering
                ? "Already have an account? Login"
                : "New here? Create an account"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {/* Sidebar */}
            <div className="bg-gray-50 p-4 rounded-lg shadow col-span-1">
              <div className="mb-4">
                <h2 className="font-bold text-lg mb-2">Hello, {username}</h2>
              </div>
              
              {/* Direct Messages */}
              <div className="mb-4">
                <h3 className="font-medium text-sm text-gray-700 mb-2">Direct Messages</h3>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setSelectedUser("")}
                    className={`text-left px-3 py-1.5 rounded text-sm ${
                      selectedUser === "" ? "bg-green-100 text-green-800" : "hover:bg-gray-100"
                    }`}
                  >
                    All (Broadcast)
                  </button>
                  {clients
                    .filter((client) => client !== username)
                    .map((client) => (
                      <button
                        key={client}
                        onClick={() => {
                          setSelectedUser(client);
                          // Request chat history when selecting a user
                          if (socket) {
                            socket.emit('request_chat_history', { channel: client });
                          }
                        }}
                        className={`text-left px-3 py-1.5 rounded text-sm ${
                          selectedUser === client ? "bg-green-100 text-green-800" : "hover:bg-gray-100"
                        }`}
                      >
                        {client}
                      </button>
                    ))}
                </div>
              </div>
              
              {/* Groups */}
              <GroupList
                groups={groups}
                username={username}
                onSelectGroup={handleSelectGroup => setSelectedUser(handleSelectGroup)}
                selectedGroup={selectedUser}
                onJoinGroup={handleJoinGroup}
              />
              
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full text-center px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
              >
                + Create New Group
              </button>
            </div>
            
            {/* Chat Area */}
            <div className="bg-gray-50 p-4 rounded-lg shadow col-span-3">
              <div className="flex flex-col h-[80vh]">
                {/* Chat Header */}
                <div className="pb-3 border-b border-gray-200 mb-4 flex justify-between items-center">
                  <div>
                    <h2 className="font-bold text-lg">
                      {selectedUser
                        ? selectedUser
                        : "Broadcast Message"}
                    </h2>
                    {activeChatMembers.length > 0 && (
                      <p className="text-xs text-gray-500">
                        Members: {activeChatMembers.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Chat Messages */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto mb-4 p-2 bg-white rounded border border-gray-200 shadow-inner flex flex-col gap-2"
                >
                  {(chatHistory[selectedUser] || []).map((msg, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[70%] px-4 py-2 rounded-lg text-sm whitespace-pre-wrap shadow relative ${
                        msg.from === username
                          ? "self-end bg-green-100 text-right"
                          : "self-start bg-gray-200 text-left"
                      }`}
                    >
                      {msg.from !== username && (
                        <span className="block text-xs font-medium text-gray-600 mb-1">
                          {msg.from}
                        </span>
                      )}
                      {msg.text}
                      <span className="block text-right text-xs text-gray-500 mt-1">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Message Input */}
                <div className="flex gap-2">
                  <input
                    placeholder={`Message ${selectedUser || "everyone"}...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <button
                    onClick={handleSend}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
              <h2 className="text-lg font-semibold mb-4">Create Group</h2>
              <input
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              />
              <div className="mb-4">
                <label className="block font-medium mb-2">Members:</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                  {clients
                    .filter((client) => client !== username)
                    .map((client, idx) => (
                      <label key={idx} className="flex items-center gap-2 p-1 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(client)}
                          onChange={() => handleToggleMember(client)}
                        />
                        {client}
                      </label>
                    ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-2">Group Type:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="groupType"
                      value="public"
                      checked={groupType === "public"}
                      onChange={() => setGroupType("public")}
                    />
                    Public
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="groupType"
                      value="private"
                      checked={groupType === "private"}
                      onChange={() => setGroupType("private")}
                    />
                    Private
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim()}
                  className={`px-4 py-2 rounded text-white ${
                    groupName.trim()
                      ? "bg-purple-500 hover:bg-purple-600"
                      : "bg-purple-300 cursor-not-allowed"
                  }`}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}