"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Send, Users, UserPlus, LogOut, Smile, Check, X, Pencil, Settings, Edit2 } from "lucide-react"
import { ModeToggle } from "@/components/ui/mode-toggle"

// Mock socket connection for front-end demo
const socket = {
  on: (event: string, callback: Function) => {},
  emit: (event: string, data: any) => {},
  off: (event: string) => {},
}

const initialAccounts = [
  { username: "mim", password: "1234" },
  { username: "mew", password: "abcd" },
  { username: "min", password: "password" },
  { username: "moo", password: "secure" },
]

interface ChatMessage {
  id: string
  from: string
  to: string
  text: string
  timestamp: number
  type: "text" | "sticker"
  edited?: boolean
}

// Predefined stickers
const stickers = [
  { id: "s1", url: "/stickers/happy.png", alt: "Happy face" },
  { id: "s2", url: "/stickers/sad.png", alt: "Sad face" },
  { id: "s3", url: "/stickers/love.png", alt: "Love heart" },
  { id: "s4", url: "/stickers/laugh.png", alt: "Laughing face" },
  { id: "s5", url: "/stickers/cool.png", alt: "Cool face" },
  { id: "s6", url: "/stickers/angry.png", alt: "Angry face" },
  { id: "s7", url: "/stickers/surprised.png", alt: "Surprised face" },
  { id: "s8", url: "/stickers/thinking.png", alt: "Thinking face" },
]

// Emoji set for quick access
const emojis = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "😎", "🤔", "😢", "😍", "🙏", "👏"]

// Chat theme colors
const chatThemes = [
  { name: "Default", primary: "bg-emerald-500", secondary: "bg-gray-200 dark:bg-gray-700" },
  { name: "Blue", primary: "bg-blue-500", secondary: "bg-blue-100 dark:bg-blue-900" },
  { name: "Purple", primary: "bg-purple-500", secondary: "bg-purple-100 dark:bg-purple-900" },
  { name: "Pink", primary: "bg-pink-500", secondary: "bg-pink-100 dark:bg-pink-900" },
  { name: "Orange", primary: "bg-orange-500", secondary: "bg-orange-100 dark:bg-orange-900" },
  { name: "Red", primary: "bg-red-500", secondary: "bg-red-100 dark:bg-red-900" },
  { name: "Yellow", primary: "bg-yellow-500", secondary: "bg-yellow-100 dark:bg-yellow-900" },
  { name: "Teal", primary: "bg-teal-500", secondary: "bg-teal-100 dark:bg-teal-900" },
]

export default function Home() {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({
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
  })
  const [clients, setClients] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState("")
  const [message, setMessage] = useState("")
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const [isTyping, setIsTyping] = useState(false)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  // Nickname feature
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  const [showNicknameDialog, setShowNicknameDialog] = useState(false)
  const [nicknameInput, setNicknameInput] = useState("")
  const [nicknameTarget, setNicknameTarget] = useState("")

  // Chat theme feature
  const [chatThemeSettings, setChatThemeSettings] = useState<Record<string, { primary: string; secondary: string }>>({})
  const [showThemeDialog, setShowThemeDialog] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState(0)

  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setClients(accounts.map((acc) => acc.username))
  }, [accounts])

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory, selectedUser])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleLogin = () => {
    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    const user = accounts.find((acc) => acc.username === username && acc.password === password)
    if (user) {
      setIsLoggedIn(true)
      setError("")
    } else {
      setError("Invalid username or password")
    }
  }

  const handleRegister = () => {
    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    const exists = accounts.some((acc) => acc.username === username)
    if (exists) {
      setError("Username already exists")
    } else {
      const newAccount = { username, password }
      setAccounts((prev) => [...prev, newAccount])
      setIsLoggedIn(true)
      setError("")
    }
  }

  const handleSend = () => {
    if (!message.trim()) return
    sendMessage(message, "text")
  }

  const sendMessage = (content: string, type: "text" | "sticker") => {
    const to = selectedUser
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      from: username,
      to,
      text: content,
      timestamp: Date.now(),
      type,
    }

    setChatHistory((prev) => ({
      ...prev,
      [to]: [...(prev[to] || []), newMessage],
    }))

    setMessage("")

    // Clear typing indicator when sending a message
    handleTypingStop()
  }

  const handleSendSticker = (stickerId: string) => {
    sendMessage(stickerId, "sticker")
  }

  const handleToggleMember = (member: string) => {
    setSelectedMembers((prev) => (prev.includes(member) ? prev.filter((m) => m !== member) : [...prev, member]))
  }

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      return
    }

    const groupData = {
      groupName,
      members: selectedMembers,
    }
    console.log("Creating group:", groupData)
    setShowCreateGroup(false)
    setGroupName("")
    setSelectedMembers([])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (editingMessage) {
        handleSaveEdit()
      } else {
        handleSend()
      }
    }
  }

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop()
    }, 2000)
  }

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleEditMessage = (messageId: string, text: string) => {
    setEditingMessage(messageId)
    setEditText(text)
  }

  const handleSaveEdit = () => {
    if (!editingMessage || !editText.trim()) {
      setEditingMessage(null)
      return
    }

    // Update local state
    const key = selectedUser || ""
    setChatHistory((prev) => {
      const messages = [...(prev[key] || [])]
      const messageIndex = messages.findIndex((msg) => msg.id === editingMessage)

      if (messageIndex !== -1) {
        messages[messageIndex] = {
          ...messages[messageIndex],
          text: editText,
          edited: true,
        }
      }

      return {
        ...prev,
        [key]: messages,
      }
    })

    setEditingMessage(null)
    setEditText("")
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
    setEditText("")
  }

  // Nickname handlers
  const openNicknameDialog = (user: string) => {
    setNicknameTarget(user)
    setNicknameInput(nicknames[user] || "")
    setShowNicknameDialog(true)
  }

  const saveNickname = () => {
    if (nicknameInput.trim()) {
      setNicknames((prev) => ({
        ...prev,
        [nicknameTarget]: nicknameInput.trim(),
      }))
      // Show success message
      alert(`Custom name for ${nicknameTarget} has been set to "${nicknameInput.trim()}"`)
    } else {
      // Remove nickname if empty
      const newNicknames = { ...nicknames }
      delete newNicknames[nicknameTarget]
      setNicknames(newNicknames)
      // Show removal message
      alert(`Custom name for ${nicknameTarget} has been removed`)
    }
    setShowNicknameDialog(false)
  }

  // Theme handlers
  const openThemeDialog = () => {
    if (selectedUser) {
      const currentTheme = chatThemeSettings[selectedUser]
      const themeIndex = currentTheme
        ? chatThemes.findIndex(
            (theme) => theme.primary === currentTheme.primary && theme.secondary === currentTheme.secondary,
          )
        : 0

      setSelectedTheme(themeIndex >= 0 ? themeIndex : 0)
      setShowThemeDialog(true)
    }
  }

  const saveTheme = () => {
    if (selectedUser) {
      setChatThemeSettings((prev) => ({
        ...prev,
        [selectedUser]: {
          primary: chatThemes[selectedTheme].primary,
          secondary: chatThemes[selectedTheme].secondary,
        },
      }))
    }
    setShowThemeDialog(false)
  }

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase()
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUsername("")
    setPassword("")
  }

  const isUserTyping = () => {
    return Object.entries(typingUsers)
      .filter(([user, isTyping]) => isTyping && (!selectedUser || user === selectedUser))
      .map(([user]) => user)
  }

  const renderSticker = (stickerId: string) => {
    const sticker = stickers.find((s) => s.id === stickerId)
    if (!sticker) {
      return <div className="text-4xl">🏷️</div>
    }
    return (
      <div className="w-16 h-16 flex items-center justify-center">
        <img
          src={sticker.url || "/placeholder.svg?height=64&width=64"}
          alt={sticker.alt}
          className="max-w-full max-h-full"
          // Fallback for demo purposes
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = `/placeholder.svg?height=64&width=64&text=${sticker.id}`
          }}
        />
      </div>
    )
  }

  const addEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji)
  }

  // Get display name (nickname or username)
  const getDisplayName = (user: string) => {
    return nicknames[user] || user
  }

  // Get chat theme for current selected user
  const getCurrentChatTheme = () => {
    if (selectedUser && chatThemeSettings[selectedUser]) {
      return chatThemeSettings[selectedUser]
    }
    return { primary: chatThemes[0].primary, secondary: chatThemes[0].secondary }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {!isLoggedIn ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <Card className="w-full max-w-md shadow-lg">
              <CardHeader className="pb-6 pt-8 px-6">
                <div className="flex justify-end mb-2">
                  <ModeToggle />
                </div>
                <CardTitle className="text-center text-2xl font-bold">
                  {isRegistering ? "Create Account" : "Welcome Back"}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-8">
                <Tabs defaultValue="login" value={isRegistering ? "register" : "login"}>
                  <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="login" onClick={() => setIsRegistering(false)}>
                      Login
                    </TabsTrigger>
                    <TabsTrigger value="register" onClick={() => setIsRegistering(true)}>
                      Register
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    <Button className="w-full mt-2" size="lg" onClick={handleLogin}>
                      Sign In
                    </Button>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="new-username">Username</Label>
                      <Input
                        id="new-username"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="new-password">Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Choose a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    <Button className="w-full mt-2" size="lg" onClick={handleRegister}>
                      Create Account
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-4">
            {/* Sidebar */}
            <Card className="w-full md:w-80 flex flex-col shadow-md">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-500 text-white">{getInitials(username)}</AvatarFallback>
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
                    <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
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
                        <div key={client} className="flex items-center gap-1 group relative">
                          <Button
                            variant={selectedUser === client ? "default" : "ghost"}
                            className="w-full justify-start text-left h-10 pr-8"
                            onClick={() => setSelectedUser(client)}
                          >
                            <span className="truncate">
                              {getDisplayName(client)}
                              {nicknames[client] && (
                                <span className="text-xs text-muted-foreground ml-1">({client})</span>
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
                    <Button variant="ghost" size="sm" className="flex items-center gap-1" onClick={openThemeDialog}>
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
                      <div key={idx} className={`flex ${msg.from === username ? "justify-end" : "justify-start"}`}>
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
                                <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-7 w-7">
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={handleSaveEdit} className="h-7 w-7">
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
                                  {msg.edited && <span className="text-xs opacity-70 ml-1">(edited)</span>}
                                </>
                              ) : (
                                renderSticker(msg.text)
                              )}

                              {msg.from === username && msg.type === "text" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute -top-3 -right-3 h-6 w-6 bg-white dark:bg-gray-800 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleEditMessage(msg.id, msg.text)}
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
                    {isUserTyping().join(", ")} {isUserTyping().length === 1 ? "is" : "are"} typing...
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t p-4">
                <div className="flex w-full gap-2">
                  <Input
                    placeholder={editingMessage ? "Edit your message..." : "Type your message..."}
                    value={editingMessage ? editText : message}
                    onChange={(e) => {
                      if (editingMessage) {
                        setEditText(e.target.value)
                      } else {
                        setMessage(e.target.value)
                        handleTyping()
                      }
                    }}
                    onKeyDown={handleKeyPress}
                    onBlur={() => {
                      if (!editingMessage) {
                        handleTypingStop()
                      }
                    }}
                    className="flex-1"
                  />

                  {/* Emoji picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-10 w-10">
                        <Smile className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="end">
                      <div className="grid grid-cols-6 gap-1 mb-2">
                        {emojis.map((emoji, i) => (
                          <Button key={i} variant="ghost" className="h-8 w-8 p-0" onClick={() => addEmoji(emoji)}>
                            {emoji}
                          </Button>
                        ))}
                      </div>
                      <div className="border-t pt-2">
                        <h4 className="text-sm font-medium mb-1">Stickers</h4>
                        <div className="grid grid-cols-4 gap-1">
                          {stickers.map((sticker) => (
                            <TooltipProvider key={sticker.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-12 w-12 p-1"
                                    onClick={() => handleSendSticker(sticker.id)}
                                  >
                                    <img
                                      src={sticker.url || `/placeholder.svg?height=48&width=48`}
                                      alt={sticker.alt}
                                      className="max-w-full max-h-full"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.src = `/placeholder.svg?height=48&width=48&text=${sticker.id}`
                                      }}
                                    />
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
                    className="bg-emerald-500 hover:bg-emerald-600"
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
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a group chat where everyone can read messages, but only members can send messages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Members</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                {clients.map((client) => (
                  <div key={client} className="flex items-center space-x-2">
                    <Checkbox
                      id={`member-${client}`}
                      checked={selectedMembers.includes(client)}
                      onCheckedChange={() => handleToggleMember(client)}
                    />
                    <Label htmlFor={`member-${client}`} className="text-sm">
                      {client}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} className="bg-emerald-500 hover:bg-emerald-600">
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nickname Dialog */}
      <Dialog open={showNicknameDialog} onOpenChange={setShowNicknameDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Set Custom Name</DialogTitle>
            <DialogDescription>
              Set a custom name for <span className="font-medium">{nicknameTarget}</span>. Only you will see this name,
              and others will still see their original username.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Custom Name</Label>
              <Input
                id="nickname"
                placeholder="Enter custom name"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to remove the custom name and revert to their original username
              </p>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">{getInitials(nicknameTarget)}</AvatarFallback>
                </Avatar>
                <div className="font-medium">Preview:</div>
              </div>
              <div className="pl-8">
                {nicknameInput ? (
                  <div>
                    <div className="font-medium">{nicknameInput}</div>
                    <div className="text-xs text-muted-foreground">Original: {nicknameTarget}</div>
                  </div>
                ) : (
                  <div className="font-medium">{nicknameTarget}</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNicknameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveNickname} className="bg-emerald-500 hover:bg-emerald-600">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Theme Dialog */}
      <Dialog open={showThemeDialog} onOpenChange={setShowThemeDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Chat Theme</DialogTitle>
            <DialogDescription>Choose a color theme for this chat</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="grid grid-cols-4 gap-3">
              {chatThemes.map((theme, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={`h-12 w-full p-0 overflow-hidden ${selectedTheme === index ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedTheme(index)}
                >
                  <div className="flex flex-col w-full h-full">
                    <div className={`h-1/2 w-full ${theme.primary}`}></div>
                    <div className={`h-1/2 w-full ${theme.secondary}`}></div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowThemeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveTheme} className="bg-emerald-500 hover:bg-emerald-600">
              Apply Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
