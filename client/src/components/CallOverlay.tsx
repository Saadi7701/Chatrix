import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, User, Volume2, VolumeX } from 'lucide-react';
import { socket } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

const ICE_SERVERS = {
   iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
         urls: "turn:openrelay.metered.ca:80",
         username: "openrelayproject",
         credential: "openrelayproject"
      },
      {
         urls: "turn:openrelay.metered.ca:443",
         username: "openrelayproject",
         credential: "openrelayproject"
      },
      {
         urls: "turn:openrelay.metered.ca:443?transport=tcp",
         username: "openrelayproject",
         credential: "openrelayproject"
      }
   ],
   iceCandidatePoolSize: 10,
};

const CallOverlay = () => {
   const { user } = useAuthStore();
   const [callState, setCallState] = useState<'IDLE' | 'RINGING' | 'RECEIVING' | 'ACTIVE'>('IDLE');
   const [callType, setCallType] = useState<'VOICE' | 'VIDEO'>('VOICE');
   const [remoteUser, setRemoteUser] = useState<any>(null);
   const [isMuted, setIsMuted] = useState(false);
   const [isVideoOff, setIsVideoOff] = useState(false);
   const [isSpeakerOn, setIsSpeakerOn] = useState(true);
   const [connStatus, setConnStatus] = useState('INITIALIZING...');

   const localStreamRef = useRef<MediaStream | null>(null);
   const remoteStreamRef = useRef<MediaStream | null>(null);
   const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
   const localVideoRef = useRef<HTMLVideoElement>(null);
   const remoteVideoRef = useRef<HTMLVideoElement>(null);
   const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);
   const callStartTimeRef = useRef<number | null>(null);

   // Sync stream objects with video DOM elements to prevent race conditions during React rendering
   useEffect(() => {
      if (callState !== 'IDLE') {
         if (localVideoRef.current && localStreamRef.current) {
            if (localVideoRef.current.srcObject !== localStreamRef.current) {
               localVideoRef.current.srcObject = localStreamRef.current;
            }
         }
         if (remoteVideoRef.current && remoteStreamRef.current) {
            if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
               remoteVideoRef.current.srcObject = remoteStreamRef.current;
            }
         }
      }
   }, [callState, localStreamRef.current, remoteStreamRef.current]);

   useEffect(() => {
      socket.on('incoming_call', async ({ offer, from, type, username, profilePic }) => {
         setRemoteUser({ id: from, username, profilePic });
         setCallType(type);
         setCallState('RECEIVING');
         
         const pc = createPeerConnection(from);
         await pc.setRemoteDescription(new RTCSessionDescription(offer));
         
         while (pendingIceCandidates.current.length > 0) {
            const candidate = pendingIceCandidates.current.shift();
            if (candidate) {
               await pc.addIceCandidate(new RTCIceCandidate(candidate))
                  .catch(err => console.error('Error adding pending candidate on incoming:', err));
            }
         }
      });

      socket.on('call_answered', async ({ answer }) => {
         if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            setCallState('ACTIVE');
            callStartTimeRef.current = Date.now();

            // Apply all pending candidates gathered before the answer description was applied
            while (pendingIceCandidates.current.length > 0) {
               const candidate = pendingIceCandidates.current.shift();
               if (candidate) {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                     .catch(err => console.error('Error adding pending candidate on answer:', err));
               }
            }
         }
      });

      socket.on('ice_candidate', async ({ candidate }) => {
         try {
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
               await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
               pendingIceCandidates.current.push(candidate);
            }
         } catch (err) {
            console.error('Error adding ICE candidate:', err);
         }
      });

      socket.on('call_ended', () => {
         endCallLocal();
      });

      return () => {
         socket.off('incoming_call');
         socket.off('call_answered');
         socket.off('ice_candidate');
         socket.off('call_ended');
      };
   }, []);

   useEffect(() => {
      if (remoteVideoRef.current) {
         remoteVideoRef.current.volume = isSpeakerOn ? 1.0 : 0.2;
      }
   }, [isSpeakerOn]);

   const createPeerConnection = (targetUserId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.oniceconnectionstatechange = () => {
         console.log('[ICE Status]:', pc.iceConnectionState);
         switch(pc.iceConnectionState) {
            case 'checking': setConnStatus('HANDSHAKING...'); break;
            case 'connected': 
            case 'completed': setConnStatus('LINK ESTABLISHED'); break;
            case 'failed': setConnStatus('FIREWALL BLOCK'); break;
            case 'disconnected': setConnStatus('LINK LOST'); break;
            default: setConnStatus('SYNCING...');
         }
      };

      pc.onicecandidate = (event) => {
         if (event.candidate) {
            socket.emit('ice_candidate', { candidate: event.candidate, to: targetUserId });
         }
      };

      pc.ontrack = (event) => {
         console.log('Remote track received:', event.track.kind);
         if (event.streams && event.streams[0]) {
            remoteStreamRef.current = event.streams[0];
            if (remoteVideoRef.current) {
               remoteVideoRef.current.srcObject = event.streams[0];
               remoteVideoRef.current.play().catch(err => console.error('Auto-play failed:', err));
            }
         } else {
            const newStream = new MediaStream();
            newStream.addTrack(event.track);
            remoteStreamRef.current = newStream;
            if (remoteVideoRef.current) {
               remoteVideoRef.current.srcObject = newStream;
               remoteVideoRef.current.play().catch(err => console.error('Auto-play failed:', err));
            }
         }
      };

      peerConnectionRef.current = pc;
      return pc;
   };

   const startCall = async (targetUser: any, type: 'VOICE' | 'VIDEO') => {
      try {
         const stream = await navigator.mediaDevices.getUserMedia({
            video: type === 'VIDEO',
            audio: true,
         });
         setRemoteUser(targetUser);
         setCallType(type);
         setCallState('RINGING');
         localStreamRef.current = stream;
         const pc = createPeerConnection(targetUser.id);
         stream.getTracks().forEach((track) => pc.addTrack(track, stream));
         const offer = await pc.createOffer();
         await pc.setLocalDescription(offer);
         socket.emit('call_user', { offer, to: targetUser.id, from: user?.id, type });
      } catch (err) {
         console.error('Permission denied', err);
         alert('PROTOCOL ERROR: Neural Link requires Microphone/Camera permissions. Please check your browser settings.');
         setCallState('IDLE');
      }
   };

   const answerCall = async () => {
      try {
         const stream = await navigator.mediaDevices.getUserMedia({
            video: callType === 'VIDEO',
            audio: true,
         });
         localStreamRef.current = stream;
         const pc = peerConnectionRef.current;
         if (pc) {
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer_call', { answer, to: remoteUser.id });
            setCallState('ACTIVE');
            callStartTimeRef.current = Date.now();
         }
      } catch (err) {
         console.error('Permission denied', err);
         alert('LINK FAILED: Could not access hardware. Please allow microphone permissions.');
         endCall();
      }
   };

   const endCallLocal = () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      localStreamRef.current = null;
      remoteStreamRef.current = null;
      setCallState('IDLE');
      setRemoteUser(null);
      pendingIceCandidates.current = [];
      callStartTimeRef.current = null;
   };

   const endCall = () => {
      const duration = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
      if (remoteUser) {
         socket.emit('end_call', { 
            to: remoteUser.id, 
            from: user?.id,
            duration,
            type: callType,
            status: callStartTimeRef.current ? 'COMPLETED' : 'MISSED'
         });
      }
      endCallLocal();
   };

   useEffect(() => {
      (window as any).startNeuralCall = startCall;
      return () => { delete (window as any).startNeuralCall; };
   }, [user]);

   if (callState === 'IDLE') return null;

   return (
      <AnimatePresence>
         <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl"
         >
            <div className="w-full h-full md:w-[90vw] md:h-[85vh] md:max-w-5xl bg-[#0b141a] md:rounded-[3rem] border-white/10 overflow-hidden relative shadow-2xl flex flex-col">
               
               <video 
                  ref={remoteVideoRef as any} 
                  autoPlay 
                  playsInline 
                  className={`absolute inset-0 w-full h-full object-cover z-0 ${callType === 'VOICE' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
               />
               {/* Video Streams / Voice HUD */}
               <div className="flex-1 relative bg-black/20 flex items-center justify-center overflow-hidden">
                  {callType === 'VIDEO' ? (
                     <>
                        <video 
                           ref={localVideoRef} 
                           autoPlay 
                           playsInline 
                           muted 
                           className="absolute top-4 right-4 w-24 md:w-48 aspect-[3/4] md:aspect-video rounded-xl md:rounded-2xl border border-white/20 object-cover shadow-2xl bg-black z-20" 
                        />
                     </>
                  ) : (
                     <div className="flex flex-col items-center gap-6 md:gap-8 px-6 text-center z-10">
                        <div className="w-24 h-24 md:w-48 md:h-48 rounded-full bg-cyan-500/10 border-2 md:border-4 border-cyan-400/30 flex items-center justify-center animate-pulse overflow-hidden">
                           {remoteUser?.profilePic ? (
                              <img src={remoteUser.profilePic} className="w-full h-full object-cover" alt="caller" />
                           ) : (
                              <User className="w-12 h-12 md:w-24 md:h-24 text-cyan-400" />
                           )}
                        </div>
                        <div className="space-y-2">
                           <h2 className="text-xl md:text-4xl font-black text-white tracking-tighter uppercase">{remoteUser?.username || 'NEURAL LINK'}</h2>
                           <p className={`text-[10px] md:text-sm font-black tracking-[0.4em] uppercase ${connStatus === 'FIREWALL BLOCK' ? 'text-red-500' : 'text-cyan-400'}`}>
                              {callState === 'ACTIVE' ? connStatus : 'Establishing Synchronized Feed...'}
                           </p>
                        </div>
                     </div>
                  )}
               </div>

               {callState === 'RECEIVING' && (
                  <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-3xl flex flex-col items-center justify-center z-50 p-6">
                     <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-cyan-400 animate-ping absolute opacity-10 pointer-events-none" />
                     
                     <div className="w-24 h-24 md:w-40 md:h-40 rounded-[2rem] md:rounded-[3rem] bg-white/5 border border-white/10 overflow-hidden relative shadow-[0_0_50px_rgba(0,242,255,0.2)] mb-8">
                        <img src={remoteUser?.profilePic || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${remoteUser?.username}`} className="w-full h-full object-cover" alt="avatar" />
                     </div>
                     <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2">{remoteUser?.username}</h2>
                     <p className="text-[10px] md:text-xs font-black text-cyan-400 tracking-[0.4em] uppercase mb-16 md:mb-24">Incoming Transmission...</p>
                     
                     <div className="flex gap-10 md:gap-16 relative z-[60]">
                        <div className="flex flex-col items-center gap-4">
                           <button 
                              onClick={(e) => { e.stopPropagation(); answerCall(); }} 
                              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-500 flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-[0_0_30px_rgba(34,197,94,0.4)] cursor-pointer touch-manipulation"
                           >
                              <Phone className="text-white w-7 h-7 md:w-9 md:h-9" />
                           </button>
                           <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Accept</span>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                           <button 
                              onClick={(e) => { e.stopPropagation(); endCall(); }} 
                              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)] cursor-pointer touch-manipulation"
                           >
                              <PhoneOff className="text-white w-7 h-7 md:w-9 md:h-9" />
                           </button>
                           <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Decline</span>
                        </div>
                     </div>
                  </div>
               )}

               {/* Controls */}
               <div className="p-6 md:p-10 flex items-center justify-center gap-4 md:gap-8 bg-black/60 border-t border-white/5 pb-12 md:pb-10 flex-wrap relative z-[100]">
                  <button 
                     onClick={() => {
                        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
                        if (audioTrack) {
                           audioTrack.enabled = !audioTrack.enabled;
                           setIsMuted(!audioTrack.enabled);
                        }
                     }}
                     className={`p-4 md:p-5 rounded-2xl transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white hover:bg-white/10'}`}
                  >
                     {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>

                  {callType === 'VIDEO' && (
                     <button 
                        onClick={() => {
                           const videoTrack = localStreamRef.current?.getVideoTracks()[0];
                           if (videoTrack) {
                              videoTrack.enabled = !videoTrack.enabled;
                              setIsVideoOff(!videoTrack.enabled);
                           }
                        }}
                        className={`p-4 md:p-5 rounded-2xl transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white hover:bg-white/10'}`}
                     >
                        {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                     </button>
                  )}

                  <button 
                     onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                     className={`p-4 md:p-5 rounded-2xl transition-all ${!isSpeakerOn ? 'bg-amber-500/20 text-amber-500' : 'bg-white/5 text-white hover:bg-white/10'}`}
                  >
                     {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
                  </button>

                  <button 
                     onClick={endCall}
                     className="p-5 md:p-6 rounded-2xl bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-110 active:scale-95 transition-all"
                  >
                     <PhoneOff size={28} />
                  </button>
               </div>
            </div>
         </motion.div>
      </AnimatePresence>
   );
};

export default CallOverlay;

