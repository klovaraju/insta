const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const nodemon=require('nodemon')
const dotenv=require('dotenv')
const { Server } = require('socket.io');
const cors=require('cors')
dotenv.config()
const app = express();
const server = http.createServer(app); // Wrap Express with HTTP server
const io = new Server(server,{
    cors:{
        origin:'*',
        methods:['GET','POST'],
    },
}); // Initialize Socket.IO

app.use(express.json()); // Middleware to parse JSON requests
app.use(cors());
app.use(express.json())
mongoose.connect(process.env.MONGO_URI)
.then(()=>{
   console.log("mongodb connected succesfully")
})
.catch((error)=>{

   console.log("mongodb not coonected",error)
})


// Define a schema for the like count
const likeSchema = new mongoose.Schema({
    count: { type: Number, default: 0 },
});

// Create a model for the like count
const Like = mongoose.model('Like', likeSchema);

// Ensure there's a document to track the like count
async function initializeLikeCount() {
    const count = await Like.findOne();
    if (!count) {
        const newCount = new Like({ count: 0 });
        await newCount.save();
    }
}
initializeLikeCount();



// API endpoint to get the current like count (used for initial fetch)
app.get('/likes', async (req, res) => {
    const count = await Like.findOne();
    res.json({ count: count ? count.count : 0 });
});

// Handle real-time connections via WebSockets
io.on('connection', (socket) => {
    console.log('A user connected');

    // Send the current like count to the newly connected user
    socket.on('fetchLikes', async () => {
        const count = await Like.findOne();
        io.emit('updateLikes', count ? count.count : 0); // Broadcast to all clients
    });

    // Handle like updates
    socket.on('updateLike', async (increment) => {
        const count = await Like.findOne();
        if (count) {
            count.count += increment ? 1 : -1;
            await count.save();

            // Broadcast the updated like count to all connected users
            io.emit('updateLikes', count.count);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Default route to serve the HTML file


// Start the server
const PORT = process.env.PORT||3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});