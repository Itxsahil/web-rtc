const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");

const app = express();
app.use(express.json());

const server = http.createServer(app);

app.use(
  cors({
    origin: "https://webrtc-client-rho.vercel.app",  
    methods: ["GET", "POST"],
  })
);

const io = new Server(server, {
  cors: {
    origin: "https://webrtc-client-rho.vercel.app",  
    methods: ["GET", "POST"],
  },
});

const userNameToSocketId = new Map();
const socketIdToUserName = new Map();
const roomsTosocket = new Map();
const socketTorooms = new Map();

io.on("connection", (socket) => {
  socket.on("join:room", (data) => {
    const { userName, roomId } = data;
    userNameToSocketId.set(userName, socket.id);
    socketIdToUserName.set(socket.id, userName);
    socket.join(roomId);
    roomsTosocket.set(roomId, userName);
    socketTorooms.set(userName, roomId);
    console.log("A user with name: ", userName, " joined the room: ", roomId);
    socket.emit("you:joined", { roomId });
    socket.broadcast.to(roomId).emit("user:joined", { userName });
  });

  socket.on("send:offer", (data) => {
    const { to, offer } = data;
    const from = socketIdToUserName.get(socket.id);
    const toSocketId = userNameToSocketId.get(to);
    const roomId = socketTorooms.get(from);
    console.log("to", to);

    console.log(
      "Sending offer from: ",
      from,
      " to: ",
      toSocketId,
      "ans",
      socket.id
    );

    // if (!toSocketId) {
    //   console.error(`Target user "${to}" is not found in the userNameToSocketId map.`);
    //   return;
    // }

    socket.broadcast.to(roomId).emit("you:got:offer", { from, offer });
    console.log("sent offer", offer);
  });

  socket.on("send:answer", (data) => {
    const { to, answer } = data;
    const from = socketIdToUserName.get(socket.id);
    const toSocketId = userNameToSocketId.get(to);
    const roomId = socketTorooms.get(from);
    console.log("Sending answer from: ", from, " to: ", to);
    socket.broadcast.to(roomId).emit("receive:answer", { from, answer });
  });

  socket.on("disconnect", (reason) => {
    const userName = socketIdToUserName.get(socket.id);
    if (userName) {
      userNameToSocketId.delete(userName);
      socketIdToUserName.delete(socket.id);
    }
    console.log(
      `User ${userName || "unknown"} disconnected. Reason: ${reason}`
    );
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
