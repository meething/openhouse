const express = require("express");
const app = express();
const server = require("http").Server(app);

// Shared GUN scope for ROOM management only (no signaling here)
var Gun = require("gun");
require("gun/lib/promise.js");
var gun = Gun({
  peers: ["https://gundb-multiserver.glitch.me/openhouse"],
  multicast: false,
  localStorage: false,
  radisk: false,
  file: false
});

// GUN Rooms object
var gunRooms = gun.get('rooms');
gunRooms.put({
  lobby: {
    id: "lobby",
    title: "Lobby",
    peers: {},
    locked: false
  },
  meething: {
    id: "meething",
    title: "Meething",
    peers: {},
    locked: false
  }
});

const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

var env = {};
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
  }
};

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json({ type: "application/json" }));

// ROUTES

app.use("/favicon.ico", express.static("favicon.ico"));

app.get("/", async (req, res) => {
  res.render("rooms", { rooms: rooms, gunRooms: gunRooms });
});

app.get("/r/:id", (req, res) => {
  if (!rooms[req.params.id]) {
    res.render("rooms", { rooms: rooms, gunRooms: gunRooms });
    //res.render("404");
    return;
  }
  res.render("room", {
    room: rooms[req.params.id],
    gunRooms: gunRooms,
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
  rooms[room.id] = room;
  gunRooms.get(req.body.title).put({ title: req.body.title, id: room.id, peers: {}, locked: req.body.locked });
  res.json(room);
});

// NOT FOUND

app.get("*", function(req, res) {
  res.render("rooms", { rooms: rooms, gunRooms: gunRooms });
  //res.render("404");
});

server.listen(process.env.PORT || 3000);
