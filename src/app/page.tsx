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
  const [groupType, setGroupType] = useState("public");
  const [groups, setGroups] = useState<Group[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, selectedUser]);

  useEffect(() => {
    setClients(accounts.map((acc) => acc.username));
  }, [accounts]);

  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages
    socket.on("message", (msg: ChatMessage) => {
      const key = msg.to || "";
      setChatHistory((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), { ...msg, timestamp: Date.now() }],
      }));
    });

    // Handle client list updates
    socket.on("clients", (clientList: string[]) => {
      setClients(clientList);
    });

    // Handle new group creation
    socket.on("group_created", (group: { name: string; type: string }) => {
      setGroups((prev) => [
        ...prev,
        {
          name: group.name,
          type: group.type as "public" | "private",
          members: [], // Server will manage actual membership
        },
      ]);
    });

    // Handle group member list updates
    socket.on("group_members", ({ groupName, members }: { groupName: string; members: string[] }) => {
      setGroups(prev => 
        prev.map(g => g.name === groupName ? { ...g, members } : g)
      );
    });

    return () => {
      socket.off("message");
      socket.off("clients");
      socket.off("group_created");
      socket.off("group_members");
    };
  }, [socket]);

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
    if (!message || !socket) return;
    const to = selectedUser;
    const newMessage: ChatMessage = { 
      from: username, 
      to, 
      text: message,
      timestamp: Date.now()
    };
    
    setChatHistory((prev) => ({
      ...prev,
      [to]: [...(prev[to] || []), newMessage],
    }));
    
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
    
    // Add the group locally immediately for better UX
    setGroups((prev) => [
      ...prev,
      {
        name: groupName,
        type: groupType as "public" | "private",
        members,
      },
    ]);
    
    setShowCreateGroup(false);
    setGroupName("");
    setSelectedMembers([]);
    setGroupType("public");
  };

  const handleSelectGroup = (groupName: string) => {
    setSelectedUser(groupName);
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
                        onClick={() => setSelectedUser(client)}
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
                onSelectGroup={handleSelectGroup}
                selectedGroup={selectedUser}
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
                  <h2 className="font-bold text-lg">
                    {selectedUser
                      ? selectedUser.startsWith("#")
                        ? selectedUser
                        : `Chat with ${selectedUser}`
                      : "Broadcast Message"}
                  </h2>
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
                      onChange={(e) => setGroupType(e.target.value)}
                    />
                    Public
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="groupType"
                      value="private"
                      checked={groupType === "private"}
                      onChange={(e) => setGroupType(e.target.value)}
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