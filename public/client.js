/* client.js */
let socket;
let username = '';
let roomKey = '';

function joinRoom() {
    username = document.getElementById('username').value;
    roomKey = document.getElementById('roomKey').value;
    
    if (!username || !roomKey) {
        alert('Lütfen kullanıcı adı ve oda anahtarını girin');
        return;
    }

    // WebSocket bağlantısını başlat
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}?username=${username}&roomKey=${roomKey}`;
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        document.querySelector('.join-container').style.display = 'none';
        document.querySelector('.chat-container').style.display = 'block';
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        displayMessage(message);
    };
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value;
    
    if (message && socket) {
        socket.send(JSON.stringify({
            username,
            roomKey,
            message
        }));
        input.value = '';
    }
}

function displayMessage(data) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `<span class="username">${data.username}:</span> ${data.message}`;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});