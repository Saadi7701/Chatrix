import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['polling', 'websocket'],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const connectSocket = (userId: string, token: string) => {
  socket.auth = { userId, token };
  socket.connect();
  socket.emit('join', userId);
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export const emitLogout = (userId: string) => {
  socket.emit('logout', userId);
  socket.disconnect();
};

