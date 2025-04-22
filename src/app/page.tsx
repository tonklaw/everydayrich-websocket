"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { io } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Send, Users, UserPlus, LogOut, Smile, Check, X, Pencil } from "lucide-react"
import { ModeToggle } from "@/components/ui/mode-toggle"

const socket = io("http://localhost:3001")

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

export default function Home() {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({ "": [] })
  const [clients, setClients] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState("")
  const [message, setMessage] = useState("")
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const [isTyping, setIsTyping] = useState(false)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [groupType, setGroupType] = useState("public")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setClients(accounts.map((acc) => acc.username))
  }, [accounts])

  useEffect(() => {
    socket.on("message", (msg: ChatMessage) => {
      const key = msg.to || ""
      setChatHistory((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), msg],
      }))
    })

    socket.on("message_edited", (data: { messageId: string; newText: string; to: string }) => {
      const key = data.to || ""
      setChatHistory((prev) => {
        const messages = [...(prev[key] || [])]
        const messageIndex = messages.findIndex((msg) => msg.id === data.messageId)

        if (messageIndex !== -1) {
          messages[messageIndex] = {
            ...messages[messageIndex],
            text: data.newText,
            edited: true,
          }
        }

        return {
          ...prev,
          [key]: messages,
        }
      })
    })

    socket.on("typing", (data: { user: string; to: string; isTyping: boolean }) => {
      if (data.user !== username) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.user]: data.isTyping,
        }))
      }
    })

    return () => {
      socket.off("message")
      socket.off("message_edited")
      socket.off("typing")
      socket.off("clients")
    }
  }, [username])

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
      socket.emit("join", username)
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
      socket.emit("join", username)
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

    socket.emit("send_message", newMessage)
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
      type: groupType,
    }
    console.log("Creating group:", groupData)
    setShowCreateGroup(false)
    setGroupName("")
    setSelectedMembers([])
    setGroupType("public")
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
      socket.emit("typing", { user: username, to: selectedUser, isTyping: true })
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
      socket.emit("typing", { user: username, to: selectedUser, isTyping: false })
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

    // Emit edit event
    socket.emit("edit_message", {
      messageId: editingMessage,
      newText: editText,
      to: selectedUser,
    })

    setEditingMessage(null)
    setEditText("")
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
    setEditText("")
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
    socket.emit("leave", username)
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
          src={sticker.url || "/placeholder.svg"}
          alt={sticker.alt}
          className="max-w-full max-h-full"
          // Fallback for demo purposes
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = `https://via.placeholder.com/64?text=${sticker.id}`
          }}
        />
      </div>
    )
  }

  const addEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      {!isLoggedIn ? (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold">
              {isRegistering ? "Create Account" : "Welcome Back"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={isRegistering ? "register" : "login"}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" onClick={() => setIsRegistering(false)}>
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" onClick={() => setIsRegistering(true)}>
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button className="w-full" onClick={handleLogin}>
                  Sign In
                </Button>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-username">Username</Label>
                  <Input
                    id="new-username"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Choose a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button className="w-full" onClick={handleRegister}>
                  Create Account
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <div className="w-full max-w-4xl h-[600px] flex flex-col md:flex-row gap-4">
          {/* Sidebar */}
          <Card className="w-full md:w-64 flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarFallback className="bg-emerald-500 text-white">{getInitials(username)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{username}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      Online
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ModeToggle />
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-2">
              <div className="flex justify-between items-center mb-2 px-2">
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

              <ScrollArea className="h-[calc(100%-2rem)]">
                <div className="space-y-1 px-1">
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
                      <Button
                        key={client}
                        variant={selectedUser === client ? "default" : "ghost"}
                        className="w-full justify-start text-left h-10"
                        onClick={() => setSelectedUser(client)}
                      >
                        <span className="truncate">{client}</span>
                      </Button>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                {selectedUser ? (
                  <>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-gray-200">{getInitials(selectedUser)}</AvatarFallback>
                    </Avatar>
                    {selectedUser}
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5" />
                    Broadcast
                  </>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0 relative">
              <ScrollArea className="h-[calc(100%-1rem)] p-4">
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
                                ? "bg-emerald-500 text-white rounded-br-none"
                                : "bg-gray-200 text-gray-800 rounded-bl-none dark:bg-gray-700 dark:text-gray-100"
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
                          className={`text-xs mt-1 text-gray-500 ${msg.from === username ? "text-right" : "text-left"}`}
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

            <CardFooter className="border-t p-3">
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
                                    src={sticker.url || "/placeholder.svg"}
                                    alt={sticker.alt}
                                    className="max-w-full max-h-full"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = `https://via.placeholder.com/48?text=${sticker.id}`
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

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
              <Label>Group Type</Label>
              <RadioGroup value={groupType} onValueChange={setGroupType} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public">Public</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private">Private</Label>
                </div>
              </RadioGroup>
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
    </div>
  )
}
