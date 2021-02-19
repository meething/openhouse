function joinRoom(e) {
  e.preventDefault();
  window.location.href = "/r/" + e.target.name;
}

function startRoom() {
  var roomname = prompt("Please enter your room name", uuidv4());
  // currently set by API/server side
  // var room = gunRooms.get(roomname).set({ title: roomname, id: roomname, peers: {}, locked: false });
  fetch(window.location.protocol + "rooms", {
    method: "POST",
    cache: "no-cache",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: roomname,
      locked: false
    })
  })
    .then(res => res.json())
    .then(room => (window.location.href = "/r/" + room.id))
    .catch(e => console.log(e));
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
