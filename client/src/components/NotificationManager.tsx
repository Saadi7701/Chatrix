import { useEffect } from 'react';
import { socket } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

const NotificationManager = () => {
   const { user } = useAuthStore();

   useEffect(() => {
      if (!user || !user.notificationsEnabled) return;

      const handleReceiveMessage = (message: any) => {
         // Don't notify if message is from self
         if (message.senderId === user.id) return;

         // Check if user is not on the chat page with this sender active
         // (For simplicity, we'll notify if the window is hidden or not focused)
         if (document.hidden || !document.hasFocus()) {
            if ("Notification" in window && Notification.permission === "granted") {
               const notification = new Notification(`Aura Elite: ${message.sender.username}`, {
                  body: message.type === 'TEXT' ? message.content : `Sent a ${message.type.toLowerCase()}`,
                  icon: message.sender.profilePic || '/logo.png',
               });

               notification.onclick = () => {
                  window.focus();
                  // Ideally navigate to chat with this user
               };
            }
         }
      };

      socket.on('receive_message', handleReceiveMessage);

      return () => {
         socket.off('receive_message', handleReceiveMessage);
      };
   }, [user]);

   return null; // This component doesn't render anything
};

export default NotificationManager;
