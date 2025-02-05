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
    username = document.getElementById('username').value.trim();
    const status = document.getElementById('status').value;
    roomKey = document.getElementById('roomKey').value.trim();

    if (!username || !roomKey) {
        alert('Lütfen kullanıcı adı ve oda anahtarını girin');
        return;
    }

    // WebSocket bağlantısını başlat

    // Localhost WebSocket URL'i
    // const wsUrl = `ws://localhost:3000?username=${encodeURIComponent(username)}&roomKey=${encodeURIComponent(roomKey)}`;
    
    // Dinamik WebSocket URL'i
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}?username=${encodeURIComponent(username)}&roomKey=${encodeURIComponent(roomKey)}`;
    
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
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'message':
                displayMessage(data);
                break;
            case 'userList':
                updateUsersList(data.users);
                break;
            case 'system':
                displaySystemMessage(data.message);
                break;
        }
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

function updateUsersList(users) {
    const usersList = document.getElementById('onlineUsers');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const li = document.createElement('li');
        // Kullanıcı adını doğru şekilde görüntüle
        li.innerHTML = `
            <span class="user-status-indicator"></span>
            <span class="user-name">${user}</span>
        `;
        usersList.appendChild(li);
    });
}


function displaySystemMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'system-message';
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

const styleSheet = document.createElement("style");
styleSheet.textContent = `
    .user-status-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        background-color: #22c55e;
        border-radius: 50%;
        margin-right: 8px;
    }
    
    .user-name {
        color: var(--text);
    }
    
    .online-users-list li {
        display: flex;
        align-items: center;
        padding: 8px 0;
    }
    
    .online-users-list li::before {
        content: none;
    }
`;
document.head.appendChild(styleSheet);

document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});