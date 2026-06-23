const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true, limit: "512kb" }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://lolboost.gg,https://www.lolboost.gg")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

const realtimeSecret = process.env.REALTIME_SECRET || "CHANGE_ME_LONG_RANDOM_SECRET";

app.get("/", (req, res) => {
    res.status(200).send("Socket Server Online");
});

app.get("/health", (req, res) => {
    res.json({ ok: true, service: "lolboost-realtime" });
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: function(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error("Origin not allowed"));
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

const ALLOWED_ROOMS = new Set(["boosters", "admins", "clients", "sellers"]);

function safeJoin(socket, room) {
    if (typeof room !== "string") return;
    const clean = room.trim();
    if (!clean || !ALLOWED_ROOMS.has(clean)) return;
    socket.join(clean);
}

io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.emit("connected", {
        message: "lolboost websocket online",
        socketId: socket.id
    });

    // Generic room join used by every role (booster/admin/client/seller).
    // The frontend calls socket.emit('join', 'admins') etc. right after connecting.
    socket.on("join", (room) => safeJoin(socket, room));

    // Kept for backwards compatibility with already-deployed booster frontends.
    socket.on("booster:join", () => safeJoin(socket, "boosters"));

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
    });
});

function isAuthorized(req) {
    const token = req.headers["x-realtime-secret"] || req.body.secret || req.query.secret;
    return !!token && token === realtimeSecret;
}

app.post("/emit", (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ ok: false, reason: "unauthorized" });
    }

    const event = String(req.body.event || "").trim();
    const roomInput = req.body.room || "boosters";
    const rooms = (Array.isArray(roomInput) ? roomInput : [roomInput])
        .map(r => String(r || "").trim())
        .filter(r => ALLOWED_ROOMS.has(r));
    const payload = req.body.data || {};

    const allowedEvents = new Set([
        "new_order",
        "orders_panel_update",
        "booster_request",
        "notification_update",
        "chat_update",
        "order_status_update",
        "order_account_update",
        "price_update"
    ]);

    if (!allowedEvents.has(event)) {
        return res.status(400).json({ ok: false, reason: "invalid_event" });
    }

    if (rooms.length === 0) {
        return res.status(400).json({ ok: false, reason: "invalid_room" });
    }

    rooms.forEach(r => io.to(r).emit(event, payload));
    return res.json({ ok: true, event, rooms });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT}`);
});
