"use client";

import type React from "react";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  Users,
  UserPlus,
  LogOut,
  Smile,
  Check,
  X,
  Pencil,
  Settings,
  Edit2,
} from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import Image from "next/image";
import { CHAT_THEMES, ChatTheme } from "@/constants/chat-theme";
import { ChatMessage } from "@/type/chat-message";
import { CHAT_EMOJIS, CHAT_STICKERS } from "@/constants/stickers";
import { ThemeDialog } from "@/components/widget/theme-dialog";
import { NicknameDialog } from "@/components/widget/nickname-dialog";
import { CreateGroupDialog } from "@/components/widget/group-dialog";
import { useApp } from "@/components/app-context";
import { LoginForm } from "@/components/widget/login-form";

export default function Home() {
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
      mew: [
        {
          id: "2",
          from: "mew",
          to: "mim",
          text: "Hey there! How are you?",
          timestamp: Date.now() - 3600000,
          type: "text",
        },
      ],
    },
  );
  const [clients, _setClients] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [message, setMessage] = useState("");
  const [typingUsers, _setTypingUsers] = useState<Record<string, boolean>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Nickname feature
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameTarget, setNicknameTarget] = useState("");

  // Chat theme feature
  const [chatThemeSettings, setChatThemeSettings] = useState<
    Record<string, Omit<ChatTheme, "name">>
  >({});
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(0);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogin = () => {
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    login(username, password).then((success) => {
      if (success) {
        setIsLoggedIn(true);
        setError("");
      } else {
        setError("Invalid username or password");
      }
    });
  };

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage(message, "text");
  };

  const sendMessage = (content: string, type: "text" | "sticker") => {
    const to = selectedUser;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      from: username,
      to,
      text: content,
      timestamp: Date.now(),
      type,
    };

    setChatHistory((prev) => ({
      ...prev,
      [to]: [...(prev[to] || []), newMessage],
    }));

    setMessage("");

    // Clear typing indicator when sending a message
    handleTypingStop();
  };

  const handleSendSticker = (stickerId: string) => {
    sendMessage(stickerId, "sticker");
  };

  const handleToggleMember = (member: string) => {
    setSelectedMembers((prev) =>
      prev.includes(member)
        ? prev.filter((m) => m !== member)
        : [...prev, member],
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      return;
    }

    const groupData = {
      groupName,
      members: selectedMembers,
    };
    console.log("Creating group:", groupData);
    setShowCreateGroup(false);
    setGroupName("");
    setSelectedMembers([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleSaveEdit();
      } else {
        handleSend();
      }
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 2000);
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleEditMessage = (messageId: string, text: string) => {
    setEditingMessage(messageId);
    setEditText(text);
  };

  const handleSaveEdit = () => {
    if (!editingMessage || !editText.trim()) {
      setEditingMessage(null);
      return;
    }

    // Update local state
    const key = selectedUser || "";
    setChatHistory((prev) => {
      const messages = [...(prev[key] || [])];
      const messageIndex = messages.findIndex(
        (msg) => msg.id === editingMessage,
      );

      if (messageIndex !== -1) {
        messages[messageIndex] = {
          ...messages[messageIndex],
          text: editText,
          edited: true,
        };
      }

      return {
        ...prev,
        [key]: messages,
      };
    });

    setEditingMessage(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText("");
  };

  // Nickname handlers
  const openNicknameDialog = (user: string) => {
    setNicknameTarget(user);
    setNicknameInput(nicknames[user] || "");
    setShowNicknameDialog(true);
  };

  const saveNickname = () => {
    if (nicknameInput.trim()) {
      setNicknames((prev) => ({
        ...prev,
        [nicknameTarget]: nicknameInput.trim(),
      }));
      // Show success message
      alert(
        `Custom name for ${nicknameTarget} has been set to "${nicknameInput.trim()}"`,
      );
    } else {
      // Remove nickname if empty
      const newNicknames = { ...nicknames };
      delete newNicknames[nicknameTarget];
      setNicknames(newNicknames);
      // Show removal message
      alert(`Custom name for ${nicknameTarget} has been removed`);
    }
    setShowNicknameDialog(false);
  };

  // Theme handlers
  const openThemeDialog = () => {
    if (selectedUser) {
      const currentTheme = chatThemeSettings[selectedUser];
      const themeIndex = currentTheme
        ? CHAT_THEMES.findIndex(
            (theme) =>
              theme.primary === currentTheme.primary &&
              theme.secondary === currentTheme.secondary,
          )
        : 0;

      setSelectedTheme(themeIndex >= 0 ? themeIndex : 0);
      setShowThemeDialog(true);
    }
  };

  const saveTheme = () => {
    if (selectedUser) {
      setChatThemeSettings((prev) => ({
        ...prev,
        [selectedUser]: {
          primary: CHAT_THEMES[selectedTheme].primary,
          secondary: CHAT_THEMES[selectedTheme].secondary,
          hoverPrimary: CHAT_THEMES[selectedTheme].hoverPrimary,
          hoverSecondary: CHAT_THEMES[selectedTheme].hoverSecondary,
        },
      }));
    }
    setShowThemeDialog(false);
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
  };

  const isUserTyping = () => {
    return Object.entries(typingUsers)
      .filter(
        ([user, isTyping]) =>
          isTyping && (!selectedUser || user === selectedUser),
      )
      .map(([user]) => user);
  };

  const renderSticker = (stickerId: string) => {
    const sticker = CHAT_STICKERS.find((s) => s.id === stickerId);
    if (!sticker) {
      return <div className="text-4xl">🏷️</div>;
    }
    return (
      <div className="w-16 h-16 flex items-center justify-center">
        <Image
          src={sticker.url || "/vercel.svg?height=64&width=64"}
          alt={sticker.alt}
          className="max-w-full max-h-full"
          // Fallback for demo purposes
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `/vercel.svg?height=64&width=64&text=${sticker.id}`;
          }}
        />
      </div>
    );
  };

  const addEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  // Get display name (nickname or username)
  const getDisplayName = (user: string) => {
    return nicknames[user] || user;
  };

  // Get chat theme for current selected user
  const getCurrentChatTheme = () => {
    if (selectedUser && chatThemeSettings[selectedUser]) {
      return chatThemeSettings[selectedUser];
    }
    return {
      primary: CHAT_THEMES[0].primary,
      secondary: CHAT_THEMES[0].secondary,
      hoverPrimary: CHAT_THEMES[0].hoverPrimary,
      hoverSecondary: CHAT_THEMES[0].hoverSecondary,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {!isLoggedIn ? (
          <LoginForm
            username={username}
            password={password}
            error={error}
            setUsername={setUsername}
            setPassword={setPassword}
            handleLogin={handleLogin}
          />
        ) : (
          <div className="w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-4">
            {/* Sidebar */}
            <Card className="w-full md:w-80 flex flex-col shadow-md">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-500 text-white">
                        {getInitials(username)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{username}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        Online
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ModeToggle />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-3">
                <div className="flex justify-between items-center mb-3 px-2">
                  <h3 className="text-sm font-medium flex items-center gap-1">
                    <Users className="h-4 w-4" /> Contacts
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowCreateGroup(true)}
                    title="Create Group"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="h-[calc(100%-2.5rem)]">
                  <div className="space-y-1 px-1 pb-4">
                    <Button
                      variant={selectedUser === "" ? "default" : "ghost"}
                      className="w-full justify-start text-left h-10"
                      onClick={() => setSelectedUser("")}
                    >
                      <span className="truncate">Broadcast</span>
                    </Button>

                    {clients
                      .filter((client) => client !== username)
                      .map((client) => (
                        <div
                          key={client}
                          className="flex items-center gap-1 group relative"
                        >
                          <Button
                            variant={
                              selectedUser === client ? "default" : "ghost"
                            }
                            className="w-full justify-start text-left h-10 pr-8"
                            onClick={() => setSelectedUser(client)}
                          >
                            <span className="truncate">
                              {getDisplayName(client)}
                              {nicknames[client] && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({client})
                                </span>
                              )}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0 absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openNicknameDialog(client)}
                            title="Edit nickname"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col shadow-md">
              <CardHeader className="pb-3 pt-5 px-5 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {selectedUser ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700">
                            {getInitials(selectedUser)}
                          </AvatarFallback>
                        </Avatar>
                        {getDisplayName(selectedUser)}
                      </>
                    ) : (
                      <>
                        <Users className="h-5 w-5" />
                        Broadcast
                      </>
                    )}
                  </CardTitle>

                  {selectedUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={openThemeDialog}
                    >
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Chat Theme</span>
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0 relative">
                <ScrollArea className="h-[calc(100%-1rem)] p-5">
                  <div className="space-y-4">
                    {(chatHistory[selectedUser] || []).map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.from === username ? "justify-end" : "justify-start"}`}
                      >
                        <div className="flex flex-col max-w-[75%]">
                          {msg.id === editingMessage ? (
                            <div className="flex flex-col gap-2">
                              <Input
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={handleKeyPress}
                                autoFocus
                                className="min-w-[200px]"
                              />
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  className="h-7 w-7"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={handleSaveEdit}
                                  className="h-7 w-7"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                msg.from === username
                                  ? `text-white rounded-br-none ${getCurrentChatTheme().primary}`
                                  : `text-gray-800 rounded-bl-none dark:text-gray-100 ${getCurrentChatTheme().secondary}`
                              } relative group`}
                            >
                              {msg.type === "text" ? (
                                <>
                                  {msg.text}
                                  {msg.edited && (
                                    <span className="text-xs opacity-70 ml-1">
                                      (edited)
                                    </span>
                                  )}
                                </>
                              ) : (
                                renderSticker(msg.text)
                              )}

                              {msg.from === username && msg.type === "text" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute -top-3 -right-3 h-6 w-6 bg-white dark:bg-gray-800 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() =>
                                    handleEditMessage(msg.id, msg.text)
                                  }
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                          <span
                            className={`text-xs mt-1 text-gray-500 ${
                              msg.from === username ? "text-right" : "text-left"
                            }`}
                          >
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Typing indicator */}
                {isUserTyping().length > 0 && (
                  <div className="absolute bottom-0 left-0 w-full px-4 py-1 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 border-t">
                    {isUserTyping().join(", ")}{" "}
                    {isUserTyping().length === 1 ? "is" : "are"} typing...
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t p-4">
                <div className="flex w-full gap-2">
                  <Input
                    placeholder={
                      editingMessage
                        ? "Edit your message..."
                        : "Type your message..."
                    }
                    value={editingMessage ? editText : message}
                    onChange={(e) => {
                      if (editingMessage) {
                        setEditText(e.target.value);
                      } else {
                        setMessage(e.target.value);
                        handleTyping();
                      }
                    }}
                    onKeyDown={handleKeyPress}
                    onBlur={() => {
                      if (!editingMessage) {
                        handleTypingStop();
                      }
                    }}
                    className="flex-1"
                  />

                  {/* Emoji picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                      >
                        <Smile className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="end">
                      <div className="grid grid-cols-6 gap-1 mb-2">
                        {CHAT_EMOJIS.map((emoji, i) => (
                          <Button
                            key={i}
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => addEmoji(emoji)}
                          >
                            {emoji}
                          </Button>
                        ))}
                      </div>
                      <div className="border-t pt-2">
                        <h4 className="text-sm font-medium mb-1">Stickers</h4>
                        <div className="grid grid-cols-4 gap-1">
                          {CHAT_STICKERS.map((sticker) => (
                            <TooltipProvider key={sticker.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-12 w-12 p-1"
                                    onClick={() =>
                                      handleSendSticker(sticker.id)
                                    }
                                  >
                                    <div className="relative w-full h-full flex items-center justify-center">
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                      </div>
                                      <Image
                                        src={
                                          sticker.url ||
                                          `/vercel.svg?height=48&width=48`
                                        }
                                        alt={sticker.alt}
                                        className="max-w-full max-h-full relative z-10"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.src = `/vercel.svg?height=48&width=48&text=${sticker.id}`;
                                        }}
                                        onLoad={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.parentElement?.classList.add(
                                            "loaded",
                                          );
                                        }}
                                      />
                                    </div>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{sticker.alt}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    onClick={editingMessage ? handleSaveEdit : handleSend}
                    className={`${getCurrentChatTheme().primary} ${
                      getCurrentChatTheme().hoverPrimary
                    }`}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>

      {/* Create Group Dialog */}
      <CreateGroupDialog
        showCreateGroup={showCreateGroup}
        setShowCreateGroup={setShowCreateGroup}
        groupName={groupName}
        setGroupName={setGroupName}
        clients={clients}
        selectedMembers={selectedMembers}
        handleToggleMember={handleToggleMember}
        handleCreateGroup={handleCreateGroup}
      />

      {/* Nickname Dialog */}
      <NicknameDialog
        saveNickname={saveNickname}
        nicknameInput={nicknameInput}
        setNicknameInput={setNicknameInput}
        setShowNicknameDialog={setShowNicknameDialog}
        showNicknameDialog={showNicknameDialog}
        nicknameTarget={nicknameTarget}
        getInitials={getInitials}
      />

      {/* Theme Dialog */}
      <ThemeDialog
        saveTheme={saveTheme}
        selectedTheme={selectedTheme}
        setSelectedTheme={setSelectedTheme}
        setShowThemeDialog={setShowThemeDialog}
        showThemeDialog={showThemeDialog}
      />
    </div>
  );
}
