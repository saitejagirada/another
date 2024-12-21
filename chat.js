document.addEventListener('DOMContentLoaded', function() {
    let currentChatId = null;
    let currentPoolId = null;
    let chats = JSON.parse(localStorage.getItem('chats') || '{}');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendMessage');
    const chatList = document.getElementById('chatList');
    const chatMessages = document.getElementById('chatMessages');
    const currentChatName = document.getElementById('currentChatName');
    const currentPoolTitle = document.getElementById('currentPoolTitle');
    const viewPoolBtn = document.getElementById('viewPoolBtn');
    const searchInput = document.getElementById('searchChats');

    // Check if we're coming from a pool join
    const urlParams = new URLSearchParams(window.location.search);
    const initialChatId = urlParams.get('chat');

    // Initialize chat list
    function initializeChatList() {
        chatList.innerHTML = '';
        Object.entries(chats).forEach(([chatId, chat]) => {
            // Only show chats where the current user is either the creator or joiner
            if (chat.creatorId === currentUser.id || chat.joinerId === currentUser.id) {
                const lastMessage = chat.messages[chat.messages.length - 1];
                addChatToList(chatId, chat, lastMessage);
            }
        });

        // If we have an initial chat ID, select it
        if (initialChatId && chats[initialChatId]) {
            selectChat(initialChatId);
        }
    }

    // Add a chat to the list
    function addChatToList(chatId, chat, lastMessage) {
        const div = document.createElement('div');
        div.className = 'chat-item' + (chatId === currentChatId ? ' active' : '');
        div.setAttribute('data-chat-id', chatId);

        // Determine the display name based on whether the current user is the creator or joiner
        const displayName = currentUser.id === chat.creatorId ? chat.joinerName : chat.creatorName;

        div.innerHTML = `
            <div class="chat-item-header">
                <span class="chat-item-name">${displayName}</span>
                <span class="chat-item-time">${lastMessage ? formatTime(lastMessage.timestamp) : ''}</span>
            </div>
            <div class="chat-item-preview">${lastMessage ? lastMessage.content : 'No messages yet'}</div>
        `;
        
        div.addEventListener('click', () => {
            selectChat(chatId);
        });
        
        chatList.appendChild(div);
    }

    // Select a chat
    function selectChat(chatId) {
        // Update active states
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-chat-id="${chatId}"]`)?.classList.add('active');

        currentChatId = chatId;
        const chat = chats[chatId];
        
        // Update header with the appropriate name
        const displayName = currentUser.id === chat.creatorId ? chat.joinerName : chat.creatorName;
        currentChatName.textContent = displayName;
        currentPoolTitle.textContent = chat.poolTitle;
        
        // Show view pool button
        viewPoolBtn.style.display = 'block';
        currentPoolId = chat.poolId;
        
        // Enable input
        messageInput.disabled = false;
        sendButton.disabled = false;
        
        // Display messages
        displayMessages(chat.messages);
    }

    // Display messages
    function displayMessages(messages) {
        chatMessages.innerHTML = '';
        
        if (messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="no-messages">
                    <p>No messages yet</p>
                </div>
            `;
            return;
        }

        let currentDate = null;
        
        messages.forEach(message => {
            const messageDate = new Date(message.timestamp).toLocaleDateString();
            
            if (messageDate !== currentDate) {
                currentDate = messageDate;
                const dateDiv = document.createElement('div');
                dateDiv.className = 'date-divider';
                dateDiv.innerHTML = `<span>${messageDate}</span>`;
                chatMessages.appendChild(dateDiv);
            }
            
            const div = document.createElement('div');
            div.className = `message ${message.sent ? 'sent' : 'received'}`;
            div.innerHTML = `
                <div class="message-content">${message.content}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            `;
            chatMessages.appendChild(div);
        });
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Send message
    function sendMessage() {
        const content = messageInput.value.trim();
        if (!content || !currentChatId) return;

        const chat = chats[currentChatId];
        const message = {
            content,
            timestamp: new Date().toISOString(),
            sent: currentUser.id === chat.joinerId // Message is sent by joiner
        };

        // Add message to chat
        chat.messages.push(message);
        
        // Save to localStorage
        localStorage.setItem('chats', JSON.stringify(chats));
        
        // Update UI
        displayMessages(chat.messages);
        updateChatList();
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
    }

    // Update chat list (e.g., after sending a message)
    function updateChatList() {
        initializeChatList();
    }

    // Format timestamp
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }
        
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    viewPoolBtn.addEventListener('click', function() {
        if (currentPoolId) {
            window.location.href = `view-pool.html?id=${currentPoolId}`;
        }
    });

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredChats = Object.entries(chats).filter(([_, chat]) => {
            // Only include chats where the current user is involved
            if (chat.creatorId !== currentUser.id && chat.joinerId !== currentUser.id) {
                return false;
            }
            
            const displayName = currentUser.id === chat.creatorId ? chat.joinerName : chat.creatorName;
            return displayName.toLowerCase().includes(searchTerm) ||
                   chat.poolTitle.toLowerCase().includes(searchTerm) ||
                   chat.messages.some(msg => msg.content.toLowerCase().includes(searchTerm));
        });
        
        chatList.innerHTML = '';
        filteredChats.forEach(([chatId, chat]) => {
            const lastMessage = chat.messages[chat.messages.length - 1];
            addChatToList(chatId, chat, lastMessage);
        });
    });

    // Initialize
    initializeChatList();
}); 