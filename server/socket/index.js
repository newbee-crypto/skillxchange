import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { getRedis } from '../config/redis.js';

// Track online users in memory (Redis-backed when available)
const onlineUsers = new Map();
let socketServer = null;

export const setSocketServer = (io) => {
  socketServer = io;
};

export const getSocketServer = () => socketServer;

export const emitToUsers = (io, userIds, event, payload) => {
  userIds.forEach((userId) => {
    const target = onlineUsers.get(userId?.toString());
    if (target?.socketIds?.size) {
      target.socketIds.forEach((socketId) => {
        io.to(socketId).emit(event, payload);
      });
    }
  });
};

export const setupSocket = (io) => {
  setSocketServer(io);

  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🟢 ${socket.user.name} connected`);
    const existingSession = onlineUsers.get(userId);
    const wasOffline = !existingSession;

    // Track online status
    if (existingSession) {
      existingSession.socketIds.add(socket.id);
      existingSession.user = socket.user;
    } else {
      onlineUsers.set(userId, {
        socketIds: new Set([socket.id]),
        user: socket.user,
      });
    }

    if (wasOffline) {
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    }

    // Cache in Redis if available
    const redis = getRedis();
    if (redis) {
      await redis.sadd('online_users', userId);
    }

    // Broadcast online status
    if (wasOffline) {
      io.emit('user:online', { userId, name: socket.user.name });
    }
    socket.emit('users:online', Array.from(onlineUsers.keys()));

    // --- CHAT ---
    socket.on('chat:join', (roomId) => {
      socket.join(roomId);
      console.log(`💬 ${socket.user.name} joined room ${roomId}`);
    });

    socket.on('chat:leave', (roomId) => {
      socket.leave(roomId);
    });

    socket.on('chat:message', async (data) => {
      try {
        const { roomId, receiverId, content, clientMessageId } = data;

        const message = await Message.create({
          sender: userId,
          receiver: receiverId,
          roomId,
          content,
        });

        const populated = await message.populate('sender', 'name avatar');
        const payload = {
          ...populated.toObject(),
          clientMessageId: clientMessageId || null,
        };

        io.to(roomId).emit('chat:message', payload);

        // Notify receiver if not in room
        const receiverSocket = onlineUsers.get(receiverId);
        if (receiverSocket?.socketIds?.size) {
          receiverSocket.socketIds.forEach((socketId) => {
            io.to(socketId).emit('chat:notification', {
              from: socket.user.name,
              message: content.substring(0, 50),
              roomId,
            });
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('chat:typing', ({ roomId }) => {
      socket.to(roomId).emit('chat:typing', { userId, name: socket.user.name });
    });

    socket.on('chat:stop-typing', ({ roomId }) => {
      socket.to(roomId).emit('chat:stop-typing', { userId });
    });

    // --- WEBRTC SIGNALING ---
    socket.on('webrtc:offer', ({ to, offer, roomId }) => {
      const target = onlineUsers.get(to);
      if (target?.socketIds?.size) {
        target.socketIds.forEach((socketId) => {
          io.to(socketId).emit('webrtc:offer', {
            from: userId,
            offer,
            roomId,
            callerName: socket.user.name,
          });
        });
      }
    });

    socket.on('webrtc:answer', ({ to, answer }) => {
      const target = onlineUsers.get(to);
      if (target?.socketIds?.size) {
        target.socketIds.forEach((socketId) => {
          io.to(socketId).emit('webrtc:answer', {
            from: userId,
            answer,
          });
        });
      }
    });

    socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
      const target = onlineUsers.get(to);
      if (target?.socketIds?.size) {
        target.socketIds.forEach((socketId) => {
          io.to(socketId).emit('webrtc:ice-candidate', {
            from: userId,
            candidate,
          });
        });
      }
    });

    socket.on('webrtc:end-call', ({ to }) => {
      const target = onlineUsers.get(to);
      if (target?.socketIds?.size) {
        target.socketIds.forEach((socketId) => {
          io.to(socketId).emit('webrtc:end-call', { from: userId });
        });
      }
    });

    // --- DISCONNECT ---
    socket.on('disconnect', async () => {
      console.log(`🔴 ${socket.user.name} disconnected`);
      const existingSession = onlineUsers.get(userId);

      if (existingSession) {
        existingSession.socketIds.delete(socket.id);
      }

      if (existingSession?.socketIds?.size) {
        return;
      }

      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });

      if (redis) {
        await redis.srem('online_users', userId);
      }

      io.emit('user:offline', { userId });
    });
  });
};
