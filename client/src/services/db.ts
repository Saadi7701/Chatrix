import { openDB, type DBSchema } from 'idb';

interface AuraDB extends DBSchema {
  messages: {
    key: string;
    value: {
      id: string;
      content: string;
      senderId: string;
      receiverId?: string;
      groupId?: string;
      createdAt: number;
      status: string;
      synced: boolean;
    };
    indexes: { 'by-date': number };
  };
}

const dbPromise = openDB<AuraDB>('aura-chat-db', 1, {
  upgrade(db) {
    const messageStore = db.createObjectStore('messages', {
      keyPath: 'id',
    });
    messageStore.createIndex('by-date', 'createdAt');
  },
});

export const saveMessageLocally = async (message: any) => {
  const db = await dbPromise;
  await db.put('messages', { ...message, synced: false });
};

export const getLocalMessages = async () => {
  const db = await dbPromise;
  return db.getAllFromIndex('messages', 'by-date');
};

export const markAsSynced = async (id: string) => {
  const db = await dbPromise;
  const msg = await db.get('messages', id);
  if (msg) {
    msg.synced = true;
    await db.put('messages', msg);
  }
};
