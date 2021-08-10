const peerConnections = {};
const config = {
    iceServers: [
        {
            urls: ["stun:stun.l.google.com:19302"]
        }
    ]
};


let canvasCleared = false;
const videos = document.querySelectorAll("video");
videosByConnection = {};
const canvases = document.querySelectorAll("canvas");
const contexts = []
canvases.forEach((canvas, index) => {
    contexts[index] = canvas.getContext("2d");
})
const finalCanvas = document.getElementById("finalCanvas");
const finalContext = finalCanvas.getContext("2d");

propertyAssignments = {
    //peer connection id -> image property
}

const imageProperties = {
    spaceship: [
        {//board person
            faceHeight: 150,
            xPosition: 1130,
            yPosition: 440
        },
        {//bottom left chair person
            faceHeight: 150,
            xPosition: 670,
            yPosition: 500
        },
        {// chair person
            faceHeight: 150,
            xPosition: 340,
            yPosition: 190
        },
        {// clipboard person
            faceHeight: 150,
            xPosition: 190,
            yPosition: 510
        },
        {//hand up person
            faceHeight: 150,
            xPosition: 135,
            yPosition: 160
        },
    ],
    salvador: [
        {//board person
            faceHeight: 125,
            xPosition: 1140,
            yPosition: 440
        },
        {//bottom left chair person
            faceHeight: 125,
            xPosition: 670,
            yPosition: 500
        },
        {// chair person
            faceHeight: 125,
            xPosition: 340,
            yPosition: 190
        },
        {// clipboard person
            faceHeight: 125,
            xPosition: 190,
            yPosition: 510
        },
        {//hand up person
            faceHeight: 125,
            xPosition: 135,
            yPosition: 160
        },
    ],
    carnival: [
        [
            {//board person
                faceHeight: 125,
                xPosition: 1140,
                yPosition: 440
            },
            {//bottom left chair person
                faceHeight: 125,
                xPosition: 670,
                yPosition: 500
            },
            {// chair person
                faceHeight: 125,
                xPosition: 340,
                yPosition: 190
            },
            {// clipboard person
                faceHeight: 125,
                xPosition: 190,
                yPosition: 510
            },
            {//hand up person
                faceHeight: 125,
                xPosition: 135,
                yPosition: 160
            },
        ],
    ]
}

window.addEventListener("DOMContentLoaded", () => {
    let url_string = window.location.href
    let url = new URL(url_string);
    let theme = url.searchParams.get("theme");
    document.getElementById("backdrop").src = theme + ".jpg";
    console.log(document.getElementById("backdrop").naturalWidth + " " + document.getElementById("backdrop").naturalHeight)
});

let model;
let isClearing;
let connectionCounter = 0;
let drawCount = 0;
let currentImage = "spaceship"

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

const detectFaces = (video, counter, id) => {
    return async function () {
        // if property assignments hasnt assigned current id, add current id property assignment from imageProperties[currentImage][counter]
        if(!propertyAssignments[id]) {
            propertyAssignments[id] = imageProperties[currentImage][counter]
            console.log('assigning properties '+ id);
        }
        let desiredCenterX = propertyAssignments[id].xPosition;
        let desiredCenterY = propertyAssignments[id].yPosition;
        let desiredHeight = propertyAssignments[id].faceHeight;
        videos[counter].style.display = "none"
        const prediction = await model.estimateFaces({ input: video });
        let ctx = contexts[counter];
        let cw = canvases[counter].width;
        let ch = canvases[counter].height;
        canvases[counter].style.display = "none";
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
            finalContext.drawImage(canvases[counter], prediction.boundingBox.topLeft[0] + xOffset, (prediction.boundingBox.topLeft[1]) - 30 + yOffset, predictedWidth, predictedHeight, desiredCenterX, desiredCenterY, desiredWidth, desiredHeight)
            drawCount++;
            if (drawCount > Object.keys(videosByConnection).length * 10) {
                canvasCleared = false;
            }
        });
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (!canvasCleared) {
                    finalContext.clearRect(0, 0, 1920, 1300);
                    canvasCleared = true;
                    drawCount = 0;
                }
                detectFaces(video, counter, model)()
            }, 200)
        }
        );
    }
}

const handleSwapVideos = (id1, id2) => {
    if(propertyAssignments[id1] && propertyAssignments[id2]) {  
        let tempProperties = propertyAssignments[id1];
        propertyAssignmnets[id1] = propertyAssignmnets[id2];
        propertyAssignmnets[id2] = tempProperties;
    }
}
/*
videos.forEach((video) => {
    video.addEventListener("loadeddata", async () => {
        await tf.ready();
        if (!model) {
            model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
        }
        const videoInstance = connectionCounter;
        setInterval(detectFaces(video, videoInstance), 40);
    })
})*/


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
            videosByConnection[id] = videos[Object.keys(videosByConnection).length]
            videosByConnection[id].addEventListener("loadeddata", async () => {
                await tf.ready();
                if (!model) {
                    model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
                }
                requestAnimationFrame(detectFaces(videos[Object.keys(videosByConnection).length - 1], Object.keys(videosByConnection).length - 1), id); // have to subtract one to keep counter correct after adding to videosByConnection // pass in id
            })
            videosByConnection[id].srcObject = event.streams[0];

            console.log('got connection');
        };
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit("candidate", id, event.candidate);
            }
        };
        peerConnections[id] = peerConnection;

        console.log('got new connection ' + JSON.stringify(peerConnections[id]))
    });

    socket.on("candidate", (id, candidate) => {
        console.log('got candidate');
        peerConnections[id]
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

