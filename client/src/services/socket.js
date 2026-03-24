import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  
  socket = io(backendUrl || '/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('🟢 Socket connected');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
