var gun = Gun({
  peers: ["https://gundb-multiserver.glitch.me/openhouse"],
  multicast: false,
  localStorage: false,
  radisk: false,
  file: false
});
var gunRooms;
gun
  .get("rooms")
  .promOnce()
  .then(obj => {
    gunRooms = obj.data;
    console.log(obj.data);
  });
