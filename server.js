const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const User = require('./models/User');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // React app URL
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce';

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.post('/login',async(req,res)=>{
    const {name,password} = req.body;
    try{
        const user = await User.findOne({name:name,password:password})
        if(user) res.json(user)
    }catch{
        console.log("Login error");
    }
})
app.get('/users',async (req,res) => {
    try{
        const users = await User.find();
        console.log(users);
        
        res.json(users)
    }catch{
        console.log("error in user fetch");
        
    }
})
// API Endpoint: Fetch Chat History
app.get('/chat/:userId1/:userId2', async (req, res) => {
  const { userId1, userId2 } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error('Error fetching chat history:', err);
    res.status(500).send('Server error');
  }
});

// Socket.IO for real-time chat
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('chat message', async (data) => {
    const { senderId, receiverId, message } = data;

    try {
      // Save message to MongoDB
      const newMessage = new Message({
        senderId,
        receiverId,
        message,
      });
      await newMessage.save();

      // Emit the message to the recipient
      io.to(receiverId).emit('chat message', {
        from: senderId,
        message,
        timestamp: newMessage.timestamp,
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
