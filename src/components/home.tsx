"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io();

const initialAccounts = [
  { username: "mim", password: "1234" },
  { username: "mew", password: "abcd" },
  { username: "min", password: "password" },
  { username: "moo", password: "secure" },
];

interface ChatMessage {
  from: string;
  to: string;
  text: string;
}

// Authentication Form Component
const AuthForm = ({
  isRegistering,
  username,
  setUsername,
  password,
  setPassword,
  error,
  handleLogin,
  handleRegister,
  toggleRegistration,
}: {
  isRegistering: boolean;
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string;
  handleLogin: () => void;
  handleRegister: () => void;
  toggleRegistration: () => void;
}) => {
  return (
    <div className="flex flex-col gap-4 bg-gray-50 p-6 rounded-lg shadow">
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
        onClick={toggleRegistration}
        className="text-sm text-blue-500 hover:underline"
      >
        {isRegistering
          ? "Already have an account? Login"
          : "New here? Create an account"}
      </button>
    </div>
  );
};

// Message Component
const Message = ({
  message,
  isCurrentUser,
}: {
  message: ChatMessage;
  isCurrentUser: boolean;
}) => {
  return (
    <div
      className={`max-w-[70%] px-4 py-2 rounded-lg text-sm whitespace-pre-wrap shadow ${
        isCurrentUser
          ? "self-end bg-green-100 text-right"
          : "self-start bg-gray-200 text-left"
      }`}
    >
      {message.text}
    </div>
  );
};

// Chat History Component
const ChatHistory = ({
  messages,
  currentUser,
}: {
  messages: ChatMessage[];
  currentUser: string;
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="border border-gray-200 rounded h-96 overflow-y-scroll p-3 bg-white shadow-inner flex flex-col gap-2">
      {messages.map((msg, idx) => (
        <Message
          key={idx}
          message={msg}
          isCurrentUser={msg.from === currentUser}
        />
      ))}
      <div ref={chatEndRef} />
    </div>
  );
};

// Message Input Component
const MessageInput = ({
  message,
  setMessage,
  handleSend,
}: {
  message: string;
  setMessage: (value: string) => void;
  handleSend: () => void;
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <textarea
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 min-h-[60px] resize-none"
      />
      <button
        onClick={handleSend}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
      >
        Send
      </button>
    </div>
  );
};

// Create Group Modal Component
const CreateGroupModal = ({
  groupName,
  setGroupName,
  clients,
  selectedMembers,
  handleToggleMember,
  groupType,
  setGroupType,
  handleCreateGroup,
  onClose,
}: {
  groupName: string;
  setGroupName: (value: string) => void;
  clients: string[];
  selectedMembers: string[];
  handleToggleMember: (member: string) => void;
  groupType: string;
  setGroupType: (value: string) => void;
  handleCreateGroup: () => void;
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-300 shadow-lg rounded-lg p-6 w-96 max-w-[90%]">
        <h2 className="text-lg font-semibold mb-4">Create Group</h2>
        <input
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
        />
        <div className="mb-4 max-h-48 overflow-y-auto">
          <label className="block font-medium mb-2">Members:</label>
          <div className="grid grid-cols-2 gap-2">
            {clients.map((client, idx) => (
              <label key={idx} className="flex items-center gap-2">
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
        <div className="mb-5">
          <label className="block font-medium mb-2">Group Type:</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="groupType"
                value="public"
                checked={groupType === "public"}
                onChange={(e) => setGroupType(e.target.value)}
              />
              Public
            </label>
            <label className="flex items-center gap-1">
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
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

// Chat Header Component
const ChatHeader = ({
  selectedUser,
  setSelectedUser,
  clients,
  currentUser,
  toggleCreateGroup,
}: {
  selectedUser: string;
  setSelectedUser: (value: string) => void;
  clients: string[];
  currentUser: string;
  toggleCreateGroup: () => void;
}) => {
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between mb-3 pb-3 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Send to:</span>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="">All (Broadcast)</option>
          {clients
            .filter((client) => client !== currentUser)
            .map((client, idx) => (
              <option key={idx} value={client}>
                {client}
              </option>
            ))}
        </select>
      </div>
      <button
        onClick={toggleCreateGroup}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
      >
        + Create Group
      </button>
    </div>
  );
};

// Main Chat UI Component
const ChatUI = ({
  username,
  clients,
  selectedUser,
  setSelectedUser,
  chatHistory,
  message,
  setMessage,
  handleSend,
  showCreateGroup,
  setShowCreateGroup,
  groupName,
  setGroupName,
  selectedMembers,
  handleToggleMember,
  groupType,
  setGroupType,
  handleCreateGroup,
}: {
  username: string;
  clients: string[];
  selectedUser: string;
  setSelectedUser: (value: string) => void;
  chatHistory: Record<string, ChatMessage[]>;
  message: string;
  setMessage: (value: string) => void;
  handleSend: () => void;
  showCreateGroup: boolean;
  setShowCreateGroup: (value: boolean) => void;
  groupName: string;
  setGroupName: (value: string) => void;
  selectedMembers: string[];
  handleToggleMember: (member: string) => void;
  groupType: string;
  setGroupType: (value: string) => void;
  handleCreateGroup: () => void;
}) => {
  return (
    <div className="flex flex-col gap-4 bg-gray-50 p-6 rounded-lg shadow w-full max-w-3xl">
      <ChatHeader
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        clients={clients}
        currentUser={username}
        toggleCreateGroup={() => setShowCreateGroup(!showCreateGroup)}
      />

      <ChatHistory
        messages={chatHistory[selectedUser] || []}
        currentUser={username}
      />

      <MessageInput
        message={message}
        setMessage={setMessage}
        handleSend={handleSend}
      />

      {showCreateGroup && (
        <CreateGroupModal
          groupName={groupName}
          setGroupName={setGroupName}
          clients={clients}
          selectedMembers={selectedMembers}
          handleToggleMember={handleToggleMember}
          groupType={groupType}
          setGroupType={setGroupType}
          handleCreateGroup={handleCreateGroup}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
    </div>
  );
};

export default function Home() {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>(
    { "": [] },
  );
  const [clients, setClients] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [message, setMessage] = useState("");

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupType, setGroupType] = useState("public");

  useEffect(() => {
    setClients(accounts.map((acc) => acc.username));
  }, [accounts]);

  useEffect(() => {
    socket.on("message", (msg: ChatMessage) => {
      const key = msg.to || "";
      setChatHistory((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), msg],
      }));
    });

    return () => {
      socket.off("message");
      socket.off("clients");
    };
  }, []);

  const handleLogin = () => {
    const user = accounts.find(
      (acc) => acc.username === username && acc.password === password,
    );
    if (user) {
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
    } else {
      const newAccount = { username, password };
      setAccounts((prev) => [...prev, newAccount]);
      socket.emit("join", username);
      setIsLoggedIn(true);
      setError("");
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;
    const to = selectedUser;
    const newMessage: ChatMessage = { from: username, to, text: message };
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
        : [...prev, member],
    );
  };

  const handleCreateGroup = () => {
    const groupData = {
      groupName,
      members: selectedMembers,
      type: groupType,
    };
    console.log("Creating group:", groupData);
    setShowCreateGroup(false);
    setGroupName("");
    setSelectedMembers([]);
    setGroupType("public");
  };

  const toggleRegistration = () => {
    setIsRegistering(!isRegistering);
    setError("");
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 flex items-center justify-center p-4">
      {!isLoggedIn ? (
        <AuthForm
          isRegistering={isRegistering}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          error={error}
          handleLogin={handleLogin}
          handleRegister={handleRegister}
          toggleRegistration={toggleRegistration}
        />
      ) : (
        <ChatUI
          username={username}
          clients={clients}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          chatHistory={chatHistory}
          message={message}
          setMessage={setMessage}
          handleSend={handleSend}
          showCreateGroup={showCreateGroup}
          setShowCreateGroup={setShowCreateGroup}
          groupName={groupName}
          setGroupName={setGroupName}
          selectedMembers={selectedMembers}
          handleToggleMember={handleToggleMember}
          groupType={groupType}
          setGroupType={setGroupType}
          handleCreateGroup={handleCreateGroup}
        />
      )}
    </div>
  );
}
