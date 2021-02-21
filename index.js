const express = require("express");
const app = express();
const server = require("http").Server(app);

// Shared GUN scope for ROOM management only (no signaling here)
var Gun = require("gun");
require("gun/lib/open.js");
require("gun/lib/not.js");

var gun = Gun({ peers: ["https://gundb-multiserver.glitch.me/openhouse"] });

// GUN Rooms object - this is not persisting.....
var gunRooms = gun.get("rooms");

const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

// Helper
function clean(obj) {
  for (var propName in obj) {
    if (obj[propName] === null || obj[propName] === undefined) {
      delete obj[propName];
    }
  }
  return obj;
}

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
  res.redirect('/rooms')
  //res.render("rooms", { rooms: rooms });
});

app.get("/r/:id", (req, res) => {
  // replace with gun check
  if (!rooms[req.params.id]) {
    res.redirect('/rooms')
    //res.render("rooms", { rooms: rooms });
    //res.render("404");
    return;
  }
  res.render("room", {
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
  var gunRoom = gunRooms.get(room.title).put({ title: room.title, id: room.id, peers: {}, locked: room.locked });
  rooms[room.id] = room;
  res.json(room);
});

// GUN Rooms

app.use("/rooms", express.static(__dirname + "/views/rooms.html"));

// NOT FOUND

app.get("*", function(req, res) {
  res.redirect('/rooms')
  //res.render("rooms", { rooms: rooms });
  //res.render("404");
});

server.listen(process.env.PORT || 3000);
