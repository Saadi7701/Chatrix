import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Edit3, Video, Phone, MoreVertical, 
  Send, Shield, Sparkles, Cpu,
  CheckCheck,
  Mic, Paperclip, Camera, EyeOff,
  Square, Play, Pause, Trash2, ArrowLeft, X
} from 'lucide-react';
import axios from 'axios';
import { socket } from '../services/socket';

import DashboardLayout from '../components/DashboardLayout';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { API_URL } from '../config/api';

const ChatPage = () => {
  const { user, token } = useAuthStore();
  const { 
    messages, addMessage, setMessages, 
    activeConversation, setActiveConversation,
    updateMessageStatus, updateUserStatus 
  } = useChatStore();
  
  const [searchCode, setSearchCode] = useState('');
  const [inputText, setInputText] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [systemMsg, setSystemMsg] = useState('');
  const [isStealth, setIsStealth] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  
  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const recordedAudioRef = useRef<Blob | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeConversationRef = useRef(activeConversation);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    if (!token) return;

    const handleReceiveMessage = (message: any) => {
      // 1. Update messages if we are in this chat
      const currentChat = activeConversationRef.current;
      if (currentChat?.id === message.senderId || currentChat?.id === message.receiverId) {
        addMessage(message);
        if (currentChat?.id === message.senderId) {
          socket.emit('mark_as_read', { 
            messageId: message.id, 
            senderId: message.senderId,
            receiverId: user?.id 
          });
        }
      }

      // 2. Update the contact list (Sidebar)
      setContacts(prev => {
        const senderId = message.senderId === user?.id ? message.receiverId : message.senderId;
        const exists = prev.find(c => c.id === senderId);

        if (exists) {
          // Move existing contact to top and update last message
          const updated = prev.filter(c => c.id !== senderId);
          return [{ ...exists, lastMessage: message }, ...updated];
        } else if (message.sender) {
          // New contact - add to top
          const newContact = {
            id: message.sender.id,
            username: message.sender.username,
            profilePic: message.sender.profilePic,
            userCode: message.sender.userCode,
            isOnline: true,
            lastMessage: message
          };
          return [newContact, ...prev];
        }
        return prev;
      });
    };

    const handleMessageRead = ({ messageId }: any) => {
      updateMessageStatus(messageId, 'SEEN');
    };

    const handleMessageDelivered = ({ messageId }: any) => {
      updateMessageStatus(messageId, 'DELIVERED');
    };

    const handleUserStatusChange = ({ userId, isOnline }: any) => {
      updateUserStatus(userId, isOnline);
      setContacts((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, isOnline } : c))
      );
    };

    const handleError = ({ message }: any) => {
      setSystemMsg(message);
      setTimeout(() => setSystemMsg(''), 5000);
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_read', handleMessageRead);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('user_status_change', handleUserStatusChange);
    socket.on('error', handleError);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_read', handleMessageRead);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('user_status_change', handleUserStatusChange);
      socket.off('error', handleError);
    };
  }, [token, user]);

  useEffect(() => {
    if (!token) return;
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContacts(res.data);
      } catch (err) { console.error(err); }
    };
    fetchHistory();
  }, [token]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode) return;

    if (searchCode === (user?.stealthCode || 'AURA_99')) {
       setIsStealth(false);
       setSearchCode('');
       setSystemMsg('NEURAL HUB UNMASKED');
       setTimeout(() => setSystemMsg(''), 2000);
       return;
    }

    try {
      const res = await axios.get(`${API_URL}/api/auth/search/${searchCode}`);
      setActiveConversation(res.data);
      if (!contacts.find(c => c.id === res.data.id)) setContacts([res.data, ...contacts]);
      setSearchCode('');
      setIsStealth(false);
    } catch (err) { }
  };

  useEffect(() => {
    if (!activeConversation || !token) return;
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/messages/${activeConversation.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
      } catch (err) { console.error(err); }
    };
    fetchMessages();
  }, [activeConversation, token]);

  const handleSendMessage = async () => {
    if (!inputText || !activeConversation) return;
    socket.emit('send_message', {
      receiverId: activeConversation.id,
      content: inputText,
      senderId: user?.id,
      type: 'TEXT'
    });
    setInputText('');
  };

  // Voice Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick best supported mime type (webm for Chrome, mp4 for Safari/iOS)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        recordedAudioRef.current = audioBlob; // store in ref for instant access
        setRecordedAudio(audioBlob);
        setAudioPreviewUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access denied. Please allow mic permissions.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(recordingIntervalRef.current);
  };

  const sendVoiceMessage = async () => {
    const blob = recordedAudioRef.current || recordedAudio;
    if (!blob || !activeConversation || !token) {
      setSystemMsg('Voice send failed: not ready.');
      setTimeout(() => setSystemMsg(''), 3000);
      return;
    }

    setIsSendingVoice(true);
    const mimeType = blob.type || 'audio/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([blob], `voice_note.${ext}`, { type: mimeType });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/api/upload/chat`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      socket.emit('send_message', {
        receiverId: activeConversation.id,
        content: res.data.url,
        senderId: user?.id,
        type: 'AUDIO'
      });
      
      clearVoicePreview();
    } catch (err) {
      console.error('Voice upload failed', err);
      setSystemMsg('Voice upload failed. Check your connection.');
      setTimeout(() => setSystemMsg(''), 4000);
    } finally {
      setIsSendingVoice(false);
    }
  };

  const clearVoicePreview = () => {
    setRecordedAudio(null);
    setAudioPreviewUrl(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation || !token) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/api/upload/chat`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      socket.emit('send_message', {
        receiverId: activeConversation.id,
        content: res.data.url,
        senderId: user?.id,
        type: res.data.type.toUpperCase() === 'VOICE' ? 'AUDIO' : res.data.type.toUpperCase()
      });
    } catch (err) { console.error('Upload failed', err); }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-1 h-full overflow-hidden">
        {/* Sidebar / Contacts List */}
        <div className={`
          ${activeConversation ? 'hidden md:flex' : 'flex'}
          w-full md:w-[350px] lg:w-[400px] border-r border-white/5 flex-col bg-[#050505]
        `}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white">Chat Lounge</h2>
              {isStealth && <EyeOff className="w-4 h-4 text-violet-400 animate-pulse" />}
            </div>
            <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <Edit3 className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSearch} className="px-6 mb-6">
            <div className="relative flex items-center bg-[#111b21] border border-white/5 rounded-xl px-4 py-3 focus-within:border-cyan-500/50 transition-all shadow-inner">
              <Search className="w-4 h-4 text-gray-500 mr-3" />
              <input 
                type="text" 
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder={isStealth ? "Enter Secret Key..." : "Who's on your mind?..."} 
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-600"
              />
            </div>
          </form>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {!isStealth ? (
              (() => {
                const filtered = contacts.filter(c => 
                  c.username.toLowerCase().includes(searchCode.toLowerCase()) ||
                  c.userCode.toLowerCase().includes(searchCode.toLowerCase())
                );
                
                if (filtered.length > 0) {
                  return filtered.map((contact) => (
                    <ContactCard 
                      key={contact.id}
                      active={activeConversation?.id === contact.id} 
                      name={contact.username} 
                      msg={contact.userCode}
                      status={contact.isOnline ? 'Online' : 'Away'}
                      onClick={() => {
                        setActiveConversation(contact);
                        setSearchCode(''); // Clear search on select
                      }}
                      pic={contact.profilePic}
                      lastMessage={contact.lastMessage}
                    />
                  ));
                } else if (searchCode.length > 0) {
                  return (
                    <div className="p-12 text-center">
                       <p className="text-[10px] font-black text-violet-400 tracking-widest uppercase mb-4">Finding New Friend...</p>
                       <p className="text-[8px] text-gray-500 uppercase tracking-widest">Press Enter to find user by code: "{searchCode}"</p>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-12 text-center opacity-20">
                       <Cpu className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                       <p className="text-[10px] font-black tracking-widest uppercase">No chats yet</p>
                    </div>
                  );
                }
              })()
            ) : (
              <div className="p-12 text-center opacity-20">
                 <Shield className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                 <p className="text-[10px] font-black tracking-widest uppercase">Stealth Protocol Active</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`
          ${activeConversation ? 'flex' : 'hidden md:flex'}
          flex-1 flex-col relative bg-[#050505] min-w-0
        `}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 px-6 md:px-8 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-md z-10">
                <div className="flex items-center gap-3 md:gap-4">
                  <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                  </button>
                  <div 
                    onClick={() => setShowProfile(true)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 overflow-hidden border border-white/10 flex-shrink-0 group-hover:border-cyan-400/50 transition-all">
                      <img src={activeConversation.profilePic || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${activeConversation.username}`} alt="avatar" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-white text-base md:text-lg tracking-tight truncate group-hover:text-violet-400 transition-colors">{activeConversation.username}</h3>
                      <span className={`text-[8px] md:text-[9px] font-black tracking-widest uppercase ${activeConversation.isOnline ? 'text-violet-400' : 'text-gray-600'}`}>
                        {activeConversation.isOnline ? 'ACTIVE' : 'OFFLINE'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:gap-6 text-gray-500">
                  {user?.quantumEncryption && (
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                      <Shield className="w-3 h-3 text-violet-400" />
                      <span className="text-[8px] font-black text-violet-400 tracking-widest uppercase">Encrypted</span>
                    </div>
                  )}
                  <Video 
                    onClick={() => (window as any).startNeuralCall?.(activeConversation, 'VIDEO')}
                    className="w-5 h-5 md:w-6 md:h-6 cursor-pointer hover:text-cyan-400 transition-colors" 
                  />
                  <Phone 
                    onClick={() => (window as any).startNeuralCall?.(activeConversation, 'VOICE')}
                    className="w-5 h-5 md:w-6 md:h-6 cursor-pointer hover:text-cyan-400 transition-colors" 
                  />
                  <MoreVertical className="w-5 h-5 md:w-6 md:h-6 cursor-pointer hover:text-white" />
                </div>
              </div>

              {/* Messages Grid */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 flex flex-col scroll-smooth custom-scrollbar relative">
                <AnimatePresence>
                  {showProfile && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute inset-0 z-50 bg-[#050505]/95 backdrop-blur-2xl p-6 md:p-12 flex flex-col items-center justify-center text-center overflow-y-auto"
                    >
                      <button 
                        onClick={() => setShowProfile(false)}
                        className="absolute top-8 right-8 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all"
                      >
                        <X className="w-6 h-6 text-gray-400" />
                      </button>

                      <div className="w-48 h-48 md:w-64 md:h-64 rounded-[3rem] bg-cyan-400/10 border border-white/10 p-2 mb-8 shadow-[0_0_50px_rgba(0,242,255,0.1)]">
                         <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-2 border-white/5">
                            <img src={activeConversation.profilePic || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${activeConversation.username}`} className="w-full h-full object-cover" alt="profile" />
                         </div>
                      </div>

                      <div className="space-y-2 mb-8">
                         <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">{activeConversation.fullName || activeConversation.username}</h2>
                         <p className="text-[10px] md:text-xs font-black text-violet-400 tracking-[0.4em] uppercase">Verified Friend</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md mb-8">
                         <div className="bg-white/5 border border-white/5 p-6 rounded-3xl text-center">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Access Code</p>
                            <p className="text-xl font-black text-white tracking-widest">{activeConversation.userCode}</p>
                         </div>
                         <div className="bg-white/5 border border-white/5 p-6 rounded-3xl text-center">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</p>
                            <p className={`text-xl font-black ${activeConversation.isOnline ? 'text-cyan-400' : 'text-gray-600'} uppercase tracking-widest`}>
                               {activeConversation.isOnline ? 'Active' : 'Dormant'}
                            </p>
                         </div>
                      </div>

                      <div className="flex gap-4">
                         <button 
                            onClick={() => (window as any).startNeuralCall?.(activeConversation, 'VOICE')}
                            className="px-8 py-4 rounded-2xl bg-violet-500 text-white font-black text-[10px] tracking-widest uppercase shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:scale-105 transition-all"
                         >
                            Start a Call
                         </button>
                         <button className="px-8 py-4 rounded-2xl bg-white/5 text-white font-black text-[10px] tracking-widest uppercase border border-white/10 hover:bg-white/10 transition-all">
                            Secure Data Transfer
                         </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {systemMsg && (
                  <div className="mx-auto bg-violet-500/10 border border-violet-500/20 px-4 py-2 rounded-full text-[8px] md:text-[9px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> {systemMsg}
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <MessageBubble 
                    key={msg.id || idx}
                    own={msg.senderId === user?.id}
                    text={msg.content}
                    type={msg.type}
                    time={new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    status={msg.status}
                  />
                ))}
                <div ref={scrollRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 md:p-6 pt-0">
                <div className="bg-[#111b21] border border-white/10 rounded-[2rem] p-3 md:p-4 flex items-center gap-2 md:gap-3 shadow-2xl relative">
                  {isRecording && (
                    <div className="absolute inset-0 bg-[#111b21] rounded-[2rem] flex items-center justify-between px-6 md:px-8 z-20">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white font-black text-xs md:text-sm tracking-widest uppercase">RECORDING... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</span>
                      </div>
                      <button onClick={stopRecording} className="bg-red-500/20 text-red-500 p-2 md:p-3 rounded-full hover:bg-red-500 hover:text-white transition-all">
                        <Square className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  )}

                  {audioPreviewUrl && (
                    <div className="absolute inset-0 bg-[#111b21] rounded-[2rem] flex items-center justify-between px-6 md:px-8 z-20">
                      <div className="flex items-center gap-3 md:gap-4 text-cyan-400">
                         <Play className="w-5 h-5" />
                         <span className="text-[9px] md:text-[10px] font-black tracking-[0.2em] uppercase">VOICE PACKET READY</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <button onClick={clearVoicePreview} className="p-2 md:p-3 text-gray-500 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                         </button>
                         <button onClick={sendVoiceMessage} disabled={isSendingVoice} className="bg-cyan-400 p-2 md:p-3 rounded-xl shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-wait">
                             {isSendingVoice ? <span className="text-black text-xs font-black px-1">...</span> : <Send className="w-4 h-4 md:w-5 md:h-5 text-black" />}
                          </button>
                      </div>
                    </div>
                  )}
                  
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 md:p-3 rounded-full hover:bg-white/5 text-gray-500 hover:text-cyan-400 transition-colors flex-shrink-0">
                    <Paperclip className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <button className="hidden sm:block p-3 rounded-full hover:bg-white/5 text-gray-500 hover:text-purple-400 transition-colors">
                    <Camera className="w-6 h-6" />
                  </button>
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..." 
                    className="flex-1 bg-transparent border-none outline-none text-white text-sm md:text-base placeholder:text-gray-600 ml-1"
                  />
                  <button 
                    onClick={startRecording}
                    className="p-2 md:p-3 rounded-full hover:bg-white/5 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Mic className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <button 
                    onClick={handleSendMessage}
                    className="bg-violet-500 p-3 md:p-4 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                  >
                    <Send className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
               <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 md:mb-8 border border-white/10 shadow-2xl">
                  <Cpu className="w-10 h-10 md:w-12 md:h-12 text-gray-700 animate-pulse" />
               </div>
               <h2 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tighter">Neural Hub Standby</h2>
               <p className="text-gray-600 text-xs md:text-sm max-w-xs uppercase font-black tracking-widest leading-relaxed">Establish a secure link or use your unmasking code to access active nodes.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

const ContactCard = ({ name, msg, status, active, onClick, pic, lastMessage }: any) => {
  const getSnippet = () => {
    if (!lastMessage) return msg; // Fallback to code if no messages
    if (lastMessage.type === 'TEXT') return lastMessage.content;
    if (lastMessage.type === 'IMAGE') return '📷 Image Transmission';
    if (lastMessage.type === 'VIDEO') return '🎥 Video Transmission';
    if (lastMessage.type === 'AUDIO') return '🎵 Voice Packet';
    return '📁 Data Packet';
  };

  return (
    <div onClick={onClick} className={`p-4 md:p-6 flex items-center gap-4 cursor-pointer border-b border-white/5 transition-all ${active ? 'bg-cyan-500/5' : 'hover:bg-white/5'}`}>
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/5 overflow-hidden border border-white/10 flex-shrink-0 relative">
        <img src={pic || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${name}`} alt="avatar" />
        {status === 'Online' && <div className="absolute bottom-1 right-1 w-2 h-2 bg-violet-400 rounded-full shadow-[0_0_5px_#8b5cf6]" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5 md:mb-1">
          <h4 className="font-bold text-white text-sm md:text-base truncate">{name}</h4>
          <span className="text-[7px] md:text-[8px] font-black tracking-widest uppercase text-gray-600">
            {lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : status}
          </span>
        </div>
        <p className="text-[10px] md:text-xs text-gray-500 truncate font-black tracking-widest uppercase">
          {getSnippet()}
        </p>
      </div>
    </div>
  );
};

const MessageBubble = ({ text, time, own, type, status }: any) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-[85%] md:max-w-[75%] lg:max-w-[70%] p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem]
        ${own ? 'bubble-out' : 'bubble-in'}
        shadow-xl backdrop-blur-sm
      `}>
        {(type === 'TEXT' || !type) && <p className="text-sm md:text-[15px] leading-relaxed mb-1 md:mb-2">{text}</p>}
        {type === 'IMAGE' && <img src={text} className="rounded-xl md:rounded-2xl mb-2 max-h-60 md:max-h-80 w-full object-cover border border-white/10 shadow-lg" alt="media" />}
        {type === 'VIDEO' && <video src={text} controls className="rounded-xl md:rounded-2xl mb-2 max-h-60 md:max-h-80 w-full border border-white/10 shadow-lg" />}
        {(type === 'VOICE' || type === 'AUDIO') && (
          <div className="flex items-center gap-3 md:gap-4 min-w-[180px] md:min-w-[220px] mb-2 bg-black/20 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/5">
             <audio ref={audioRef} src={text} onEnded={() => setIsPlaying(false)} className="hidden" />
             <button onClick={toggleAudio} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-cyan-500 flex items-center justify-center text-black shadow-lg hover:scale-105 transition-all flex-shrink-0">
                {isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" />}
             </button>
             <div className="flex-1 space-y-1">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                   <div className={`h-full bg-cyan-400 ${isPlaying ? 'animate-progress' : 'w-0'}`} />
                </div>
                <span className="text-[7px] md:text-[8px] font-black text-cyan-400/50 tracking-[0.2em] uppercase">ENCRYPTED VOICE PACKET</span>
             </div>
          </div>
        )}
        {type === 'DOCUMENT' && (
          <a href={text} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 md:p-4 bg-white/5 rounded-xl md:rounded-2xl mb-2 hover:bg-white/10 transition-all border border-white/5">
            <Paperclip className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
            <span className="text-[8px] md:text-[9px] font-black text-white uppercase tracking-widest truncate">Download Data Packet</span>
          </a>
        )}
        <div className="flex items-center justify-end gap-1.5 md:gap-2 text-[7px] md:text-[8px] font-black tracking-widest text-gray-500 uppercase">
          {time}
          {own && (
            <div className="flex items-center">
              {status === 'SENT' && <CheckCheck className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-700" />}
              {status === 'DELIVERED' && <CheckCheck className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-500" />}
              {status === 'SEEN' && (
                <CheckCheck className="w-3 h-3 md:w-3.5 md:h-3.5 text-violet-400 shadow-[0_0_10px_#8b5cf6]" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
