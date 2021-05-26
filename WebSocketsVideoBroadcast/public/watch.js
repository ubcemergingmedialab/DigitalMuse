const peerConnections = {};
const config = {
    iceServers: [
        {
            urls: ["stun:stun.l.google.com:19302"]
        }
    ]
};

const socket = io.connect(window.location.origin);
const videos = document.querySelectorAll("video");
let connectionCounter = 0;

socket.on("offer", (id, description) => {
    console.log('got offer');
    let peerConnection = new RTCPeerConnection(config);
    peerConnection
        .setRemoteDescription(description)
        .then(() => peerConnection.createAnswer())
        .then(sdp => peerConnection.setLocalDescription(sdp))
        .then(() => {
            console.log('emitting answer');
            socket.emit("answer", id, peerConnection.localDescription);
        });
    peerConnection.ontrack = event => {
        videos[connectionCounter-1].srcObject = event.streams[0];
        console.log('got connection');
    };
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("candidate", id, event.candidate);
        }
    };
    peerConnections[connectionCounter] = peerConnection;
    connectionCounter++;
});

socket.on("candidate", (id, candidate) => {
    console.log('got candidate');
    peerConnections[connectionCounter - 1]
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch(e => console.error(e));
});

socket.on("connect", () => {
    console.log('connection');
    socket.emit("watcher");
});

socket.on("broadcaster", () => {
    console.log('found broadcaster');
    socket.emit("watcher");
});

window.onunload = window.onbeforeunload = () => {
    socket.close();
    Object.entries(peerConnections).forEach(([key, peerConnection]) => {
        peerConnection.close();
    })
};