const express = require("express");
const path = require("path");
const app = express();

const port = process.env.PORT || 8080;

const http = require("http");
const { RSA_PKCS1_PADDING } = require("constants");
const server = http.createServer(app);

const io = require("socket.io")(server);
app.use(express.static(path.join(__dirname + "/public")));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,'/public/index.html'));
})

app.get('/watch', (req, res) => {
    res.sendFile(path.join(__dirname,'/public/watch.html'));
})

app.get('/broadcast', (req, res) => {
    res.sendFile(path.join(__dirname,'/public/broadcast.html'));
})

io.sockets.on("error", e => console.log(e));
server.listen(port, () => console.log(`Server is running on port ${port}`));

let broadcasters = {};
let broadcasterCounts = {};

let watchers = {};

io.sockets.on("connection", socket => {
    socket.on("broadcaster", (room) => {
        console.log('got broadcaster');
        broadcasters[room] ? broadcasters[room].push({id:socket.id}) : broadcasters[room] = [{id: socket.id}]; //create list of broadcasters in room if doesnt exist
        typeof broadcasterCounts[room] == "number" ? broadcasterCounts[room]++ : broadcasterCounts[room] = 0; // create list of broadcaster counts for each room if doesnt exist
        socket.join(room);
        socket.to(room).emit("broadcaster");
    });
    socket.on("watcher", (room) => {
        console.log('got watcher');
        socket.join(room);
        socket.to(room).emit("watcher", socket.id);
    });
    socket.on("disconnect", (room) => {
        socket.to(room).emit("disconnectPeer", socket.id);
    });
    socket.on("offer", (id, message) => {
        console.log('got offer');
        socket.to(id).emit("offer", socket.id, message);
    });
    socket.on("answer", (id, message) => {
        console.log('got answer');
        socket.to(id).emit("answer", socket.id, message);
    });
    socket.on("candidate", (id, message) => {
        console.log('got candidate');
        socket.to(id).emit("candidate", socket.id, message);
    });
});

