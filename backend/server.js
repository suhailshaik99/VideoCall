const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join-room", ({ roomId, userName }) => {
    socket.join(roomId);
    socket.broadcast.to(roomId).emit("user-connected", { userId: socket.id, userName });
  });

  socket.on("offer", ({ target, offer }) => {
    io.to(target).emit("offer", { offer, target: socket.id });
  });

  socket.on("answer", ({ target, answer }) => {
    io.to(target).emit("answer", { answer, target: socket.id });
  });

  socket.on("ice-candidate", ({ target, candidate }) => {
    io.to(target).emit("ice-candidate", { candidate, target: socket.id });
  });

  socket.on("disconnect", () => {
    io.emit("user-disconnected", socket.id);
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
