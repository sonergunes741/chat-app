const express = require('express');
const { WebSocket, WebSocketServer } = require('ws');
const path = require('path');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });
const rooms = new Map();

wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true).query;
    const username = parameters.username;
    const roomKey = parameters.roomKey;

    if (!rooms.has(roomKey)) {
        rooms.set(roomKey, new Map());
    }

    // Kullanıcı bilgisini WebSocket nesnesine ekle
    ws.username = username;
    ws.roomKey = roomKey;
    
    // Kullanıcıyı odaya ekle
    rooms.get(roomKey).set(ws, username);

    // Tüm kullanıcılara güncel listeyi gönder
    broadcastUsers(roomKey);
    
    // Katılma mesajını gönder
    broadcastSystemMessage(roomKey, `${username} odaya katıldı`);

    ws.on('message', (data) => {
        const messageData = JSON.parse(data);
        
        rooms.get(roomKey).forEach((username, client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'message',
                    username: messageData.username,
                    message: messageData.message
                }));
            }
        });
    });

    ws.on('close', () => {
        const username = ws.username; // WebSocket nesnesinden username'i al
        const roomKey = ws.roomKey;   // WebSocket nesnesinden roomKey'i al
        
        if (rooms.has(roomKey)) {
            rooms.get(roomKey).delete(ws);
            
            if (rooms.get(roomKey).size === 0) {
                rooms.delete(roomKey);
            } else {
                // Ayrılma mesajını gönder
                broadcastSystemMessage(roomKey, `${username} odadan ayrıldı`);
                // Güncel kullanıcı listesini gönder
                broadcastUsers(roomKey);
            }
        }
    });
});

// Global fonksiyonlar
function broadcastUsers(roomKey) {
    if (!rooms.has(roomKey)) return;
    
    const users = Array.from(rooms.get(roomKey).values());
    const userListMessage = JSON.stringify({
        type: 'userList',
        users: users
    });
    
    rooms.get(roomKey).forEach((username, client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(userListMessage);
        }
    });
}

function broadcastSystemMessage(roomKey, message) {
    if (!rooms.has(roomKey)) return;
    
    const systemMessage = JSON.stringify({
        type: 'system',
        message: message
    });
    
    rooms.get(roomKey).forEach((username, client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(systemMessage);
        }
    });
}