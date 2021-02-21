function joinRoom(e) {
  e.preventDefault();
  window.location.href = "/r/" + e.target.name;
}

function joinGunRoom(e) {
  e.preventDefault();
  console.log('got event',e)
  window.gunRooms.get(e.target.name).open(function(data){
    console.log('room lookup',e.target.name, data.id);
    if (data.id == e.target.name || data.title == e.target.name) {
      console.log('room match!', data.id, e.target.name);
      joinRoom(e);
      //(window.location.href = "/r/" + data.id)
    }
  })
}

function startRoom() {
  var roomname = prompt("Please enter your room name", uuidv4());
  var uuid = uuidv4();
  // currently set by API/server side

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
    .then(function(room){
      (window.gunRooms.get(room.id).put({ title: room.title, id: room.id, locked: room.locked }) ) 
      (window.location.href = "/r/" + room.id)
    })
    .catch(e => console.log(e));
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
