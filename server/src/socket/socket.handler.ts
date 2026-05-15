import { Server, Socket } from 'socket.io';
import prisma from '../config/prisma';

// Memory storage for online users
const userSocketMap: { [userId: string]: string } = {};

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`[socket]: User connected: ${socket.id}`);

    // Join personal room and set online status
    socket.on('join', async (userId: string) => {
      socket.join(userId);
      userSocketMap[userId] = socket.id;
      
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true, lastSeen: new Date() }
      });
      
      io.emit('user_status_change', { userId, isOnline: true });
      console.log(`[socket]: User ${userId} joined and is ONLINE`);
    });

    // Handle messages
    socket.on('send_message', async (data) => {
      const { receiverId, content, senderId, type = 'TEXT' } = data;
      
      const receiverIsOnline = userSocketMap[receiverId] ? true : false;

      // Special Logic: If receiver is offline, only messages in </> brackets are allowed
      if (!receiverIsOnline && type === 'TEXT') {
        const isBracketMessage = content.startsWith('</') && content.endsWith('/>');
        if (!isBracketMessage) {
          socket.emit('error', { message: 'User is offline. Direct transmissions require </> neural encapsulation.' });
          return;
        }
      }

      // Save to DB
      const message = await prisma.message.create({
        data: {
          content,
          senderId,
          receiverId,
          type: type as any,
          status: receiverIsOnline ? 'DELIVERED' : 'SENT'
        },
        include: {
          sender: {
            select: {
              username: true,
              profilePic: true
            }
          }
        }
      });

      // Emit to receiver if online
      if (receiverIsOnline) {
        io.to(receiverId).emit('receive_message', message);
      }
      
      // Emit back to sender (all their devices)
      io.to(senderId).emit('receive_message', message);
    });

    // Mark as Read
    socket.on('mark_as_read', async ({ messageId, senderId, receiverId }) => {
      // Find the user who is marking as read (the receiver of the message)
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { ghostMode: true }
      });

      await prisma.message.update({
        where: { id: messageId },
        data: { status: 'SEEN' }
      });
      
      // Notify sender only if ghostMode is disabled
      if (!receiver?.ghostMode && userSocketMap[senderId]) {
        io.to(senderId).emit('message_read', { messageId });
      }
    });

    // Typing indicators
    socket.on('typing', ({ receiverId, isTyping }) => {
      socket.to(receiverId).emit('display_typing', { isTyping });
    });

    socket.on('disconnect', async () => {
      let disconnectedUserId: string | null = null;
      for (const [userId, socketId] of Object.entries(userSocketMap)) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          delete userSocketMap[userId];
          break;
        }
      }

      if (disconnectedUserId) {
        await prisma.user.update({
          where: { id: disconnectedUserId },
          data: { isOnline: false, lastSeen: new Date() }
        });
        io.emit('user_status_change', { userId: disconnectedUserId, isOnline: false });
        console.log(`[socket]: User ${disconnectedUserId} went OFFLINE`);
      }
    });
  });
};
