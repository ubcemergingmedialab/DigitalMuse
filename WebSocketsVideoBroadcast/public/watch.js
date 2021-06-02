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
const canvases = document.querySelectorAll("canvas");
const contexts = []
canvases.forEach((canvas, index) => {
    contexts[index] = canvas.getContext("2d");
})

let model;
let connectionCounter = 0;

const detectFaces = (video, counter) => {
    return async function() {
        const prediction = await model.estimateFaces(video, false);
        console.log(prediction);
        contexts[counter-1].drawImage(video, 0, 0, 600, 400);
        let ctx = contexts[counter-1];
        prediction.forEach((pred) => {
            ctx.beginPath();
            ctx.lineWidth = "4";
            ctx.rect(
                pred.topLeft[0],
                pred.topLeft[1],
                pred.bottomRight[0] - pred.topLeft[0],
                pred.bottomRight[1] - pred.topLeft[1]
            );
            ctx.stroke();

            ctx.fillStyle = "red";
            pred.landmarks.forEach((landmark) => {
                ctx.fillRect(landmark[0], landmark[1], 5, 5);
            })
        });
    }
}

videos.forEach((video) => {
    video.addEventListener("loadeddata", async() => {
        model = await blazeface.load();
        const videoInstance = connectionCounter;
        setInterval(detectFaces(video, videoInstance), 40);
    })
})

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