const dns = require("dns");

// Force IPv4 DNS 
// DNS issue when connecting to MongoDB on home internet, quick fix by forcing IPv4 instead of IPv6
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const express = require("express");
const mongoose = require("mongoose");
const http = require("http")
const socketio = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const SERVER_PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static("views"));


// MongoDB Config
const DB_NAME = "db_comp3133_chat_app"
const DB_USER_NAME = 'matthewmacalalad_db_user'
const DB_PASSWORD = 'b7grK8lViyuR1xDl'
const CLUSTER_ID = 'hscra8e'
const DB_CONNECTION = `mongodb+srv://${DB_USER_NAME}:${DB_PASSWORD}@cluster0.${CLUSTER_ID}.mongodb.net/${DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`

async function connectToMongoDB(connectionString = DB_CONNECTION) {
  await mongoose.connect(connectionString);
}

// Routes
const authRoutes = require("./routes/auth")
app.use("/api/auth", authRoutes);

// Socket
const GroupMessage = require("./models/GroupMessage");
const PrivateMessage = require("./models/PrivateMessage");

const User = require("./models/User");

const onlineUsers = {};

io.on("connection", (socket) => {
    console.log(`New Socket connection: ${socket.id}`)

    // Register a user
    socket.on("registerUser", (username) => {
        onlineUsers[username] = socket.id;
        console.log(`${username} registered with socket ${socket.id}`);
    });

    // Join a room
    socket.on("joinRoom", async({ username, room }) => {
        socket.join(room);
        console.log(`${username} joined ${room}`);

        const messages = await GroupMessage.find({ room });

        messages.forEach(msg => {
            socket.emit("roomMessage", {
                username: msg.from_user,
                message: msg.message
            });
        });
    });

    // Leave a room
    socket.on("leaveRoom", ({ room }) => {
        socket.leave(room);
        console.log(`${username} left ${room}`);
    });

    // Room Message
    socket.on("roomMessage", async ({ username, room, message }) => {
        if (!room) return;

        const newMessage = GroupMessage({
            from_user: username,
            room,
            message
        });

        await newMessage.save();

        io.to(room).emit("roomMessage", {
            username,
            message
        });
    });

    // Private Message
    socket.on("privateMessage", async ({ from, to, message }) => {
        try {
            const sender = from.toLowerCase();
            const receiver = to.toLowerCase();

            const userExists = await User.findOne({ username: receiver });
            if (!userExists) {
                return socket.emit("privateMessageError", "User does not exist.");
            }

            const newPrivateMessage = new PrivateMessage({
                from_user: sender,
                to_user: receiver,
                message
            });

            await newPrivateMessage.save();

            const targetSocketId = onlineUsers[receiver];

            if (targetSocketId) {
                io.to(targetSocketId).emit("privateMessage", {
                    from: sender,
                    message,
                    date_sent: newPrivateMessage.date_sent
                });
            }

            // Ensure that sender also sees the message
            socket.emit("privateMessage", {
                from,
                message,
                date_sent: newPrivateMessage.date_sent
            });

        } catch (err) {
            console.error("Error sending private message:", err);
        }
    });

    // Load Private Messages
    socket.on("loadPrivateMessages", async ({ user1, user2 }) => {
        try {
            const receiver = user2.toLowerCase();

            const userExists = await User.findOne({ username: receiver });

            if (!userExists) {
                return socket.emit("privateMessageError", "User does not exist.")
            }

            const messages = await PrivateMessage.find({
                $or: [
                    { from_user: user1.toLowerCase(), to_user: user2.toLowerCase() },
                    { from_user: user2.toLowerCase(), to_user: user1.toLowerCase() },
                ]
            }).sort({ date_sent: 1 });

            socket.emit("privateMessageHistory", messages);
        } catch (err) {
            console.error("Error loading private messages:", err);
        }
    });

    // Typing indicators

    // Room
    socket.on("roomTyping", ({ username, room }) => {
        socket.broadcast.to(room).emit("roomTyping", `${username} is typing...`);
    });
    // Private
    socket.on("privateTyping", ({ from, to }) => {
        const targetSocketId = onlineUsers[to];
        if (targetSocketId) {
            io.to(to).emit("privateTyping", `${from} is typing...`);
        }
    });

    // Disconnect socket
    socket.on("disconnect", () => {
        for (const username in onlineUsers) {
            if (onlineUsers[username] === socket.id) {
                delete onlineUsers[username];
                console.log(`${username} disconnected.`);
                break;
            }
        }

        console.log("Client Disconnected:", socket.id)
    });
});

// Server Connection
server.listen(SERVER_PORT, async () => { 
  console.log("Server is running...") 
  try {
    await connectToMongoDB(DB_CONNECTION);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
});