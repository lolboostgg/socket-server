const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.get("/", (req, res) => {
    res.status(200).send("Socket Server Online");
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            "https://lolboost.gg",
            "https://www.lolboost.gg"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.emit("connected", {
        message: "lolboost websocket online",
        socketId: socket.id
    });

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT}`);
});
