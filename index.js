const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
var rooms = {
  llama: {
    id: "llama",
    title: "Llama Room",
    peers: []
  },
  gecko: {
    id: "gecko",
    title: "Gecko Room",
    peers: []
  },
  flamingo: {
    id: "flamingo",
    title: "Flamingo Room",
    peers: []
  }
};

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json({ type: "application/json" }));

// ROUTES

app.get("/", (req, res) => {
  res.render("rooms", { rooms });
});

app.get("/r/:id", (req, res) => {
  if (!rooms[req.params.id]) {
    res.render("404");
    return;
  }
  res.render("room", {
    room: rooms[req.params.id],
    peerjs: {
      host: process.env.PEERJS_HOST,
      port: process.env.PEERJS_PORT
    }
  });
});

// API

app.post("/rooms", (req, res) => {
  var room = {
    id: uuidv4(),
    title: req.body.title,
    peers: []
  };
  rooms[room.id] = room;
  res.json(room);
});

// NOT FOUND

app.get("*", function(req, res) {
  res.render("404");
});

// WEBSOCKETS

io.on("connection", socket => {
  socket.on("join-room", (roomId, peerId) => {
    if (rooms[roomId]) rooms[roomId].peers.push(peerId);
    else rooms[roomId] = { title: null, peers: [peerId] };
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("peer-joined-room", peerId);
    socket.on("toggle-mute", (peerId, isMuted) =>
      socket.to(roomId).broadcast.emit("peer-toggled-mute", peerId, isMuted)
    );
    socket.on("disconnect", () => {
      rooms[roomId].peers = rooms[roomId].peers.filter(i => i !== peerId);
      socket.to(roomId).broadcast.emit("peer-left-room", peerId);
    });
  });
});

server.listen(process.env.PORT || 3000);
