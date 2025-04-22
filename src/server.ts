import "dotenv/config";
import next from "next";
import { Server } from "socket.io";
import { createServer } from "http";
import { hash, verify } from "argon2";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { DBStatus } from "./type/backend";

const app = next({ dev: process.env.NODE_ENV !== "production" });
const handle = app.getRequestHandler();

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Database connection status
let dbStatus: DBStatus = {
  connected: false,
  error: null,
};

// Function to check database connection
async function checkDatabaseConnection() {
  try {
    const { error } = await supabase
      .from("users")
      .select("count", { count: "exact", head: true });

    if (error) {
      dbStatus = {
        connected: false,
        error: error.message,
      };
      console.error("Database connection error:", error.message);
    } else {
      dbStatus = {
        connected: true,
        error: null,
      };
      console.log("Database connection successful");
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    dbStatus = {
      connected: false,
      error: errorMessage,
    };
    console.error("Database connection check failed:", errorMessage);
  }
  return dbStatus;
}

// In-memory storage for active users
const activeUsers = new Map();

// JWT secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || "secret-key";

// Function to generate a JWT token
const generateToken = (
  userId: string,
  username: string,
  tag: string,
): string => {
  return jwt.sign({ userId, username, tag }, JWT_SECRET, { expiresIn: "24h" });
};

// Database function to find user by username and tag
async function findUserByUsernameAndTag(username: string, tag: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("tag", tag)
    .single();

  if (error) {
    console.error("Error finding user:", error);
    return null;
  }

  return data;
}

// Function to create a new user
async function createUser({
  id,
  username,
  tag,
  passwordHash,
}: {
  id: string;
  username: string;
  tag: string;
  passwordHash: string;
}) {
  const { error } = await supabase.from("users").insert([
    {
      id,
      username,
      tag,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("Error creating user:", error);
    throw error;
  }

  return { id, username, tag };
}

app.prepare().then(async () => {
  // Check database connection on startup
  await checkDatabaseConnection();

  const httpServer = createServer(handle);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Send database status to client on connection
    socket.emit("database_status", dbStatus);

    // Handle request for database status
    socket.on("check_database", async () => {
      const status = await checkDatabaseConnection();
      socket.emit("database_status", status);
    });

    socket.on("login", async ({ username, tag, password }) => {
      try {
        // Check if this username+tag combination exists
        const user = await findUserByUsernameAndTag(username, tag);

        let userId;

        if (user) {
          // Verify password
          const validPassword = await verify(user.password_hash, password);
          if (!validPassword) {
            return socket.emit("login_error", {
              message: "Invalid credentials",
            });
          }
          userId = user.id;
        } else {
          // Create new user
          const passwordHash = await hash(password);
          userId = uuidv4();

          // Save user to database
          await createUser({
            id: userId,
            username,
            tag,
            passwordHash,
          });

          console.log(`Created new user: ${username}#${tag}`);
        }

        // Generate token
        const token = generateToken(userId, username, tag);

        // Add user to active users
        activeUsers.set(socket.id, { userId, username, tag });

        // Send success response
        socket.emit("login_success", { token, username, tag });

        // Broadcast to all users that someone has joined
        io.emit("user_joined", { username, tag });
      } catch (error) {
        console.error("Login error:", error);
        socket.emit("login_error", { message: "Authentication failed" });
      }
    });

    socket.on("authenticate", async ({ token }) => {
      try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId: string;
          username: string;
          tag: string;
        };

        // Add user to active users
        activeUsers.set(socket.id, {
          userId: decoded.userId,
          username: decoded.username,
          tag: decoded.tag,
        });

        socket.emit("authentication_success");
        io.emit("user_joined", {
          username: decoded.username,
          tag: decoded.tag,
        });
      } catch (error) {
        console.error(error);
        socket.emit("authentication_error", { message: "Invalid token" });
      }
    });

    socket.on("disconnect", () => {
      const user = activeUsers.get(socket.id);
      if (user) {
        console.log(
          `User disconnected: ${user.username}#${user.tag} (${socket.id})`,
        );
        io.emit("user_left", { username: user.username, tag: user.tag });
        activeUsers.delete(socket.id);
      } else {
        console.log("User disconnected:", socket.id);
      }
    });
  });

  io.on("error", (error) => {
    console.error("Socket error:", error);
  });

  // Set up periodic database connection check (every 5 minutes)
  setInterval(
    async () => {
      const status = await checkDatabaseConnection();
      io.emit("database_status", status);
    },
    5 * 60 * 1000,
  );

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(
      `> Ready on http://localhost:${PORT} - ${process.env.NODE_ENV}`,
    );
    console.log(
      `> Database status: ${dbStatus.connected ? "Connected" : "Disconnected"}`,
    );
  });
});
