const peerConnections = {};
const config = {
    iceServers: [
        {
            urls: ["stun:stun.l.google.com:19302"]
        }
    ]
};


const videos = document.querySelectorAll("video");
const canvases = document.querySelectorAll("canvas");
const contexts = []
canvases.forEach((canvas, index) => {
    contexts[index] = canvas.getContext("2d");
})
const finalCanvas = document.getElementById("finalCanvas");
const finalContext = finalCanvas.getContext("2d");

const imageProperties = [
    {
        faceHeight: 100,
        xPosition: 100,
        yPosition: 130
    },
    {
        faceHeight: 50,
        xPosition: 200,
        yPosition: 50
    },
    {
        faceHeight: 25,
        xPosition: 100,
        yPosition: 50
    },
    {
        faceHeight: 100,
        xPosition: 300,
        yPosition: 130
    },
]

let model;
let isClearing;
let connectionCounter = 0;
let drawCount = 0;

const NUM_KEYPOINTS = 468;
const NUM_IRIS_KEYPOINTS = 5;
const GREEN = '#32EEDB';
const RED = '#FF2C35';
const BLUE = '#157AB3';
let stopRendering = false;

const lerp = (start, end, amt) => {
    return (1 - amt) * start + amt * end
}

const state = {
    backend: 'webgl',
    maxFaces: 1,
    triangulateMesh: true,
    predictIrises: true
};

function distance(a, b) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

function drawPath(ctx, points, closePath) {
    const region = new Path2D();
    region.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        const point = points[i];
        region.lineTo(point[0], point[1]);
    }

    if (closePath) {
        region.closePath();
    }
    ctx.stroke(region);
}

const detectFaces = (video, counter) => {
    return async function () {
        if(drawCount > connectionCounter) {
            finalContext.clearRect(0, 0, 600, 400);
            console.log('clearing canvas ' + drawCount + ' ' + connectionCounter);
            drawCount = 0;
        }
        drawCount ++;
        let desiredCenterX = imageProperties[counter - 1].xPosition;
        let desiredCenterY = imageProperties[counter - 1].yPosition;
        let desiredHeight = imageProperties[counter - 1].faceHeight;
        videos[counter - 1].style.display = "none"
        const prediction = await model.estimateFaces({ input: video });
        let ctx = contexts[counter - 1];
        let cw = canvases[counter - 1].width;
        let ch = canvases[counter - 1].height;
        canvases[counter - 1].style.display = "none";
        let region = new Path2D();
        ctx.clearRect(0, 0, cw, ch)
        prediction.forEach((prediction) => {
            let predictedCenterX = (prediction.boundingBox.bottomRight[0] + prediction.boundingBox.topLeft[0]) / 2;
            let predictedCenterY = (prediction.boundingBox.bottomRight[1] + prediction.boundingBox.topLeft[1]) / 2;
            let xOffset = desiredCenterX - predictedCenterX;
            let yOffset = desiredCenterY - predictedCenterY;
            let predictedHeight = prediction.boundingBox.bottomRight[1] - prediction.boundingBox.topLeft[1];
            let predictedWidth = prediction.boundingBox.bottomRight[0] - prediction.boundingBox.topLeft[0];
            let predictionRatio = predictedHeight / predictedWidth;
            let desiredWidth = desiredHeight / predictionRatio;
            ctx.drawImage(video, xOffset, yOffset, cw, ch);
            const keypoints = prediction.annotations.silhouette;
            ctx.fillStyle = GREEN;
            for (let i = 0; i < keypoints.length; i++) {
                if (i == 0) {
                    region.moveTo((keypoints[i][0]) + xOffset, (keypoints[i][1]) + yOffset);
                    //ctx.stroke();
                } else {
                    region.lineTo((keypoints[i][0]) + xOffset, (keypoints[i][1]) + yOffset)
                    //ctx.stroke();
                }
            }
            region.closePath();
            ctx.globalCompositeOperation = 'destination-in';
            ctx.fill(region);
            ctx.globalCompositeOperation = 'source-over';
            finalContext.drawImage(canvases[counter - 1], prediction.boundingBox.topLeft[0] + xOffset, (prediction.boundingBox.topLeft[1]) - 30 + yOffset, predictedWidth, predictedHeight, desiredCenterX, desiredCenterY, desiredWidth, desiredHeight)
        });
    }
}

videos.forEach((video) => {
    video.addEventListener("loadeddata", async () => {
        await tf.ready();
        if (!model) {
            model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
        }
        const videoInstance = connectionCounter;
        setInterval(detectFaces(video, videoInstance), 40);
    })
})


const handleJoinRoom = () => {
    const socket = io.connect(window.location.origin);
    const roomName = document.getElementById("roomInput").value
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
        console.log('got new connection ' + connectionCounter)
    });

    socket.on("candidate", (id, candidate) => {
        console.log('got candidate');
        peerConnections[connectionCounter - 1]
            .addIceCandidate(new RTCIceCandidate(candidate))
            .catch(e => console.error(e));
    });

    socket.on("connect", () => {
        console.log('connection');
        console.log('connection to ' + roomName)
        socket.emit("watcher", roomName);
    });

    socket.on("broadcaster", () => {
        console.log('found broadcaster');
        socket.emit("watcher", roomName);
    });

    window.onunload = window.onbeforeunload = () => {
        socket.close();
        Object.entries(peerConnections).forEach(([key, peerConnection]) => {
            peerConnection.close();
        })
    };
}
document.getElementById("start").addEventListener("click", handleJoinRoom);

