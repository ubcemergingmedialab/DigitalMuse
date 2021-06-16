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

const lerp = (start, end, amt) => {
    return (1 - amt) * start + amt * end
}

const detectFaces = (video, counter) => {
    return async function () {
        videos[counter - 1].style.display = "none"
        const prediction = await model.estimateFaces({input: video});
        let ctx = contexts[counter - 1];
        let cw = canvases[counter - 1].width;
        let ch = canvases[counter - 1].height;
        prediction.forEach((pred) => {
            ctx.clearRect(0, 0, cw, ch)
            var sourceX = pred.boundingBox.topLeft[0];
            var sourceY = pred.boundingBox.topLeft[1];
            var sourceWidth = pred.boundingBox.bottomRight[0];
            var sourceHeight = pred.boundingBox.bottomRight[1];
            var sourceRatio = sourceWidth / sourceHeight;
            var destWidth = 200;
            var destHeight = destWidth / sourceRatio;
            var destX = cw / 2 - destWidth / 2;
            var destY = ch / 2 - destHeight / 2;
            ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, destWidth, destHeight);
        });
    }
}

videos.forEach((video) => {
    video.addEventListener("loadeddata", async () => {
        model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
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
        videos[connectionCounter - 1].srcObject = event.streams[0];


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