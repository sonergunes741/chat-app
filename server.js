const express = require('express');
const { WebSocket, WebSocketServer } = require('ws');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const cors = require('cors');

const mongoose = require('mongoose');
const Message = require('./models/Message');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB bağlantısı başarılı'))
    .catch(err => console.error('MongoDB bağlantı hatası:', err));

app.use(cors());

// Statik dosyaları serve etmek için public klasörünü belirt
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});

// Key oluşturma endpoint'i
app.get('/generate-key', (req, res) => {
    console.log('Key oluşturma isteği alındı');
    const uniqueKey = generateUniqueKey();
    console.log('Oluşturulan key:', uniqueKey);
    res.json({ key: uniqueKey });
});

// Oda geçmişi endpoint'i
app.get('/room-history/:roomKey', async (req, res) => {
    try {
        const messages = await Message.find({ 
            roomKey: req.params.roomKey 
        }).sort({ createdAt: -1 }).limit(100);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// const server = app.listen(PORT, () => {
//     console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
// });

// WebSocket sunucusu için güvenli bağlantı yapılandırması
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// ... (diğer WebSocket kodları aynı kalacak)

const wss = new WebSocketServer({ 
    server,
    clientTracking: true,
    perMessageDeflate: false // Performans optimizasyonu
});
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

    // WebSocket message handler içine eklenecek kısım
ws.on('message', async (data) => {
    const messageData = JSON.parse(data);
    
    // Mesaj kaydetme tercihi kontrolü
    if (messageData.saveMessage) {
        try {
            await Message.create({
                username: messageData.username,
                message: messageData.message,
                roomKey: roomKey
            });
        } catch (err) {
            console.error('Mesaj kaydetme hatası:', err);
        }
    }
    
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

function generateUniqueKey() {
    return crypto.randomBytes(4).toString('hex');
}