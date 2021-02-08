const socket = io("/");
var remotePeers = {};
var localStream = null;
const localPeer = new Peer();
var lock = false;

const peerGrid = document.getElementById("peer-grid");
const muteButton = document.getElementById("mute-button");
const shareButton = document.getElementById("share-button");
const lockButton = document.getElementById("lock-button");


localPeer.on("open", localPeerId => {
  const opt = { video: false, audio: true };
  navigator.mediaDevices.getUserMedia(opt).then(s => {
    localStream = s;
    localStream.getAudioTracks()[0].onmute = evt => {
      localStream.getAudioTracks()[0].enabled = false;
      onToggleMute();
    };
    localStream.getAudioTracks()[0].onunmute = evt => {
      localStream.getAudioTracks()[0].enabled = true;
      onToggleMute();
    };
    localPeer.on("call", call => {
      call.answer(localStream);
      call.on("stream", remoteStream => addPeerProfile(call, remoteStream));
    });
    socket.on("peer-joined-room", peerId => onPeerJoined(peerId, localStream));
    socket.on("peer-left-room", onPeerLeft);
    socket.on("peer-toggled-mute", onPeerToggleMute);
    socket.emit("join-room", ROOM_ID, localPeerId);
    addLocalProfile();
    toggleMute();
    notifyMe("Joined! Unmute to speak");
    mediaAnalyze();
  });
});

function onPeerJoined(remotePeerId, localStream) {
  const call = localPeer.call(remotePeerId, localStream);
  call.on("stream", remoteStream => addPeerProfile(call, remoteStream));
  notifyMe("joined " + remotePeerId);
}

function onPeerLeft(remotePeerId) {
  if (remotePeers[remotePeerId]) remotePeers[remotePeerId].close();
  notifyMe("left " + remotePeerId);
}

function leaveRoom(e) {
  e.preventDefault();
  socket.disconnect();
  window.location.href = "/";
}

function toggleMute(e) {
  if (e) e.preventDefault();
  const track = localStream.getAudioTracks()[0];
  if (!track.muted) track.enabled = !track.enabled;
  // TODO else display warning (cannot record audio in this case)
  onToggleMute();
}

function onToggleMute() {
  const isMuted =
    !localStream.getAudioTracks()[0].enabled ||
    localStream.getAudioTracks()[0].muted;
  muteButton.innerHTML = isMuted ? "Unmute" : "Mute";
  muteButton.classList.toggle("bg-red-300");
  muteButton.classList.toggle("bg-gray-300");
  var muteElem = document.getElementById("local-peer-mute");
  muteElem.style.opacity = isMuted ? 1 : 0;
  socket.emit("toggle-mute", localPeer.id, isMuted);
}

function onPeerToggleMute(peerId, isMuted) {
  var muteElem = document.getElementById(peerId + "-peer-mute");
  muteElem.style.opacity = isMuted ? 1 : 0;
}

function addLocalProfile() {
  var peerName = document.createElement("span");
  peerName.className = "peer-name";
  peerName.appendChild(document.createTextNode("You"));

  var muteImg = document.createElement("img");
  muteImg.className = "peer-mute-img";
  muteImg.src = "/images/mute.png";

  var peerMute = document.createElement("div");
  peerMute.className = "peer-mute";
  peerMute.id = "local-peer-mute";
  peerMute.style.opacity = "0";
  peerMute.appendChild(muteImg);

  var peerElem = document.createElement("div");
  peerElem.className = "peer";
  peerElem.appendChild(peerName);

  var container = document.createElement("div");
  container.className = "peer-container";
  container.appendChild(peerElem);
  container.appendChild(peerMute);

  peerGrid.appendChild(container);
}

function addPeerProfile(call, stream) {
  var peerName = document.createElement("span");
  peerName.className = "peer-name";
  peerName.appendChild(document.createTextNode(call.peer.substring(0, 4)));

  var audioElem = document.createElement("audio");
  audioElem.srcObject = stream;
  audioElem.addEventListener("loadedmetadata", () => audioElem.play());

  var peerElem = document.createElement("div");
  peerElem.className = "peer";
  peerElem.appendChild(peerName);
  peerElem.appendChild(audioElem);

  var muteImg = document.createElement("img");
  muteImg.className = "peer-mute-img";
  muteImg.src = "/images/mute.png";

  var peerMute = document.createElement("div");
  peerMute.className = "peer-mute";
  peerMute.id = call.peer + "-peer-mute";
  peerMute.style.opacity = "0";
  peerMute.appendChild(muteImg);

  var container = document.createElement("div");
  container.className = "peer-container";
  container.appendChild(peerElem);
  container.appendChild(peerMute);

  remotePeers[call.peer] = call;
  call.on("close", () => container.remove());
  peerGrid.appendChild(container);
}

function shareUrl() {
  if (!window.getSelection) {
    alert("Clipboard not available, sorry!");
    return;
  }
  const dummy = document.createElement("p");
  dummy.textContent = window.location.href;
  document.body.appendChild(dummy);

  const range = document.createRange();
  range.setStartBefore(dummy);
  range.setEndAfter(dummy);

  const selection = window.getSelection();
  // First clear, in case the user already selected some other text
  selection.removeAllRanges();
  selection.addRange(range);

  document.execCommand("copy");
  document.body.removeChild(dummy);

  notifyMe("link shared to clipboard");
  shareButton.innerHTML = "CTRL-V";
  setTimeout(function() {
    shareButton.innerHTML = "Share";
  }, 1000);
}

function notifyMe(msg) {
  // Let's check if the browser supports notifications
  if (!("Notification" in window)) {
    alert(msg);
  }

  // Let's check whether notification permissions have already been granted
  else if (Notification.permission === "granted") {
    // If it's okay let's create a notification
    var notification = new Notification(msg);
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(function(permission) {
      // If the user accepts, let's create a notification
      if (permission === "granted") {
        var notification = new Notification(msg);
      }
    });
  }

  // At last, if the user has denied notifications, and you
  // want to be respectful there is no need to bother them any more.
}

function mediaAnalyze() {
  try {
    if (!localStream) return;
    var audio = localStream;
    var audioCtx = new AudioContext();
    var analyzer = audioCtx.createAnalyser();
    var source = audioCtx.createMediaStreamSource(audio);
    source.connect(analyzer);
    // analyzer.connect(audioCtx.destination);
    analyzer.fftSize = 128;

    var frequencyData = new Uint8Array(analyzer.frequencyBinCount);

    var bins = [];
    frequencyData.forEach(function(e) {
      var e = document.createElement("div");
      e.classList.add("bin");
      document.getElementById("bins").appendChild(e);
      bins.push(e);
    });
    function renderFrame() {
      analyzer.getByteFrequencyData(frequencyData);
      frequencyData.forEach(function(data, index) {
        bins[index].style.height = (data * 100) / 256 + "%";
      });
      requestAnimationFrame(renderFrame);
    }
    renderFrame();
  } catch (e) {
    console.log(e);
  }
}

function lockRoom(roomname) {
  lock = lock ? false : true;
  lockButton.innerHTML = lock ? "&#128274;" : "&#128275;";
  console.log('switch lock!',lock,roomname);
  fetch(window.location.protocol + "rooms", {
    method: "POST",
    cache: "no-cache",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: roomname,
      locked: lock
    })
  })
    .then(res => e => console.log(res))
    .catch(e => console.log(e));
}
