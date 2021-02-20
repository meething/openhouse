var remotePeers = {};
var remoteUsers = {};
var localStream = null;
const localPeer = new Peer();
var localId;
var lock = false;

var dam = true;

var username = prompt(
  "Please enter your username name",
  "Anonymous" + Math.floor(Math.random() * (999 - 111 + 1)) + 111
);

const peerGrid = document.getElementById("peer-grid");
const muteButton = document.getElementById("mute-button");
const shareButton = document.getElementById("share-button");
const lockButton = document.getElementById("lock-button");
const screenButton = document.getElementById("screen-button");

// Connect to multisocket for ROOMS only! DAM uses different scope
var gun = Gun({
  peers: ["https://gundb-multiserver.glitch.me/openhouse"],
  musticast: false,
  localStorage: false,
  radisk: false,
  file: false
});

// GUN ROOMS List + Peer Counters
var gunRooms = gun.get("rooms");
// GUN ROOM Scope (alternative channel)
var gunRoom = gunRooms.get(ROOM_ID);
gunRoom.get('name').put(ROOM_ID)
// BACKUP CHANNEL. Returns the last value. Needs TS > now()
//gunRoom.on(function(data, key) {
//  console.log("gun update:", data, key);
//});

// Join GUN Room Mesh/DAM using a named scope
loadDam(ROOM_ID);

// Handle LocalPeer Events
localPeer.on("open", localPeerId => {
  // store localPeerId to Gun Room
  localId = localPeerId;
  console.log("pushing self to DAMN", ROOM_ID, localPeerId);
  // gunRoom.put({ name: "peer-joined-room", id: localPeerId });
  // notify DAM network, we joined!
  sendLog(username + " joined DAMN! PeerId: " + localPeerId);
  sendSignaling({
    type: "peer-joined-room",
    peerId: localPeerId,
    username: username
  });

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

    // JOIN-ROOM Trigger seems no longer needed?
    //sendSignaling({ type: "join-room", peerId: localPeerId, roomId: ROOM_ID, username: username });

    // Display Local Profile & automute (rcvonly here?)
    addLocalProfile();
    toggleMute();
    notifyMe("Room Joined! Unmute to speak");
    //mediaAnalyze();
  });
});

function onPeerJoined(remotePeerId, localStream) {
  if (remotePeerId == localId) return;
  console.log("damn i see remote peer joined " + remotePeerId);
  const call = localPeer.call(remotePeerId, localStream);
  call.on("stream", remoteStream => addPeerProfile(call, remoteStream));
  notifyMe("joined " + remotePeerId);
}

function onPeerLeft(remotePeerId) {
  if (remotePeerId == localId) return;
  console.log("damn i see remote peer left " + remotePeerId);
  if (remotePeers[remotePeerId]) {
    remotePeers[remotePeerId].close();
    remotePeers[remotePeerId] = null;
  }
  notifyMe("left " + remotePeerId);
}

function leaveRoom(e) {
  e.preventDefault();
  sendSignaling({ type: "peer-left-room", peerId: localId });
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
  sendSignaling({
    type: "peer-toggle-mute",
    peerId: localPeer.id,
    isMuted: isMuted
  });
  //sendLog(localPeer+' mute swap');
}

function onPeerToggleMute(peerId, isMuted) {
  try {
    var muteElem = document.getElementById(peerId + "-peer-mute");
    if (muteElem) muteElem.style.opacity = isMuted ? 1 : 0;
  } catch (e) {
    console.log(e, peerId, muteElem);
  }
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
  peerName.appendChild(
    document.createTextNode(remoteUsers[call.peer] || call.peer.substring(0, 4))
  );

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
  shareButton.innerHTML = "Ctrl-v";
  setTimeout(function() {
    shareButton.innerHTML = "Link";
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

/* Screen Sharing Code */

var sharingScreen = false;

async function shareScreen(ev) {
  // Flip the switch
  screenButton.innerHTML = sharingScreen ? "Share Screen" : "Stop Sharing";
  // Get reference to video element
  let videoElement = document.getElementById("shareview");
  // if we are already sharing, stop the sharing.
  if (sharingScreen) {
    let tracks = videoElement.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    videoElement.srcObject = null;
    sharingScreen = false;
    return;
  }
  // user asked to share their screen
  let sharedScreenStream = null;
  // create config object
  let config = { video: { cursor: "always" }, audio: false };
  try {
    sharedScreenStream = await navigator.mediaDevices.getDisplayMedia(config);
    sharingScreen = true;
    // pass shared screen to function to add track to sending
    sendScreenToAll(sharedScreenStream);
  } catch (e) {
    console.log("screencapture issue: ", e);
  }
  // set shared screen so we can see we are sharing something
  videoElement.srcObject = sharedScreenStream;

  return;
}

async function sendScreenToAll(mediaStream) {
  localPeer._connections.forEach((peer, i) => {
    console.log("sharing to", peer, mediaStream);
    try {
      localPeer.call(peer[0].id, mediaStream);
    } catch (e) {
      console.log(e);
    }
  });
}

/* End Screen Sharing Code */

function mediaAnalyze() {
  try {
    if (!localStream) return;
    var audio = localStream;
    var audioCtx = new AudioContext();
    var analyzer = audioCtx.createAnalyser();
    var source = audioCtx.createMediaStreamSource(audio);
    source.connect(analyzer);
    // analyzer.connect(audioCtx.destination);
    analyzer.fftSize = 64;

    var frequencyData = new Uint8Array(analyzer.frequencyBinCount);

    var bins = [];
    frequencyData.forEach(function(e) {
      var e = document.createElement("div");
      e.classList.add("bin");
      document.getElementById("bins").appendChild(e);
      bins.push(e);
    });
    var half = false;
    function renderFrame() {
      half = !half;
      if (half) {
        requestAnimationFrame(renderFrame);
        return;
      }
      analyzer.getByteFrequencyData(frequencyData);
      frequencyData.forEach(function(data, index) {
        bins[index].style.height = (data * 50) / 256 + "%";
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
  console.log("switch lock!", lock, roomname);
  // TODO Block New Participants
  // TODO Update Room object for hiding
  fetch(window.location.protocol + "rooms", {
    method: "POST",
    cache: "no-cache",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: roomname,
      locked: true
    })
  })
    .then(res => e => console.log(res))
    .catch(e => console.log(e));
}

async function getICEServers() {
  var servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.sipgate.net:3478" }
    // { urls:  `stun:${location.hostname}:80`}
  ];
  console.log("self stun", servers);
  return servers;
}

/* DAMNROOM! EXPERIMENTAL PART BELOW */

// Exported Functions for MESHing
let sendLog = () => {};
let sendFrame = () => {};
let sendSignaling = () => {};

async function loadDam(id) {
  console.log("bootstrapping dam with id", id);
  const user = id || ROOM_ID;
  const data = {
    [user]: { x: 0, y: 0, user: user }
  };

  try {
    var streaming = false;
    var canvas = document.getElementById("canvas");
  } catch (e) {
    console.log(e);
  }

  var root = Gun({
    peers: ["https://gundb-multiserver.glitch.me/openhouse_" + ROOM_ID],
    rtc: { iceServers: await getICEServers() },
    multicast: false,
    localStorage: false,
    radisk: false,
    file: false
  });

  
    console.log("Root DAM");
    root.on("in", function(msg) {
      if (msg.log) {
        const { log } = msg.log;
        console.log("got x-log!");
        console.log(log);
      }
      if (msg.signaling) {
        // Switch Call States
        const { data } = msg.signaling;
        if (data.peerId && data.peerId == localId) return;
        console.log("got x-signaling!", data.type);
        switch (data.type) {
          case "join-room":
            console.log(data.type, data);
            remoteUsers[data.peerId] = data.username;
            // TRIGGER FOR peer-joined-room! do nothing or use for username pairing only
            onPeerJoined(data.peerId, localStream);
            gunRoom.get('peers').get(data.peerId).put(msg.signaling);
            break;
          case "peer-joined-room":
            console.log(data.type, data);
            remoteUsers[data.peerId] = data.username;
            onPeerJoined(data.peerId, localStream);
            break;
          case "peer-left-room":
            console.log(data.type, data);
            delete remoteUsers[data.peerId];
            onPeerLeft(data.peerId);
            gunRoom.get('peers').get(data.peerId).put(null);
            var count = gunRoom.get('peers').length;
            console.log('room state',count)
            break;
          case "peer-toggle-mute":
            console.log(data.type, data);
            onPeerToggleMute(data.peerId, data.isMuted);
            break;
        }
      }
      if (msg.image) {
        const { image } = msg.image;
        console.log("got x-image!");
        var canvas = document.getElementById("canvas");
        var img = new Image();
        img.src = image;
        img.onload = function() {
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
        };
      }
      this.to.next(msg);
    });
    sendLog = log => {
      //console.log("trying to send log", log);
      const id = randId();
      root.on("out", { "#": id, log: { name: user, log } });
    };
    sendSignaling = data => {
      //console.log("trying to send signaling", data);
      const id = randId();
      root.on("out", { "#": id, signaling: { name: user, data } });
    };
    sendFrame = image => {
      console.log("sending frame!");
      const id = randId();
      root.on("out", { "#": id, image: { image } });
    };
  

  function randId() {
    return Math.random()
      .toString()
      .slice(2);
  }
  function updateData(name, x, y) {
    if (!data[name]) {
      console.log("unknown party!", name);
    } else {
      data[name].x = x;
      data[name].y = y;
    }
  }
}
