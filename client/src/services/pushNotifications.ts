import axios from 'axios';
import { API_URL } from '../config/api';

const VAPID_PUBLIC_KEY = 'BOFkjf1FpdiR6VVKOW3oo3av3wNMS_wbjIAzZwJnQTkIcg5ngEpbwdCK9nEuCDoJGsTpAokNnNrdQyz7dbj94IA';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const registerPushNotifications = async (token: string) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported in this browser.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered scope:', registration.scope);

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Push notification permission denied.');
      return;
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
      console.log('Subscribed to Web Push Server.');
    }

    await axios.post(
      `${API_URL}/api/auth/push-subscription`,
      { subscription },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Push subscription synced with server.');
  } catch (error) {
    console.error('Error during push notification setup:', error);
  }
};
