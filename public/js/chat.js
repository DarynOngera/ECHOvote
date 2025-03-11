class Chat {
    constructor() {
        this.socket = io();
        this.messages = new Map(); // Map of roomId -> messages array
        this.currentRoom = null;
        this.rooms = new Map(); // Map of roomId -> room details
        this.setupSocketListeners();
        this.setupEventListeners();
        this.loadRooms();
    }

    setupSocketListeners() {
        // Handle connection
        this.socket.on('connect', () => {
            if (auth.isAuthenticated()) {
                this.socket.emit('user_connected', {
                    userId: auth.user._id,
                    username: auth.user.username
                });
            }
        });

        // Update online users count
        this.socket.on('users_online', (count) => {
            const onlineUsers = document.querySelector('#onlineUsers');
            if (onlineUsers) {
                onlineUsers.textContent = `${count} Online`;
            }
        });

        // Handle room joined confirmation
        this.socket.on('room_joined', (roomInfo) => {
            this.currentRoom = roomInfo.roomId;
            this.updateRoomHeader(roomInfo.name);
            this.clearMessages();
        });

        // Receive chat message
        this.socket.on('chat_message', (message) => {
            if (!this.messages.has(message.roomId)) {
                this.messages.set(message.roomId, []);
            }
            this.messages.get(message.roomId).push(message);
            
            if (message.roomId === this.currentRoom) {
                this.addMessage(message);
            } else {
                this.updateUnreadCount(message.roomId);
            }
        });
    }

    setupEventListeners() {
        const chatForm = document.querySelector('#chatForm');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = e.target.querySelector('input');
                const message = input.value.trim();
                
                if (message && this.currentRoom) {
                    this.sendMessage(message);
                    input.value = '';
                    input.focus();
                }
            });
        }

        // Room creation form
        const createRoomForm = document.querySelector('#createRoomForm');
        if (createRoomForm) {
            createRoomForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nameInput = e.target.querySelector('#roomName');
                const descInput = e.target.querySelector('#roomDescription');
                const typeSelect = e.target.querySelector('#roomType');
                
                await this.createRoom({
                    name: nameInput.value.trim(),
                    description: descInput.value.trim(),
                    type: typeSelect.value
                });
                
                nameInput.value = '';
                descInput.value = '';
                typeSelect.value = 'public';
                
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.querySelector('#createRoomModal'));
                modal?.hide();
            });
        }

        // Handle room selection
        document.querySelector('#roomsList').addEventListener('click', (e) => {
            const roomItem = e.target.closest('.room-item');
            if (roomItem) {
                const roomId = roomItem.dataset.roomId;
                this.joinRoom(roomId);
            }
        });

        // Clear unread count when chat becomes visible
        document.querySelector('#chatLink').addEventListener('click', () => {
            this.showChat();
            if (this.currentRoom) {
                this.updateUnreadCount(this.currentRoom, 0);
            }
        });
    }

    async loadRooms() {
        try {
            const response = await fetch('/api/chat/rooms', {
                headers: auth.getAuthHeader()
            });
            const rooms = await response.json();
            
            const roomsList = document.querySelector('#roomsList');
            roomsList.innerHTML = '';
            
            rooms.forEach(room => {
                this.rooms.set(room._id, room);
                const roomElement = document.createElement('div');
                roomElement.className = 'room-item p-2 border-bottom cursor-pointer hover-bg-light';
                roomElement.dataset.roomId = room._id;
                roomElement.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${room.name}</h6>
                            <small class="text-muted">${room.description || ''}</small>
                        </div>
                        <span class="badge bg-primary rounded-pill d-none" id="unread-${room._id}">0</span>
                    </div>
                `;
                roomsList.appendChild(roomElement);
            });
        } catch (error) {
            console.error('Error loading rooms:', error);
            showToast('Error loading chat rooms', 'error');
        }
    }

    async createRoom(roomData) {
        try {
            const response = await fetch('/api/chat/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...auth.getAuthHeader()
                },
                body: JSON.stringify(roomData)
            });
            
            if (!response.ok) throw new Error('Failed to create room');
            
            await this.loadRooms();
            showToast('Room created successfully', 'success');
        } catch (error) {
            console.error('Error creating room:', error);
            showToast('Error creating room', 'error');
        }
    }

    async joinRoom(roomId) {
        try {
            // Leave current room if any
            if (this.currentRoom) {
                this.socket.emit('leave_room', this.currentRoom);
            }

            const response = await fetch(`/api/chat/rooms/${roomId}/join`, {
                method: 'POST',
                headers: auth.getAuthHeader()
            });
            
            if (!response.ok) throw new Error('Failed to join room');
            
            // Join new room
            this.socket.emit('join_room', roomId);
            
            // Update UI
            document.querySelectorAll('.room-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.roomId === roomId) {
                    item.classList.add('active');
                }
            });
        } catch (error) {
            console.error('Error joining room:', error);
            showToast('Error joining room', 'error');
        }
    }

    sendMessage(text) {
        if (!auth.isAuthenticated()) {
            showToast('Please login to send messages', 'error');
            window.location.hash = 'login';
            return;
        }

        if (!this.currentRoom) {
            showToast('Please join a room first', 'error');
            return;
        }

        const message = {
            roomId: this.currentRoom,
            userId: auth.user._id,
            username: auth.user.username,
            text,
            timestamp: new Date().toISOString()
        };

        this.socket.emit('chat_message', message);
    }

    addMessage(message) {
        const chatMessages = document.querySelector('#chatMessages');
        if (!chatMessages) return;

        const isCurrentUser = auth.user && message.userId === auth.user._id;
        const isSystem = message.type === 'system';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isSystem ? 'system' : isCurrentUser ? 'sent' : 'received'} fade-in`;
        
        if (isSystem) {
            messageDiv.innerHTML = `
                <div class="system-message">
                    ${message.text}
                    <div class="message-timestamp">
                        <small class="text-muted">
                            ${new Date(message.timestamp).toLocaleTimeString()}
                        </small>
                    </div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">
                    ${!isCurrentUser ? `<strong class="message-username">${message.username}</strong>` : ''}
                    <div class="message-text">${this.formatMessage(message.text)}</div>
                    <div class="message-timestamp">
                        <small class="text-muted">
                            ${new Date(message.timestamp).toLocaleTimeString()}
                        </small>
                    </div>
                </div>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    formatMessage(text) {
        return text.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
    }

    updateUnreadCount(roomId, count) {
        const badge = document.querySelector(`#unread-${roomId}`);
        if (badge) {
            if (typeof count === 'undefined') {
                count = parseInt(badge.textContent || '0') + 1;
            }
            if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
        }
    }

    updateRoomHeader(roomName) {
        const header = document.querySelector('#currentRoomName');
        if (header) {
            header.textContent = roomName;
        }
    }

    clearMessages() {
        const chatMessages = document.querySelector('#chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
    }

    showChat() {
        if (!auth.isAuthenticated()) {
            showToast('Please login to access chat', 'error');
            window.location.hash = 'login';
            return;
        }

        document.querySelector('#liveChat').classList.remove('d-none');
        document.querySelector('#pollsList').classList.add('d-none');
        document.querySelector('#authForms').classList.add('d-none');
        document.querySelector('#createPollForm').classList.add('d-none');

        // Reconnect socket if needed
        if (!this.socket.connected) {
            this.socket.connect();
        }

        // Load rooms if not loaded
        if (this.rooms.size === 0) {
            this.loadRooms();
        }
    }
}

// Initialize chat
const chat = new Chat();
