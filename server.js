const express = require("express");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
  console.log("Running on port", PORT)
);

const wss = new WebSocket.Server({ server });
const rooms = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const msg = JSON.parse(data);

    if (msg.type === "join") {
      ws.room = msg.room;
      if (!rooms.has(msg.room)) rooms.set(msg.room, []);
      rooms.get(msg.room).push(ws);
      return;
    }

    if (msg.type === "message") {
      const clients = rooms.get(ws.room) || [];
      clients.forEach((c) => {
        if (c !== ws && c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify(msg));
        }
      });
    }
  });

  ws.on("close", () => {
    if (!ws.room) return;
    rooms.set(
      ws.room,
      (rooms.get(ws.room) || []).filter((c) => c !== ws)
    );
  });
});
