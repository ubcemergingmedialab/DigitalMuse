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
        const prediction = await model.estimateFaces(video, false);
        let ctx = contexts[counter - 1];
        let cw = canvases[counter - 1].width;
        let ch = canvases[counter - 1].height;
        let lastX, lastY, lastHeight, lastWidth;
        prediction.forEach((pred) => {
            /*
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
            })*/
            // draw cropped image
            ctx.clearRect(0, 0, cw, ch)
            var sourceX = lastX ? lerp(lastX, ((pred.landmarks[4][0]) - 10), 0.1) : (pred.landmarks[4][0]) - 10;
            var sourceY = lastY ? lerp(lastY, ((pred.landmarks[4][1]) - (((pred.landmarks[3][1]) - (pred.landmarks[0][1])) * 2.6)), 0.1) : ((pred.landmarks[4][1]) - (((pred.landmarks[3][1]) - (pred.landmarks[0][1])) * 2.6));
            lastX = sourceX;
            lastY = sourceY;
            //var sourceWidth = (pred.bottomRight[0] - pred.topLeft[0]) - (pred.landmarks[4][0] - pred.topLeft[0]);
            var sourceWidth = lastWidth? lerp(lastWidth, (pred.landmarks[5][0] - pred.landmarks[4][0]) + 20, 0.1): (pred.landmarks[5][0] - pred.landmarks[4][0]) + 20;
            //var sourceHeight = ((pred.landmarks[3][1] + 20) - (pred.topLeft[1] - 10));
            var sourceHeight = lastHeight? lerp(lastHeight, (pred.landmarks[3][1] - pred.landmarks[0][1]) * 4 + 10, 0.1) : (pred.landmarks[3][1] - pred.landmarks[0][1]) * 4 + 10;
            lastWidth = sourceWidth;
            lastHeight = sourceHeight;
            var sourceRatio = sourceWidth / sourceHeight;
            var destWidth = 80;
            var destHeight = destWidth / sourceRatio;
            var destX = cw / 2 - destWidth / 2;
            var destY = ch / 2 - destHeight / 2;
            ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 40, destWidth, destHeight);
            ctx.globalCompositeOperation = 'destination-in';
            ctx.beginPath();
            ctx.ellipse(destWidth / 2, destHeight / 2 + 50, destWidth / 2 - 10, destHeight / 2, 0, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        });
    }
}

videos.forEach((video) => {
    video.addEventListener("loadeddata", async () => {
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