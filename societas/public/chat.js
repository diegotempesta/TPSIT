const ws = new WebSocket(`ws://${location.host}`);

let currentChatUser = null;

let isReady = false;

ws.onopen = () => {
    ws.send(JSON.stringify({
        type: 'auth',
        username: window.currentUser
    }));
    isReady = true;
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // 📜 cronologia chat
    if (data.type === 'load_messages') {
        const container = document.getElementById('messages');
        container.innerHTML = '';

        data.messages.forEach(msg => {
            addMessage(msg);
        });

        container.scrollTop = container.scrollHeight;
    }

    // 💬 messaggi realtime
    if (data.type === 'private_message') {
        const msg = data.message;

        if (
            msg.from === currentChatUser ||
            msg.to === currentChatUser
        ) {
            addMessage(msg);
        }
    }
};

function openChat(username) {
    if (!isReady) {
        console.log('WS non pronto');
        return;
    }

    currentChatUser = username;

    document.getElementById('chatWith').innerText = username;
    document.getElementById('messages').innerHTML = '';

    ws.send(JSON.stringify({
        type: 'load_messages',
        with: username
    }));
}

const input = document.getElementById('messageInput');

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();

        if (!currentChatUser) {
            alert('Seleziona un utente');
            return;
        }

        if (!input.value.trim()) return;

        ws.send(JSON.stringify({
            type: 'private_message',
            to: currentChatUser,
            text: input.value
        }));

        input.value = '';
    }
});

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value;

    if (!text || !currentChatUser) return;
    console.log(data.messages);
    ws.send(JSON.stringify({
        type: 'private_message',
        to: currentChatUser,
        text
    }));

    input.value = '';
}

// 🧱 UI messaggi
function addMessage(msg) {
    const container = document.getElementById('messages');

    const isMe = msg.from === window.currentUser;

    const wrapper = document.createElement('div');
    wrapper.className = `d-flex mb-2 ${isMe ? 'justify-content-end' : 'justify-content-start'}`;

    const bubble = document.createElement('div');
    bubble.className = `p-2 rounded ${
        isMe ? 'bg-primary text-white' : 'bg-white border'
    }`;
    bubble.style.maxWidth = '60%';

    bubble.innerHTML = `
        <div>${msg.text}</div>
        <small class="text-${isMe ? 'light' : 'muted'}">
            ${new Date(msg.createdAt).toLocaleTimeString()}
        </small>
    `;

    wrapper.appendChild(bubble);
    container.appendChild(wrapper);

    container.scrollTop = container.scrollHeight;
}