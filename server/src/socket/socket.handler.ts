import { Server, Socket } from 'socket.io';
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import webpush from 'web-push';

// Configure Web Push VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:support@chatrix.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  console.log('[web-push]: VAPID details set successfully.');
} else {
  console.warn('[web-push]: VAPID keys missing. Push notifications will be disabled.');
}

// Memory storage for online users and disconnect grace periods
const userSocketMap: { [userId: string]: string } = {};
const disconnectTimeouts: { [userId: string]: NodeJS.Timeout } = {};

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`[socket]: User connected: ${socket.id}`);

    // Join personal room and set online status
    socket.on('join', async (userId: string) => {
      socket.join(userId);
      userSocketMap[userId] = socket.id;
      
      // Clear any pending offline grace period
      if (disconnectTimeouts[userId]) {
        clearTimeout(disconnectTimeouts[userId]);
        delete disconnectTimeouts[userId];
        console.log(`[socket]: User ${userId} reconnected within grace period.`);
      }

      // Check if they are currently marked offline in DB
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isOnline: true }
      });

      if (!user?.isOnline) {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: true, lastSeen: new Date() }
        });
        io.emit('user_status_change', { userId, isOnline: true });
        console.log(`[socket]: User ${userId} marked ONLINE`);
      }
      
      // 1. Find all messages sent to this user while they were offline
      const pendingMessages = await prisma.message.findMany({
        where: {
          receiverId: userId,
          status: 'SENT'
        },
        include: {
          sender: {
            select: { username: true, profilePic: true }
          }
        }
      });

      // 2. Deliver them and update status to DELIVERED
      for (const msg of pendingMessages) {
        // Emit to the receiver who just joined
        socket.emit('receive_message', { ...msg, status: 'DELIVERED' });

        // Update DB
        await prisma.message.update({
          where: { id: msg.id },
          data: { status: 'DELIVERED' }
        });

        // 3. Notify the original sender that it's now delivered
        if (userSocketMap[msg.senderId]) {
          io.to(msg.senderId).emit('message_delivered', { messageId: msg.id });
        }
      }

      console.log(`[socket]: User ${userId} joined - ${pendingMessages.length} pending messages delivered.`);
    });

      // Handle messages
      socket.on('send_message', async (data) => {
        const { receiverId, content, senderId, type = 'TEXT', fileName, fileUrl, fileSize } = data;
        
        const receiverIsOnline = userSocketMap[receiverId] ? true : false;
  
        // Save to DB
        const message = await prisma.message.create({
        data: {
          content,
          senderId,
          receiverId,
          type: type as any,
          status: receiverIsOnline ? 'DELIVERED' : 'SENT',
          ...(fileName && { fileName }),
          ...(fileUrl && { fileUrl }),
          ...(fileSize && { fileSize }),
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profilePic: true,
              userCode: true
            }
          }
        }
      });

      // Emit to receiver if online
      if (receiverIsOnline) {
        io.to(receiverId).emit('receive_message', message);
      } else {
        // Receiver is offline! Send Web Push Notification!
        try {
          const receiver: any = await prisma.user.findUnique({
            where: { id: receiverId },
            select: { pushSubscription: true, notificationsEnabled: true } as any
          });

          if (receiver?.notificationsEnabled && receiver.pushSubscription) {
            const subscriptionObj = receiver.pushSubscription as any;
            const payload = JSON.stringify({
              title: message.sender.username,
              body: message.type === 'TEXT' ? message.content : `Sent you a ${message.type.toLowerCase()}`,
              icon: message.sender.profilePic || 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=chatrix',
              data: {
                senderId: message.senderId,
                url: '/chat'
              }
            });

            webpush.sendNotification(subscriptionObj, payload)
              .catch((err) => {
                console.error('[web-push]: Error sending notification:', err.message);
                if (err.statusCode === 410 || err.statusCode === 404) {
                  prisma.user.update({
                    where: { id: receiverId },
                    data: { pushSubscription: Prisma.DbNull } as any
                  }).catch(e => console.error('[web-push]: Error cleaning sub:', e));
                }
              });
          }
        } catch (pushErr) {
          console.error('[web-push]: Failed to fetch/send push:', pushErr);
        }
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

    // --- WEBRTC SIGNALING FOR CALLS ---
    socket.on('call_user', async ({ offer, to, from, type }) => {
      const caller = await prisma.user.findUnique({
        where: { id: from },
        select: { username: true, profilePic: true }
      });
      console.log(`[socket]: Incoming ${type} call from ${caller?.username} to ${to}`);
      if (userSocketMap[to]) {
        io.to(to).emit('incoming_call', { offer, from, type, username: caller?.username, profilePic: caller?.profilePic });
      } else {
        // Receiver is offline! Send Web Push Notification for Call!
        try {
          const receiver: any = await prisma.user.findUnique({
            where: { id: to },
            select: { pushSubscription: true, notificationsEnabled: true } as any
          });

          if (receiver?.notificationsEnabled && receiver.pushSubscription) {
            const subscriptionObj = receiver.pushSubscription as any;
            const payload = JSON.stringify({
              title: `Incoming ${type === 'VIDEO' ? 'Video' : 'Voice'} Call`,
              body: `${caller?.username || 'Someone'} is calling you on Chatrix.`,
              icon: caller?.profilePic || 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=chatrix',
              data: { url: '/chat' }
            });

            webpush.sendNotification(subscriptionObj, payload).catch((err) => {
              console.error('[web-push]: Error sending call notification:', err.message);
            });
          }
        } catch (pushErr) {
          console.error('[web-push]: Failed to send call push:', pushErr);
        }
      }
    });

    socket.on('answer_call', ({ answer, to }) => {
      console.log(`[socket]: Call answered for user ${to}`);
      if (userSocketMap[to]) {
        io.to(to).emit('call_answered', { answer });
      }
    });

    socket.on('ice_candidate', ({ candidate, to }) => {
      if (userSocketMap[to]) {
        io.to(to).emit('ice_candidate', { candidate });
      }
    });

    socket.on('end_call', async ({ to, from, duration, status, type }) => {
      console.log(`[socket]: Call ended between ${from} and ${to} - Status: ${status}`);
      
      // Save call log to DB
      if (from && to) {
        try {
          await prisma.call.create({
            data: {
              callerId: from,
              receiverId: to,
              type: type || 'VOICE',
              status: status || 'COMPLETED',
              duration: duration || 0
            }
          });
        } catch (err) {
          console.error('Error saving call log:', err);
        }
      }

      if (userSocketMap[to]) {
        io.to(to).emit('call_ended');
      }
    });

    // Handle explicit logouts immediately
    socket.on('logout', async (userId: string) => {
      console.log(`[socket]: Explicit logout for User ${userId}`);
      if (disconnectTimeouts[userId]) {
        clearTimeout(disconnectTimeouts[userId]);
        delete disconnectTimeouts[userId];
      }
      if (userSocketMap[userId]) {
        delete userSocketMap[userId];
      }
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() }
      });
      io.emit('user_status_change', { userId, isOnline: false });
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
        const userId = disconnectedUserId;
        console.log(`[socket]: User ${userId} disconnected. Grace period started...`);
        
        // 2-minute grace period before marking offline
        disconnectTimeouts[userId] = setTimeout(async () => {
          if (!userSocketMap[userId]) {
            await prisma.user.update({
              where: { id: userId },
              data: { isOnline: false, lastSeen: new Date() }
            });
            io.emit('user_status_change', { userId, isOnline: false });
            console.log(`[socket]: Grace period ended. User ${userId} went OFFLINE`);
          }
          delete disconnectTimeouts[userId];
        }, 120000);
      }
    });
  });
};
