// client.js
let socket;
let username = '';
let roomKey = '';
let userAvatar = null;

// Tema değiştirme
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Sayfa yüklendiğinde tema kontrolü
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Avatar yükleme
    const avatarUpload = document.getElementById('avatarUpload');
    avatarUpload.addEventListener('change', handleAvatarUpload);
});

document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// Avatar yükleme işlemi
function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            userAvatar = e.target.result;
            document.getElementById('avatarPreview').style.backgroundImage = `url(${userAvatar})`;
        };
        reader.readAsDataURL(file);
    }
}

function joinRoom() {
    username = document.getElementById('username').value;
    const status = document.getElementById('status').value;
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
        document.querySelector('.chat-container').style.display = 'flex';
        
        // Kullanıcı bilgilerini göster
        document.getElementById('displayUsername').textContent = username;
        document.getElementById('displayStatus').textContent = status || 'Çevrimiçi';
        document.getElementById('displayRoom').textContent = roomKey;
        
        if (userAvatar) {
            document.getElementById('userAvatar').style.backgroundImage = `url(${userAvatar})`;
        }
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
            message,
            avatar: userAvatar
        }));
        input.value = '';
    }
}

function displayMessage(data) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${data.username === username ? 'sent' : 'received'}`;
    
    const usernameElement = document.createElement('div');
    usernameElement.className = 'username';
    usernameElement.textContent = data.username;
    
    const messageContent = document.createElement('div');
    messageContent.textContent = data.message;
    
    messageElement.appendChild(usernameElement);
    messageElement.appendChild(messageContent);
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});