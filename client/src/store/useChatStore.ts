import { create } from 'zustand';

interface ChatState {
  messages: any[];
  conversations: any[];
  activeConversation: any | null;
  addMessage: (message: any) => void;
  setMessages: (messages: any[]) => void;
  updateMessageStatus: (messageId: string, status: string) => void;
  setConversations: (conversations: any[]) => void;
  setActiveConversation: (conversation: any) => void;
  updateUserStatus: (userId: string, isOnline: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  conversations: [],
  activeConversation: null,
  addMessage: (message) => set((state) => ({ 
    messages: state.messages.find(m => m.id === message.id) ? state.messages : [...state.messages, message] 
  })),
  setMessages: (messages) => set({ messages }),
  updateMessageStatus: (messageId, status) => set((state) => ({
    messages: state.messages.map(m => m.id === messageId ? { ...m, status } : m)
  })),
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (conversation) => set({ activeConversation: conversation }),
  updateUserStatus: (userId, isOnline) => set((state) => ({
    conversations: state.conversations.map(c => c.id === userId ? { ...c, isOnline } : c),
    activeConversation: state.activeConversation?.id === userId 
      ? { ...state.activeConversation, isOnline } 
      : state.activeConversation
  }))
}));
