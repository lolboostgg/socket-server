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

io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.join("boosters");

    socket.emit("connected", {
        message: "lolboost websocket online",
        socketId: socket.id
    });

    socket.on("booster:join", () => {
        socket.join("boosters");
    });

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
    const room = String(req.body.room || "boosters").trim();
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

    io.to(room).emit(event, payload);
    return res.json({ ok: true, event, room });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT}`);
});
