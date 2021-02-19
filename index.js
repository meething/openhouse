const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

var Gun = require('gun');
var gun = Gun({peers:["https://gundb-multiserver.glitch.me/openhouse"], multicast: false, localStorage: false, radisk: false, file: false});


const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

var gunRooms = gun.get('rooms');
var rooms = {
  lobby: {
    id: "lobby",
    title: "Lobby",
    peers: [],
    locked: false
  },
  meething: {
    id: "meething",
    title: "Meething",
    peers: [],
    locked: false
  },
   ctzn: {
    id: "ctzn",
    title: "CTZN",
    peers: [],
    locked: false
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
    res.render("rooms", { rooms });
    //res.render("404");
    return;
  }
  res.render("room", {
    gunRoom: gunRooms.get(req.params.id),
    room: rooms[req.params.id],
    peerjs: {}
  });
});

// API

app.post("/rooms", (req, res) => {
  var room = {
    id: uuidv4(),
    title: req.body.title,
    peers: [],
    locked: req.body.locked
  };
  gunRooms.get(room.id).set(room);
  rooms[room.id] = room;
  res.json(room);
});

// NOT FOUND

app.get("*", function(req, res) {
  res.render("rooms", { rooms });
  //res.render("404");
});

// TODO: CONVERT TO MEETHING STYLE!
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
      if (rooms[roomId].peers.length < 1 && roomId != "lobby") {
        delete rooms[roomId];
        return;
      }
      socket.to(roomId).broadcast.emit("peer-left-room", peerId);
    });
  });
});

server.listen(process.env.PORT || 3000);



