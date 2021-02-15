const crypto = require("crypto");
const duplexify = require("duplexify");
const hyperswarm = require('hyperswarm-web')

const DEFAULT_WEBRTC_BOOTSTRAP = ['wss://signal.dat-web.eu', 'wss://geut-webrtc-signal-v3.glitch.me']
const DEFAULT_PROXY_SERVER = ['wss://hyperswarm.mauve.moe'];


function initiate(topic, opts) {
  let net = hyperswarm({
    bootstrap: DEFAULT_PROXY_SERVER
  });
  // look for peers listed under this topic
  var topicBuffer = crypto
    .createHash("sha256")
    .update(topic)
    .digest();
  net.join(topicBuffer, opts);
  return net;
}

var hyperTopic;

exports.connect = function(topic, cb) {
  hyperTopic = topic;
  var net = initiate(topic, {
    lookup: true, // find & connect to peers
    announce: true
  });

  net.on("connection", (socket, details) => {
    if (details.peer)
      console.error(
        "hyperswarm connected to",
        details.peer.host,
        details.peer.port
      );
    cb(null, socket);

    // we have received everything
    socket.on("end", function(topic) {
      if (topic) net.leave(topic);
    });

    socket.on("error", function(e) {
      console.error(e);
    });
  });
};
