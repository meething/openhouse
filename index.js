const express = require("express");
const app = express();
const server = require("http").Server(app);

// Shared GUN scope for ROOM management only (no signaling here)
var Gun = require("gun");
require("gun/lib/open.js");
require("gun/lib/not.js");

var gun = Gun({ peers: ["https://gundb-multiserver.glitch.me/openhouse"],
    multicast: false,
    localStorage: false,
    radisk: false,
    file: false
    });
// GUN Rooms object - this is not persisting.....
var gunRooms = gun.get("rooms");
gunRooms.open(function(data){
  console.log('room data update', data);
  rooms = clean(data);
})

const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

// Helper
function clean(obj) {
  for (var propName in obj) {
    if (obj[propName] === null || obj[propName] === undefined || propName == "_") {
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
  }
};

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json({ type: "application/json" }));
app.use("/favicon.ico", express.static("favicon.ico"));

app.get("/", async (req, res) => {
  gunRooms.open(function(data){
    rooms = clean(data);
    res.redirect('/rooms')
  })
  
  //res.render("rooms", { rooms: rooms });
});

app.get("/r/:id", (req, res) => {
  // replace with gun check
  gunRooms.open(function(data){
    //rooms = clean(data);
    console.log('sync rooms',data)
   })
    
    if (!rooms[req.params.id]) {
      console.log('missing room',req.params.id, rooms);
      res.redirect('/rooms');
      //res.render("rooms", { rooms: rooms });
      //res.render("404");
      return;
    }

    res.render("room", {
      room: rooms[req.params.id],
      peerjs: {}
    });

  
});

app.post("/rooms", (req, res) => {
  var room = {
    id: uuidv4(),
    title: req.body.title,
    peers: [],
    locked: req.body.locked
  };
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
