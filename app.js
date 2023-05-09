import express from "express";
import session, { MemoryStore } from "express-session";
import constructRoutes from "./routes/index.js";

import http from "http";

import cors from "cors";
import { Server } from "socket.io";

app.use(cors());

const app = express();

app.use(express.json());

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  })
);

let urTrack = {};
app.use((req, res, next) => {
  if (!urTrack[req.method + req.originalUrl]) {
    urTrack[req.method + req.originalUrl] = 0;
  }
  urTrack[req.method + req.originalUrl] += 1;
  if (!req.session.user) {
    console.log("User not Authorized");
  } else {
    console.log("User Authorized");
  }
  let temp = req.body;
  if (!temp.password) {
    console.log(
      req.method +
        " " +
        req.originalUrl +
        " " +
        urTrack[req.method + req.originalUrl] +
        " " +
        JSON.stringify(req.body)
    );
  } else {
    console.log(
      req.method +
        " " +
        req.originalUrl +
        " " +
        urTrack[req.method + req.originalUrl] +
        JSON.stringify(req.body.username)
    );
  }
  next();
});

constructRoutes(app);

// app.listen(0400, () => {
//   console.log("Server started at http://localhost:4000/");
// });

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://runmate.vercel.app/", "https://runn-mate.web.app"],
    methods: ["GET", "POST"],
  },
});

let onlineUsers = {};
const userJoined = (userId, socketId) => {
  onlineUsers[userId] = socketId;
};
const userDisconnected = (socketId) => {
  if (onlineUsers.hasOwnProperty(socketId)) {
    delete onlineUsers[socketId];
  }
};
const checkIfUserOnline = (userId) => {
  if (onlineUsers.hasOwnProperty(userId)) {
    console.log(`${userId} is online`);
    return onlineUsers[userId];
  } else {
    console.log(`${userId} is not online`);
    return false;
  }
};
io.on("connection", (socket) => {
  console.log("A user connected.");
  socket.on("userJoined", (userId) => {
    userJoined(userId, socket.id);
    io.emit("returnUser", onlineUsers);
  });
  socket.on("sendMessage", (messageData) => {
    let userId = messageData.userId;
    let friendId = messageData.friendId;
    let text = messageData.text;
    const user = checkIfUserOnline(friendId);
    console.log("friendId", onlineUsers[friendId]);
    io.to(user).emit("getMessage", {
      userId,
      text,
    });
  });
  socket.on("disconnect", () => {
    console.log("A user disconnected.");
    userDisconnected(socket.id);
    io.emit("returnUser", onlineUsers);
  });
});

server.listen(process.env.PORT || 4000);
