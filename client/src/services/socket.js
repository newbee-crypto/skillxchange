import { io } from 'socket.io-client';

let socket = null;
let presenceSyncInterval = null;

const clearPresenceSync = () => {
  if (presenceSyncInterval) {
    window.clearInterval(presenceSyncInterval);
    presenceSyncInterval = null;
  }
};

const startPresenceSync = () => {
  clearPresenceSync();
  presenceSyncInterval = window.setInterval(() => {
    if (socket?.connected) {
      socket.emit('presence:sync');
    }
  }, 20000);
};

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

  socket = io(backendUrl || '/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    socket.emit('presence:sync');
    startPresenceSync();
  });

  socket.on('disconnect', (reason) => {
    console.warn('Socket disconnected:', reason);
    clearPresenceSync();
  });

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    clearPresenceSync();
    socket.disconnect();
    socket = null;
  }
};
