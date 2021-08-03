const peerConnections = {};
const config = {
    iceServers: [
        {
            urls: ["stun:stun.l.google.com:19302"]
        }
    ]
};

const socket = io.connect(window.location.origin);
const video = document.querySelector("video");

// Media contrains
const constraints = {
    video: { facingMode: "user", width: 1325, height: 937 }
    // Uncomment to enable audio
    // audio: true,
};

handleJoinRoom = () => {
    const roomName = document.getElementById("roomInput").value
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(stream => {
            video.srcObject = stream;
            console.log('emmiting broadcaster');
            socket.emit("broadcaster", roomName);
        })
        .catch(error => console.error(error));

    socket.on("watcher", id => {
        console.log('got watcher');
        const peerConnection = new RTCPeerConnection(config);
        peerConnections[id] = peerConnection;

        let stream = video.srcObject;
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                console.log('emitting candidate');
                socket.emit("candidate", id, event.candidate);
            }
        };

        peerConnection
            .createOffer()
            .then(sdp => peerConnection.setLocalDescription(sdp))
            .then(() => {
                console.log('emitting offer');
                socket.emit("offer", id, peerConnection.localDescription);
            });
    });

    socket.on("answer", (id, description) => {
        console.log('got answer');
        peerConnections[id].setRemoteDescription(description);
    });

    socket.on("candidate", (id, candidate) => {
        console.log('got candidate');
        peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("disconnectPeer", id => {
        peerConnections[id].close();
        delete peerConnections[id];
    });

    window.onunload = window.onbeforeunload = () => {
        socket.close();
    };
}

document.getElementById("start").addEventListener("click", handleJoinRoom);