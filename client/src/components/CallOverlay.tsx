import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, User } from 'lucide-react';
import { socket } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

const ICE_SERVERS = {
   iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
   ],
};

const CallOverlay = () => {
   const { user } = useAuthStore();
   const [callState, setCallState] = useState<'IDLE' | 'RINGING' | 'RECEIVING' | 'ACTIVE'>('IDLE');
   const [callType, setCallType] = useState<'VOICE' | 'VIDEO'>('VOICE');
   const [remoteUser, setRemoteUser] = useState<any>(null);
   const [isMuted, setIsMuted] = useState(false);
   const [isVideoOff, setIsVideoOff] = useState(false);

   const localStreamRef = useRef<MediaStream | null>(null);
   const remoteStreamRef = useRef<MediaStream | null>(null);
   const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
   const localVideoRef = useRef<HTMLVideoElement>(null);
   const remoteVideoRef = useRef<HTMLVideoElement>(null);
   const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);

   useEffect(() => {
      socket.on('incoming_call', async ({ offer, from, type }) => {
         setRemoteUser({ id: from }); // We'd ideally fetch user details here
         setCallType(type);
         setCallState('RECEIVING');
         
         // Pre-setup peer connection
         const pc = createPeerConnection(from);
         await pc.setRemoteDescription(new RTCSessionDescription(offer));
         
         // Process any ICE candidates that arrived before the offer was set
         while (pendingIceCandidates.current.length > 0) {
            const candidate = pendingIceCandidates.current.shift();
            if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
         }
      });

      socket.on('call_answered', async ({ answer }) => {
         if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            setCallState('ACTIVE');
         }
      });

      socket.on('ice_candidate', async ({ candidate }) => {
         if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
         } else {
            pendingIceCandidates.current.push(candidate);
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

   const createPeerConnection = (targetUserId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (event) => {
         if (event.candidate) {
            socket.emit('ice_candidate', { candidate: event.candidate, to: targetUserId });
         }
      };

      pc.ontrack = (event) => {
         if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
         }
         remoteStreamRef.current = event.streams[0];
      };

      peerConnectionRef.current = pc;
      return pc;
   };

   const startCall = async (targetUser: any, type: 'VOICE' | 'VIDEO') => {
      setRemoteUser(targetUser);
      setCallType(type);
      setCallState('RINGING');

      const stream = await navigator.mediaDevices.getUserMedia({
         video: type === 'VIDEO',
         audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(targetUser.id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_user', { offer, to: targetUser.id, from: user?.id, type });
   };

   const answerCall = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
         video: callType === 'VIDEO',
         audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = peerConnectionRef.current;
      if (pc) {
         stream.getTracks().forEach((track) => pc.addTrack(track, stream));
         const answer = await pc.createAnswer();
         await pc.setLocalDescription(answer);
         socket.emit('answer_call', { answer, to: remoteUser.id });
         setCallState('ACTIVE');
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
   };

   const endCall = () => {
      if (remoteUser) {
         socket.emit('end_call', { to: remoteUser.id });
      }
      endCallLocal();
   };

   // Expose startCall to window for ChatPage to trigger
   useEffect(() => {
      (window as any).startNeuralCall = startCall;
      return () => { delete (window as any).startNeuralCall; };
   }, [user]);

   if (callState === 'IDLE') return null;

   return (
      <AnimatePresence>
         <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/80 backdrop-blur-3xl"
         >
            <div className="w-full max-w-4xl aspect-video md:aspect-auto md:h-[80vh] bg-[#0b141a] rounded-[3rem] border border-white/10 overflow-hidden relative shadow-2xl flex flex-col">
               
               {/* Video Streams */}
               <div className="flex-1 relative bg-black/40 flex items-center justify-center overflow-hidden">
                  {callType === 'VIDEO' ? (
                     <>
                        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <video 
                           ref={localVideoRef} 
                           autoPlay 
                           playsInline 
                           muted 
                           className="absolute top-6 right-6 w-32 md:w-48 aspect-video rounded-2xl border-2 border-white/20 object-cover shadow-2xl bg-black" 
                        />
                     </>
                  ) : (
                     <div className="flex flex-col items-center gap-8">
                        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-cyan-500/10 border-4 border-cyan-400/30 flex items-center justify-center animate-pulse">
                           <User className="w-16 h-16 md:w-24 md:h-24 text-cyan-400" />
                        </div>
                        <div className="text-center">
                           <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase">Connection Established</h2>
                           <p className="text-xs md:text-sm font-black text-cyan-400 tracking-[0.4em] uppercase mt-2">Neural Voice Link V.1</p>
                        </div>
                     </div>
                  )}

                  {callState === 'RECEIVING' && (
                     <div className="absolute inset-0 bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center z-50">
                        <div className="w-24 h-24 rounded-full bg-cyan-400 animate-ping absolute opacity-20" />
                        <div className="w-24 h-24 rounded-full bg-cyan-400 flex items-center justify-center relative shadow-[0_0_50px_rgba(0,242,255,0.4)] mb-8">
                           {callType === 'VIDEO' ? <Video className="text-black w-10 h-10" /> : <Phone className="text-black w-10 h-10" />}
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-12">Incoming Transmission...</h2>
                        <div className="flex gap-8">
                           <button onClick={answerCall} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:scale-110 transition-all shadow-lg">
                              <Phone className="text-white w-8 h-8" />
                           </button>
                           <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 transition-all shadow-lg">
                              <PhoneOff className="text-white w-8 h-8" />
                           </button>
                        </div>
                     </div>
                  )}
               </div>

               {/* Controls */}
               <div className="p-6 md:p-10 flex items-center justify-center gap-6 md:gap-12 bg-black/40 border-t border-white/5">
                  <button 
                     onClick={() => {
                        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
                        if (audioTrack) {
                           audioTrack.enabled = !audioTrack.enabled;
                           setIsMuted(!audioTrack.enabled);
                        }
                     }}
                     className={`p-4 md:p-6 rounded-3xl transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white hover:bg-white/10'}`}
                  >
                     {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
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
                        className={`p-4 md:p-6 rounded-3xl transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-white hover:bg-white/10'}`}
                     >
                        {isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}
                     </button>
                  )}

                  <button 
                     onClick={endCall}
                     className="p-6 md:p-8 rounded-[2rem] bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-110 active:scale-95 transition-all"
                  >
                     <PhoneOff size={32} />
                  </button>
               </div>
            </div>
         </motion.div>
      </AnimatePresence>
   );
};

export default CallOverlay;
