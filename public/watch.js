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
const canvases = document.querySelectorAll(".temporary-canvas");
const contexts = []
canvases.forEach((canvas, index) => {
    contexts[index] = canvas.getContext("2d");
})
const finalCanvas = document.getElementById("finalCanvas");
const finalContext = finalCanvas.getContext("2d");
const backdrop = document.getElementById("backdrop");
const heightRatio = backdrop.height / finalCanvas.style.height;
const widthRatio = backdrop.width / finalCanvas.style.width;

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
        {// cup person
            faceHeight: 125,
            xPosition: 180,
            yPosition: 470
        },
        {// elephant 1
            faceHeight: 125,
            xPosition: 385,
            yPosition: 10
        },
        {// elephant 2
            faceHeight: 125,
            xPosition: 675,
            yPosition: 80
        },
        {// elephant 3
            faceHeight: 125,
            xPosition: 920,
            yPosition: 170
        },
        {//wall person
            faceHeight: 125,
            xPosition: 1153,
            yPosition: 630
        },
        {//cloud person
            faceHeight: 125,
            xPosition: 1150,
            yPosition: 65
        },
    ],
    carnival: [
        {//gymnast
            faceHeight: 125,
            xPosition: 675,
            yPosition: 50
        },
        {//front person
            faceHeight: 125,
            xPosition: 780,
            yPosition: 460
        },
        {//sitting tiger
            faceHeight: 125,
            xPosition: 570,
            yPosition: 320
        },
        {// juggler
            faceHeight: 125,
            xPosition: 280,
            yPosition: 410
        },
        {// dancer
            faceHeight: 125,
            xPosition: 340,
            yPosition: 220
        },
        {//tiger
            faceHeight: 125,
            xPosition: 920,
            yPosition: 400
        },
        {//whip person
            faceHeight: 125,
            xPosition: 1030,
            yPosition: 270
        },
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
let models = {};
let isClearing;
let connectionCounter = 0;
let drawCount = 0;
const urlParams = new URLSearchParams(window.location.search);
const currentImage = urlParams.get('theme');

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
        
        // Catherine says:
        // The following 3 lines need to be changed to calculate xPosition, yPosition, and faceHeight
        // based on the height and width of #backdrop. We can take the pixel values supplied
        // for xPosition, etc., and then divide by height/width to get the new values.
        // A nice-to-have would recalculuate these positions and faceHeight when the window
        // resize event is triggered.
        if (!propertyAssignments[id]) {
            propertyAssignments[id] = imageProperties[currentImage][counter]
            console.log('assigning properties ' + JSON.stringify(propertyAssignments));
        }
        let desiredCenterX = propertyAssignments[id].xPosition * widthRatio;
        let desiredCenterY = propertyAssignments[id].yPosition * heightRatio;
        let desiredHeight = propertyAssignments[id].faceHeight * heightRatio;
        videos[counter].style.display = "none"
        const prediction = await models[id].estimateFaces({ input: video });
        let ctx = contexts[counter];
        let cw = canvases[counter].width;
        let ch = canvases[counter].height;
        canvases[counter].style.display = "none";
        let region = new Path2D();
        ctx.clearRect(0, 0, cw, ch)
        prediction.forEach((prediction) => {
            let predictedCenterX = (prediction.boundingBox.bottomRight[0] + prediction.boundingBox.topLeft[0]) / 2;
            let predictedCenterY = (prediction.boundingBox.bottomRight[1] + prediction.boundingBox.topLeft[1]) / 2;
            let predictedHeight = prediction.boundingBox.bottomRight[1] - prediction.boundingBox.topLeft[1];
            let predictedWidth = prediction.boundingBox.bottomRight[0] - prediction.boundingBox.topLeft[0];
            let predictionRatio = predictedHeight / predictedWidth;
            let desiredWidth = desiredHeight / predictionRatio;
            ctx.drawImage(video, 0, 0, cw, ch);
            const keypoints = prediction.annotations.silhouette;
            ctx.fillStyle = GREEN;
            for (let i = 0; i < keypoints.length; i++) {
                if (i == 0) {
                    region.moveTo((keypoints[i][0]), (keypoints[i][1]));
                    //ctx.stroke();
                } else {
                    region.lineTo((keypoints[i][0]), (keypoints[i][1]))
                    //ctx.stroke();
                }
            }
            region.closePath();
            ctx.globalCompositeOperation = 'destination-in';
            ctx.fill(region);
            ctx.globalCompositeOperation = 'source-over';
            finalContext.drawImage(canvases[counter], prediction.boundingBox.topLeft[0], (prediction.boundingBox.topLeft[1]) - 30, predictedWidth, predictedHeight, desiredCenterX, desiredCenterY, desiredWidth, desiredHeight)
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
                detectFaces(video, counter, id)()
            }, 100)
        }
        );
    }
}

handleSwapVideos = function () {
    let id1 = Object.keys(propertyAssignments)[0]
    let id2 = Object.keys(propertyAssignments)[1]
    if (propertyAssignments[id1] && propertyAssignments[id2]) {
        let tempProperties = propertyAssignments[id1];
        propertyAssignments[id1] = propertyAssignments[id2];
        propertyAssignments[id2] = tempProperties;
        console.log('swapped properties');
    }
    console.log(propertyAssignments);
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
    
    var rect = document.getElementById("backdrop").getBoundingClientRect();
    finalCanvas.style.left = rect.left;
    finalCanvas.style.width = document.getElementById("backdrop").style.width;
    console.log(rect.top, rect.right, rect.bottom, rect.left);

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
                if (!models[id]) {
                    models[id] = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
                }
                console.log('calling detect faces ' + id);
                requestAnimationFrame(detectFaces(videos[Object.keys(videosByConnection).length - 1], Object.keys(videosByConnection).length - 1, id)); // have to subtract one to keep counter correct after adding to videosByConnection // pass in id
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

