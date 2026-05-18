require("dotenv").config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./database/db');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST", "PATCH"]
  }
});

// Socket handler for NexTrade chats
io.on('connection', (socket) => {
  console.log('User connected to socket:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('send_message', (data) => {
    // data should have { roomId, message, senderId, ... }
    io.to(data.roomId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect Database
connectDB();

// Basic Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cafe', require('./routes/cafe'));
app.use('/api/nexlocate', require('./routes/nexlocate'));
app.use('/api/nexkit', require('./routes/nexkit'));
app.use('/api/nextrade', require('./routes/nextrade'));
app.use('/api/nexplanner', require('./routes/nexplanner'));

// Health check
app.get('/', (req, res) => res.send('NexKit API is running'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
