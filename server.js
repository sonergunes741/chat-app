const express = require('express');
const { WebSocket, WebSocketServer } = require('ws');
const path = require('path');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Statik dosyaları serve et
app.use(express.static('public'));

// HTTP sunucusu
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// WebSocket sunucusu
const wss = new WebSocketServer({ server });
const rooms = new Map();

wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true).query;
    const username = parameters.username;
    const roomKey = parameters.roomKey;

    if (!rooms.has(roomKey)) {
        rooms.set(roomKey, new Set());
    }
    rooms.get(roomKey).add(ws);

    ws.on('message', (data) => {
        const messageData = JSON.parse(data);
        
        rooms.get(roomKey).forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    username: messageData.username,
                    message: messageData.message
                }));
            }
        });
    });

    ws.on('close', () => {
        rooms.get(roomKey).delete(ws);
        if (rooms.get(roomKey).size === 0) {
            rooms.delete(roomKey);
        }
    });
});