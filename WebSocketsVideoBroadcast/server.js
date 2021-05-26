const express = require("express");
const app = express();

const port = 4000;

const http = require("http");
const server = http.createServer(app);

const io = require("socket.io")(server);
app.use(express.static(__dirname + "/public"));

io.sockets.on("error", e => console.log(e));
server.listen(port, () => console.log(`Server is running on port ${port}`));

let broadcasters = [];
let broadCasterCount = 0;

io.sockets.on("connection", socket => {
    socket.on("broadcaster", () => {
        console.log('got broadcaster');
        broadcasters.push(socket.id);
        broadCasterCount++;
        socket.broadcast.emit("broadcaster");
    });
    socket.on("watcher", () => {
        console.log('got watcher');
        socket.to(broadcasters[broadCasterCount-1]).emit("watcher", socket.id);
    });
    socket.on("disconnect", () => {
        socket.to(broadcasters[broadCasterCount-1]).emit("disconnectPeer", socket.id);
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

