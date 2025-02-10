// client.js
let socket;
let username = '';
let roomKey = '';
let userAvatar = null;

let saveMessages = false;

// client.js başına ekleyin
const clipboardSupported = navigator.clipboard && typeof navigator.clipboard.readText === 'function';
if (!clipboardSupported) {
    const pasteBtn = document.getElementById('pasteKeyBtn');
    if (pasteBtn) {
        pasteBtn.style.display = 'none';
    }
}

// client.js başına ekleyin
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM yüklendi, event listener\'lar ekleniyor...');
    
    const saveMessagesToggle = document.getElementById('saveMessagesToggle');
    if (saveMessagesToggle) {
        saveMessagesToggle.addEventListener('change', (e) => {
            saveMessages = e.target.checked;
        });
    }

    // Tema kontrolü
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Avatar yükleme
    const avatarUpload = document.getElementById('avatarUpload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }
    
    // Key işlemleri
    const generateKeyBtn = document.getElementById('generateKeyBtn');
    const copyKeyBtn = document.getElementById('copyKeyBtn');
    
    if (generateKeyBtn) {
        generateKeyBtn.addEventListener('click', () => {
            console.log('Key oluştur butonuna tıklandı');
            generateKey();
        });
    }
    
    if (copyKeyBtn) {
        copyKeyBtn.addEventListener('click', copyKey);
    }

    if (document.getElementById('pasteKeyBtn')) {
        document.getElementById('pasteKeyBtn').addEventListener('click', pasteKey);
    }
});

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
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}?username=${encodeURIComponent(username)}&roomKey=${encodeURIComponent(roomKey)}`;

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

        fetch(`${window.location.origin}/room-history/${roomKey}`)
            .then(res => res.json())
            .then(messages => {
                messages.reverse().forEach(msg => {
                    displayMessage({
                        username: msg.username,
                        message: msg.message
                    });
                });
            })
            .catch(err => console.error('Geçmiş mesajları yükleme hatası:', err));
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

// sendMessage fonksiyonu güncellemesi
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value;
    
    if (message && socket) {
        socket.send(JSON.stringify({
            username,
            message,
            avatar: userAvatar,
            saveMessage: saveMessages
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

// client.js içindeki generateKey fonksiyonunu güncelleyin
// client.js içindeki generateKey fonksiyonu
async function generateKey() {
    try {
        const response = await fetch(`${window.location.origin}/generate-key`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        document.getElementById('roomKey').value = data.key;
    } catch (error) {
        console.error('Anahtar oluşturma hatası:', error);
        alert('Anahtar oluşturulurken bir hata oluştu! Hata: ' + error.message);
    }
}

function copyKey() {
    const roomKey = document.getElementById('roomKey');
    roomKey.select();
    document.execCommand('copy');
    
    // Kopyalama başarılı bildirimi
    const notification = document.createElement('div');
    notification.className = 'copy-success';
    notification.textContent = 'Anahtar kopyalandı!';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Yapıştırma fonksiyonu
async function pasteKey() {
    try {
        const text = await navigator.clipboard.readText();
        const roomKeyInput = document.getElementById('roomKey');
        roomKeyInput.value = text;
        
        // Başarılı yapıştırma bildirimi
        const notification = document.createElement('div');
        notification.className = 'paste-success';
        notification.textContent = 'Anahtar yapıştırıldı!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    } catch (err) {
        console.error('Yapıştırma hatası:', err);
        // Kullanıcıya hata bildirimi
        const notification = document.createElement('div');
        notification.className = 'paste-error';
        notification.textContent = 'Yapıştırma izni reddedildi!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }
}

// client.js'de bağlantı hatası kontrolü ekleyin
socket.onerror = (error) => {
    console.error('WebSocket Error:', error);
    displaySystemMessage('Bağlantı hatası oluştu. Lütfen sayfayı yenileyin.');
};

socket.onclose = (event) => {
    console.log('WebSocket Closed:', event.code, event.reason);
    displaySystemMessage('Bağlantı kesildi. Yeniden bağlanılıyor...');
    // Otomatik yeniden bağlanma
    setTimeout(() => {
        joinRoom();
    }, 3000);
};

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

