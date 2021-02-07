function joinRoom(e) {
  e.preventDefault();
  window.location.href = "/r/" + e.target.name;
}
