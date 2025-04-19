// working frontend chat app with bubble-style messages (no sender name)

"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

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

export default function ChatApp() {
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

  const groupButtonRef = useRef<HTMLButtonElement>(null);

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
      (acc) => acc.username === username && acc.password === password
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
    if (!message) return;
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
        : [...prev, member]
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

  return (
    <div className="min-h-screen bg-white text-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        {!isLoggedIn ? (
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
          <div className="flex flex-col gap-4 bg-gray-50 p-6 rounded-lg shadow">
            <div className="flex gap-2 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Send to:</span>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1"
                >
                  <option value="">All (Broadcast)</option>
                  {clients
                    .filter((client) => client !== username)
                    .map((client, idx) => (
                      <option key={idx} value={client}>
                        {client}
                      </option>
                    ))}
                </select>
              </div>
              <button
                ref={groupButtonRef}
                onClick={() => setShowCreateGroup(!showCreateGroup)}
                className="text-sm px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                + Create Group
              </button>
            </div>

            {showCreateGroup && (
              <div className="absolute top-20 right-0 z-10 bg-white border border-gray-300 shadow-lg rounded-lg p-4 w-80">
                <h2 className="text-lg font-semibold mb-3">Create Group</h2>
                <input
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
                />
                <div className="mb-3">
                  <label className="block font-medium mb-1">Members:</label>
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
                <div className="mb-4">
                  <label className="block font-medium mb-1">Group Type:</label>
                  <label className="mr-4">
                    <input
                      type="radio"
                      name="groupType"
                      value="public"
                      checked={groupType === "public"}
                      onChange={(e) => setGroupType(e.target.value)}
                    />{" "}
                    Public
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="groupType"
                      value="private"
                      checked={groupType === "private"}
                      onChange={(e) => setGroupType(e.target.value)}
                    />{" "}
                    Private
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCreateGroup(false)}
                    className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded h-64 overflow-y-scroll p-3 bg-white shadow-inner flex flex-col gap-2">
              {(chatHistory[selectedUser] || []).map((msg, idx) => (
                <div
                  key={idx}
                  className={`max-w-[70%] px-4 py-2 rounded-lg text-sm whitespace-pre-wrap shadow ${
                    msg.from === username
                      ? "self-end bg-green-100 text-right"
                      : "self-start bg-gray-200 text-left"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
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
        )}
      </div>
    </div>
  );
}
