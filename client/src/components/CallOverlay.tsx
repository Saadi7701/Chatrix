import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, User, Shield } from 'lucide-react';
import { socket } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

const ICE_SERVERS = {
   iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.services.mozilla.com' },
   ],
   iceCandidatePoolSize: 10,
};

const CallOverlay = () => {
   const { user } = useAuthStore();
   const [callState, setCallState] = useState<'IDLE' | 'RINGING' | 'RECEIVING' | 'ACTIVE'>('IDLE');
   const [callType, setCallType] = useState<'VOICE' | 'VIDEO'>('VOICE');
   const [remoteUser, setRemoteUser] = useState<any>(null); // For 1-on-1
   const [isGroupCall, setIsGroupCall] = useState(false);
   const [groupId, setGroupId] = useState<string | null>(null);
   const [participants, setParticipants] = useState<any[]>([]); // [{id, username, stream, pc}]
   
   const [isMuted, setIsMuted] = useState(false);
   const [isVideoOff, setIsVideoOff] = useState(false);
   const [connStatus, setConnStatus] = useState('SYNCED'); // Re-using this for global health

   const localStreamRef = useRef<MediaStream | null>(null);
   const pcsRef = useRef<{ [userId: string]: RTCPeerConnection }>({});
   const localVideoRef = useRef<HTMLVideoElement>(null);
   const callStartTimeRef = useRef<number | null>(null);

   useEffect(() => {
      // 1-on-1 Call Listeners
      socket.on('incoming_call', async ({ offer, from, type, username, profilePic }) => {
         setRemoteUser({ id: from, username, profilePic });
         setCallType(type);
         setCallState('RECEIVING');
         setIsGroupCall(false);
         
         const pc = createPeerConnection(from);
         await pc.setRemoteDescription(new RTCSessionDescription(offer));
         const answer = await pc.createAnswer();
         await pc.setLocalDescription(answer);
         socket.emit('answer_call', { answer, to: from });
      });

      socket.on('call_answered', async ({ answer }) => {
         const pc = Object.values(pcsRef.current)[0];
         if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            setCallState('ACTIVE');
            callStartTimeRef.current = Date.now();
         }
      });

      // Collective (Group) Call Listeners
      socket.on('collective_call_incoming', ({ groupId, type, callerName, callerPic, callerId }) => {
         setGroupId(groupId);
         setCallType(type);
         setIsGroupCall(true);
         setRemoteUser({ id: callerId, username: callerName, profilePic: callerPic });
         setCallState('RECEIVING');
      });

      socket.on('node_joined_call', async ({ userId }) => {
         if (!localStreamRef.current) return;
         // If a new person joins, we initiate a connection to them
         const pc = createPeerConnection(userId);
         localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
         const offer = await pc.createOffer();
         await pc.setLocalDescription(offer);
         socket.emit('call_user', { offer, to: userId, from: user?.id, type: callType });
      });

      socket.on('ice_candidate', async ({ candidate, from }) => {
         const pc = pcsRef.current[from] || Object.values(pcsRef.current)[0];
         if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on('call_ended', () => {
         endCallLocal();
      });

      return () => {
         socket.off('incoming_call');
         socket.off('call_answered');
         socket.off('collective_call_incoming');
         socket.off('node_joined_call');
         socket.off('ice_candidate');
         socket.off('call_ended');
      };
   }, [user, callType]);

   const createPeerConnection = (targetUserId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.oniceconnectionstatechange = () => {
         setConnStatus(pc.iceConnectionState.toUpperCase());
      };

      pc.onicecandidate = (event) => {
         if (event.candidate) {
            socket.emit('ice_candidate', { candidate: event.candidate, to: targetUserId });
         }
      };

      pc.ontrack = (event) => {
         setParticipants(prev => {
            if (prev.find(p => p.id === targetUserId)) return prev;
            return [...prev, { id: targetUserId, stream: event.streams[0] }];
         });
      };

      pcsRef.current[targetUserId] = pc;
      return pc;
   };

   const startCall = async (targetUser: any, type: 'VOICE' | 'VIDEO') => {
      try {
         const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'VIDEO', audio: true });
         localStreamRef.current = stream;
         if (localVideoRef.current) localVideoRef.current.srcObject = stream;
         
         setRemoteUser(targetUser);
         setCallType(type);
         setCallState('RINGING');
         
         const pc = createPeerConnection(targetUser.id);
         stream.getTracks().forEach(track => pc.addTrack(track, stream));
         const offer = await pc.createOffer();
         await pc.setLocalDescription(offer);
         socket.emit('call_user', { offer, to: targetUser.id, from: user?.id, type });
      } catch (err) { setCallState('IDLE'); }
   };

   const answerCall = async () => {
      try {
         const stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'VIDEO', audio: true });
         localStreamRef.current = stream;
         if (localVideoRef.current) localVideoRef.current.srcObject = stream;
         
         if (isGroupCall && groupId) {
            socket.emit('join_collective_call', { groupId, userId: user?.id });
            setCallState('ACTIVE');
         } else {
            // 1-on-1 logic already handled in incoming_call listener for signaling
            setCallState('ACTIVE');
         }
         callStartTimeRef.current = Date.now();
      } catch (err) { endCall(); }
   };

   const endCallLocal = () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      Object.values(pcsRef.current).forEach(pc => pc.close());
      pcsRef.current = {};
      localStreamRef.current = null;
      setParticipants([]);
      setCallState('IDLE');
   };

   const endCall = () => {
      if (isGroupCall && groupId) {
         socket.emit('leave_collective_call', { groupId, userId: user?.id });
      } else if (remoteUser) {
         socket.emit('end_call', { to: remoteUser.id, from: user?.id });
      }
      endCallLocal();
   };

   useEffect(() => {
      (window as any).startNeuralCall = startCall;
      (window as any).incomingCollectiveCall = (data: any) => {
         setGroupId(data.groupId);
         setCallType(data.type);
         setIsGroupCall(true);
         setRemoteUser({ id: data.callerId, username: data.callerName, profilePic: data.callerPic });
         setCallState('RECEIVING');
      };
      return () => { 
         delete (window as any).startNeuralCall; 
         delete (window as any).incomingCollectiveCall;
      };
   }, [user]);

   if (callState === 'IDLE') return null;

   return (
      <AnimatePresence>
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl">
            <div className="w-full h-full md:w-[95vw] md:h-[90vh] bg-[#0b141a] md:rounded-[3rem] border border-white/10 overflow-hidden relative shadow-2xl flex flex-col">
               
               {/* Participants Grid */}
               <div className="flex-1 p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr overflow-y-auto custom-scrollbar">
                  {/* Local Stream */}
                  <div className="relative rounded-3xl overflow-hidden bg-black/40 border border-white/10 group">
                     <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} />
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {isVideoOff && <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center"><User className="text-gray-600" size={40} /></div>}
                     </div>
                     <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                        <Shield className="w-3 h-3 text-cyan-400" />
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Local Node: {connStatus}</p>
                     </div>
                  </div>

                  {/* Remote Participants */}
                  {participants.map((p) => (
                     <div key={p.id} className="relative rounded-3xl overflow-hidden bg-black/40 border border-white/10">
                        <RemoteVideo stream={p.stream} />
                        <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                           <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Node synchronized</p>
                        </div>
                     </div>
                  ))}

                  {/* Ringing/Waiting State */}
                  {participants.length === 0 && callState !== 'RECEIVING' && (
                     <div className="col-span-full flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-32 h-32 rounded-full bg-cyan-500/10 border-2 border-cyan-400/20 flex items-center justify-center animate-pulse">
                           <User size={60} className="text-cyan-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Synchronizing Neural Network...</h2>
                     </div>
                  )}
               </div>

               {callState === 'RECEIVING' && (
                  <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-3xl flex flex-col items-center justify-center z-50 p-6">
                     <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2rem] md:rounded-[3rem] bg-white/5 border border-white/10 overflow-hidden relative shadow-[0_0_50px_rgba(0,242,255,0.2)] mb-8">
                        <img src={remoteUser?.profilePic || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${remoteUser?.username}`} className="w-full h-full object-cover" alt="avatar" />
                     </div>
                     <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2">{remoteUser?.username}</h2>
                     <p className="text-[10px] md:text-xs font-black text-cyan-400 tracking-[0.4em] uppercase mb-16">
                        {isGroupCall ? 'Collective Transmission Incoming...' : 'Incoming Transmission...'}
                     </p>
                     
                     <div className="flex gap-10 md:gap-16">
                        <button onClick={answerCall} className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-[0_0_30px_rgba(34,197,94,0.4)]"><Phone size={32} className="text-white" /></button>
                        <button onClick={endCall} className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)]"><PhoneOff size={32} className="text-white" /></button>
                     </div>
                  </div>
               )}

               {/* Controls */}
               <div className="p-6 md:p-10 flex items-center justify-center gap-4 md:gap-8 bg-black/60 border-t border-white/5 flex-wrap">
                  <button onClick={() => {
                     const track = localStreamRef.current?.getAudioTracks()[0];
                     if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
                  }} className={`p-4 md:p-5 rounded-2xl transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                     {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>

                  <button onClick={() => {
                     const track = localStreamRef.current?.getVideoTracks()[0];
                     if (track) { track.enabled = !track.enabled; setIsVideoOff(!track.enabled); }
                  }} className={`p-4 md:p-5 rounded-2xl transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                     {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                  </button>

                  <button onClick={endCall} className="p-5 md:p-6 rounded-2xl bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-110 active:scale-95 transition-all"><PhoneOff size={28} /></button>
               </div>
            </div>
         </motion.div>
      </AnimatePresence>
   );
};

const RemoteVideo = ({ stream }: { stream: MediaStream }) => {
   const videoRef = useRef<HTMLVideoElement>(null);
   useEffect(() => {
      if (videoRef.current) videoRef.current.srcObject = stream;
   }, [stream]);
   return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />;
};

export default CallOverlay;
