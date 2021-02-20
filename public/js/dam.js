document.addEventListener('DOMContentLoaded', () => {
    const elPageUser = document.getElementById('page-user');
    const elFormUser = document.getElementById('form-user');
    const elFormName = document.getElementById('form-user-name');
    const elPageGame = document.getElementById('call');

    /*
    elFormUser.addEventListener('submit', e => {
        e.preventDefault();
        console.log('gun room setup',ROOM_ID); //where is ROOM_ID from?
        //gotoGame();
        loadGame();
    });

    function gotoGame() {
        elPageUser.style.display = 'none';
        elPageGame.style.display = 'block';
    }
    */
  
    loadGame();
  
    async function getICEServers() {
        var servers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.sipgate.net:3478' }
           // { urls:  `stun:${location.hostname}:80`}
        ];
        console.log('self stun',servers);
        return servers;
    }

    async function loadGame(id) {
        const user = id || ROOM_ID;
        const data = {
            [user]: { x: 0, y: 0, el: createPoint(user) },
        };
      
        try {
           var streaming = false;
           var canvas = document.getElementById('canvas');
          
        } catch(e){
          console.log(e)
        }
      
        var root = Gun({
          peers:["https://gundb-multiserver.glitch.me/openhouse_"+ROOM_ID], 
          rtc: { iceServers: await getICEServers() }, 
          multicast: false, localStorage: false, radisk: false, file: false
        });


        let sendPosition = () => {};
        let sendFrame = () => {};
        let sendSignaling = () => {};

        if (localStorage.getItem('dam')) {
            const dam = root.back('opt.mesh');
            dam.hear.GameData = (msg, peer) => {
                const { name, x, y } = msg;
                updateData(name, x, y);
            };
            dam.hear.signaling = (msg, peer) => {
                const { name, message } = msg;
                // do something with peerjs
            };
            dam.hear.Image = (msg, peer) => {
                const { image } = msg;
                console.log('got image!');
                var canvas = document.getElementById('canvas');
                var ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0,0);
            };
            sendPosition = (x, y) => {
                dam.say({ dam: 'GameData', name: user, x, y });
            };
            sendFrame = (image) => {
                console.log('sending frame!')
                dam.say({ dam: 'Image', image })
            }
            sendSignaling = (message) => {
                dam.say({ dam: 'Signaling', name: user, message});
            };
        } else {
            root.on('in', function (msg) {
                if (msg.cgx) {
                    const { name, x, y } = msg.cgx;
                    updateData(name, x, y);
                }
                if (msg.image) {
                    const { image } = msg.image;
                    console.log('got x-image!');
                    var canvas = document.getElementById('canvas');
                    var img=new Image();
                    img.src=image;
                    img.onload = function(){
                      var ctx = canvas.getContext('2d');
                      ctx.drawImage(img,0,0);
                    }
                    
                }
                this.to.next(msg);
            });
            sendPosition = (x, y) => {
                const id = Math.random().toString().slice(2);
                root.on( 'out', { '#': id, cgx: { name: user, x, y }});
            };
            sendFrame = (image) => {
                console.log('sending frame!')
                const id = Math.random().toString().slice(2);
                root.on( 'out', { '#': id, image: { image}});
            }
        }

        function updateData(name, x, y) {
            if (!data[name]) {
                data[name] = { x, y, el: createPoint(name) };
            } else {
                data[name].x = x;
                data[name].y = y;
            }
        }

        function createPoint(name) {
            var point = document.getElementById(name);
            return point;
        }

        function render() {
            for (const name of Object.keys(data)) {
                const { el, x, y } = data[name];
                el.style.left = `${x}px`;
                el.style.top = `${y}px`;
            }
        }
        function schedule() {
            requestAnimationFrame(() => {
                //render();
                schedule();
            });
        }
        schedule();

        elPageGame.addEventListener('mousemove', e => {
            data[user].x = e.x;
            data[user].y = e.y;
            //console.log('sending mouse',e.x,e.y);
            sendPosition(e.x, e.y);
            return true;
        });
    }
});
